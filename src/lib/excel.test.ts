import { describe, expect, it } from 'vitest';
import { visitCashInRange } from './cash-date';
import {
  buildCashReceiptRows,
  buildFullClinicWorkbook,
  buildVisitsWorkbook,
  cashReceiptSheetData,
  FULL_WORKBOOK_SHEET_NAMES,
  type CashReceiptSource,
} from './excel';

const base = {
  jenis_pasien: 'Umum',
  pendapatan_lain: 0,
  jenis_pembayaran: 'Tunai',
};

const visits: CashReceiptSource[] = [
  // Examined in October, paid in November: belongs to November money only.
  { ...base, no_rm: 'RM-1', nama_pasien: 'A', tanggal_periksa: '2026-10-31', tanggal_bayar: '2026-11-01', biaya_periksa: 150000, status_pembayaran: 'Lunas' },
  // Open Piutang: only the received part counts.
  { ...base, no_rm: 'RM-2', nama_pasien: 'B', tanggal_periksa: '2026-10-15', tanggal_bayar: '2026-10-15', biaya_periksa: 200000, status_pembayaran: 'Piutang', piutang_nominal: 150000 },
  // First part in October by cash, payoff in October by transfer.
  { ...base, no_rm: 'RM-3', nama_pasien: 'C', tanggal_periksa: '2026-10-02', tanggal_bayar: '2026-10-02', biaya_periksa: 300000, status_pembayaran: 'Lunas', tanggal_pelunasan: '2026-10-20', nominal_pelunasan: 100000, metode_pelunasan: 'TF' },
  // Examined in September, paid off in October.
  { ...base, no_rm: 'RM-4', nama_pasien: 'D', tanggal_periksa: '2026-09-28', tanggal_bayar: '2026-09-28', biaya_periksa: 120000, status_pembayaran: 'Lunas', tanggal_pelunasan: '2026-10-03', nominal_pelunasan: 70000, metode_pelunasan: 'Transfer' },
  // Not settled: no money.
  { ...base, no_rm: 'RM-5', nama_pasien: 'E', tanggal_periksa: '2026-10-10', biaya_periksa: 90000, status_pembayaran: 'Belum Bayar' },
];

describe('buildCashReceiptRows', () => {
  it('lists every cash event received inside the range by payment date', () => {
    const rows = buildCashReceiptRows(visits, '2026-10-01', '2026-10-31');
    expect(rows).toEqual([
      { tanggal_bayar: '2026-10-02', tanggal_periksa: '2026-10-02', no_rm: 'RM-3', nama_pasien: 'C', jenis_pasien: 'Umum', metode: 'Tunai', nominal: 200000 },
      { tanggal_bayar: '2026-10-03', tanggal_periksa: '2026-09-28', no_rm: 'RM-4', nama_pasien: 'D', jenis_pasien: 'Umum', metode: 'TF', nominal: 70000 },
      { tanggal_bayar: '2026-10-15', tanggal_periksa: '2026-10-15', no_rm: 'RM-2', nama_pasien: 'B', jenis_pasien: 'Umum', metode: 'Tunai', nominal: 50000 },
      { tanggal_bayar: '2026-10-20', tanggal_periksa: '2026-10-02', no_rm: 'RM-3', nama_pasien: 'C', jenis_pasien: 'Umum', metode: 'TF', nominal: 100000 },
    ]);
  });

  it('totals exactly the Laporan cash billing for the same range', () => {
    for (const [start, end] of [
      ['2026-10-01', '2026-10-31'],
      ['2026-11-01', '2026-11-30'],
      [null, null],
      ['2026-10-01', null],
    ] as const) {
      const kpi = visits.reduce((sum, v) => sum + visitCashInRange(v, start, end), 0);
      const rows = buildCashReceiptRows(visits, start, end);
      expect(rows.reduce((sum, r) => sum + r.nominal, 0)).toBe(kpi);
    }
  });
});

describe('cashReceiptSheetData', () => {
  it('ends with a total row equal to the sum of the nominal column', () => {
    const rows = buildCashReceiptRows(visits, '2026-10-01', '2026-10-31');
    const data = cashReceiptSheetData(rows, { start: '2026-10-01', end: '2026-10-31' });
    const header = data.find((r) => r[0] === 'Tanggal Bayar');
    expect(header).toEqual(['Tanggal Bayar', 'Tanggal Periksa', 'No RM', 'Nama Pasien', 'Jenis Pasien', 'Metode', 'Nominal (Rp)']);
    expect(data[data.length - 1]).toEqual(['Total Penerimaan', '', '', '', '', '', 420000]);
  });

  it('keeps a zero total row when nothing was received', () => {
    const data = cashReceiptSheetData([]);
    expect(data[data.length - 1]).toEqual(['Total Penerimaan', '', '', '', '', '', 0]);
  });
});

describe('workbook sheets', () => {
  it('full workbook writes exactly the sheets the button announces', () => {
    const wb = buildFullClinicWorkbook({ visits: [], receipts: [], flows: [], morbidity: [] });
    expect(wb.SheetNames).toEqual([...FULL_WORKBOOK_SHEET_NAMES]);
    expect(FULL_WORKBOOK_SHEET_NAMES).toHaveLength(5);
  });

  it('visit tab workbook carries the bills sheet and the cash receipt sheet', () => {
    const wb = buildVisitsWorkbook([], [], undefined);
    expect(wb.SheetNames).toEqual(['Rekap Kunjungan', 'Penerimaan Kasir']);
  });
});
