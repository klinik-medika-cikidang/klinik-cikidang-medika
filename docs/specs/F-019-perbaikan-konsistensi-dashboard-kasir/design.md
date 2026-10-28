---
id: F-019-DESIGN
title: "Technical Design: F-019 Perbaikan Kategori Kunjungan, Konsistensi Dashboard, dan Tunggakan Kasir"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Technical Design — F-019

No module-level architecture changes. The only schema action promotes an existing additive migration, so `system-architecture.md` is omitted.

## 1. Component Inventory

| Area | File | Change |
|---|---|---|
| Schema | `supabase/migrations/20261009_f011_visit_category.sql` | Apply to production (no edit) |
| Error helper | `src/lib/utils.ts`, `src/lib/utils.test.ts` | Add `getErrorMessage` |
| Error call sites | 27 files using `err instanceof Error ? err.message : ...` | Switch to helper |
| Revenue helper | `src/lib/utils.ts`, `src/lib/utils.test.ts` | Add `computeVisitRevenue` |
| Dashboard | `src/app/page.tsx` | Default period, revenue helper, trend series, remove `4238` |
| KPI card | `src/components/dashboard/DashboardKpiCards.tsx` | Relabel revenue card |
| Trend charts | `src/components/dashboard/VisitTrendChart.tsx`, `FinancialTrendChart.tsx` | Daily label, scroll wrapper |
| Laporan | `src/app/laporan/page.tsx` | Use `computeVisitRevenue` |
| Buku Kas | `src/components/buku-kas/CashReconciliationCard.tsx` | Caption on cash-only figure |
| Cashier | `src/app/pendaftaran/page.tsx`, `src/components/pendaftaran/*` | Carry-over query and badge |
| Constants | `src/constants/clinic.ts` | `KASIR_CARRY_OVER_DAYS = 30` |
| Program Khusus | `src/app/program-khusus/page.tsx` | Local "today" |
| Audit | `scripts/audit-bukukas-vs-csv.mjs` (new) | Read-only reconciliation |

## 2. Detailed Design

### A. Category save (REQ-019-01)

1. Run in the production SQL Editor:
   ```sql
   select column_name from information_schema.columns
   where table_schema = 'public' and table_name = 'visits' and column_name = 'kategori_program';
   ```
2. IF the result is empty, apply `20261009_f011_visit_category.sql` unchanged. It is `ADD COLUMN IF NOT EXISTS` with a default, so existing rows receive `UMUM`. Production execution requires the developer's explicit approval.
3. Record the application in `docs/context/state.yaml` under the production `migrations_applied` list.

Error helper:

```typescript
// supabase-js returns PostgrestError as a plain object, so `instanceof Error` misses it.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const { message, hint } = err as { message?: unknown; hint?: unknown };
    if (typeof message === 'string' && message.trim()) {
      return typeof hint === 'string' && hint.trim() ? `${message} (${hint})` : message;
    }
  }
  return fallback;
}
```

### B. Default period (REQ-019-02)

`useState<DashboardPeriod>('this_month')`. Because `periodRange` is memoised on the resolved bounds, the first fetch uses the month range directly.

### C. Revenue definition (REQ-019-03)

```typescript
export function computeVisitRevenue(v: {
  jenis_pasien?: string | null;
  biaya_periksa?: number | string | null;
  pendapatan_lain?: number | string | null;
  status_pembayaran?: string | null;
}): number {
  if (!isSettledVisit(v)) return 0;
  const biaya = v.jenis_pasien === 'BPJS' ? 0 : Number(v.biaya_periksa) || 0;
  return biaya + (Number(v.pendapatan_lain) || 0);
}
```

- Dashboard: `umumRev` becomes the sum of `computeVisitRevenue` over all non-cancelled visits. The tunai/transfer split keeps its current bucket logic, which already includes BPJS extra charges.
- Laporan: `formattedVisits.total_biaya` uses the same function, so the KPI and the Excel sheet stay equal by construction.
- Card label: "Pendapatan Kasir", subtitle "Tarif umum + biaya tambahan pasien". The percentage sub-line keeps comparing against total cash in. The KPI field is renamed `umumRevenue` to `kasirRevenue`; the BPJS vs Umum split in `PaymentDistributionChart` keeps the UMUM-only figure because it compares patient types.

Decision **DEC-019-1**: the shared figure includes BPJS patients' extra charges because that money passes through the cashier, and the Laporan and Excel figures already include it. Changing Laporan to UMUM-only would remove real cashier income from the export.

### D. Trend series (REQ-019-04)

Replace "last 14 dates with data" with a calendar-day series:

```text
Before:  dailyMap keys (dates with visits) --sort--> slice(-14)
After:   dailyRange = selected period, end cut to today,
         then clamped to the last calendar month inside it when longer than 31 days
         for each day in dailyRange: dailyMap[day] ?? { bpjs: 0, umum: 0 }
```

- The range builder is `buildDailyTrendRange(period, today, latestVisitDate)` in `src/lib/utils.ts`; `describeDailyTrendRange` produces the toggle label.
- Days after today are not plotted (revision of 2026-10-28), so "Bulan Ini" on the 28th shows 28 bars, not 31 with 3 empty future days.
- `periodRange` with empty bounds ("Semua Periode") uses the month of the latest visit date, or the current month when there is no visit.
- Financial series uses the same `dailyRange` keys.
- Chart components receive a `dailyLabel` prop (for example "Harian Okt") replacing the hardcoded "14 Hari".
- The Recharts container gets `min-w-[720px]` inside an `overflow-x-auto` wrapper below `md`.

### E. Cashier carry-over (REQ-019-05)

Two queries in `fetchVisits`, merged and de-duplicated by `id`:

```typescript
const today = /* WIB date, unchanged */;
const since = /* today minus KASIR_CARRY_OVER_DAYS, WIB */;

supabase.from('visits').select(SELECT).eq('tanggal_periksa', today);
supabase.from('visits').select(SELECT)
  .gte('tanggal_periksa', since)
  .lt('tanggal_periksa', today)
  .in('status_pembayaran', ['Belum Bayar', 'Menunggu Kasir', 'Menunggu Pembayaran', 'Piutang']);
```

- `isCarryOver(v) = v.tanggal_periksa < today`.
- `MasterPatientTable` / POS list renders a `Badge` "Tunggakan · {tanggal}" for carry-over rows.
- KPIs: `total` and `waitingDoc` are computed over today's rows only; `waitingPay` over the merged list.
- `handlePosPayment` is unchanged: it updates the visit row by `id`.

### F. Audit script (REQ-019-06)

`scripts/audit-bukukas-vs-csv.mjs --env=<file>`:

1. Parse the REKAMMEDIS CSV with `readCsv` and `VISIT_COLUMNS` from `scripts/lib/clinic-csv.mjs` and `parseRupiah` from `scripts/lib/clinic-map.mjs`, the same helpers the migration used. Legacy amounts are in thousands and are multiplied by 1.000. CSV "Pengeluaran Klinik" maps to `Pengeluaran Obat / Operasional`, "Pengeluaran non klinik" to `Pengeluaran Non Klinik`, and "SETOR TUNAI" to `Setor Tunai`, matching `clinic-map.mjs`.
2. Query `visits` and `cash_flows` with the anon or service key from the given env file, using `select` only.
3. Print one row per month with CSV value, DB value, and difference. Print row-level detail (date and amount, no names or numbers) only for months with a difference.

### G. Small fixes (REQ-019-07, REQ-019-08)

- `uniquePatients: patientCount ?? null`, and the card renders "-" for null.
- `const todayStr = useMemo(() => formatLocalDateToYMD(), [])` in Program Khusus.

## 3. Error Handling & Edge Cases

- A carry-over visit settled by another browser tab disappears on the next refetch. The update itself is idempotent per row.
- A month with no visits at all still renders a full zero series.
- The audit script exits non-zero when the CSV file is missing, so it cannot report a false "all matched".

## 4. Test Plan

- Unit (`vitest`): `getErrorMessage` with PostgrestError shape, `Error`, string, null; `computeVisitRevenue` for UMUM, BPJS with extra charge, free visit, `Batal`, `Belum Bayar`; daily-range builder for a 30-day month, February, "Semua Periode", and a year range.
- Manual: save each category on staging and production; compare Dashboard, Laporan, and Excel totals for October 2026; settle a visit created with yesterday's date on staging.
- Responsive: 360px, 768px, 1024px on Dashboard and Loket & Kasir.
