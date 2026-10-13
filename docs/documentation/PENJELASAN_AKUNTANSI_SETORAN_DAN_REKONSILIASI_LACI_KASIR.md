# Penjelasan Sistem: Akuntansi Setoran Pemilik, Presisi Kas Kecil, dan Rekonsiliasi Fisik Laci Kasir

**Klinik Pratama Cikidang Medika**  
*Dokumen Resmi Penjelasan Pembaruan Tata Kelola Keuangan & Kasir SIM Klinik*  
*Tanggal Rilis: 13 Oktober 2026*  
*Ditujukan Kepada: dr. Ade Sofyan (dr. Ovan), Pimpinan Klinik & Tim Manajemen*

---

## 1. Ringkasan Eksekutif

Dokumen ini disusun sebagai penjelasan resmi dan panduan operasional atas 3 (tiga) penyempurnaan sistem pencatatan keuangan dan kasir di SIM Klinik Pratama Cikidang Medika berdasarkan masukan langsung dari dr. Ade Sofyan:

1. **Pemisahan "Setor ke Rekening Pemilik" dari Beban Pengeluaran Operasional**: Transaksi penyerahan uang tunai laci ke pemilik/bank kini diakui sebagai **mutasi perpindahan kas internal (Setoran Pemilik/Bank)**, bukan biaya pengeluaran operasional. Hal ini mengoreksi tampilan laba bersih dan grafik harian sehingga tidak lagi tampak defisit fiktif.
2. **Presisi Nominal Kas Kecil (< Rp 10.000)**: Formulir pencatatan kas keluar kini menyimpan angka persis sesuai yang diketik staf (seperti Rp 1.000, Rp 2.500, atau Rp 5.000), tanpa perkalian otomatis ribuan warisan format data lama.
3. **Rekonsiliasi Otomatis 4 Pilar Sisa Fisik di Laci Kasir**: Uang fisik di laci kasir kini otomatis terpotong saat kasir mengeluarkan uang untuk belanja operasional harian (gorengan dokter, kopi, token listrik, obat mendesak) maupun saat menyetorkan uang ke pemilik. Kartu rekonsiliasi dilengkapi pilihan tampilan **Akumulasi Bulan Ini** dan **Per Tanggal**.

---

## 2. Poin 1: Perlakuan Akuntansi "Setor ke Rekening Pemilik"

### Pertanyaan / Feedback Dokter:
> *"Ini teh sudah masuk setor tunai ke pemilik, apakah bisa tidak dimasukkan ke pengeluaran, yang 2.400.000?"*

### Analisis Akar Masalah:
Pada tanggal 12 Oktober 2026, staf loket/kasir mencatat dua transaksi penyerahan uang tunai laci ke pemilik:
- **Rp 2.400.000** dengan keterangan *"stor tunai"*
- **Rp 50.000** dengan keterangan *"amel tuker cash"*

Karena transaksi tersebut dicatat melalui menu **Kas Keluar &rarr; Kategori: Setor ke Rekening Pemilik**, versi sistem sebelumnya menjumlahkan seluruh transaksi dengan jenis *"Keluar"* ke dalam pos **Pengeluaran (Operasional & Obat)**.

Dampaknya:
- Total beban pengeluaran klinik membengkak dari **Rp 5.735.000** menjadi **Rp 8.185.000**.
- Grafik keuangan harian tanggal 12 Oktober mencatat pemasukan Rp 1.435.000 vs kas keluar Rp 2.687.000, sehingga memunculkan indikator **Defisit (-Rp 1.252.000)**.
- Padahal, uang Rp 2.450.000 tersebut **tidak habis dipakai belanja klinik**, melainkan diserahkan secara utuh kepada pemilik klinik (dr. Ade Sofyan). Dalam kaidah akuntansi klinik, penyerahan uang laci ke pemilik adalah **perpindahan aset kas**, bukan biaya operasional.

### Solusi & Logika Baru yang Diterapkan:
1. **Pengeluaran Operasional Murni**: Kategori `Setor ke Rekening Pemilik` dan `Setor Tunai` otomatis dikeluarkan dari pos beban pengeluaran operasional.
   - Beban pengeluaran operasional klinik periode 1–12 Oktober kembali normal di angka **Rp 5.735.000**.
   - Beban pengeluaran pada tanggal 12 Oktober hanya mencatat belanja operasional riil sebesar **Rp 237.000** (Rp 10.000 gorengan dokter + Rp 213.000 token listrik & obat + Rp 14.000 kopi & biaya admin).
2. **Koreksi Grafik Keuangan Harian (12 Oktober 2026)**:
   - **Kas Masuk Pasien**: Rp 1.435.000
   - **Pengeluaran Operasional**: Rp 237.000
   - **Selisih Bersih Riil**: **Surplus +Rp 1.198.000** *(Grafik kembali hijau dan surplus, tidak lagi defisit).*
3. **Akumulasi Setor Tunai & Pemilik**:
   - Transaksi Rp 2.400.000 dan Rp 50.000 kini masuk ke kartu **Setor Tunai & Pemilik** bersama setoran sebelumnya, menghasilkan total setoran **Rp 6.865.000**.
4. **Pembedaan Visual di Tabel Buku Kas**:
   - Transaksi `Setor ke Rekening Pemilik` kini diberi tanda khusus berwarna indigo/biru dengan simbol **⇄** bertuliskan *"Setoran Laci ke Pemilik/Bank (Bukan Pengeluaran)"*.
   - Disediakan tab filter khusus **"Setoran Pemilik/Bank"** agar terpisah jelas dari daftar belanja operasional klinik.

---

## 3. Poin 2: Perbaikan Input Nominal Kas Kecil (< Rp 10.000)

### Pertanyaan / Feedback Dokter:
> *"Dan ini teh kas keluar gak bisa di bawah 10.000, kalau di bawah itu jadinya 1 juta."*

### Analisis Akar Masalah:
Pada saat migrasi data historis klinik dari Google Sheets lama, terdapat ribuan baris data lama yang mencatat nominal dalam singkatan ribuan (misalnya angka `15` berarti Rp 15.000, atau `150` berarti Rp 150.000). Untuk membaca data lama tersebut, dibuat fungsi konversi otomatis yang mengalikan nilai `< 10000` dengan `1000`.

Sayangnya, fungsi konversi tersebut ikut terpanggil ketika staf menginput transaksi baru di formulir kas keluar. Akibatnya:
- Staf mengetik `1000` &rarr; sistem otomatis mengubahnya menjadi **Rp 1.000.000 (1 Juta)**.
- Staf mengetik `2500` &rarr; sistem mengubahnya menjadi **Rp 2.500.000 (2,5 Juta)**.
- Staf mengetik `5000` &rarr; sistem mengubahnya menjadi **Rp 5.000.000 (5 Juta)**.

Hal ini menyulitkan kasir saat mencatat pengeluaran kecil sehari-hari seperti uang parkir, biaya fotokopi, materai, gorengan, atau biaya administrasi bank.

### Solusi & Logika Baru yang Diterapkan:
1. **Penyimpanan Nominal Presisi 100%**:
   - Perkalian otomatis pada formulir input baru dinonaktifkan sepenuhnya.
   - Nominal berapapun yang diketik kasir (misal `1.000`, `2.500`, `5.000`, `8.000`) akan disimpan secara presisi ke database dan terbaca persis sesuai angka aslinya.
2. **Penyempurnaan Normalisasi Data Lama**:
   - Batas normalisasi data lama diturunkan hanya untuk angka di bawah 1.000 (`< 1000`), sehingga angka ribuan asli (`1.000` s/d `9.999`) tidak akan pernah lagi terkalikan menjadi jutaan.
3. **Tombol Cepat Kas Kecil**:
   - Pada modal kas keluar kini tersedia tombol nominal instan: `Rp 2.000`, `Rp 5.000`, `Rp 10.000`, `Rp 25.000`, `Rp 50.000`, dan `Rp 100.000` untuk mempercepat pengisian kasir di kas kecil.

---

## 4. Poin 3: Mekanisme 4 Pilar Sisa Fisik di Laci Kasir

### Pertanyaan / Feedback Dokter:
> *"Yang ini ada pengeluaran, tapi tidak mempengaruhi sisa fisik di laci om, gimana caranya biar sesuai om?"*

### Analisis Akar Masalah:
Pada versi sebelumnya, kartu Rekonsiliasi Kasir hanya menghitung:
$$\text{Uang Tunai Pasien Hari Ini} - \text{Kategori Setor Tunai}$$

Sistem sama sekali **belum memotong pengeluaran kas operasional yang diambil langsung dari laci kasir** (misalnya saat kasir mengambil Rp 10.000 dari laci untuk beli gorengan dokter, Rp 213.000 untuk beli token listrik dan obat amox, atau Rp 14.000 untuk kopi dan biaya admin). Akibatnya, angka *"Sisa Fisik di Laci"* di layar tidak pernah berkurang saat kasir mengeluarkan uang tunai tersebut, sehingga kasir mendapati uang fisik riil di laci berbeda dengan angka di aplikasi.

### Solusi & Logika Baru: Formula 4 Pilar Rekonsiliasi Laci

Kini, setiap transaksi pengeluaran operasional tunai maupun setoran ke pemilik **otomatis langsung memotong sisa fisik di laci kasir**.

Rumus baku yang berlaku secara sistemik adalah:

$$\mathbf{Sisa\ Fisik\ di\ Laci} = \mathbf{Penerimaan\ Tunai\ Loket} - \mathbf{Pengeluaran\ Tunai\ Laci} - \mathbf{Disetor\ ke\ Pemilik/Bank}$$

Berikut adalah 4 pilar yang ditampilkan secara transparan pada kartu Rekonsiliasi Kasir:

| Pilar Rekonsiliasi | Definisi | Arah Aliran Kas | Contoh Data (1–12 Okt 2026) |
|---|---|:---:|:---:|
| **1. Tunai Masuk Laci** | Seluruh pembayaran tunai fisik dari pasien rawat jalan yang diterima di loket kasir. | **+ (Masuk Laci)** | `+ Rp 18.895.000` *(171 Pasien Tunai)* |
| **2. Pengeluaran Tunai Laci** | Uang tunai fisik yang diambil dari laci untuk belanja obat, token listrik, ATK, dan konsumsi dokter/staf. | **&minus; (Keluar Laci)** | `&minus; Rp 5.735.000` *(Belanja Obat & Operasional)* |
| **3. Disetor ke Pemilik/Bank** | Uang tunai fisik yang diambil dari laci dan disetorkan ke rekening bank klinik atau diserahkan ke pemilik. | **&minus; (Keluar Laci)** | `&minus; Rp 6.865.000` *(Setor Tunai & Setor ke Pemilik)* |
| **4. Sisa Fisik di Laci Kasir** | **Uang cash fisik yang wajib ada di dalam laci kasir saat ini.** | **= (Saldo Akhir Fisik)** | **Rp 6.295.000** *(Tersisa di Laci Loket)* |

### Konservasi dan Keseimbangan Saldo Kas Klinik:
Mari kita buktikan keseimbangan akuntansi klinik:
- **Sisa Fisik di Laci Kasir**: Rp 6.295.000
- **Dana di Rekening Bank & Pemilik** *(Kapitasi Rp 0 + Transfer Pasien Rp 635.000 + Setoran Kasir Rp 6.865.000)*: Rp 7.500.000
- **Total Saldo Kas Riil Bersih Klinik**:
  $$\text{Rp } 6.295.000 + \text{Rp } 7.500.000 = \mathbf{Rp\ 13.795.000}$$
- Angka ini **cocok 100% sampai ke rupiah terakhir** dengan formula laba bersih klinik pada Dashboard:
  $$\text{Omzet Pasien Umum (Rp 19.530.000)} - \text{Pengeluaran Operasional (Rp 5.735.000)} = \mathbf{Rp\ 13.795.000}$$

### Dua Pilihan Mode Tampilan pada Kartu Rekonsiliasi:
1. **Mode "Akumulasi Bulan Ini" (Default)**:
   Menampilkan total uang tunai yang masuk ke laci selama bulan berjalan dikurangi seluruh pengeluaran dan setoran di bulan tersebut. Mode ini sangat tepat digunakan oleh kasir dan pemilik klinik untuk mencocokkan total uang tunai fisik yang saat ini ada di dalam brankas/laci kasir.
2. **Mode "Per Tanggal" (Dilengkapi Pemilih Tanggal)**:
   Menampilkan mutasi uang laci khusus pada tanggal yang dipilih (misalnya memilih tanggal 12 Oktober 2026). Jika pada hari tersebut setoran yang diserahkan ke pemilik melebihi penerimaan hari itu (karena menyetorkan uang akumulasi dari hari-hari sebelumnya), sistem secara cerdas memberikan keterangan informatif: *"Termasuk setoran kas akumulasi hari sebelumnya"*.

---

## 5. Ringkasan Panduan Operasional untuk Staf Kasir

Agar pencatatan harian selalu rapi dan akurat, staf kasir cukup mengikuti panduan praktis berikut:

| Kebutuhan Transaksi | Menu yang Dipilih | Jenis | Kategori yang Dipilih | Efek ke Sistem |
|---|---|:---:|---|---|
| Beli obat darurat, reagen, atau BHP | **+ Kas Keluar** | Keluar | `Pengeluaran Obat / Operasional` | Memotong sisa uang laci & masuk ke beban operasional. |
| Beli token listrik PLN, air PDAM, WiFi | **+ Kas Keluar** | Keluar | `Operasional & Listrik/Air` | Memotong sisa uang laci & masuk ke beban operasional. |
| Beli makan siang, kopi, gorengan dokter, ATK | **+ Kas Keluar** | Keluar | `Pengeluaran Non Klinik` | Memotong sisa uang laci & masuk ke beban operasional. |
| Menyerahkan uang tunai laci ke dr. Ade Sofyan | **+ Kas Keluar** | Keluar | `Setor ke Rekening Pemilik` | **Memotong sisa fisik laci**, menambah saldo setoran pemilik, **TIDAK mengurangi laba operasional**. |
| Menyetorkan uang tunai laci ke rekening bank klinik | **+ Kas Masuk** / **+ Kas Keluar** | Keluar/Masuk | `Setor Tunai` | **Memotong sisa fisik laci** & menambah saldo bank klinik. |

---

## 6. Kesimpulan

Dengan pembaruan ini:
1. **Laba Operasional Bersih & Grafik Keuangan 100% Akurat**: Penyerahan uang tunai ke dr. Ade Sofyan tidak lagi memicu defisit fiktif pada grafik harian maupun laporan bulanan.
2. **Pencatatan Kas Kecil Fleksibel**: Pengeluaran di bawah Rp 10.000 (parkir, gorengan, fotokopi, admin bank) kini tersimpan presisi tanpa risiko menjadi jutaan rupiah.
3. **Uang Fisik Laci Kasir Selalu Cocok (*Klir*)**: Sisa fisik laci kasir otomatis terpotong saat ada uang keluar untuk operasional maupun setoran, menjamin akuntabilitas kasir loket setiap akhir hari.

Dokumen ini disusun untuk memberikan kejelasan penuh kepada manajemen dan staf Klinik Pratama Cikidang Medika demi terciptanya sistem informasi manajemen klinik yang profesional, transparan, dan akuntabel.
