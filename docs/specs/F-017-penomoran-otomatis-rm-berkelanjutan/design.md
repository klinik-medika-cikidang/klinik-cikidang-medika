# Technical Design: F-017 Penomoran Otomatis RM Berkelanjutan

## 1. System Architecture & Component Inventory

```text
┌─────────────────────────────────────────────────────────────────┐
│ Browser Client                                                  │
│                                                                 │
│  src/components/pendaftaran/NewPatientModal.tsx                 │
│  ├─ Form State: noRm, jenisKelamin, desa                        │
│  └─ calls: fetchNextMedicalRecordNumber(supabase, jk, desa)    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Shared Library (src/lib/rm.ts)                                  │
│  ├─ Primary: supabase.rpc('get_next_no_rm', { ... })            │
│  └─ Fallback: Direct select & max seq calculation in client     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Supabase Cloud PostgreSQL                                       │
│  ├─ RPC: public.get_next_no_rm(p_jenis_kelamin, p_desa)        │
│  ├─ Function: public.rm_prefix(p_jenis_kelamin, p_desa)         │
│  └─ Table: public.patients (3,750+ rows, no_rm column)          │
└─────────────────────────────────────────────────────────────────┘
```

### Component Delta

| File | Type | Description |
|---|---|---|
| `supabase/migrations/20261010_f017_next_no_rm_function.sql` | New | SQL Migration defining `public.get_next_no_rm` RPC. |
| `src/lib/rm.ts` | New | Shared helper for No RM formatting, prefix resolution, and fetching next sequence. |
| `src/components/pendaftaran/NewPatientModal.tsx` | Modify | Switch to 9-digit unhyphenated generator, update Zod schema, and add clear format hint. |
| `src/lib/clinical.test.ts` (or `src/lib/rm.test.ts`) | New | Unit tests verifying No RM generation rules, padding, and sequence calculation. |

---

## 2. Sequence Calculation Algorithm

### 2.1 Database Function (PostgreSQL)

```sql
CREATE OR REPLACE FUNCTION public.get_next_no_rm(p_jenis_kelamin text, p_desa text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix text;
  v_max_seq integer;
  v_next_seq integer;
BEGIN
  -- 1. Compute 4-digit prefix ([gender 2][village 2])
  v_prefix := public.rm_prefix(p_jenis_kelamin, p_desa);

  -- 2. Extract highest global sequence from all 9-digit RM numbers (last 5 digits)
  SELECT coalesce(max(substring(no_rm from 5 for 5)::integer), 0)
  INTO v_max_seq
  FROM public.patients
  WHERE no_rm ~ '^[0-9]{9}$';

  -- 3. Determine next sequence (at least 3741 or max + 1)
  v_next_seq := greatest(v_max_seq + 1, 3741);

  -- 4. Combine into canonical 9-digit string
  RETURN v_prefix || lpad(v_next_seq::text, 5, '0');
END;
$$;
```

### 2.2 Client-Side Fallback (`src/lib/rm.ts`)

In the event RPC execution is delayed or unavailable, the client executes a direct fallback:
1. Resolves prefix using `JENIS_KELAMIN_RM_CODE[jk]` and `DESA_RM_CODE[desa]` (fallback: `0113`).
2. Queries `supabase.from('patients').select('no_rm').order('created_at', { ascending: false }).limit(100)`.
3. Parses the highest 5-digit suffix from valid 9-digit records.
4. Computes `nextSeq = Math.max(maxFound + 1, 3741)`.
5. Returns `${prefix}${String(nextSeq).padStart(5, '0')}`.

---

## 3. UI State Flow Comparison

### Before (Defective):
```text
[Open Modal]
    │
    ▼
Query: .like('no_rm', '01-01-%')
    │  (Returns 0 rows because DB has 3,750 unhyphenated records)
    ▼
Fallback to Seq 1
    │
    ▼
Displays: "01-01-000001"  ❌ (Alarms doctor: resets to 1, hyphens present)
```

### After (F-017 Seamless):
```text
[Open Modal]
    │
    ▼
Invoke: get_next_no_rm('Laki-laki', 'Cikidang')
    │  (Detects max global sequence 3740 in database)
    ▼
Calculates Seq 3741
    │
    ▼
Displays: "010103741"     ✅ (Canonical 9 digits, continues from Google Sheet)
```

---

## 4. Error Handling & Form Validation

- **Zod Schema**: Update `noRm` validation from hyphenated pattern to:
  ```typescript
  noRm: z
    .string()
    .trim()
    .min(1, 'Nomor RM wajib diisi')
    .regex(/^[0-9]{8,12}$/, 'Nomor RM harus berupa 8-12 digit angka (baku klinik: 9 digit)'),
  ```
- **Pre-Submission Uniqueness Check**:
  Before saving, query `patients` where `no_rm = inputNoRm`. If a record exists (with a different `id`), display:
  `"Nomor RM ${noRm} sudah terdaftar atas nama pasien ${existing.nama}."`
