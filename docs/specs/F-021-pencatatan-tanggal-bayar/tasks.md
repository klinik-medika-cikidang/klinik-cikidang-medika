---
id: F-021-TSK
title: "Implementation Tasks: F-021 Pencatatan Tanggal Bayar Pasien"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Implementation Tasks — F-021

Status: waiting for client approval of the charge. Depends on F-019 Phase 3 (carry-over queue).

- [ ] **Task 1: Migration for `tanggal_bayar`, `nominal_pelunasan`, and `visit_cash_events`**
  - Target: `supabase/migrations/<ts>_f021_visit_payment_date.sql`, `src/types/database.ts`
  - Apply to staging first. Production requires explicit approval.
  - _Requirements: REQ-021-01.1, REQ-021-01.4, INV-021-2, INV-021-3, INV-021-4_

- [ ] **Task 2: Write the payment date on settle and piutang payoff**
  - Targets: `src/app/pendaftaran/page.tsx`, `src/components/pendaftaran/PaymentModal.tsx`
  - _Requirements: REQ-021-01.2, REQ-021-01.3_

- [ ] **Task 3: Cash-date helpers with tests**
  - Targets: `src/lib/utils.ts`, `src/lib/utils.test.ts`
  - _Requirements: REQ-021-02.1_

- [ ] **Task 4: Move revenue on Dashboard, Laporan, and Excel to the cash date**
  - Targets: `src/app/page.tsx`, `src/app/laporan/page.tsx`, `src/lib/excel.ts`
  - _Requirements: REQ-021-02.1, REQ-021-02.3, REQ-021-03.1, REQ-021-03.2_

- [ ] **Task 5: Move drawer cash in Buku Kas to the cash date**
  - Targets: `src/app/buku-kas/page.tsx`, `src/components/buku-kas/CashReconciliationCard.tsx`
  - _Requirements: REQ-021-02.2_

- [ ] **Task 6: Receipt shows the payment date**
  - Target: `src/components/pendaftaran/ReceiptModal.tsx`
  - _Requirements: REQ-021-02.4_

- [ ] **Task 7: Verification gate**
  - `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
  - Staging scenario from design §4, September 2026 regression comparison, responsive check.
  - _Requirements: INV-021-1 to INV-021-4_
