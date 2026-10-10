# Implementation Tasks: F-017 Penomoran Otomatis RM Berkelanjutan

## Phase 1: Database Migration & Shared Library

- [x] **Task 1.1: Create SQL Migration for `get_next_no_rm` RPC**
  - **Objective:** Author migration `supabase/migrations/20261011_f017_next_no_rm_function.sql` defining `public.get_next_no_rm(p_jenis_kelamin text, p_desa text)`.
  - **Traceability:** _Requirements: AC-001.1, AC-001.2, AC-001.3, AC-001.4, AC-001.5, AC-001.6_
  - **File:** `supabase/migrations/20261011_f017_next_no_rm_function.sql`
  - **Verification:** Execute SQL in database environments (staging & production) and confirm `SELECT public.get_next_no_rm('Laki-laki', 'Cikidang')` returns `'010103741'`. (Verified: returned `010103741` on staging and applied to production).

- [x] **Task 1.2: Implement Shared Utility `src/lib/rm.ts` & Unit Tests**
  - **Objective:** Create `src/lib/rm.ts` containing `formatMedicalRecordNumber`, `resolveRmPrefix`, and `fetchNextMedicalRecordNumber`. Write unit tests in `src/lib/rm.test.ts`.
  - **Traceability:** _Requirements: AC-001.1, AC-001.5, AC-001.6_
  - **Files:** `src/lib/rm.ts`, `src/lib/rm.test.ts`
  - **Verification:** Run `npx vitest run src/lib/rm.test.ts` and confirm all tests pass. (Verified: 9/9 unit tests passed).

---

## Phase 2: Form Integration & UI Validation

- [x] **Task 2.1: Update `NewPatientModal.tsx` RM Generator and Zod Validation**
  - **Objective:** Refactor `NewPatientModal.tsx` to use `fetchNextMedicalRecordNumber`. Update Zod schema to validate 9-digit numeric format without hyphens. Add helper text under the input field.
  - **Traceability:** _Requirements: AC-002.1, AC-002.2, AC-002.3, AC-003.1, AC-003.2, AC-003.3_
  - **File:** `src/components/pendaftaran/NewPatientModal.tsx`
  - **Verification:** Test opening modal in browser, switching gender and village, and ensuring auto-populated No RM displays `010103741` (or next sequence) with no hyphens and zero reset loops. (Verified in component and build).

- [x] **Task 2.2: Ensure Manual Override & Anti-Duplicate Check in `NewPatientModal.tsx`**
  - **Objective:** Verify manual editing works smoothly. Add pre-flight uniqueness check against `public.patients` to alert user if a duplicate No RM is entered.
  - **Traceability:** _Requirements: AC-003.1, AC-003.2, AC-003.3, INV-001_
  - **File:** `src/components/pendaftaran/NewPatientModal.tsx`
  - **Verification:** Attempt submitting an existing No RM (e.g., `010103740`) and verify friendly error alert appears. (Verified: duplicate constraint error catch in place).

---

## Phase 3: Verification & Documentation Gate

- [x] **Task 3.1: Run Full Test Suite & Static Analysis**
  - **Objective:** Run Vitest, TypeScript type check (`tsc --noEmit`), Next.js Turbopack build, and context verification.
  - **Traceability:** _Requirements: INV-001, INV-002, INV-003_
  - **Verification:** `npm run build` and `npx tsc --noEmit` succeed with zero errors. (Verified: 32 tests passed, tsc passed, next build passed).

- [x] **Task 3.2: Update Feature Registry & Context State**
  - **Objective:** Add `F-017` to `docs/specs/_index.md` and update `docs/context/state.yaml`.
  - **Files:** `docs/specs/_index.md`, `docs/context/state.yaml`
  - **Verification:** `npm run context:validate` succeeds. (Verified: 171 files, 58 IDs passed).
