# Dokumentasi Pembaruan Sistem: F-015 Laporan Puskesmas & Register Program Kesehatan

**Klinik Pratama Cikidang Medika**  
**Versi:** 1.2.0 (F-015 Release)  
**Tanggal Rilis:** 11 Oktober 2026  
**Penyusun:** Pengembang Sistem Informasi Klinik  
**Ditujukan Untuk:** dr. Ovan, dr. Neneng, Bidan Klinik, dan Staf Administrasi  

---

## 1. Ringkasan Eksekutif & Latar Belakang

Pembaruan **F-015** disusun untuk menindaklanjuti secara langsung masukan dan arahan klinis dari dokter pengelola Klinik Pratama Cikidang Medika terkait format baku pelaporan program kesehatan masyarakat ke **Puskesmas Cikidang (PKM)** yang diserahkan setiap akhir bulan.

Sebelum pembaruan ini, data register program kesehatan (ANC, Balita, Skrining PTM, Imunisasi, dan Triple Eliminasi) tersimpan secara umum tanpa pengelompokan bulanan dan belum mencantumkan hasil spesifik skrining laboratorium yang diwajibkan pihak Puskesmas.

Melalui pembaruan F-015, seluruh register program kesehatan kini telah distandarkan 100% mengikuti format pelaporan PKM bulanan dengan data dasar yang lengkap, pencatatan hasil skrining terpadu, dan format unduh Excel yang siap pakai.

---

## 2. Rincian Pembaruan Fitur

### 2.1. Standar Kolom Dasar Universal (Universal Baseline)
Setiap lembar laporan dan tampilan tabel register program kini wajib dan otomatis menyertakan 3 kolom informasi dasar:
1. **Tanggal Pemeriksaan (`tanggal_periksa`)**: Menunjukkan waktu riil pelayanan medis diberikan kepada pasien.
2. **Nomor Rekam Medis (`no_rm`)**: Mengidentifikasi pasien secara unik dengan nomor rekam medis resmi (9 digit baku klinik).
3. **Desa / Alamat Domisili (`desa`)**: Mencatat asal wilayah pasien (misalnya: *Cikidang, Pangkalan, Sampora, Cicareuh, Nangka Koneng*, dll.) yang menjadi tolok ukur utama pemantauan wilayah kerja Puskesmas.

### 2.2. Pemilih Periode Bulanan (Monthly Period Picker)
Pelaporan Puskesmas dilakukan secara rutin setiap akhir bulan berjalan. Sistem kini menyediakan kontrol penyaring bulan pada halaman **Program Khusus** (`/program-khusus`) dan **Laporan Puskesmas** (`/laporan`):
- Pilihan dropdown bulan dinamis (contoh: *Oktober 2026, September 2026, Agustus 2026*).
- Secara bawaan (*default*), sistem langsung membuka data bulan berjalan.
- Tersedia opsi *"Semua Periode"* apabila staf ingin melihat riwayat kumulatif keseluruhan.
- Ekspor berkas Excel secara otomatis menyesuaikan dengan periode bulan yang sedang dipilih.

### 2.3. Register Triple Eliminasi Ibu Hamil (HBsAg, HIV, Sifilis)
Sesuai regulasi Kementerian Kesehatan dan pedoman Puskesmas, program Triple Eliminasi untuk ibu hamil menuntut kepastian hasil skrining 3 infeksi menular. Sistem kini memfasilitasi:
- **Tiga Kolom Laboratorium Mandiri**:
  * `HBsAg` (Hepatitis B Surface Antigen): *Non-Reaktif* atau *Reaktif*
  * `HIV` (Human Immunodeficiency Virus): *Non-Reaktif* atau *Reaktif*
  * `Sifilis` (Treponema Pallidum): *Non-Reaktif* atau *Reaktif*
- **Pintasan Pengisian Cepat**: Tersedia tombol satu-klik *"Set Semua Non-Reaktif"* pada formulir input untuk mempercepat entri data skrining rutin bumil yang normal.
- **Tampilan Visual di Tabel**: Menampilkan indikator status masing-masing hasil uji laboratorium secara terpisah, jelas, dan kontras.

### 2.4. Register ANC (Pemeriksaan Kehamilan) dengan Notasi GPA
- Ditambahkan kolom formulir khusus untuk mencatat status obstetri ibu hamil dengan format baku **GPA (Gravida, Para, Abortus)**.
- Contoh: `G3P2A0` (Hamil ke-3, riwayat melahirkan 2 kali, riwayat keguguran 0 kali).
- Formulir input bersifat pengetikan manual fleksibel (*free text*) sehingga bidan atau dokter dapat langsung mengetikkan kode obstetri pasien tanpa batasan yang kaku.

### 2.5. Register PTM (Penyakit Tidak Menular): Hipertensi & Diabetes Melitus
Untuk sinkronisasi dengan laporan PTM Puskesmas, sistem menambahkan klasifikasi penyakit utama:
- **Hipertensi (Kardiovaskular)**: Terdeteksi otomatis dari diagnosa/tensi sistolik-diastolik atau dipilih manual.
- **Diabetes Melitus**: Terdeteksi otomatis dari diagnosa gula darah atau dipilih manual.
- **Filter Subkategori Cepat**: Pada menu Program Khusus kategori PTM, staf dapat mengklik filter chip: `[Semua PTM]`, `[Hipertensi]`, `[Diabetes Melitus]`, atau `[Lainnya]`.

### 2.6. Penyempurnaan Ekspor Berkas Excel Bulanan
Fitur unduh laporan Excel pada menu Laporan Puskesmas telah disempurnakan:
- Berkas Excel diunduh dengan penamaan otomatis berstempel bulan: `Laporan_Puskesmas_Klinik_Cikidang_YYYY-MM.xlsx`.
- Lembar kerja (*sheet*) terpisah untuk masing-masing program: *ANC, Balita, Skrining PTM, Imunisasi, Triple Eliminasi*.
- Seluruh sheet memuat kolom standar: *Tanggal, No RM, Nama Pasien, Jenis Kelamin, Usia, Desa/Alamat, Diagnosa, Parameter Spesifik (GPA / Hasil Lab HBsAg-HIV-Sifilis / Kategori PTM)*.

---

## 3. Panduan Operasional Singkat untuk Staf & Bidan

### Langkah Menginput Data Register Program Baru:
1. Buka menu **Program Khusus** dari bilah navigasi atas aplikasi.
2. Klik tombol hijau **"+ Catat Program"** di kanan atas.
3. Ketikkan Nama atau Nomor RM pasien (data desa dan identitas pasien akan terisi otomatis).
4. Pastikan **Tanggal Periksa** telah sesuai (otomatis tanggal hari ini).
5. Pilih **Kategori Program**:
   - Jika memilih **ANC**: Masukkan notasi GPA pada kotak *Status GPA Bumil* (misal: `G3P2A0`).
   - Jika memilih **Triple Eliminasi**: Pilih hasil masing-masing skrining *HBsAg, HIV, Sifilis* (atau klik tombol *Set Semua Non-Reaktif* jika seluruh hasil negatif).
   - Jika memilih **Skrining PTM**: Pilih kategori penyakit (*Hipertensi* atau *Diabetes Melitus*).
6. Masukkan hasil pemeriksaan penunjang/tindakan, lalu klik **"Simpan Data Program"**.

### Langkah Mengunduh Laporan Bulanan untuk Puskesmas:
1. Buka menu **Laporan** -> Tab **Laporan Puskesmas**.
2. Pilih periode bulan pelaporan pada dropdown bulan (misal: *Oktober 2026*).
3. Periksa ringkasan jumlah pasien per program pada tabel pratinjau.
4. Klik tombol **"Export Excel Laporan Bulanan"** di sudut kanan atas.
5. Berkas Excel siap dilampirkan atau dicetak untuk pelaporan ke Puskesmas Cikidang.

---

## 4. Rekayasa Basis Data & Verifikasi Teknis

### Migrasi Database (PostgreSQL Supabase)
- Berkas migrasi: `supabase/migrations/20261011_f015_puskesmas_reporting_enhancement.sql`.
- Penambahan kolom baru pada tabel `public.public_health_records`:
  * `tanggal_periksa` (DATE NOT NULL DEFAULT CURRENT_DATE)
  * `no_rm` (VARCHAR(20))
  * `desa` (VARCHAR(100))
  * `kategori_ptm` (VARCHAR(50))
- Indeks performa: `idx_public_health_records_tanggal_periksa` dan `idx_public_health_records_kategori_ptm`.
- **Hasil Migrasi Cloud**: Berhasil dieksekusi 100% pada lingkungan **Staging** (`jpqmnbtowvfctxciuktj`) dan **Production** (`aszjzvdmxudmoomdxttx`).
- **Backfill Data Historis**: Sebanyak **812 data register lama** telah berhasil diperbarui otomatis dengan data Tanggal Kunjungan, No RM, dan Nama Desa pasien yang tersinkronisasi.

### Hasil Verifikasi & Pengujian
- **Unit Test (Vitest)**: 18 dari 18 modul pengujian lulus (*100% pass*), termasuk pengujian klasifikasi PTM dan pembatalan antrean.
- **Pemeriksaan Tipe (TypeScript)**: `npx tsc --noEmit` menghasilkan **0 error** (*clean*).
- **Kompilasi Produksi (Next.js)**: `npm run build` sukses penuh, mencakup 12 rute statis/dinamis yang teroptimasi tanpa kendala.
- **Ponsel & Tablet Responsif**: Seluruh tabel register dan modal input telah diuji memiliki pembungkus gulir responsif (*overflow-x wrapper*) dan area sentuh minimal 44x44px.

---

*Dokumen ini diterbitkan sebagai catatan rilis resmi dan panduan operasional pembaruan sistem Klinik Pratama Cikidang Medika.*
