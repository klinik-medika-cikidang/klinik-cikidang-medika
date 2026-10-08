---
id: F-011-REQ
feature: F-011
title: "Requirements: Hak Akses dan Alur Kategorisasi Program"
status: draft
owner: "Developer"
last_updated: "2026-10-08"
last_verified_commit: unverified
related:
  - "design.md"
  - "tasks.md"
  - "../F-008-rm-rbac-kesehatan-piutang/requirements.md"
  - "../F-006-program-khusus/requirements.md"
  - "../../architecture/overview.md"
---

# Requirements: F-011 Hak Akses dan Alur Kategorisasi Program

## 1. Ringkasan Eksekutif

Notulensi revisi aplikasi klinik (2026-10-08) meminta tiga perubahan yang saling terkait:

1. **Hak akses.** Peran Dokter/Admin perlu dapat menyelesaikan seluruh alur operasional harian
   (pendaftaran, pemeriksaan, tindakan/terapi, pelunasan, pendapatan tambahan/lain, dan pencatatan
   pengeluaran medis/non medis) tetapi TIDAK boleh melihat dashboard dan pemantauan biaya. Peran
   Owner tetap melihat seluruh menu, data, transaksi, laporan, dan aktivitas.
2. **Urutan kategorisasi.** Kategorisasi program kesehatan dan agenda pos rawat (observasi) dipindah
   menjadi langkah TERAKHIR, karena dokter baru tahu setelah pemeriksaan. Pasien didaftarkan dulu,
   dianamnesis dan didiagnosis, diterapi atau ditindak, baru admin mengategorikan.
3. **Definisi dan penamaan.** Triple Eliminasi didefinisikan sebagai ANC ditambah pemeriksaan lab
   HIV, HBsAg, dan Sipilis. Label "Pemantauan Pos Rawat" diganti menjadi "Observasi". Pasien tanpa
   program khusus tetap punya kategori default.

## 2. Konteks Masalah

### 2.1 Hak akses saat ini

`src/lib/auth/AuthContext.tsx` (`ROLE_PERMISSIONS`):

| Peran | Rute yang diizinkan |
|---|---|
| `owner` | `/`, `/pendaftaran`, `/rekam-medis`, `/program-khusus`, `/buku-kas`, `/laporan` |
| `dokter_admin` | `/rekam-medis`, `/program-khusus`, `/laporan` |

Dokter/Admin saat ini tidak dapat membuka pendaftaran maupun buku kas, padahal notulensi meminta akses
sampai pelunasan dan pencatatan pengeluaran.

### 2.2 Alur kategorisasi saat ini

Kategori program dipilih saat pendaftaran, sebelum pemeriksaan. Notulensi meminta kategorisasi
dipindah ke akhir alur.

### 2.3 Hasil yang diharapkan

- Dokter/Admin dapat bekerja dari pendaftaran sampai pelunasan dan pencatatan pengeluaran, tanpa
  akses ke dashboard atau pemantauan biaya.
- Owner tidak kehilangan akses apa pun.
- Kategorisasi program dan observasi terjadi setelah tindakan, dengan kategori default untuk pasien
  tanpa program.

## 3. Goals & Non-Goals

### Goals

- **G-001**: Matriks hak akses baru diterapkan konsisten di navigasi dan penjagaan rute.
- **G-002**: Dokter/Admin dapat menyelesaikan alur operasional harian sampai pelunasan.
- **G-003**: Dashboard dan pemantauan biaya hanya untuk Owner.
- **G-004**: Kategorisasi program dan observasi menjadi langkah terakhir pada alur kunjungan.
- **G-005**: Setiap pasien selalu punya kategori, minimal kategori default "Umum".
- **G-006**: Definisi Triple Eliminasi dan label Observasi seragam di seluruh aplikasi.

### Non-Goals

- **NG-001**: Menambah peran baru di luar `owner` dan `dokter_admin`.
- **NG-002**: Mengubah mekanisme autentikasi Supabase Auth.
- **NG-003**: Mengubah skema tabel program yang sudah ada kecuali yang disebut design.
- **NG-004**: Membangun engine izin tingkat kolom.

## 4. Aktor

### ACTOR-001 Owner

Melihat dan mengelola seluruh menu, data, transaksi, laporan, aktivitas, dan dashboard.

### ACTOR-002 Dokter/Admin

Menjalankan alur operasional harian dan kategorisasi program, tanpa dashboard dan pemantauan biaya.

## 5. Preconditions

- PRE-001: Peran pengguna berasal dari metadata Supabase Auth (`owner`, `dokter_admin`, termasuk
  pemetaan warisan `dokter` dan `kasir` ke `dokter_admin`).
- PRE-002: Tabel program khusus (`public_health_records`) dan kolom `MONITOR` sudah ada.

## 6. Functional Requirements

### FR-001 Alur operasional Dokter/Admin

Dokter/Admin HARUS dapat menyelesaikan alur dari pemilihan pasien sampai pelunasan dan pencatatan
pendapatan serta pengeluaran.

- **AC-001.1**: KETIKA Dokter/Admin membuka pendaftaran, MAKA halaman tersedia dan dapat membuat
  kunjungan pasien.
- **AC-001.2**: KETIKA Dokter/Admin menyelesaikan tindakan/terapi, MAKA ia dapat menandai
  pembayaran lunas.
- **AC-001.3**: KETIKA Dokter/Admin menambah pendapatan tambahan atau pendapatan lain, MAKA nilai
  tersebut tersimpan pada kunjungan.
- **AC-001.4**: KETIKA Dokter/Admin mencatat pengeluaran medis atau non medis, MAKA catatan tersimpan
  di buku kas.

### FR-002 Batas akses Dokter/Admin

Dokter/Admin TIDAK BOLEH mengakses dashboard dan pemantauan biaya, pemasukan, atau pengeluaran.

- **AC-002.1**: KETIKA Dokter/Admin membuka rute dashboard, MAKA akses ditolak dan diarahkan ke
  halaman default perannya.
- **AC-002.2**: KETIKA Dokter/Admin membuka laporan, MAKA tab keuangan atau pemantauan biaya tidak
  tampil dan tidak dapat diakses langsung.
- **AC-002.3**: KETIKA Dokter/Admin mencoba rute terlarang lewat URL, MAKA penjagaan rute menolak.

### FR-003 Akses penuh Owner

Owner HARUS dapat mengakses seluruh menu, data, transaksi, laporan, aktivitas, dan dashboard.

- **AC-003.1**: KETIKA Owner membuka rute mana pun yang terdaftar, MAKA halaman tersedia.
- **AC-003.2**: KETIKA ada rute atau tab baru, MAKA Owner otomatis memilikinya.

### FR-004 Kategorisasi pada langkah akhir

Sistem HARUS memindahkan pemilihan kategori program dan observasi ke langkah terakhir alur
kunjungan, setelah anamnesis, diagnosis, dan tindakan.

- **AC-004.1**: KETIKA pendaftaran dibuat, MAKA kategori program TIDAK wajib diisi.
- **AC-004.2**: KETIKA dokter selesai mencatat diagnosis dan tindakan, MAKA tersedia aksi
  mengategorikan pasien.
- **AC-004.3**: KETIKA admin mengategorikan tanpa memilih program, MAKA pasien memakai kategori
  default "Umum".

### FR-005 Kategori selalu terisi

Setiap kunjungan HARUS memiliki kategori, dengan default "Umum" bila bukan program khusus.

- **AC-005.1**: KETIKA pasien dengan keluhan umum (contoh: batuk pilek) selesai diperiksa, MAKA
  kunjungan tersebut berkategori "Umum" dan tetap tampil di daftar tanpa program.
- **AC-005.2**: KETIKA filter kategori "Umum" dipakai, MAKA kunjungan tanpa program khusus muncul.

### FR-006 Definisi Triple Eliminasi

Sistem HARUS memperlakukan Triple Eliminasi sebagai ANC ditambah pemeriksaan lab HIV, HBsAg, dan
Sipilis.

- **AC-006.1**: KETIKA kunjungan ditandai Triple Eliminasi, MAKA tersedia isian ANC, HIV, HBsAg, dan
  Sipilis.
- **AC-006.2**: KETIKA salah satu pemeriksaan lab kosong, MAKA status kelengkapan Triple Eliminasi
  menandai yang belum diisi, bukan menebak hasil.

### FR-007 Penamaan Observasi

Sistem HARUS memakai label "Observasi" untuk menggantikan "Pemantauan Pos Rawat".

- **AC-007.1**: KETIKA menu atau judul dirender, MAKA tidak lagi menampilkan "Pemantauan Pos Rawat".
- **AC-007.2**: KETIKA admin membuka Observasi, MAKA tampil daftar pasien yang diobservasi.

### FR-008 Observasi sebagai opsi terakhir

Sistem HARUS menyediakan agenda pos rawat (Observasi) sebagai opsi terakhir pada langkah
kategorisasi, bukan saat pendaftaran.

- **AC-008.1**: KETIKA pendaftaran dibuat, MAKA agenda observasi tidak ditanyakan.
- **AC-008.2**: KETIKA admin mengategorikan, MAKA agenda observasi tersedia sebagai pilihan terakhir.

## 7. Business Rules

### BR-001 Matriks hak akses

| Kemampuan | Owner | Dokter/Admin |
|---|---|---|
| Dashboard (`/`) | Ya | Tidak |
| Pendaftaran (`/pendaftaran`) | Ya | Ya |
| Rekam medis (`/rekam-medis`) | Ya | Ya |
| Program khusus (`/program-khusus`) | Ya | Ya |
| Buku kas (`/buku-kas`) | Ya | Ya (hanya transaksi, tanpa pemantauan) |
| Laporan (`/laporan`) | Ya | Ya (tanpa tab keuangan/pemantauan) |
| Kategorisasi program | Ya | Ya |

- **BR-002**: "Pemantauan biaya" meliputi ringkasan pemasukan, pengeluaran, dan margin. Bagian ini
  owner-only, baik sebagai tab maupun kartu ringkasan.
- **BR-003**: Setiap perubahan matriks diuji di dua peran; menyembunyikan menu bukan pengaman, rute
  tetap dijaga.
- **BR-004**: Kategori default "Umum" dipakai ketika tidak ada program khusus.

## 8. Validation Rules

| ID | Input | Aturan | Perilaku error |
|---|---|---|---|
| VAL-001 | Kategori program | Opsional saat daftar, wajib punya nilai akhir | Default "Umum" |
| VAL-002 | Agenda observasi | Dipilih di langkah akhir | Tidak diminta saat daftar |

## 9. States and Transitions

| State | Arti | Transisi |
|---|---|---|
| `TERDAFTAR` | Pasien sudah didaftarkan | `DIPERIKSA` |
| `DIPERIKSA` | Anamnesis dan diagnosis selesai | `DITINDAK` |
| `DITINDAK` | Terapi atau tindakan dicatat | `DIKATEGORIKAN` |
| `DIKATEGORIKAN` | Kategori program dan observasi ditetapkan | `LUNAS` |
| `LUNAS` | Pembayaran selesai | akhir |

## 10. Error dan Keadaan Kosong

- **ERR-001**: KETIKA peran tidak berhak membuka rute, MAKA tampilkan pesan Bahasa Indonesia dan
  arahkan ke halaman default peran.
- **ERR-002**: KETIKA daftar observasi kosong, MAKA tampilkan pesan dan aksi untuk mendaftarkan.
- **ERR-003**: KETIKA kategori gagal disimpan, MAKA tampilkan error dan jangan tandai sukses.

## 11. Non-Functional Requirements

- **NFR-SEC-001**: Penjagaan akses ditegakkan di komponen penjaga rute, bukan hanya menyembunyikan
  menu.
- **NFR-A11Y-001**: Semua kontrol baru dapat dioperasikan dengan keyboard dan punya indikator fokus.
- **NFR-UI-001**: Responsif pada 360px, 768px, dan 1024px+; target sentuh minimal 44x44px.
- **NFR-COPY-001**: Semua teks Bahasa Indonesia; dilarang memakai em dash.

## 12. Dependencies

- **DEP-001**: `src/lib/auth/AuthContext.tsx` (`ROLE_PERMISSIONS`, `ROLE_DEFAULT_ROUTES`).
- **DEP-002**: `src/app/laporan/page.tsx` (gating tab), `src/app/buku-kas/page.tsx`.
- **DEP-003**: `src/components/rekam-medis/` dan `src/components/pendaftaran/`.
- **DEP-004**: `src/constants/clinic.ts` (label dan kode program).

## 13. Asumsi

- **ASM-001**: Peran tetap dua (`owner`, `dokter_admin`).
- **ASM-002**: Kebutuhan kategori default "Umum" dapat ditambahkan tanpa mengubah tabel program.
- **ASM-003**: Notulensi ini disetujui klien sebagai perubahan resmi sebelum implementasi.

## 14. Open Questions

| ID | Pertanyaan | Pemilik | Blocking? | Resolusi |
|---|---|---|---|---|
| OQ-001 | Untuk buku kas, apa persis batas "transaksi" versus "pemantauan" bagi Dokter/Admin? | Klinik | Yes | Pending |
| OQ-002 | Apakah kategori default cukup "Umum", atau perlu daftar kategori non-program lain? | Klinik | No | Pending |
| OQ-003 | Apakah label "Observasi" menggantikan juga istilah di laporan Puskesmas? | Klinik | No | Pending |

## 15. Approval

- Product owner: dr. Ovan / dr. Neneng (via perantara)
- Status: DRAFT
- Approved date: Pending
- Notes: Menunggu OQ-001 sebelum implementasi.
