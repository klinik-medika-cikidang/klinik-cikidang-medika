-- =============================================================================
-- F-014: Dukungan Pembatalan Antrean Pasien (Soft Cancellation)
-- =============================================================================
-- Menambahkan kolom audit pembatalan antrean pada tabel visits.
-- Operasi pembatalan antrean dilakukan secara soft-cancel (status_pembayaran = 'Batal')
-- untuk mematuhi regulasi rekam medis (Permenkes 24/2022) tanpa hard DELETE.
-- =============================================================================

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS alasan_batal TEXT,
  ADD COLUMN IF NOT EXISTS dibatalkan_pada TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_visits_status_pembayaran_batal
  ON public.visits(status_pembayaran)
  WHERE status_pembayaran = 'Batal';
