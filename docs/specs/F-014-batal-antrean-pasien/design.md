# Technical Design — F-014: Batal & Pulihkan Antrean Pasien

## 1. System Architecture & State Machine

### 1.1 State Transition Diagram

```
+-------------------------------------------------------------------------+
|                                                                         |
|  [Pendaftaran Loket] ---> (status: 'Menunggu Dokter')                    |
|                                     |                                   |
|                  +------------------+------------------+                |
|                  |                                     |                |
|         [Batal Antrean Action]                 [Pemeriksaan Dokter]     |
|                  |                                     |                |
|                  v                                     v                |
|          (status: 'Batal')                 (status: 'Menunggu Kasir')   |
|          [alasan_batal set]                            |                |
|                  |                             [Bayar Kasir]            |
|       [Pulihkan Antrean]                               |                |
|                  |                                     v                |
|                  +----------------------------> (status: 'Lunas')       |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 1.2 Database Schema Delta

We extend `public.visits` with two optional audit columns:

```sql
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS alasan_batal TEXT,
  ADD COLUMN IF NOT EXISTS dibatalkan_pada TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_visits_status_pembayaran_batal
  ON public.visits(status_pembayaran)
  WHERE status_pembayaran = 'Batal';
```

- `status_pembayaran`: stores `'Batal'`.
- `alasan_batal`: stores the structured reason string, e.g. `"Pasien Pulang / Batal Sendiri: Menunggu terlalu lama"`.
- `dibatalkan_pada`: stores the timestamp ISO when cancellation was approved.

---

## 2. Component Inventory

| Component | Path | Status | Responsibility |
|---|---|---|---|
| `CancelQueueModal` | `src/components/rekam-medis/CancelQueueModal.tsx` | New | Accessible modal with 4 quick chips, custom text, and confirmation trigger. |
| `QueueList` | `src/components/rekam-medis/QueueList.tsx` | Modified | Adds 4-tab bar (`Menunggu`, `Selesai`, `Batal`, `Semua`), card cancellation trigger, and restoration button. |
| `RekamMedisPage` | `src/app/rekam-medis/page.tsx` | Modified | Connects `handleCancelQueue` and `handleRestoreQueue` mutations via Supabase JS client. |
| `MasterPatientTable` | `src/components/pendaftaran/MasterPatientTable.tsx` | Modified | Adds `batal` tab, cancellation status badges, and action triggers for front desk. |
| `PendaftaranKasirPage` | `src/app/pendaftaran/page.tsx` | Modified | Updates filters to exclude `'Batal'` from pending POS, connects cancel & restore actions. |

---

## 3. API & Data Contracts

### 3.1 Type Definition Update (`src/types/database.ts`)

```typescript
export type Visit = {
  // ...
  status_pembayaran:
    | 'Menunggu Dokter'
    | 'Menunggu Kasir'
    | 'Menunggu Pembayaran'
    | 'Lunas'
    | 'Ditanggung BPJS'
    | 'Belum Bayar'
    | 'Piutang'
    | 'Pending'
    | 'Batal';
  alasan_batal?: string;
  dibatalkan_pada?: string;
  // ...
};
```

### 3.2 Supabase Mutation Contracts

#### Cancellation Mutation
```typescript
const { data, error } = await supabase
  .from('visits')
  .update({
    status_pembayaran: 'Batal',
    alasan_batal: fullReasonString,
    dibatalkan_pada: new Date().toISOString(),
  })
  .eq('id', visitId)
  .select(`*, pasien:patients(*), dokter:doctors(*)`)
  .single();
```

#### Restoration Mutation
```typescript
const { data, error } = await supabase
  .from('visits')
  .update({
    status_pembayaran: 'Menunggu Dokter',
    alasan_batal: null,
    dibatalkan_pada: null,
  })
  .eq('id', visitId)
  .select(`*, pasien:patients(*), dokter:doctors(*)`)
  .single();
```

---

## 4. UI/UX Specifications (Anti-Slop Directives)

1. **Design Tokens**:
   - Palette: Zinc/Slate neuters, Teal clinic brand (`teal-600`), Emerald for completion, Amber for waiting, and Rose for cancelled status (`bg-rose-50 text-rose-800 border-rose-200`).
   - Card elevation: `shadow-card-double`, `tactile-card`.
   - Typography: Plus Jakarta Sans with tabular font-mono for queue numbers (`#04`).
2. **Mobile Responsiveness**:
   - Responsive tabs on `QueueList` and `MasterPatientTable` with scroll-safe layout (`overflow-x-auto` or compact 4-col grid).
   - Modal renders full width with safe padding on 360px viewport without vertical or horizontal clipping.
3. **Accessibility**:
   - Native dialog semantics, `aria-labelledby`, `aria-describedby`.
   - Keyboard navigation: Escape key closes modal, Tab key maintains focus inside active elements.
   - Contrast: Minimum 4.5:1 ratio across all badge and chip labels.
