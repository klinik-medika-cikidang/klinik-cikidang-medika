-- Migration: 20261030_f021b_visit_payoff_method.sql
-- Feature: F-021 Pencatatan Tanggal Bayar Pasien (review follow-up)
-- Additive only. A Piutang can be paid off by a different method than the first
-- payment (cash first, transfer later). Without its own column the payoff method
-- overwrote jenis_pembayaran and moved the first payment out of, or into, the drawer
-- after that day was already reconciled.

ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS metode_pelunasan VARCHAR(10);

ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS chk_visits_metode_pelunasan;
ALTER TABLE public.visits
  ADD CONSTRAINT chk_visits_metode_pelunasan CHECK (metode_pelunasan IS NULL OR metode_pelunasan IN ('Tunai', 'TF'));
