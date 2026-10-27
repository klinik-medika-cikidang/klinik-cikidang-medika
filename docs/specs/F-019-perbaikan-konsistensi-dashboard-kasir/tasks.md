---
id: F-019-TSK
title: "Implementation Tasks: F-019 Perbaikan Kategori Kunjungan, Konsistensi Dashboard, dan Tunggakan Kasir"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Implementation Tasks — F-019

Status: spec written. Tasks 1.1 and 6.2 are blocked until production database access is available.

## Phase 1: Kategori Kunjungan
- [ ] **Task 1.1: Verify and promote the F-011 migration to production** (blocked: database access)
  - Run the column check from design §2.A. Apply `20261009_f011_visit_category.sql` only if the column is missing and only after explicit approval.
  - Update the production `migrations_applied` list in `docs/context/state.yaml`.
  - _Requirements: REQ-019-01.1, REQ-019-01.5_

- [ ] **Task 1.2: Add `getErrorMessage` helper with tests**
  - Targets: `src/lib/utils.ts`, `src/lib/utils.test.ts`
  - _Requirements: REQ-019-01.3_

- [ ] **Task 1.3: Replace `instanceof Error` fallbacks at all call sites**
  - Targets: the 27 call sites found by `grep -rn "err instanceof Error ? err.message" src`
  - _Requirements: REQ-019-01.2, REQ-019-01.4_

## Phase 2: Dashboard
- [ ] **Task 2.1: Default the period to "Bulan Ini"**
  - Target: `src/app/page.tsx`
  - _Requirements: REQ-019-02.1, REQ-019-02.2_

- [ ] **Task 2.2: Add `computeVisitRevenue` and use it in Dashboard and Laporan**
  - Targets: `src/lib/utils.ts`, `src/lib/utils.test.ts`, `src/app/page.tsx`, `src/app/laporan/page.tsx`
  - _Requirements: REQ-019-03.1, REQ-019-03.2_

- [ ] **Task 2.3: Relabel the revenue card and caption the drawer figure**
  - Targets: `src/components/dashboard/DashboardKpiCards.tsx`, `src/components/buku-kas/CashReconciliationCard.tsx`
  - _Requirements: REQ-019-03.3, REQ-019-03.4_

- [ ] **Task 2.4: Build the calendar-day trend series**
  - Targets: `src/app/page.tsx` (extract the range builder to `src/lib/utils.ts` with tests)
  - _Requirements: REQ-019-04.1, REQ-019-04.2, REQ-019-04.4_

- [ ] **Task 2.5: Update trend chart labels and mobile scroll wrapper**
  - Targets: `src/components/dashboard/VisitTrendChart.tsx`, `src/components/dashboard/FinancialTrendChart.tsx`
  - _Requirements: REQ-019-04.3, REQ-019-04.5_

- [ ] **Task 2.6: Remove the hardcoded patient count fallback**
  - Targets: `src/app/page.tsx`, `src/components/dashboard/DashboardKpiCards.tsx`
  - _Requirements: REQ-019-07.1_

## Phase 3: Loket & Kasir
- [ ] **Task 3.1: Add `KASIR_CARRY_OVER_DAYS` and the carry-over query**
  - Targets: `src/constants/clinic.ts`, `src/app/pendaftaran/page.tsx`
  - _Requirements: REQ-019-05.1, REQ-019-05.3, REQ-019-05.5_

- [ ] **Task 3.2: Show the "Tunggakan" badge and split the KPIs**
  - Targets: `src/app/pendaftaran/page.tsx`, `src/components/pendaftaran/CashierPosPanel.tsx`, `src/components/pendaftaran/MasterPatientTable.tsx`
  - _Requirements: REQ-019-05.2, REQ-019-05.4_

## Phase 4: Program Khusus
- [ ] **Task 4.1: Use the local WIB date for "today"**
  - Target: `src/app/program-khusus/page.tsx`
  - _Requirements: REQ-019-08.1_

## Phase 5: Audit Buku Kas vs DATA
- [ ] **Task 5.1: Write the read-only audit script**
  - Target: `scripts/audit-bukukas-vs-csv.mjs`
  - _Requirements: REQ-019-06.1, REQ-019-06.2_

- [ ] **Task 5.2: Run the audit on production and log differences** (blocked: database access)
  - Record each differing month as a follow-up task in this file.
  - _Requirements: REQ-019-06.3_

## Phase 6: Verification Gate
- [ ] **Task 6.1: Static checks and tests**
  - `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`
  - _Requirements: all_

- [ ] **Task 6.2: Runtime verification** (production part blocked: database access)
  - Save every category on production. Compare Dashboard, Laporan, and Excel revenue for October 2026. Settle a carried-over visit on staging.
  - Check Dashboard, Loket & Kasir, and Program Khusus at 360px, 768px, and 1024px.
  - _Requirements: REQ-019-01.2, REQ-019-03.2, REQ-019-04.4, REQ-019-05.3, INV-019-1 to INV-019-5_
