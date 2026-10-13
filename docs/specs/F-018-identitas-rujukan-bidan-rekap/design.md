---
id: F-018
title: "Technical Design: F-018 Penyempurnaan Identitas Pasien, Input Tanggal Fleksibel, Rujukan Bidan, dan Rekap Bingkisan Tahunan"
status: draft
owner: Developer
last_updated: 2026-10-12
---

# Technical Design — F-018

## 1. System Architecture & Component Inventory

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interfaces (Next.js)                       │
├────────────────────────────────┬───────────────────────────────────────┤
│ 1. Patient Identity & Search   │ • CommandMenu.tsx (Ctrl+K)            │
│                                │ • PatientSearchAutocomplete.tsx       │
│                                │ • MasterPatientTable.tsx              │
├────────────────────────────────┼───────────────────────────────────────┤
│ 2. Flexible Date Input         │ • parseFlexibleDate (src/lib/utils.ts)│
│                                │ • NewPatientModal.tsx                 │
│                                │ • EditPatientModal.tsx                │
├────────────────────────────────┼───────────────────────────────────────┤
│ 3. Midwife Referral Workflow   │ • ExaminationForm.tsx (Tindakan)      │
│                                │ • RegisterVisitModal.tsx (Loket)      │
│                                │ • BidanReferralPanel.tsx (Rekap)      │
│                                │ • exportBidanAnnualRecapToExcel       │
├────────────────────────────────┼───────────────────────────────────────┤
│ 4. Cashier Reconciliation      │ • CashReconciliationCard.tsx          │
├────────────────────────────────┼───────────────────────────────────────┤
│ 5. Timezone Date Range Fix     │ • formatLocalDateToYMD (src/lib/utils)│
│                                │ • DateRangePicker.tsx                 │
│                                │ • src/app/laporan/page.tsx            │
│                                │ • src/app/page.tsx                    │
├────────────────────────────────┼───────────────────────────────────────┤
│ 6. Master Doctor Management    │ • MasterDoctorModal.tsx               │
│                                │ • RegisterVisitModal.tsx trigger      │
│                                │ • CommandMenu.tsx (#doctors action)   │
│                                │ • Supabase doctors table              │
├────────────────────────────────┼───────────────────────────────────────┤
│ 7. ICD-10 BPJS FKTP Standards  │ • src/constants/icd10.ts (144 codes)  │
│                                │ • Icd10QuickPicker.tsx                │
└────────────────────────────────┴───────────────────────────────────────┘
                                   │
                                   ▼
          Supabase Cloud PostgreSQL (visits, patients, doctors, cash_flows)
```

---

## 2. Detailed Technical Design

### A. Flexible Date Parsing Utility (`src/lib/utils.ts`)

```typescript
export function parseFlexibleDate(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  
  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const [_, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 2. Day-first format: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const [_, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 3. Compact 8-digit: DDMMYYYY
  const compactMatch = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactMatch) {
    const [_, d, m, y] = compactMatch;
    return `${y}-${m}-${d}`;
  }

  // 4. Indonesian month names: e.g. "15 Agustus 1990", "15 Ags 1990"
  // ... matching Indonesian month dictionary ...
}
```

### B. Displaying Tanggal Lahir in Search & Tables

- In `CommandMenu.tsx`:
  Render under patient name:
  `Desa {p.desa} • Usia {p.usia || '-'} thn • Lahir: {formatDateShort(p.tanggal_lahir)} • NIK: {p.no_ktp}`
- In `PatientSearchAutocomplete.tsx`:
  Display `Lahir: {formatDateShort(p.tanggal_lahir)}` along with age and village.
- In `MasterPatientTable.tsx`:
  In the patient identity cell:
  `{patient.usia !== undefined ? `${patient.usia} thn` : '-'}, {patient.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}{patient.tanggal_lahir ? ` • Lahir: ${formatDateIndo(patient.tanggal_lahir)}` : ''}`

### C. Midwife Referral in Clinical Examination & Loket

- In `src/constants/clinic.ts`:
  Standard list of clinic midwives:
  `BIDAN_REFERRAL_SOURCES = ['Bdn.Ai', 'Bdn.Desi', 'Bdn.Dewi', 'Bdn.Nida', 'Bdn.Novi', 'Bdn.Rila', 'Bdn.Tari', 'Bdn.Trie', 'Bdn.Ulfah']`
- Normalization function:
  `normalizeBidanName(name: string): string`
  Normalizes "Bidan Dewi" or "dewi" -> "Bdn.Dewi" (satisfying Postgres regex `^Bdn\.[A-Za-z ]+$`).
- In `ExaminationForm.tsx`:
  Section 4 (Tindakan Klinis & Lab Point-of-Care) adds a dedicated sub-card:
  "Rujukan Bidan (Jika Ada)" with:
  - Quick chips for top midwives
  - Custom midwife name input
  - Saves to `visits.bidan_rujukan`
- In `RegisterVisitModal.tsx`:
  Optional dropdown/field to assign `bidan_rujukan` during front-desk visit registration.

### D. Annual Hamper Recap View (`BidanReferralPanel.tsx`)

- Add tab/toggle: "Rekap Tahunan (Bingkisan)" vs "Filter Tanggal Kustom".
- Year selector: 2026, 2025, 2024 (dynamically inferred or selectable).
- Aggregates all visits by `bidan_rujukan` for the entire selected year.
- Always lists ALL registered midwives (even with 0 referrals) so clinic management knows who referred and who didn't.
- Excel Export: `exportBidanAnnualRecapToExcel(year, data)` generating `Rekap_Bingkisan_Bidan_{year}.xlsx`.

### E. Buku Kas, Setoran Pemilik, & Rekonsiliasi Fisik Laci Kasir

- **Classification Helpers (`src/lib/utils.ts`)**:
  - `isCashHandoverToOwnerOrBank(flow)`: Returns `true` when `kategori` matches `'Setor Tunai'` or `'Setor ke Rekening Pemilik'`.
  - `isOperationalExpense(flow)`: Returns `true` when `jenis === 'Keluar'` and `!isCashHandoverToOwnerOrBank(flow)`.
- **Nominal Normalization (`normalizeRupiah` in `src/lib/utils.ts` & `AddCashFlowModal.tsx`)**:
  - Threshold reduced from `< 10000` to `< 1000` so real Rupiah values `Rp 1.000`–`Rp 9.999` are never multiplied by `1000`.
  - `AddCashFlowModal.tsx` saves `parseResult.data.nominal` directly without calling `normalizeRupiah`.
- **4-Pillar Physical Drawer Reconciliation (`CashReconciliationCard.tsx`)**:
  - Supports mode toggle: **Akumulasi Bulan Ini** (default) vs **Per Tanggal / Hari Ini** (with date picker).
  - Pillar 1: *Uang Tunai Masuk Laci (Pasien Tunai)* (`+`)
  - Pillar 2: *Pengeluaran Tunai dari Laci (Operasional)* (`-`)
  - Pillar 3: *Disetor ke Pemilik / Bank (`Setor Tunai` & `Setor ke Rekening Pemilik`)* (`-`)
  - Pillar 4: *Sisa Fisik di Laci Kasir* (`= Tunai Masuk Laci - Pengeluaran Laci - Disetor ke Pemilik/Bank`)

### F. Timezone Normalization (`formatLocalDateToYMD`)

- Problem: In browser running in UTC+7 (WIB), calling `new Date(2026, 9, 1).toISOString().split('T')[0]` converts midnight WIB (`2026-09-30 17:00:00Z`) to UTC, causing the date string to roll back to `2026-09-30`. This caused reports for October 2026 to include September 30 (8 visits, Rp 950.000).
- Solution: `formatLocalDateToYMD(date: Date)` extracts `date.getFullYear()`, `date.getMonth() + 1`, and `date.getDate()` with zero padding, ensuring 100% adherence to local calendar dates.
- Applied to: `DateRangePicker.tsx`, `src/app/laporan/page.tsx`, `src/app/page.tsx`, `src/app/buku-kas/page.tsx`, and `src/app/rekam-medis/page.tsx`.

### G. Master Doctor Management (`MasterDoctorModal.tsx`)

- Database: Supabase `doctors` table (`id`, `nama`, `spesialisasi`, `aktif`, `created_at`).
- Staging and production records updated: `UPDATE doctors SET nama = 'dr. Ade Sofyan' WHERE nama = 'dr. Ovan'`.
- Component: `MasterDoctorModal.tsx` provides:
  - Form to create new doctors (`INSERT INTO doctors (nama, spesialisasi, aktif)`).
  - Inline edit for existing doctors (`UPDATE doctors SET nama, spesialisasi, aktif WHERE id = ...`).
  - Active toggle switch to activate/deactivate doctors from queue selection.
- Triggers:
  - Quick button "Kelola Dokter" in `RegisterVisitModal.tsx` above the doctor dropdown.
  - Global Command Menu (`Ctrl+K`) action "Kelola Master Dokter & Tenaga Medis" (`#doctors`).

### H. Comprehensive 144 BPJS FKTP Standard Diagnoses (`src/constants/icd10.ts`)

- Primary reference: Permenkes No. 5 Tahun 2014 & Panduan Praktik Klinis Dokter di Faskes Primer (BPJS Kesehatan).
- Catalog contains 144 core outpatient competencies with official ICD-10 codes across 13 medical categories (Infeksi Tropis, Respirasi, Pencernaan, Kardiovaskular, Endokrin, Kulit, Mata, THT, Urologi, Kebidanan, Saraf, Muskuloskeletal, Trauma/Tindakan).
- Consumed by `Icd10QuickPicker.tsx` with instant multi-attribute search across code, Indonesian disease name, and category.

---

## 3. Data Flow Diagram

```text
[Pasien Datang / Rujukan Bidan]
             │
             ▼
[Loket: RegisterVisitModal] ──(opsional bidan_rujukan)──┐
             │                                          │
             ▼                                          │
[Dokter: ExaminationForm]                               │
   ├─ Section Tindakan Medis                            │
   └─ Rujukan Bidan (Pilih Bdn.Tari / input)            │
             │                                          │
             ▼                                          ▼
   [Database: visits table (kolom bidan_rujukan)] ◄─────┘
             │
             ▼
   [Laporan: BidanReferralPanel]
   ├─ Rekap Tahunan Bingkisan Akhir Tahun
   └─ Ekspor Excel Rekap_Bingkisan_Bidan_2026.xlsx
```
