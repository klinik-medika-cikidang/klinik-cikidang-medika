---
id: F-018
title: "Implementation Tasks: F-018 Penyempurnaan Identitas Pasien, Input Tanggal Fleksibel, Rujukan Bidan, dan Rekap Bingkisan Tahunan"
status: implemented
owner: Developer
last_updated: 2026-10-12
---

# Implementation Tasks — F-018

## Task Checklist

### Phase 1: Utilities & Patient Identity UI
- [x] **Task 1.1: Implement Flexible Date Parser Utility**
  - Target: `src/lib/utils.ts`
  - Implement `parseFlexibleDate` supporting `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`, `YYYY-MM-DD`, `DD MMMM YYYY`, and compact 8-digit strings.
  - Add unit tests in `src/lib/utils.test.ts`.
  - _Requirements: REQ-018-02.2_

- [x] **Task 1.2: Display Tanggal Lahir in Search & Master Patient Table**
  - Targets: `src/components/CommandMenu.tsx`, `src/components/pendaftaran/PatientSearchAutocomplete.tsx`, `src/components/pendaftaran/MasterPatientTable.tsx`
  - Show formatted `tanggal_lahir` (e.g. `Lahir: 15/08/2021` or `15 Ags 2021`) in Global Search modal, patient autocomplete, and master patient table.
  - _Requirements: REQ-018-01.1, REQ-018-01.2, REQ-018-01.3, REQ-018-01.4_

- [x] **Task 1.3: Enhance Tanggal Lahir with Paste Support**
  - Targets: `src/components/pendaftaran/NewPatientModal.tsx`, `src/components/pendaftaran/EditPatientModal.tsx`
  - Add `onPaste` handler and paste helper button that parses clipboard date strings into `YYYY-MM-DD` and recalculates age.
  - _Requirements: REQ-018-02.1, REQ-018-02.3, REQ-018-02.4_

### Phase 2: Midwife Referral Recording
- [x] **Task 2.1: Add Midwife Referral Helper & Normalizer**
  - Target: `src/constants/clinic.ts`
  - Add `normalizeBidanName(name: string): string` to ensure DB constraint compliance (`^Bdn\.[A-Za-z ]+$`).
  - _Requirements: REQ-018-03.1_

- [x] **Task 2.2: Add Midwife Referral Selection in Examination Form**
  - Target: `src/components/rekam-medis/ExaminationForm.tsx`
  - In Section 4 (Tindakan & Prosedur), add "Rujukan Bidan" selector with chips/dropdown for registered midwives.
  - Persist `bidan_rujukan` to `visits` on save.
  - _Requirements: REQ-018-03.1, REQ-018-03.2_

- [x] **Task 2.3: Add Midwife Referral in Visit Registration**
  - Target: `src/components/pendaftaran/RegisterVisitModal.tsx`
  - Add optional "Rujukan Bidan" field for patients arriving with referral notes.
  - _Requirements: REQ-018-03.3_

### Phase 3: Annual Hamper Recap & Excel Export
- [x] **Task 3.1: Add Bidan Annual Hamper Recap View**
  - Target: `src/components/laporan/BidanReferralPanel.tsx`
  - Add Annual Hamper Recap view with year selector, showing all midwives, referral counts, and patient counts.
  - _Requirements: REQ-018-03.4, REQ-018-03.5_

- [x] **Task 3.2: Implement Annual Midwife Excel Export**
  - Target: `src/lib/excel.ts`
  - Add `exportBidanAnnualRecapToExcel` function to generate `.xlsx` file for year-end hampers.
  - _Requirements: REQ-018-03.6_

### Phase 4: Cashier & Ledger Clarification
- [x] **Task 4.1: Clarify Cash Drawer vs Book Cash in UI**
  - Target: `src/components/buku-kas/CashReconciliationCard.tsx`
  - Clarify microcopy for "Uang Tunai di Loket Kasir (Laci Fisik)", "Setor Tunai (Buku Kas)", and "Sisa di Laci Kasir".
  - _Requirements: REQ-018-04.1_

- [x] **Task 4.2: Prepare Comprehensive Explanatory Guide for dr. Ovan**
  - Target: `docs/context/DOKTER_OVAN_PENJELASAN_F018.md` and chat response.
  - Answer all 4 feedback points in warm, professional, clinician-friendly Indonesian terms.
  - _Requirements: REQ-018-04.2_

### Phase 5: Timezone Date Range Normalization (Resolusi Selisih 1 Juta)
- [x] **Task 5.1: Implement Local Date Formatter Utility**
  - Target: `src/lib/utils.ts`, `src/lib/utils.test.ts`
  - Add `formatLocalDateToYMD` to construct `YYYY-MM-DD` from local date components, eliminating UTC day shift.
  - _Requirements: REQ-018-05.1_

- [x] **Task 5.2: Apply Local Date Formatting to Date Pickers & Pages**
  - Targets: `src/components/ui/DateRangePicker.tsx`, `src/app/laporan/page.tsx`, `src/app/page.tsx`, `src/app/buku-kas/page.tsx`, `src/app/rekam-medis/page.tsx`
  - Replace `toISOString().split('T')[0]` with `formatLocalDateToYMD`.
  - Validate that reports for October 1-11, 2026 match Google Sheets 100% (173 visits, Rp 18.195.000).
  - _Requirements: REQ-018-05.2, REQ-018-05.3_

### Phase 6: Master Doctor Management & Name Update
- [x] **Task 6.1: Update Database Records to dr. Ade Sofyan**
  - Targets: Supabase Staging & Production `doctors` tables
  - Execute: `UPDATE doctors SET nama = 'dr. Ade Sofyan' WHERE nama = 'dr. Ovan';`
  - _Requirements: REQ-018-06.1_

- [x] **Task 6.2: Build Master Doctor Management Modal**
  - Target: `src/components/pendaftaran/MasterDoctorModal.tsx`
  - Provide UI to add new doctors, edit existing doctor details, and toggle active practice status.
  - _Requirements: REQ-018-06.2_

- [x] **Task 6.3: Integrate Doctor Management Triggers**
  - Targets: `src/components/pendaftaran/RegisterVisitModal.tsx`, `src/components/CommandMenu.tsx`
  - Add "Kelola Dokter" button in visit registration and `#doctors` command in `Ctrl+K`.
  - _Requirements: REQ-018-06.3_

### Phase 7: BPJS FKTP 144 Diagnoses Standards
- [x] **Task 7.1: Expand ICD-10 Catalog with 144 FKTP Diagnoses**
  - Target: `src/constants/icd10.ts`
  - Add comprehensive list of 144 BPJS FKTP primary care standard diagnoses with official codes and Indonesian clinical names.
  - _Requirements: REQ-018-07.1_

- [x] **Task 7.2: Verify Icd10QuickPicker Search Compatibility**
  - Target: `src/components/rekam-medis/Icd10QuickPicker.tsx`
  - Confirm searching by code, Indonesian disease name, and category works seamlessly.
  - _Requirements: REQ-018-07.2_

### Phase 8: Verification Gate & Formal Documentation Deliverable
- [x] **Task 8.1: Run Full Test Suite & Static Analysis**
  - Run `npx vitest run`, `npx tsc --noEmit`, and `npm run build`.
  - Ensure zero regressions.
- [ ] **Task 8.2: Update Markdown Explanatory Document**
  - Target: `docs/context/DOKTER_OVAN_PENJELASAN_F018.md`
  - Add comprehensive explanations for the 1-juta selisih, dr. Ade Sofyan name change & doctor management, and 144 BPJS ICD-10 diagnoses.
- [ ] **Task 8.3: Generate Executive PDF Report**
  - Target: `scripts/generate_penjelasan_f018_update_pdf.py`
  - Render formal grayscale/teal executive PDF into `docs/documentation/` and user's `Downloads` folder.
