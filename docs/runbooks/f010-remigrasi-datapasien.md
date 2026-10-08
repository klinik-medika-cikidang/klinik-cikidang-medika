# Runbook: F-010 Re-migrasi Identitas No RM dari DATAPASIEN

> **JANGAN dijalankan sebelum klinik menyetujui OQ-001** pada
> `docs/specs/F-010-sumber-identitas-rm-datapasien/requirements.md`. Dokumen ini adalah rencana,
> bukan perintah untuk dieksekusi.

## Tujuan

Membangun ulang master pasien dan pemetaan kunjungan di Supabase sehingga No RM bersumber dari
`DATAPASIEN.csv` (formula, otoritatif), bukan `REKAMMEDIS.csv` (salinan manual).

Rebuild ini **destruktif** pada tabel turunan. Karena foreign key `ON DELETE CASCADE`,
`public.patients` diganti dan `public.visits`, `public.tbc_programs`, `public.circumcisions`, serta
`public.post_cares` ikut kosong lalu dibangun ulang. `public.public_health_records` dan
`public.referral_commissions` dibersihkan eksplisit lalu dibangun ulang oleh skrip F-009.

Urutan wajib: **staging dahulu, produksi terakhir.**

## Prasyarat

- [ ] Migrasi `supabase/migrations/20261005_f010_datapasien_identity_source.sql` sudah diterapkan.
- [ ] Backup JSON terbaru ada di `docs/data/`:
      `node scripts/backup-clinic-data.mjs <projectRef> prod-f010`.
- [ ] Tidak ada aktivitas tulis dari aplikasi (klinik tidak sedang memakai aplikasi).
- [ ] `docs/data/DATAPASIEN.csv` dan `REKAMMEDIS.csv` tersedia.
- [ ] Klinik sudah mengonfirmasi OQ-001 (24 nama kunjungan yang tidak ada di DATAPASIEN).

## Langkah 1 - Muat staging dari CSV

Jalankan skrip pemuat. Skrip ini punya `--dry-run` dan penjaga target produksi:

```bash
node scripts/f010-load-staging.mjs --env=.env.staging --dry-run
node scripts/f010-load-staging.mjs --env=.env.staging
```

Skrip mengosongkan lalu memuat `staging.datapasien` (3.726 baris) dan `staging.rekam_visit`
(7.818 baris).

## Langkah 2 - Rebuild identitas (fase 1)

Berkas kanonis SQL: `scripts/f010-rebuild-identity.sql`. Jalankan dengan:

```bash
node scripts/apply-sql.mjs --env=.env.staging --file=scripts/f010-rebuild-identity.sql
```

Isi SQL sama dengan blok di bawah (satu transaksi). Bila penjaga gagal, transaksi batal dan tidak
ada yang berubah.

```sql
BEGIN;

-- Penjaga: jangan menghapus apa pun bila staging belum lengkap.
DO $$
DECLARE
  n_dp integer;
  n_rk integer;
BEGIN
  SELECT count(*) INTO n_dp FROM staging.datapasien;
  SELECT count(*) INTO n_rk FROM staging.rekam_visit;
  IF n_dp < 3000 THEN
    RAISE EXCEPTION 'staging.datapasien belum dimuat (% baris)', n_dp;
  END IF;
  IF n_rk < 7000 THEN
    RAISE EXCEPTION 'staging.rekam_visit belum dimuat (% baris)', n_rk;
  END IF;
END $$;

-- Reset lapisan identitas.
DELETE FROM public.patient_identity_audit;
DELETE FROM public.public_health_records;
DELETE FROM public.referral_commissions;
DELETE FROM public.circumcisions;
DELETE FROM public.patients;   -- cascade: visits, tbc_programs, post_cares

-- Master pasien dari DATAPASIEN. No RM tidak ditebak.
INSERT INTO public.patients (
  no_rm, gelar, nama, jenis_kelamin, tanggal_lahir, usia, desa, alamat,
  no_ktp, no_bpjs, no_telepon, pekerjaan, riwayat_alergi, sumber_data
)
SELECT
  public.normalize_rm(d.no_rm),
  coalesce(nullif(btrim(d.gelar), ''), 'Tn'),
  coalesce(nullif(btrim(d.nama), ''), 'Tanpa Nama'),
  CASE WHEN public.norm_name(d.jenis_kelamin) = 'perempuan' THEN 'Perempuan' ELSE 'Laki-laki' END,
  nullif(btrim(d.tanggal_lahir), ''),
  nullif(regexp_replace(coalesce(d.usia, ''), '[^0-9]', '', 'g'), '')::integer,
  coalesce(nullif(btrim(d.kode_alamat), ''), 'Luar Daerah'),
  nullif(btrim(d.alamat), ''),
  nullif(btrim(d.no_ktp), ''),
  nullif(btrim(d.no_jkn), ''),
  nullif(btrim(d.no_telpn), ''),
  nullif(btrim(d.pekerjaan), ''),
  nullif(btrim(d.alergi_obat), ''),
  'DATAPASIEN'
FROM staging.datapasien d
WHERE public.normalize_rm(d.no_rm) IS NOT NULL
ON CONFLICT (no_rm) DO NOTHING;

-- Pass 1: audit semua baris kunjungan terhadap master DATAPASIEN.
SELECT public.f010_build_identity_audit();

-- Pasien baru untuk nama yang tidak ada di DATAPASIEN, No RM melanjutkan prefix.
WITH unknown AS (
  SELECT DISTINCT ON (public.norm_name(r.nama))
    public.norm_name(r.nama) AS nname, r.nama, r.gelar, r.jenis_kelamin,
    r.tanggal_lahir, r.usia, r.desa, r.alamat, r.no_ktp, r.no_bpjs
  FROM staging.rekam_visit r
  JOIN public.patient_identity_audit a
    ON a.source_table = 'REKAMMEDIS' AND a.source_row = r.row_no
  WHERE a.rule = 'TIDAK_KETEMU'
  ORDER BY public.norm_name(r.nama), r.row_no
),
prefixed AS (
  SELECT u.*, public.rm_prefix(u.jenis_kelamin, u.desa) AS prefix FROM unknown u
),
maxseq AS (
  SELECT substring(p.no_rm, 1, 4) AS prefix, max(substring(p.no_rm, 5, 5)::integer) AS seq
  FROM public.patients p
  WHERE p.no_rm ~ '^[0-9]{9}$'
  GROUP BY 1
),
numbered AS (
  SELECT pr.*, coalesce(ms.seq, 0) + row_number() OVER (PARTITION BY pr.prefix ORDER BY pr.nname) AS new_seq
  FROM prefixed pr
  LEFT JOIN maxseq ms ON ms.prefix = pr.prefix
)
INSERT INTO public.patients (
  no_rm, gelar, nama, jenis_kelamin, tanggal_lahir, usia, desa, alamat, no_ktp, no_bpjs, sumber_data
)
SELECT
  n.prefix || lpad(n.new_seq::text, 5, '0'),
  coalesce(nullif(btrim(n.gelar), ''), 'Tn'),
  coalesce(nullif(btrim(n.nama), ''), 'Tanpa Nama'),
  CASE WHEN public.norm_name(n.jenis_kelamin) = 'perempuan' THEN 'Perempuan' ELSE 'Laki-laki' END,
  nullif(btrim(n.tanggal_lahir), ''),
  nullif(regexp_replace(coalesce(n.usia, ''), '[^0-9]', '', 'g'), '')::integer,
  coalesce(nullif(btrim(n.desa), ''), 'Luar Daerah'),
  nullif(btrim(n.alamat), ''),
  nullif(btrim(n.no_ktp), ''),
  nullif(btrim(n.no_bpjs), ''),
  'REKAMMEDIS'
FROM numbered n;

-- Pass 2: setiap baris sumber harus menunjuk pasien.
SELECT public.f010_build_identity_audit();

DO $$
DECLARE
  n_unresolved integer;
  n_patients integer;
BEGIN
  SELECT count(*) INTO n_unresolved
    FROM public.patient_identity_audit WHERE resolved_patient_id IS NULL;
  IF n_unresolved > 0 THEN
    RAISE EXCEPTION 'Masih ada % baris kunjungan tanpa pasien', n_unresolved;
  END IF;

  SELECT count(*) INTO n_patients FROM public.patients;
  IF n_patients < 3600 THEN
    RAISE EXCEPTION 'Jumlah pasien tidak wajar setelah rebuild (% baris)', n_patients;
  END IF;
END $$;

COMMIT;
```

## Langkah 3 - Rebuild kunjungan dan kas (fase 2)

Jalankan skrip fase 2:

```bash
node scripts/f010-apply-derived.mjs --env=.env.staging --dry-run
node scripts/f010-apply-derived.mjs --env=.env.staging
```

Skrip menyisipkan `public.visits` (pasien diambil dari `public.patient_identity_audit`) dan membangun
ulang `public.cash_flows`, memakai pemetaan kolom dari `scripts/lib/clinic-map.mjs` agar aturannya sama
dengan migrasi sebelumnya.

Catatan: data program turunan (register kesehatan, sunat, bidan) belum dibangun ulang di langkah ini.
Itu bagian dari revisi `scripts/reconcile-clinic-data.mjs` (TASK-010-4 dan TASK-010-5).

## Langkah 4 - Register program dan bidan (fase 3)

Jalankan:

```bash
node scripts/f010-apply-registers.mjs --env=.env.staging --dry-run
node scripts/f010-apply-registers.mjs --env=.env.staging
```

Skrip membangun ulang `public.public_health_records` dari kolom MONITOR dan mengisi
`visits.bidan_rujukan`, memakai peta audit untuk mencocokkan baris sumber ke kunjungan.

## Langkah 5 - Sirkumsisi dan skrining (fase 4)

Jalankan:

```bash
node scripts/f010-apply-sunat-screening.mjs --env=.env.staging --dry-run
node scripts/f010-apply-sunat-screening.mjs --env=.env.staging
```

Skrip membangun ulang `public.circumcisions` dari `SUNAT.csv` dan mengisi field skrining Triple
Eliminasi (gpa, uk, tp, hiv, syphilis, hbsag) pada register ELIMINASI_3. Anak sunat yang belum ada di
master dibuatkan pasien dengan No RM lanjutan pada skema 9 digit yang sama.

## Langkah 6 - Verifikasi

```sql
SELECT (SELECT count(*) FROM public.patients) AS patients,          -- DATAPASIEN + pasien baru
       (SELECT count(*) FROM public.visits) AS visits,              -- 7.671
       (SELECT count(*) FROM public.cash_flows) AS cash_flows,      -- 1.552
       (SELECT count(*) FROM public.patient_identity_audit WHERE resolved_patient_id IS NULL) AS unresolved,
       (SELECT count(*) FROM public.v_patient_identity_review) AS perlu_tinjauan;
```

- [ ] `visits` = 7.671 (INV-002).
- [ ] `unresolved` = 0.
- [ ] `perlu_tinjauan` sekitar 162 (NAMA_AMBIGU + TIDAK_KETEMU).
- [ ] `cash_flows` = 1.552.
- [ ] Tidak ada dua pasien berbagi `no_rm` (INV-001).
- [ ] Jalankan ulang rebuild di staging: jumlah baris tidak berubah (INV-006).

## Langkah 7 - Serah terima ke klinik

1. Kumpulkan daftar `v_patient_identity_review` (No RM salinan, nama, No RM hasil, aturan, status).
2. Minta klinik memutuskan OQ-001 (nama tak dikenal) dan OQ-002 (baris ambigu).
3. Terapkan koreksi tambahan lewat migrasi baru bila perlu.

## Pembungkus otomatis

Untuk produksi nanti, jalankan seluruh langkah lewat satu perintah agar urutannya benar:

```bash
node scripts/f010-promote.mjs --env=.env.staging --dry-run
node scripts/f010-promote.mjs --env=.env.production --confirm-prod
```

## Rollback

- Pulihkan dari backup JSON pra-rebuild (`docs/data/prod-f010-*.json`) untuk `patients`, `visits`,
  `cash_flows`, dan tabel program.
- Bila rebuild gagal di tengah transaksi, `ROLLBACK` otomatis; tidak ada perubahan tersimpan.
- Setelah `COMMIT`, rollback hanya lewat restore backup.

## Pembersihan

Setelah klinik menerima hasil:

```sql
DROP SCHEMA staging CASCADE;
```

Arsipkan `docs/data/f010-report-*.json` bila perlu, lalu hapus.

## Batas tanggung jawab

- Developer: menjalankan rebuild, menyediakan laporan, memperbaiki logika migrasi dan generator No RM.
- Klinik: memutuskan identitas pada daftar tinjauan dan merapikan berkas sumber (Sheets).
