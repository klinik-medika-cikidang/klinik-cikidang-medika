# Penjelasan & Panduan Pembaruan Sistem untuk dr. Ovan (Klinik Pratama Cikidang Medika)

Dokumen ini disusun untuk menjawab 4 poin masukan dan pertanyaan operasional dari **dr. Ovan** terkait sistem informasi klinik:

---

## 1. Poin 1: Menampilkan Tanggal Lahir pada Pencarian Pasien
> **Feedback dr. Ovan:** *"Malam om yang ini, minta tolong tampilin tanggal lahirnya juga, supaya bisa membedakan lebih rinci"*

### Penjelasan & Solusi:
- **Penyebab Sebelumnya:** Pada menu pencarian cepat (`Ctrl+K`) dan tabel pasien, nama-nama yang mirip atau umum (contoh: beberapa pasien anak bernama *"Faiz"*) hanya menampilkan Desa, Usia (misal: 3 tahun), dan NIK. Jika ada anak yang usianya sama dan berasal dari desa berdekatan atau NIK belum tercatat, dokter/staf loket sulit membedakan rekam medis pasien yang tepat dalam sekali lihat.
- **Pembaruan yang Diterapkan:**
  1. Pada dialog **Cari Pasien (`Ctrl+K`)**, kini langsung ditampilkan **Tanggal Lahir** pasien secara rinci dengan badge khusus (contoh: `Lahir: 14 Mei 2021`).
  2. Pada **Autocomplete Loket Pendaftaran & Program Khusus**, tanggal lahir juga langsung tertera di samping usia dan desa.
  3. Pada **Master Data Pasien & Antrean Kunjungan**, tanggal lahir disandingkan langsung di bawah nama pasien sehingga dokter dan staf loket tidak akan salah memilih berkas rekam medis.

---

## 2. Poin 2: Tanggal Lahir Bisa Langsung Di-Copy / Paste (Tidak Harus Diketik)
> **Feedback dr. Ovan:** *"yang ini tolong tanggalnya bisa dicopy/paste, gak harus diketik aja"*

### Penjelasan & Solusi:
- **Penyebab Sebelumnya:** Form pendaftaran pasien baru menggunakan input kalender standar browser (`<input type="date">`). Format bawaan ini sangat kaku dan menolak teks tanggal yang di-copy-paste langsung dari WhatsApp atau pesan pasien (misal format `15/08/1990` atau `15-08-1990`), sehingga staf terpaksa mengetik satu per satu angka tanggal, bulan, dan tahunnya.
- **Pembaruan yang Diterapkan (`FlexibleDateInput`):**
  1. **Dukungan Copy-Paste Penuh:** Staf kini bisa langsung menempel teks tanggal lahir dari WhatsApp dengan shortcut `Ctrl+V` atau klik kanan **Tempel (Paste)**.
  2. **Format yang Diterima Sangat Fleksibel:** Sistem otomatis mengenali berbagai format tanggal Indonesia:
     - `15/08/1990`, `15-08-1990`, `15.08.1990`
     - `1990-08-15` (format ISO)
     - `15 Agustus 1990` atau `15 Ags 1990` (teks bulan Indonesia)
     - `15081990` (8 digit angka langsung)
  3. **Tombol "Tempel" Otomatis:** Disediakan tombol khusus **"Tempel"** di sebelah kolom tanggal lahir. Cukup satu kali klik, tanggal dari clipboard langsung masuk.
  4. **Perhitungan Usia Otomatis:** Saat tanggal lahir ditempel atau dipilih, kolom **Usia (Tahun)** otomatis langsung terisi dan dihitung dengan tepat.
  5. **Tetap Tersedia Kalender:** Tombol ikon kalender tetap tersedia bagi staf yang ingin memilih tanggal lewat pop-up kalender.

---

## 3. Poin 3: Sistem Pencatatan Rujukan Bidan & Rekap Tahunan Bingkisan
> **Feedback dr. Ovan:** *"Mau nanya sistem rujukan dari bidannya klik yang mana yah om? Klo belum nnti buat option di sekitaran tindakan aja, sama tolong tampilkan data nama2 bidan yang merujuk, kami mendata pertahunnya untuk diberikan bingkisan ke bidan yang merujuk…"*

### Penjelasan & Solusi:
- **Kondisi Sebelumnya:** Kolom rujukan bidan (`bidan_rujukan`) sebelumnya sudah ada di database, namun di layar pemeriksaan dokter (`/rekam-medis`) belum disediakan tombol/pilihan langsung untuk dokter mengklik nama bidannya saat menginput tindakan. Akibatnya, dokter bingung harus klik di mana, dan tab laporan rujukan bidan tampak kosong jika tanggal yang difilter hanya hari itu saja.
- **Pembaruan yang Diterapkan:**
  1. **Pilihan Rujukan Bidan di Sekitar Bagian Tindakan:**
     - Pada layar **Pemeriksaan Dokter (E-Rekam Medis)**, tepat di bagian **4. Tindakan Klinis & Lab**, kini tersedia kotak khusus bertanda **"Rujukan Bidan"**.
     - Disediakan tombol-tombol cepat (*chips*) 9 nama bidan mitra klinik:
       - **Bidan Tari**
       - **Bidan Ulfah**
       - **Bidan Novi**
       - **Bidan Dewi**
       - **Bidan Nida**
       - **Bidan Ai**
       - **Bidan Trie**
       - **Bidan Rila**
       - **Bidan Desi**
     - Serta kolom untuk mengetik nama bidan lain jika ada rujukan dari bidan baru di luar daftar.
     - Dokter cukup mengklik 1 nama bidan, dan data langsung tersimpan rapi bersama tindakan medis pasien.
  2. **Tersedia Juga di Loket Pendaftaran:** Staf loket saat mendaftarkan pasien juga dapat langsung memilih nama bidan jika pasien membawa surat pengantar/rujukan bidan dari rumah.
  3. **Menu Khusus Rekap Tahunan Bingkisan Bidan (di Menu Laporan):**
     - Pada menu **Laporan > Tab Pemantauan Rujukan Bidan**, kini tersedia mode **"Rekap Tahunan (Bingkisan)"** dengan pilihan tahun (2026, 2025, 2024).
     - Seluruh nama bidan mitra ditampilkan lengkap dengan akumulasi jumlah rujukan dan jumlah pasien unik sepanjang tahun, diurutkan dari rujukan terbanyak.
     - Disediakan label alokasi bingkisan (Tier 1: Bingkisan Utama untuk rujukan terbanyak, Tier 2: Bingkisan Standar, Tier 3: Apresiasi).
     - Disediakan tombol **"Ekspor Excel (.xlsx)"** yang menghasilkan laporan rapi siap cetak untuk persiapan bingkisan akhir tahun.

---

## 4. Poin 4: Klarifikasi Mengenai Buku Kas vs. Uang Tunai Kasir
> **Feedback dr. Ovan:** *"Kalau yang ini buku kas dalam bentuk cash ya mksdnya om?"*

### Penjelasan Lengkap Konsep Finansial Sistem:
Sistem klinik memisahkan antara **Uang Kasir (Fisik)** dan **Buku Kas Operasional (Ledger)** agar pencatatan keuangan akuntabel dan tidak terjadi selisih atau kehilangan uang:

| Komponen | Arti & Bentuk Uang | Lokasi / Akun |
|---|---|---|
| **Loket Kasir (Kasir POS)** | Uang tunai **CASH FISIK** yang diterima kasir langsung dari pasien rawat jalan hari ini. | Fisik di laci kasir klinik. |
| **Buku Kas Operasional** | Pencatatan seluruh mutasi arus kas besar klinik (penerimaan kapitasi BPJS, pembelian obat, operasional, honor dokter, dan setoran kasir). | Pembukuan kas klinik & rekening bank. |
| **Rekonsiliasi Kasir & Setoran Tunai** | Jembatan pengawas/audit harian untuk mencocokkan uang cash di laci kasir dengan uang yang sudah disetorkan ke bank. | Indikator kontrol internal di menu Buku Kas. |

### Alur Operasional Sehari-hari:
1. Setiap pasien berobat dan membayar tunai di kasir, angka **"Uang Tunai di Laci Kasir (Fisik)"** akan bertambah. Uang ini secara nyata berada di **laci kasir**.
2. Di sore hari atau saat pergantian shift, kasir membawa uang tunai tersebut untuk disetorkan ke rekening bank klinik / rekening pemilik.
3. Setelah disetor, kasir atau admin mengklik tombol **"Catat Setor Tunai"** di menu Buku Kas.
4. Saldo di **Buku Kas Operasional** akan bertambah, dan kartu status akan otomatis berubah menjadi:
   - **"Selesai Disetor (Rp 0)"** dengan tanda centang hijau.
5. Jika kartu menunjukkan **"Sisa Fisik di Laci Kasir"** (misal Rp 1.005.000), artinya uang tersebut **MASIH BERBENTUK CASH FISIK DI LACI KASIR** dan belum dicatat disetorkan ke rekening bank klinik.
