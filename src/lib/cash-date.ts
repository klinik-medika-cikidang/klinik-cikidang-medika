import { computeVisitRevenue, isSettledVisit, isTransferPayment } from '@/lib/utils';

// F-021: money follows the day it was received, while visit counts, morbidity, and
// registers stay on tanggal_periksa.

export interface CashDateVisit {
  tanggal_periksa: string;
  tanggal_bayar?: string | null;
  tanggal_pelunasan?: string | null;
  nominal_pelunasan?: number | string | null;
  piutang_nominal?: number | string | null;
  jenis_pasien?: string | null;
  biaya_periksa?: number | string | null;
  pendapatan_lain?: number | string | null;
  status_pembayaran?: string | null;
  jenis_pembayaran?: string | null;
  metode_pelunasan?: string | null;
}

export interface VisitCashEvent {
  date: string;
  amount: number;
  /** Payment method of this money ('Tunai' or 'TF'); a payoff can differ from the first payment. */
  method: string | null;
}

/** Rows settled before F-021 have no tanggal_bayar and are read as paid on the examination date. */
export function getCashDate(v: Pick<CashDateVisit, 'tanggal_periksa' | 'tanggal_bayar'>): string {
  return v.tanggal_bayar || v.tanggal_periksa;
}

/**
 * Cash a visit brought in, per day received and payment method.
 * - An open Piutang counts only what was received (bill minus the outstanding balance).
 * - Money received after the first payment (Piutang instalments or payoff) is booked on
 *   tanggal_pelunasan with metode_pelunasan. Several instalments collapse onto the latest
 *   one (DEC-021-2 allows a single payoff record).
 */
export function getVisitCashEvents(v: CashDateVisit): VisitCashEvent[] {
  if (!isSettledVisit(v)) return [];
  const total = computeVisitRevenue(v);
  const outstanding = v.status_pembayaran === 'Piutang' ? Number(v.piutang_nominal) || 0 : 0;
  const received = Math.max(0, total - outstanding);
  const firstMethod = v.jenis_pembayaran ?? null;
  const later = v.tanggal_pelunasan ? Math.min(Number(v.nominal_pelunasan) || 0, received) : 0;

  const events: VisitCashEvent[] = [{ date: getCashDate(v), amount: received - later, method: firstMethod }];
  if (later > 0 && v.tanggal_pelunasan) {
    events.push({ date: v.tanggal_pelunasan, amount: later, method: v.metode_pelunasan || firstMethod });
  }

  const merged = new Map<string, VisitCashEvent>();
  for (const e of events) {
    if (e.amount <= 0) continue;
    const key = `${e.date}|${e.method ?? ''}`;
    const existing = merged.get(key);
    if (existing) existing.amount += e.amount;
    else merged.set(key, { ...e });
  }
  return [...merged.values()];
}

/** Cash received from one visit inside [start, end]; empty bounds mean unbounded. */
export function visitCashInRange(v: CashDateVisit, start?: string | null, end?: string | null): number {
  return getVisitCashEvents(v)
    .filter((e) => (!start || e.date >= start) && (!end || e.date <= end))
    .reduce((sum, e) => sum + e.amount, 0);
}

/** True when any money of the visit was received on a different day than the examination. */
export function isPaidOnAnotherDay(v: CashDateVisit): boolean {
  return getVisitCashEvents(v).some((e) => e.date !== v.tanggal_periksa);
}

/**
 * PostgREST `or` filter selecting visits that were examined, first paid, or paid off
 * inside the range, so revenue by cash date never misses a visit examined earlier.
 */
export function cashDateOrFilter(start: string, end: string): string {
  const inRange = (column: string) => `and(${column}.gte.${start},${column}.lte.${end})`;
  return [inRange('tanggal_periksa'), inRange('tanggal_bayar'), inRange('tanggal_pelunasan')].join(',');
}

export interface SettlePaymentDates {
  tanggal_bayar?: string;
  tanggal_pelunasan?: string | null;
  nominal_pelunasan?: number | null;
  metode_pelunasan?: string | null;
  jenis_pembayaran?: string;
}

type SettlePrev = Pick<
  CashDateVisit,
  | 'tanggal_periksa'
  | 'tanggal_bayar'
  | 'tanggal_pelunasan'
  | 'nominal_pelunasan'
  | 'metode_pelunasan'
  | 'status_pembayaran'
  | 'piutang_nominal'
  | 'jenis_pasien'
  | 'biaya_periksa'
  | 'pendapatan_lain'
  | 'jenis_pembayaran'
>;

/**
 * Payment columns to write when the cashier settles a visit (DEC-021-3).
 * A visit that still owes money from an earlier payment keeps its first payment date and
 * method; whatever is received now (including charges added at the counter) is booked as
 * a payoff on today with today's method. Any other settle is a first payment today.
 */
export function buildSettlePaymentDates(
  prev: SettlePrev,
  next: { status: string; total: number; outstanding: number; method: string },
  today: string
): SettlePaymentDates {
  if (!isSettledVisit({ status_pembayaran: next.status })) return {};

  const prevOutstanding = Number(prev.piutang_nominal) || 0;
  const owedBefore = prev.status_pembayaran === 'Piutang' || (Boolean(prev.tanggal_bayar) && prevOutstanding > 0);
  if (!owedBefore) {
    return {
      tanggal_bayar: today,
      tanggal_pelunasan: null,
      nominal_pelunasan: null,
      metode_pelunasan: null,
      jenis_pembayaran: next.method,
    };
  }

  const prevTotal = computeVisitRevenue({ ...prev, status_pembayaran: 'Lunas' });
  const receivedNow = Math.max(0, next.total - prevTotal + prevOutstanding - next.outstanding);
  const prevPayoff = Number(prev.nominal_pelunasan) || 0;
  return {
    // A Piutang settled before F-021 has no tanggal_bayar; its first part was received
    // on the examination day, which is also where reports placed it until now.
    tanggal_bayar: prev.tanggal_bayar || prev.tanggal_periksa,
    jenis_pembayaran: prev.jenis_pembayaran || next.method,
    tanggal_pelunasan: receivedNow > 0 ? today : prev.tanggal_pelunasan ?? null,
    nominal_pelunasan: prevPayoff + receivedNow > 0 ? prevPayoff + receivedNow : null,
    metode_pelunasan: receivedNow > 0 ? next.method : prev.metode_pelunasan ?? null,
  };
}

/** Payment date text for the Laporan table and the Excel visit sheet. */
export function describeCashDates(v: CashDateVisit): string {
  if (!isSettledVisit(v)) return '-';
  const first = getCashDate(v);
  if (v.tanggal_pelunasan && v.tanggal_pelunasan !== first) return `${first}, lunas ${v.tanggal_pelunasan}`;
  if (v.status_pembayaran === 'Piutang') return `${first}, sisa piutang`;
  return first;
}

/** Payment dates the receipt must print, or null when everything was paid on the examination day. */
export function getReceiptPaymentDates(
  v: Pick<CashDateVisit, 'tanggal_periksa' | 'tanggal_bayar' | 'tanggal_pelunasan'>
): { tanggalBayar: string; tanggalPelunasan: string | null } | null {
  const tanggalBayar = getCashDate(v);
  const tanggalPelunasan = v.tanggal_pelunasan || null;
  const differs =
    tanggalBayar !== v.tanggal_periksa || (tanggalPelunasan !== null && tanggalPelunasan !== v.tanggal_periksa);
  return differs ? { tanggalBayar, tanggalPelunasan } : null;
}

export interface DrawerCashEntry {
  visitId: string;
  date: string;
  amount: number;
}

/**
 * Cash that physically entered the drawer inside [start, end], one entry per visit per day
 * received. Transfer payments go to the bank, so they never reach the drawer.
 */
export function drawerCashEntries(
  visits: (CashDateVisit & { id: string })[],
  start: string,
  end: string
): DrawerCashEntry[] {
  const entries: DrawerCashEntry[] = [];
  for (const v of visits) {
    for (const e of getVisitCashEvents(v)) {
      if (isTransferPayment(e.method)) continue;
      if (e.date >= start && e.date <= end) entries.push({ visitId: v.id, date: e.date, amount: e.amount });
    }
  }
  return entries;
}
