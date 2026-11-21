import { describe, expect, it } from 'vitest';
import { KB_METHOD_MAX_LENGTH, KB_METHOD_OPTIONS } from '@/constants/clinic';
import { mergeKbMethods, normalizeKbMethod, resolveKbMethod } from '@/lib/kb-methods';

describe('F-015 normalizeKbMethod', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeKbMethod('  Suntik   2\tBulan \n')).toBe('Suntik 2 Bulan');
  });

  it('returns an empty string for blank input', () => {
    expect(normalizeKbMethod('   ')).toBe('');
    expect(normalizeKbMethod(null)).toBe('');
    expect(normalizeKbMethod(undefined)).toBe('');
  });

  it('caps the value at the column length', () => {
    const long = 'a'.repeat(KB_METHOD_MAX_LENGTH + 20);
    expect(normalizeKbMethod(long)).toHaveLength(KB_METHOD_MAX_LENGTH);
  });

  it('does not leave a trailing space after the cut', () => {
    const value = `${'a'.repeat(KB_METHOD_MAX_LENGTH - 1)} b`;
    expect(normalizeKbMethod(value)).toBe('a'.repeat(KB_METHOD_MAX_LENGTH - 1));
  });
});

describe('F-015 mergeKbMethods', () => {
  it('lists Suntik 2 Bulan between Suntik 1 Bulan and Suntik 3 Bulan', () => {
    expect(KB_METHOD_OPTIONS.slice(0, 3)).toEqual(['Suntik 1 Bulan', 'Suntik 2 Bulan', 'Suntik 3 Bulan']);
  });

  it('keeps defaults first and appends new stored values in order', () => {
    expect(mergeKbMethods(['Pil KB', 'Implan'], ['Koyok KB', 'Cincin Vagina'])).toEqual([
      'Pil KB',
      'Implan',
      'Koyok KB',
      'Cincin Vagina',
    ]);
  });

  it('drops stored duplicates ignoring case and spacing, keeping the default spelling', () => {
    expect(mergeKbMethods(['Suntik 2 Bulan'], ['suntik  2 BULAN', 'Koyok KB', 'koyok kb'])).toEqual([
      'Suntik 2 Bulan',
      'Koyok KB',
    ]);
  });

  it('skips empty and null stored values', () => {
    expect(mergeKbMethods(['Pil KB'], [null, undefined, '', '   '])).toEqual(['Pil KB']);
  });
});

describe('F-015 resolveKbMethod', () => {
  const options = ['Suntik 1 Bulan', 'Suntik 2 Bulan', 'Koyok KB'];

  it('reuses the existing spelling when the typed value matches ignoring case', () => {
    expect(resolveKbMethod('  suntik 2   bulan ', options)).toBe('Suntik 2 Bulan');
  });

  it('returns the normalised typed value when it is new', () => {
    expect(resolveKbMethod('  Cincin   Vagina ', options)).toBe('Cincin Vagina');
  });

  it('returns an empty string for blank input', () => {
    expect(resolveKbMethod('  ', options)).toBe('');
  });
});
