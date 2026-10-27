---
id: F-021-DESIGN
title: "Technical Design: F-021 Pencatatan Tanggal Bayar Pasien"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Technical Design — F-021

The change touches persistent shared state (a new column and a view used by four modules), but not module boundaries, communication, or caching. The data-model decisions are recorded here instead of a separate `system-architecture.md`.

## 1. Schema

New migration `supabase/migrations/<ts>_f021_visit_payment_date.sql`:

```sql
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS tanggal_bayar DATE;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS nominal_pelunasan NUMERIC(15,2);

CREATE INDEX IF NOT EXISTS idx_visits_tanggal_bayar ON public.visits(tanggal_bayar);

-- security_invoker keeps the caller's RLS on visits.
CREATE OR REPLACE VIEW public.visit_cash_events
WITH (security_invoker = true) AS
SELECT v.id AS visit_id,
       COALESCE(v.tanggal_bayar, v.tanggal_periksa) AS tanggal_kas,
       v.tanggal_periksa, v.jenis_pasien, v.biaya_periksa, v.pendapatan_lain,
       v.jenis_pembayaran, v.status_pembayaran, v.piutang_nominal, v.nominal_pelunasan
FROM public.visits v;
```

Decision **DEC-021-1**: no backfill. `COALESCE` gives historical rows their examination date, which is what every report shows today (INV-021-1, INV-021-2).

Decision **DEC-021-2**: one payoff per piutang visit (`nominal_pelunasan` plus the updated `tanggal_bayar`). A multi-instalment ledger would need its own table and is out of scope.

## 2. Component Inventory

| File | Change |
|---|---|
| `src/types/database.ts` | `tanggal_bayar`, `nominal_pelunasan` |
| `src/app/pendaftaran/page.tsx` (`handlePosPayment`) | Set `tanggal_bayar` on settle and on piutang payoff |
| `src/components/pendaftaran/PaymentModal.tsx` | Same, if the modal is still reachable (currently not imported; confirm and remove or align) |
| `src/lib/utils.ts` | `getCashDate(v)` and revenue helpers keyed by cash date |
| `src/app/page.tsx` | Revenue and finance trend from `visit_cash_events`; visit counts unchanged |
| `src/app/laporan/page.tsx`, `src/lib/excel.ts` | Revenue by cash date, "Tanggal Bayar" column, delayed-payment filter |
| `src/app/buku-kas/page.tsx`, `CashReconciliationCard.tsx` | Drawer cash by cash date |
| `src/components/pendaftaran/ReceiptModal.tsx` | Print payment date when it differs |

## 3. Data Flow

```text
Before:  settle visit ──> visits.status_pembayaran
         reports filter revenue by tanggal_periksa

After:   settle visit ──> visits.status_pembayaran + tanggal_bayar (+ nominal_pelunasan on payoff)
         revenue queries ──> visit_cash_events filtered by tanggal_kas
         visit/morbidity queries ──> visits filtered by tanggal_periksa (unchanged)
```

## 4. Test Plan

- Unit: `getCashDate` with and without `tanggal_bayar`; revenue totals for a visit examined on D and paid on D+1.
- Staging: create a visit dated yesterday, settle it today, and confirm Buku Kas per-date shows it today and Dashboard visit counts still show it yesterday.
- Regression: totals for September 2026 before and after the migration must match (INV-021-1).
- Responsive: receipt and Laporan filter at 360px, 768px, 1024px.
