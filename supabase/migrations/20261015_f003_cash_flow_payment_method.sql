-- F-003: metode pembayaran untuk mutasi buku kas.
-- Pengeluaran yang dibayar via transfer tetap tercatat sebagai biaya operasional,
-- tetapi tidak boleh mengurangi uang tunai di laci kasir. Baris lama otomatis
-- bernilai 'Tunai' sehingga perhitungan laci sebelumnya tidak berubah.
-- Nilai mengikuti visits.jenis_pembayaran ('Tunai' / 'TF').

ALTER TABLE public.cash_flows
  ADD COLUMN IF NOT EXISTS jenis_pembayaran VARCHAR(10) NOT NULL DEFAULT 'Tunai';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_flows_jenis_pembayaran_check'
  ) THEN
    ALTER TABLE public.cash_flows
      ADD CONSTRAINT cash_flows_jenis_pembayaran_check
      CHECK (jenis_pembayaran IN ('Tunai', 'TF'));
  END IF;
END $$;
