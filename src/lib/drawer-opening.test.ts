import { describe, it, expect } from 'vitest';
import {
  drawerNetByDay,
  monthStart,
  resolveDailyDrawerOpening,
  resolveDrawerOpening,
  sumDrawerNetByMonth,
} from './drawer-opening';

describe('resolveDrawerOpening', () => {
  const monthlyNet = {
    '2026-08-01': 500000,
    '2026-09-01': -200000,
    '2026-10-01': 300000,
  };

  it('uses the recorded opening of the month', () => {
    expect(
      resolveDrawerOpening({ month: '2026-10-01', openings: { '2026-10-01': 1000000 }, monthlyNet })
    ).toEqual({ saldoAwal: 1000000, source: 'recorded', fromPeriode: '2026-10-01' });
  });

  it('carries the previous month closing balance', () => {
    expect(
      resolveDrawerOpening({ month: '2026-10-01', openings: { '2026-09-01': 1000000 }, monthlyNet })
    ).toEqual({ saldoAwal: 800000, source: 'carried', fromPeriode: '2026-09-01' });
  });

  it('carries across a gap of two months', () => {
    expect(
      resolveDrawerOpening({ month: '2026-10-01', openings: { '2026-08-01': 1000000 }, monthlyNet }).saldoAwal
    ).toBe(1300000);
  });

  it('carries across a year boundary', () => {
    expect(
      resolveDrawerOpening({
        month: '2027-01-01',
        openings: { '2026-12-01': 100000 },
        monthlyNet: { '2026-12-01': 50000 },
      }).saldoAwal
    ).toBe(150000);
  });

  it('ignores openings recorded after the month', () => {
    expect(
      resolveDrawerOpening({ month: '2026-09-01', openings: { '2026-10-01': 1000000 }, monthlyNet })
    ).toEqual({ saldoAwal: 0, source: 'missing', fromPeriode: null });
  });

  it('returns 0 and missing when nothing was ever recorded (INV-023-1)', () => {
    expect(resolveDrawerOpening({ month: '2026-10-01', openings: {}, monthlyNet })).toEqual({
      saldoAwal: 0,
      source: 'missing',
      fromPeriode: null,
    });
  });

  it('accepts a day inside the month', () => {
    expect(
      resolveDrawerOpening({ month: '2026-10-17', openings: { '2026-10-01': 5000 }, monthlyNet }).saldoAwal
    ).toBe(5000);
  });
});

describe('resolveDailyDrawerOpening', () => {
  it('adds movements from the first of the month up to the day before', () => {
    expect(
      resolveDailyDrawerOpening({
        date: '2026-10-03',
        monthOpening: 1000000,
        dailyNet: { '2026-09-30': 999, '2026-10-01': 100000, '2026-10-02': -40000, '2026-10-03': 70000 },
      })
    ).toBe(1060000);
  });

  it('is the month opening on the first day', () => {
    expect(resolveDailyDrawerOpening({ date: '2026-10-01', monthOpening: 250000, dailyNet: { '2026-10-01': 5 } })).toBe(
      250000
    );
  });
});

describe('drawerNetByDay', () => {
  const flows = [
    { tanggal: '2026-09-02', jenis: 'Keluar', kategori: 'Pengeluaran Obat', jenis_pembayaran: 'Tunai', nominal: 40000 },
    { tanggal: '2026-09-02', jenis: 'Keluar', kategori: 'Pengeluaran Obat', jenis_pembayaran: 'TF', nominal: 90000 },
    { tanggal: '2026-09-03', jenis: 'Masuk', kategori: 'Setor Tunai', nominal: 300000 },
    { tanggal: '2026-09-03', jenis: 'Keluar', kategori: 'Setor ke Rekening Pemilik', nominal: '200000' },
    { tanggal: '2026-09-03', jenis: 'Masuk', kategori: 'Kapitasi BPJS', nominal: 5000000 },
    { tanggal: '2026-09-04', jenis: 'Keluar', kategori: 'Operasional', jenis_pembayaran: null, nominal: 10000 },
  ];
  const entries = [
    { date: '2026-09-02', amount: 150000 },
    { date: '2026-09-02', amount: 50000 },
    { date: '2026-09-03', amount: 600000 },
  ];

  it('subtracts cash-paid expenses and deposits, ignoring transfers and capitation', () => {
    expect(drawerNetByDay(entries, flows)).toEqual({
      '2026-09-02': 200000 - 40000,
      '2026-09-03': 600000 - 300000 - 200000,
      '2026-09-04': -10000,
    });
  });

  it('rolls days up into months', () => {
    expect(
      sumDrawerNetByMonth({ '2026-09-02': 160000, '2026-09-30': -10000, '2026-10-01': 5000 })
    ).toEqual({ '2026-09-01': 150000, '2026-10-01': 5000 });
  });

  it('feeds resolveDrawerOpening with the same rules as the Buku Kas month', () => {
    const monthlyNet = sumDrawerNetByMonth(drawerNetByDay(entries, flows));
    expect(
      resolveDrawerOpening({ month: '2026-10-01', openings: { '2026-09-01': 1000000 }, monthlyNet }).saldoAwal
    ).toBe(1000000 + 160000 + 100000 - 10000);
  });
});

describe('monthStart', () => {
  it('normalises dates and months to the first day', () => {
    expect(monthStart('2026-10-17')).toBe('2026-10-01');
    expect(monthStart('2026-10')).toBe('2026-10-01');
  });
});
