-- F-011: per-visit program category.
--
-- public_health_records stays the register source for special programs. This column is
-- the visit-level summary used for display and filtering, so a visit without a special
-- program still carries a value ("UMUM"). Additive only; no data is removed.

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS kategori_program VARCHAR(30) NOT NULL DEFAULT 'UMUM';

ALTER TABLE public.visits
  DROP CONSTRAINT IF EXISTS visits_kategori_program_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_kategori_program_check
  CHECK (kategori_program IN ('UMUM', 'ANC', 'PTM', 'KB', 'ELIMINASI_3'));
