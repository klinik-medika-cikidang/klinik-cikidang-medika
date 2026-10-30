import { describe, it, expect } from 'vitest';
import {
  buildSettlePaymentDates,
  cashDateOrFilter,
  describeCashDates,
  drawerCashEntries,
  getCashDate,
  getReceiptPaymentDates,
  getVisitCashEvents,
  type CashDateVisit,
  isPaidOnAnotherDay,
  visitCashInRange,
} from './cash-date';

// Date and amount only; payment methods have their own tests below.
const events = (v: CashDateVisit) => getVisitCashEvents(v).map(({ date, amount }) => ({ date, amount }));

const umum = {
  tanggal_periksa: '2026-10-27',
  jenis_pasien: 'UMUM',
  biaya_periksa: 150000,
  pendapatan_lain: 50000,
};

describe('getCashDate', () => {
  it('falls back to the examination date for rows settled before F-021', () => {
    expect(getCashDate({ tanggal_periksa: '2026-09-02' })).toBe('2026-09-02');
    expect(getCashDate({ tanggal_periksa: '2026-09-02', tanggal_bayar: null })).toBe('2026-09-02');
  });

  it('uses the payment date when present', () => {
    expect(getCashDate({ tanggal_periksa: '2026-10-27', tanggal_bayar: '2026-10-28' })).toBe('2026-10-28');
  });
});

describe('getVisitCashEvents', () => {
  it('books a same-day payment on the examination date (INV-021-1)', () => {
    expect(events({ ...umum, status_pembayaran: 'Lunas', tanggal_bayar: '2026-10-27' })).toEqual([
      { date: '2026-10-27', amount: 200000 },
    ]);
  });

  it('books a visit examined on D and paid on D+1 on D+1', () => {
    const v = { ...umum, status_pembayaran: 'Lunas', tanggal_bayar: '2026-10-28' };
    expect(events(v)).toEqual([{ date: '2026-10-28', amount: 200000 }]);
    expect(visitCashInRange(v, '2026-10-27', '2026-10-27')).toBe(0);
    expect(visitCashInRange(v, '2026-10-28', '2026-10-28')).toBe(200000);
    expect(isPaidOnAnotherDay(v)).toBe(true);
  });

  it('counts only the received part of an open Piutang', () => {
    const v = { ...umum, status_pembayaran: 'Piutang', tanggal_bayar: '2026-10-27', piutang_nominal: 120000 };
    expect(events(v)).toEqual([{ date: '2026-10-27', amount: 80000 }]);
  });

  it('splits a paid-off Piutang into first payment and payoff', () => {
    const v = {
      ...umum,
      status_pembayaran: 'Lunas',
      tanggal_bayar: '2026-10-27',
      tanggal_pelunasan: '2026-10-29',
      nominal_pelunasan: 120000,
      piutang_nominal: 0,
    };
    expect(events(v)).toEqual([
      { date: '2026-10-27', amount: 80000 },
      { date: '2026-10-29', amount: 120000 },
    ]);
    expect(visitCashInRange(v, '2026-10-01', '2026-10-31')).toBe(200000);
  });

  it('merges a payoff made on the first payment day', () => {
    const v = {
      ...umum,
      status_pembayaran: 'Lunas',
      tanggal_bayar: '2026-10-27',
      tanggal_pelunasan: '2026-10-27',
      nominal_pelunasan: 120000,
    };
    expect(events(v)).toEqual([{ date: '2026-10-27', amount: 200000 }]);
    expect(isPaidOnAnotherDay(v)).toBe(false);
  });

  it('brings in nothing for unpaid or cancelled visits', () => {
    expect(events({ ...umum, status_pembayaran: 'Belum Bayar' })).toEqual([]);
    expect(events({ ...umum, status_pembayaran: 'Batal' })).toEqual([]);
  });

  it('counts only extra charges for BPJS patients', () => {
    expect(
      events({ ...umum, jenis_pasien: 'BPJS', status_pembayaran: 'Lunas' })
    ).toEqual([{ date: '2026-10-27', amount: 50000 }]);
  });
});

describe('cashDateOrFilter', () => {
  it('matches examination, first payment, and payoff dates', () => {
    expect(cashDateOrFilter('2026-10-01', '2026-10-31')).toBe(
      'and(tanggal_periksa.gte.2026-10-01,tanggal_periksa.lte.2026-10-31),' +
        'and(tanggal_bayar.gte.2026-10-01,tanggal_bayar.lte.2026-10-31),' +
        'and(tanggal_pelunasan.gte.2026-10-01,tanggal_pelunasan.lte.2026-10-31)'
    );
  });
});

describe('buildSettlePaymentDates', () => {
  const waiting = {
    tanggal_periksa: '2026-10-27',
    status_pembayaran: 'Menunggu Pembayaran',
    jenis_pasien: 'UMUM',
    biaya_periksa: 150000,
    pendapatan_lain: 50000,
  };

  it('stamps today on a first settle as Lunas, Piutang, or free visit', () => {
    for (const status of ['Lunas', 'Piutang', 'Ditanggung BPJS']) {
      expect(
        buildSettlePaymentDates(waiting, { status, total: 200000, outstanding: 0, method: 'Tunai' }, '2026-10-28')
      ).toEqual({
        tanggal_bayar: '2026-10-28',
        tanggal_pelunasan: null,
        nominal_pelunasan: null,
        metode_pelunasan: null,
        jenis_pembayaran: 'Tunai',
      });
    }
  });

  it('writes nothing while the visit stays unpaid', () => {
    expect(
      buildSettlePaymentDates(waiting, { status: 'Belum Bayar', total: 200000, outstanding: 0, method: 'Tunai' }, '2026-10-28')
    ).toEqual({});
  });

  const piutang = {
    ...waiting,
    tanggal_bayar: '2026-10-27',
    status_pembayaran: 'Piutang',
    piutang_nominal: 120000,
    jenis_pembayaran: 'Tunai',
  };

  it('books a transfer payoff on its own day and keeps the cash first payment', () => {
    expect(
      buildSettlePaymentDates(piutang, { status: 'Lunas', total: 200000, outstanding: 0, method: 'TF' }, '2026-10-29')
    ).toEqual({
      tanggal_bayar: '2026-10-27',
      jenis_pembayaran: 'Tunai',
      tanggal_pelunasan: '2026-10-29',
      nominal_pelunasan: 120000,
      metode_pelunasan: 'TF',
    });
  });

  it('keeps the first payment date when a Piutang is settled again as Piutang', () => {
    const result = buildSettlePaymentDates(
      piutang,
      { status: 'Piutang', total: 200000, outstanding: 70000, method: 'Tunai' },
      '2026-10-29'
    );
    expect(result).toMatchObject({ tanggal_bayar: '2026-10-27', tanggal_pelunasan: '2026-10-29', nominal_pelunasan: 50000 });
  });

  it('books charges added at the counter on the payoff day, not the first day', () => {
    const result = buildSettlePaymentDates(
      piutang,
      { status: 'Lunas', total: 220000, outstanding: 0, method: 'Tunai' },
      '2026-10-29'
    );
    expect(result.nominal_pelunasan).toBe(140000);
    const after = { ...piutang, ...result, status_pembayaran: 'Lunas', piutang_nominal: 0, pendapatan_lain: 70000 };
    expect(events(after)).toEqual([
      { date: '2026-10-27', amount: 80000 },
      { date: '2026-10-29', amount: 140000 },
    ]);
  });

  it('anchors a legacy Piutang without tanggal_bayar to the examination date', () => {
    const legacy = { ...piutang, tanggal_periksa: '2026-09-02', tanggal_bayar: null, piutang_nominal: '50000' };
    expect(
      buildSettlePaymentDates(legacy, { status: 'Lunas', total: 200000, outstanding: 0, method: 'Tunai' }, '2026-10-29')
    ).toMatchObject({ tanggal_bayar: '2026-09-02', tanggal_pelunasan: '2026-10-29', nominal_pelunasan: 50000 });
  });
});

describe('getVisitCashEvents payment methods', () => {
  it('keeps the first payment method and the payoff method apart', () => {
    const v = {
      ...umum,
      status_pembayaran: 'Lunas',
      jenis_pembayaran: 'Tunai',
      tanggal_bayar: '2026-10-27',
      tanggal_pelunasan: '2026-10-29',
      nominal_pelunasan: 120000,
      metode_pelunasan: 'TF',
    };
    expect(getVisitCashEvents(v)).toEqual([
      { date: '2026-10-27', amount: 80000, method: 'Tunai' },
      { date: '2026-10-29', amount: 120000, method: 'TF' },
    ]);
  });

  it('counts only received money for a Piutang that already had an instalment', () => {
    const v = {
      ...umum,
      status_pembayaran: 'Piutang',
      jenis_pembayaran: 'Tunai',
      tanggal_bayar: '2026-10-27',
      piutang_nominal: 70000,
      tanggal_pelunasan: '2026-10-29',
      nominal_pelunasan: 50000,
    };
    expect(events(v)).toEqual([
      { date: '2026-10-27', amount: 80000 },
      { date: '2026-10-29', amount: 50000 },
    ]);
  });
});

describe('describeCashDates', () => {
  it('shows the cash date, the open balance, and the payoff date', () => {
    expect(describeCashDates({ ...umum, status_pembayaran: 'Lunas' })).toBe('2026-10-27');
    expect(describeCashDates({ ...umum, status_pembayaran: 'Lunas', tanggal_bayar: '2026-10-28' })).toBe(
      '2026-10-28'
    );
    expect(
      describeCashDates({ ...umum, status_pembayaran: 'Piutang', tanggal_bayar: '2026-10-27', piutang_nominal: 1 })
    ).toBe('2026-10-27, sisa piutang');
    expect(
      describeCashDates({
        ...umum,
        status_pembayaran: 'Lunas',
        tanggal_bayar: '2026-10-27',
        tanggal_pelunasan: '2026-10-29',
        nominal_pelunasan: 120000,
      })
    ).toBe('2026-10-27, lunas 2026-10-29');
  });

  it('shows a dash for a visit that is not paid yet', () => {
    expect(describeCashDates({ ...umum, status_pembayaran: 'Belum Bayar' })).toBe('-');
  });
});

describe('getReceiptPaymentDates', () => {
  it('returns nothing when the visit was paid on its examination day', () => {
    expect(getReceiptPaymentDates({ tanggal_periksa: '2026-10-27' })).toBeNull();
    expect(getReceiptPaymentDates({ tanggal_periksa: '2026-10-27', tanggal_bayar: '2026-10-27' })).toBeNull();
  });

  it('returns the payment and payoff dates when they differ', () => {
    expect(getReceiptPaymentDates({ tanggal_periksa: '2026-10-27', tanggal_bayar: '2026-10-28' })).toEqual({
      tanggalBayar: '2026-10-28',
      tanggalPelunasan: null,
    });
    expect(
      getReceiptPaymentDates({
        tanggal_periksa: '2026-10-27',
        tanggal_bayar: '2026-10-27',
        tanggal_pelunasan: '2026-10-29',
      })
    ).toEqual({ tanggalBayar: '2026-10-27', tanggalPelunasan: '2026-10-29' });
  });
});

describe('drawerCashEntries', () => {
  const visits = [
    { ...umum, id: 'a', status_pembayaran: 'Lunas', jenis_pembayaran: 'Tunai' },
    { ...umum, id: 'b', status_pembayaran: 'Lunas', jenis_pembayaran: 'TF' },
    { ...umum, id: 'c', status_pembayaran: 'Belum Bayar', jenis_pembayaran: 'Tunai' },
    {
      ...umum,
      id: 'd',
      tanggal_periksa: '2026-09-30',
      status_pembayaran: 'Lunas',
      jenis_pembayaran: 'Tunai',
      tanggal_bayar: '2026-09-30',
      tanggal_pelunasan: '2026-10-02',
      nominal_pelunasan: 120000,
    },
  ];

  it('keeps cash-paid money received inside the range, per day received', () => {
    expect(drawerCashEntries(visits, '2026-10-01', '2026-10-31')).toEqual([
      { visitId: 'a', date: '2026-10-27', amount: 200000 },
      { visitId: 'd', date: '2026-10-02', amount: 120000 },
    ]);
  });

  it('leaves the payoff out of the month it was not received in', () => {
    expect(drawerCashEntries(visits, '2026-09-01', '2026-09-30')).toEqual([
      { visitId: 'd', date: '2026-09-30', amount: 80000 },
    ]);
  });
});
