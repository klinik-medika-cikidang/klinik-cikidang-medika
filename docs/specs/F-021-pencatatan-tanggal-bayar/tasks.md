---
id: F-021-TSK
title: "Implementation Tasks: F-021 Pencatatan Tanggal Bayar Pasien"
status: draft
owner: Developer
last_updated: 2026-10-30
---

# Implementation Tasks — F-021

Status: code done, awaiting the staging test. Depends on F-019 Phase 3 (carry-over queue).

Migration note: `20261030_f021_visit_payment_date.sql` and `20261030_f021b_visit_payoff_method.sql` were applied to the old staging project `jpqmnbtowvfctxciuktj` on 2026-10-30 and verified with an information_schema query; a read-only probe confirmed PostgREST accepts the `cashDateOrFilter` query there (October 2026: 155 visits by examination date and 155 by cash date, since no payment date is filled yet). Both MUST be applied to production, after the user approves the staging test, before this code is deployed there, because Dashboard, Laporan, and Buku Kas select the new columns and fail without them.

- [x] **Task 1: Migration for `tanggal_bayar`, `tanggal_pelunasan`, and `nominal_pelunasan`**
  - Done: three nullable columns and no view (DEC-021-3); `Visit` type updated.
  - Target: `supabase/migrations/20261030_f021_visit_payment_date.sql`, `src/types/database.ts`
  - Apply to staging first. Production requires explicit approval.
  - _Requirements: REQ-021-01.1, REQ-021-01.4, INV-021-2, INV-021-3, INV-021-4_

- [x] **Task 2: Write the payment date on settle and piutang payoff**
  - Done: `handleSettlePayment` writes `buildSettlePaymentDates`; `PaymentModal.tsx` is not imported anywhere, so it was left unchanged.
  - Targets: `src/app/pendaftaran/page.tsx`, `src/components/pendaftaran/PaymentModal.tsx`
  - _Requirements: REQ-021-01.2, REQ-021-01.3_

- [x] **Task 3: Cash-date helpers with tests**
  - Done: helpers live in `src/lib/cash-date.ts` instead of `utils.ts`, tested in `src/lib/cash-date.test.ts`.
  - Targets: `src/lib/cash-date.ts`, `src/lib/cash-date.test.ts`
  - _Requirements: REQ-021-02.1_

- [x] **Task 4: Move revenue on Dashboard, Laporan, and Excel to the cash date**
  - Done: revenue by cash event date, counts by `tanggal_periksa`, "Tanggal Bayar" column, "Hanya pembayaran beda hari" filter.
  - Targets: `src/app/page.tsx`, `src/app/laporan/page.tsx`, `src/lib/excel.ts`
  - _Requirements: REQ-021-02.1, REQ-021-02.3, REQ-021-03.1, REQ-021-03.2_

- [x] **Task 5: Move drawer cash in Buku Kas to the cash date**
  - Done: "Tunai Masuk Laci" monthly and per date from `drawerCashEntries`; `CashReconciliationCard.tsx` needed no change.
  - Targets: `src/app/buku-kas/page.tsx`, `src/components/buku-kas/CashReconciliationCard.tsx`
  - _Requirements: REQ-021-02.2_

- [x] **Task 6: Receipt shows the payment date**
  - Done: prints Tanggal Periksa, Tanggal Bayar, and Tanggal Pelunasan when any payment date differs.
  - Target: `src/components/pendaftaran/ReceiptModal.tsx`
  - _Requirements: REQ-021-02.4_

- [ ] **Task 7: Verification gate**
  - Partly done: lint, typecheck, tests, and build pass locally. Staging scenario, September 2026 regression comparison, and responsive check are still open.
  - `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
  - Staging scenario from design §4, September 2026 regression comparison, responsive check.
  - _Requirements: INV-021-1 to INV-021-4_

## Staging test and audit (2026-10-30)

Tested end to end on the local build of the `staging` branch against the old staging database (`jpqmnbtowvfctxciuktj`), with an owner and a dokter_admin login and two fictitious test patients. An acceptance and cross-feature audit (5 spec checks plus integration, security/data and responsive/a11y lenses, every finding verified by two independent reviewers) ran three rounds; all confirmed findings were fixed or are listed below as accepted limitations.

- [x] Scenario on staging with a fictitious patient: examined 28 Oct, Rp 80.000 cash first, Rp 120.000 transfer payoff on 30 Oct. Database, receipt (Tanggal Periksa, Tanggal Bayar, Tanggal Pelunasan), Buku Kas per date (28 Oct drawer +Rp 80.000; 30 Oct drawer unchanged, bank +Rp 120.000) and Dashboard all agree.
- [x] Audit fixes recorded in design.md "Audit amendments": DEC-021-4, cashier panel, doctor send-back, legacy rows, concurrency guards. Migration `20261030_f021b_visit_payoff_method.sql` adds `metode_pelunasan`.
- [ ] Before production release: run the legacy sent-back query read-only on the old production database.
