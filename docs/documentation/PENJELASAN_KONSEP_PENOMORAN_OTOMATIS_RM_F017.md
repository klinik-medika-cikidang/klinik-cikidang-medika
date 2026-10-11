# Penjelasan Konsep & Alur Kerja: Penomoran Otomatis Rekam Medis (No RM) Berkelanjutan (F-017)

**Klinik Pratama Cikidang Medika**  
**Sasaran Pembaca:** dr. Ovan, dr. Neneng, Penanggung Jawab Medis, dan Petugas Loket Pendaftaran  
**Disusun Oleh:** Tim Pengembang Sistem Informasi Klinik  
**Tanggal:** 11 Oktober 2026  

---

## 1. Menjawab Masukan & Pertanyaan dr. Ovan

Dokumen ini disusun secara khusus untuk memberikan gambaran yang utuh dan mudah dipahami mengenai cara kerja **Fitur Penomoran Otomatis Rekam Medis (F-017)**, menjawab langsung pertanyaan yang disampaikan oleh **dr. Ovan**:

> *"Om punten satu lagi, untuk no rm otomatisnya bisa dari no urut DATA google sheet gak yah? Biar gak kecampur no rm yang saat ini. Apa gimana baiknya?"*

**Jawaban:**  
**Bisa, dan sistem di aplikasi web klinik sudah dirancang persis mengikuti konsep tersebut.**

Sistem menerapkan prinsip **"Estafet Berkelanjutan" (*Continuous Auto-Generation*)**. Artinya, sistem aplikasi web tidak memulai penomoran dari nol atau angka 1, melainkan **langsung melanjutkan nomor urut terakhir yang tercatat di Google Sheet klinik**. Dengan cara ini, data pasien baru dijamin **100% tidak akan pernah bertabrakan, tertukar, atau menimpa** berkas 3.750 pasien lama yang sudah ada di buku fisik maupun Google Sheet.

---

## 2. Struktur Format Baku No RM Klinik (9 Digit Tanpa Strip)

Sesuai standar operasional resmi Klinik Pratama Cikidang Medika, setiap Nomor Rekam Medis terdiri dari **9 digit angka murni** (tanpa spasi dan tanpa tanda strip `-`) yang memiliki arti spesifik:

$$\underbrace{\mathbf{01}}_{\text{Kode Gender (2 Digit)}} \quad \underbrace{\mathbf{01}}_{\text{Kode Desa (2 Digit)}} \quad \underbrace{\mathbf{03741}}_{\text{Nomor Urut Pasien (5 Digit)}}$$

### Rincian Tiga Bagian Nomor RM:

| Bagian | Posisi Digit | Arti / Fungsi | Pilihan / Contoh Nilai |
|---|---|---|---|
| **Bagian 1** | Digit 1 – 2 | **Kode Jenis Kelamin** | `01` = Laki-laki<br>`02` = Perempuan |
| **Bagian 2** | Digit 3 – 4 | **Kode Wilayah Desa Domisili** | `01` = Cikidang<br>`02` = Pangkalan<br>`03` = Sampora<br>*(lihat daftar 13 desa di bawah)* |
| **Bagian 3** | Digit 5 – 9 | **Nomor Urut Pendaftaran Pasien** | Nomor urut berjenjang 5 digit:<br>`03741`, `03742`, `03743`, dst. |

### Daftar Resmi 13 Kode Wilayah Desa:
1. `01` = Cikidang
2. `02` = Pangkalan
3. `03` = Sampora
4. `04` = Gunung Malang
5. `05` = Bumisari
6. `06` = Cicareuh
7. `07` = Tamansari
8. `08` = Nangka Koneng
9. `09` = Cijambe
10. `10` = Mekarnangka
11. `11` = Cikiray
12. `12` = Wilayah Khusus / Cibunar
13. `13` = Luar Wilayah (Pelabuhan Ratu, Parungkuda, Cibadak, dll.)

---

## 3. Konsep "Estafet Nomor Urut": Mengapa Dimulai dari 3741?

### Situasi Data Historis di Google Sheet:
- Berkas Google Sheet klinik (*DATAPASIEN* & *REKAMMEDIS*) yang telah dimigrasikan ke sistem mencatat sebanyak **3.750 pasien aktif**.
- Setelah diaudit menyeluruh, nomor urut pasien tertinggi pada berkas lama berada pada angka **`3740`** (tercatat pada berkas sunat dan pasien umum terdahulu).

### Mekanisme Estafet ke Sistem Web Baru:
Agar nomor pasien baru tidak bercampur dengan pasien lama, sistem web menetapkan batas awal (*baseline floor*) penomoran otomatis pada angka **`3741`**.

```
┌────────────────────────────────────────────────────────────────────────┐
│  DATA LAMA KLINIK (Google Sheet & Berkas Fisik)                       │
│  Pasien Urut 00001 ........................... Pasien Urut 03740      │
│  Status: Tersimpan Aman & Terkunci Rapi (3.750 Berkas Pasien)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                       Estafet Bersambung Otomatis
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  SISTEM APLIKASI WEB BARU (Pasien Baru yang Mendaftar Hari Ini)       │
│  • Pasien Baru ke-1  ──> Mendapat Nomor Urut 03741                     │
│  • Pasien Baru ke-2  ──> Mendapat Nomor Urut 03742                     │
│  • Pasien Baru ke-3  ──> Mendapat Nomor Urut 03743                     │
│  • ... dan seterusnya secara berkelanjutan                            │
└────────────────────────────────────────────────────────────────────────┘
```

### Contoh Nyata Penerapan pada Pasien Baru:
1. **Pasien Baru A**: Laki-laki dari Desa Cikidang  
   $\rightarrow$ Kode Gender `01` + Kode Desa `01` + Urut `03741` = **`010103741`**
2. **Pasien Baru B**: Perempuan dari Desa Pangkalan  
   $\rightarrow$ Kode Gender `02` + Kode Desa `02` + Urut `03742` = **`020203742`**
3. **Pasien Baru C**: Laki-laki dari Luar Wilayah (Pelabuhan Ratu)  
   $\rightarrow$ Kode Gender `01` + Kode Desa `13` + Urut `03743` = **`011303743`**

Dengan mekanisme ini:
- **Tidak ada nomor yang mulai dari 1 lagi**, sehingga tidak ada kebingungan antara pasien tahun 2023 dengan pasien tahun 2026.
- **Urutan rekam medis klinik tetap tersambung rapi secara historis**.

---

## 4. Dua Skenario Praktis di Loket Pendaftaran

Dalam pelayanan sehari-hari di klinik, petugas loket akan menghadapi dua kemungkinan pasien:

### Skenario 1: Pasien Baru (Belum Pernah Berobat)
1. Petugas loket membuka menu **Loket & Kasir** (`/pendaftaran`) dan klik tombol hijau **"+ Pasien Baru"**.
2. Petugas memilih **Sapaan** (*Tn., Ny., Nn., An., By.*) $\rightarrow$ sistem otomatis menentukan kode jenis kelamin (`01` atau `02`).
3. Petugas memilih **Desa / Domisili Pasien** $\rightarrow$ kolom **No Rekam Medis langsung terisi otomatis** (misal: `010103741`).
4. Petugas tidak perlu mengingat rumus, tidak perlu membuka buku register fisik, dan tidak perlu menghitung urutan manual. Cukup isi identitas, lalu simpan.

### Skenario 2: Pasien Lama Datang Berobat Kembali
1. Pasien lama yang datang kembali **TIDAK PERLU** dibuatkan nomor RM baru.
2. Petugas cukup mengetikkan nama pasien atau nomor RM lama di kotak pencarian loket. Sistem sudah menyimpan seluruh **3.750 data pasien lama**.
3. Jika ada pasien lama yang membawa kartu berobat fisik bertahun-tahun lalu dan datanya belum sempat masuk, petugas loket **diberi kebebasan penuh untuk mengetikkan nomor lama secara manual**.
4. Sistem tidak pernah mengunci kolom No RM; otomatisasi hadir sebagai asisten cerdas, bukan pembatas.

---

## 5. Sistem Pengaman: Anti-Duplikasi & Keandalan Data

Untuk memastikan ketenangan dokter dan pemilik klinik, sistem dilengkapi beberapa lapis pengaman otomatis:

1. **Pemeriksaan Real-Time (*Anti-Duplicate Check*)**:  
   Tepat sebelum nomor dimunculkan di layar, sistem memeriksa seluruh isi database. Jika nomor urut `3741` ternyata sudah terpakai beberapa detik sebelumnya oleh petugas lain, sistem otomatis melompat ke nomor berikutnya (`3742`) yang masih kosong.
2. **Kunci Unik Database (*Unique Database Constraint*)**:  
   Pada tingkat penyimpanan database utama, kolom No RM diproteksi dengan aturan *UNIQUE*. Sistem secara sistematis menolak apabila ada dua pasien yang memiliki nomor RM yang persis sama.
3. **Tombol Sinkronisasi Cepat (Ikon Petir)**:  
   Jika petugas loket salah memilih desa lalu menggantinya (misal dari Cikidang ke Pangkalan), tersedia tombol pintas ikon petir di samping isian No RM untuk menghitung ulang nomor dalam hitungan detik.

---

## 6. Tanya Jawab Praktis (FAQ) untuk Dokter

**Pertanyaan 1: Apakah dokter saat memeriksa pasien perlu menghafal rumus ini?**  
> *Jawaban:* **Sama sekali tidak perlu, Dok.** Saat dokter membuka menu Rekam Medis (`/rekam-medis`), dokter hanya melihat nama pasien, No RM yang sudah rapi, keluhan, riwayat penyakit, dan resep obat. Seluruh proses penomoran berjalan di balik layar pada loket depan.

**Pertanyaan 2: Bagaimana jika pasien berpindah alamat atau desa di kemudian hari?**  
> *Jawaban:* Sesuai standar rekam medis Permenkes, No RM adalah identitas permanen pasien seumur hidup. Jika pasien pindah domisili, yang diperbarui hanyalah kolom alamat pada profil pasien; No RM pasien tetap sama agar riwayat rekam medis sebelumnya tidak terputus.

**Pertanyaan 3: Apakah nomor 9 digit ini cocok saat ekspor data ke Excel untuk Puskesmas?**  
> *Jawaban:* **Sangat cocok, Dok.** Format 9 digit baku tanpa tanda strip ini seragam di seluruh modul aplikasi (register harian, kuitansi kasir, modul program khusus bumil/KB/PTM, hingga ekspor berkas bulanan Puskesmas). Rekapitulasi laporan akhir bulan menjadi jauh lebih rapi dan bebas dari kesalahan entri.

---

## 7. Kesimpulan

Penerapan Fitur Penomoran Otomatis Berkelanjutan (F-017) ini merupakan solusi paling ideal karena:
1. **Menghormati dan menjaga keutuhan 3.750 data pasien historis** yang sudah ada di Google Sheet klinik (tidak ada data yang tertimpa atau bentrok).
2. **Memberikan kenyamanan maksimal bagi petugas loket** karena nomor terbuat otomatis dalam 1 klik tanpa perlu membuka buku catatan manual lagi.
3. **Menjaga ketertiban administrasi klinik jangka panjang** sesuai format resmi yang dikehendaki dr. Ovan dan manajemen Klinik Pratama Cikidang Medika.

---

*Dokumen ini diterbitkan oleh Pengembang Sistem sebagai panduan resmi arsitektur dan operasional penomoran rekam medis Klinik Pratama Cikidang Medika.*
