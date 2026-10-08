---
id: F-011-DESIGN
feature: F-011
title: "Design: Hak Akses dan Alur Kategorisasi Program"
status: draft
owner: "Developer / Klinik Cikidang Medika"
last_updated: "2026-10-08"
last_verified_commit: unverified
related:
  - "requirements.md"
  - "tasks.md"
  - "../../architecture/overview.md"
---

# Design: F-011 Hak Akses dan Alur Kategorisasi Program

## 1. Ringkasan Desain

F-011 mengubah tiga hal yang tidak saling bergantung erat tetapi dikerjakan bersama karena berasal
dari satu notulensi:

1. **Izin.** `ROLE_PERMISSIONS` menjadi matriks baru; Dokter/Admin mendapat `/pendaftaran` dan
   `/buku-kas`; dashboard tetap owner-only. Penjagaan rute tetap di komponen penjaga, bukan hanya
   menyembunyikan menu.
2. **Alur.** Langkah kategorisasi dipindah ke akhir alur rekam medis, dengan kategori default
   `UMUM`.
3. **Bahasa domain.** Triple Eliminasi didefinisikan ulang, dan label Observasi menggantikan
   Pemantauan Pos Rawat, terpusat di `src/constants/clinic.ts`.

## 2. Konteks yang Ada

- `src/lib/auth/AuthContext.tsx`: `ROLE_PERMISSIONS`, `ROLE_DEFAULT_ROUTES`, `ROLE_LABELS`, dan
  pemetaan peran warisan (`dokter`, `kasir`) ke `dokter_admin`.
- `src/app/laporan/page.tsx`: sudah memakai `role === 'dokter_admin'` untuk menyembunyikan tab
  keuangan. Pola ini diperluas, bukan diciptakan ulang.
- `src/app/buku-kas/page.tsx`: buku kas saat ini owner-only.
- `src/components/pendaftaran/`: pendaftaran pasien dan kasir.
- `src/components/rekam-medis/`: `ExaminationForm.tsx` dan modal terkait.
- `src/constants/clinic.ts`: `DESA_OPTIONS`, `DESA_RM_CODE`, label program.
- `MONITOR_TO_PROGRAM` di `scripts/lib/clinic-csv.mjs` dan pemetaan `program_type` di
  `public_health_records`.

Pola yang dipertahankan: primitif `src/components/ui/`, uang `NUMERIC(15,2)`, error Bahasa Indonesia,
`revalidatePath()` setelah mutasi, tanpa pustaka state eksternal.

## 3. Perubahan Komponen

| Komponen atau jalur | Perubahan | Tanggung jawab |
|---|---|---|
| `src/lib/auth/AuthContext.tsx` | Ubah | Matriks izin baru, rute default Dokter/Admin |
| `src/components/auth/RouteGuard.tsx` (atau padanan) | Ubah | Menolak rute terlarang dan mengarahkan |
| `src/app/laporan/page.tsx` | Ubah | Gating tab pemantauan biaya untuk Dokter/Admin |
| `src/app/buku-kas/page.tsx` | Ubah | Mode transaksi untuk Dokter/Admin, pemantauan owner-only |
| `src/components/pendaftaran/*` | Ubah | Kategori tidak lagi wajib saat pendaftaran |
| `src/components/rekam-medis/ExaminationForm.tsx` | Ubah | Aksi kategorisasi di akhir alur |
| `src/components/program-khusus/KategoriProgramPanel.tsx` | Buat | Panel kategori program dan observasi |
| `src/constants/clinic.ts` | Ubah | Label Observasi, definisi Triple Eliminasi, daftar kategori |
| `supabase/migrations/<ts>_f011_visit_category.sql` | Buat | Kolom `visits.kategori_program` |
| `src/types/database.ts` | Ubah | Tambah `kategori_program` |

## 4. Alur Kategorisasi

```text
SEBELUM
  daftar (pilih program) -> periksa -> tindakan -> bayar

SESUDAH
  daftar (tanpa program) -> anamnesis + diagnosis -> terapi/tindakan
      -> kategorisasi (program kesehatan, agenda observasi) -> lunas
```

Kategorisasi menulis `visits.kategori_program`. Bila admin tidak memilih program, nilainya
`UMUM`. Register kesehatan (`public_health_records`) tetap dibangun hanya ketika program dipilih.

## 5. Model Data

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `visits.kategori_program` | `VARCHAR(30)` | Tidak | `UMUM`, `ANC`, `PTM`, `KB`, `ELIMINASI_3`; default `UMUM` |

Catatan: `public_health_records` tetap menjadi sumber register program. `kategori_program` adalah
ringkasan tingkat kunjungan untuk tampilan dan filter, bukan pengganti register.

Invariant:

- **INV-001**: Setiap kunjungan punya `kategori_program` bernilai salah satu dari lima nilai.
- **INV-002**: `kategori_program = ELIMINASI_3` hanya bila ANC dan pemeriksaan HIV, HBsAg, Sipilis
  tersedia (boleh bertahap, ditandai belum lengkap).
- **INV-003**: Menyembunyikan menu tidak menggantikan penjagaan rute.

## 6. Definisi Triple Eliminasi

Triple Eliminasi adalah ANC ditambah pemeriksaan lab HIV, HBsAg, dan Sipilis. Field lab sudah ada di
`public_health_records` (`hiv`, `hbsag`, `syphilis`). Status kelengkapan dihitung dari tiga lab itu;
yang kosong ditandai, tidak ditebak.

## 7. Penanganan Error

- Rute terlarang: pesan Bahasa Indonesia dan arahkan ke `/rekam-medis` untuk Dokter/Admin.
- Gagal simpan kategori: tampilkan error, jangan tandai sukses.
- Daftar observasi kosong: tampilkan keadaan kosong dengan aksi.

## 8. Pengujian

- **Unit**: fungsi izin `canAccess(role, path)` untuk seluruh matriks.
- **Integrasi**: login tiap peran dan buka setiap rute, pastikan hasil sesuai matriks.
- **Alur**: daftar tanpa kategori, periksa, kategorikan, lunas.
- **Non-regresi**: Owner tetap punya seluruh akses (INV-003).
- **UI**: keyboard dan fokus terlihat; responsif 360px, 768px, 1024px+.

## 9. Rollout dan Rollback

- Rollout bertahap: matriks izin, lalu alur kategorisasi, lalu label.
- Rollback: kembalikan `ROLE_PERMISSIONS` dan sembunyikan panel kategorisasi bila belum siap.
- Migrasi kolom bersifat aditif (aman), tidak menghapus data.

## 10. Alternatif yang Dipertimbangkan

- **A. Izin di RLS database.** Lebih kuat, tetapi peran saat ini ditegakkan di aplikasi (lihat
  F-008). Ditunda sampai ada kebutuhan nyata.
- **B. Kategori tanpa kolom baru** (menurunkan dari register program). Ditolak karena kunjungan tanpa
  program tidak dapat difilter.
- **C. Pisahkan buku kas menjadi dua aplikasi.** Berlebihan untuk kebutuhan saat ini.

## 11. Pemeriksaan Dampak Arsitektur / ADR

- Tidak menambah dependensi.
- Mengubah izin tampilan dan menambah satu kolom aditif.
- Definisi ulang istilah domain (Triple Eliminasi, Observasi) dicatat sebagai kamus domain.
