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
└────────────────────────────────┴───────────────────────────────────────┘
                                   │
                                   ▼
                 Supabase Cloud PostgreSQL (visits, patients)
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

### E. Buku Kas vs. Uang Kasir Clarification

Update microcopy in `CashReconciliationCard.tsx`:
- Header subtitle: "Mencocokkan penerimaan uang tunai loket kasir (laci fisik) dengan catatan setoran bank di Buku Kas"
- Card 1: "Uang Tunai di Loket Kasir (Laci Fisik)" -> Total uang cash fisik yang diterima kasir hari ini.
- Card 2: "Tercatat Disetor ke Bank (Buku Kas)" -> Mutasi masuk kategori Setor Tunai di Buku Kas.
- Card 3: "Sisa Tunai di Kasir (Belum Disetor)" -> Uang tunai yang masih dipegang di laci kasir klinik.

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
