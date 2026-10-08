-- =============================================================================
-- F-010: DATAPASIEN as the authoritative patient identity source
--
-- Background
-- ----------
-- F-005/F-009 built the patient master from REKAMMEDIS.csv. The clinic confirms
-- that REKAMMEDIS only holds a manual copy of the medical record number ("cuma
-- kopasan"), while DATAPASIEN.csv holds the formula-driven, authoritative No RM
-- together with the identity fields (name, gender, birth date, age, village
-- code, address, KTP, JKN, phone).
--
-- Evidence (read-only audit, 2026-10-05):
--   * DATAPASIEN.csv : 3,669 rows, every No RM 9 digits, zero No RM carrying two
--                      names. No RM = [gender 2][village 2][sequence 5].
--   * REKAMMEDIS.csv : 7,671 visit rows. 1,009 No RM values are absent from
--                      DATAPASIEN, and 112 rows that match a DATAPASIEN No RM
--                      carry a different person's name. A name-first resolver
--                      points to a different patient than the copied No RM for
--                      91 rows.
--
-- This migration adds structure only. It never moves data. The rebuild is an
-- operator step (see docs/runbooks/f010-remigrasi-datapasien.md), so it stays
-- auditable and repeatable.
--
-- Idempotent: safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Normalisation helpers
-- -----------------------------------------------------------------------------

-- Digits only. NULL when there is no digit at all, so a non-numeric value
-- never becomes an empty key that groups unrelated rows.
CREATE OR REPLACE FUNCTION public.rm_digits(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT nullif(regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g'), '');
$$;

-- Tolerant key: leading zeros removed. Used only as one signal, never as the
-- sole identity rule (the F-009 mistake was treating two rows as one person
-- only because their No RM values differ by a leading zero).
CREATE OR REPLACE FUNCTION public.rm_key(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT nullif(regexp_replace(public.rm_digits(p_value), '^0+', ''), '');
$$;

-- Stored form: the 9-digit zero-padded value. NULL for anything that is not 8 or
-- 9 digits, because padding a 10-digit or non-numeric value would be a guess.
CREATE OR REPLACE FUNCTION public.normalize_rm(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN public.rm_digits(p_value) ~ '^[0-9]{8}$' THEN '0' || public.rm_digits(p_value)
    WHEN public.rm_digits(p_value) ~ '^[0-9]{9}$' THEN public.rm_digits(p_value)
    ELSE NULL
  END;
$$;

-- Name comparison key: lower case, non-letters to spaces, collapsed, trimmed.
CREATE OR REPLACE FUNCTION public.norm_name(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT nullif(
    btrim(regexp_replace(regexp_replace(lower(coalesce(p_value, '')), '[^a-z\s]', ' ', 'g'), '\s+', ' ', 'g')),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.name_tokens(p_value text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT string_to_array(public.norm_name(p_value), ' ');
$$;

-- True when two names share at least one token. Used to accept a No RM match
-- whose name is a spelling variant that still shares a word, rather than a
-- different person.
CREATE OR REPLACE FUNCTION public.names_overlap(p_left text, p_right text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.norm_name(p_left) IS NOT NULL
     AND public.norm_name(p_right) IS NOT NULL
     AND public.name_tokens(p_left) && public.name_tokens(p_right);
$$;

-- The stored No RM is [gender 2][village 2][sequence 5]. This returns the 4-digit
-- prefix for a gender and village, mirroring DESA_RM_CODE in src/constants/clinic.ts.
-- An unknown village falls back to Luar Daerah (13) rather than failing.
CREATE OR REPLACE FUNCTION public.rm_prefix(p_jenis_kelamin text, p_desa text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    (CASE WHEN public.norm_name(p_jenis_kelamin) = 'perempuan' THEN '02' ELSE '01' END)
    || coalesce(
         (SELECT c.code
            FROM (VALUES
              ('cikidang', '01'), ('pangkalan', '02'), ('cicareuh', '03'), ('cijambe', '04'),
              ('mekar nangka', '05'), ('cikiray', '06'), ('sampora', '07'), ('nangka koneng', '08'),
              ('bumisari', '09'), ('taman sari', '10'), ('gunung malang', '11'),
              ('cikaray toyibah', '12'), ('luar daerah', '13'),
              ('tamansari', '10'), ('gunungmalang', '11'), ('bumiasih', '09'), ('nangerang', '05')
            ) AS c(name, code)
           WHERE c.name = public.norm_name(p_desa)),
         '13'
       );
$$;

-- The resolver looks a patient up by leading-zero-insensitive No RM and by
-- normalised name for every source row. Without these expression indexes that
-- correlated lookup is a full scan per row and times out on the 7.8k row export.
CREATE INDEX IF NOT EXISTS idx_patients_rm_key ON public.patients (public.rm_key(no_rm));
CREATE INDEX IF NOT EXISTS idx_patients_norm_name ON public.patients (public.norm_name(nama));

-- -----------------------------------------------------------------------------
-- 2. Staging schema for the two source exports
--
-- Imported by an operator (Supabase Table Editor CSV import or a loader). The
-- schema is not exposed through PostgREST and holds raw text only.
-- -----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS staging;

REVOKE ALL ON SCHEMA staging FROM anon, authenticated;
GRANT USAGE ON SCHEMA staging TO service_role;

-- Mirrors DATAPASIEN.csv column order. Column 11 (No KTP) and column 12 (No JKN)
-- hold the identity numbers; column 13 (No tlfn) is empty in the export.
CREATE TABLE IF NOT EXISTS staging.datapasien (
  no_urut           integer,
  kode_jk           text,
  kode_desa         text,
  no_rm             text,
  gelar             text,
  nama              text,
  jenis_kelamin     text,
  tanggal_lahir     text,
  usia              text,
  kode_alamat       text,
  alamat            text,
  no_ktp            text,
  no_jkn            text,
  no_telpn          text,
  asuransi          text,
  status_pernikahan text,
  pekerjaan         text,
  alergi_obat       text,
  no_asli_di        text,
  ket               text
);

-- Mirrors the REKAMMEDIS.csv visit columns that the rebuild needs.
CREATE TABLE IF NOT EXISTS staging.rekam_visit (
  row_no                integer,
  no_rm                 text,
  gelar                 text,
  nama                  text,
  jenis_kelamin         text,
  tanggal_lahir         text,
  usia                  text,
  desa                  text,
  alamat                text,
  no_ktp                text,
  no_bpjs               text,
  tanggal_periksa       text,
  jam                   text,
  bulan                 text,
  kode_icd10            text,
  petugas               text,
  anamnesa              text,
  diagnosa              text,
  terapi                text,
  monitor               text,
  lab                   text,
  lab_hasil             text,
  penjamin              text,
  tarif                 text,
  tindakan              text,
  keterangan_tindakan   text,
  pendapatan_lain       text,
  keterangan_pendapatan text,
  pengeluaran_klinik    text,
  pengeluaran_non_klinik text,
  keterangan_pengeluaran text,
  setor_tunai           text,
  jenis_pembayaran      text
);

-- -----------------------------------------------------------------------------
-- 3. Identity audit: one row per source visit, with the rule that decided it
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patient_identity_audit (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table        text NOT NULL,
  source_row          integer NOT NULL,
  source_no_rm        text,
  source_nama         text,
  resolved_patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  resolved_no_rm      varchar(30),
  rule                text NOT NULL,
  status              text NOT NULL DEFAULT 'COCOK',
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_patient_identity_audit_source UNIQUE (source_table, source_row),
  CONSTRAINT chk_patient_identity_audit_status
    CHECK (status IN ('COCOK', 'PERLU_TINJAUAN', 'BARU'))
);

CREATE INDEX IF NOT EXISTS idx_patient_identity_audit_status
  ON public.patient_identity_audit (status)
  WHERE status <> 'COCOK';

CREATE INDEX IF NOT EXISTS idx_patient_identity_audit_patient
  ON public.patient_identity_audit (resolved_patient_id);

ALTER TABLE public.patient_identity_audit ENABLE ROW LEVEL SECURITY;

-- Baseline policy aligned with the existing project policy style (see F-008).
-- Role separation is enforced in the application layer, not at the database
-- boundary, so this matches public.patients and public.visits exactly.
DROP POLICY IF EXISTS "Akses penuh public untuk aplikasi klinik - patient_identity_audit"
  ON public.patient_identity_audit;
CREATE POLICY "Akses penuh public untuk aplikasi klinik - patient_identity_audit"
  ON public.patient_identity_audit FOR ALL USING (true);

-- -----------------------------------------------------------------------------
-- 4. Resolver: DATAPASIEN-backed name-first identity resolution
--
-- Precedence (highest first). After the 2026-10-08 export the clinic normalised
-- every No RM, so No RM is the primary key and the name is the guard:
--   1. RM_NAMA_IDENTIK - No RM matches and the name is identical
--   2. RM_NAMA_VARIAN  - No RM matches and the names share a token
--   3. NAMA_UNIK       - the name matches exactly one patient (No RM points elsewhere)
--   4. NAMA+TIEBREAK   - the name matches several; gender, village and birth date
--                        narrow it to one
--   5. NAMA_AMBIGU     - several share the name and nothing distinguishes them;
--                        a deterministic pick is returned and the row is flagged
--   6. RM_SAJA         - only the No RM matched (name unusable); flagged for review
--   7. TIDAK_KETEMU    - nothing matched; the caller must create a patient
--
-- The function always returns exactly one row so every source visit is audited.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.f010_resolve_patient(
  p_no_rm          text,
  p_nama           text,
  p_jenis_kelamin  text,
  p_desa           text,
  p_tanggal_lahir  text
)
RETURNS TABLE (patient_id uuid, resolved_no_rm varchar, rule text)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_name      text := public.norm_name(p_nama);
  v_key       text := public.rm_key(p_no_rm);
  v_jk        text := public.norm_name(p_jenis_kelamin);
  v_desa      text := public.norm_name(p_desa);
  v_dob       text := nullif(btrim(coalesce(p_tanggal_lahir, '')), '');
  v_name_ids  uuid[];
  v_rm_id     uuid;
  v_rm_nama   text;
  v_pick      uuid;
BEGIN
  SELECT p.id, public.norm_name(p.nama)
    INTO v_rm_id, v_rm_nama
    FROM public.patients p
   WHERE public.rm_key(p.no_rm) = v_key
   ORDER BY p.no_rm
   LIMIT 1;

  IF v_name IS NOT NULL THEN
    SELECT array_agg(p.id ORDER BY p.no_rm)
      INTO v_name_ids
      FROM public.patients p
     WHERE public.norm_name(p.nama) = v_name;
  END IF;

  -- No RM is the primary signal now that the clinic normalised the export.
  IF v_rm_id IS NOT NULL AND v_rm_nama IS NOT NULL AND v_rm_nama = v_name THEN
    RETURN QUERY SELECT v_rm_id, (SELECT p.no_rm FROM public.patients p WHERE p.id = v_rm_id), 'RM_NAMA_IDENTIK'::text;
    RETURN;
  END IF;

  IF v_rm_id IS NOT NULL AND public.names_overlap(p_nama, v_rm_nama) THEN
    RETURN QUERY SELECT v_rm_id, (SELECT p.no_rm FROM public.patients p WHERE p.id = v_rm_id), 'RM_NAMA_VARIAN'::text;
    RETURN;
  END IF;

  IF v_name_ids IS NOT NULL AND array_length(v_name_ids, 1) = 1 THEN
    v_pick := v_name_ids[1];
    RETURN QUERY SELECT v_pick, (SELECT p.no_rm FROM public.patients p WHERE p.id = v_pick), 'NAMA_UNIK'::text;
    RETURN;
  END IF;

  IF v_name_ids IS NOT NULL AND array_length(v_name_ids, 1) > 1 THEN
    SELECT p.id
      INTO v_pick
      FROM public.patients p
     WHERE p.id = ANY (v_name_ids)
       AND (v_jk   IS NULL OR public.norm_name(p.jenis_kelamin) = v_jk)
       AND (v_desa IS NULL OR public.norm_name(p.desa) = v_desa)
       AND (v_dob  IS NULL OR btrim(coalesce(p.tanggal_lahir, '')) = v_dob)
     ORDER BY p.no_rm
     LIMIT 1;

    IF v_pick IS NOT NULL THEN
      RETURN QUERY SELECT v_pick, (SELECT p.no_rm FROM public.patients p WHERE p.id = v_pick), 'NAMA+TIEBREAK'::text;
      RETURN;
    END IF;

    v_pick := v_name_ids[1];
    RETURN QUERY SELECT v_pick, (SELECT p.no_rm FROM public.patients p WHERE p.id = v_pick), 'NAMA_AMBIGU'::text;
    RETURN;
  END IF;

  -- Last resort: the No RM is trusted after the clinic normalised the export, so a
  -- row whose name is unusable (for example "-") is assigned by No RM and flagged.
  IF v_rm_id IS NOT NULL THEN
    RETURN QUERY SELECT v_rm_id, (SELECT p.no_rm FROM public.patients p WHERE p.id = v_rm_id), 'RM_SAJA'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT NULL::uuid, NULL::varchar, 'TIDAK_KETEMU'::text;
  RETURN;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. Audit builder and clinic review view
-- -----------------------------------------------------------------------------

-- Fills the audit from the loaded staging visits. Idempotent per source row.
CREATE OR REPLACE FUNCTION public.f010_build_identity_audit()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows integer;
BEGIN
  INSERT INTO public.patient_identity_audit AS a (
    source_table, source_row, source_no_rm, source_nama,
    resolved_patient_id, resolved_no_rm, rule, status
  )
  SELECT
    'REKAMMEDIS',
    r.row_no,
    r.no_rm,
    r.nama,
    res.patient_id,
    res.resolved_no_rm,
    res.rule,
    CASE
      WHEN res.rule IN ('NAMA_AMBIGU', 'RM_SAJA', 'TIDAK_KETEMU') THEN 'PERLU_TINJAUAN'
      ELSE 'COCOK'
    END
  FROM staging.rekam_visit r
  LEFT JOIN LATERAL public.f010_resolve_patient(r.no_rm, r.nama, r.jenis_kelamin, r.desa, r.tanggal_lahir) res
    ON true
  ON CONFLICT (source_table, source_row) DO UPDATE
    SET resolved_patient_id = EXCLUDED.resolved_patient_id,
        resolved_no_rm      = EXCLUDED.resolved_no_rm,
        rule                = EXCLUDED.rule,
        status              = EXCLUDED.status;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- The list the clinic reviews: visits whose patient could not be decided without
-- judgement.
CREATE OR REPLACE VIEW public.v_patient_identity_review
WITH (security_invoker = true)
AS
SELECT
  a.source_row,
  a.source_no_rm,
  a.source_nama,
  a.resolved_no_rm,
  a.rule,
  a.status
FROM public.patient_identity_audit a
WHERE a.status <> 'COCOK'
ORDER BY a.source_nama;

-- -----------------------------------------------------------------------------
-- 6. Row Level Security re-assertion on touched tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
