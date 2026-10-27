---
id: F-023-TSK
title: "Implementation Tasks: F-023 Saldo Awal Laci Kasir"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Implementation Tasks — F-023

Status: waiting for client approval of the charge.

- [ ] **Task 1: Migration for `cash_drawer_openings`**
  - Targets: `supabase/migrations/<ts>_f023_cash_drawer_openings.sql`, `src/types/database.ts`
  - Apply to staging first. Production requires explicit approval.
  - _Requirements: REQ-023-01.1, REQ-023-01.3, INV-023-3_

- [ ] **Task 2: `resolveDrawerOpening` and `summarizeCashPosition` input, with tests**
  - Targets: `src/lib/utils.ts`, `src/lib/utils.test.ts`
  - _Requirements: REQ-023-02.1, REQ-023-02.2, REQ-023-02.3, REQ-023-02.4, REQ-023-02.5, INV-023-1, INV-023-2_

- [ ] **Task 3: Owner form for the opening balance**
  - Targets: `src/components/buku-kas/DrawerOpeningModal.tsx`, `src/app/buku-kas/page.tsx`
  - _Requirements: REQ-023-01.2_

- [ ] **Task 4: Saldo Awal line in the reconciliation card**
  - Targets: `src/app/buku-kas/page.tsx`, `src/components/buku-kas/CashReconciliationCard.tsx`
  - _Requirements: REQ-023-02.4, REQ-023-02.6_

- [ ] **Task 5: Dashboard liquidity card**
  - Target: `src/app/page.tsx`
  - _Requirements: REQ-023-03.1_

- [ ] **Task 6: Verification gate**
  - `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
  - Staging scenario and regression from design §4. Responsive check at 360px, 768px, 1024px.
  - _Requirements: INV-023-1 to INV-023-4_
