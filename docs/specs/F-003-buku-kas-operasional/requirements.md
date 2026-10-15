---
id: F-003-REQ
feature: F-003
title: "Requirements: Buku Kas Operasional & Kapitasi BPJS"
status: approved
owner: "dr. Ovan / Developer"
last_updated: "2026-09-19"
last_verified_commit: unverified
related:
  - "design.md"
  - "tasks.md"
  - "docs/product/prd.md"
---

# Requirements: F-003 Buku Kas Operasional & Kapitasi BPJS

## 1. Executive Summary

Modul **Buku Kas Operasional & Kapitasi BPJS** (`/buku-kas`) adalah pusat pencatatan arus kas (cash flow) masuk dan keluar bagi operasional Klinik Pratama Cikidang Medika. Modul ini menghubungkan penerimaan dana kapitasi bulanan dari BPJS Kesehatan (~Rp 28.000.000/bulan), pencatatan setoran tunai loket kasir ke bank, serta seluruh pengeluaran operasional (pembelian obat/alkes, konsumsi harian dokter, listrik, dan operasional non-klinik). Sistem menyediakan kartu rekapitulasi saldo berjalan, riwayat 1.486+ transaksi mutasi kas, dan filter periode bulanan.

---

## 2. Actors & Permissions

- **ACTOR-001: Pimpinan / Pemilik Klinik (`owner`)**: Memiliki wewenang penuh mencatat pencairan dana kapitasi BPJS, memantau total saldo kas fisik klinik, menyetujui pengeluaran obat partai besar, dan memverifikasi setoran tunai ke rekening bank pemilik.
- **ACTOR-002: Kasir / Staf Loket (`kasir`)**: Mencatat pengeluaran kas kecil operasional (konsumsi dokter, ATK, BHP darurat) dan mencatat rekapitulasi setoran uang tunai kasir akhir hari (`Setor Tunai`).

---

## 3. Goals & Non-Goals

### Goals
- **G-001**: Pencatatan transaksi mutasi kas (Masuk/Keluar) dapat diselesaikan dalam tempo < 15 detik menggunakan modal form terpadu dengan formatting nominal Rupiah otomatis.
- **G-002**: Menampilkan 4 kartu ringkasan KPI kas bulanan secara *real-time*: Total Kas Masuk, Total Kas Keluar, Saldo Bersih Bulanan, dan Akumulasi Setor Tunai.
- **G-003**: Menyajikan tabel mutasi kas yang dapat difilter berdasarkan bulan/tahun, jenis transaksi (`Masuk` vs `Keluar`), dan pencarian teks keterangan.
- **G-004**: Membantu rekonsiliasi antara total penerimaan tunai pasien umum di loket (`public.visits`) dengan transaksi kas keluar `"Setor Tunai"` ke bank.

### Non-Goals
- **NG-001**: Integrasi otomatis perbankan via Open Banking API / BI-Fast (pencatatan setoran transfer bersifat manual internal klinik).
- **NG-002**: Pembuatan jurnal akuntansi ganda berstandar PSAK (SIM klinik menggunakan model *single-entry cash flow* yang praktis sesuai kebutuhan UMKM klinik pratama).

---

## 4. Functional Requirements (EARS & RFC 2119)

### FR-001: Input Transaksi Kas Masuk (Pemasukan)
Sistem HARUS menyediakan formulir untuk mencatat transaksi penerimaan kas.

- **AC-001.1**: WHEN pengguna menekan tombol *"+ Kas Masuk"*, THEN sistem HARUS menampilkan modal form kas masuk dengan pilihan kategori:
  1. `Kapitasi BPJS` (Pencairan dana kapitasi bulanan BPJS Kesehatan)
  2. `Setor Tunai` (Penerimaan setoran uang tunai kasir loket)
  3. `Pendapatan Lain` (Pendapatan non-pasien seperti parkir/sewa)
  4. `Rujukan USG / Lab` (Bagi hasil rujukan pemeriksaan penunjang luar)
- **AC-001.2**: Sistem HARUS memvalidasi bahwa kolom `tanggal`, `kategori`, dan `nominal` (bernilai > 0) wajib diisi sebelum data dapat disimpan.
- **AC-001.3**: WHEN form disimpan, THEN sistem HARUS menyimpan baris baru ke tabel `public.cash_flows` dengan `jenis = 'Masuk'`, memperbarui tabel mutasi, dan memicu notifikasi sukses.

### FR-002: Input Transaksi Kas Keluar (Pengeluaran)
Sistem HARUS menyediakan formulir untuk mencatat transaksi pengeluaran kas.

- **AC-002.1**: WHEN pengguna menekan tombol *"+ Kas Keluar"*, THEN sistem HARUS menampilkan modal form kas keluar dengan pilihan kategori:
  1. `Pengeluaran Obat / Operasional` (Belanja obat, reagen lab, BHP medis)
  2. `Pengeluaran Non Klinik` (Makan siang/malam dokter jaga, konsumsi staf, kebersihan)
  3. `Operasional & Listrik/Air` (Tagihan listrik PLN, WiFi IndiHome, air PDAM)
  4. `Honor & Transport` (Transport dokter tamu, honor lembur staf)
  5. `Setor ke Rekening Pemilik` (Transfer penarikan profit/dana ke dr. Ovan)
- **AC-002.2**: Sistem HARUS memvalidasi bahwa `nominal` bernilai positif (> 0) dan kolom `keterangan` diisi penjelasan singkat peruntukan dana.
- **AC-002.3**: WHEN form disimpan, THEN sistem HARUS menyimpan baris baru ke tabel `public.cash_flows` dengan `jenis = 'Keluar'`.
- **AC-002.4**: WHEN kategori adalah pengeluaran operasional (bukan setoran), THEN form HARUS menampilkan pilihan **Dibayar dari**: `Tunai dari Laci` (default) atau `Transfer`, disimpan di `cash_flows.jenis_pembayaran` (`'Tunai'` / `'TF'`, migrasi `20261015_f003_cash_flow_payment_method.sql`). Setoran dan kas masuk selalu `'Tunai'`. Baris lama tanpa nilai dianggap `'Tunai'`. (Permintaan klien, 15 Okt 2026.)

### FR-003: Kartu Ringkasan Keuangan Bulanan (KPI Cash Flow)
Sistem HARUS menampilkan ringkasan metrik keuangan sesuai periode bulan yang dipilih.

- **AC-003.1**: Sistem HARUS menghitung secara otomatis:
  1. **Total Penerimaan Tunai & Kas Masuk**: Akumulasi penerimaan tunai pasien loket beserta mutasi `jenis = 'Masuk'` non-setoran (seperti `Kapitasi BPJS` dan `Pendapatan Lain`) pada bulan bersangkutan.
  2. **Total Pengeluaran Operasional**: Jumlah seluruh nominal dengan `jenis = 'Keluar'` yang merupakan beban operasional/obat (TIDAK termasuk kategori `Setor ke Rekening Pemilik`).
  3. **Selisih Kas Bulan Ini**: `Total Penerimaan Kas Masuk - Total Pengeluaran Operasional`. Pembayaran transfer pasien tidak termasuk, sehingga nama kartu sengaja dibedakan dari "Saldo Kas Bersih" di Dashboard yang memasukkan transfer.
  4. **Total Setor Tunai & Pemilik**: Akumulasi mutasi dengan `kategori = 'Setor Tunai'` maupun `kategori = 'Setor ke Rekening Pemilik'`.
- **AC-003.2**: Angka moneter HARUS disajikan dengan prefiks `Rp` dan pemisah ribuan titik standar Indonesia (misal: `Rp 28.203.000`). Seluruh data transaksi di database tersimpan dalam Rupiah penuh (1:1) pasca migrasi backfill 2026-10-13 (ADR-004), menghilangkan ketergantungan pada normalisasi runtime frontend.

### FR-004: Tabel Riwayat Mutasi Kas & Filter Periode
Sistem HARUS menyajikan daftar mutasi buku kas terurut dari transaksi terbaru.

- **AC-004.1**: Sistem HARUS menyediakan filter pemilih Bulan & Tahun (default: bulan berjalan).
- **AC-004.2**: Sistem HARUS menyediakan filter tab jenis transaksi: `Semua Mutasi`, `Hanya Pemasukan`, dan `Hanya Pengeluaran`.
- **AC-004.3**: Sistem HARUS menyediakan kotak pencarian instan untuk menyaring keterangan atau kategori transaksi.
- **AC-004.4**: Setiap baris mutasi HARUS menampilkan: Tanggal, Badge Kategori, Keterangan Transaksi, dan Nominal (warna hijau `+` untuk masuk, warna biru/teal untuk setoran pemilik/bank, warna merah `-` untuk pengeluaran operasional).

### FR-005: Rekonsiliasi Fisik Laci Kasir (Bulanan & Harian)
Sistem HARUS menyediakan ringkasan rekonsiliasi fisik uang di laci kasir.

- **AC-005.1**: Sistem HARUS menghitung **Sisa Fisik di Laci Kasir** dengan rumus:
  `Uang Tunai Masuk Laci (Pasien Tunai) - Pengeluaran Tunai dari Laci (Operasional) - Disetor ke Pemilik/Bank (Setor Tunai & Setor ke Rekening Pemilik)`.
  Pengeluaran operasional dengan `jenis_pembayaran = 'TF'` TIDAK mengurangi laci, tetapi tetap dihitung dalam Total Pengeluaran Operasional (AC-003.1) dan mengurangi saldo bank pada estimasi Dashboard.
- **AC-005.2**: Sistem HARUS menyediakan pemilih mode rekonsiliasi antara **Akumulasi Bulan Ini** dan **Per Tanggal / Hari Ini**.
- **AC-005.3**: Sistem DILARANG menggunakan `Math.max(0, ...)` untuk menutupi selisih negatif pada laci kasir. Apabila setoran melebihi kas masuk tunai pada periode/hari tersebut (misal karena menyetor kas fisik akumulasi hari sebelumnya), sistem HARUS menampilkan nilai defisit secara transparan dengan badge merah peringatan dan penjelasan edukatif bahwa setoran mengambil uang kas fisik akumulasi hari sebelumnya.
- **AC-005.4**: Pemilihan tanggal pada mode harian HARUS dibatasi atribut `min` dan `max` agar terkunci pada rentang bulan dan tahun yang sedang aktif dipilih.

### FR-006: Pembatalan / Hapus Transaksi Mutasi
Sistem HARUS mengizinkan penghapusan transaksi jika terjadi kesalahan input kasir.

- **AC-006.1**: WHEN pengguna mengklik tombol hapus pada baris transaksi, THEN sistem HARUS memunculkan dialog konfirmasi pencegahan ketidaksengajaan.
- **AC-006.2**: WHEN dikonfirmasi, THEN record terkait di `public.cash_flows` dihapus dan kartu metrik langsung terhitung ulang.

---

## 5. Non-Functional Requirements

- **Accuracy**: Nilai nominal disimpan dengan presisi tinggi menggunakan tipe `NUMERIC(15,2)` tanpa toleransi pembulatan yang salah.
- **Mobile & Tablet Responsiveness**: Kartu metrik dan tabel mutasi kas harus responsif di smartphone staf kasir (360px+) dan tablet pemilik klinik tanpa *horizontal scroll* pada halaman utama.
- **Performance**: Pemuatan rekapitulasi bulanan < 150ms dengan memanfaatkan indeks database `idx_cash_flows_tanggal`.
