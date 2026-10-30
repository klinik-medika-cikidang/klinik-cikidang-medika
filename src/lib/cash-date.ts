import { computeVisitRevenue, formatDateShort, isSettledVisit, isTransferPayment } from '@/lib/utils';

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
 *   tanggal_pelunasan with metode_pelunasan. DEC-021-2 allows a single payoff record, so
 *   getSettleBlockReason only lets a later receipt join it on the same day and method.
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

export interface PriorPaymentVisit extends CashDateVisit {
  payment_state?: string | null;
  is_gratis?: boolean | null;
}

export interface PriorPayment {
  /** Money received by earlier cashier settles. */
  paid: number;
  /** Balance those settles left open, including charges added since that raised piutang_nominal. */
  outstanding: number;
  /** Bill the stored balance refers to (the current biaya_periksa and pendapatan_lain). */
  billedTotal: number;
  firstDate: string;
  firstMethod: string | null;
  payoffDate: string | null;
}

/**
 * Money a visit already took at the cashier, or null when it has none.
 * Signals: a settled status (Lunas, Piutang, Ditanggung BPJS, legacy null), or an unsettled
 * status with tanggal_bayar or payment_state Lunas/Piutang. The last two mean the visit was
 * paid and then sent back to Menunggu Kasir by the examination form, which keeps
 * payment_state and the payment columns. A row whose payment_state is Belum Bayar went
 * through the old Belum Bayar path that zeroed piutang_nominal, so its earlier amount
 * cannot be recovered and the row is treated as unpaid.
 */
export function getPriorPayment(v: PriorPaymentVisit): PriorPayment | null {
  const status = (v.status_pembayaran || '').trim();
  if (status === 'Batal') return null;
  const settled = isSettledVisit(v);
  if (!settled) {
    if (v.payment_state === 'Belum Bayar') return null;
    // A BPJS-covered or free settle stamps tanggal_bayar without taking money. Charges the
    // doctor adds afterwards are owed now, not money received on that day.
    if (v.payment_state === 'Ditanggung BPJS' || v.is_gratis) return null;
    const sentBack = Boolean(v.tanggal_bayar) || v.payment_state === 'Lunas' || v.payment_state === 'Piutang';
    if (!sentBack) return null;
  }

  const billedTotal = computeVisitRevenue({ ...v, status_pembayaran: 'Lunas' });
  const owes = status === 'Piutang' || !settled;
  const outstanding = owes ? Math.max(0, Number(v.piutang_nominal) || 0) : 0;
  const paid = Math.max(0, billedTotal - outstanding);
  if (paid === 0 && (outstanding === 0 || !settled)) return null;

  return {
    paid,
    outstanding,
    billedTotal,
    firstDate: getCashDate(v),
    firstMethod: v.jenis_pembayaran ?? null,
    payoffDate: v.tanggal_pelunasan || null,
  };
}

export function hasPriorPayment(v: PriorPaymentVisit): boolean {
  return getPriorPayment(v) !== null;
}

/** True when the visit already received money, so the next settle must clear the whole balance. */
export function requiresFullPayoff(v: PriorPaymentVisit): boolean {
  const prior = getPriorPayment(v);
  return Boolean(prior && prior.paid > 0);
}

export const FULL_PAYOFF_MESSAGE = 'Pembayaran lanjutan harus melunasi seluruh sisa tagihan.';

export const LEGACY_SENT_BACK_MESSAGE =
  'Kunjungan ini pernah dibayar lalu dikirim ulang dokter sebelum pembaruan sistem, sehingga jumlah yang sudah dibayar tidak bisa dipastikan otomatis. Cocokkan dengan kuitansi lama dan minta pemilik memeriksa data sebelum memproses pembayaran.';

/**
 * A row the earlier examination form sent back to the cashier after it was paid: unsettled,
 * payment_state still Lunas or Piutang, and no tanggal_bayar. That form overwrote the bill with
 * the new charges, so the amount already received cannot be derived from the row.
 */
export function isLegacySentBack(v: PriorPaymentVisit): boolean {
  if (isSettledVisit(v)) return false;
  if (v.tanggal_bayar) return false;
  return v.payment_state === 'Lunas' || v.payment_state === 'Piutang';
}

/**
 * Why this settle cannot be saved, or null when it can (DEC-021-2, DEC-021-3).
 * A visit keeps one first payment and one payoff record. After money was received, the next
 * payment must clear the whole balance. Once a payoff record holds money, another receipt may
 * only join it on the same day with the same method; anything else would move money already
 * booked on an earlier day or change its method.
 */
export function getSettleBlockReason(
  prev: PriorPaymentVisit,
  next: { status: string; paidNow: number; method: string },
  today: string
): string | null {
  if (isLegacySentBack(prev)) return LEGACY_SENT_BACK_MESSAGE;
  if (!requiresFullPayoff(prev)) return null;
  if (next.status === 'Piutang') return FULL_PAYOFF_MESSAGE;

  const payoffDate = prev.tanggal_pelunasan;
  if (next.paidNow <= 0 || !payoffDate || (Number(prev.nominal_pelunasan) || 0) <= 0) return null;

  const payoffMethod = prev.metode_pelunasan || prev.jenis_pembayaran;
  const sameMethod = isTransferPayment(payoffMethod) === isTransferPayment(next.method);
  if (payoffDate === today && sameMethod) return null;
  if (payoffDate === today) {
    const label = isTransferPayment(payoffMethod) ? 'Transfer (TF)' : 'Tunai';
    return `Pembayaran lanjutan hari ini sudah tercatat dengan metode ${label}. Sistem mencatat satu pembayaran lanjutan per kunjungan, jadi terima sisa tagihan dengan metode yang sama.`;
  }
  return `Pembayaran lanjutan kunjungan ini sudah tercatat pada ${formatDateShort(payoffDate)}. Sistem mencatat satu pembayaran lanjutan per kunjungan, jadi sisa tagihan ini belum bisa diterima di kasir.`;
}

export interface SettleAmounts {
  /** What the patient owes at this settle: the whole bill, or the open balance plus charges added since. */
  dueNow: number;
  /** Money received at this settle and booked on today. */
  paidNow: number;
  outstandingAfter: number;
  change: number;
  /** A Lunas whose tendered money does not cover dueNow. */
  isShort: boolean;
  /** The bill fell below the money already received; refunds are not recorded at the cashier. */
  overpaid: number;
  /** Requested status, with a fully paid Piutang turned into Lunas. */
  status: string;
}

/**
 * Amounts for one cashier settle. `tendered` is the money handed over now, never a running
 * total, so earlier payments stay on the day they were received.
 */
export function computeSettleAmounts(
  prev: PriorPaymentVisit,
  next: { status: string; total: number; tendered: number }
): SettleAmounts {
  const prior = getPriorPayment(prev);
  const tendered = Math.max(0, Number(next.tendered) || 0);
  const owed = prior ? prior.outstanding + next.total - prior.billedTotal : next.total;
  const dueNow = Math.max(0, owed);
  const overpaid = Math.max(0, -owed);

  if (!isSettledVisit({ status_pembayaran: next.status })) {
    return { dueNow, paidNow: 0, outstandingAfter: 0, change: 0, isShort: false, overpaid, status: next.status };
  }

  if (next.status === 'Piutang') {
    const paidNow = Math.min(tendered, dueNow);
    const outstandingAfter = dueNow - paidNow;
    return {
      dueNow,
      paidNow,
      outstandingAfter,
      change: 0,
      isShort: false,
      overpaid,
      status: outstandingAfter > 0 ? 'Piutang' : 'Lunas',
    };
  }

  return {
    dueNow,
    paidNow: dueNow,
    outstandingAfter: 0,
    change: Math.max(0, tendered - dueNow),
    isShort: tendered < dueNow,
    overpaid,
    status: next.status,
  };
}

const SNAPSHOT_TEXT_FIELDS = [
  'status_pembayaran',
  'payment_state',
  'jenis_pasien',
  'jenis_pembayaran',
  'tanggal_bayar',
  'tanggal_pelunasan',
  'metode_pelunasan',
] as const;
const SNAPSHOT_MONEY_FIELDS = ['piutang_nominal', 'nominal_pelunasan', 'biaya_periksa', 'pendapatan_lain'] as const;

/** True when two copies of a visit agree on every column a cashier settle reads. */
export function isSamePaymentSnapshot(a: PriorPaymentVisit, b: PriorPaymentVisit): boolean {
  const text = (v: PriorPaymentVisit, k: (typeof SNAPSHOT_TEXT_FIELDS)[number]) => v[k] || null;
  const money = (v: PriorPaymentVisit, k: (typeof SNAPSHOT_MONEY_FIELDS)[number]) => Number(v[k]) || 0;
  return (
    SNAPSHOT_TEXT_FIELDS.every((k) => text(a, k) === text(b, k)) &&
    SNAPSHOT_MONEY_FIELDS.every((k) => money(a, k) === money(b, k))
  );
}

export interface SettlePaymentDates {
  tanggal_bayar?: string;
  tanggal_pelunasan?: string | null;
  nominal_pelunasan?: number | null;
  metode_pelunasan?: string | null;
  jenis_pembayaran?: string;
}

/**
 * Payment columns to write when the cashier settles a visit (DEC-021-3).
 * A visit with a prior payment (getPriorPayment) keeps its first payment date and method;
 * only the money received now, including charges added since, is booked as a payoff on
 * today with today's method. Any other settle is a first payment today. Callers must check
 * getSettleBlockReason first, because merging into a payoff from another day or method
 * would move money already booked.
 */
export function buildSettlePaymentDates(
  prev: PriorPaymentVisit,
  next: { status: string; total: number; outstanding: number; method: string },
  today: string
): SettlePaymentDates {
  if (!isSettledVisit({ status_pembayaran: next.status })) return {};

  const prior = getPriorPayment(prev);
  // A settled Piutang that took nothing yet has no money on its first day, so today's
  // receipt becomes the first payment and the payoff record stays free.
  const nothingReceived = prior && prior.paid === 0 && (Number(prev.nominal_pelunasan) || 0) === 0;
  if (!prior || nothingReceived) {
    return {
      tanggal_bayar: today,
      tanggal_pelunasan: null,
      nominal_pelunasan: null,
      metode_pelunasan: null,
      jenis_pembayaran: next.method,
    };
  }

  const receivedNow = Math.max(0, prior.outstanding + next.total - prior.billedTotal - next.outstanding);
  const prevPayoff = Number(prev.nominal_pelunasan) || 0;
  return {
    // A visit settled before F-021 has no tanggal_bayar; its first part was received
    // on the examination day, which is also where reports placed it until now.
    tanggal_bayar: prior.firstDate,
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
