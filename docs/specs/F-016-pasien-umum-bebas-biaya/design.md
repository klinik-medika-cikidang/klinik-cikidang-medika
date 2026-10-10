# Technical Design — F-016: Pembebasan Biaya Pasien Umum (Free 100% / Rp 0)

## 1. Architectural Overview & State Flow

### 1.1. Root Cause & Architecture Flaw (Before)
```
[Dokter di /rekam-medis]
   Dokter memasukkan biayaPeriksa = 0
   Disimpan ke DB: visits.biaya_periksa = 0

[Loket Kasir di /pendaftaran]
   Membaca visits.biaya_periksa:
   Number(visit.biaya_periksa || 35000)   <-- BUG: 0 bernilai falsy!
   -> Hasil: 35.000!
   Pasien Umum dipaksa membayar Rp 35.000 dan tidak bisa diselesaikan tanpa tender tunai.
```

### 1.2. Harmonized Architecture & State Flow (After)
```
[Ruang Dokter: /rekam-medis]
   ┌─────────────────────────────────────────────────────────────┐
   │ Input Biaya Periksa: [ 0 ]                                  │
   │ [✓ Free 100% / Gratis]  [Tarif Standar (Rp 35.000)]         │
   │ Alasan: [Kontrol Pasca Tindakan ▾]                          │
   └─────────────────────────────────────────────────────────────┘
                               │
               Disimpan ke PostgreSQL (visits)
               - biaya_periksa = 0
               - is_gratis = true
               - alasan_gratis = 'Kontrol Pasca Tindakan'
                               │
                               ▼
[Meja Kasir: /pendaftaran -> CashierPosPanel]
   ┌─────────────────────────────────────────────────────────────┐
   │ Antrean Siap Bayar:                                         │
   │ Pasien #2 • An ADAM WARDIANSYAH [UMUM]                      │
   │ Badge: [ GRATIS / Rp 0 ] (Kontrol Pasca Tindakan)           │
   ├─────────────────────────────────────────────────────────────┤
   │ Terminal Kasir:                                             │
   │ Jasa Pemeriksaan: Rp 0 (Diskon 100%)                        │
   │ Total Tagihan: Rp 0                                         │
   │ Opsi Batal Gratis: [Kembalikan Tarif Normal]                │
   │ Tombol: [ Konfirmasi Bebas Biaya & Cetak Kuitansi ]         │
   └─────────────────────────────────────────────────────────────┘
                               │
                               ▼
[Output Sistem]
   ├─ Kuitansi Pasien: Status Lunas (Bebas Biaya / Diskon 100%)
   ├─ Buku Kas & Rekonsiliasi: Menghitung Rp 0 (tidak ada uang tunai palsu)
   └─ Audit Owner: Alasan pembebasan biaya terekam permanen
```

---

## 2. Database Delta & Data Model

### 2.1. PostgreSQL Migration
Berkas: `supabase/migrations/20261011_f016_free_pasien_umum_support.sql`

```sql
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS is_gratis BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alasan_gratis TEXT;

CREATE INDEX IF NOT EXISTS idx_visits_is_gratis
  ON public.visits(is_gratis)
  WHERE is_gratis = TRUE;
```

### 2.2. TypeScript Contract Update (`src/types/database.ts`)
```typescript
export type Visit = {
  // ... existing fields ...
  biaya_periksa: number;
  pendapatan_lain: number;
  keterangan_pendapatan?: string;
  is_gratis?: boolean;
  alasan_gratis?: string;
  // ...
};
```

---

## 3. Component Modifications

### 3.1. Clinic Constants (`src/constants/clinic.ts`)
Tambahkan opsi alasan baku pembebasan biaya:
```typescript
export const ALASAN_GRATIS_OPTIONS = [
  'Kontrol Pasca Tindakan',
  'Keluarga Dokter / Staf',
  'Bakti Sosial / Dhuafa',
  'Instruksi Khusus Dokter',
  'Garansi Pemeriksaan Ulang',
  'Lainnya',
] as const;

export type AlasanGratis = (typeof ALASAN_GRATIS_OPTIONS)[number];
```

### 3.2. Workstation Dokter: `PrescriptionQuickPicker.tsx` & `ExaminationForm.tsx`
- **Props**: Tambahkan `isGratis: boolean`, `onChangeIsGratis: (val: boolean) => void`, `alasanGratis: string`, `onChangeAlasanGratis: (val: string) => void`.
- **UI Elements**:
  - Tombol chip `[ Free 100% / Gratis ]` dengan warna aksen hijau/teal saat aktif.
  - Tombol chip `[ Tarif Standar Rp 35.000 ]`.
  - Dropdown/chip pilihan alasan cepat dari `ALASAN_GRATIS_OPTIONS`.
  - Jika `isGratis === true`: otomatis `biayaPeriksa` diset `0`.

### 3.3. Workstation Kasir: `CashierPosPanel.tsx`
- **Fix Evaluasi Biaya**:
  Ganti:
  ```typescript
  const periksa = selectedVisit.jenis_pasien === 'BPJS' ? 0 : Number(selectedVisit.biaya_periksa || 35000);
  ```
  Menjadi:
  ```typescript
  const periksa =
    selectedVisit.jenis_pasien === 'BPJS' || selectedVisit.is_gratis
      ? 0
      : selectedVisit.biaya_periksa !== null && selectedVisit.biaya_periksa !== undefined
        ? Number(selectedVisit.biaya_periksa)
        : DEFAULT_TARIFFS.umum;
  ```
- **State Kasir**:
  Tambahkan state lokal `isGratis` dan `alasanGratis` yang disinkronkan saat `selectedVisit` dimuat.
- **Tombol Kasir**:
  Tambahkan tombol `[ Bebaskan Biaya / Gratis (Rp 0) ]` jika `isGratis === false`.
  Tambahkan tombol `[ Kembalikan Tarif Normal ]` jika `isGratis === true`.
- **Bypass Validasi Tender**:
  Ketika `totalTagihan === 0`, tender tunai dinonaktifkan / disetel Rp 0 otomatis dan tombol submit dapat langsung diklik.

### 3.4. Page Handler: `src/app/pendaftaran/page.tsx`
Perbarui fungsi `handleSettlePayment` untuk menerima dan menyimpan `is_gratis` dan `alasan_gratis`:
```typescript
await supabase.from('visits').update({
  biaya_periksa: finalBiayaPeriksa,
  pendapatan_lain: finalPendapatanLain,
  keterangan_pendapatan: keteranganPendapatan.trim() || null,
  is_gratis: isGratis,
  alasan_gratis: isGratis ? (alasanGratis.trim() || 'Bebas Biaya') : null,
  jenis_pembayaran: isGratis ? 'Tunai' : jenisPembayaran,
  status_pembayaran: 'Lunas',
  payment_state: 'Lunas',
  // ...
});
```

### 3.5. Kuitansi Pasien: `ReceiptModal.tsx`
- Jika `visit.is_gratis || (visit.biaya_periksa === 0 && visit.jenis_pasien === 'UMUM')`:
  - Rincian Pemeriksaan Dokter: `Rp 0 (Bebas Biaya / Diskon 100%)`
  - Catatan tambahan di kuitansi: `Keterangan: ${visit.alasan_gratis || 'Bebas Biaya Pelayanan'}`
  - Total Pelunasan: `Rp 0`
  - Badge Status: `STATUS: LUNAS (BEBAS BIAYA)`

---

## 4. Edge Cases & Resilience

1. **Pasien BPJS vs Umum Bebas Biaya**:
   Pasien BPJS tetap berstatus `Ditanggung BPJS` dan tidak menggunakan flag `is_gratis` (karena BPJS ditanggung oleh klaim kapitasi bulanan, bukan pembebasan biaya manual).
2. **Paket Terapi yang Ditambahkan ke Pasien Gratis**:
   Jika dokter menerapkan Paket Terapi yang memiliki harga obat, kasir dapat memilih apakah obat tetap dibayar atau ikut digratiskan (tombol `[ Bebaskan Seluruh Tagihan ]` menolkan `pendapatanLain` juga).
3. **Rekonsiliasi Buku Kas**:
   Nilai Rp 0 pada `visits` yang berstatus Lunas tidak menambah saldo tunai kasir fisik, sehingga kasir tidak akan mengalami selisih minus saat tutup kas (*cash reconciliation invariant* terjaga).
