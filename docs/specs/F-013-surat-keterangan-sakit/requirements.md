---
id: F-013-REQ
feature: F-013
title: "Surat Keterangan Sakit: Alamat Tambahan yang Dapat Diedit"
status: draft
owner: "Developer"
last_updated: "2026-10-08"
last_verified_commit: unverified
source_of_truth_for:
  - "Perilaku alamat tambahan pada Surat Keterangan Istirahat Sakit"
related:
  - "../../product/prd.md"
  - "../F-002-rekam-medis-dokter/requirements.md"
  - "../F-007-fitur-klinis-administrasi-pasien/requirements.md"
  - "../F-008-rm-rbac-kesehatan-piutang/requirements.md"
supersedes: null
superseded_by: null
---

# Requirements: F-013 Surat Keterangan Sakit - Alamat Tambahan yang Dapat Diedit

## 1. Summary

F-013 menambahkan satu baris **alamat tambahan yang dapat diedit** pada Surat Keterangan
Istirahat Sakit (SKS) yang sudah ada. Saat ini surat hanya mencetak alamat pasien yang
terdaftar (`patients.alamat` dan `patients.desa`). Petugas klinik meminta kemampuan mengetik
alamat tambahan secara bebas pada saat surat dibuat, misalnya alamat tempat kerja, alamat kos,
atau alamat domisili yang berbeda dari alamat registrasi pasien, sehingga alamat tersebut
langsung tercetak di surat bersama alamat terdaftar.

Fitur ini adalah Change Request klien dan tidak mengubah alur rekam medis yang sudah ada.
Perubahan bersifat aditif, opsional, dan hanya memengaruhi satu komponen surat.

## 2. Problem

Perilaku saat ini, diverifikasi pada working tree 2026-10-08:

- Surat Keterangan Istirahat Sakit dirender oleh `src/components/rekam-medis/SuratSakitModal.tsx`,
  dipanggil dari `src/components/rekam-medis/ExaminationForm.tsx`.
- Baris alamat pada surat hanya membaca data terdaftar: `patient.alamat` (bila ada) diikuti
  `Desa {patient.desa}`. Tidak ada kolom tambahan dan tidak ada cara mengetik alamat lain.
- Seluruh nilai yang dapat diubah pada surat (lama istirahat, tanggal mulai, pekerjaan, anjuran)
  disimpan sebagai state lokal modal dan tidak dipersistensi ke database.
- Tidak ada kolom `alamat_tambahan` pada tabel `visits` maupun `patients`, dan tidak ada jenis
  surat tersimpan yang menampung alamat per surat.

Permintaan klien (verbatim): "Surat keterngan sakit tolong tambahkan option alamat tambahan
(editable)".

Expected outcome:

- Petugas dapat mengetik satu alamat tambahan yang bebas pada form pengaturan surat.
- Alamat tambahan tercetak pada surat ketika diisi, dan tidak mencetak baris kosong ketika
  dibiarkan kosong.
- Tidak ada perubahan pada data pasien yang sudah ada dan tidak ada data baru yang dipersistensi.

## 3. Goals

- G-001: Petugas dapat menambahkan alamat tambahan pada SKS tanpa membuka modul lain.
- G-002: Alamat tambahan tercetak pada salinan surat ketika diisi.
- G-003: Surat tanpa alamat tambahan tetap identik dengan perilaku saat ini.
- G-004: Tidak ada skema database baru dan tidak ada data pasien yang berubah.

## 4. Non-Goals

- NG-001: Menyimpan alamat tambahan secara permanen ke `visits`, `patients`, atau tabel baru.
  Penyimpanan permanen berada di luar lingkup permintaan ini dan tidak diimplementasikan pada
  slice ini.
- NG-002: Mengubah format kop surat, nomor surat, atau tata letak surat yang sudah disetujui.
- NG-003: Menambahkan alamat tambahan pada Surat Rujukan (`SuratRujukanModal.tsx`). Bila klien
  menginginkan hal yang sama pada surat rujukan, itu menjadi permintaan terpisah.
- NG-004: Mengubah master data pasien (`patients.alamat`, `patients.desa`) dari dalam surat.
- NG-005: Menambahkan fitur di luar F-001 sampai F-006 (MVP) selain perubahan yang diminta ini.

## 5. Actors

### ACTOR-001 - Dokter / Admin (`dokter_admin`)

Membuka rekam medis pasien, membuka modal Surat Keterangan Istirahat Sakit, mengisi alamat
tambahan, dan mencetak surat. Akses mengikuti aturan peran F-008 dan tidak berubah oleh fitur ini.

### ACTOR-002 - Owner

Memiliki akses penuh yang sama terhadap rekam medis. Tidak ada aksi khusus Owner pada fitur ini.

## 6. Preconditions

- PRE-001: Sebuah kunjungan (`visit`) dan pasien (`patient`) sedang dibuka pada modul rekam medis.
- PRE-002: Modal Surat Keterangan Istirahat Sakit dapat dibuka (tombol pada `ExaminationForm`).
- PRE-003: Pratinjau cetak tersedia melalui `window.print()` (tidak ada ketergantungan layanan luar).

## 7. Functional Requirements

### FR-001 - Kolom Alamat Tambahan yang Dapat Diedit

The system shall menyediakan satu kolom teks opsional "Alamat Tambahan" pada panel pengaturan
surat, yang nilainya dapat diketik bebas oleh petugas dan digunakan hanya untuk surat yang
sedang dibuat.

Acceptance criteria:

- AC-001.1: KETIKA modal Surat Keterangan Istirahat Sakit dibuka, MAKA kolom "Alamat Tambahan"
  ditampilkan pada panel pengaturan (area yang disembunyikan saat mencetak) dan berada dalam
  keadaan kosong.
- AC-001.2: KETIKA petugas mengetik pada kolom "Alamat Tambahan", MAKA nilai HARUS tersimpan
  pada state modal dan langsung tercermin pada pratinjau surat tanpa memuat ulang halaman.
- AC-001.3: Kolom "Alamat Tambahan" HARUS bersifat opsional, sehingga surat tetap dapat dicetak
  TIDAK BOLEH terhalang ketika kolom dibiarkan kosong.
- AC-001.4: Nilai HARUS berupa teks bebas, TIDAK BOLEH membatasi pada daftar desa
  (`DESA_OPTIONS`) dan TIDAK BOLEH mengubah `patients.alamat` maupun `patients.desa`.

### FR-002 - Pencetakan Alamat Tambahan pada Surat

The system shall mencetak alamat tambahan pada baris alamat surat hanya ketika kolom terisi.

Acceptance criteria:

- AC-002.1: KETIKA alamat tambahan terisi, MAKA baris "Alamat" pada surat HARUS menampilkan
  alamat terdaftar (bila ada) diikuti alamat tambahan yang dapat dibedakan dengan jelas sebagai
  baris terpisah.
- AC-002.2: KETIKA alamat tambahan kosong, MAKA surat HARUS mencetak persis seperti perilaku saat
  ini (hanya alamat terdaftar) dan TIDAK BOLEH mencetak baris kosong, tanda hubung, atau label
  "Alamat Tambahan" yang menggantung.
- AC-002.3: Alamat tambahan HARUS tampil pada kedua wujud, yaitu pratinjau di layar dan hasil
  `window.print()`, dengan isi teks yang identik.
- AC-002.4: Alamat tambahan HARUS mengikuti tata letak, tipografi (Plus Jakarta Sans), dan lebar
  kolom surat A5 yang sudah ada, TIDAK BOLEH menimbulkan luapan horizontal pada lebar kertas.

### FR-003 - Validasi, Batas Panjang, dan Normalisasi

The system shall membatasi dan menormalkan isi alamat tambahan sebelum digunakan untuk mencetak.

Acceptance criteria:

- AC-003.1: Isi alamat tambahan HARUS dipangkas spasi di awal dan akhir (trim) sebelum dicetak.
- AC-003.2: Isi alamat tambahan HARUS dibatasi maksimum 120 karakter; KETIKA batas tercapai,
  MAKA input TIDAK BOLEH menerima karakter tambahan.
- AC-003.3: KETIKA isi hanya berisi spasi, MAKA sistem HARUS memperlakukannya sebagai kosong
  (perilaku AC-002.2 berlaku).
- AC-003.4: Isi HARUS dirender sebagai teks biasa, TIDAK BOLEH dirender sebagai HTML mentah.

### FR-004 - Reset dan Isolasi Antar Surat

The system shall mengosongkan alamat tambahan pada setiap kali modal dibuka, sehingga tidak
ada alamat dari pasien atau kunjungan sebelumnya yang terbawa.

Acceptance criteria:

- AC-004.1: KETIKA modal dibuka untuk sebuah kunjungan, MAKA kolom "Alamat Tambahan" HARUS
  dimulai dari keadaan kosong, terlepas dari nilai pada sesi sebelumnya.
- AC-004.2: KETIKA modal ditutup tanpa mencetak, MAKA tidak ada alamat tambahan yang
  dipersistensi dan tidak ada perubahan data pasien yang tersimpan.
- AC-004.3: Alamat tambahan HARUS terisolasi per interaksi modal, TIDAK BOLEH muncul pada surat
  pasien lain.

## 8. Business Rules

- BR-001: Alamat tambahan bersifat sementara (ephemeral) pada slice ini dan tidak disimpan ke
  database.
- BR-002: Surat tetap mencetak alamat terdaftar (`patients.alamat` dan `patients.desa`) sebagai
  dasar; alamat tambahan adalah pelengkap, bukan pengganti.
- BR-003: Alamat tambahan tidak boleh mengubah master data pasien.
- BR-004: Tidak ada nilai bawaan (default) untuk alamat tambahan; nilai bawaan yang diisi otomatis
  dilarang karena berisiko mencetak alamat yang salah.
- BR-005: Format dan tata letak surat yang sudah disetujui (nomor surat `SKS/CKM/...`, kop surat,
  tanda tangan) tidak berubah.
- BR-006: Fitur hanya tersedia bagi peran yang sudah berhak membuka rekam medis, sesuai F-008.

## 9. Validation Rules

| ID | Input | Rule | Error behavior |
|---|---|---|---|
| VAL-001 | Alamat Tambahan | Opsional, boleh kosong | Dicetak tanpa baris tambahan |
| VAL-002 | Alamat Tambahan | Setelah trim maksimum 120 karakter | Input menolak karakter melebihi batas |
| VAL-003 | Alamat Tambahan | Hanya spasi dianggap kosong | Diperlakukan seperti kosong |
| VAL-004 | Alamat Tambahan | Dirender sebagai teks biasa | Tanpa interpretasi HTML |

## 10. States and Transitions

| State | Meaning | Allowed transitions |
|---|---|---|
| `kosong` | Kolom alamat tambahan tidak berisi teks berarti | `terisi` |
| `terisi` | Kolom berisi teks valid (setelah trim) | `kosong`, `dicetak` |
| `dicetak` | Surat dikirim ke `window.print()` untuk wujud cetak | `kosong` (modal dibuka ulang) |

Transisi tidak sah harus ditolak secara eksplisit. Dalam semua keadaan surat HARUS tetap dapat
dicetak; alamat tambahan tidak pernah menjadi penghalang cetak.

## 11. Error and Empty States

- ERR-001: KETIKA kolom alamat tambahan kosong, sistem HARUS mencetak surat tanpa baris alamat
  tambahan dan TIDAK BOLEH menampilkan kesalahan.
- ERR-002: KETIKA petugas mengetik melampaui 120 karakter, sistem HARUS menghentikan input pada
  batas tersebut tanpa menampilkan kesalahan keras.
- ERR-003: KETIKA data kunjungan atau pasien tidak lengkap, sistem HARUS tetap menampilkan surat
  dengan bagian yang tersedia dan memberi penanda `-` pada bagian yang tidak tersedia, konsisten
  dengan perilaku surat saat ini.
- ERR-004: KETIKA proses cetak browser gagal atau dibatalkan, sistem HARUS membiarkan modal dan
  isi alamat tambahan tetap utuh sehingga petugas dapat mencoba mencetak lagi.

## 12. Non-Functional Requirements

- NFR-PERF-001: Perubahan isi alamat tambahan HARUS terlihat pada pratinjau tanpa jeda yang
  terasa (tanpa permintaan jaringan).
- NFR-SEC-001: Alamat tambahan TIDAK BOLEH ditulis ke log, dikirim ke layanan luar, atau
  dipersistensi pada slice ini.
- NFR-SEC-002: Alamat tambahan hanya tampil pada pratinjau surat di dalam antarmuka yang sudah
  dilindungi peran.
- NFR-A11Y-001: Kolom alamat tambahan HARUS memiliki label yang terhubung (`<label htmlFor>`),
  dapat dioperasikan penuh dengan keyboard, dan menampilkan indikator fokus yang terlihat.
- NFR-A11Y-002: Kontras teks HARUS memenuhi WCAG AA (4.5:1 untuk teks isi, 3:1 untuk teks besar).
- NFR-RESP-001: Panel pengaturan surat HARUS tetap rapi pada 360 px, 768 px, dan 1024 px ke atas
  tanpa gulir horizontal tingkat halaman dan dengan target sentuh minimal 44 x 44 px.
- NFR-MAINT-001: Tidak ada dependensi baru dan tidak ada perubahan skema database pada fitur ini.

## 13. Dependencies

- DEP-001: `src/components/rekam-medis/SuratSakitModal.tsx` (komponen surat yang dimodifikasi).
- DEP-002: Primitif UI `src/components/ui/` (`Input`, `Button`, `Select`) sesuai mandat UI reusable.
- DEP-003: `src/lib/utils.ts` (`cn`, `formatDateIndo`) untuk gaya dan format yang konsisten.
- DEP-004: Konstanta `src/constants/clinic.ts` (`CLINIC_PROFILE`, `DESA_OPTIONS`) untuk kop surat.

## 14. Assumptions

- ASM-001: "Alamat tambahan" berarti satu baris alamat bebas yang hanya dipakai pada surat yang
  sedang dibuat, bukan perubahan master data pasien.
- ASM-002: Petugas memasukkan alamat tambahan sesaat sebelum mencetak, sehingga ketiadaan
  penyimpanan permanen tidak menimbulkan masalah operasional pada slice ini.
- ASM-003: Surat Keterangan Istirahat Sakit tetap menjadi satu-satunya surat yang terpengaruh pada
  slice ini.

## 15. Open Questions

| ID | Question | Owner | Blocking? | Resolution |
|---|---|---|---|---|
| OQ-001 | Apakah alamat tambahan perlu disimpan (mis. pada `visits`) agar dapat dipakai ulang atau dicetak ulang? | Client | No | Defaulted to tidak disimpan pada slice ini (ASM-002, BR-001). Bila klien menghendaki penyimpanan permanen, itu menjadi Change Request lanjutan dengan migrasi baru. |
| OQ-002 | Apakah alamat tambahan harus menggantikan alamat terdaftar atau melengkapinya? | Client | No | Defaulted to melengkapi (BR-002), sesuai redaksi permintaan "tambahkan". |
| OQ-003 | Apakah Surat Rujukan juga memerlukan alamat tambahan? | Client | No | Di luar lingkup (NG-003). Dicatat sebagai permintaan potensial untuk Post-MVP. |

Implementation must not begin while a blocking question remains unresolved. Tidak ada pertanyaan
yang bersifat blocking pada dokumen ini.

## 16. Approval

- Product owner: Client (Klinik Pratama Cikidang Medika), melalui developer
- Status: DRAFT
- Approved date: Pending
- Notes: Perubahan bersumber dari catatan rapat klien (permintaan verbatim pada Bagian 1). Default
  pada OQ-001 sampai OQ-003 dipilih agar perubahan tetap minimal dan berada dalam lingkup MVP.
