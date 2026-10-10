# Implementation Tasks — F-016: Pembebasan Biaya Pasien Umum (Free 100% / Rp 0)

## Phase 1: Database Migration & Schema Delta
- [x] **Task 1.1: Author Schema Delta Migration**
  - Create `supabase/migrations/20261011_f016_free_pasien_umum_support.sql`.
  - Add `is_gratis BOOLEAN NOT NULL DEFAULT FALSE` and `alasan_gratis TEXT` to `public.visits`.
  - Create index on `is_gratis`.
  - _Requirements: AC-005, AC-011_

- [x] **Task 1.2: Apply Migration to Staging & Production**
  - Apply migration to Supabase Staging (`jpqmnbtowvfctxciuktj`) and Production (`aszjzvdmxudmoomdxttx`) via Supabase MCP tool.
  - Verify schema consistency.
  - _Requirements: AC-005, AC-011_

- [x] **Task 1.3: Update TypeScript Contracts & Clinic Constants**
  - Update `src/types/database.ts` to include `is_gratis` and `alasan_gratis` on `Visit`.
  - Add `ALASAN_GRATIS_OPTIONS` and `AlasanGratis` to `src/constants/clinic.ts`.
  - _Requirements: AC-003, AC-005_

---

## Phase 2: Workstation Dokter (`/rekam-medis`)
- [x] **Task 2.1: Add Free 100% Chips & Reason Selector to `PrescriptionQuickPicker.tsx`**
  - Add `[ Free 100% / Gratis ]` and `[ Tarif Standar (Rp 35.000) ]` chips.
  - When active, zero out `biayaPeriksa` and `pendapatanLain`.
  - Provide quick reason chips (`Kontrol Pasca Tindakan`, `Keluarga Dokter / Staf`, `Bakti Sosial / Dhuafa`, `Instruksi Khusus Dokter`, etc.).
  - _Requirements: AC-001, AC-002, AC-003, AC-004_

- [x] **Task 2.2: Connect State & Persistence in `ExaminationForm.tsx`**
  - Manage `isGratis` and `alasanGratis` state.
  - Persist `is_gratis` and `alasan_gratis` to `visits` on submit.
  - _Requirements: AC-005_

---

## Phase 3: Workstation Kasir & Settlement (`/pendaftaran`)
- [x] **Task 3.1: Fix Falsy Evaluation Bug in `CashierPosPanel.tsx`**
  - Fix lines 77 and 256 to use nullish checking so `biaya_periksa = 0` does not default to `35000`.
  - Update queue list item to show `[ GRATIS / Rp 0 ]` badge when `is_gratis` or `visitTagihan === 0`.
  - _Requirements: AC-006, AC-007_

- [x] **Task 3.2: Add Cashier Free-Bill Button & Reason Selector in `CashierPosPanel.tsx`**
  - Add `[ Bebaskan Biaya / Gratis (Rp 0) ]` and `[ Kembalikan Tarif Normal ]` toggles.
  - Render quick reason selector for cashier when free bill is active.
  - _Requirements: AC-008, AC-009_

- [x] **Task 3.3: Implement Zero-Bill Tender Bypass & Settlement Handler**
  - In `CashierPosPanel.tsx`, disable cash short warnings (`isKurangBayar = false`) when total bill is 0.
  - In `src/app/pendaftaran/page.tsx`, update `handleSettlePayment` to save `is_gratis` and `alasan_gratis` with `status_pembayaran = 'Lunas'` and `payment_state = 'Lunas'`.
  - _Requirements: AC-010, AC-011_

---

## Phase 4: Kuitansi Pasien & Accounting Verification
- [x] **Task 4.1: Upgrade `ReceiptModal.tsx` for Free Patient Receipts**
  - When `visit.is_gratis` or `totalAmount === 0`, display `STATUS: LUNAS (BEBAS BIAYA / DISKON 100%)`.
  - Display reason note `Alasan: [alasan_gratis]` in receipt breakdown.
  - _Requirements: AC-012_

- [x] **Task 4.2: Verify Cash Book & Reconciliation Invariant**
  - Confirm `buku-kas` correctly calculates Rp 0 without injecting ghost cash revenue.
  - _Requirements: AC-013, INV-001, INV-002_

---

## Phase 5: Automated Testing & Verification Gates
- [x] **Task 5.1: Write Unit Test Coverage**
  - Add tests in `src/lib/clinical.test.ts` covering free patient billing logic and reason tagging.
  - Run `npx vitest run`.
  - _Requirements: All criteria_

- [x] **Task 5.2: Verification Suite**
  - Run `npx tsc --noEmit` (0 type errors).
  - Run `npm run build` (production build passes).
  - Run `npm run context:validate` (context integrity verified).
  - Check mobile & tablet responsiveness across components.

