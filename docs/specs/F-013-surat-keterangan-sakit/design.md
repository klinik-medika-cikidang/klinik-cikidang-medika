---
id: F-013-DESIGN
feature: F-013
title: "Surat Keterangan Sakit: Alamat Tambahan yang Dapat Diedit"
status: draft
owner: "Developer"
last_updated: "2026-10-08"
last_verified_commit: unverified
related:
  - "requirements.md"
---

# Design: F-013 Surat Keterangan Sakit - Alamat Tambahan yang Dapat Diedit

## 1. Design Summary

Perubahan ini adalah penyuntingan terarah pada satu komponen client yang sudah ada,
`src/components/rekam-medis/SuratSakitModal.tsx`. Penambahan berupa satu field teks opsional
"Alamat Tambahan" pada panel pengaturan surat, dengan nilai yang disimpan di state modal dan
langsung dipakai pada baris alamat surat.

Pendekatan yang dipilih adalah **menyimpan alamat tambahan hanya di state lokal modal
(ephemeral, tidak dipersistensi)**. Alasan tertulis:

1. Permintaan klien bersifat presentasional ("tambahkan option alamat tambahan (editable)" pada
   surat), bukan permintaan penyimpanan data.
2. Seluruh input lain pada surat yang sama (lama istirahat, tanggal mulai, pekerjaan, anjuran)
   sudah bersifat ephemeral dan tidak dipersistensi. Menyimpan hanya alamat tambahan akan
   menciptakan inkonsistensi model yang tidak diminta.
3. Menyimpan berarti menambah kolom pada `visits` (atau tabel baru) beserta migrasi, RLS, dan
   kebijakan retensi untuk data PII alamat. Ini melampaui lingkup MVP dan memerlukan persetujuan
   perubahan data (lihat Bagian 6 dan Bagian 15 di `requirements.md`).
4. Menghindari penyimpanan PII alamat bebas mengurangi risiko privasi dan menjaga larangan
   logging PII pada aturan repositori.

Architecture inputs:

- Global architecture: `AGENTS.md` Bagian 4 (Aturan Arsitektur Permanen) dan Bagian 5 (Tanggung
  Jawab Direktori).
- Modul: `src/components/` (komponen domain) dan `src/components/ui/` (primitif atomik).
- Related ADR: none.

## 2. Existing Context

Komponen terkait dan perannya:

- `src/components/rekam-medis/SuratSakitModal.tsx`: komponen modal `'use client'` yang merender
  Surat Keterangan Istirahat Sakit. Menerima props `isOpen`, `onClose`, `visit`, `patient`,
  `doctors`. Menyimpan state lokal `jumlahHari`, `tanggalMulai`, `pekerjaan`, `anjuran`,
  `selectedDoctorId`. Baris alamat dibangun dari `patient.alamat` dan `patient.desa` (L249-L254).
  Pencetakan memakai `window.print()` (L70-L72). Panel pengaturan berlabel `print:hidden`, badan
  surat berukuran A5 (`max-w-[148mm]`).
- `src/components/rekam-medis/ExaminationForm.tsx`: pemilik state pembuka modal
  (`isSuratSakitOpen`), tombol pembuka, dan pemanggilan `SuratSakitModal` (L638-L645). Tidak
  perlu diubah oleh fitur ini.
- `src/components/rekam-medis/SuratRujukanModal.tsx`: surat rujukan. Menyediakan preseden pola
  "field kustom yang dapat diedit dan tidak dipersistensi" melalui `customFaskes` (L55, L72).
- `src/components/ui/Input.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Select.tsx`:
  primitif yang dapat dipakai ulang untuk field dan aksi.

Patterns to preserve:

- Modal surat memakai state lokal, tanpa panggilan tulis ke Supabase.
- Semua kontrol pengaturan memakai kelas `print:hidden`; badan surat bebas dari kelas tersebut.
- Tipografi memakai Plus Jakarta Sans (via Next.js Font Optimization) dan angka tabular bila ada
  nilai numerik.
- Bahasa antarmuka dan pesan dalam Bahasa Indonesia, tanpa em dash pada teks UI.

Constraints:

- Tidak ada dependensi baru dan tidak ada perubahan skema database.
- Wajib memakai primitif `src/components/ui/` dan konstanta `src/constants/clinic.ts`.
- Wajib responsif pada 360 px, 768 px, dan 1024 px ke atas tanpa gulir horizontal tingkat halaman.

Architecture invariants that implementation must preserve:

- INV-001: Tidak ada akses database mentah; komponen tidak menulis ke Supabase.
- INV-002: Semua kontrol antarmuka memakai primitif `src/components/ui/`.
- INV-003: Logika cetak tetap murni di sisi klien melalui `window.print()`.

## 3. Proposed Implementation Flow

```text
Dokter membuka modal SKS (ExaminationForm)
  -> SuratSakitModal dirender (state lokal)
  -> Dokter mengetik "Alamat Tambahan" (state lokal, trim + batas 120 karakter)
  -> Pratinjau surat merender baris alamat terdaftar + alamat tambahan (bila terisi)
  -> Dokter menekan "Cetak Surat (A5)" -> window.print()
  -> Modal ditutup: state dibuang, tidak ada penulisan ke database
```

Sequence:

1. `ExaminationForm` menyalakan `isSuratSakitOpen`, sehingga `SuratSakitModal` dirender.
2. `SuratSakitModal` menginisialisasi state `alamatTambahan` dengan string kosong.
3. Nilai input yang telah dinormalkan dipakai pada baris alamat di dalam blok surat.
4. Bila field kosong setelah trim, hanya alamat terdaftar yang dirender.
5. Tidak ada langkah error jaringan karena tidak ada I/O; satu-satunya kegagalan adalah pembatalan
   dialog cetak browser, dan state modal tetap utuh.

## 4. Component Changes

| Component or path | Change | Responsibility |
|---|---|---|
| `src/components/rekam-medis/SuratSakitModal.tsx` | Modify | Menambah state `alamatTambahan`, field input opsional pada panel pengaturan, dan rendering bertingkat pada baris alamat surat. |
| `src/components/rekam-medis/ExaminationForm.tsx` | None (unchanged) | Tetap menjadi pemilik pembuka modal. Tidak ada perubahan kontrak props. |
| `src/components/ui/Input.tsx` | Reuse (unchanged) | Menyediakan field teks dengan label, helper text, dan indikator fokus. |
| `src/components/ui/Button.tsx` | Reuse (unchanged) | Tombol cetak dan tutup yang sudah ada. |
| `src/lib/utils.ts` | Reuse (unchanged) | `cn` untuk penggabungan kelas bila diperlukan. |
| `src/constants/clinic.ts` | Reuse (unchanged) | Sumber kop surat dan daftar desa yang sudah ada. |

Catatan: tidak ada file baru dibuat. Kontrak props `SuratSakitModal` tidak berubah, sehingga
pemanggil di `ExaminationForm` tidak perlu disesuaikan.

## 5. Data Model Implementation

Architecture source: tidak ada modul `system-architecture.md` pada MVP; perilaku mengikuti
`AGENTS.md` Bagian 7 (Aturan State dan Data).

| Field | Type | Required | Rules |
|---|---|---|---|
| `alamatTambahan` | state lokal `string` | No | Opsional, di-trim, maksimum 120 karakter, hanya dipakai untuk surat aktif |

Invariants:

- INV-004: `alamatTambahan` TIDAK BOLEH keluar dari siklus hidup modal; tidak ada penulisan ke
  Supabase dan tidak ada entri `localStorage`.
- INV-005: `patients.alamat` dan `patients.desa` TIDAK BOLEH dimutasi oleh nilai ini.

Keputusan penyimpanan (dibahas eksplisit): alamat tambahan **tidak dipersistensi**. Keputusan ini
diambil karena permintaan bersifat presentasional, seluruh input surat lain sudah ephemeral, dan
penyimpanan akan memerlukan migrasi kolom baru untuk data PII alamat tanpa kebutuhan yang
terverifikasi (requirements OQ-001, BR-001). Bila klien kemudian menghendaki alamat tambahan
tersimpan dan tercetak ulang pada kunjungan yang sama, perubahan tersebut harus melalui Change
Request lanjutan dengan migrasi baru dan peninjauan RLS.

## 6. Database Changes

- Migration required: No
- Create or modify: Tidak ada perubahan skema.
- Backfill: Tidak ada.
- Destructive operation: No
- Rollback / roll-forward: Tidak berlaku (tidak ada perubahan data).
- Authorization or RLS impact: Tidak ada. Tidak ada tabel baru dan tidak ada policy baru.
- Index/query implementation: Tidak ada query baru.

## 7. API / Integration Contract

Tidak ada dampak API atau integrasi. Komponen tidak memanggil Supabase dan tidak memanggil
layanan luar. Bagian ini tidak berlaku untuk fitur ini.

## 8. State Management

State owner: `SuratSakitModal` (state lokal komponen React, tanpa library state eksternal).

```text
initial -> kosong -> terisi -> dicetak
             ^          |
             |__________|  (dibuka ulang: kembali ke kosong)
```

- Side effects must not be triggered from render methods.
- Concurrent requests use: tidak berlaku (tanpa permintaan jaringan).
- Retry behavior implements: tidak berlaku.
- Cache interaction implements: tidak berlaku.
- Local/remote source-of-truth rule: alamat terdaftar berasal dari props `patient`; alamat tambahan
  sepenuhnya lokal dan tidak pernah menjadi sumber kebenaran yang dipersistensi.

## 9. UI and UX Behavior

- Loading: tidak berlaku, tidak ada pemuatan data baru.
- Empty: bila alamat tambahan kosong, surat mencetak hanya alamat terdaftar tanpa baris kosong.
- Success: alamat tambahan tampil di pratinjau dan pada hasil cetak dengan isi identik.
- Validation error: pembatasan 120 karakter menghentikan input tanpa kesalahan keras; isi hanya
  spasi diperlakukan sebagai kosong.
- Server error: tidak berlaku (tanpa server call).
- Permission denied: mengikuti pengamanan rute rekam medis F-008; tidak ada kontrol baru.
- Degraded/offline state: surat tetap dapat dibuat dan dicetak karena seluruhnya di sisi klien.
- Accessibility: field memakai `label` yang terhubung, dapat dioperasikan dengan keyboard, dan
  menampilkan indikator fokus (`focus-visible:ring`). Kontras memenuhi WCAG AA.
- Responsive or device constraints: panel pengaturan memakai grid responsif (satu kolom pada
  mobile, membesar pada tablet/desktop) dengan target sentuh minimal 44 x 44 px dan tanpa gulir
  horizontal tingkat halaman. Badan surat tetap mengikuti lebar A5.

## 10. Error Handling and Observability Implementation

Architecture source: `AGENTS.md` Bagian 6 (Error Handling) dan Bagian 10 (Security Rules).

| Failure | Detection | User behavior | Logging / metric / trace |
|---|---|---|---|
| Input melampaui 120 karakter | Batas pada atribut/penanganan input | Input berhenti pada batas, tanpa kesalahan keras | Tidak ada log |
| Isi hanya spasi | Pemeriksaan trim sebelum render | Diperlakukan sebagai kosong | Tidak ada log |
| Dialog cetak dibatalkan | `window.print()` kembali | Modal dan isi tetap utuh, dapat dicetak ulang | Tidak ada log |

Sensitive data that must not be logged:

- Isi alamat tambahan.
- NIK KTP, nomor BPJS, dan diagnosis pasien.

Concrete instrumentation changes:

- Tidak ada penambahan logging atau metrik. Alamat tambahan tidak boleh dikirim ke telemetry.

## 11. Security Implementation

Architecture source: `AGENTS.md` Bagian 10 (Security Rules).

- Authentication integration: tidak berubah, mengikuti sesi Supabase yang sudah ada.
- Authorization enforcement point: pengamanan rute rekam medis F-008; tidak ada titik baru.
- Data isolation / RLS / policy: tidak ada perubahan karena tidak ada penyimpanan.
- Input validation implementation: validasi di tingkat komponen (trim, batas 120 karakter,
  render sebagai teks biasa).
- Sensitive-data handling: alamat tambahan diperlakukan sebagai data sensitif; hanya dirender di
  pratinjau dan hasil cetak, tidak dicatat, tidak dikirim ke luar.
- Rate-limit / abuse control implementation: tidak berlaku.
- File/media validation: tidak berlaku.

## 12. Testing Strategy

### Unit

- Normalisasi alamat tambahan: trim, batas 120 karakter, isi spasi dianggap kosong.
- Aturan transisi state `kosong` ke `terisi` dan sebaliknya.

### Integration / contract

- Tidak ada perubahan kontrak data; verifikasi bahwa tidak ada panggilan tulis ke Supabase dari
  komponen surat.

### Architecture-sensitive tests

- AUTHZ: memastikan modal tidak menjadi jalur akses baru yang melewati pengamanan F-008.
- FAILURE_HANDLING: pembatalan dialog cetak tidak merusak state modal.

### UI

- Field alamat tambahan tampil dan dapat diketik; label terhubung dan fokus terlihat.
- Baris alamat bertingkat muncul hanya ketika alamat tambahan terisi.
- Panel pengaturan tetap rapi pada 360 px, 768 px, dan 1024 px ke atas.

### Manual / runtime

- Flow kritis di lingkungan pengembangan: buka rekam medis, buka surat, isi alamat tambahan,
  periksa pratinjau, cetak, lalu pastikan cetakan identik dengan pratinjau.

## 13. Rollout and Rollback

- Feature flag: No
- Rollout steps: rilis bersama perubahan rekam medis biasa; tidak ada langkah data.
- Rollback / roll-forward steps: pemulihan dilakukan dengan mengembalikan komponen ke versi
  sebelumnya. Karena tidak ada perubahan data, rollback tidak memengaruhi data apa pun.
- Data compatibility after rollback: tidak ada dampak data.
- Operational signals to watch: tidak ada sinyal operasional khusus.

## 14. Local Implementation Alternatives

### Alternative A - State lokal modal (ephemeral), tidak dipersistensi

Alamat tambahan disimpan sebagai state `string` di `SuratSakitModal` dan langsung dipakai pada
baris alamat surat.

Advantages:

- Perubahan minimal dan terlokalisasi pada satu komponen.
- Tidak ada migrasi, tidak ada perubahan RLS, tidak ada penyimpanan PII alamat.
- Konsisten dengan input surat lain yang sudah ephemeral.

Disadvantages:

- Alamat tambahan tidak dapat dipanggil ulang pada kunjungan yang sama setelah modal ditutup.

Selected / rejected because: dipilih. Permintaan bersifat presentasional, dan penyimpanan tidak
diminta maupun diverifikasi (requirements BR-001, OQ-001).

### Alternative B - Persistensi alamat tambahan ke `visits`

Menambah kolom (misalnya `surat_sakit_alamat_tambahan`) pada `visits` dan menuliskan nilainya saat
mencetak, lalu memprefill pada kunjungan berikutnya.

Advantages:

- Alamat tambahan dapat dipanggil ulang dan diaudit per kunjungan.

Disadvantages:

- Memerlukan migrasi baru, peninjauan RLS, dan kebijakan retensi untuk PII alamat.
- Memerlukan keputusan produk dan persetujuan perubahan data yang belum ada.
- Memperkenalkan penyimpanan data sensitif yang saat ini tidak diminta klien.

Selected / rejected because: ditolak untuk slice ini. Melampaui lingkup permintaan dan Aturan
Kontrol MVP. Dicatat sebagai opsi Post-MVP pada requirements OQ-001.

## 15. Architecture / ADR Impact Check

- System architecture still valid: Yes
- Architecture update required: No
- Global architecture impact: Tidak ada perubahan. Fitur mematuhi aturan arsitektur permanen dan
  tanggung jawab direktori `AGENTS.md`.
- ADR required: No
- Related ADR: none

## 16. Approval

- Technical owner: Developer
- Status: DRAFT
- Approved date: Pending
- Conditions: None
