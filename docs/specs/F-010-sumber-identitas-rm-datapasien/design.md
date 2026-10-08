---
id: F-010-DESIGN
feature: F-010
title: "Design: Sumber Identitas No RM dari DATAPASIEN"
status: draft
owner: "Developer / Klinik Cikidang Medika"
last_updated: "2026-10-05"
last_verified_commit: unverified
related:
  - "requirements.md"
  - "tasks.md"
  - "../../architecture/overview.md"
  - "../../../supabase/migrations/20261005_f010_datapasien_identity_source.sql"
---

# Design: F-010 Sumber Identitas No RM dari DATAPASIEN

> Dokumen ini memetakan requirements ke repositori nyata. Arsitektur umum tetap di
> `docs/architecture/overview.md`.

## 1. Ringkasan Desain

F-010 mengubah **sumber kebenaran identitas pasien**: dari `REKAMMEDIS.csv` menjadi
`DATAPASIEN.csv`. Bentuknya **rebuild-terkendali, verifikasi-dulu, promosi-kemudian**:

- Skema dan fungsi bantu masuk lewat satu migrasi DDL:
  `supabase/migrations/20261005_f010_datapasien_identity_source.sql`.
- Rebuild data dijalankan operator memakai blok SQL di
  `docs/runbooks/f010-remigrasi-datapasien.md` setelah `staging` dimuat, dan tidak pernah ikut
  ter-deploy otomatis.
- Data program turunan (`public_health_records`, `circumcisions`, `bidan_rujukan`) dibangun ulang
  oleh `scripts/reconcile-clinic-data.mjs` yang lebih dulu diperbaiki agar tidak lagi menggabungkan
  pasien berdasarkan kunci nol-depan.

Alasan memilih rebuild, bukan koreksi di tempat: seluruh data produksi saat ini adalah turunan CSV
(tidak ada data baru pasca-migrasi 2026-10-01), sedangkan memetakan tiap baris `visits` lama
kembali ke baris sumber bersifat tidak pasti. Rebuild deterministik dan dapat diulang.

> Pembaruan 2026-10-08: klinik menerbitkan ekspor baru yang menormalkan seluruh No RM ke 9 digit
dan menyelaraskannya dengan master. Karena itu aturan resolusi bergeser dari nama-lebih-dulu
menjadi No-RM-lebih-dulu dengan nama sebagai pengaman (Bagian 4).
>
> Daftar pasien adalah gabungan master `DATA`, kunjungan yang hanya ada di `REKAMMEDIS`, dan anak
> sunat yang hanya ada di `SUNAT.csv`. Anak sunat yang tidak ada di master dibuatkan pasien dengan
> No RM lanjutan pada skema 9 digit yang sama (fase 4).

## 2. Konteks yang Ada

- `scripts/migrate-data.mjs` (F-005): membangun `patients` dari `REKAMMEDIS.csv`, dedup per string
  No RM persis.
- `scripts/reconcile-clinic-data.mjs` (F-009): membangun ulang pasien hilang, menggabungkan pasien
  dengan `rmKey`, mengisi data program. **Ini yang mengandung cacat penggabungan.**
- `scripts/lib/clinic-csv.mjs`: parser CSV bersama dan helper indeks kolom.
- `supabase/migrations/`: DDL append-only.

Pola yang dipertahankan:

- Skrip operator memakai kunci service-role dari env, dengan pengaman target produksi.
- `docs/data/` gitignored; dokumen terlacak bebas PII.
- Error ditampilkan dalam Bahasa Indonesia.

## 3. Perubahan Sumber Kebenaran

```text
SEBELUM (F-005/F-009)
  REKAMMEDIS.csv ──(rmKey: buang nol depan)──> patients  (identitas + RM)
                                   └──> visits (kunjungan)
  DATAPASIEN.csv ──> hanya pengayaan pekerjaan/alergi/telepon

SESUDAH (F-010)
  DATAPASIEN.csv ──> patients  (identitas + No RM otoritatif)
  REKAMMEDIS.csv ──> raw kunjungan
        └── resolver (nama lebih dulu, No RM sebagai penguat) ──> visits.pasien_id
```

## 4. Algoritma Resolusi Kunjungan

Implementasi SQL: `public.f010_resolve_patient(no_rm, nama, jenis_kelamin, desa, tanggal_lahir)`,
selalu mengembalikan tepat satu baris.

Sejak ekspor 2026-10-08, klinik menormalkan seluruh No RM dan menyelaraskannya dengan master, sehingga
No RM menjadi kunci utama dan nama menjadi pengaman:

| Urutan | `rule` | Kondisi | Status |
|---|---|---|---|
| 1 | `RM_NAMA_IDENTIK` | No RM cocok dan nama identik | `COCOK` |
| 2 | `RM_NAMA_VARIAN` | No RM cocok dan nama berbagi kata | `COCOK` |
| 3 | `NAMA_UNIK` | nama cocok tepat satu pasien (No RM menunjuk orang lain atau kosong) | `COCOK` |
| 4 | `NAMA+TIEBREAK` | nama cocok beberapa; jenis kelamin, desa, tanggal lahir menyisakan satu | `COCOK` |
| 5 | `NAMA_AMBIGU` | nama cocok beberapa tanpa pembeda; dipilih deterministik | `PERLU_TINJAUAN` |
| 6 | `RM_SAJA` | hanya No RM cocok, nama tidak terpakai (misalnya "-") | `PERLU_TINJAUAN` |
| 7 | `TIDAK_KETEMU` | tidak ada yang cocok | `PERLU_TINJAUAN` |

Hasil audit ekspor 2026-10-08 (7.817 baris kunjungan):

| Hasil | Baris |
|---|---|
| Nama identik dengan master (aturan 1) | 7.729 |
| Nama varian, berbagi kata (aturan 2) | 56 |
| Nama berbeda penuh (masuk aturan 3 atau 6) | 33 |
| No RM tidak ada di master | 0 |
| Nama kunjungan yang tidak ada di master | 30 |

Pembanding: pada ekspor lama, 1.009 No RM tidak ada di master dan 91 baris menunjuk orang berbeda.
Perbaikan sumber oleh klinik menghapus akar masalah ini. Sisa 33 nama berbeda dan 30 nama tak
dikenal masuk daftar tinjauan.

## 5. Model Data

### 5.1 Skema staging (tidak terekspos PostgREST)

| Objek | Isi |
|---|---|
| `staging.datapasien` | cermin `DATAPASIEN.csv` (20 kolom teks/urutan) |
| `staging.rekam_visit` | cermin `REKAMMEDIS.csv` (33 kolom) |

### 5.2 Tabel audit

`public.patient_identity_audit` menyimpan satu baris per baris sumber:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `source_table` | `text` | `REKAMMEDIS` |
| `source_row` | `integer` | nomor baris di sumber |
| `source_no_rm` | `text` | No RM salinan (boleh NULL) |
| `source_nama` | `text` | nama pada baris sumber |
| `resolved_patient_id` | `uuid` | pasien hasil resolusi (NULL bila tak ketemu) |
| `resolved_no_rm` | `varchar(30)` | No RM hasil resolusi |
| `rule` | `text` | salah satu dari 6 aturan |
| `status` | `text` | `COCOK` / `PERLU_TINJAUAN` / `BARU` |

Batasan: `UNIQUE (source_table, source_row)`.

### 5.3 Fungsi bantu (`public`)

| Fungsi | Sifat | Gunanya |
|---|---|---|
| `rm_digits(text)` | `IMMUTABLE` | hanya angka |
| `rm_key(text)` | `IMMUTABLE` | angka tanpa nol depan (satu sinyal saja) |
| `normalize_rm(text)` | `IMMUTABLE` | bentuk tersimpan 9 digit, atau NULL |
| `norm_name(text)` | `IMMUTABLE` | kunci nama |
| `name_tokens(text)` | `IMMUTABLE` | token nama |
| `names_overlap(text, text)` | `IMMUTABLE` | nama berbagi kata |
| `f010_resolve_patient(...)` | `STABLE` | resolver identitas |
| `f010_build_identity_audit()` | `plpgsql` | mengisi audit dari staging |

### 5.4 View tinjauan

`public.v_patient_identity_review` (`security_invoker`) menampilkan baris ber-`status <> 'COCOK'`.

## 6. Alur Rebuild

```text
operator
  -> backup JSON produksi (scripts/backup-clinic-data.mjs)
  -> muat staging.datapasien dan staging.rekam_visit
  -> jalankan blok rebuild di docs/runbooks/f010-remigrasi-datapasien.md
       1. penjaga: tolak bila staging belum lengkap
       2. hapus patient_identity_audit, public_health_records, circumcisions
       3. DELETE FROM patients  (cascade: visits, tbc_programs, post_cares)
       4. INSERT patients dari staging.datapasien (No RM = normalize_rm)
       5. f010_build_identity_audit()
       6. buat pasien untuk baris TIDAK_KETEMU (No RM baru pada prefix yang sama)
       7. ulangi f010_build_identity_audit() dan sisipkan visits dari staging
       8. verifikasi (jumlah baris, audit, view tinjauan)
  -> jalankan scripts/reconcile-clinic-data.mjs (versi F-010) untuk membangun ulang
     register kesehatan, sunat, dan bidan_rujukan
  -> tulis laporan docs/data/f010-report-<timestamp>.json
  -> drop schema staging setelah diterima
```

## 7. Kasus Tepi

- **Nama sama, beberapa pasien (329 nama di DATAPASIEN).** Tidak pernah digabung. Tie-break
  jenis kelamin + desa + tanggal lahir, lalu No RM salinan, lalu pilih deterministik + tinjauan.
- **Nama tidak ada di DATAPASIEN (54 baris).** Dibuatkan pasien baru, No RM melanjutkan urutan prefix
  `[jenis kelamin][desa]`, ditandai `sumber_data = 'REKAMMEDIS'` dan status `BARU`.
- **No RM tidak valid (10 digit, 5/7 digit, teks).** Tidak ditebak; `normalize_rm` mengembalikan NULL
  dan baris dilaporkan.
- **Penggabungan F-009 yang salah.** Kembali terpisah secara alami karena rebuild menghapus dan
  membangun ulang dari sumber.
- **Data baru setelah migrasi.** Produksi sudah aktif dipakai sejak 8 Oktober 2026 (tercatat 1
  kunjungan baru), jadi rebuild destruktif tidak lagi aman. Dua pilihan: koreksi di tempat
  (pertahankan `id`, Alternatif A) atau rebuild dengan mengambil data baru dari backup lalu
  menempelkannya kembali. Keputusan ini dicatat sebagai OQ-004 dan wajib diselesaikan sebelum
  promosi produksi.

## 8. Penanganan Error

- `ERR-010-1`: Berkas sumber hilang -> hentikan, sebut nama berkas.
- `ERR-010-2`: `staging` belum lengkap -> hentikan sebelum `DELETE` apa pun.
- `ERR-010-3`: Target produksi tanpa `--confirm-prod` -> hentikan.
- `ERR-010-4`: Jumlah kunjungan hasil tidak sama dengan sumber -> hentikan dan jangan commit transaksi.

## 9. Keamanan

- Operasi data dijalankan skrip operator dengan kunci service-role; aplikasi klien tidak berubah.
- `staging` tidak diekspos PostgREST; akses dicabut dari `anon` dan `authenticated`.
- Tabel audit mengikuti gaya RLS proyek (`USING (true)`), sama seperti `public.patients`.
- Dokumen dan migrasi terlacak tidak memuat nama, NIK, atau No RM asli.

## 10. Strategi Pengujian

- **Unit (SQL):** `rm_digits`, `rm_key`, `normalize_rm`, `norm_name`, `names_overlap` terhadap kasus
  8-digit, 9-digit, 10-digit, teks, kosong.
- **Kontrak (SQL):** `f010_resolve_patient` selalu mengembalikan tepat satu baris untuk 6 kelas input.
- **Integrasi (staging):** rebuild penuh di staging, bandingkan jumlah `visits` = 7.671 dan jumlah
  pasien = jumlah baris `DATAPASIEN` + pasien baru.
- **Non-regresi:** jalankan rebuild dua kali, jumlah baris tidak berubah (INV-006).
- **Manual:** klinik meninjau `v_patient_identity_review` dan memutuskan OQ-001.

## 11. Rollout dan Rollback

- **Rollout:** staging penuh -> verifikasi -> backup produksi -> rebuild produksi -> verifikasi ->
  bangun ulang data program -> serahkan daftar tinjauan ke klinik.
- **Rollback:** pulihkan dari backup JSON pra-rebuild (patients, visits, cash_flows, program).
- **Stop condition:** indeks unik `(visit_id, program_type)` gagal, atau jumlah kunjungan tidak sama.

## 12. Alternatif yang Dipertimbangkan

- **A. Koreksi di tempat (pertahankan `id`).** Menghindari cascade, tetapi memetakan tiap baris
  `visits` lama ke baris sumber bersifat tidak pasti. Ditunda sebagai rencana cadangan.
- **B. Memperbaiki hanya 15 kelompok gabungan F-009.** Tidak menyelesaikan 112 baris nama-vs-RM lain
  dan 1.009 No RM yang tidak ada di DATAPASIEN. Ditolak karena tidak menjawab keluhan klien.
- **C. Menggabungkan pasien dengan toleransi fuzzy (Levenshtein).** Berisiko menggabungkan dua orang.
  Ditolak; nama hanya dicocokkan persis atau berbagi kata.

## 13. Pemeriksaan Dampak Arsitektur / ADR

- Tidak mengubah arah dependensi modul aplikasi.
- Tidak menambah dependensi runtime.
- Mengubah sumber kebenaran data historis: perlu dicatat sebagai ADR setelah disetujui.
