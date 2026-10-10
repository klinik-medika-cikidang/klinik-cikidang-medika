# Implementation Tasks — F-015: Peningkatan Laporan Puskesmas & Register Program Kesehatan

## Phase 1: Database Migration & Schema Delta
- [x] **Task 1.1: Author Schema Delta Migration**
  - Create `supabase/migrations/20261011_f015_puskesmas_reporting_enhancement.sql`.
  - Add columns `tanggal_periksa`, `no_rm`, `desa`, and `kategori_ptm` on `public.public_health_records`.
  - Backfill `tanggal_periksa` from `created_at::DATE` and `no_rm`/`desa` from linked `patients`.
  - Add indexes for `tanggal_periksa` and `kategori_ptm`.
  - Applied and verified on both Staging (`jpqmnbtowvfctxciuktj`) and Production (`aszjzvdmxudmoomdxttx`) with 812/812 records backfilled.
  - _Requirements: AC-005, AC-007, INV-004_

- [x] **Task 1.2: Update TypeScript Data Contracts**
  - Update `src/types/database.ts` to include `tanggal_periksa`, `no_rm`, `desa`, and `kategori_ptm` in `PublicHealthRecord`.
  - _Requirements: AC-005, AC-007_

---

## Phase 2: Domain Utilities & Excel Engine
- [x] **Task 2.1: Implement PTM Classifier Utility**
  - Implement `classifyPtm(record)` in `src/lib/clinical.ts` to categorize records into `Hipertensi`, `Diabetes`, or `Lainnya`.
  - Add unit test coverage in `src/lib/clinical.test.ts`.
  - Verified with 4/4 passing unit tests.
  - _Requirements: AC-015, AC-016_

- [x] **Task 2.2: Harmonize Excel Export Generator**
  - Update `PublicHealthExportRow` and `exportPublicHealthToExcel` in `src/lib/excel.ts`.
  - Add `Tanggal Periksa`, `No RM`, and `Desa` as primary columns across all sheets.
  - Add `GPA` column for ANC and 3 Eliminasi.
  - Add separate columns for `HBsAg`, `HIV`, and `Sifilis` in 3 Eliminasi sheet.
  - Add `Kategori PTM` column in PTM sheet.
  - Scope sheet title and file name with the selected period.
  - _Requirements: AC-004, AC-006, AC-011, AC-014, AC-017_

---

## Phase 3: UI Enhancement — Input Modal & Workstation
- [x] **Task 3.1: Upgrade `NewPublicHealthModal`**
  - Add `Tanggal Periksa` input with default value today.
  - Add `No RM` and `Desa` (dropdown from `DESA_OPTIONS`) auto-filled on patient selection.
  - Add `GPA` manual text input for `ANC` and `ELIMINASI_3` with placeholder `Contoh: G3P2A0` and descriptive helper text.
  - Add quick-select chips and `Set Semua Non-Reaktif` button for `HBsAg`, `HIV`, and `Sifilis`.
  - Add `Kategori PTM` selector chips (`Hipertensi`, `Diabetes Melitus`, `Lainnya`) with auto-detection.
  - _Requirements: AC-008, AC-009, AC-013, AC-015_

- [x] **Task 3.2: Connect `KategoriProgramPanel` in Doctor Examination**
  - In `src/components/program-khusus/KategoriProgramPanel.tsx`, pass active `visit` and `visit.pasien` context to pre-fill patient and visit IDs when clicking "Lengkapi Register Program".
  - _Requirements: AC-007, AC-008_

---

## Phase 4: UI Enhancement — Register Table & Monthly Filter
- [x] **Task 4.1: Add Monthly Period Picker to `PublicHealthRegistry`**
  - In `src/components/program-khusus/PublicHealthRegistry.tsx`, add a Month-Year dropdown (`Bulan: [Oktober 2026 ▾]`) defaulting to current month.
  - Add option for `"Semua Periode"`.
  - Filter displayed rows and Excel export to the selected month.
  - _Requirements: AC-001, AC-002, AC-003, AC-004_

- [x] **Task 4.2: Add PTM Subcategory Filter Chips**
  - When active program filter is `PTM`, display subcategory chips: `Semua PTM`, `Hipertensi`, `Diabetes Melitus`, `Lainnya`.
  - _Requirements: AC-015, AC-016_

- [x] **Task 4.3: Redesign Table Columns for Universal Baseline**
  - Restructure table headers and rows in `PublicHealthRegistry.tsx` to prominently show:
    `Program | Tanggal | No RM | Nama | JK | Desa & Alamat | Diagnosa | GPA / Keterangan Klinis | Lab Screening`.
  - For ANC: display `GPA` badge.
  - For 3 Eliminasi: display individual `HBsAg`, `HIV`, and `Sifilis` screening outcome pills.
  - For PTM: display `Hipertensi` / `Diabetes` classification badge.
  - Also synchronized `PuskesmasReportPanel.tsx` in `/laporan` to use snapshot `tanggal_periksa`, `no_rm`, and `desa`.
  - _Requirements: AC-005, AC-010, AC-012_

---

## Phase 5: Verification & Delivery Gates
- [x] **Task 5.1: Automated Tests & Typecheck**
  - Run `npx vitest run`: 18/18 tests pass across all test suites.
  - Run `npx tsc --noEmit`: 0 type errors.
  - Run `npm run build`: Production compilation succeeds with all 12 routes statically optimized.
  - _Requirements: All criteria_

- [x] **Task 5.2: Mobile Responsiveness Verification**
  - Tested `/program-khusus` table and modals with responsive overflow wrappers and 40px–44px touch targets.
  - Zero horizontal page scrolling.
  - _Requirements: INV-003_
