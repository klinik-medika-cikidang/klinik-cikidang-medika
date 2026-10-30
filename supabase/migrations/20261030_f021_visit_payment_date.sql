-- Migration: 20261030_f021_visit_payment_date.sql
-- Feature: F-021 Pencatatan Tanggal Bayar Pasien
-- Additive only: new nullable columns and an index. No existing row is updated
-- (INV-021-2); rows with tanggal_bayar NULL are read as paid on tanggal_periksa.
--
-- tanggal_bayar     date of the first payment (settle as Lunas, Piutang, or free)
-- tanggal_pelunasan date a Piutang balance was paid off (DEC-021-3)
-- nominal_pelunasan amount received on tanggal_pelunasan

ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS tanggal_bayar DATE;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS tanggal_pelunasan DATE;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS nominal_pelunasan NUMERIC(15,2);

ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS chk_visits_nominal_pelunasan;
ALTER TABLE public.visits
  ADD CONSTRAINT chk_visits_nominal_pelunasan CHECK (nominal_pelunasan IS NULL OR nominal_pelunasan >= 0);

CREATE INDEX IF NOT EXISTS idx_visits_tanggal_bayar ON public.visits(tanggal_bayar);
CREATE INDEX IF NOT EXISTS idx_visits_tanggal_pelunasan ON public.visits(tanggal_pelunasan);
