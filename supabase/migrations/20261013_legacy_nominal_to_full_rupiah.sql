-- Migration: 20261013_legacy_nominal_to_full_rupiah.sql
-- Description: Backfill legacy Google Sheets shorthand amounts (< 10000) to full Rupiah (* 1000)
-- Target: rows created during ETL (created_at <= '2026-10-10 10:00:00Z')
-- Note: Production-only (aszjzvdmxudmoomdxttx). Staging needs own cutoff and counts.
-- Safety: Enforce exact row count assertions; aborts and rolls back automatically if counts mismatch.

do $$
declare n int;
begin
  -- 1. Cash flows backfill
  update public.cash_flows
  set nominal = nominal * 1000
  where created_at <= '2026-10-10 10:00:00Z' and nominal > 0 and nominal < 10000;
  get diagnostics n = row_count;
  if n <> 1624 then
    raise exception 'cash_flows: % baris di-update, harusnya 1624', n;
  end if;

  -- 2. Visits biaya_periksa backfill
  update public.visits
  set biaya_periksa = biaya_periksa * 1000
  where created_at <= '2026-10-10 10:00:00Z' and biaya_periksa > 0 and biaya_periksa < 10000;
  get diagnostics n = row_count;
  if n <> 3698 then
    raise exception 'biaya_periksa: % baris di-update, harusnya 3698', n;
  end if;

  -- 3. Visits pendapatan_lain backfill
  update public.visits
  set pendapatan_lain = pendapatan_lain * 1000
  where created_at <= '2026-10-10 10:00:00Z' and pendapatan_lain > 0 and pendapatan_lain < 10000;
  get diagnostics n = row_count;
  if n <> 147 then
    raise exception 'pendapatan_lain: % baris di-update, harusnya 147', n;
  end if;
end $$;
