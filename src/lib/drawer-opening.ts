// F-023: the physical drawer balance carries over from month to month, starting at the
// latest opening balance the owner counted. Pure functions so they can be tested
// without Supabase.

import { isCashHandoverToOwnerOrBank, isDrawerCashExpense } from '@/lib/utils';

export type DrawerOpeningSource = 'recorded' | 'carried' | 'missing';

/** 'YYYY-MM-01' of the month that contains `date` ('YYYY-MM-DD' or 'YYYY-MM'). */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function nextMonth(periode: string): string {
  const [y, m] = periode.split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

/**
 * Saldo Awal of `month`:
 * - the recorded opening of that month, if any;
 * - otherwise the latest earlier recorded opening plus the net drawer movement of every
 *   month from it up to, not including, `month`;
 * - otherwise 0 with source 'missing'.
 *
 * `monthlyNet[periode]` = cash in - drawer expenses - deposits for that month.
 */
export function resolveDrawerOpening(params: {
  month: string;
  openings: Record<string, number>;
  monthlyNet: Record<string, number>;
}): { saldoAwal: number; source: DrawerOpeningSource; fromPeriode: string | null } {
  const month = monthStart(params.month);
  const recorded = Object.keys(params.openings)
    .filter((p) => p <= month)
    .sort();
  const latest = recorded[recorded.length - 1];
  if (!latest) return { saldoAwal: 0, source: 'missing', fromPeriode: null };

  let saldo = Number(params.openings[latest]) || 0;
  if (latest === month) return { saldoAwal: saldo, source: 'recorded', fromPeriode: latest };

  for (let p = latest; p < month; p = nextMonth(p)) {
    saldo += Number(params.monthlyNet[p]) || 0;
  }
  return { saldoAwal: saldo, source: 'carried', fromPeriode: latest };
}

/**
 * Saldo Awal for a single day: the month's opening plus every drawer movement from the
 * first of the month up to the day before `date` (REQ-023-02.5).
 */
export function resolveDailyDrawerOpening(params: {
  date: string;
  monthOpening: number;
  dailyNet: Record<string, number>;
}): number {
  const first = monthStart(params.date);
  return Object.entries(params.dailyNet)
    .filter(([day]) => day >= first && day < params.date)
    .reduce((sum, [, net]) => sum + (Number(net) || 0), params.monthOpening);
}

export interface DrawerFlowLike {
  tanggal: string;
  jenis?: string | null;
  kategori?: string | null;
  jenis_pembayaran?: string | null;
  nominal: number | string | null;
}

/**
 * Net drawer movement per day with the Buku Kas rules: cash received minus cash-paid
 * operational expenses minus deposits to the owner or bank. Transfers never touch it.
 */
export function drawerNetByDay(
  entries: { date: string; amount: number }[],
  flows: DrawerFlowLike[]
): Record<string, number> {
  const net: Record<string, number> = {};
  const add = (day: string, amount: number) => {
    net[day] = (net[day] ?? 0) + amount;
  };
  for (const e of entries) add(e.date, e.amount);
  for (const f of flows) {
    if (isDrawerCashExpense(f) || isCashHandoverToOwnerOrBank(f)) add(f.tanggal, -(Number(f.nominal) || 0));
  }
  return net;
}

/** Rolls a per-day map up to `monthStart` keys, the shape `resolveDrawerOpening` expects. */
export function sumDrawerNetByMonth(dailyNet: Record<string, number>): Record<string, number> {
  const monthly: Record<string, number> = {};
  for (const [day, amount] of Object.entries(dailyNet)) {
    const key = monthStart(day);
    monthly[key] = (monthly[key] ?? 0) + amount;
  }
  return monthly;
}
