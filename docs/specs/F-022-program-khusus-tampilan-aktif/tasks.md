---
id: F-022-TSK
title: "Implementation Tasks: F-022 Tampilan Pasien Aktif pada Program Khusus"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Implementation Tasks — F-022

Status: waiting for client approval of the charge. Depends on F-019 Task 4.1 (local date).

- [ ] **Task 1: Active-status helpers with tests**
  - Targets: `src/constants/clinic.ts`, `src/lib/program-status.ts`, `src/lib/program-status.test.ts`
  - _Requirements: REQ-022-02.1, REQ-022-02.2, REQ-022-02.3_

- [ ] **Task 2: "Aktif / Semua" scope per tab, default Aktif**
  - Targets: `src/app/program-khusus/page.tsx`, `src/components/program-khusus/TbcControlCard.tsx`, `CircumcisionList.tsx`, `PostCareAgenda.tsx`
  - _Requirements: REQ-022-01.1, REQ-022-01.2, REQ-022-01.3, INV-022-2_

- [ ] **Task 3: KPI cards and tab counters over active rows**
  - Targets: `src/app/program-khusus/page.tsx`, `src/components/program-khusus/ProgramKhususKpis.tsx`
  - _Requirements: REQ-022-03.1, REQ-022-03.2_

- [ ] **Task 4: Dashboard clinical alerts reuse the helpers**
  - Target: `src/app/page.tsx`
  - _Requirements: REQ-022-03.3_

- [ ] **Task 5: Verification gate**
  - `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
  - Staging count check, Program Kesehatan unchanged, responsive check at 360px, 768px, 1024px.
  - _Requirements: INV-022-1 to INV-022-4_
