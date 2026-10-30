---
id: F-020-TSK
title: "Implementation Tasks: F-020 Rekap Pengeluaran Klinik dan Non Klinik"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Implementation Tasks — F-020

Status: code done on branch `claude/f-019-perbaikan-konsistensi-44a314` (2026-10-30, charge approved by the user). REQ-020-02.3 has one open question (see Task 6).

- [x] **Task 1: Scope helpers with tests**
  - Targets: `src/lib/utils.ts`, `src/lib/utils.test.ts`
  - _Requirements: REQ-020-01.1_

- [x] **Task 2: Dashboard and Buku Kas subtotals**
  - Targets: `src/app/page.tsx`, `src/components/dashboard/DashboardKpiCards.tsx`, `src/app/buku-kas/page.tsx`, `src/components/buku-kas/CashFlowSummaryCards.tsx`
  - _Requirements: REQ-020-01.2, REQ-020-01.3_

- [x] **Task 3: Laporan subtotals and monthly recap table**
  - The recap table shows on the Buku Kas tab of Laporan for owners. A range is capped at 240 months so a half-typed date cannot render thousands of rows.
  - Targets: `src/app/laporan/page.tsx`, `src/components/laporan/ReportKpis.tsx`
  - _Requirements: REQ-020-01.4, REQ-020-02.1_

- [x] **Task 4: Excel "Rekap Pengeluaran" sheet**
  - Includes a "Total Periode" row, matching the screen.
  - Target: `src/lib/excel.ts`
  - _Requirements: REQ-020-02.2_

- [x] **Task 5: Grouped categories in the Kas Keluar form**
  - The shared `Select` primitive gained an optional `group` field rendered as ARIA groups with a visible heading. Options without a group render as before.
  - Targets: `src/constants/clinic.ts`, `src/components/buku-kas/AddCashFlowModal.tsx`
  - _Requirements: REQ-020-03.1_

- [ ] **Task 6: Verification gate**
  - `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`: pass (2026-10-30).
  - Resolved 2026-10-30: dr. Ovan confirmed that "Honor & Transport" is a clinic expense, so A-020-1 stands. Previous open question (REQ-020-02.3): the database holds `Honor & Transport` expenses (Rp 34.705.768 up to 2026-10-09) that have no column in the REKAMMEDIS sheet. Under A-020-1 they count as Klinik, so the recap's Klinik figure is higher than the sheet's KLINIK column for the months that contain them. The two sheet categories themselves match the database exactly (F-019 audit). Confirm whether Honor & Transport belongs to Klinik.
  - Pending: visual check at 360px, 768px, 1024px with a logged-in staging session.
  - Compare the 2026 monthly recap with the CSV sums. Check the three screens at 360px, 768px, and 1024px.
  - _Requirements: REQ-020-02.3, INV-020-1 to INV-020-4_

## Staging test and audit (2026-10-30)

Tested end to end on the local build of the `staging` branch against the old staging database (`jpqmnbtowvfctxciuktj`), with an owner and a dokter_admin login and two fictitious test patients. An acceptance and cross-feature audit (5 spec checks plus integration, security/data and responsive/a11y lenses, every finding verified by two independent reviewers) ran three rounds; all confirmed findings were fixed or are listed below as accepted limitations.

- [x] Expense split checked on Dashboard, Buku Kas and Laporan for October 2026 (Klinik Rp 3.424.000 + Non Klinik Rp 1.230.000 = Rp 4.654.000, equal to the database).
- [x] Audit fixes: the "Rekap Pengeluaran" sheet has a "Total Periode" row; the recap scroll area is keyboard focusable; the full-workbook button states the real number of sheets; grouped categories in the Kas Keluar form are exposed as ARIA groups; the breakdown rows wrap instead of clipping.
