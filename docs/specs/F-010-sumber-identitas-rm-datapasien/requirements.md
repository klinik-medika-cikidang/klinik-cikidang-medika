---
id: F-010-REQ
feature: F-010
title: "Requirements: Sumber Identitas No RM dari DATAPASIEN"
status: draft
owner: "Developer"
last_updated: "2026-10-08"
last_verified_commit: unverified
related:
  - "design.md"
  - "tasks.md"
  - "../F-005-migrasi-data-lama/requirements.md"
  - "../F-009-kelengkapan-data-pemantauan-bidan/requirements.md"
  - "../../architecture/overview.md"
  - "../../../supabase/migrations/20261005_f010_datapasien_identity_source.sql"
---

# Requirements: F-010 Sumber Identitas No RM dari DATAPASIEN

## 1. Ringkasan Eksekutif

Klien melaporkan No RM tidak sesuai nama saat penginputan. Audit read-only membuktikan dua sebab
yang saling menumpuk:

1. **Data sumber lama.** Ekspor `REKAMMEDIS.csv` lama menyimpan No RM sebagai salinan manual
   ("cuma kopasan"), sehingga banyak nomor tertulis dengan nol depan hilang atau bergeser.
2. **Logika migrasi.** F-005/F-009 membangun master pasien dari `REKAMMEDIS.csv` dan menggabungkan
   pasien yang No RM-nya sama setelah nol depan dibuang, tanpa memeriksa nama. Pasien berbeda yang
   kebetulan berbagi kunci itu digabung dan kunjungannya berpindah orang.

**Pembaruan 2026-10-08.** Klinik sudah merapikan berkas sumber. Ekspor terbaru menormalkan seluruh
No RM ke 9 digit dan menyelaraskannya dengan master. Kebutuhan F-010 tetap: `DATAPASIEN` (kini
diekspor sebagai `DATA.csv`) adalah sumber otoritatif identitas dan No RM, sedangkan `REKAMMEDIS.csv`
hanya menyediakan kunjungan. Karena No RM sudah selaras, pemetaan kunjungan memakai No RM sebagai
kunci utama dan nama sebagai pengaman.

## 2. Konteks Masalah

### 2.1 Ekspor lama (sebelum 2026-10-08)

| Temuan | Jumlah |
|---|---|
| Baris `REKAMMEDIS` | 7.671 |
| Bentuk No RM: 8 / 9 / 10 digit | 1.294 / 6.048 / 320 |
| No RM `REKAMMEDIS` yang tidak ada di master | 1.009 |
| No RM Mentah dipakai lebih dari satu nama | 73 |
| Baris cocok No RM tetapi nama berbeda | 112 |
| Kelompok penggabungan F-009 yang mencampur orang berbeda | 15 (16 kunjungan) |

### 2.2 Ekspor terbaru (2026-10-08)

| Temuan | Jumlah |
|---|---|
| Baris master (`DATA.csv`) | 3.725 (semua 9 digit) |
| Baris `REKAMMEDIS` | 7.817 |
| Bentuk No RM `REKAMMEDIS` selain 9 digit | 1 |
| No RM `REKAMMEDIS` yang tidak ada di `DATA` | **0** |
| No RM master yang dipakai lebih dari satu nama | **0** |
| No RM `REKAMMEDIS` dipakai lebih dari satu nama | 42 (mayoritas varian nama orang yang sama) |
| Baris cocok No RM tetapi nama berbeda penuh | 33 (mayoritas typo atau nama kosong) |
| Nama `REKAMMEDIS` yang tidak ada di `DATA` | 30 |

Kesimpulan: keluhan "No RM berderet tidak sesuai nama" berasal dari **ekspor lama**. Klinik sudah
memperbaiki sumbernya, sehingga migrasi ulang akan jauh lebih bersih. Sisa 42 No RM bernama ganda dan
30 nama tak dikenal tetap perlu keputusan klinik.

### 2.3 Hasil yang diharapkan

- Setiap pasien memakai No RM dari master (`DATA`).
- Setiap kunjungan terhubung ke pasien yang benar.
- Tidak ada dua orang berbeda yang menyatu dalam satu baris pasien.
- Setiap keputusan pencocokan dapat diaudit dan ditinjau klinik.

## 3. Sumber Data & Peran

| Berkas | Peran | Kolom kunci |
|---|---|---|
| `DATA.csv` (3.725 baris) | **Master pasien & No RM otoritatif** | `No Rm Medis`, `Nama`, `Jenis Kelamin`, `Tanggal Lahir`, `Usia`, `Code Alamat`, `Alamat`, `No KTP`, `No JKN`, `No tlfn`, `Pekerjaan`, `Alergi Obat` |
| `REKAMMEDIS.csv` (7.817 baris) | **Log kunjungan** | `No RM`, `Nama`, `Tgl Pmrksan`, `Kode ICD`, `MONITOR`, biaya |

Di repo, master disimpan sebagai `docs/data/[DATA] Klinik Cikidang Medika  - DATAPASIEN .csv` dan
kunjungan sebagai `docs/data/[DATA] Klinik Cikidang Medika  - REKAMMEDIS.csv`. Ekspor lama
diarsipkan sebagai `*.bak-20261008.csv`.

Skema No RM: `[jenis kelamin 2 digit][kode desa 2 digit][urut 5 digit]`, nilai tersimpan 9 digit.

## 4. Goals & Non-Goals

### Goals

- **G-001**: Master pasien dibangun dari `DATA`; setiap No RM pasien sama dengan `No Rm Medis`
  (bentuk 9 digit).
- **G-002**: 100% kunjungan `REKAMMEDIS` tetap ada (7.817 baris) dan terhubung ke pasien benar.
- **G-003**: Nol penggabungan dua orang berbeda. Nama berbeda tetap menjadi pasien tersendiri.
- **G-004**: Setiap baris kunjungan dicatat di tabel audit dengan aturan dan statusnya.
- **G-005**: Klinik menerima daftar baris yang butuh tinjauan manual.
- **G-006**: Generator No RM aplikasi meneruskan urutan dari nomor master.

### Non-Goals

- **NG-001**: Memperbaiki berkas sumber Sheets klinik (developer hanya menyediakan laporan).
- **NG-002**: Integrasi BPJS P-Care (tetap dilarang).
- **NG-003**: Data retail Emerys Glow (tetap di luar lingkup).
- **NG-004**: Menggabungkan otomatis pasien berbeda tanpa bukti identitas.

## 5. Aktor

### ACTOR-001 Operator Developer

Menjalankan impor ke staging, membangun audit, mempromosikan ke produksi dengan flag konfirmasi.
Memakai kunci service-role lewat env.

### ACTOR-002 Dokter/Admin Klinik

Meninjau baris `PERLU_TINJAUAN` dari `public.v_patient_identity_review` dan memutuskan apakah dua
baris memang orang yang sama.

## 6. Preconditions

- PRE-001: Backup produksi terbaru sudah dibuat (`scripts/backup-clinic-data.mjs`).
- PRE-002: `DATA.csv` dan `REKAMMEDIS.csv` terbaru tersedia di `docs/data/`.
- PRE-003: Tidak ada aktivitas tulis dari aplikasi ke tabel yang akan diubah.
- PRE-004: Migrasi DDL `20261005_f010_datapasien_identity_source.sql` sudah diterapkan.

## 7. Functional Requirements

### FR-001 Master pasien bersumber dari DATA

Sistem HARUS membangun `public.patients` dari `DATA.csv`, dengan No RM disimpan sebagai 9 digit
hasil `public.normalize_rm`.

- **AC-001.1**: Given baris `DATA`, when dibangun, then `patients.no_rm` sama dengan `No Rm Medis`
  yang dipadankan ke 9 digit.
- **AC-001.2**: Given baris `DATA` yang `No Rm Medis`-nya bukan 8 atau 9 digit, when dibangun, then
  baris dilaporkan dan No RM tidak ditebak.
- **AC-001.3**: Given dua baris `DATA` berbeda, when dibangun, then keduanya tetap pasien terpisah.

### FR-002 Kunjungan dipetakan lewat No RM dengan pengaman nama

Sistem HARUS memetakan setiap baris `REKAMMEDIS` ke satu pasien memakai presedensi Bagian 8, dan
HARUS selalu menghasilkan tepat satu pasien atau status `PERLU_TINJAUAN`.

- **AC-002.1**: Given No RM kunjungan ada di master dan nama identik, when dipetakan, then pasien itu
  dipakai (status `COCOK`).
- **AC-002.2**: Given No RM kunjungan ada di master tetapi nama berbeda penuh, when nama itu cocok
  tepat satu pasien lain, then pasien hasil nama dipakai dan baris dicatat sebagai koreksi.
- **AC-002.3**: Given nama tidak ditemukan pada pasien mana pun, when dipetakan, then baris
  berstatus `PERLU_TINJAUAN` dan kunjungan tidak hilang.

### FR-003 Tidak ada penggabungan tanpa bukti

Sistem TIDAK BOLEH menggabungkan dua pasien berbeda menjadi satu baris.

- **AC-003.1**: Given dua pasien nama berbeda dan tanggal lahir berbeda, when No RM-nya setara, then
  keduanya tetap pasien terpisah.
- **AC-003.2**: Given penggabungan F-009 yang salah, when migrasi ulang dijalankan, then pasien
  terserap dikembalikan dan kunjungannya dikembalikan padanya.

### FR-004 Audit identitas

Sistem HARUS mencatat setiap keputusan pemetaan di `public.patient_identity_audit`.

- **AC-004.1**: Given baris kunjungan diproses, when selesai, then ada tepat satu baris audit untuk
  `(source_table, source_row)` itu.
- **AC-004.2**: Given aturan yang dipakai, when baris ditulis, then kolom `rule` salah satu dari
  himpunan pada Bagian 8.
- **AC-004.3**: Given baris dengan `rule` bernuansa tinjauan, when dibaca, then `status` bukan `COCOK`.

### FR-005 Daftar tinjauan klinik

Sistem HARUS menyediakan `public.v_patient_identity_review` yang menampilkan baris ber-status bukan
`COCOK`, berisi No RM salinan, nama, No RM hasil, aturan, dan status.

- **AC-005.1**: Given ada baris `PERLU_TINJAUAN`, when view dibaca, then semua baris itu tampil.
- **AC-005.2**: Given tidak ada baris bermasalah, when view dibaca, then hasilnya kosong.

### FR-006 Integritas kunjungan dan buku kas

Sistem HARUS mempertahankan jumlah kunjungan dan transaksi kas.

- **AC-006.1**: Given migrasi selesai, when dihitung, then `public.visits` berjumlah 7.817 baris.
- **AC-006.2**: Given migrasi selesai, when dihitung, then `public.cash_flows` jumlahnya sama dengan
  hitungan sumber.
- **AC-006.3**: Given data program (TBC, sunat, post-care, register kesehatan), when master pasien
  dibangun ulang, then referensi program dibangun ulang dari sumber dan tidak menggantung.

### FR-007 Generator No RM mengikuti skema master

Aplikasi HARUS menawarkan No RM lanjutan pada prefix `[jenis kelamin][desa]` dengan urutan terbesar
dari nomor master pada prefix yang sama, bukan hanya nomor berformat dash.

- **AC-007.1**: Given prefix Laki-laki + Cikidang, when pasien baru didaftarkan, then nomor
  melanjutkan urutan tertinggi prefix itu.
- **AC-007.2**: Given nomor master 9 digit pada prefix itu, when urutan dihitung, then nomor itu ikut
  diperhitungkan.

### FR-008 Idempoten dan dapat diulang

Sistem HARUS dapat dijalankan berulang tanpa mengubah hasil.

- **AC-008.1**: Given migrasi dijalankan dua kali, when dijalankan kedua, then tidak ada baris baru
  dan tidak ada nomor yang berubah.
- **AC-008.2**: Given `--dry-run`, when dijalankan, then tidak ada perubahan tertulis dan laporan
  tetap dihasilkan.

## 8. Business Rules

### BR-001 Presedensi pencocokan kunjungan ke pasien

| Urutan | Aturan (`rule`) | Kondisi | Status |
|---|---|---|---|
| 1 | `RM_NAMA_IDENTIK` | No RM cocok dan nama identik | `COCOK` |
| 2 | `RM_NAMA_VARIAN` | No RM cocok dan nama berbagi kata | `COCOK` |
| 3 | `NAMA_UNIK` | Nama cocok tepat satu pasien (No RM salinan menunjuk orang lain atau kosong) | `COCOK` |
| 4 | `NAMA+TIEBREAK` | Nama cocok beberapa; jenis kelamin, desa, tanggal lahir menyisakan satu | `COCOK` |
| 5 | `NAMA_AMBIGU` | nama cocok beberapa tanpa pembeda; dipilih deterministik | `PERLU_TINJAUAN` |
| 6 | `RM_SAJA` | hanya No RM cocok, nama tidak terpakai (misalnya "-") | `PERLU_TINJAUAN` |
| 7 | `TIDAK_KETEMU` | tidak ada yang cocok | `PERLU_TINJAUAN` |

- **BR-002**: Karena No RM terbaru sudah selaras, No RM menjadi kunci utama. Nama dipakai sebagai
  pengaman ketika No RM dan nama bertentangan.
- **BR-003**: No RM salinan tidak pernah menjadi satu-satunya dasar penggabungan dua pasien.
- **BR-004**: Nomor yang tidak 8 atau 9 digit tidak ditebak; baris dilaporkan.
- **BR-005**: Kunjungan tidak boleh hilang. Bila tidak ada pasien cocok, kunjungan tetap dibuatkan
  pasien (status `BARU`) dan dilaporkan.
- **BR-006**: Nama ternormalisasi adalah huruf kecil, non-huruf menjadi spasi, spasi ganda diciutkan.

## 9. Invariants

- **INV-001**: Tidak ada dua `patients.no_rm` yang sama.
- **INV-002**: Jumlah `public.visits` sebelum dan sesudah migrasi sama (7.817).
- **INV-003**: Setiap `visits.pasien_id` menunjuk pasien yang masih ada.
- **INV-004**: Tidak ada baris audit ganda untuk `(source_table, source_row)`.
- **INV-005**: Setiap pasien dari master menyimpan `sumber_data = 'DATAPASIEN'` bila kolom tersedia.
- **INV-006**: Menjalankan ulang migrasi tidak mengubah jumlah baris.

## 10. Error dan Keadaan Kosong

- **ERR-001**: Bila berkas sumber tidak ada, sistem menolak jalan dan menyebut nama berkas.
- **ERR-002**: Bila `staging` belum dimuat, sistem menolak jalan sebelum menghapus data apa pun.
- **ERR-003**: Bila target produksi tanpa flag konfirmasi, sistem berhenti.
- **ERR-004**: Bila view tinjauan kosong, tampilkan "Tidak ada baris yang perlu ditinjau".

## 11. Non-Functional Requirements

- **NFR-SEC-001**: Kunci service-role hanya dipakai skrip operator.
- **NFR-SEC-002**: `docs/data/` tetap gitignored; dokumen terlacak bebas PII.
- **NFR-REL-001**: Migrasi destruktif wajib didahului backup dan dijalankan di staging lebih dulu.
- **NFR-PERF-001**: Pemetaan 7.817 baris selesai di bawah 2 menit.
- **NFR-AUDIT-001**: Setiap perubahan pemetaan dapat ditelusuri ke satu baris audit.

## 12. Dependencies

- **DEP-001**: `supabase/migrations/20261005_f010_datapasien_identity_source.sql`.
- **DEP-002**: `docs/data/DATA` (master) dan `REKAMMEDIS.csv` terbaru.
- **DEP-003**: `scripts/reconcile-clinic-data.mjs` untuk membangun ulang data program turunan.

## 13. Asumsi

- **ASM-001**: `DATA.csv` adalah master pasien yang sudah dibersihkan klinik dan dipercaya.
- **ASM-002**: Produksi sudah dipakai sejak 8 Oktober 2026 (tercatat 1 kunjungan baru). Migrasi
  tidak boleh menghilangkan data baru ini.
- **ASM-003**: Keputusan OQ-001 dan OQ-002 diperoleh sebelum promosi produksi.
- **ASM-004**: Migrasi diuji penuh di staging sebelum menyentuh produksi.

## 14. Open Questions

| ID | Pertanyaan | Pemilik | Blocking? | Resolusi |
|---|---|---|---|---|
| OQ-001 | 30 nama kunjungan yang tidak ada di master: pasien baru atau salah tulis? | Klinik | Yes | Pending |
| OQ-002 | Untuk 42 No RM bernama ganda dan 33 nama berbeda, mana yang orang sama? | Klinik | No | Pending |
| OQ-003 | Nomor lama (8/10 digit) tetap perlu dicari lewat `no_rm_lama`? | Klinik | No | Pending |
| OQ-004 | Produksi sudah aktif dipakai. Migrasi memakai koreksi di tempat (pertahankan `id`) atau rebuild dengan pemulihan data baru? | Developer | Yes | Pending |

## 15. Approval

- Product owner: dr. Ovan / dr. Neneng (via perantara)
- Status: DRAFT
- Approved date: Pending
- Notes: Menunggu konfirmasi OQ-001 sebelum promosi produksi.
