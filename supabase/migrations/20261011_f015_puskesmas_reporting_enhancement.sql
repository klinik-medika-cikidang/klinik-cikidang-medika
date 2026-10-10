-- =============================================================================
-- F-015: Peningkatan Laporan Puskesmas & Register Program Kesehatan
--
-- Adds snapshot fields for universal reporting baseline (Tanggal, No RM, Desa)
-- and PTM categorization stream for Puskesmas Cikidang compliance.
--
-- Idempotent: safe to run multiple times.
-- =============================================================================

-- 1. Additive snapshot columns on public.public_health_records
ALTER TABLE public.public_health_records
  ADD COLUMN IF NOT EXISTS tanggal_periksa DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS no_rm VARCHAR(30),
  ADD COLUMN IF NOT EXISTS desa VARCHAR(100),
  ADD COLUMN IF NOT EXISTS kategori_ptm VARCHAR(50);

-- 2. Backfill tanggal_periksa from created_at
UPDATE public.public_health_records
SET tanggal_periksa = created_at::DATE
WHERE tanggal_periksa IS NULL;

-- 3. Backfill no_rm and desa from linked patients
UPDATE public.public_health_records phr
SET
  no_rm = COALESCE(phr.no_rm, p.no_rm),
  desa = COALESCE(phr.desa, p.desa)
FROM public.patients p
WHERE phr.pasien_id = p.id
  AND (phr.no_rm IS NULL OR phr.desa IS NULL);

-- 4. Indexes for fast date range filtering and PTM categories
CREATE INDEX IF NOT EXISTS idx_public_health_tanggal_periksa
  ON public.public_health_records (tanggal_periksa DESC);

CREATE INDEX IF NOT EXISTS idx_public_health_kategori_ptm
  ON public.public_health_records (kategori_ptm)
  WHERE kategori_ptm IS NOT NULL;
