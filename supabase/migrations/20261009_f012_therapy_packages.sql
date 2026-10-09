-- F-012: therapy package master and apply-audit tables.
--
-- Additive only. The visits table is unchanged; applying a package writes to the columns
-- the app already uses (terapi_obat, tindakan, keterangan_tindakan, pendapatan_lain,
-- keterangan_pendapatan), so the receipt, cash book, and reports keep one source of truth.
-- visit_therapy_packages is an append-only audit trail, never used to recompute a bill.

CREATE TABLE IF NOT EXISTS public.therapy_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode varchar(30),
  nama varchar(150) NOT NULL,
  deskripsi text,
  harga_total numeric(15,2) NOT NULL DEFAULT 0,
  aktif boolean NOT NULL DEFAULT true,
  created_by_role varchar(30),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_therapy_packages_kode
  ON public.therapy_packages (kode)
  WHERE kode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_therapy_packages_aktif ON public.therapy_packages (aktif);

CREATE TABLE IF NOT EXISTS public.therapy_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.therapy_packages(id) ON DELETE CASCADE,
  jenis_item varchar(20) NOT NULL CHECK (jenis_item IN ('TINDAKAN', 'OBAT', 'LAIN')),
  nama_item varchar(150) NOT NULL,
  qty numeric(10,2) NOT NULL DEFAULT 1 CHECK (qty > 0),
  harga_satuan numeric(15,2) NOT NULL DEFAULT 0 CHECK (harga_satuan >= 0),
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  urutan integer NOT NULL DEFAULT 1,
  catatan text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_therapy_package_items_package_id
  ON public.therapy_package_items (package_id);

CREATE TABLE IF NOT EXISTS public.visit_therapy_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.therapy_packages(id) ON DELETE SET NULL,
  nama_paket_snapshot varchar(150) NOT NULL,
  harga_total_snapshot numeric(15,2) NOT NULL DEFAULT 0,
  items_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  applied_by_role varchar(30),
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_therapy_packages_visit_id
  ON public.visit_therapy_packages (visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_therapy_packages_package_id
  ON public.visit_therapy_packages (package_id);

ALTER TABLE public.therapy_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapy_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_therapy_packages ENABLE ROW LEVEL SECURITY;

-- Baseline policy aligned with the existing project policy style (see F-008/F-010);
-- role rules for managing packages are enforced in the application.
DROP POLICY IF EXISTS "Akses penuh public untuk aplikasi klinik - therapy_packages"
  ON public.therapy_packages;
CREATE POLICY "Akses penuh public untuk aplikasi klinik - therapy_packages"
  ON public.therapy_packages FOR ALL USING (true);
DROP POLICY IF EXISTS "Akses penuh public untuk aplikasi klinik - therapy_package_items"
  ON public.therapy_package_items;
CREATE POLICY "Akses penuh public untuk aplikasi klinik - therapy_package_items"
  ON public.therapy_package_items FOR ALL USING (true);
DROP POLICY IF EXISTS "Akses penuh public untuk aplikasi klinik - visit_therapy_packages"
  ON public.visit_therapy_packages;
CREATE POLICY "Akses penuh public untuk aplikasi klinik - visit_therapy_packages"
  ON public.visit_therapy_packages FOR ALL USING (true);
