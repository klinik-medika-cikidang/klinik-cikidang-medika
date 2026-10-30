import { describe, expect, it } from 'vitest';
import {
  MAX_OPENING_NOMINAL,
  isDuplicatePeriodeError,
  openingSchema,
  parseNominalDigits,
} from './DrawerOpeningModal';

describe('isDuplicatePeriodeError', () => {
  it('recognises the Postgres unique violation by its code', () => {
    expect(
      isDuplicatePeriodeError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "cash_drawer_openings_pkey"',
      })
    ).toBe(true);
  });

  it('ignores other errors and non-objects', () => {
    expect(isDuplicatePeriodeError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isDuplicatePeriodeError(new Error('duplicate key'))).toBe(false);
    expect(isDuplicatePeriodeError(null)).toBe(false);
    expect(isDuplicatePeriodeError('23505')).toBe(false);
  });
});

describe('parseNominalDigits', () => {
  it('reads the formatted Rupiah the field shows', () => {
    expect(parseNominalDigits('1.500.000')).toBe(1_500_000);
    expect(parseNominalDigits('0')).toBe(0);
  });

  it('keeps an empty field apart from Rp 0', () => {
    expect(parseNominalDigits('')).toBeNull();
    expect(parseNominalDigits('Rp ')).toBeNull();
  });

  it('stays an exact integer for a very long digit string', () => {
    const value = parseNominalDigits('9'.repeat(30));
    expect(value).not.toBeNull();
    expect(Number.isSafeInteger(value)).toBe(true);
  });
});

describe('openingSchema', () => {
  it('accepts the largest amount NUMERIC(15,2) can hold', () => {
    expect(openingSchema.safeParse({ nominal: MAX_OPENING_NOMINAL }).success).toBe(true);
  });

  it('rejects an amount past NUMERIC(15,2) with an Indonesian message', () => {
    const parsed = openingSchema.safeParse({ nominal: parseNominalDigits('9'.repeat(20)) });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(
      'Nominal saldo awal terlalu besar. Periksa kembali angkanya.'
    );
  });

  it('still requires a value', () => {
    const parsed = openingSchema.safeParse({ nominal: undefined });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(
      'Nominal saldo awal wajib diisi. Isi 0 bila laci kosong.'
    );
  });
});
