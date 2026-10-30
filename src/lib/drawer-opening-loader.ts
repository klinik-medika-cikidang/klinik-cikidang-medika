import type { createClient } from '@/lib/supabase/client';
import type { CashDrawerOpening } from '@/types/database';
import { formatLocalDateToYMD } from '@/lib/utils';
import { cashDateOrFilter, drawerCashEntries, type CashDateVisit } from '@/lib/cash-date';
import {
  drawerNetByDay,
  monthStart,
  resolveDrawerOpening,
  sumDrawerNetByMonth,
  type DrawerFlowLike,
  type DrawerOpeningSource,
} from '@/lib/drawer-opening';

type SupabaseBrowserClient = ReturnType<typeof createClient>;
type CashVisitRow = CashDateVisit & { id: string };

export interface DrawerOpeningState {
  /** Saldo Awal of the month: recorded, carried from the latest recorded month, or 0. */
  saldoAwal: number;
  source: DrawerOpeningSource;
  fromPeriode: string | null;
  /** Row recorded for this exact month, so the owner can edit it. */
  recorded: CashDrawerOpening | null;
}

const PAGE_SIZE = 1000;

// Paged so a long carry range is never cut at the PostgREST row limit. Callers order by
// a unique key so page boundaries stay stable.
async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await fetchPage(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    const chunk = (data as T[] | null) ?? [];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) return rows;
  }
}

/**
 * Resolves Saldo Awal for `month` (REQ-023-02.2 to 02.4). Only the latest recorded
 * opening up to the month matters, and drawer movements are loaded only for the months
 * between it and the selected month, with the same rules as the Buku Kas month view.
 * Throws the Supabase error so the caller can show it.
 */
export async function loadDrawerOpening(
  supabase: SupabaseBrowserClient,
  month: string
): Promise<DrawerOpeningState> {
  const periode = monthStart(month);
  const { data, error } = await supabase
    .from('cash_drawer_openings')
    .select('*')
    .lte('periode', periode)
    .order('periode', { ascending: false })
    .limit(1);
  if (error) throw error;

  const latest = ((data as CashDrawerOpening[] | null) ?? [])[0] ?? null;
  const openings: Record<string, number> = latest ? { [latest.periode]: Number(latest.nominal) || 0 } : {};
  let monthlyNet: Record<string, number> = {};

  if (latest && latest.periode < periode) {
    const [y, m] = periode.split('-').map(Number);
    const carryEnd = formatLocalDateToYMD(new Date(y, m - 1, 0));
    const carryStart = latest.periode;

    const [visits, flows] = await Promise.all([
      fetchAllPages<CashVisitRow>((from, to) =>
        supabase
          .from('visits')
          .select(
            'id, tanggal_periksa, tanggal_bayar, tanggal_pelunasan, nominal_pelunasan, metode_pelunasan, piutang_nominal, jenis_pasien, biaya_periksa, pendapatan_lain, jenis_pembayaran, status_pembayaran'
          )
          .or(cashDateOrFilter(carryStart, carryEnd))
          .order('tanggal_periksa', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
      ),
      fetchAllPages<DrawerFlowLike>((from, to) =>
        supabase
          .from('cash_flows')
          .select('id, tanggal, jenis, kategori, nominal, jenis_pembayaran')
          .gte('tanggal', carryStart)
          .lte('tanggal', carryEnd)
          .order('tanggal', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
      ),
    ]);

    const entries = drawerCashEntries(visits, carryStart, carryEnd);
    monthlyNet = sumDrawerNetByMonth(drawerNetByDay(entries, flows));
  }

  const resolved = resolveDrawerOpening({ month: periode, openings, monthlyNet });
  return {
    ...resolved,
    recorded: latest && latest.periode === periode ? latest : null,
  };
}
