---
id: F-019-TSK
title: "Implementation Tasks: F-019 Perbaikan Kategori Kunjungan, Konsistensi Dashboard, dan Tunggakan Kasir"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Implementation Tasks — F-019

Status: code and audit tasks done on branch `claude/f-019-perbaikan-konsistensi-44a314` (2026-10-30). Task 1.1 and the production part of 6.2 wait for the user: migrations go to the old staging project first, and to the old production project only after the user approves the staging test.

## Phase 1: Kategori Kunjungan
- [ ] **Task 1.1: Verify and promote the F-011 migration to production** (menunggu izin user: production lama masih live; staging lama dulu, production lama setelah di-acc)
  - Run the column check from design §2.A. Apply `20261009_f011_visit_category.sql` only if the column is missing and only after explicit approval.
  - Update the production `migrations_applied` list in `docs/context/state.yaml`.
  - _Requirements: REQ-019-01.1, REQ-019-01.5_

- [x] **Task 1.2: Add `getErrorMessage` helper with tests**
  - Targets: `src/lib/utils.ts`, `src/lib/utils.test.ts`
  - _Requirements: REQ-019-01.3_

- [x] **Task 1.3: Replace `instanceof Error` fallbacks at all call sites**
  - Targets: the 27 call sites found by `grep -rn "err instanceof Error ? err.message" src`
  - Done: 30 call sites in 28 files, including three that name the variable `error`. REQ-019-01.2 still depends on Task 1.1.
  - _Requirements: REQ-019-01.2, REQ-019-01.4_

## Phase 2: Dashboard
- [x] **Task 2.1: Default the period to "Bulan Ini"**
  - Target: `src/app/page.tsx`
  - _Requirements: REQ-019-02.1, REQ-019-02.2_

- [x] **Task 2.2: Add `computeVisitRevenue` and use it in Dashboard and Laporan**
  - Targets: `src/lib/utils.ts`, `src/lib/utils.test.ts`, `src/app/page.tsx`, `src/app/laporan/page.tsx`
  - _Requirements: REQ-019-03.1, REQ-019-03.2_

- [x] **Task 2.3: Relabel the revenue card and caption the drawer figure**
  - Targets: `src/components/dashboard/DashboardKpiCards.tsx`, `src/components/buku-kas/CashReconciliationCard.tsx`
  - _Requirements: REQ-019-03.3, REQ-019-03.4_

- [x] **Task 2.4: Build the calendar-day trend series**
  - Targets: `src/app/page.tsx` (extract the range builder to `src/lib/utils.ts` with tests)
  - _Requirements: REQ-019-04.1, REQ-019-04.2, REQ-019-04.4_

- [x] **Task 2.5: Update trend chart labels and mobile scroll wrapper**
  - Targets: `src/components/dashboard/VisitTrendChart.tsx`, `src/components/dashboard/FinancialTrendChart.tsx`
  - Done: checked at 360, 768, and 1024px with mock data on a temporary local route (no login or database). The chart scrolls inside its wrapper below md; no page-level horizontal scroll. The KPI subtitle now wraps instead of truncating, and the cashier filter tabs got `max-w-full` because they overflowed at 768 and 1024px.
  - _Requirements: REQ-019-04.3, REQ-019-04.5_

- [x] **Task 2.6: Remove the hardcoded patient count fallback**
  - Targets: `src/app/page.tsx`, `src/components/dashboard/DashboardKpiCards.tsx`
  - _Requirements: REQ-019-07.1_

## Phase 3: Loket & Kasir
- [x] **Task 3.1: Add `KASIR_CARRY_OVER_DAYS` and the carry-over query**
  - Targets: `src/constants/clinic.ts`, `src/app/pendaftaran/page.tsx`
  - _Requirements: REQ-019-05.1, REQ-019-05.3, REQ-019-05.5_

- [x] **Task 3.2: Show the "Tunggakan" badge and split the KPIs**
  - Targets: `src/app/pendaftaran/page.tsx`, `src/components/pendaftaran/CashierPosPanel.tsx`, `src/components/pendaftaran/MasterPatientTable.tsx`
  - _Requirements: REQ-019-05.2, REQ-019-05.4_

## Phase 4: Program Khusus
- [x] **Task 4.1: Use the local WIB date for "today"**
  - Target: `src/app/program-khusus/page.tsx`
  - Done: also `PostCareAgenda.tsx` and the default dates of the four Program Khusus modals, found in code review, so the agenda tabs and the page count use the same day.
  - Done: Excel export file names in `src/lib/excel.ts` (8 call sites) use the local date through one helper, so a file downloaded before 07:00 WIB no longer carries the previous day. Same class of bug as REQ-019-08.
  - _Requirements: REQ-019-08.1_

## Phase 5: Audit Buku Kas vs DATA
- [x] **Task 5.1: Write the read-only audit script**
  - Target: `scripts/audit-bukukas-vs-csv.mjs`
  - Compares per month and per day. Also counts CSV money cells that `parseRupiah` cannot read faithfully, since the audit and the ETL share that parser.
  - _Requirements: REQ-019-06.1, REQ-019-06.2_

- [x] **Task 5.2: Run the audit on production and log differences**
  - Record each differing month as a follow-up task in this file.
  - Run 2026-10-30, read-only, against the new production copy `bxjvishfluxorccrquls` (a column-verified copy of the live production data as of the 2026-10-29 backup). Range 2023-08-01 to 2026-10-09: 39 of 39 months and 1,117 of 1,117 dates match for visits, cashier revenue, clinic expenses, non-clinic expenses, and cash deposits. No follow-up defect.
  - Not compared (no CSV column): `Honor & Transport` expenses and `Kapitasi BPJS` income.
  - CSV cells read as 0 that a human should confirm: `tarif` "-" (4) and "free" (1), `Pendpatan lain` "beli obat" (1). The database also holds 0 for them. Cells written as "IDR Rp 9.999" (420) are read correctly.
  - _Requirements: REQ-019-06.3_

## Phase 6: Verification Gate
- [x] **Task 6.1: Static checks and tests**
  - `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`
  - _Requirements: all_

- [ ] **Task 6.2: Runtime verification** (production part waits for user approval; logged-in checks wait for the user to seed test accounts)
  - Save every category on production. Compare Dashboard, Laporan, and Excel revenue for October 2026. Settle a carried-over visit on staging.
  - Check Dashboard, Loket & Kasir, and Program Khusus at 360px, 768px, and 1024px. (Changed Dashboard and Loket & Kasir components done with mock data, see Task 2.5. Full pages with real data and Program Khusus still pending.)
  - _Requirements: REQ-019-01.2, REQ-019-03.2, REQ-019-04.4, REQ-019-05.3, INV-019-1 to INV-019-5_

## Staging test and audit (2026-10-30)

Tested end to end on the local build of the `staging` branch against the old staging database (`jpqmnbtowvfctxciuktj`), with an owner and a dokter_admin login and two fictitious test patients. An acceptance and cross-feature audit (5 spec checks plus integration, security/data and responsive/a11y lenses, every finding verified by two independent reviewers) ran three rounds; all confirmed findings were fixed or are listed below as accepted limitations.

- [x] Dashboard, Laporan and Buku Kas for October 2026 equal an independent read-only recomputation from the database (visits 160, cashier revenue Rp 15.745.320, drawer Rp 776.320 with a recorded opening, bank Rp 14.315.000).
- [x] ANC category saved on staging (toast and database value checked). Production still needs Task 1.1.
- [x] Carry-over queue, Tunggakan badge, and today's KPIs checked on screen.
- [x] Fixes from the audit: Excel "Penerimaan Kasir" sheet whose total equals the KPI; Loket "Penerimaan Kasir" by received date; Kas Masuk/Kas Keluar dates cannot be after today (keeps Dashboard, Buku Kas and Laporan on the same rows); dashboard alert strip warns instead of showing an all-clear when a load fails; KPI labels, tile captions and quick-cash buttons no longer truncate; "null thn" age display fixed.
- [x] Responsive check with a headless browser on Dashboard, Loket & Kasir, Pemeriksaan Dokter, Program Khusus, Buku Kas and Laporan at 360, 768 and 1024px: no page-level horizontal scroll on any of the 18 combinations. Remaining ellipsis only on long free-text names inside lists (diagnosis and drug names), unchanged behavior.
- [ ] Open decision (from the client, 2026-10-30): the clinic sheet's "TOTAL PENDAPATAN" (the purple line on the DASHBOARD tab) equals tarif + Pendapatan lain of ALL visits, BPJS included, and matches the sheet in all 38 months from 2023-08 to 2026-09. The app's "Pendapatan Kasir" follows REQ-019-03.1 and counts the tarif of BPJS visits as 0. Changing the definition needs the owner's approval.
