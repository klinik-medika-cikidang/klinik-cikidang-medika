---
id: F-021-DESIGN
title: "Technical Design: F-021 Pencatatan Tanggal Bayar Pasien"
status: draft
owner: Developer
last_updated: 2026-10-30
---

# Technical Design — F-021

The change touches persistent shared state (new columns read by four modules), but not module boundaries, communication, or caching. The data-model decisions are recorded here instead of a separate `system-architecture.md`.

## 1. Schema

Migration `supabase/migrations/20261030_f021_visit_payment_date.sql` (additive, no row updated):

```sql
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS tanggal_bayar DATE;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS tanggal_pelunasan DATE;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS nominal_pelunasan NUMERIC(15,2);
-- plus CHECK (nominal_pelunasan IS NULL OR nominal_pelunasan >= 0)
-- and indexes on tanggal_bayar and tanggal_pelunasan
```

| Column | Meaning |
|---|---|
| `tanggal_bayar` | WIB date of the first payment: settle as Lunas, Piutang, or a free/BPJS visit |
| `tanggal_pelunasan` | WIB date a Piutang balance was paid off |
| `nominal_pelunasan` | Outstanding balance received on `tanggal_pelunasan` |

Decision **DEC-021-1**: no backfill. Rows with `tanggal_bayar` null are read as paid on `tanggal_periksa`, which is what every report showed before (INV-021-1, INV-021-2).

Decision **DEC-021-2**: one payoff per piutang visit. A multi-instalment ledger would need its own table and is out of scope.

Decision **DEC-021-3** (2026-10-30, supersedes the earlier draft that moved `tanggal_bayar` to the payoff date and read revenue from a `visit_cash_events` view): keep three nullable columns and no view.

- Moving `tanggal_bayar` to the payoff date would move the part received on the first day to the payoff day, so the first day's drawer would no longer match the cash counted that evening.
- One visit with a paid-off Piutang brings money on two dates. A view with a single `COALESCE(tanggal_bayar, tanggal_periksa)` column cannot express two cash dates per row.
- Cash dates are derived in `src/lib/cash-date.ts` (`getVisitCashEvents`), and queries load visits examined, first paid, or paid off in the period through `cashDateOrFilter`. RLS on `visits` applies unchanged (INV-021-3).
- Review follow-up (2026-10-30): a fourth column `metode_pelunasan` (`20261030_f021b_visit_payoff_method.sql`) keeps the payoff method apart from `jenis_pembayaran`, so a cash first payment and a transfer payoff land in the drawer and the bank respectively. Any settle of a visit that still owes money from an earlier payment (Piutang to Lunas, Piutang to Piutang, or a Piutang sent back through Menunggu Kasir with its balance kept) keeps the first payment date and method and books what is received now, including charges added at the counter, on `tanggal_pelunasan`. Several instalments collapse onto the latest one (DEC-021-2).

## 2. Cash Rules (`src/lib/cash-date.ts`)

| Visit state | Cash events |
|---|---|
| Unsettled (Belum Bayar, Menunggu, Pending, Batal) | none |
| Open Piutang | bill minus `piutang_nominal` on the first payment date |
| Paid-off Piutang | bill minus `nominal_pelunasan` on `tanggal_bayar`, `nominal_pelunasan` on `tanggal_pelunasan` |
| Any other settled visit | whole bill on `COALESCE(tanggal_bayar, tanggal_periksa)` |

Writing on settle (`buildSettlePaymentDates`): a Piutang that becomes Lunas keeps `tanggal_bayar` (or takes `tanggal_periksa` when it was null), and sets `tanggal_pelunasan` = today and `nominal_pelunasan` = the previous `piutang_nominal`. Any other settle sets `tanggal_bayar` = today and clears the payoff columns. A visit left as Belum Bayar gets no payment date.

## 3. Component Inventory

| File | Change |
|---|---|
| `src/types/database.ts` | `tanggal_bayar`, `tanggal_pelunasan`, `nominal_pelunasan` on `Visit` |
| `src/lib/cash-date.ts` | Cash-date rules, settle columns, Laporan/receipt labels, drawer entries |
| `src/app/pendaftaran/page.tsx` (`handleSettlePayment`) | Writes the payment-date columns on settle and on piutang payoff |
| `src/components/pendaftaran/PaymentModal.tsx` | Not changed: it is not imported anywhere, so it cannot settle a visit |
| `src/app/page.tsx` | Revenue, finance trend, and liquidity by cash event date; visit counts, ICD-10, villages by `tanggal_periksa` |
| `src/app/laporan/page.tsx`, `src/lib/excel.ts`, `ReportPreviewTable.tsx` | Billing KPI by cash date, "Tanggal Bayar" column, "Hanya pembayaran beda hari" filter |
| `src/app/buku-kas/page.tsx` | "Tunai Masuk Laci" monthly and per date by cash event date |
| `src/components/pendaftaran/ReceiptModal.tsx` | Prints payment and payoff dates when they differ from the examination date |

## 4. Data Flow

```text
Before:  settle visit ──> visits.status_pembayaran
         reports filter revenue by tanggal_periksa

After:   settle visit ──> visits.status_pembayaran + tanggal_bayar
                          (+ tanggal_pelunasan, nominal_pelunasan on piutang payoff)
         revenue queries ──> visits .or(cashDateOrFilter) ──> getVisitCashEvents, filtered by event date
         visit/morbidity aggregates ──> same rows filtered by tanggal_periksa
```

## 5. Test Plan

- Unit (`src/lib/cash-date.test.ts`): `getCashDate` with and without `tanggal_bayar`; revenue for a visit examined on D and paid on D+1; open and paid-off Piutang; settle columns; drawer entries.
- Staging: create a visit dated yesterday, settle it today, and confirm Buku Kas per-date shows it today and Dashboard visit counts still show it yesterday.
- Regression: totals for September 2026 before and after the migration must match (INV-021-1).
- Responsive: receipt and Laporan filter at 360px, 768px, 1024px.
