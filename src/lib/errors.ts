/**
 * Supabase returns raw Postgres error codes. Clinic staff need a readable Indonesian
 * line instead, so known codes are mapped here and everything else falls back to a
 * neutral message. The raw error is left to the caller to log.
 */
type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
};

export function describeSupabaseError(error: unknown, fallback: string): string {
  const err = error as PostgrestLikeError | null;
  switch (err?.code) {
    case '42P01':
      return 'Tabel paket terapi belum tersedia. Hubungi pengembang untuk menerapkan migrasi.';
    case '23503':
      return 'Data terkait tidak ditemukan. Muat ulang halaman lalu coba lagi.';
    case '23505':
      return 'Kode paket sudah digunakan oleh paket lain.';
    case '23514':
      return 'Nilai item tidak valid. Periksa jumlah dan harga yang diisi.';
    case '42501':
      return 'Peran akun ini tidak berhak mengubah paket terapi.';
    case 'PGRST301':
      return 'Sesi Anda berakhir. Silakan masuk kembali.';
    default:
      return fallback;
  }
}
