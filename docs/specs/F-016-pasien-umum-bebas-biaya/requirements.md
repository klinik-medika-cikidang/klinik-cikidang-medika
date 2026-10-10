# Requirements Specification — F-016: Pembebasan Biaya Pasien Umum (Free 100% / Rp 0)

## 1. Executive Summary & Problem Statement

### 1.1. Context
Pada operasional Klinik Pratama Cikidang Medika, dokter pemeriksa terkadang memutuskan untuk membebaskan biaya pelayanan (diskon 100% / Rp 0) bagi pasien kategori **UMUM** karena alasan klinis atau sosial tertentu—misalnya:
1. Pasien kontrol evaluasi pasca tindakan medis (jahit luka, perban, rawat luka) dalam kurun waktu garansi kontrol.
2. Pasien anggota keluarga dokter atau staf klinik.
3. Pasien bakti sosial, dhuafa, atau kasus darurat tidak mampu.
4. Instruksi kebijakan khusus dari pimpinan klinik / owner.

### 1.2. The Defect / Root Cause
Saat dokter memasukkan angka `0` pada input *Biaya Periksa Dokter* di workstation pemeriksaan (`/rekam-medis`), pasien tetap muncul di loket kasir (`CashierPosPanel.tsx`) dengan tagihan **Rp 35.000**.

Investigasi kode menunjukkan *falsy evaluation bug* pada logika TypeScript:
```typescript
// CashierPosPanel.tsx L-77 & L-256
Number(selectedVisit.biaya_periksa || 35000);
```
Dalam JavaScript/TypeScript, angka `0` bernilai *falsy*. Akibatnya, `0 || 35000` selalu mengevaluasi ke nilai default `35000`. Selain itu, antarmuka kasir tidak memiliki tombol untuk membebaskan biaya jika dokter lupa menolkan biaya di ruang periksa, serta validasi kasir selalu menuntut uang tunai masuk (`nominalDiterima >= totalTagihan`) sehingga transaksi Rp 0 untuk pasien umum terhambat.

---

## 2. User Stories

- **US-01 (Dokter di Ruang Periksa)**: Sebagai dokter pemeriksa, saya ingin dapat menekan tombol pintas *"Free 100% / Gratis"* di sebelah biaya periksa dengan sekali klik dan memilih alasannya, sehingga pasien kontrol atau keluarga staf otomatis berbiaya Rp 0 tanpa perlu mengetik angka manual.
- **US-02 (Petugas Kasir di Loket Depan)**: Sebagai kasir, saya ingin dapat membebaskan biaya tagihan pasien umum menjadi Rp 0 atas arahan dokter langsung dari workstation kasir (*one-click zero bill*), memilih alasan pembebasan biaya, dan menyelesaikan transaksi tanpa dipaksa mengisi uang tunai tender.
- **US-03 (Pemilik Klinik & Akuntabilitas)**: Sebagai owner klinik, saya ingin setiap pembebasan biaya tercatat alasannya dengan jelas di kuitansi dan database, serta tidak menimbulkan pencatatan uang tunai fiktif di Buku Kas dan Rekonsiliasi Kasir.

---

## 3. RFC 2119 Acceptance Criteria

### 3.1. Workstation Dokter (`/rekam-medis`)
- **AC-001**: Sistem **SHALL** menyediakan tombol chip `[ Free 100% / Gratis ]` dan `[ Tarif Standar (Rp 35.000) ]` tepat di sebelah input Biaya Periksa pada formulir pemeriksaan rekam medis.
- **AC-002**: **WHEN** dokter mengklik `[ Free 100% / Gratis ]`, sistem **SHALL** mengubah nilai `biayaPeriksa` menjadi `0`, mereset `pendapatanLain` menjadi `0`, menandai `is_gratis = true`, dan menampilkan pilihan alasan cepat pembebasan biaya.
- **AC-003**: Sistem **SHALL** menyediakan daftar opsi alasan pembebasan biaya baku:
  1. `Kontrol Pasca Tindakan`
  2. `Keluarga Dokter / Staf`
  3. `Bakti Sosial / Dhuafa`
  4. `Instruksi Khusus Dokter`
  5. Pengisian alasan bebas teks (*custom*).
- **AC-004**: **WHEN** dokter mengklik `[ Tarif Standar (Rp 35.000) ]`, sistem **SHALL** mengembalikan `biayaPeriksa` ke tarif acuan standar (`DEFAULT_TARIFFS.umum = 35000`), mereset `is_gratis = false`, dan menghapus keterangan gratis.
- **AC-005**: **WHEN** data rekam medis disimpan, sistem **SHALL** menyimpan nilai `biaya_periksa = 0`, `is_gratis = true`, dan `alasan_gratis` ke tabel `visits`.

### 3.2. Workstation Kasir (`/pendaftaran` -> Tab Kasir)
- **AC-006**: Sistem **SHALL** memperbaiki evaluasi nilai `biaya_periksa` pada `CashierPosPanel.tsx` menggunakan *nullish coalescing* (`visit.biaya_periksa !== null && visit.biaya_periksa !== undefined ? Number(visit.biaya_periksa) : DEFAULT_TARIFFS.umum`), sehingga nilai `0` tidak lagi berubah menjadi `35000`.
- **AC-007**: Pada daftar antrean kasir siap bayar, kartu pasien umum yang memiliki `is_gratis = true` atau `totalTagihan === 0` **SHALL** menampilkan badge `[ GRATIS / Rp 0 ]` dan bukan `Rp 35.000`.
- **AC-008**: Pada panel rincian kasir, sistem **SHALL** menyediakan tombol aksi `[ Bebaskan Biaya / Gratis (Rp 0) ]` untuk pasien UMUM.
- **AC-009**: **WHEN** kasir mengklik `[ Bebaskan Biaya / Gratis (Rp 0) ]`, sistem **SHALL** mengubah `biayaPeriksa = 0`, `pendapatanLain = 0`, `isGratis = true`, dan menampilkan pilihan alasan gratis yang sama dengan ruang dokter.
- **AC-010**: **WHEN** status pembebasan biaya aktif (`isGratis = true` atau `totalTagihan === 0`), sistem **SHALL**:
  - Mengizinkan metode pembayaran Tunai atau Transfer dengan uang diterima `0`.
  - Tidak memicu peringatan *Kurang Bayar* (`isKurangBayar = false`).
  - Mengubah label tombol submit menjadi `Konfirmasi Bebas Biaya & Cetak Kuitansi`.
- **AC-011**: **WHEN** transaksi diselesaikan, sistem **SHALL** menyimpan status kunjungan sebagai `status_pembayaran = 'Lunas'`, `payment_state = 'Lunas'`, `biaya_periksa = 0`, `pendapatan_lain = 0`, `is_gratis = true`, dan `alasan_gratis` terisi.

### 3.3. Kuitansi Pasien & Buku Kas
- **AC-012**: Pada `ReceiptModal.tsx`, jika pasien umum berstatus bebas biaya (`is_gratis = true` atau `totalAmount === 0`), kuitansi **SHALL** menampilkan:
  - Subtotal Pemeriksaan: `Rp 0 (Bebas Biaya / Diskon 100%)`
  - Keterangan Alasan: `Alasan Bebas Biaya: [alasan_gratis]`
  - Total Pelunasan: `Rp 0`
  - Badge Status: `STATUS: LUNAS (BEBAS BIAYA)`
- **AC-013**: Transaksi pasien umum Rp 0 **SHALL NOT** menambahkan penerimaan kas riil palsu ke dalam perhitungan mutasi `buku_kas` atau rekapitulasi setoran kas harian.

---

## 4. Non-Regression Invariants

- **INV-001**: Pasien BPJS Kesehatan tetap mempertahankan alur klaim kapitasi (`biaya_periksa = 0`, `Ditanggung BPJS`) tanpa terpengaruh oleh fitur diskon pasien umum.
- **INV-002**: Pasien umum berbayar normal dengan tarif standar (Rp 35.000) dan tindakan tambahan tetap dapat diproses dan ditagihkan seperti biasa.
- **INV-003**: Fitur Paket Terapi (F-012) tetap dapat diterapkan pada kunjungan tanpa merusak status pembebasan biaya kecuali kasir secara eksplisit menambahkan tindakan/obat berbayar.
- **INV-004**: Integritas pembatalan antrean (F-014) dan laporan Puskesmas (F-015) tidak mengalami regresi.
