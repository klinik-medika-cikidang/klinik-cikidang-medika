---
id: F-023-TSK
title: "Implementation Tasks: F-023 Saldo Awal Laci Kasir"
status: draft
owner: Developer
last_updated: 2026-10-30
---

# Implementation Tasks — F-023

Status: code done, awaiting the staging test.

Migration note: `20261030_f023_cash_drawer_openings.sql` was applied to the old staging project `jpqmnbtowvfctxciuktj` on 2026-10-30 and verified (RLS on, 1 policy, 0 rows). It MUST be applied to production, after the user approves the staging test, before this code is deployed there, because Buku Kas and the Dashboard read `cash_drawer_openings` and show an error without it.

- [x] **Task 1: Migration for `cash_drawer_openings`**
  - Done: table applied to staging only; `CashDrawerOpening` type added.
  - Targets: `supabase/migrations/20261030_f023_cash_drawer_openings.sql`, `src/types/database.ts`
  - Apply to staging first. Production requires explicit approval.
  - _Requirements: REQ-023-01.1, REQ-023-01.3, INV-023-3_

- [x] **Task 2: `resolveDrawerOpening` and `summarizeCashPosition` input, with tests**
  - Done: resolvers and drawer-net helpers live in `src/lib/drawer-opening.ts` (tested in `drawer-opening.test.ts`), the Supabase loader in `src/lib/drawer-opening-loader.ts`; `saldoAwal` (default 0) only moves `drawerCash`.
  - Targets: `src/lib/utils.ts`, `src/lib/utils.test.ts`, `src/lib/drawer-opening.ts`, `src/lib/drawer-opening.test.ts`, `src/lib/drawer-opening-loader.ts`
  - _Requirements: REQ-023-02.1, REQ-023-02.2, REQ-023-02.3, REQ-023-02.4, REQ-023-02.5, INV-023-1, INV-023-2_

- [x] **Task 3: Owner form for the opening balance**
  - Done: `DrawerOpeningModal` upserts on `periode`; the page renders it and the card button only for `role === 'owner'`.
  - Targets: `src/components/buku-kas/DrawerOpeningModal.tsx`, `src/app/buku-kas/page.tsx`
  - _Requirements: REQ-023-01.2_

- [x] **Task 4: Saldo Awal line in the reconciliation card**
  - Done: "Saldo Awal" tile before "Tunai Masuk Laci" with Dicatat, Lanjutan, or "Saldo awal belum diisi"; formula text includes Saldo Awal; per-date mode uses `resolveDailyDrawerOpening`.
  - Targets: `src/app/buku-kas/page.tsx`, `src/components/buku-kas/CashReconciliationCard.tsx`
  - _Requirements: REQ-023-02.4, REQ-023-02.6_

- [x] **Task 5: Dashboard liquidity card**
  - Done: when the period bounds equal the current calendar month, `summarizeCashPosition` gets the same Saldo Awal as Buku Kas; other periods are unchanged.
  - Target: `src/app/page.tsx`
  - _Requirements: REQ-023-03.1_

- [ ] **Task 6: Verification gate** (partial)
  - Done: `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run build` pass.
  - Open: staging scenario and regression from design §4, responsive check at 360px, 768px, 1024px in a browser.
  - _Requirements: INV-023-1 to INV-023-4_

## Follow-up (not part of F-023)
- [ ] **Owner-only writes in RLS (R-023-1)**: the policy lets every authenticated user, including `dokter_admin`, insert, update, or delete openings through PostgREST, while the UI shows the control to the owner only. AGENTS.md §10 says UI hiding is not authorization. Closing it needs the role in `app_metadata` and is a project-wide change; it needs the user's approval before work starts.
