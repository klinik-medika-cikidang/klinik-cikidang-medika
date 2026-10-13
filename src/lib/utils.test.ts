import { describe, it, expect } from 'vitest';
import {
  parseFlexibleDate,
  calculateAgeFromDob,
  formatDateShort,
  formatLocalDateToYMD,
  normalizeRupiah,
  formatRupiah,
  isCashHandoverToOwnerOrBank,
  isOperationalExpense,
  isSettledVisit,
  isSettledCashVisit,
} from './utils';

describe('parseFlexibleDate', () => {
  it('parses standard ISO YYYY-MM-DD', () => {
    expect(parseFlexibleDate('1990-08-15')).toBe('1990-08-15');
    expect(parseFlexibleDate('2021/05/14')).toBe('2021-05-14');
  });

  it('parses standard Indonesian day-first formats DD/MM/YYYY and DD-MM-YYYY', () => {
    expect(parseFlexibleDate('15/08/1990')).toBe('1990-08-15');
    expect(parseFlexibleDate('15-08-1990')).toBe('1990-08-15');
    expect(parseFlexibleDate('01.01.2000')).toBe('2000-01-01');
    expect(parseFlexibleDate('5/8/2021')).toBe('2021-08-05');
  });

  it('parses compact 8-digit numeric DDMMYYYY', () => {
    expect(parseFlexibleDate('15081990')).toBe('1990-08-15');
    expect(parseFlexibleDate('01012015')).toBe('2015-01-01');
  });

  it('parses Indonesian textual month formats', () => {
    expect(parseFlexibleDate('15 Agustus 1990')).toBe('1990-08-15');
    expect(parseFlexibleDate('15 Ags 1990')).toBe('1990-08-15');
    expect(parseFlexibleDate('1 Mei 2020')).toBe('2020-05-01');
    expect(parseFlexibleDate('12 Desember 2012')).toBe('2012-12-12');
  });

  it('handles invalid or empty dates gracefully', () => {
    expect(parseFlexibleDate('')).toBeNull();
    expect(parseFlexibleDate(null)).toBeNull();
    expect(parseFlexibleDate('bukan tanggal')).toBeNull();
    expect(parseFlexibleDate('99/99/9999')).toBeNull();
  });
});

describe('calculateAgeFromDob', () => {
  it('calculates age in years correctly', () => {
    const dob = '2000-01-01';
    const age = calculateAgeFromDob(dob);
    expect(age).toBeGreaterThanOrEqual(24);
  });

  it('returns null on invalid date', () => {
    expect(calculateAgeFromDob(null)).toBeNull();
    expect(calculateAgeFromDob('')).toBeNull();
    expect(calculateAgeFromDob('invalid')).toBeNull();
  });
});

describe('formatDateShort', () => {
  it('formats dates in Indonesian short style', () => {
    const formatted = formatDateShort('1990-08-15');
    expect(formatted).toContain('1990');
    expect(formatted.toLowerCase()).toMatch(/ags|agu/);
  });

  it('returns dash for null/empty', () => {
    expect(formatDateShort(null)).toBe('-');
    expect(formatDateShort('')).toBe('-');
  });
});

describe('formatLocalDateToYMD', () => {
  it('formats 1st of month correctly without shifting back to previous month', () => {
    // 1st of October 2026 at midnight local time
    const oct1 = new Date(2026, 9, 1, 0, 0, 0);
    expect(formatLocalDateToYMD(oct1)).toBe('2026-10-01');
  });

  it('formats last day of month correctly', () => {
    // Last day of October 2026
    const octEnd = new Date(2026, 10, 0, 23, 59, 59);
    expect(formatLocalDateToYMD(octEnd)).toBe('2026-10-31');
  });

  it('formats arbitrary dates with zero padding', () => {
    const date = new Date(2026, 0, 5);
    expect(formatLocalDateToYMD(date)).toBe('2026-01-05');
  });
});

describe('normalizeRupiah & formatRupiah', () => {
  it('treats amounts 1:1 in full Rupiah after database backfill', () => {
    expect(normalizeRupiah(500)).toBe(500);
    expect(normalizeRupiah(1000)).toBe(1000);
    expect(normalizeRupiah(2500)).toBe(2500);
    expect(normalizeRupiah(5000)).toBe(5000);
    expect(normalizeRupiah(2750000)).toBe(2750000);
    expect(formatRupiah(2500)).toContain('2.500');
    expect(formatRupiah(5000)).not.toContain('5.000.000');
    expect(formatRupiah(2750000)).toContain('2.750.000');
  });

  it('handles zero and invalid numbers gracefully', () => {
    expect(normalizeRupiah(0)).toBe(0);
    expect(normalizeRupiah(NaN)).toBe(0);
  });
});

describe('isSettledVisit & isSettledCashVisit', () => {
  it('treats legacy visits with NULL or empty status as settled', () => {
    expect(isSettledVisit({ status_pembayaran: null })).toBe(true);
    expect(isSettledVisit({ status_pembayaran: '' })).toBe(true);
    expect(isSettledVisit({})).toBe(true);
  });

  it('excludes unsettled payment statuses', () => {
    expect(isSettledVisit({ status_pembayaran: 'Batal' })).toBe(false);
    expect(isSettledVisit({ status_pembayaran: 'Belum Bayar' })).toBe(false);
    expect(isSettledVisit({ status_pembayaran: 'Menunggu Dokter' })).toBe(false);
    expect(isSettledVisit({ status_pembayaran: 'Menunggu Kasir' })).toBe(false);
    expect(isSettledVisit({ status_pembayaran: 'Menunggu Pembayaran' })).toBe(false);
    expect(isSettledVisit({ status_pembayaran: 'Pending' })).toBe(false);
  });

  it('identifies settled cash visits and excludes transfer methods', () => {
    expect(isSettledCashVisit({ status_pembayaran: 'Lunas', jenis_pembayaran: 'Tunai' })).toBe(true);
    expect(isSettledCashVisit({ status_pembayaran: null, jenis_pembayaran: 'Tunai' })).toBe(true);
    expect(isSettledCashVisit({ status_pembayaran: 'Lunas', jenis_pembayaran: 'TF' })).toBe(false);
    expect(isSettledCashVisit({ status_pembayaran: 'Lunas', jenis_pembayaran: 'Transfer' })).toBe(false);
    expect(isSettledCashVisit({ status_pembayaran: 'Batal', jenis_pembayaran: 'Tunai' })).toBe(false);
  });
});

describe('isCashHandoverToOwnerOrBank & isOperationalExpense', () => {
  it('identifies Setor ke Rekening Pemilik and Setor Tunai as cash handover, not operational expense', () => {
    const setorPemilik = { jenis: 'Keluar', kategori: 'Setor ke Rekening Pemilik' };
    const setorTunai = { jenis: 'Masuk', kategori: 'Setor Tunai' };
    expect(isCashHandoverToOwnerOrBank(setorPemilik)).toBe(true);
    expect(isCashHandoverToOwnerOrBank(setorTunai)).toBe(true);
    expect(isOperationalExpense(setorPemilik)).toBe(false);
    expect(isOperationalExpense(setorTunai)).toBe(false);
  });

  it('identifies real operational outflows as operational expenses', () => {
    const obat = { jenis: 'Keluar', kategori: 'Pengeluaran Obat / Operasional' };
    const nonKlinik = { jenis: 'Keluar', kategori: 'Pengeluaran Non Klinik' };
    expect(isCashHandoverToOwnerOrBank(obat)).toBe(false);
    expect(isOperationalExpense(obat)).toBe(true);
    expect(isOperationalExpense(nonKlinik)).toBe(true);
  });
});
