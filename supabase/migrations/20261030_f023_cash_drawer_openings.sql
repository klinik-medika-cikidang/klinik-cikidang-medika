-- Migration: 20261030_f023_cash_drawer_openings.sql
-- Feature: F-023 Saldo Awal Laci Kasir
-- Additive only: one new table. cash_flows and visits are not touched (INV-023-3).
--
-- One opening balance per month; periode is always the first day of the month.
-- Risk R-023-1: owner-only writing is enforced in the UI. Enforcing it in RLS needs the
-- role in app_metadata, which is a project-wide change outside this feature.

CREATE TABLE IF NOT EXISTS public.cash_drawer_openings (
  periode DATE PRIMARY KEY CHECK (EXTRACT(DAY FROM periode) = 1),
  nominal NUMERIC(15,2) NOT NULL CHECK (nominal >= 0),
  catatan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_drawer_openings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses terautentikasi - cash_drawer_openings" ON public.cash_drawer_openings;
CREATE POLICY "Akses terautentikasi - cash_drawer_openings"
  ON public.cash_drawer_openings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
