-- Migration: 20261010_f012_activate_packages.sql
-- Feature: F-012 Paket Terapi
-- Deskripsi: Mengaktifkan paket terapi awal di database produksi dan staging
-- agar dapat langsung diakses pada workstation Pemeriksaan Dokter dan Loket Kasir.

UPDATE public.therapy_packages
SET aktif = true,
    updated_at = now()
WHERE aktif = false;
