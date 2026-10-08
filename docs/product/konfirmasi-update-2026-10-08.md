# DOKUMEN KONFIRMASI UPDATE APLIKASI

**Klinik Pratama Cikidang Medika**

Tanggal: 8 Oktober 2026  
Untuk: dr. Ovan, dr. Neneng, dan staf klinik  
Dari: Pengembang  
Status: DRAFT untuk dikonfirmasi. Belum ada perubahan pada data produksi.  
Versi dokumen: 3 (hitam putih, siap cetak)

---

## 1. Maksud Dokumen Ini

Dokumen ini dibuat supaya Bapak/Ibu tahu persis apa yang sedang kami kerjakan pada aplikasi setelah
notulensi revisi tanggal 8 Oktober 2026. Dokumen sengaja hitam putih dan ringkas agar mudah dibaca
dan dicetak.

---

## 2. Ringkasan Singkat

1. Data klinik terbaru sudah kami periksa dan pasang ke sistem pengujian.
2. Keluhan "No RM tidak sesuai dengan nama pasien" ternyata berasal dari berkas data yang lama.
   Klinik sudah memperbaiki berkasnya, dan hasilnya jauh lebih bersih.
3. Kami menyusun rencana perubahan untuk empat hal, sebagian sudah siap diuji, satu ditahan dulu.
4. Belum ada satu pun perubahan yang dijalankan pada data produksi.

---

## 3. Keputusan yang Sudah Disepakati

| No | Pertanyaan | Keputusan |
|---|---|---|
| 1 | Menyimpan atau membatalkan uji skema di staging | Simpan, karena staging dipakai untuk uji coba lebih dulu |
| 2 | Satu dokumen rencana atau dipecah | Dipecah per fitur |
| 3 | Kolom kategori program "Umum" | Disetujui |
| 4 | Batas akses Dokter/Admin di buku kas | Disetujui, dicatat di dokumen ini untuk dikonfirmasi klinik |
| 5 | Fitur Paket Terapi | Ditahan dulu, tidak dikerjakan sekarang, tetapi tetap direncanakan |
| 6 | Akses pemeriksaan database | Sudah diperbarui dan berfungsi |

---

## 4. Hasil Pemeriksaan Data

Data klinik yang lama dibandingkan dengan data terbaru yang Bapak/Ibu kirim pada 8 Oktober 2026.

| Pemeriksaan | Data lama | Data baru |
|---|---|---|
| Jumlah data pasien (master) | 3.669 | 3.725 |
| Jumlah kunjungan (rekam medis) | 7.671 | 7.817 |
| Nomor RM pada kunjungan yang formatnya tidak seragam | 1.619 | 1 |
| Nomor RM kunjungan yang tidak ada di data pasien | 1.009 | 0 |
| Nomor RM yang dipakai lebih dari satu nama pasien (di kunjungan) | 76 | 42 |
| Nama pada kunjungan yang tidak cocok dengan data pasien | 112 | 33 |
| Nama pada kunjungan yang ejaannya berbeda dari data pasien | 58 | 30 |

**Artinya.** Perbaikan yang Bapak/Ibu lakukan berhasil. Seluruh nomor RM pada kunjungan kini 9 digit dan
semuanya cocok dengan data pasien. Setelah diproses, semua kunjungan berhasil dihubungkan ke pasien;
18 baris di antaranya perlu ditinjau karena nomornya cocok tetapi namanya perlu dipastikan. Daftar
rinci (baris Excel, No RM, dan nama) ada di Lampiran Validasi Data.

---

## 5. Kondisi Sistem Saat Ini

| Sistem | Keterangan |
|---|---|
| Staging (lingkungan uji) | Sudah diisi data terkoreksi dan lengkap, siap divalidasi klinik |
| Produksi (aplikasi yang dipakai klinik) | Aktif dipakai. Ada 1 kunjungan baru tercatat pada 8 Oktober 2026 |

Catatan penting: karena produksi sudah mulai dipakai, setiap perubahan harus dicadangkan lebih dulu
dan diuji di staging. Data baru tidak boleh hilang. Data terkoreksi sudah siap di staging untuk
Bapak/Ibu validasi.

---

## 6. Perubahan yang Direncanakan

### F-010 Perbaikan No RM dan Nama Pasien

- Data pasien dan nomor RM diambil dari berkas DATA (master), bukan dari catatan kunjungan.
- Setiap kunjungan dihubungkan ke pasien yang benar.
- Setiap keputusan dicatat dan dapat diperiksa.
- Tidak ada lagi dua orang berbeda yang tercampur menjadi satu.

### F-011 Hak Akses dan Alur Kategorisasi

- Dokter/Admin dapat bekerja dari pendaftaran pasien, pemeriksaan, tindakan, pelunasan, sampai
  pencatatan pendapatan tambahan dan pengeluaran medis maupun non medis.
- Dokter/Admin tidak dapat melihat dashboard dan pemantauan biaya.
- Owner tetap dapat melihat seluruh menu, data, transaksi, laporan, dan dashboard.
- Kategori program kesehatan dan agenda observasi dipilih di langkah terakhir, setelah dokter selesai
  memeriksa. Pasien yang bukan program khusus tetap berkategori "Umum".
- Triple Eliminasi berarti ANC ditambah pemeriksaan lab HIV, HBsAg, dan Sipilis.
- Nama menu "Pemantauan Pos Rawat" diganti menjadi "Observasi".

### F-013 Surat Keterangan Sakit

- Ditambahkan kolom alamat tambahan yang dapat diedit pada surat.
- Kolom ini opsional dan hanya tercetak bila diisi.

### F-012 Paket Terapi (DITAHAN)

- Fitur ini direncanakan dan akan dikerjakan, tetapi ditahan dulu untuk sementara waktu.
- Kami fokus menyelesaikan perbaikan data dan fitur lain lebih dulu.
- Tidak ada pekerjaan yang dilakukan untuk fitur ini saat ini.

---

## 7. Yang Perlu Dikonfirmasi Klinik

| No | Pertanyaan | Menghambat? |
|---|---|---|
| 1 | Ada 18 baris kunjungan yang perlu ditinjau (nomor cocok, nama perlu dipastikan). Rincian barisnya ada di Lampiran Validasi Data. | Tidak |
| 2 | Ada 26 baris kunjungan lama tanpa tanggal periksa. Rincian barisnya ada di Lampiran. Dilengkapi atau diabaikan? | Tidak |
| 3 | Ada 23 anak sunat yang belum ada di data pasien; sistem membuatkan nomor otomatis. Rincian nama dan nomornya ada di Lampiran. Mohon dicek kebenarannya. | Tidak |
| 4 | Di buku kas, batas pengertian "transaksi" dan "pemantauan" untuk Dokter/Admin? | Ya |
| 5 | Apakah cukup kategori "Umum", atau perlu kategori lain untuk pasien non-program? | Tidak |
| 6 | Apakah istilah "Observasi" juga dipakai pada laporan Puskesmas? | Tidak |
| 7 | Apakah fitur Paket Terapi tetap ditahan, atau mulai disiapkan? | Ya |

---

## 8. Rencana Langkah Berikutnya

1. Klinik membaca dokumen ini dan menjawab pertanyaan pada Bagian 7.
2. Kami menyesuaikan rencana sesuai jawaban klinik.
3. Kami mencoba perubahan di staging lebih dulu sampai aman.
4. Kami mencadangkan data produksi sebelum menyentuh produksi.
5. Baru setelah aman, perubahan diterapkan ke produksi.

---

## 9. Yang Tidak Berubah

- Aplikasi tetap dapat dipakai seperti biasa.
- Data pasien dan kunjungan tidak dihapus.
- Tidak ada biaya atau gangguan layanan pada tahap ini.

---

## 10. Keterangan Istilah

| Istilah | Arti |
|---|---|
| RM | Rekam Medis, kode identitas pasien di klinik |
| Staging | Lingkungan uji, tempat mencoba perubahan tanpa menyentuh data asli |
| Produksi | Aplikasi asli yang dipakai klinik sehari-hari |
| Spesifikasi | Dokumen rencana tertulis sebelum perubahan dikerjakan |

---

## 11. Lampiran Validasi Data

Untuk memudahkan pemeriksaan, kami menyiapkan satu berkas terpisah bernama **Lampiran Validasi Data**
(format PDF). Berkas ini memuat daftar baris yang perlu dicek langsung di berkas Excel, lengkap dengan
nomor baris, No RM, dan nama pasien:

| Bagian | Isi | Jumlah |
|---|---|---|
| A | Baris kunjungan tanpa tanggal periksa | 26 baris |
| B | Baris kunjungan yang perlu ditinjau (nomor cocok, nama perlu dipastikan) | 18 baris |
| C | Anak sunat yang dibuatkan nomor baru | 23 pasien |

Cara pakai: buka berkas rekam medis di Excel, lalu lihat nomor baris (Baris Excel) pada setiap daftar.
Baris 1 Excel adalah judul kolom, sehingga data pertama ada di baris 2.

Catatan: karena lampiran memuat nama pasien dan No RM, berkas tersebut diserahkan terpisah kepada
klinik dan tidak dilampirkan pada dokumen ini.

---

**Belum ada tindakan pada data produksi.**
