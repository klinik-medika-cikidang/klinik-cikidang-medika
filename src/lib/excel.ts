import * as XLSX from 'xlsx';
import { MONTH_NAMES_ID } from '@/constants/clinic';
import { formatLocalDateToYMD, groupExpensesByMonth, isTransferPayment } from './utils';
import { getVisitCashEvents, type CashDateVisit } from './cash-date';

// toISOString() is UTC, so a file downloaded before 07:00 WIB was named after the
// previous day.
function getFileNameDate(): string {
  return formatLocalDateToYMD().replace(/-/g, '');
}

export interface VisitExportRow {
  no_rm: string;
  nama_pasien: string;
  jenis_kelamin: string;
  desa: string;
  tanggal_periksa: string;
  /** F-021: day the money was received, see describeCashDates. */
  tanggal_bayar: string;
  nama_dokter: string;
  kode_icd10: string;
  diagnosa_deskripsi: string;
  jenis_pasien: string;
  biaya_periksa: number;
  pendapatan_lain: number;
  total_biaya: number;
  jenis_pembayaran: string;
}

export interface CashFlowExportRow {
  tanggal: string;
  jenis: string;
  kategori: string;
  nominal: number;
  keterangan: string;
}

export interface MorbidityExportRow {
  rank: number;
  kode_icd10: string;
  diagnosa_deskripsi: string;
  jumlah_kasus: number;
  persentase: number;
}

interface DateRange {
  start?: string;
  end?: string;
}

/** One amount of money received from a visit, as listed in the Penerimaan Kasir sheet. */
export interface CashReceiptExportRow {
  tanggal_bayar: string;
  tanggal_periksa: string;
  no_rm: string;
  nama_pasien: string;
  jenis_pasien: string;
  metode: 'Tunai' | 'TF';
  nominal: number;
}

export interface CashReceiptSource extends CashDateVisit {
  no_rm: string;
  nama_pasien: string;
}

export const VISIT_SHEET_NAME = 'Rekap Kunjungan';
export const CASH_RECEIPT_SHEET_NAME = 'Penerimaan Kasir';

export const FULL_WORKBOOK_SHEET_NAMES = [
  VISIT_SHEET_NAME,
  CASH_RECEIPT_SHEET_NAME,
  'Morbiditas ICD-10',
  'Arus Kas Operasional',
  'Rekap Pengeluaran',
] as const;

// The visit sheet holds bills by examination date while cash follows the day it was received
// (F-021), so a late payment or an open Piutang makes the two totals differ on purpose.
const VISIT_BILL_LABEL = 'Total Tagihan (tgl periksa)';

/**
 * Cash events received inside [start, end] (empty bounds mean unbounded). Built from the same
 * getVisitCashEvents as the Laporan "Akumulasi Billing Kasir", so both totals match for the
 * same visits.
 */
export function buildCashReceiptRows(
  visits: CashReceiptSource[],
  start?: string | null,
  end?: string | null
): CashReceiptExportRow[] {
  const rows: CashReceiptExportRow[] = [];
  for (const v of visits) {
    for (const e of getVisitCashEvents(v)) {
      if ((start && e.date < start) || (end && e.date > end)) continue;
      rows.push({
        tanggal_bayar: e.date,
        tanggal_periksa: v.tanggal_periksa,
        no_rm: v.no_rm,
        nama_pasien: v.nama_pasien,
        jenis_pasien: v.jenis_pasien || '-',
        metode: isTransferPayment(e.method) ? 'TF' : 'Tunai',
        nominal: e.amount,
      });
    }
  }
  return rows.sort(
    (a, b) => a.tanggal_bayar.localeCompare(b.tanggal_bayar) || a.no_rm.localeCompare(b.no_rm)
  );
}

export function cashReceiptSheetData(
  rows: CashReceiptExportRow[],
  dateRange?: DateRange
): (string | number)[][] {
  const total = rows.reduce((sum, r) => sum + r.nominal, 0);
  return [
    ...createMetadataHeader('PENERIMAAN KASIR MENURUT TANGGAL BAYAR', dateRange),
    ['Totalnya sama dengan Akumulasi Billing Kasir di Laporan untuk filter yang sama.'],
    [],
    ['Tanggal Bayar', 'Tanggal Periksa', 'No RM', 'Nama Pasien', 'Jenis Pasien', 'Metode', 'Nominal (Rp)'],
    ...rows.map((r) => [r.tanggal_bayar, r.tanggal_periksa, r.no_rm, r.nama_pasien, r.jenis_pasien, r.metode, r.nominal]),
    ['Total Penerimaan', '', '', '', '', '', total],
  ];
}

function visitSheetData(title: string, visits: VisitExportRow[], dateRange?: DateRange): (string | number)[][] {
  const headers = [
    'No RM',
    'Nama Pasien',
    'L/P',
    'Desa / Wilayah',
    'Tanggal Periksa',
    'Tanggal Bayar',
    'Dokter Pemeriksa',
    'Kode ICD-10',
    'Diagnosa Medis',
    'Jenis Pasien',
    'Biaya Periksa (Rp)',
    'Pendapatan Lain (Rp)',
    `${VISIT_BILL_LABEL} (Rp)`,
    'Pembayaran',
  ];
  const rows = visits.map((v) => [
    v.no_rm,
    v.nama_pasien,
    v.jenis_kelamin,
    v.desa,
    v.tanggal_periksa,
    v.tanggal_bayar,
    v.nama_dokter,
    v.kode_icd10,
    v.diagnosa_deskripsi,
    v.jenis_pasien,
    v.biaya_periksa,
    v.pendapatan_lain,
    v.total_biaya,
    v.jenis_pembayaran,
  ]);
  const total = visits.reduce((sum, v) => sum + (v.total_biaya || 0), 0);
  return [
    ...createMetadataHeader(title, dateRange),
    headers,
    ...rows,
    [VISIT_BILL_LABEL, '', '', '', '', '', '', '', '', '', '', '', total, ''],
  ];
}

function appendSheet(wb: XLSX.WorkBook, data: (string | number)[][], name: string) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = calculateColumnWidths(data);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function calculateColumnWidths(data: (string | number)[][]): { wch: number }[] {
  const colWidths: { wch: number }[] = [];
  data.forEach((row) => {
    row.forEach((cell, colIdx) => {
      const cellLen = cell !== undefined && cell !== null ? String(cell).length : 10;
      if (!colWidths[colIdx] || cellLen > colWidths[colIdx].wch) {
        colWidths[colIdx] = { wch: Math.min(Math.max(cellLen + 3, 12), 48) };
      }
    });
  });
  return colWidths;
}

function createMetadataHeader(title: string, dateRange?: DateRange): (string | number)[][] {
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const periodStr =
    dateRange?.start && dateRange?.end
      ? `${dateRange.start} s/d ${dateRange.end}`
      : 'Semua Data Terdaftar';

  return [
    ['KLINIK PRATAMA CIKIDANG MEDIKA'],
    [title],
    [`Periode: ${periodStr} | Tanggal Unduh: ${todayFormatted}`],
    [],
  ];
}

export function buildVisitsWorkbook(
  visits: VisitExportRow[],
  receipts: CashReceiptExportRow[],
  dateRange?: DateRange
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  appendSheet(wb, visitSheetData('LAPORAN REKAPITULASI KUNJUNGAN PASIEN & BILLING', visits, dateRange), VISIT_SHEET_NAME);
  appendSheet(wb, cashReceiptSheetData(receipts, dateRange), CASH_RECEIPT_SHEET_NAME);
  return wb;
}

export function exportVisitsToExcel(
  visits: VisitExportRow[],
  dateRange?: DateRange,
  receipts: CashReceiptExportRow[] = []
) {
  const wb = buildVisitsWorkbook(visits, receipts, dateRange);
  const fileNameDate = getFileNameDate();
  XLSX.writeFile(wb, `Laporan_Kunjungan_Cikidang_${fileNameDate}.xlsx`);
}

export function exportCashFlowsToExcel(flows: CashFlowExportRow[], dateRange?: DateRange) {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Tanggal Transaksi',
    'Jenis (Masuk/Keluar)',
    'Kategori Arus Kas',
    'Nominal Transaksi (Rp)',
    'Keterangan Transaksi',
  ];

  const rows = flows.map((f) => [
    f.tanggal,
    f.jenis,
    f.kategori,
    f.nominal,
    f.keterangan || '-',
  ]);

  const sheetData = [
    ...createMetadataHeader('LAPORAN MUTASI ARUS KAS & BUKU KAS OPERASIONAL', dateRange),
    headers,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = calculateColumnWidths(sheetData);

  XLSX.utils.book_append_sheet(wb, ws, 'Buku Kas');

  const fileNameDate = getFileNameDate();
  XLSX.writeFile(wb, `Laporan_Buku_Kas_Cikidang_${fileNameDate}.xlsx`);
}

export function exportMorbidityToExcel(morbidity: MorbidityExportRow[], dateRange?: DateRange) {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Peringkat',
    'Kode ICD-10',
    'Nama Diagnosa / Penyakit',
    'Jumlah Kasus',
    'Persentase (%)',
  ];

  const rows = morbidity.map((m) => [
    m.rank,
    m.kode_icd10,
    m.diagnosa_deskripsi,
    m.jumlah_kasus,
    Number(m.persentase.toFixed(2)),
  ]);

  const sheetData = [
    ...createMetadataHeader('LAPORAN 10 BESAR PENYAKIT (MORBIDITAS ICD-10)', dateRange),
    headers,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = calculateColumnWidths(sheetData);

  XLSX.utils.book_append_sheet(wb, ws, 'Morbiditas ICD-10');

  const fileNameDate = getFileNameDate();
  XLSX.writeFile(wb, `Laporan_Morbiditas_ICD10_Cikidang_${fileNameDate}.xlsx`);
}

export function buildFullClinicWorkbook(params: {
  visits: VisitExportRow[];
  receipts: CashReceiptExportRow[];
  flows: CashFlowExportRow[];
  morbidity: MorbidityExportRow[];
  dateRange?: DateRange;
}): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  appendSheet(wb, visitSheetData('REKAPITULASI KUNJUNGAN PASIEN', params.visits, params.dateRange), VISIT_SHEET_NAME);
  appendSheet(wb, cashReceiptSheetData(params.receipts, params.dateRange), CASH_RECEIPT_SHEET_NAME);

  const morbHeaders = [
    'Peringkat',
    'Kode ICD-10',
    'Nama Diagnosa / Penyakit',
    'Jumlah Kasus',
    'Persentase (%)',
  ];
  const morbRows = params.morbidity.map((m) => [
    m.rank,
    m.kode_icd10,
    m.diagnosa_deskripsi,
    m.jumlah_kasus,
    Number(m.persentase.toFixed(2)),
  ]);
  const morbSheetData = [
    ...createMetadataHeader('10 BESAR MORBIDITAS PENYAKIT ICD-10', params.dateRange),
    morbHeaders,
    ...morbRows,
  ];
  const wsMorb = XLSX.utils.aoa_to_sheet(morbSheetData);
  wsMorb['!cols'] = calculateColumnWidths(morbSheetData);
  XLSX.utils.book_append_sheet(wb, wsMorb, 'Morbiditas ICD-10');

  const flowHeaders = [
    'Tanggal Transaksi',
    'Jenis (Masuk/Keluar)',
    'Kategori Arus Kas',
    'Nominal Transaksi (Rp)',
    'Keterangan Transaksi',
  ];
  const flowRows = params.flows.map((f) => [
    f.tanggal,
    f.jenis,
    f.kategori,
    f.nominal,
    f.keterangan || '-',
  ]);
  const flowSheetData = [
    ...createMetadataHeader('MUTASI BUKU KAS OPERASIONAL', params.dateRange),
    flowHeaders,
    ...flowRows,
  ];
  const wsFlows = XLSX.utils.aoa_to_sheet(flowSheetData);
  wsFlows['!cols'] = calculateColumnWidths(flowSheetData);
  XLSX.utils.book_append_sheet(wb, wsFlows, 'Arus Kas Operasional');

  // F-020: same columns as the PENGELUARAN TOTAL pivot in the clinic sheet.
  const isIsoDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
  const recapRange =
    isIsoDate(params.dateRange?.start) && isIsoDate(params.dateRange?.end) ? params.dateRange : undefined;
  const recapRows = groupExpensesByMonth(params.flows, recapRange).map((r) => [
    r.year,
    MONTH_NAMES_ID[r.month - 1],
    r.klinik,
    r.nonKlinik,
    r.total,
  ]);
  const recapTotals = recapRows.reduce<number[]>(
    (acc, r) => [acc[0] + Number(r[2]), acc[1] + Number(r[3]), acc[2] + Number(r[4])],
    [0, 0, 0]
  );
  const recapSheetData = [
    ...createMetadataHeader('REKAP PENGELUARAN KLINIK DAN NON KLINIK', params.dateRange),
    ['Tahun', 'Bulan', 'Klinik (Rp)', 'Non Klinik (Rp)', 'Total (Rp)'],
    ...recapRows,
    ['Total Periode', '', ...recapTotals],
  ];
  const wsRecap = XLSX.utils.aoa_to_sheet(recapSheetData);
  wsRecap['!cols'] = calculateColumnWidths(recapSheetData);
  XLSX.utils.book_append_sheet(wb, wsRecap, 'Rekap Pengeluaran');

  return wb;
}

export function exportFullClinicWorkbook(params: {
  visits: VisitExportRow[];
  receipts?: CashReceiptExportRow[];
  flows: CashFlowExportRow[];
  morbidity: MorbidityExportRow[];
  dateRange?: DateRange;
}) {
  const wb = buildFullClinicWorkbook({ ...params, receipts: params.receipts ?? [] });
  const fileNameDate = getFileNameDate();
  XLSX.writeFile(wb, `Laporan_Lengkap_Klinik_Cikidang_${fileNameDate}.xlsx`);
}

export interface PublicHealthExportRow {
  program_type: string;
  tanggal_periksa?: string;
  no_rm?: string;
  nama: string;
  jenis_kelamin: string;
  ttl: string;
  desa?: string;
  alamat: string;
  no_nik: string;
  diagnosa: string;
  kategori_ptm?: string;
  lab: string;
  terapi: string;
  gpa?: string;
  hbsag: string;
  hiv?: string;
  syphilis?: string;
  jenis_kb: string;
  tanggal_kembali: string;
}

const PUBLIC_HEALTH_SHEET_CONFIG: Record<
  string,
  { sheetName: string; title: string; headers: string[] }
> = {
  PTM: {
    sheetName: 'PTM',
    title: 'LAPORAN PTM (PENYAKIT TIDAK MENULAR)',
    headers: [
      'Tanggal Periksa',
      'No RM',
      'Nama Pasien',
      'JK',
      'TTL',
      'Desa',
      'Alamat',
      'No NIK',
      'Kategori PTM',
      'Diagnosa',
      'Hasil Lab / Terapi',
    ],
  },
  ANC: {
    sheetName: 'ANC',
    title: 'LAPORAN ANC (ANTENATAL CARE)',
    headers: [
      'Tanggal Periksa',
      'No RM',
      'Nama Pasien',
      'JK',
      'TTL',
      'Desa',
      'Alamat',
      'No NIK',
      'Diagnosa',
      'GPA',
      'Terapi',
      'HbSAg',
    ],
  },
  KB: {
    sheetName: 'KB',
    title: 'LAPORAN KB (KELUARGA BERENCANA)',
    headers: [
      'Tanggal Periksa',
      'No RM',
      'Nama Pasien',
      'TTL',
      'Desa',
      'Alamat',
      'No NIK',
      'Jenis KB',
      'Kunjungan Kembali',
    ],
  },
  ELIMINASI_3: {
    sheetName: '3 Eliminasi',
    title: 'LAPORAN 3 ELIMINASI',
    headers: [
      'Tanggal Periksa',
      'No RM',
      'Nama Pasien',
      'JK',
      'TTL',
      'Desa',
      'Alamat',
      'No NIK',
      'Diagnosa',
      'GPA',
      'Terapi',
      'HbSAg',
      'HIV',
      'Sifilis',
    ],
  },
};

function buildPublicHealthRow(row: PublicHealthExportRow, program: string): (string | number)[] {
  const tgl = row.tanggal_periksa || '-';
  const rm = row.no_rm || '-';
  const desa = row.desa || '-';

  if (program === 'KB') {
    return [
      tgl,
      rm,
      row.nama,
      row.ttl,
      desa,
      row.alamat,
      row.no_nik,
      row.jenis_kb || row.terapi || '-',
      row.tanggal_kembali || '-',
    ];
  }
  if (program === 'ANC') {
    return [
      tgl,
      rm,
      row.nama,
      row.jenis_kelamin,
      row.ttl,
      desa,
      row.alamat,
      row.no_nik,
      row.diagnosa || '-',
      row.gpa || '-',
      row.terapi || '-',
      row.hbsag || '-',
    ];
  }
  if (program === 'ELIMINASI_3') {
    return [
      tgl,
      rm,
      row.nama,
      row.jenis_kelamin,
      row.ttl,
      desa,
      row.alamat,
      row.no_nik,
      row.diagnosa || '-',
      row.gpa || '-',
      row.terapi || '-',
      row.hbsag || '-',
      row.hiv || '-',
      row.syphilis || '-',
    ];
  }
  return [
    tgl,
    rm,
    row.nama,
    row.jenis_kelamin,
    row.ttl,
    desa,
    row.alamat,
    row.no_nik,
    row.kategori_ptm || '-',
    row.diagnosa || '-',
    row.lab || row.terapi || '-',
  ];
}

export function exportPublicHealthToExcel(
  records: PublicHealthExportRow[],
  dateRange?: DateRange
) {
  const wb = XLSX.utils.book_new();

  Object.entries(PUBLIC_HEALTH_SHEET_CONFIG).forEach(([program, config]) => {
    const rows = records.filter((r) => r.program_type === program);
    if (rows.length === 0) return;

    const sheetData = [
      ...createMetadataHeader(config.title, dateRange),
      config.headers,
      ...rows.map((row) => buildPublicHealthRow(row, program)),
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = calculateColumnWidths(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, config.sheetName);
  });

  if (wb.SheetNames.length === 0) {
    const sheetData = [
      ...createMetadataHeader('LAPORAN PROGRAM KESEHATAN', dateRange),
      ['Belum ada data program kesehatan pada periode ini'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = calculateColumnWidths(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Program Kesehatan');
  }

  const fileNameDate = getFileNameDate();
  XLSX.writeFile(wb, `Laporan_Program_Kesehatan_Cikidang_${fileNameDate}.xlsx`);
}

export interface PuskesmasRegisterExportRow {
  program_type: string;
  no_rm: string;
  gelar_jk: string;
  nama: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  usia: string;
  desa: string;
  alamat: string;
  no_ktp: string;
  no_bpjs: string;
  tanggal_periksa: string;
  bulan: string;
  kode_icd10: string;
  petugas: string;
  anamnesa: string;
  diagnosa: string;
  gpa: string;
  uk: string;
  tp: string;
  terapi: string;
  hiv: string;
  syphilis: string;
  hbsag: string;
  jenis_kb?: string;
  kunjungan_kembali?: string;
}

// Column order and labels follow the clinic's LAPORAN DPP sheets, so the export can be
// handed to the Puskesmas without being rebuilt in a spreadsheet.
const PUSKESMAS_BASE_COLUMNS: { key: keyof PuskesmasRegisterExportRow; label: string }[] = [
  { key: 'no_rm', label: 'No RM' },
  { key: 'gelar_jk', label: 'GK' },
  { key: 'nama', label: 'Nama Pasien' },
  { key: 'jenis_kelamin', label: 'JK' },
  { key: 'tanggal_lahir', label: 'Tgl Lahir' },
  { key: 'usia', label: 'Usia' },
  { key: 'desa', label: 'CodeAlamat' },
  { key: 'alamat', label: 'Alamat' },
  { key: 'no_ktp', label: 'KTP' },
  { key: 'no_bpjs', label: 'BPJS' },
  { key: 'tanggal_periksa', label: 'Tgl Pmrksan' },
  { key: 'bulan', label: 'Bulan' },
  { key: 'kode_icd10', label: 'Kode ICD' },
  { key: 'petugas', label: 'Dokter / Petugas' },
  { key: 'anamnesa', label: 'Hasil Anamnesa' },
];

const PUSKESMAS_PROGRAM_COLUMNS: Record<
  string,
  { sheetName: string; title: string; extra: { key: keyof PuskesmasRegisterExportRow; label: string }[] }
> = {
  PTM: {
    sheetName: 'PTM',
    title: 'LAPORAN PTM (PENYAKIT TIDAK MENULAR)',
    extra: [
      { key: 'diagnosa', label: 'Diagnosa' },
      { key: 'terapi', label: 'Terapi' },
    ],
  },
  ANC: {
    sheetName: 'ANC',
    title: 'LAPORAN ANC (ANTENATAL CARE)',
    extra: [
      { key: 'diagnosa', label: 'Diagnosa' },
      { key: 'gpa', label: 'GPA' },
      { key: 'uk', label: 'UK' },
      { key: 'tp', label: 'TP' },
      { key: 'terapi', label: 'Terapi' },
      { key: 'hbsag', label: 'HbSAg' },
    ],
  },
  KB: {
    sheetName: 'KB',
    title: 'LAPORAN KB (KELUARGA BERENCANA)',
    extra: [
      { key: 'jenis_kb', label: 'Jenis KB' },
      { key: 'kunjungan_kembali', label: 'Kunjungan Kembali' },
      { key: 'diagnosa', label: 'Diagnosa' },
      { key: 'terapi', label: 'Terapi' },
    ],
  },

  ELIMINASI_3: {
    sheetName: '3 Eliminasi',
    title: 'LAPORAN 3 ELIMINASI',
    extra: [
      { key: 'diagnosa', label: 'Diagnosa' },
      { key: 'gpa', label: 'GPA' },
      { key: 'uk', label: 'UK' },
      { key: 'tp', label: 'TP' },
      { key: 'terapi', label: 'Terapi' },
      { key: 'hiv', label: 'HIV' },
      { key: 'syphilis', label: 'SYPHILIS' },
      { key: 'hbsag', label: 'HbSAg' },
    ],
  },
};

export function puskesmasColumnsFor(program: string) {
  const config = PUSKESMAS_PROGRAM_COLUMNS[program];
  const columns = [...PUSKESMAS_BASE_COLUMNS, ...(config?.extra ?? [])];
  return columns.map((column) => ({ key: column.key, label: column.label }));
}

export function exportPuskesmasRegisterToExcel(
  records: PuskesmasRegisterExportRow[],
  dateRange?: DateRange
) {
  const wb = XLSX.utils.book_new();

  Object.entries(PUSKESMAS_PROGRAM_COLUMNS).forEach(([program, config]) => {
    const rows = records.filter((record) => record.program_type === program);
    if (rows.length === 0) return;

    const columns = [...PUSKESMAS_BASE_COLUMNS, ...config.extra];
    const sheetData = [
      ...createMetadataHeader(config.title, dateRange),
      columns.map((column) => column.label),
      ...rows.map((row) => columns.map((column) => row[column.key] ?? '-')),
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = calculateColumnWidths(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, config.sheetName);
  });

  const recapData = [
    ...createMetadataHeader('REKAP REGISTER PROGRAM KESEHATAN', dateRange),
    ['Program', 'Jumlah Catatan'],
    ...Object.keys(PUSKESMAS_PROGRAM_COLUMNS).map((program) => [
      program,
      records.filter((record) => record.program_type === program).length,
    ]),
    [],
    ['TOTAL', records.length],
  ];
  const recapSheet = XLSX.utils.aoa_to_sheet(recapData);
  recapSheet['!cols'] = calculateColumnWidths(recapData);
  XLSX.utils.book_append_sheet(wb, recapSheet, 'Rekap');

  const fileNameDate = getFileNameDate();
  XLSX.writeFile(wb, `Laporan_Puskesmas_Cikidang_${fileNameDate}.xlsx`);
}

export interface ReferralCommissionExportRow {
  tanggal: string;
  sumber_rujukan: string;
  nama_pasien: string;
  jenis_layanan: string;
  nominal_komisi: number;
  status_pembayaran: string;
  catatan: string;
}

export function exportReferralCommissionsToExcel(
  rows: ReferralCommissionExportRow[],
  year: number
) {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Tanggal',
    'Sumber Rujukan (Bidan)',
    'Nama Pasien',
    'Jenis Layanan',
    'Nominal Komisi (Rp)',
    'Status Pembayaran',
    'Catatan',
  ];

  const dataRows = rows.map((r) => [
    r.tanggal,
    r.sumber_rujukan,
    r.nama_pasien,
    r.jenis_layanan,
    r.nominal_komisi,
    r.status_pembayaran,
    r.catatan || '-',
  ]);

  const totalKomisi = rows.reduce((sum, r) => sum + (r.nominal_komisi || 0), 0);

  const sheetData = [
    ...createMetadataHeader(
      `LAPORAN RUJUKAN & KOMISI BIDAN TAHUN ${year}`,
      { start: `${year}-01-01`, end: `${year}-12-31` }
    ),
    headers,
    ...dataRows,
    [],
    ['TOTAL KOMISI', '', '', '', totalKomisi, '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = calculateColumnWidths(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, `Komisi ${year}`);

  const fileNameDate = getFileNameDate();
  XLSX.writeFile(wb, `Laporan_Komisi_Rujukan_Cikidang_${year}_${fileNameDate}.xlsx`);
}

export interface BidanAnnualSummaryRow {
  rank: number;
  bidan: string;
  label: string;
  referrals: number;
  patients: number;
}

export interface BidanAnnualDetailRow {
  bidan: string;
  tanggal_periksa: string;
  no_rm: string;
  nama_pasien: string;
  desa: string;
  kode_icd10: string;
  tindakan: string;
}

export function exportBidanAnnualRecapToExcel(
  summaryRows: BidanAnnualSummaryRow[],
  detailRows: BidanAnnualDetailRow[],
  year: number
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekap Bingkisan
  const summaryHeaders = [
    'Peringkat',
    'Nama Bidan',
    'Kode Bidan',
    'Jumlah Rujukan',
    'Jumlah Pasien Unik',
    'Alokasi Bingkisan Akhir Tahun',
  ];

  const summaryData = summaryRows.map((s, idx) => [
    idx + 1,
    s.label,
    s.bidan,
    s.referrals,
    s.patients,
    s.referrals >= 15
      ? 'Bingkisan Utama (Tier 1)'
      : s.referrals >= 5
      ? 'Bingkisan Standar (Tier 2)'
      : s.referrals > 0
      ? 'Bingkisan Apresiasi (Tier 3)'
      : 'Belum Ada Rujukan',
  ]);

  const totalReferrals = summaryRows.reduce((acc, r) => acc + r.referrals, 0);

  const sheet1Data = [
    ...createMetadataHeader(
      `REKAPITULASI RUJUKAN & ALOKASI BINGKISAN BIDAN TAHUN ${year}`,
      { start: `${year}-01-01`, end: `${year}-12-31` }
    ),
    summaryHeaders,
    ...summaryData,
    [],
    ['TOTAL RUJUKAN TAHUNAN', '', '', totalReferrals, '', ''],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = calculateColumnWidths(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, `Rekap Bingkisan ${year}`);

  // Sheet 2: Rincian Kunjungan Rujukan Pasien
  if (detailRows.length > 0) {
    const detailHeaders = [
      'No',
      'Bidan Perujuk',
      'Tanggal Periksa',
      'No. RM',
      'Nama Pasien',
      'Desa',
      'Kode ICD-10',
      'Tindakan Medis / Prosedur',
    ];

    const detailData = detailRows.map((d, idx) => [
      idx + 1,
      d.bidan,
      d.tanggal_periksa,
      d.no_rm,
      d.nama_pasien,
      d.desa,
      d.kode_icd10 || '-',
      d.tindakan || '-',
    ]);

    const sheet2Data = [
      ...createMetadataHeader(
        `RINCIAN KUNJUNGAN PASIEN RUJUKAN BIDAN TAHUN ${year}`,
        { start: `${year}-01-01`, end: `${year}-12-31` }
      ),
      detailHeaders,
      ...detailData,
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    ws2['!cols'] = calculateColumnWidths(sheet2Data);
    XLSX.utils.book_append_sheet(wb, ws2, 'Rincian Kunjungan Pasien');
  }

  const fileNameDate = getFileNameDate();
  XLSX.writeFile(wb, `Rekap_Bingkisan_Bidan_${year}_${fileNameDate}.xlsx`);
}
