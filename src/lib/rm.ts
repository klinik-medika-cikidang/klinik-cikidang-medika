/**
 * Canonical Medical Record Number (No RM) Utilities
 * Klinik Pratama Cikidang Medika
 *
 * Format Baku Klinik (9 Digit Numerik):
 * - Digit 1-2 : Kode Jenis Kelamin (01 = Laki-laki, 02 = Perempuan)
 * - Digit 3-4 : Kode Desa (01 = Cikidang, 02 = Pangkalan, ..., 13 = Luar Daerah)
 * - Digit 5-9 : Nomor Urut Global Pendaftaran Pasien (5 digit, zero-padded, min. 03741)
 *
 * Contoh: 010103741 (Laki-laki, Cikidang, urutan 3741)
 */

import { DESA_RM_CODE, JENIS_KELAMIN_RM_CODE, type JenisKelaminOption } from '@/constants/clinic';
import type { SupabaseClient } from '@supabase/supabase-js';

export const MIN_BASELINE_SEQUENCE = 3741;

/**
 * Normalizes string for prefix matching (lowercase, stripped punctuation, normalized whitespace).
 */
export function normalizeRmToken(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves 4-digit prefix for given gender and village name.
 */
export function resolveRmPrefix(jenisKelamin: 'Laki-laki' | 'Perempuan' | string, desa: string): string {
  const normJk = normalizeRmToken(jenisKelamin);
  const jkCode = normJk.includes('perempuan') ? '02' : '01';

  // Normalize village name and map to canonical code
  const normDesa = normalizeRmToken(desa);
  let desaCode = '13'; // Default Luar Daerah

  for (const [name, code] of Object.entries(DESA_RM_CODE)) {
    if (normalizeRmToken(name) === normDesa) {
      desaCode = code;
      break;
    }
  }

  return `${jkCode}${desaCode}`;
}

/**
 * Formats a canonical 9-digit medical record number from prefix and global sequence number.
 */
export function formatMedicalRecordNumber(
  jenisKelamin: 'Laki-laki' | 'Perempuan' | string,
  desa: string,
  sequenceNumber: number
): string {
  const prefix = resolveRmPrefix(jenisKelamin, desa);
  const paddedSeq = String(Math.max(1, sequenceNumber)).padStart(5, '0');
  return `${prefix}${paddedSeq}`;
}

/**
 * Validates whether a given string adheres to canonical 9-digit RM rules.
 */
export function isValidMedicalRecordNumber(noRm: string): boolean {
  if (!noRm) return false;
  const digits = noRm.replace(/[^0-9]/g, '');
  return digits.length === 9 && digits === noRm.trim();
}

/**
 * Fetches the next available canonical 9-digit No RM from Supabase.
 * Uses `get_next_no_rm` database RPC as primary source, with robust client-side fallback.
 */
export async function fetchNextMedicalRecordNumber(
  supabase: SupabaseClient,
  jenisKelamin: 'Laki-laki' | 'Perempuan',
  desa: string
): Promise<string> {
  // 1. Primary: Database RPC
  try {
    const { data, error } = await supabase.rpc('get_next_no_rm', {
      p_jenis_kelamin: jenisKelamin,
      p_desa: desa,
    });

    if (!error && typeof data === 'string' && data.length === 9) {
      return data;
    }
  } catch {
    // Continue to fallback on any RPC error
  }

  // 2. Client-side fallback: query latest records and extract highest sequence
  try {
    const prefix = resolveRmPrefix(jenisKelamin, desa);

    const { data: latestRows, error: fetchErr } = await supabase
      .from('patients')
      .select('no_rm')
      .order('created_at', { ascending: false })
      .limit(200);

    if (fetchErr) throw fetchErr;

    let maxSeq = MIN_BASELINE_SEQUENCE - 1;

    if (latestRows && latestRows.length > 0) {
      for (const row of latestRows) {
        const raw = String(row.no_rm || '').replace(/[^0-9]/g, '');
        if (raw.length === 9) {
          const seq = Number.parseInt(raw.slice(4), 10);
          if (!Number.isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    }

    const nextSeq = Math.max(maxSeq + 1, MIN_BASELINE_SEQUENCE);
    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  } catch (err) {
    console.error('Failed to resolve next No RM in fallback:', err);
    const prefix = resolveRmPrefix(jenisKelamin, desa);
    return `${prefix}${String(MIN_BASELINE_SEQUENCE).padStart(5, '0')}`;
  }
}
