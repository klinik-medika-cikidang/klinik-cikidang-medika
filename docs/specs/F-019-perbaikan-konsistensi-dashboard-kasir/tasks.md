---
id: F-019-TSK
title: "Implementation Tasks: F-019 Perbaikan Kategori Kunjungan, Konsistensi Dashboard, dan Tunggakan Kasir"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Implementation Tasks — F-019

Status: code tasks done on branch `claude/f-019-perbaikan-konsistensi-44a314` (2026-10-28). Tasks 1.1, 5.1, 5.2, and the production part of 6.2 are blocked: menunggu akses Supabase.

## Phase 1: Kategori Kunjungan
- [ ] **Task 1.1: Verify and promote the F-011 migration to production** (blocked: menunggu akses Supabase)
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
  - _Requirements: REQ-019-08.1_

## Phase 5: Audit Buku Kas vs DATA
- [ ] **Task 5.1: Write the read-only audit script** (blocked: menunggu akses Supabase; the script cannot be verified without database data)
  - Target: `scripts/audit-bukukas-vs-csv.mjs`
  - _Requirements: REQ-019-06.1, REQ-019-06.2_

- [ ] **Task 5.2: Run the audit on production and log differences** (blocked: menunggu akses Supabase)
  - Record each differing month as a follow-up task in this file.
  - _Requirements: REQ-019-06.3_

## Phase 6: Verification Gate
- [x] **Task 6.1: Static checks and tests**
  - `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`
  - _Requirements: all_

- [ ] **Task 6.2: Runtime verification** (production part blocked: menunggu akses Supabase)
  - Save every category on production. Compare Dashboard, Laporan, and Excel revenue for October 2026. Settle a carried-over visit on staging.
  - Check Dashboard, Loket & Kasir, and Program Khusus at 360px, 768px, and 1024px. (Changed Dashboard and Loket & Kasir components done with mock data, see Task 2.5. Full pages with real data and Program Khusus still pending.)
  - _Requirements: REQ-019-01.2, REQ-019-03.2, REQ-019-04.4, REQ-019-05.3, INV-019-1 to INV-019-5_
