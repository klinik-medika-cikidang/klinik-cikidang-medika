# Technical Design — F-015: Peningkatan Laporan Puskesmas & Register Program Kesehatan

## 1. System Architecture & Context

The Public Health Registry (`public.public_health_records`) serves as the clinical data foundation for government surveillance reporting to Puskesmas Cikidang (PKM). Currently, two surfaces interface with this dataset:
1. **Operational Workstation (`/program-khusus`)**: Day-to-day register management, manual entry modal, and quick `.xlsx` export.
2. **Reporting Hub (`/laporan` -> Puskesmas)**: Comprehensive historical register export with multi-parameter column layouts.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACES                               │
├───────────────────────────────────┬────────────────────────────────────┤
│   /program-khusus                 │   /rekam-medis (Doctor Live Exam)  │
│   • Month-Year Filter Picker      │   • KategoriProgramPanel           │
│   • PTM Subcategory Chips         │   • Direct GPA & Lab Capture       │
│   • Updated Table (No RM, Desa)   │   • Auto-links visit_id & pasien_id│
│   • NewPublicHealthModal (GPA,Lab)│                                    │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │                                    │
                  ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA PERSISTENCE & EXCEL                        │
├────────────────────────────────────────────────────────────────────────┤
│   PostgreSQL: public.public_health_records                             │
│   • Explicit: tanggal_periksa, no_rm, desa, gpa, hiv, syphilis, hbsag  │
│   • Auto-Classification: PTM (Hipertensi vs Diabetes Melitus)          │
│                                                                        │
│   Excel Engine: src/lib/excel.ts                                       │
│   • exportPublicHealthToExcel (Harmonized with PKM columns)            │
│   • exportPuskesmasRegisterToExcel (Monthly scoped export)             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema Delta

### 2.1 Additive Columns on `public.public_health_records`
To guarantee durable, snapshot-proof reporting that remains resilient even if patient references change or are unlinked, we add non-breaking additive columns:

```sql
-- 1. Examination date & patient demographic snapshots
ALTER TABLE public.public_health_records
  ADD COLUMN IF NOT EXISTS tanggal_periksa DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS no_rm VARCHAR(30),
  ADD COLUMN IF NOT EXISTS desa VARCHAR(100),
  ADD COLUMN IF NOT EXISTS kategori_ptm VARCHAR(50);

-- 2. Backfill tanggal_periksa from created_at or visits.tanggal_periksa where null
UPDATE public.public_health_records
SET tanggal_periksa = created_at::DATE
WHERE tanggal_periksa IS NULL;

-- 3. Backfill no_rm & desa from patients where linked and currently null
UPDATE public.public_health_records phr
SET 
  no_rm = p.no_rm,
  desa = p.desa
FROM public.patients p
WHERE phr.pasien_id = p.id
  AND (phr.no_rm IS NULL OR phr.desa IS NULL);

-- 4. Create performant indexes for monthly date range queries and PTM filters
CREATE INDEX IF NOT EXISTS idx_public_health_tanggal_periksa 
  ON public.public_health_records(tanggal_periksa DESC);

CREATE INDEX IF NOT EXISTS idx_public_health_kategori_ptm 
  ON public.public_health_records(kategori_ptm);
```

---

## 3. Component & State Design

### 3.1 Month-Year Period Selector (`PublicHealthRegistry.tsx`)
Currently, `/program-khusus` loads all 812 records without period filtering. We introduce a clean, tactile Month-Year picker:

```typescript
interface MonthOption {
  value: string; // e.g. "2026-10", "2026-09", "ALL"
  label: string; // e.g. "Oktober 2026", "September 2026", "Semua Periode"
}
```

- **Filter Logic**:
  ```typescript
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Program Filter
      if (programFilter !== 'ALL' && r.program_type !== programFilter) return false;

      // 2. Month Filter
      if (selectedMonth !== 'ALL') {
        const recordDate = r.tanggal_periksa || r.created_at?.split('T')[0] || '';
        if (!recordDate.startsWith(selectedMonth)) return false;
      }

      // 3. PTM Subcategory Filter (when PTM is active)
      if (programFilter === 'PTM' && ptmSubFilter !== 'ALL') {
        const cat = classifyPtm(r);
        if (cat !== ptmSubFilter) return false;
      }

      return true;
    });
  }, [records, programFilter, selectedMonth, ptmSubFilter]);
  ```

### 3.2 PTM Auto-Classification Heuristic
To save doctor/admin time, PTM records are automatically classified if `kategori_ptm` is not explicitly set:

```typescript
export function classifyPtm(record: { diagnosa?: string | null; kategori_ptm?: string | null }): 'Hipertensi' | 'Diabetes' | 'Lainnya' {
  if (record.kategori_ptm) {
    if (record.kategori_ptm.toLowerCase().includes('hipertensi')) return 'Hipertensi';
    if (record.kategori_ptm.toLowerCase().includes('diabet')) return 'Diabetes';
  }

  const d = (record.diagnosa || '').toLowerCase();
  
  // Hipertensi / Kardiovaskular patterns
  if (
    d.includes('hipertensi') || 
    d.includes('ht') || 
    d.includes('i10') || 
    d.includes('i11') || 
    d.includes('darah tinggi') ||
    d.includes('kardio')
  ) {
    return 'Hipertensi';
  }

  // Diabetes Melitus patterns
  if (
    d.includes('diabetes') || 
    d.includes('dm') || 
    d.includes('e11') || 
    d.includes('e14') || 
    d.includes('kencing manis') ||
    d.includes('gula darah')
  ) {
    return 'Diabetes';
  }

  return 'Lainnya';
}
```

### 3.3 Enhanced Table Columns in `PublicHealthRegistry.tsx`
The table is restructured to present the Universal Baseline upfront:

| Column Header | Field Source | Presentation Note |
|---|---|---|
| **Program** | `r.program_type` | Icon badge with accent styling |
| **Tanggal** | `r.tanggal_periksa \|\| r.created_at` | Tabular date (`DD/MM/YYYY`) |
| **No RM** | `r.no_rm \|\| r.pasien?.no_rm` | Monospace bold badge (`RM-XXXXX`) |
| **Nama Pasien** | `r.nama` | Bold slate-900 |
| **JK** | `r.jenis_kelamin` | `L` / `P` chip |
| **Desa & Alamat** | `r.desa` + `r.alamat` | Desa in bold badge + kampung in muted text |
| **Diagnosa** | `r.diagnosa` | Medical diagnosis description |
| **Keterangan Klinis** | Dynamic based on program: | |
| - *ANC* | `GPA: {r.gpa \|\| '-'}` | Highlighting obstetrical formula |
| - *3 Eliminasi* | Badges: `HBsAg`, `HIV`, `Sifilis` | Reaktif / Non-Reaktif pills |
| - *PTM* | Badge: `Hipertensi` / `Diabetes` | Puskesmas category pill |
| - *KB* | `Jenis KB: {r.jenis_kb}` + `Tgl Kembali` | Family planning follow-up date |

### 3.4 Modal Enhancements (`NewPublicHealthModal.tsx`)
1. **Universal Baseline Inputs**:
   - `Tanggal Periksa`: Date picker (defaults to today).
   - `No RM`: Text input (auto-populated when patient autocomplete is selected).
   - `Desa`: Dropdown populated from `CIKIDANG_VILLAGES` in `src/constants/clinic.ts`.
2. **ANC / 3 Eliminasi Fields**:
   - `GPA (Gravida, Para, Abortus)`:
     - Input: Free-text input (`type="text"`)
     - Placeholder: `Contoh: G3P2A0`
     - Helper text: `Format manual: G = Hamil, P = Partus/Lahir, A = Abortus/Keguguran`
   - `3 Eliminasi Labs`:
     - Three quick-choice rows: `HBsAg`, `HIV`, `Sifilis`.
     - Value chips: `Non-Reaktif` (default), `Reaktif`, `Belum Diperiksa`, or custom text.
3. **PTM Category**:
   - Radio / Chip options: `Hipertensi (Kardiovaskular)`, `Diabetes Melitus (DM)`, `Lainnya`.

---

## 4. Excel Export Harmonization (`src/lib/excel.ts`)

`exportPublicHealthToExcel` will be updated to output the exact column structure required by Puskesmas Cikidang:

### Sheet 1: PTM (Penyakit Tidak Menular)
`Tanggal Periksa | No RM | Nama Pasien | JK | TTL | Desa | Alamat | No NIK | Kategori PTM | Diagnosa | Hasil Lab / Terapi`

### Sheet 2: ANC (Antenatal Care)
`Tanggal Periksa | No RM | Nama Pasien | JK | TTL | Desa | Alamat | No NIK | Diagnosa | GPA | Terapi | HbSAg`

### Sheet 3: 3 Eliminasi
`Tanggal Periksa | No RM | Nama Pasien | JK | TTL | Desa | Alamat | No NIK | Diagnosa | GPA | Terapi | HBsAg | HIV | Sifilis`

### Sheet 4: KB (Keluarga Berencana)
`Tanggal Periksa | No RM | Nama Pasien | TTL | Desa | Alamat | No NIK | Jenis KB | Tanggal Kembali`

---

## 5. Security & Verification

- **Role-Based Access Control**:
  - `dokter_admin` and `owner` have full read/write access to public health records.
  - Data exports are restricted to authenticated sessions.
- **Verification Gates**:
  - Unit / E2E verification of month filter calculation.
  - PTM classifier unit tests with sample ICD codes and free-text strings.
  - Mobile responsiveness test at 360px, 768px, and 1024px.
