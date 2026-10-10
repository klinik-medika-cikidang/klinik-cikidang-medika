# Requirements Specification — F-015: Peningkatan Laporan Puskesmas & Register Program Kesehatan

## 1. Executive Summary

Klinik Pratama Cikidang Medika routinely submits monthly public health program surveillance reports (*Laporan Program Kesehatan / Register DPP*) to the local Community Health Center (Puskesmas Cikidang / PKM) at the end of each calendar month. Following a direct clinical review and feedback from the clinic physician (dr. Ovan / dr. Neneng):

1. **Universal Reporting Baseline**: All reports and register tables MUST include **Examination Date (`Tanggal`)**, **Medical Record Number (`No RM`)**, and **Standardized Village Domicile (`Alamat Sesuai Desa`)**. Furthermore, monitoring and export must operate on a **Monthly Period (`perbulan`)** selector rather than an unfiltered all-time dump.
2. **Triple Elimination (3 Eliminasi)**: Surveillance for pregnant mothers requires explicit, separate reporting of three screening lab parameters: **HBsAg**, **HIV**, and **Sifilis (Syphilis)**, with monthly aggregation, village domicile, and No RM.
3. **Antenatal Care (ANC) & GPA**: Maternal pregnancy monitoring requires the clinical obstetrical formula **GPA** (Gravida, Para, Abortus; e.g. `G3P2A0`). Per explicit doctor request (*"untuk anc, manual ngetik aja GPA nya om"*), this input SHALL be a free-text manual input with format placeholder assistance.
4. **Non-Communicable Diseases (PTM)**: Puskesmas reporting specifically monitors cardiovascular conditions (**Hipertensi**) and metabolic disorders (**Diabetes Melitus**). The registry must categorize and filter PTM cases into these two priority Puskesmas surveillance streams.

This specification formalizes the requirements to elevate both `/program-khusus` (Register Program Khusus) and `/laporan` (Laporan Puskesmas) to 100% compliance with Puskesmas Cikidang reporting standards.

---

## 2. Glossary & Domain Definitions

- **PKM (Puskesmas)**: Puskesmas Cikidang, the regional government health center supervising private primary clinics (Klinik Pratama).
- **Universal Baseline Fields**: The triad of fields (`Tanggal Periksa`, `No RM`, `Desa / Alamat`) required by Puskesmas epidemiology on every single patient entry.
- **Triple Eliminasi (3 Eliminasi)**: National Ministry of Health program targeting vertical transmission prevention from mother to child: Human Immunodeficiency Virus (HIV), Hepatitis B Surface Antigen (HBsAg), and Treponema pallidum (Sifilis).
- **GPA (Gravida, Para, Abortus)**: Obstetric history code representing:
  - **G (Gravida)**: Total number of pregnancies (including current).
  - **P (Para)**: Number of viable births.
  - **A (Abortus)**: Number of miscarriages or terminations before 20 weeks.
  - Example: `G3P2A0` = 3rd pregnancy, 2 living births, 0 miscarriages.
- **PTM Surveillance Stream**: The two primary chronic disease categories monitored by Puskesmas:
  - **Hipertensi / Kardiovaskular** (ICD-10 I10, I11, I15).
  - **Diabetes Melitus** (ICD-10 E10, E11, E14).

---

## 3. User Stories

### US-001: Monthly Puskesmas Reporting by Clinic Admin / Doctor
> **As a** Clinic Doctor or Medical Records Admin (`dokter_admin`),  
> **I want to** filter `/program-khusus` by calendar month (e.g., Oktober 2026) and export the monthly register to Excel,  
> **So that** I can send the official end-of-month surveillance report to Puskesmas Cikidang without manual data cutting or formatting.

### US-002: Complete Universal Data Visibility
> **As a** Clinic Staff Member viewing the public health register,  
> **I want to** see `Tanggal`, `No RM`, and `Desa` prominently displayed in the table and exported Excel sheets,  
> **So that** every record has complete patient identification matching PKM reporting templates.

### US-003: Obstetric ANC Examination with Manual GPA
> **As an** Examining Doctor or Midwife recording an ANC visit,  
> **I want to** type the patient's GPA formula directly into a dedicated text field (e.g. `G3P2A0`),  
> **So that** obstetric history is cleanly captured and exported without cluttering the primary ICD-10 diagnosis.

### US-004: Triple Elimination Screening Results
> **As a** Doctor or Laboratory Staff recording a 3 Eliminasi case,  
> **I want to** record and view distinct screening outcomes for `HBsAg`, `HIV`, and `Sifilis`,  
> **So that** vertical disease transmission screening is completely auditable and ready for Puskesmas compliance.

### US-005: PTM Disease Categorization (Hipertensi vs. Diabetes)
> **As a** Clinic Administrator preparing the monthly PTM report,  
> **I want to** filter and classify PTM records into Hipertensi (Kardiovaskular) and Diabetes Melitus,  
> **So that** the exact target counts required by Puskesmas programs can be reported effortlessly.

---

## 4. Acceptance Criteria (RFC 2119 & EARS)

### 4.1 Monthly Period Filtering (`/program-khusus`)
- **AC-001**: `/program-khusus` SHALL provide a Month-Year selector (e.g., `Bulan: [Oktober 2026 ▾]`) that defaults to the current active calendar month.
- **AC-002**: WHEN a user changes the selected month, the displayed records in `PublicHealthRegistry` SHALL automatically filter to only show records examined or created within that calendar month.
- **AC-003**: The selector SHALL include an option for `"Semua Periode"` to allow all-time historical viewing when required.
- **AC-004**: The Excel export button (`Unduh Laporan Puskesmas (.xlsx)`) SHALL export ONLY the records matching the currently selected month period, with the active period stated in the Excel header.

### 4.2 Universal Reporting Baseline (`Tanggal`, `No RM`, `Desa`)
- **AC-005**: Every row in `PublicHealthRegistry` table SHALL display:
  1. `Tanggal` (Examination date or record creation date in `DD/MM/YYYY` format).
  2. `No RM` (Formatted medical record number, e.g. `RM-00123`).
  3. `Nama Pasien` & `Jenis Kelamin`.
  4. `Desa` (Official village domicile, e.g. `Cikidang`, `Cicareuh`, `Pangkalan`).
  5. `Alamat` (Specific address / kampung).
- **AC-006**: In Excel exports (`exportPublicHealthToExcel` and `exportPuskesmasRegisterToExcel`), the column structure SHALL place `Tanggal Periksa`, `No RM`, and `Desa` in the primary columns preceding clinical details.
- **AC-007**: IF a record in `public_health_records` is linked to `patients` via `pasien_id`, the system SHALL resolve `no_rm` and `desa` from `patients`. IF unlinked, it SHALL fallback gracefully to snapshotted fields.

### 4.3 Antenatal Care (ANC) & GPA Free-Text Entry
- **AC-008**: The `NewPublicHealthModal` and `KategoriProgramPanel` SHALL provide a dedicated input field for `GPA` when `ANC` or `ELIMINASI_3` is active.
- **AC-009**: The `GPA` input SHALL be a manual free-text input (`type="text"`) with placeholder `"Contoh: G3P2A0"` and explanatory helper text `"G = Hamil, P = Partus/Lahir, A = Abortus/Keguguran"`.
- **AC-010**: The `PublicHealthRegistry` table SHALL display the `GPA` value in a dedicated badge or column for ANC and 3 Eliminasi rows.
- **AC-011**: Both Excel export functions SHALL include a dedicated `"GPA"` column in the ANC and 3 Eliminasi sheets.

### 4.4 Triple Elimination (3 Eliminasi) Lab Screening
- **AC-012**: For `ELIMINASI_3` records, the registry table SHALL display individual outcome indicators for `HBsAg`, `HIV`, and `Sifilis`.
- **AC-013**: In `NewPublicHealthModal`, the screening inputs for `HBsAg`, `HIV`, and `Sifilis` SHALL offer quick-select pills (`Non-Reaktif` [recommended default], `Reaktif`, `Belum Diperiksa`) while permitting custom text entry.
- **AC-014**: The Excel export for 3 Eliminasi SHALL feature separate, dedicated columns:
  - Column: `HBsAg`
  - Column: `HIV`
  - Column: `Sifilis (Syphilis)`

### 4.5 Non-Communicable Diseases (PTM) Categorization
- **AC-015**: Under the `PTM` program tab in `PublicHealthRegistry`, the interface SHALL provide category filter pills:
  1. `Semua PTM`
  2. `Hipertensi (Kardiovaskular)`
  3. `Diabetes Melitus (DM)`
  4. `PTM Lainnya`
- **AC-016**: The system SHALL automatically classify PTM records based on diagnosis / ICD-10 code:
  - **Hipertensi**: matches `I10`, `I11`, `I15`, or diagnosis containing `hipertensi`, `ht`, `tekanan darah tinggi`, `cardio`.
  - **Diabetes Melitus**: matches `E10`, `E11`, `E14`, or diagnosis containing `diabetes`, `dm`, `gula`, `kencing manis`.
- **AC-017**: The Excel export for PTM SHALL include a `"Kategori PTM"` column indicating whether the case is `Hipertensi`, `Diabetes Melitus`, or `Lainnya`, enabling instant summation for Puskesmas reports.

---

## 5. Non-Regression Invariants

- **INV-001**: All existing 812 public health records already saved in the database SHALL remain fully intact and visible.
- **INV-002**: Unlinked historical records (rows where `visit_id` is null) SHALL NOT be excluded from registry views or exports.
- **INV-003**: The mobile responsive design mandate (viewport 360px–1024px) SHALL be preserved with horizontal table containers and 44px touch targets.
- **INV-004**: Zero hard schema dropping: Any schema adjustments must be strictly additive (`ADD COLUMN IF NOT EXISTS`).

---

## 6. Out of Scope

- Automated direct API synchronization with BPJS P-Care or Puskesmas SIP (Sistem Informasi Puskesmas) web portal (reporting is conducted via standard monthly `.xlsx` file submission).
- Laboratory equipment IoT / HL7 hardware interfacing.
