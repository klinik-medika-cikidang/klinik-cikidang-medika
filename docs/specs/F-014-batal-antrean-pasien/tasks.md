# Implementation Tasks — F-014: Batal & Pulihkan Antrean Pasien

## Task Matrix & Traceability

- [x] **TASK-001**: Database Schema Extension Migration (`20261010_f014_cancel_queue_support.sql`)
  - Target: `supabase/migrations/20261010_f014_cancel_queue_support.sql`
  - Scope: Add `alasan_batal TEXT`, `dibatalkan_pada TIMESTAMPTZ`, and index to `public.visits`.
  - Staging & Production execution via Supabase MCP.
  - _Requirements: AC-001, AC-002, AC-003, AC-004_

- [x] **TASK-002**: Database Types Extension
  - Target: `src/types/database.ts`
  - Scope: Add `'Batal'` to `Visit['status_pembayaran']`, add `alasan_batal?: string`, and `dibatalkan_pada?: string`.
  - _Requirements: AC-002, AC-012_

- [x] **TASK-003**: Reusable CancelQueueModal Component
  - Target: `src/components/rekam-medis/CancelQueueModal.tsx`
  - Scope: Create modal with 4 quick chips, custom text input, confirmation & cancel handlers, keyboard navigation (Escape), and antislop-ui standards.
  - _Requirements: AC-005, AC-006_

- [x] **TASK-004**: QueueList Integration in Doctor Workstation
  - Target: `src/components/rekam-medis/QueueList.tsx`
  - Scope: Add 4th tab (`Batal`) with badge count; adjust filtering so `'Batal'` is segregated; add "Batalkan" trigger on waiting cards and "Pulihkan" button on cancelled cards.
  - _Requirements: AC-007, AC-008, AC-009, AC-012, AC-013_

- [x] **TASK-005**: Ruang Dokter Page State & Supabase Mutations
  - Target: `src/app/rekam-medis/page.tsx`
  - Scope: Implement `handleCancelQueue` and `handleRestoreQueue` mutations; update selection logic so cancelled visit shifts to next waiting patient; wire `CancelQueueModal`.
  - _Requirements: AC-002, AC-007, AC-012, AC-013_

- [x] **TASK-006**: Front-Desk MasterPatientTable Integration
  - Target: `src/components/pendaftaran/MasterPatientTable.tsx`
  - Scope: Add `'batal'` tab; update status badges; add "Batalkan" action button on unserved visits and "Pulihkan" on cancelled visits.
  - _Requirements: AC-010, AC-011, AC-012_

- [x] **TASK-007**: Loket Pendaftaran Page Wiring & Cashier POS Exclusion
  - Target: `src/app/pendaftaran/page.tsx`
  - Scope: Update `isWaitingDoctor` and `isWaitingPayment` to exclude `'Batal'`; connect `handleCancelQueue` and `handleRestoreQueue` handlers; render `CancelQueueModal`.
  - _Requirements: AC-010, AC-012, AC-013_

- [x] **TASK-008**: Verification & Regression Gate
  - Target: Entire repository
  - Scope: Run `npx tsc --noEmit`, `npm test`, `npm run build`, and `npm run context:validate`. Verify 360px mobile view responsiveness. Update `docs/context/state.yaml`.
  - _Requirements: All_
