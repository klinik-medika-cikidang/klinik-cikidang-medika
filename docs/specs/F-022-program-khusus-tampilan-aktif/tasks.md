---
id: F-022-TSK
title: "Implementation Tasks: F-022 Tampilan Pasien Aktif pada Program Khusus"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Implementation Tasks — F-022

Status: code done on branch `claude/f-019-perbaikan-konsistensi-44a314` (2026-10-30, charge approved by the user). Staging count check and the visual responsive check wait for test accounts on staging.

- [x] **Task 1: Active-status helpers with tests**
  - Targets: `src/constants/clinic.ts`, `src/lib/program-status.ts`, `src/lib/program-status.test.ts`
  - _Requirements: REQ-022-02.1, REQ-022-02.2, REQ-022-02.3_

- [x] **Task 2: "Aktif / Semua" scope per tab, default Aktif**
  - The toggle is a pair of `aria-pressed` buttons built on the `Button` primitive, labelled "Pasien Aktif" and "Semua Riwayat". Radix tabs were dropped because there is no tab panel to control. The "Sembuh / Selesai" TBC pill is hidden in the active scope, where it could never match.
  - Targets: `src/app/program-khusus/page.tsx`, `src/components/program-khusus/TbcControlCard.tsx`, `CircumcisionList.tsx`, `PostCareAgenda.tsx`
  - _Requirements: REQ-022-01.1, REQ-022-01.2, REQ-022-01.3, INV-022-2_

- [x] **Task 3: KPI cards and tab counters over active rows**
  - The observation card now shows active agendas, with "Hari Ini" and "Lewat" (Mangkir or past date) as its breakdown; the completed count left the card because completed agendas are not active.
  - Targets: `src/app/program-khusus/page.tsx`, `src/components/program-khusus/ProgramKhususKpis.tsx`
  - _Requirements: REQ-022-03.1, REQ-022-03.2_

- [x] **Task 4: Dashboard clinical alerts reuse the helpers**
  - Target: `src/app/page.tsx`
  - _Requirements: REQ-022-03.3_

- [ ] **Task 5: Verification gate**
  - `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`: pass (2026-10-30).
  - Pending: staging count check and the 360/768/1024px visual check (need a logged-in staging session). The filter bar stacks below `xl` so the search, scope toggle, and filter pills never share one row on a 1024px screen with the sidebar.
  - Staging count check, Program Kesehatan unchanged, responsive check at 360px, 768px, 1024px.
  - _Requirements: INV-022-1 to INV-022-4_

## Staging test and audit (2026-10-30)

Tested end to end on the local build of the `staging` branch against the old staging database (`jpqmnbtowvfctxciuktj`), with an owner and a dokter_admin login and two fictitious test patients. An acceptance and cross-feature audit (5 spec checks plus integration, security/data and responsive/a11y lenses, every finding verified by two independent reviewers) ran three rounds; all confirmed findings were fixed or are listed below as accepted limitations.

- [x] Day-14 vs day-15 boundary checked on staging with test rows (day 14 active, day 15 not).
- [x] Audit fixes: empty states distinguish "nothing active" from "found only in Semua Riwayat"; tab counters and KPI titles wrap instead of truncating; the scope toggle has 44px buttons 8px apart and fits at 360px; Mangkir agendas count as late the same way on the Dashboard, the KPI cards and the agenda tabs.
- [x] Responsive: no page-level horizontal scroll at 360, 768, 1024px.
