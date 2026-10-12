---
id: F-018
title: "Penyempurnaan Identitas Pasien, Input Tanggal Fleksibel, Rujukan Bidan, dan Rekap Bingkisan Tahunan"
status: draft
owner: Developer
last_updated: 2026-10-12
priority: P1
milestone: Change Request
---

# F-018: Penyempurnaan Identitas Pasien, Input Tanggal Fleksibel, Rujukan Bidan, dan Rekap Bingkisan Tahunan

## 1. Executive Summary & Context

Based on direct feedback and operational inquiries from dr. Ovan (Clinical Director, Klinik Pratama Cikidang Medika):
1. **Identitas Pasien Kembar/Sama**: In the global search modal (`Ctrl+K`) and master patient tables, searching common names (e.g. "Faiz") returns multiple patients from neighbouring villages or identical ages. Staff and doctors need `tanggal_lahir` (Date of Birth) displayed immediately to avoid misidentifying patients.
2. **Input Tanggal Lahir Paste Support**: The standard HTML `<input type="date">` in `NewPatientModal.tsx` and `EditPatientModal.tsx` restricts clipboard paste actions. Front desk staff frequently receives patient identity data from WhatsApp in formats like `15/08/1990` or `15-08-1990`. They need to copy and paste date strings directly without manual typing, with automatic age recalculation.
3. **Pencatatan Rujukan Bidan & Rekap Bingkisan Tahunan**: The clinic maintains partnerships with local midwives who refer patients for clinical procedures (infusion, wound care, circumcision, lab, observation). Doctors need an explicit option around the "Tindakan" section in `ExaminationForm.tsx` to record the referring midwife. Furthermore, the clinic prepares annual hampers (*bingkisan akhir tahun*) based on referral counts, requiring a dedicated annual recap view and Excel export in `/laporan`.
4. **Klarifikasi Operasional Buku Kas vs. Uang Tunai Kasir**: dr. Ovan requested clarification regarding whether "Buku Kas" refers to physical cash in the drawer. An authoritative clinical-financial explanation and enhanced UI cues are required to demarcate cash drawer receipts (*Laci Kasir*) from the clinic's operational cash ledger (*Buku Kas*) and bank settlements (*Rekonsiliasi Setor Tunai*).

---

## 2. User Stories & Acceptance Criteria

### User Story 1: Identitas Tanggal Lahir pada Pencarian & Master Pasien (dr. Ovan & Staf Loket)
*As a doctor or registration officer searching for a patient with a common name,*
*I want to see the patient's exact Date of Birth alongside age, village, and NIK,*
*So that I never select the wrong medical record for examination or billing.*

- **REQ-018-01.1**: WHEN a user searches in `CommandMenu.tsx` (Global Search `Ctrl+K`), the patient search result item SHALL display formatted `tanggal_lahir` (e.g., `Lahir: 15/08/2021` or `15 Ags 2021`) if available.
- **REQ-018-01.2**: WHEN a user searches in `PatientSearchAutocomplete.tsx`, each dropdown option SHALL display `tanggal_lahir` alongside village and age.
- **REQ-018-01.3**: WHEN viewing `MasterPatientTable.tsx` (Master Pasien and Kunjungan Aktif queues), each patient row SHALL display `tanggal_lahir`.
- **REQ-018-01.4**: IF `tanggal_lahir` is null or empty, the UI SHALL display a graceful fallback (`-` or omit date) without layout distortion.

### User Story 2: Paste Support & Normalisasi Cerdas Tanggal Lahir (Staf Loket & Perawat)
*As a registration officer receiving patient biodata via WhatsApp,*
*I want to paste date strings directly into the Tanggal Lahir field in any common Indonesian format,*
*So that I don't have to manually pick from a calendar or re-type the date digits.*

- **REQ-018-02.1**: In `NewPatientModal.tsx` and `EditPatientModal.tsx`, the `Tanggal Lahir` input SHALL accept direct clipboard paste events (`Ctrl+V`, right-click paste).
- **REQ-018-02.2**: The date parser SHALL recognize and parse the following formats into ISO `YYYY-MM-DD`:
  - `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`
  - `YYYY-MM-DD`, `YYYY/MM/DD`
  - Indonesian text month: `DD MMMM YYYY` (e.g., `15 Agustus 1990`, `15 Ags 1990`)
  - Compact 8-digit numeric: `DDMMYYYY` (e.g., `15081990`)
- **REQ-018-02.3**: WHEN a valid date is pasted, the system SHALL immediately update `tanggalLahir`, recalculate `usia` (age in years), and display a confirmation indicator or formatted preview.
- **REQ-018-02.4**: A "Tempel Tanggal" helper button SHALL be provided adjacent to the input to allow 1-click clipboard paste on mobile/tablet devices.

### User Story 3: Pencatatan Rujukan Bidan di Tindakan & Rekap Tahunan Bingkisan (Dokter & Owner)
*As a doctor examining a patient referred by a midwife,*
*I want to select the referring midwife directly in the Tindakan section of the examination form,*
*And as clinic management, I want to view an annual recap of referring midwives to prepare year-end gift hampers (bingkisan).*

- **REQ-018-03.1**: In `ExaminationForm.tsx`, Section 4 (Tindakan Medis & Lab), the form SHALL provide a dedicated "Rujukan Bidan" selection field with options from `BIDAN_REFERRAL_SOURCES` (Bdn. Ai, Bdn. Desi, Bdn. Dewi, Bdn. Nida, Bdn. Novi, Bdn. Rila, Bdn. Tari, Bdn. Trie, Bdn. Ulfah) and support for custom midwife input (`Bdn.<Nama>`).
- **REQ-018-03.2**: WHEN the examination is saved, `bidan_rujukan` SHALL be persisted to the `visits` table.
- **REQ-018-03.3**: In `RegisterVisitModal.tsx`, Loket Pendaftaran SHALL also provide an optional "Rujukan Bidan" selection so front desk staff can tag referred patients upon arrival.
- **REQ-018-03.4**: In `BidanReferralPanel.tsx` (`/laporan`), the UI SHALL provide a "Rekap Tahunan Bingkisan" view with a year selector (default: current year).
- **REQ-018-03.5**: The annual recap SHALL list all registered midwives sorted by referral volume, displaying total referrals and unique patients.
- **REQ-018-03.6**: The annual recap SHALL provide an Excel export button ("Ekspor Rekap Bingkisan Bidan") generating a clean `.xlsx` workbook.

### User Story 4: Klarifikasi Buku Kas vs Uang Kasir (dr. Ovan & Tim Manajemen)
*As dr. Ovan and clinic owners,*
*I want a crystal-clear operational protocol and UI labels explaining the difference between physical cash in the drawer and operational cash ledger,*
*So that cashier reconciliation and daily banking deposits are never misunderstood.*

- **REQ-018-04.1**: UI microcopy in `CashReconciliationCard.tsx` SHALL explicitly state:
  - *Uang Tunai di Loket Kasir*: "Penerimaan tunai fisik di laci kasir klinik dari pembayaran pasien hari ini."
  - *Tercatat Disetor ke Bank*: "Setoran tunai yang telah disetor ke rekening bank klinik dan dicatat di Buku Kas."
  - *Sisa Fisik di Kasir*: "Uang tunai fisik yang masih tersimpan di laci kasir (belum disetor ke bank)."
- **REQ-018-04.2**: A dedicated operational summary note SHALL be provided to dr. Ovan answering their inquiry in full professional clarity.

---

## 3. Non-Regression Invariants

1. **Patient Data Integrity**: Existing patients and visits in PostgreSQL SHALL NOT be altered or corrupted.
2. **Constraint Safety**: The `chk_visits_bidan_rujukan` regex (`^Bdn\.[A-Za-z ]+$`) must be satisfied by all saved values, or normalized prior to mutation.
3. **Responsive UI**: All newly added fields and panels must be 100% responsive across mobile (360px-640px), tablet (768px-1024px), and desktop (1024px+).
4. **Zero AI Slop**: Strict adherence to `/antislop-code`, `/antislop-ui`, and Plus Jakarta Sans typography.
