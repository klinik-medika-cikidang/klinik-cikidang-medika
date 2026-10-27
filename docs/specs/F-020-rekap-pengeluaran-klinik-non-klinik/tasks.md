---
id: F-020-TSK
title: "Implementation Tasks: F-020 Rekap Pengeluaran Klinik dan Non Klinik"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Implementation Tasks — F-020

Status: waiting for client approval of the charge. Depends on F-019 Task 5.2 for REQ-020-02.3.

- [ ] **Task 1: Scope helpers with tests**
  - Targets: `src/lib/utils.ts`, `src/lib/utils.test.ts`
  - _Requirements: REQ-020-01.1_

- [ ] **Task 2: Dashboard and Buku Kas subtotals**
  - Targets: `src/app/page.tsx`, `src/components/dashboard/DashboardKpiCards.tsx`, `src/app/buku-kas/page.tsx`, `src/components/buku-kas/CashFlowSummaryCards.tsx`
  - _Requirements: REQ-020-01.2, REQ-020-01.3_

- [ ] **Task 3: Laporan subtotals and monthly recap table**
  - Targets: `src/app/laporan/page.tsx`, `src/components/laporan/ReportKpis.tsx`
  - _Requirements: REQ-020-01.4, REQ-020-02.1_

- [ ] **Task 4: Excel "Rekap Pengeluaran" sheet**
  - Target: `src/lib/excel.ts`
  - _Requirements: REQ-020-02.2_

- [ ] **Task 5: Grouped categories in the Kas Keluar form**
  - Targets: `src/constants/clinic.ts`, `src/components/buku-kas/AddCashFlowModal.tsx`
  - _Requirements: REQ-020-03.1_

- [ ] **Task 6: Verification gate**
  - `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
  - Compare the 2026 monthly recap with the CSV sums. Check the three screens at 360px, 768px, and 1024px.
  - _Requirements: REQ-020-02.3, INV-020-1 to INV-020-4_
