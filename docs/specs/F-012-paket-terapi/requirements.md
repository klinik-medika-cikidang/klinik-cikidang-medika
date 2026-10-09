---
id: F-012-REQ
feature: F-012
title: "Paket Terapi"
status: approved
owner: "Developer"
created: "2026-10-08"
last_updated: "2026-10-09"
last_verified_commit: "68c8af6"
source_of_truth_for:
  - "Paket terapi behavior"
  - "Aturan penerapan paket terapi ke kunjungan"
related:
  - "../../product/prd.md"
  - "../F-001-master-pasien-kasir/requirements.md"
  - "../F-002-rekam-medis-dokter/requirements.md"
  - "../F-008-rm-rbac-kesehatan-piutang/requirements.md"
supersedes: null
superseded_by: null
---

# Requirements: F-012 Paket Terapi

> Change Request Post-MVP. Fitur ini berada di luar lingkup resmi MVP (F-001 s/d F-006) dan
> TIDAK BOLEH diimplementasikan sebelum client memberi persetujuan tertulis. Lihat Section 16.

## 1. Summary

F-012 memungkinkan klinik mendefinisikan sekali sebuah **paket terapi**: bundel bernama yang berisi
satu atau beberapa item tindakan (`tindakan`) dan/atau obat, dengan satu harga total. Paket yang sudah
didefinisikan lalu dapat **diterapkan ke sebuah kunjungan pasien** sehingga penagihan kasir menjadi satu
langkah, bukan mengetik ulang setiap item dan nominalnya.

Fitur ini melengkapi alur kasir yang sudah ada. Nilai tagihan kunjungan tetap disimpan pada kolom yang
sudah dipakai hari ini (`visits.pendapatan_lain` dan `visits.keterangan_pendapatan`), sehingga tidak
menambah sumber kebenaran tagihan baru.

## 2. Problem

Perilaku saat ini, diverifikasi terhadap kode pada 2026-10-08:

- Rincian tindakan dan obat dimasukkan manual per kunjungan. `visits.tindakan` hanya menampung satu
  label tindakan (`VARCHAR(100)`), `visits.keterangan_tindakan` dan `visits.terapi_obat` menampung teks
  bebas, dan nominal tambahan diisi terpisah pada `visits.pendapatan_lain` dengan penjelasan pada
  `visits.keterangan_pendapatan` (lihat `src/app/pendaftaran/page.tsx` pada `handleSettlePayment` dan
  `src/components/pendaftaran/CashierPosPanel.tsx`).
- Layanan yang berulang (misalnya paket infus, paket perawatan luka, paket vitamin) memaksa staf kasir
  dan dokter mengetik daftar item dan nominal yang sama pada setiap kunjungan. Ini rawan salah hitung,
  lambat pada jam sibuk, dan menghasilkan penamaan item yang tidak konsisten antar kunjungan.
- Tidak ada tempat terpusat untuk menetapkan harga resmi sebuah bundel. Harga yang disepakati pemilik
  hanya hidup di kepala staf atau di catatan terpisah.

Expected outcome:

- Pemilik dapat mendefinisikan paket terapi beserta item dan harga totalnya sekali, lalu mengubahnya
  kapan saja.
- Staf dapat menerapkan satu paket ke kunjungan pasien dalam satu langkah, dan rincian item langsung
  mengisi kolom tindakan, terapi obat, serta nominal tagihan kunjungan.
- Harga paket yang pernah diterapkan pada kunjungan lama tidak berubah ketika harga paket diperbarui.

## 3. Goals

- G-001: Pemilik dapat membuat paket terapi berisi minimal satu item dan satu harga total dalam satu
  alur.
- G-002: Staf dapat menerapkan paket aktif ke kunjungan pasien dalam satu aksi tanpa mengetik ulang
  item.
- G-003: Penerapan paket mengisi `visits.terapi_obat`, `visits.tindakan` / `visits.keterangan_tindakan`,
  `visits.pendapatan_lain`, dan `visits.keterangan_pendapatan` secara konsisten.
- G-004: Nilai tagihan yang pernah tercatat tetap dapat diaudit walau definisi paket diubah atau
  dinonaktifkan kemudian.
- G-005: Daftar paket dapat dicari dan dipilih dengan cepat, dan paket nonaktif tidak lagi dapat
  diterapkan ke kunjungan baru.

## 4. Non-Goals

- NG-001: Integrasi BPJS P-Care API. Data BPJS tetap tercatat internal saja.
- NG-002: Master data obat dan stok farmasi (pengurangan stok per butir, harga beli, kedaluwarsa).
  Paket hanya menyimpan nama item dan harga jual.
- NG-003: Klaim asuransi, kapitasi otomatis, atau perhitungan bagi hasil.
- NG-004: Paket berlangganan (membership) dan penjadwalan paket multi-kunjungan otomatis.
- NG-005: Perubahan pada modul yang sudah ada (`rekam-medis`, `buku-kas`, `laporan`) di luar titik
  integrasi kasir yang disebut di F-012.
- NG-006: Data retail skincare Emerys Glow.

## 5. Actors

### ACTOR-001 - Pemilik (`owner`)

Akses penuh. Membuat, mengubah, mengaktifkan, dan menonaktifkan paket terapi beserta item dan harganya.
Dapat pula menerapkan paket ke kunjungan.

### ACTOR-002 - Staf Klinik (`dokter_admin`)

Peran runtime ini mencakup peran lama `dokter` dan `kasir` (lihat F-008). Staf dapat membaca paket aktif
dan menerapkan paket ke kunjungan sebagai bagian dari alur pemeriksaan dan penagihan, tetapi TIDAK BOLEH
membuat, mengubah, atau menonaktifkan definisi paket.

## 6. Preconditions

- PRE-001: Pengguna sudah terautentikasi melalui Supabase Auth dan memiliki profil peran (`owner` atau
  `dokter_admin`).
- PRE-002: Tabel `patients`, `visits`, dan `doctors` sudah ada dan terisi sesuai kondisi saat ini.
- PRE-003: Migrasi F-012 (tabel paket terapi) sudah diterapkan pada proyek Supabase yang dituju.

## 7. Functional Requirements

### FR-001 - Membuat Paket Terapi

The system shall let `owner` create a named therapy package with a code, a description, and a list of
items.

Acceptance criteria:

- AC-001.1: KETIKA `owner` membuka formulir paket baru dan mengisi nama, minimal satu item, dan
  menyimpannya, MAKA sistem HARUS membuat satu baris pada tabel paket terapi beserta baris itemnya.
- AC-001.2: KETIKA nama paket kosong atau lebih pendek dari 2 karakter, MAKA sistem HARUS menolak
  penyimpanan dan menampilkan pesan Bahasa Indonesia yang dapat dibaca.
- AC-001.3: KETIKA kode paket yang diisi sudah dipakai paket lain, MAKA sistem HARUS menolak penyimpanan
  dengan pesan "Kode paket sudah digunakan".
- AC-001.4: KETIKA `owner` belum menambahkan satu item pun, MAKA sistem HARUS menonaktifkan tombol simpan
  dan menjelaskan bahwa paket wajib memiliki minimal satu item.
- AC-001.5: KETIKA penyimpanan berhasil, MAKA paket HARUS berstatus aktif secara default.

### FR-002 - Mengubah Paket Terapi

The system shall let `owner` edit a package's name, code, description, and items.

Acceptance criteria:

- AC-002.1: KETIKA `owner` mengubah nama atau deskripsi paket lalu menyimpan, MAKA perubahan HARUS
  tersimpan dan tercermin pada daftar paket.
- AC-002.2: KETIKA `owner` menambah, mengubah, atau menghapus item paket lalu menyimpan, MAKA harga total
  paket HARUS dihitung ulang dari item yang tersisa.
- AC-002.3: KETIKA penyimpanan perubahan gagal karena gangguan jaringan, MAKA sistem HARUS menampilkan
  pesan kesalahan Bahasa Indonesia dan TIDAK BOLEH menampilkan perubahan sebagai berhasil.
- AC-002.4: KETIKA paket sudah pernah diterapkan pada kunjungan, MAKA perubahan definisi TIDAK BOLEH
  mengubah rincian penerapan yang sudah tersimpan pada kunjungan tersebut.

### FR-003 - Menonaktifkan dan Mengarsipkan Paket

The system shall let `owner` deactivate a package instead of deleting it.

Acceptance criteria:

- AC-003.1: KETIKA `owner` menonaktifkan paket, MAKA paket HARUS tetap tersimpan dengan penanda tidak
  aktif dan TIDAK BOLEH muncul sebagai pilihan penerapan pada kunjungan baru.
- AC-003.2: KETIKA sebuah paket sudah pernah diterapkan pada minimal satu kunjungan, MAKA sistem TIDAK
  BOLEH menghapus permanen paket tersebut; yang tersedia hanya menonaktifkan.
- AC-003.3: KETIKA `owner` mengaktifkan kembali paket nonaktif, MAKA paket HARUS kembali muncul sebagai
  pilihan penerapan, dengan syarat paket masih memiliki minimal satu item.
- AC-003.4: KETIKA paket dinonaktifkan, MAKA kunjungan yang sudah memakai paket tersebut TIDAK BOLEH
  berubah rinciannya.

### FR-004 - Kelola Item Paket

The system shall let `owner` manage the items inside a package.

Acceptance criteria:

- AC-004.1: KETIKA `owner` menambahkan item, MAKA sistem HARUS meminta jenis item (`TINDAKAN`, `OBAT`,
  atau `LAIN`), nama item, kuantitas, dan harga satuan.
- AC-004.2: KETIKA kuantitas diisi kurang dari atau sama dengan nol, MAKA sistem HARUS menolak nilai
  tersebut dan menampilkan pesan validasi.
- AC-004.3: KETIKA harga satuan diisi kurang dari nol, MAKA sistem HARUS menolak nilai tersebut.
- AC-004.4: Subtotal tiap item HARUS dihitung sebagai kuantitas dikali harga satuan dan ditampilkan
  dalam format Rupiah.
- AC-004.5: Urutan item HARUS dapat diatur ulang oleh `owner` dan tersimpan, agar rincian kunjungan
  tercetak dalam urutan yang konsisten.

### FR-005 - Penanganan Harga Paket

The system shall store and display package prices consistently with existing monetary rules.

Acceptance criteria:

- AC-005.1: Harga total paket HARUS disimpan sebagai `NUMERIC(15,2)` dan ditampilkan melalui
  `formatRupiah` dengan awalan `Rp` dan pemisah ribuan Indonesia.
- AC-005.2: KETIKA nilai item berubah, MAKA harga total HARUS merupakan jumlah subtotal seluruh item,
  bukan angka yang diketik bebas oleh pengguna.
- AC-005.3: KETIKA harga total paket bernilai nol, MAKA sistem HARUS tetap mengizinkan penyimpanan
  (misalnya paket layanan tanpa biaya tambahan), tetapi HARUS menandainya secara jelas pada tampilan.
- AC-005.4: Harga HARUS ditampilkan dengan tipografi angka tabular agar digit sejajar vertikal.

### FR-006 - Daftar dan Pencarian Paket

The system shall present a searchable list of packages.

Acceptance criteria:

- AC-006.1: KETIKA halaman daftar paket dibuka, MAKA sistem HARUS menampilkan nama paket, kode, jumlah
  item, harga total, dan status aktif tiap paket.
- AC-006.2: KETIKA pengguna mengetik pada kolom pencarian, MAKA daftar HARUS disaring berdasarkan nama
  atau kode paket secara instan di sisi klien.
- AC-006.3: KETIKA tidak ada paket yang cocok dengan pencarian, MAKA sistem HARUS menampilkan empty state
  yang menyebut kata kunci dan menyediakan aksi untuk menghapus filter.
- AC-006.4: KETIKA belum ada paket sama sekali, MAKA sistem HARUS menampilkan empty state dengan aksi
  utama "Buat Paket Pertama" bagi `owner`, dan pesan informatif tanpa aksi bagi `dokter_admin`.

### FR-007 - Terapkan Paket ke Kunjungan

The system shall apply an active package to a patient visit in one action.

Acceptance criteria:

- AC-007.1: KETIKA staf memilih paket aktif pada alur kasir atau kunjungan lalu mengonfirmasi, MAKA
  sistem HARUS mengisi `visits.terapi_obat` dengan item bertipe `OBAT`, mengisi
  `visits.tindakan` atau `visits.keterangan_tindakan` dengan item bertipe `TINDAKAN`, menambahkan
  harga total paket ke `visits.pendapatan_lain`, dan menambahkan nama paket ke
  `visits.keterangan_pendapatan`.
- AC-007.2: KETIKA paket diterapkan pada kunjungan pasien `UMUM`, MAKA harga total paket HARUS
  ditambahkan ke nominal tagihan tanpa mengubah `visits.biaya_periksa`.
- AC-007.3: KETIKA paket diterapkan pada kunjungan pasien `BPJS`, MAKA `visits.biaya_periksa` TIDAK BOLEH
  diubah dari nol dan nilai paket HARUS tetap tercatat pada `visits.pendapatan_lain` beserta
  keterangannya.
- AC-007.4: KETIKA paket diterapkan, MAKA `visits.keterangan_pendapatan` HARUS memuat nama paket sehingga
  rincian dapat dipertanggungjawabkan pada kuitansi.
- AC-007.5: KETIKA tidak ada paket aktif yang tersedia, MAKA sistem HARUS menampilkan empty state dan
  TIDAK BOLEH menonaktifkan alur penagihan manual yang sudah ada.
- AC-007.6: KETIKA pengguna membatalkan penerapan paket, MAKA tidak ada kolom kunjungan yang berubah.

### FR-008 - Rekam Jejak dan Pencegahan Penerapan Ganda

The system shall record each application and prevent accidental double application.

Acceptance criteria:

- AC-008.1: KETIKA paket diterapkan ke sebuah kunjungan, MAKA sistem HARUS menulis satu baris rekam
  jejak penerapan yang memuat identitas paket, nama paket saat diterapkan, harga total saat diterapkan,
  dan salinan item saat diterapkan.
- AC-008.2: KETIKA harga paket diubah setelah penerapan, MAKA rekam jejak penerapan sebelumnya HARUS
  tetap menampilkan harga dan item yang berlaku saat paket diterapkan.
- AC-008.3: KETIKA paket yang sama sudah pernah diterapkan pada kunjungan yang sama, MAKA sistem HARUS
  memperingatkan bahwa paket sudah diterapkan dan HARUS meminta konfirmasi eksplisit sebelum menerapkan
  lagi; sistem TIDAK BOLEH menambah nilai secara diam-diam.
- AC-008.4: KETIKA sebuah paket dihapus dari sistem tanpa pernah diterapkan, MAKA rekam jejak yang
  merujuk padanya HARUS diperlakukan secara aman dan tidak menyebabkan kegagalan tampilan kunjungan.

### FR-009 - Hak Akses Paket Terapi

The system shall enforce package permissions.

Acceptance criteria:

- AC-009.1: KETIKA pengguna dengan peran `dokter_admin` membuka halaman master paket, MAKA sistem HARUS
  menampilkan daftar dalam mode baca saja tanpa tombol buat, ubah, aktifkan, atau nonaktifkan.
- AC-009.2: KETIKA pengguna dengan peran `dokter_admin` mencoba menyimpan perubahan definisi paket, MAKA
  sistem HARUS menolak aksi tersebut, baik dari antarmuka maupun pada lapisan basis data.
- AC-009.3: KETIKA pengguna dengan peran `owner` membuka halaman master paket, MAKA seluruh aksi
  pengelolaan HARUS tersedia.
- AC-009.4: Hak akses HARUS ditegakkan pada basis data melalui Row Level Security, bukan hanya dengan
  menyembunyikan tombol pada antarmuka.

## 8. Business Rules

- BR-001: Harga paket dan seluruh nilai uang disimpan sebagai `NUMERIC(15,2)`.
- BR-002: Pembuatan, perubahan, pengaktifan, dan penonaktifan definisi paket adalah hak `owner`.
- BR-003: Paket yang sudah pernah diterapkan TIDAK BOLEH dihapus permanen; hanya boleh dinonaktifkan.
- BR-004: Definisi paket yang berubah TIDAK BOLEH mengubah harga, item, atau rekam jejak penerapan yang
  sudah tercatat pada kunjungan terdahulu.
- BR-005: Paket harus memiliki minimal satu item untuk dapat disimpan atau diaktifkan.
- BR-006: Satu kunjungan boleh menerapkan lebih dari satu paket; nilai tiap paket dijumlahkan pada
  `visits.pendapatan_lain` dan namanya dicatat pada `visits.keterangan_pendapatan`.
- BR-007: `visits.pendapatan_lain` tetap menjadi satu-satunya sumber kebenaran nilai tagihan tambahan
  kunjungan. Rekam jejak penerapan bersifat audit dan TIDAK BOLEH dijadikan sumber hitung ulang tagihan.
- BR-008: Penerapan paket TIDAK BOLEH mengubah `visits.biaya_periksa` yang diatur oleh kasir.
- BR-009: Semua migrasi bersifat aditif dan tidak mengedit migrasi yang sudah diterapkan.
- BR-010: Semua pesan kesalahan ke pengguna menggunakan Bahasa Indonesia.
- BR-011: Fitur ini adalah Change Request Post-MVP; implementasi menunggu persetujuan client.

## 9. Validation Rules

| ID | Input | Rule | Error behavior |
|---|---|---|---|
| VAL-001 | Nama paket | Wajib, 2 sampai 150 karakter | Tolak dan tampilkan pesan yang dapat dibaca |
| VAL-002 | Kode paket | Unik bila diisi, maksimum 30 karakter | Tolak dengan pesan "Kode paket sudah digunakan" |
| VAL-003 | Daftar item | Minimal satu item | Tombol simpan dinonaktifkan dengan penjelasan |
| VAL-004 | Kuantitas item | Lebih besar dari nol | Tolak nilai dan tampilkan pesan validasi |
| VAL-005 | Harga satuan | Tidak boleh negatif | Tolak nilai |
| VAL-006 | Harga total | Jumlah subtotal, tidak boleh negatif | Dihitung ulang otomatis, tidak diketik bebas |

## 10. States and Transitions

| State | Meaning | Allowed transitions |
|---|---|---|
| `aktif` | Paket tersedia untuk diterapkan ke kunjungan | `nonaktif` |
| `nonaktif` | Paket disimpan untuk rujukan historis dan tidak dapat diterapkan ke kunjungan baru | `aktif` |

Transisi tidak valid HARUS ditolak secara eksplisit. Sebuah paket tanpa item TIDAK BOLEH berada pada
state `aktif`.

## 11. Error and Empty States

- ERR-001: KETIKA belum ada paket, sistem HARUS menampilkan empty state dengan aksi "Buat Paket Pertama"
  bagi `owner`.
- ERR-002: KETIKA pencarian tidak menemukan hasil, sistem HARUS menyebut kata kunci dan menyediakan aksi
  menghapus filter.
- ERR-003: KETIKA tidak ada paket aktif untuk diterapkan, sistem HARUS menyatakan hal itu dan tetap
  mempertahankan alur penagihan manual.
- ERR-004: KETIKA penyimpanan paket gagal, sistem HARUS menampilkan pesan Bahasa Indonesia dan TIDAK
  BOLEH melaporkan keberhasilan sebagian sebagai keberhasilan.
- ERR-005: KETIKA koneksi terputus saat penerapan paket, sistem HARUS memberi tahu pengguna dan TIDAK
  BOLEH meninggalkan kunjungan dalam kondisi setengah tulis.

## 12. Non-Functional Requirements

- NFR-PERF-001: Daftar paket dan pencariannya HARUS tampil dalam waktu kurang dari 2 detik pada volume
  paket yang wajar untuk satu klinik (di bawah 200 paket).
- NFR-SEC-001: Row Level Security HARUS aktif pada seluruh tabel paket terapi.
- NFR-SEC-002: Hak pengelolaan paket HARUS dibatasi pada peran `owner` pada lapisan basis data.
- NFR-SEC-003: Nama pasien, NIK, nomor BPJS, dan diagnosis TIDAK BOLEH ditulis ke log.
- NFR-REL-001: Rekam jejak penerapan bersifat append-only dan TIDAK BOLEH berubah setelah ditulis.
- NFR-A11Y-001: Seluruh kontrol paket terapi HARUS dapat dioperasikan penuh dengan keyboard dan memiliki
  indikator fokus yang terlihat.
- NFR-A11Y-002: Kontras HARUS memenuhi WCAG AA (4.5:1 untuk teks isi, 3:1 untuk teks besar).
- NFR-RESP-001: Setiap layar baru HARUS berfungsi pada 360 piksel, 768 piksel, dan 1024 piksel ke atas
  tanpa scroll horizontal di tingkat halaman, dengan target sentuh minimal 44 kali 44 piksel dan jarak
  minimal 8 piksel antar kontrol.

## 13. Dependencies

- DEP-001: Modul kasir dan kunjungan F-001 (`visits`, `pendapatan_lain`, `keterangan_pendapatan`).
- DEP-002: Alur pencatatan tindakan dan terapi obat pada F-002 (rekam medis dokter).
- DEP-003: RBAC dan RLS peran `owner` / `dokter_admin` dari F-008.
- DEP-004: Primitif UI `src/components/ui/` (Modal, Button, Input, Select, Badge, Card, Table) dan
  konstanta `src/constants/clinic.ts`.
- DEP-005: Utilitas `formatRupiah` pada `src/lib/utils.ts`.

## 14. Assumptions

- ASM-001: Bundel layanan berulang memang terjadi pada operasional klinik, dan pemilik ingin
  menetapkannya satu kali.
- ASM-002: Nilai tagihan tambahan tetap dicatat pada `visits.pendapatan_lain`, bukan pada kolom baru,
  sehingga kuitansi dan buku kas yang ada tidak berubah.
- ASM-003: Paket boleh diterapkan pada pasien `BPJS` melalui `pendapatan_lain`, sejalan dengan aturan
  F-001 BR-002 bahwa biaya tambahan BPJS dicatat di `pendapatan_lain` dengan penjelasan.
- ASM-004: Satu kunjungan boleh memuat lebih dari satu paket.
- ASM-005: Pemilik bersedia mengelola definisi paket sendiri melalui antarmuka, tanpa perlu bantuan
  developer setelah fitur rilis.

## 15. Open Questions

| ID | Question | Owner | Blocking? | Resolution |
|---|---|---|---|---|
| OQ-001 | Apakah client menyetujui F-012 "Paket Terapi" sebagai Change Request Post-MVP untuk diimplementasikan? | Client | Yes | Disetujui 2026-10-09. Implementasi dimulai di staging. |
| OQ-002 | Apakah paket boleh diterapkan pada kunjungan pasien BPJS melalui `pendapatan_lain`? | Client | No | Default ya, sesuai ASM-003 |
| OQ-003 | Apakah harga paket boleh diubah setelah paket pernah diterapkan? | Client | No | Default ya, dengan snapshot penerapan (FR-008) |
| OQ-004 | Apakah satu kunjungan boleh memuat lebih dari satu paket? | Client | No | Default ya, nilai dijumlahkan (BR-006) |
| OQ-005 | Di mana menu master paket ditempatkan, sebagai rute baru atau sebagai tab pada modul yang ada? | Developer lalu Client | No | Default rute baru khusus `owner` (lihat design Section 4) |
| OQ-006 | Apakah paket perlu kategori atau kelompok untuk memudahkan pencarian pada volume besar? | Client | No | Ditunda sampai volume paket terbukti memerlukannya |

Implementasi TIDAK BOLEH dimulai selama masih ada pertanyaan yang bersifat blocking dan belum
terselesaikan.

## 16. Approval

- Product owner: Client (Klinik Pratama Cikidang Medika), melalui developer
- Status: APPROVED
- Approved date: 2026-10-09
- Notes: Disetujui untuk diimplementasikan di staging pada 2026-10-09. Keputusan yang dipakai: harga
  paket bersifat melengkapi (paket menambah ke nilai kunjungan yang ada, bukan mengganti); paket boleh
  diterapkan pada pasien BPJS dengan peringatan dan tanpa mengubah `biaya_periksa`; pengelolaan paket
  dibatasi `owner` pada slice ini. Penempatan menu: rute baru `/paket-terapi` khusus `owner`.
