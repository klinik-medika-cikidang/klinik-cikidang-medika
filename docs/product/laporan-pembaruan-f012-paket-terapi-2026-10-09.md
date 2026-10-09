# Laporan Pembaruan Sistem: Paket Terapi (F-012)

**Klinik Pratama Cikidang Medika**
Tanggal: 9 Oktober 2026
Untuk: dr. Ovan, dr. Neneng, dan staf klinik
Dari: Pengembang

Dokumen ini menjelaskan fitur Paket Terapi yang baru selesai dikerjakan dan diuji di lingkungan uji (staging). Belum ada perubahan yang dijalankan pada data produksi.

## 1. Ringkasan

Fitur Paket Terapi menyatukan tindakan dan obat yang sering dipakai klinik menjadi satu paket. Saat pasien dilayani, staf cukup memilih paket dan seluruh rinciannya langsung masuk ke tagihan kunjungan. Fitur sudah dipasang dan diuji di staging, lengkap dengan sepuluh paket awal yang diambil dari data rekam medis dan daftar harga obat klinik.

## 2. Apa Itu Paket Terapi

Paket Terapi adalah sekumpulan item yang diberi satu nama. Setiap item dapat berupa Tindakan, Obat, atau Lainnya, dengan jumlah dan harga satuan. Harga total paket dihitung otomatis dari seluruh item, sehingga tidak pernah diketik manual.

Saat paket diterapkan ke sebuah kunjungan:

- Item bertipe Obat mengisi kolom terapi pada kunjungan.
- Item bertipe Tindakan mengisi kolom tindakan kunjungan.
- Nilai total paket ditambahkan ke pendapatan lain kunjungan, dan nama paket dicatat pada keterangan pendapatan.
- Biaya pemeriksaan tidak diubah, termasuk untuk pasien BPJS yang biaya pemeriksaannya nol.

Setiap penerapan juga dicatat pada riwayat tersendiri. Riwayat ini bersifat catatan tetap: bila definisi paket diubah di kemudian hari, kunjungan yang sudah tercatat tidak ikut berubah.

## 3. Paket Awal yang Sudah Dipasang

Sepuluh paket awal dibuat dari pola terapi yang paling sering muncul pada data rekam medis klinik. Harga obat mengacu pada daftar harga obat klinik. Paket yang harganya masih Rp 0 berarti tarifnya belum diisi dan mohon disesuaikan.

| Kode | Nama Paket | Jumlah Item | Harga Total |
|---|---|---|---|
| PKT-ISPA-DW | Paket Terapi ISPA Dewasa | 3 | Rp 37.368 |
| PKT-BATUK-AN | Paket Terapi Batuk Pilek Anak | 2 | Belum diisi |
| PKT-INFEKSI-BAKTERI | Paket Terapi Infeksi Bakteri | 2 | Rp 121.460 |
| PKT-DISPEPSIA | Paket Terapi Dispepsia | 2 | Rp 38.225 |
| PKT-ASAM-LAMBUNG | Paket Terapi Asam Lambung | 1 | Rp 99.000 |
| PKT-SUNTIK-NYERI | Paket Suntik Nyeri dan Radang | 3 | Rp 33.953 |
| PKT-SUNTIK-MUAL | Paket Suntik Mual dan Muntah | 3 | Rp 37.200 |
| PKT-NEBU | Paket Terapi Nebulizer | 2 | Belum diisi |
| PKT-INFUS | Paket Terapi Infus | 2 | Belum diisi |
| PKT-USG | Paket Pemeriksaan USG | 1 | Belum diisi |

Catatan: paket tindakan seperti nebulizer, infus, dan USG belum memiliki tarif karena tarif tindakan tidak ada di berkas harga obat. Tarif tersebut diisi oleh klinik melalui menu Paket Terapi.

## 4. Yang Bisa Dilakukan

Pemilik (Owner) dapat:

- Membuat paket baru beserta kode, deskripsi, dan daftar itemnya.
- Mengubah nama, kode, deskripsi, dan setiap item, termasuk menambah, menghapus, dan mengatur urutan item.
- Menonaktifkan paket agar tidak muncul lagi sebagai pilihan, lalu mengaktifkannya kembali.
- Menghapus paket secara permanen hanya bila paket tersebut belum pernah diterapkan pada kunjungan mana pun.

Pada halaman kasir, staf dapat menekan tombol Terapkan Paket Terapi, memilih paket aktif, melihat rincian item, lalu menerapkannya. Bila paket yang sama sudah pernah diterapkan pada kunjungan itu, sistem menampilkan peringatan dan meminta konfirmasi sebelum menambah lagi. Alur penagihan manual yang lama tetap berjalan seperti biasa.

## 5. Hasil Pengujian

- Pemeriksaan tipe TypeScript lulus.
- Uji otomatis lulus, termasuk perhitungan harga paket dan matriks hak akses.
- Proses build aplikasi lulus dan halaman Paket Terapi terbentuk.
- Di staging: ketiga tabel baru terbentuk, sepuluh paket dengan dua puluh satu item terpasang.
- Di staging: simulasi penerapan paket berhasil menambah pendapatan lain, mengisi keterangan, dan menulis riwayat, tanpa mengubah biaya pemeriksaan pasien BPJS.

## 6. Batasan dan Catatan

- Untuk saat ini menu Paket Terapi hanya tersedia untuk Owner. Pertanyaan mengenai peran lain ada di Bagian 7.
- Harga paket awal mengacu pada daftar harga obat klinik dan tarif jual masih perlu disesuaikan.
- Paket yang sudah pernah diterapkan pada minimal satu kunjungan tidak dihapus permanen, hanya dinonaktifkan, agar rincian kunjungan lama tetap utuh.
- Belum ada perubahan pada proyek produksi.

## 7. Pertanyaan untuk Dokter

1. Apakah menu Paket Terapi sebaiknya hanya untuk Owner, atau dokter juga perlu akses? Bila perlu, apakah dokter hanya melihat daftar, atau ikut mengelola paket?
2. Apakah sepuluh paket awal sudah sesuai kebutuhan klinik, dan apakah harga serta nama paketnya sudah tepat? Mohon ditandai paket yang perlu diubah.

## 8. Langkah Berikutnya

1. Klinik meninjau daftar paket, menyesuaikan harga, dan menjawab pertanyaan pada Bagian 7.
2. Pengembang melakukan pemeriksaan tampilan pada staging (ponsel, tablet, dan komputer).
3. Setelah disetujui, perubahan diterapkan ke produksi dengan pencadangan data lebih dahulu.

## 9. Keterangan Istilah

| Istilah | Arti |
|---|---|
| Staging | Lingkungan uji, tempat mencoba perubahan tanpa menyentuh data asli |
| Produksi | Aplikasi asli yang dipakai klinik sehari-hari |
| Paket Terapi | Sekumpulan tindakan dan obat yang diberi satu nama dan satu harga |
| Owner | Pemilik klinik yang memegang akses penuh |
