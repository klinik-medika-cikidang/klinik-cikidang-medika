import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeRupiah(amount: number): number {
  if (!amount || isNaN(amount)) return 0;
  // All historical and new data in database are now stored in full Rupiah 1:1.
  return Number(amount);
}

/**
 * Unsettled payment statuses that must NOT be counted as revenue.
 * Visits with these statuses are either cancelled or currently in queue/examination.
 */
export const UNSETTLED_PAYMENT_STATUSES = [
  'Batal',
  'Belum Bayar',
  'Menunggu Dokter',
  'Menunggu Kasir',
  'Menunggu Pembayaran',
  'Pending',
] as const;

export function isSettledVisit(visit: { status_pembayaran?: string | null }): boolean {
  const status = (visit.status_pembayaran || '').trim();
  if (!status) return true; // Legacy records with NULL status are considered settled
  return !(UNSETTLED_PAYMENT_STATUSES as readonly string[]).includes(status);
}

// One definition of cashier revenue shared by Dashboard, Laporan, and the Excel export,
// so the three screens cannot drift apart. BPJS patients pay no fee, but their extra
// charges pass through the cashier and are counted.
export function computeVisitRevenue(visit: {
  jenis_pasien?: string | null;
  biaya_periksa?: number | string | null;
  pendapatan_lain?: number | string | null;
  status_pembayaran?: string | null;
}): number {
  if (!isSettledVisit(visit)) return 0;
  const biaya = visit.jenis_pasien === 'BPJS' ? 0 : Number(visit.biaya_periksa) || 0;
  return biaya + (Number(visit.pendapatan_lain) || 0);
}

// supabase-js returns PostgrestError as a plain object, so `instanceof Error` misses it
// and the real database message used to be replaced by the generic fallback.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const { message, hint } = err as { message?: unknown; hint?: unknown };
    if (typeof message === 'string' && message.trim()) {
      return typeof hint === 'string' && hint.trim() ? `${message} (${hint})` : message;
    }
  }
  return fallback;
}

// Staff used to type tariffs in thousands on the old Google Sheets ("150" for Rp 150.000).
// No clinic tariff is below Rp 1.000, so such a value is almost certainly that habit and
// must be confirmed instead of being saved silently.
export function isLikelyShorthandRupiah(amount: number): boolean {
  const val = Number(amount) || 0;
  return val > 0 && val < 1000;
}

export interface CashPositionInput {
  tunaiRevenue: number;
  transferRevenue: number;
  bpjsCapitation: number;
  otherCashIn: number;
  operationalExpenses: number;
  /** Portion of operationalExpenses paid by transfer; it leaves the bank, not the drawer. */
  transferExpenses?: number;
  ownerOrBankDeposits: number;
  /** F-023: cash already in the drawer at the start of the period; never income. */
  saldoAwal?: number;
}

// Net income is derived from the same buckets as the drawer and bank balances, so
// drawer + bank always equals net income plus Saldo Awal and no revenue source can be
// left out of one side.
export function summarizeCashPosition(input: CashPositionInput) {
  const netIncome =
    input.tunaiRevenue +
    input.transferRevenue +
    input.bpjsCapitation +
    input.otherCashIn -
    input.operationalExpenses;
  const transferExpenses = input.transferExpenses ?? 0;
  const drawerCash =
    (input.saldoAwal ?? 0) +
    input.tunaiRevenue -
    (input.operationalExpenses - transferExpenses) -
    input.ownerOrBankDeposits;
  const bankCash =
    input.bpjsCapitation +
    input.transferRevenue +
    input.otherCashIn +
    input.ownerOrBankDeposits -
    transferExpenses;
  return { netIncome, drawerCash, bankCash };
}

export function isSettledCashVisit(visit: {
  status_pembayaran?: string | null;
  jenis_pembayaran?: string | null;
}): boolean {
  if (!isSettledVisit(visit)) return false;
  return !isTransferPayment(visit.jenis_pembayaran);
}

// Missing values count as cash: legacy rows predate the payment-method columns.
export function isTransferPayment(method: string | null | undefined): boolean {
  const payMethod = (method || '').trim().toUpperCase();
  return payMethod === 'TF' || payMethod === 'TRANSFER';
}

export function isCashHandoverToOwnerOrBank(flow: {
  jenis?: string | null;
  kategori?: string | null;
}): boolean {
  const kat = (flow.kategori || '').trim().toLowerCase();
  return (
    kat === 'setor tunai' ||
    kat.includes('setor tunai') ||
    kat === 'setor ke rekening pemilik' ||
    kat.includes('setor ke rekening pemilik')
  );
}

export function isOperationalExpense(flow: {
  jenis?: string | null;
  kategori?: string | null;
}): boolean {
  return flow.jenis === 'Keluar' && !isCashHandoverToOwnerOrBank(flow);
}

export type ExpenseScope = 'klinik' | 'non_klinik';

type ExpenseFlowLike = {
  tanggal?: string | null;
  jenis?: string | null;
  kategori?: string | null;
  nominal?: number | string | null;
};

// F-020: the clinic sheet splits spending into "Klinik" and "Non Klinik". Only
// "Pengeluaran Non Klinik" is non-clinic; every other operational expense is clinic
// spending, and cash handovers are neither.
export function getExpenseScope(flow: { jenis?: string | null; kategori?: string | null }): ExpenseScope | null {
  if (!isOperationalExpense(flow)) return null;
  return (flow.kategori || '').trim() === 'Pengeluaran Non Klinik' ? 'non_klinik' : 'klinik';
}

export function summarizeExpensesByScope(flows: ExpenseFlowLike[]) {
  let klinik = 0;
  let nonKlinik = 0;
  for (const flow of flows) {
    const scope = getExpenseScope(flow);
    const nominal = Number(flow.nominal) || 0;
    if (scope === 'klinik') klinik += nominal;
    else if (scope === 'non_klinik') nonKlinik += nominal;
  }
  return { klinik, nonKlinik, total: klinik + nonKlinik };
}

const MAX_RECAP_MONTHS = 240;

export interface MonthlyExpenseRecap {
  year: number;
  month: number;
  klinik: number;
  nonKlinik: number;
  total: number;
}

/**
 * One row per calendar month, like the ANALISA pivot of the clinic sheet. Months
 * without expenses inside the range are kept as zero rows. Without a full range the
 * months span the first to the last month that has data.
 */
export function groupExpensesByMonth(
  flows: ExpenseFlowLike[],
  range?: { start?: string | null; end?: string | null }
): MonthlyExpenseRecap[] {
  const totals = new Map<string, { klinik: number; nonKlinik: number }>();
  for (const flow of flows) {
    const scope = getExpenseScope(flow);
    if (!scope || !flow.tanggal) continue;
    const key = flow.tanggal.slice(0, 7);
    const bucket = totals.get(key) || { klinik: 0, nonKlinik: 0 };
    const nominal = Number(flow.nominal) || 0;
    if (scope === 'klinik') bucket.klinik += nominal;
    else bucket.nonKlinik += nominal;
    totals.set(key, bucket);
  }

  const dataMonths = [...totals.keys()].sort();
  // A half-typed date ("0002-10-01") must not expand into thousands of empty months.
  const isUsableDate = (value?: string | null) => Boolean(value && /^(19|20)\d{2}-\d{2}/.test(value));
  const useRange = isUsableDate(range?.start) && isUsableDate(range?.end);
  let first = useRange ? range!.start!.slice(0, 7) : dataMonths[0];
  const last = useRange ? range!.end!.slice(0, 7) : dataMonths[dataMonths.length - 1];
  if (!first || !last || first > last) return [];
  const [ly, lm] = last.split('-').map(Number);
  const earliest = new Date(ly, lm - MAX_RECAP_MONTHS, 1);
  const earliestKey = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}`;
  if (first < earliestKey) first = earliestKey;

  const rows: MonthlyExpenseRecap[] = [];
  let [year, month] = first.split('-').map(Number);
  const [lastYear, lastMonth] = last.split('-').map(Number);
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const bucket = totals.get(key) || { klinik: 0, nonKlinik: 0 };
    rows.push({ year, month, ...bucket, total: bucket.klinik + bucket.nonKlinik });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return rows;
}

// An expense paid by transfer is still a clinic cost, but it does not take money
// out of the cashier drawer.
export function isDrawerCashExpense(flow: {
  jenis?: string | null;
  kategori?: string | null;
  jenis_pembayaran?: string | null;
}): boolean {
  return isOperationalExpense(flow) && !isTransferPayment(flow.jenis_pembayaran);
}

export function formatRupiah(amount: number): string {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

const INDO_MONTH_MAP: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, ags: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

export function parseFlexibleDate(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim().replace(/,/g, ' ');
  if (!clean) return null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 2. Day-first standard: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 3. Compact 8-digit numeric: DDMMYYYY
  const compactMatch = clean.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactMatch) {
    const d = parseInt(compactMatch[1], 10);
    const m = parseInt(compactMatch[2], 10);
    const y = parseInt(compactMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 4. Textual month format: "15 Agustus 1990" or "15-Ags-1990" or "15 Aug 1990"
  const textMatch = clean.match(/^(\d{1,2})\s*[-/.\s]\s*([a-zA-Z]+)\s*[-/.\s]\s*(\d{4})$/);
  if (textMatch) {
    const d = parseInt(textMatch[1], 10);
    const monthWord = textMatch[2].toLowerCase();
    const y = parseInt(textMatch[3], 10);
    const m = INDO_MONTH_MAP[monthWord];
    if (m && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
}

export function calculateAgeFromDob(dobString: string | null | undefined): number | null {
  if (!dobString) return null;
  try {
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  } catch {
    return null;
  }
}

// Reports state the period they are showing, so an empty result or a printed copy is
// never ambiguous about what was searched.
export function describePeriod(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return 'Semua Periode Data';
  if (startDate && endDate && startDate === endDate) return formatDateIndo(startDate);
  if (startDate && endDate) return `${formatDateIndo(startDate)} sampai ${formatDateIndo(endDate)}`;
  if (startDate) return `Mulai ${formatDateIndo(startDate)}`;
  return `Sampai ${formatDateIndo(endDate)}`;
}

/**
 * Formats a Date object to YYYY-MM-DD using local calendar components.
 * Prevents UTC timezone shift (e.g. UTC+7 WIB shifting 1st of month to previous month in toISOString).
 */
export function formatLocalDateToYMD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const INDO_MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MAX_DAILY_TREND_DAYS = 31;

function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Calendar days plotted by the daily trend charts for a dashboard period.
 * Days after `today` are cut so they do not render as zero activity. A period longer
 * than 31 days falls back to the last calendar month inside it, and an unbounded period
 * ("Semua Periode") uses the month of the latest visit.
 */
export function buildDailyTrendRange(
  period: { start: string; end: string },
  today: string,
  latestVisitDate?: string | null
): string[] {
  let start = period.start;
  let end = period.end;

  if (!start || !end) {
    const anchor = latestVisitDate && latestVisitDate < today ? latestVisitDate : today;
    const anchorDate = parseYMD(anchor);
    start = formatLocalDateToYMD(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
    end = formatLocalDateToYMD(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0));
  }

  if (end > today) end = today;
  if (end < start) return [];

  const endDate = parseYMD(end);
  const spanDays = Math.round((endDate.getTime() - parseYMD(start).getTime()) / 86400000) + 1;
  if (spanDays > MAX_DAILY_TREND_DAYS) {
    const monthStart = formatLocalDateToYMD(new Date(endDate.getFullYear(), endDate.getMonth(), 1));
    if (monthStart > start) start = monthStart;
  }

  const days: string[] = [];
  const cursor = parseYMD(start);
  while (formatLocalDateToYMD(cursor) <= end) {
    days.push(formatLocalDateToYMD(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Toggle label for the daily trend view, naming the month(s) actually plotted.
export function describeDailyTrendRange(days: string[]): string {
  if (days.length === 0) return 'Harian';
  const first = parseYMD(days[0]);
  const last = parseYMD(days[days.length - 1]);
  const firstMonth = INDO_MONTH_SHORT[first.getMonth()];
  const lastMonth = INDO_MONTH_SHORT[last.getMonth()];
  if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
    return `Harian ${firstMonth}`;
  }
  return `Harian ${firstMonth}/${lastMonth}`;
}
