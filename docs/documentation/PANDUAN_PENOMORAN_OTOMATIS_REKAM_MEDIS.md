# Panduan Penomoran Otomatis Rekam Medis (No RM) Berkelanjutan

**Klinik Pratama Cikidang Medika**  
**Dokumen:** Panduan Operasional & Penjelasan Teknis Fitur F-017  
**Sasaran:** dr. Ovan, dr. Neneng, Petugas Loket Pendaftaran, dan Staf Medis Klinik  

---

## 1. Ringkasan & Latar Belakang

Menjawab masukan dan pertanyaan dari **dr. Ovan**:
> *"Untuk No RM otomatisnya bisa dari no urut DATA Google Sheet gak yah? Biar gak kecampur No RM yang saat ini, apa gimana baiknya?"*

Sistem aplikasi web Klinik Pratama Cikidang Medika telah menerapkan **Sistem Penomoran Otomatis Berkelanjutan (*Continuous Auto-Generation*)** yang secara cerdas menyambung langsung dari nomor urut terakhir data Google Sheet klinik tanpa mengubah format resmi yang sudah berjalan selama ini.

---

## 2. Struktur Format Baku No RM (9 Digit Tanpa Strip)

Sesuai standar operasional Klinik Pratama Cikidang Medika, nomor rekam medis terdiri dari **9 digit angka murni** (tanpa spasi dan tanpa tanda strip `-`) yang tersusun atas 3 bagian:

$$\underbrace{\mathbf{01}}_{\text{Jenis Kelamin}} \quad \underbrace{\mathbf{01}}_{\text{Kode Desa}} \quad \underbrace{\mathbf{03741}}_{\text{Nomor Urut}}$$

| Bagian | Jumlah Digit | Arti / Keterangan | Contoh |
|---|---|---|---|
| **Digit 1 – 2** | 2 Digit | **Kode Jenis Kelamin** | `01` = Laki-laki<br>`02` = Perempuan |
| **Digit 3 – 4** | 2 Digit | **Kode Wilayah Desa** | `01` = Cikidang<br>`02` = Pangkalan<br>`03` = Sampora<br>`...` dst. (13 kode desa resmi) |
| **Digit 5 – 9** | 5 Digit | **Nomor Urut Pendaftaran** | `03741`, `03742`, `03743`, dst. |

---

## 3. Titik Mulai Penomoran Baru (Melanjutkan Google Sheet)

### Mengapa Dimulai dari Nomor `3741`?
1. Berkas Google Sheet klinik (`DATAPASIEN` & `REKAMMEDIS`) mencatat sebanyak **3.750 pasien aktif**.
2. Nomor urut tertinggi pasien historis berada pada angka **`3740`** (tercatat pada data tindakan sunat dan pasien lama).
3. Agar berkas pasien baru **100% tidak pernah bertabrakan, tertukar, atau menimpa** 3.750 data pasien lama yang sudah ada di buku register fisik maupun Google Sheet, sistem menetapkan batas awal (*baseline floor*) penomoran otomatis pada angka **`3741`**.

### Contoh Hasil Penomoran Pasien Baru di Web:
- **Pasien A** (Laki-laki, Desa Cikidang):  
  $\rightarrow$ Mendapatkan No RM: `010103741`
- **Pasien B** (Perempuan, Desa Pangkalan):  
  $\rightarrow$ Mendapatkan No RM: `020203742`
- **Pasien C** (Perempuan, Luar Wilayah / Cicareuh):  
  $\rightarrow$ Mendapatkan No RM: `021303743`

Semua nomor baru langsung melanjutkan riwayat klinik dengan rapi.

---

## 4. Keunggulan Sistem & Jaminan Keamanan Data

1. **Pasti Aman dari Nomor Ganda (Anti-Duplikasi Real-Time)**  
   Sebelum nomor dimunculkan di layar, sistem memeriksa seluruh basis data klinik secara *real-time*. Jika nomor urut tersebut sudah pernah dipakai, sistem secara otomatis melompat ke nomor berikutnya yang masih kosong.

2. **Dua Opsi: Otomatis Instan & Edit Manual**  
   - **Otomatis Instan:** Saat petugas loket memilih Jenis Kelamin dan Desa, sistem langsung mengisi kolom No RM secara otomatis tanpa perlu dihitung manual.
   - **Edit Manual:** Jika pasien yang datang adalah pasien lama yang membawa kartu berobat fisik lama, petugas loket tetap dapat mengetikkan nomor rekam medis lama tersebut secara bebas.
   - **Tombol Pintas:** Terdapat tombol kecil berikon petir *(Generate Otomatis)* di samping kolom input untuk memperbarui nomor jika petugas mengubah data desa atau jenis kelamin.

3. **Kompatibel Penuh dengan Pencarian Loket & Kasir**  
   Format 9 digit ini seragam di seluruh aplikasi (pencarian pasien, riwayat periksa dokter, struk kuitansi kasir, dan ekspor berkas Excel bulanan).

---

## 5. Panduan Praktis untuk Petugas Loket Pendaftaran

Langkah pendaftaran pasien baru di aplikasi:

1. Buka menu **Loket & Kasir** (`/pendaftaran`).
2. Klik tombol hijau **"+ Pasien Baru"**.
3. Pilih **Sapaan** (*Tn., Ny., Nn., An., By.*) $\rightarrow$ sistem otomatis memilih jenis kelamin yang sesuai.
4. Pilih **Desa / Domisili Pasien** $\rightarrow$ kolom **No Rekam Medis** akan langsung terisi otomatis (misal: `010103741`).
5. Lengkapi identitas lainnya (Nama Lengkap, Tanggal Lahir, Jenis Pasien BPJS/Umum, Alamat).
6. Klik **"Simpan Pasien"**. Pasien langsung siap didaftarkan ke antrean pemeriksaan dokter hari ini.

---

*Dokumen ini diterbitkan oleh Pengembang Sistem sebagai dokumentasi resmi fitur aplikasi Klinik Pratama Cikidang Medika.*
