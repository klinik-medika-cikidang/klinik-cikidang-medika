-- =============================================================================
-- F-010 phase 1: rebuild patient identity from the DATA master (RUN MANUALLY).
--
-- Destructive. This is not a schema migration and must never be applied
-- automatically. It replaces public.patients, which cascades to public.visits,
-- public.tbc_programs, public.circumcisions, and public.post_cares.
--
-- Prerequisites:
--   * migration 20261005_f010_datapasien_identity_source.sql applied
--   * staging.datapasien and staging.rekam_visit loaded (scripts/f010-load-staging.mjs)
--   * a fresh backup taken with scripts/backup-clinic-data.mjs
--
-- Phase 2 (visits and cash flows, program registers, sunat, bidan) is run by
-- scripts/reconcile-clinic-data.mjs (F-010 revision) using public.patient_identity_audit
-- as the visit to patient map.
-- =============================================================================

BEGIN;

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

DELETE FROM public.patient_identity_audit;
DELETE FROM public.public_health_records;
DELETE FROM public.referral_commissions;
DELETE FROM public.circumcisions;
DELETE FROM public.patients;

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

SELECT public.f010_build_identity_audit();

WITH unknown AS (
  SELECT DISTINCT ON (public.norm_name(r.nama))
    public.norm_name(r.nama) AS nname, r.nama, r.gelar, r.jenis_kelamin,
    r.tanggal_lahir, r.usia, r.desa, r.alamat, r.no_ktp, r.no_bpjs
  FROM staging.rekam_visit r
  JOIN public.patient_identity_audit a
    ON a.source_table = 'REKAMMEDIS' AND a.source_row = r.row_no
  WHERE a.rule = 'TIDAK_KETEMU'
    AND public.norm_name(r.nama) IS NOT NULL
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
