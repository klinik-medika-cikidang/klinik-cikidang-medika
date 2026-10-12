import { describe, it, expect } from 'vitest';
import { parseFlexibleDate, calculateAgeFromDob, formatDateShort } from './utils';

describe('parseFlexibleDate', () => {
  it('parses standard ISO YYYY-MM-DD', () => {
    expect(parseFlexibleDate('1990-08-15')).toBe('1990-08-15');
    expect(parseFlexibleDate('2021/05/14')).toBe('2021-05-14');
  });

  it('parses standard Indonesian day-first formats DD/MM/YYYY and DD-MM-YYYY', () => {
    expect(parseFlexibleDate('15/08/1990')).toBe('1990-08-15');
    expect(parseFlexibleDate('15-08-1990')).toBe('1990-08-15');
    expect(parseFlexibleDate('01.01.2000')).toBe('2000-01-01');
    expect(parseFlexibleDate('5/8/2021')).toBe('2021-08-05');
  });

  it('parses compact 8-digit numeric DDMMYYYY', () => {
    expect(parseFlexibleDate('15081990')).toBe('1990-08-15');
    expect(parseFlexibleDate('01012015')).toBe('2015-01-01');
  });

  it('parses Indonesian textual month formats', () => {
    expect(parseFlexibleDate('15 Agustus 1990')).toBe('1990-08-15');
    expect(parseFlexibleDate('15 Ags 1990')).toBe('1990-08-15');
    expect(parseFlexibleDate('1 Mei 2020')).toBe('2020-05-01');
    expect(parseFlexibleDate('12 Desember 2012')).toBe('2012-12-12');
  });

  it('handles invalid or empty dates gracefully', () => {
    expect(parseFlexibleDate('')).toBeNull();
    expect(parseFlexibleDate(null)).toBeNull();
    expect(parseFlexibleDate('bukan tanggal')).toBeNull();
    expect(parseFlexibleDate('99/99/9999')).toBeNull();
  });
});

describe('calculateAgeFromDob', () => {
  it('calculates age in years correctly', () => {
    const dob = '2000-01-01';
    const age = calculateAgeFromDob(dob);
    expect(age).toBeGreaterThanOrEqual(24);
  });

  it('returns null on invalid date', () => {
    expect(calculateAgeFromDob(null)).toBeNull();
    expect(calculateAgeFromDob('')).toBeNull();
    expect(calculateAgeFromDob('invalid')).toBeNull();
  });
});

describe('formatDateShort', () => {
  it('formats dates in Indonesian short style', () => {
    const formatted = formatDateShort('1990-08-15');
    expect(formatted).toContain('1990');
    expect(formatted.toLowerCase()).toMatch(/ags|agu/);
  });

  it('returns dash for null/empty', () => {
    expect(formatDateShort(null)).toBe('-');
    expect(formatDateShort('')).toBe('-');
  });
});
