import { describe, expect, it, vi } from 'vitest';
import {
  MIN_BASELINE_SEQUENCE,
  fetchNextMedicalRecordNumber,
  formatMedicalRecordNumber,
  isValidMedicalRecordNumber,
  resolveRmPrefix,
} from './rm';

describe('src/lib/rm.ts', () => {
  describe('resolveRmPrefix', () => {
    it('resolves correct 4-digit prefix for standard combinations', () => {
      expect(resolveRmPrefix('Laki-laki', 'Cikidang')).toBe('0101');
      expect(resolveRmPrefix('Perempuan', 'Pangkalan')).toBe('0202');
      expect(resolveRmPrefix('Perempuan', 'Cicareuh')).toBe('0203');
      expect(resolveRmPrefix('Perempuan', 'Nangka Koneng')).toBe('0208');
    });

    it('handles legacy village aliases gracefully', () => {
      expect(resolveRmPrefix('Laki-laki', 'Tamansari')).toBe('0110');
      expect(resolveRmPrefix('Perempuan', 'Bumiasih')).toBe('0209');
    });

    it('falls back to 13 (Luar Daerah) for unknown village names', () => {
      expect(resolveRmPrefix('Laki-laki', 'Kota Sukabumi')).toBe('0113');
      expect(resolveRmPrefix('Perempuan', 'Bandung')).toBe('0213');
    });
  });

  describe('formatMedicalRecordNumber', () => {
    it('formats 9 digits with zero padding', () => {
      expect(formatMedicalRecordNumber('Laki-laki', 'Cikidang', 3741)).toBe('010103741');
      expect(formatMedicalRecordNumber('Perempuan', 'Pangkalan', 1)).toBe('020200001');
      expect(formatMedicalRecordNumber('Perempuan', 'Nangka Koneng', 2708)).toBe('020802708');
    });
  });

  describe('isValidMedicalRecordNumber', () => {
    it('accepts exact 9 numeric digits', () => {
      expect(isValidMedicalRecordNumber('010103741')).toBe(true);
      expect(isValidMedicalRecordNumber('020802709')).toBe(true);
    });

    it('rejects hyphenated, short, or long numbers', () => {
      expect(isValidMedicalRecordNumber('01-01-000001')).toBe(false);
      expect(isValidMedicalRecordNumber('01010374')).toBe(false);
      expect(isValidMedicalRecordNumber('01010374100')).toBe(false);
      expect(isValidMedicalRecordNumber('')).toBe(false);
      expect(isValidMedicalRecordNumber('01010374A')).toBe(false);
    });
  });

  describe('fetchNextMedicalRecordNumber', () => {
    it('returns RPC result when database call succeeds', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: '010103741', error: null }),
        from: vi.fn(),
      } as any;

      const result = await fetchNextMedicalRecordNumber(mockSupabase, 'Laki-laki', 'Cikidang');
      expect(result).toBe('010103741');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_next_no_rm', {
        p_jenis_kelamin: 'Laki-laki',
        p_desa: 'Cikidang',
      });
    });

    it('falls back to client-side sequence calculation if RPC errors', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('RPC not found') }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  { no_rm: '010103740' },
                  { no_rm: '020203739' },
                ],
                error: null,
              }),
            }),
          }),
        }),
      } as any;

      const result = await fetchNextMedicalRecordNumber(mockSupabase, 'Perempuan', 'Pangkalan');
      // Max sequence in mocked records is 3740, so next sequence is 3741
      expect(result).toBe('020203741');
    });

    it('falls back to MIN_BASELINE_SEQUENCE if database returns no records', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      } as any;

      const result = await fetchNextMedicalRecordNumber(mockSupabase, 'Laki-laki', 'Cikidang');
      expect(result).toBe(`01010${MIN_BASELINE_SEQUENCE}`);
    });
  });
});
