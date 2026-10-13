---
id: ADR-004
title: "Backfill Nominal Keuangan Historis ETL ke Format Rupiah Penuh (1:1) dan Rekonsiliasi Laci Kasir"
status: accepted
date: "2026-10-13"
deciders:
  - "Developer"
  - "Sehan (Auditor Independen)"
  - "dr. Ovan & dr. Neneng (Pemilik Klinik)"
related_features:
  - "F-001"
  - "F-003"
  - "F-004"
  - "F-005"
supersedes: null
superseded_by: null
---

# ADR-004: Backfill Nominal Keuangan Historis ETL ke Format Rupiah Penuh (1:1) dan Rekonsiliasi Laci Kasir

## Konteks

1. **Format Data Historis**: Data operasional klinik periode Januari 2024 sampai September 2026 hasil migrasi ETL dari Google Sheets menyimpan nominal dalam satuan ribuan (misal `150` = Rp 150.000, `2750` = Rp 2.750.000). Script ETL (`parseRupiah`) menyimpan angka mentah ke database tanpa perkalian 1.000.
2. **Regresi Commit 9f99dac**: Upaya penanganan nominal kecil (< 1.000) menurunkan ambang normalisasi `normalizeRupiah` di frontend dari `< 10000` menjadi `< 1000`. Akibatnya, 116 baris `cash_flows` dan 11 nilai `visits` lama di rentang 1.000–9.999 di database produksi ditampilkan 1.000x lebih kecil (misal Rp 2.750.000 tampil sebagai Rp 2.750), menyebabkan defisit tampilan agregat sebesar ~Rp 262,9 juta.
3. **Penyembunyian Defisit Laci Kasir**: Komponen `CashReconciliationCard` dan Dashboard menggunakan `Math.max(0, rawRemaining)` yang menutupi selisih negatif saat kasir menyetor uang fisik akumulasi hari sebelumnya, lalu menampilkan badge hijau keliru "Laci Seimbang (Rp 0)".
4. **Penyaringan Status Pembayaran**: Halaman Dashboard dan Laporan belum menyaring `status_pembayaran`, sehingga kunjungan berstatus Batal atau belum lunas berpotensi ikut terhitung sebagai pendapatan riil loket.

## Driver Keputusan

- Integritas data keuangan klinik: angka di database dan laporan harus mencerminkan nilai Rupiah riil tanpa ketergantungan pada normalisasi runtime di frontend.
- Transparansi rekonsiliasi kasir: kasir dan pemilik klinik harus melihat saldo riil laci kasir apa adanya, termasuk ketika terjadi setoran akumulatif lintas hari.
- Keamanan audit: migrasi database harus aman, idempoten melalui asersi jumlah baris tepat, dan memiliki cadangan penuh pada skema internal yang terisolasi dari akses publik.

## Opsi yang Dipertimbangkan

### Opsi A: Normalisasi Frontend Berdasarkan Tanggal (Cutoff Runtime)
Mempertahankan data database apa adanya dan mengubah fungsi normalisasi frontend agar mengalikan 1.000 untuk baris dengan `created_at <= cutoff`.

- *Kelemahan*: Menjadikan logika frontend rapuh, menambah overhead komputasi di setiap render, dan membuat database tetap tidak konsisten bagi query langsung atau reporting masa depan.

### Opsi B (Dipilih): One-Time Database Backfill ke Rupiah Penuh (1:1) + Penyempurnaan Frontend
Membuat backup snapshot ke skema terisolasi `backup_internal`, menjalankan migrasi SQL append-only dengan asersi baris ketat untuk mengalikan 1.000 seluruh baris ETL historis, dan menyederhanakan frontend menjadi 1:1.

- *Keunggulan*: Database menjadi satu-satunya sumber kebenaran yang bersih dan konsisten; frontend terbebas dari heuristik ambang batas; performa dan akurasi terjamin.

## Keputusan

1. **Backup Snapshot**: Membuat skema `backup_internal` di database produksi dan staging dengan hak akses dicabut dari `anon` dan `authenticated`. Menyimpan tabel `backup_internal.cash_flows_20261013` dan `backup_internal.visits_money_20261013`.
2. **Eksekusi Backfill**: Menjalankan migrasi `20261013_legacy_nominal_to_full_rupiah.sql` di produksi (cutoff `2026-10-10 10:00:00Z`, asersi: 1.624 baris `cash_flows`, 3.698 baris `biaya_periksa`, 147 baris `pendapatan_lain`) dan `20261013_staging_legacy_nominal_to_full_rupiah.sql` di staging.
3. **Penyederhanaan Frontend**:
   - `normalizeRupiah` di `src/lib/utils.ts` disederhanakan menjadi identitas 1:1 (`Number(amount) || 0`).
   - `formatRupiah` memformat langsung nilai angka tanpa normalisasi bersyarat.
   - Helper baru `isSettledVisit` dan `isSettledCashVisit` mengecualikan status `Batal`, `Belum Bayar`, `Menunggu Dokter`, `Menunggu Kasir`, `Menunggu Pembayaran`, dan `Pending` dari perhitungan pendapatan riil.
4. **Rekonsiliasi Laci Kasir Transparan**:
   - Menghapus `Math.max(0, ...)` pada `CashReconciliationCard` dan Dashboard.
   - Menambahkan status defisit (rose badge dan badge "Setoran Melebihi Kas Masuk Periode Ini" atau "Defisit Kas Masuk") dengan penjelasan jelas bahwa setoran mengambil uang fisik akumulasi hari sebelumnya.
   - Menambahkan batasan `min` dan `max` pada pemilihan tanggal agar terkunci pada rentang bulan yang sedang aktif.

## Konsekuensi

- Seluruh data historis dan baru kini tersimpan dalam Rupiah penuh (1:1).
- Rekonsiliasi independen membuktikan keakuratan total Oktober 2024 di produksi sama 100% dengan data sumber CSV (Kunjungan Rp 25.020.000 dan Kas Keluar Rp 4.970.000).
- Cadangan pra-migrasi tersimpan aman di skema internal tanpa risiko terakses dari publik/API PostgREST.
