-- =============================================================================
-- F-016: Dukungan Pembebasan Biaya Pasien Umum (Free 100% / Rp 0)
-- =============================================================================
-- Menambahkan kolom penanda pembebasan biaya dan alasan pembebasan biaya
-- pada tabel public.visits. Memungkinkan dokter dan kasir membebaskan biaya (Rp 0)
-- dengan transparansi audit tanpa memanipulasi buku kas riil klinik.
-- =============================================================================

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS is_gratis BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alasan_gratis TEXT;

CREATE INDEX IF NOT EXISTS idx_visits_is_gratis
  ON public.visits(is_gratis)
  WHERE is_gratis = TRUE;
