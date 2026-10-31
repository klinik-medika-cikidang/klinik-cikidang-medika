import { describe, it, expect } from 'vitest';
import { estimateDueDate, formatDueDate, formatGestationalAge, isPlausibleDueDate } from './pregnancy';

describe('estimateDueDate', () => {
  it('matches the ultrasound EDD from the clinic example', () => {
    // Mindray, 2026-10-27: AC GA 33w3d, EDD 12/12/2026.
    expect(estimateDueDate('2026-10-27', 33, 3)).toBe('2026-12-12');
  });

  it('adds 280 days at zero weeks equivalent and counts days within the week', () => {
    expect(estimateDueDate('2026-01-01', 40, 0)).toBe('2026-01-01');
    expect(estimateDueDate('2026-01-01', 39, 6)).toBe('2026-01-02');
    expect(estimateDueDate('2026-10-27', 34, 0)).toBe('2026-12-08');
  });

  it('crosses month and year boundaries, including a leap day', () => {
    expect(estimateDueDate('2026-10-27', 8, 0)).toBe('2027-06-08');
    expect(estimateDueDate('2028-02-01', 36, 0)).toBe('2028-02-29');
  });

  it('treats a missing days value as zero', () => {
    expect(estimateDueDate('2026-10-27', 33)).toBe(estimateDueDate('2026-10-27', 33, 0));
  });

  it('rejects values outside the accepted range', () => {
    expect(estimateDueDate('2026-10-27', 0, 0)).toBeNull();
    expect(estimateDueDate('2026-10-27', 43, 0)).toBeNull();
    expect(estimateDueDate('2026-10-27', 33, 7)).toBeNull();
    expect(estimateDueDate('2026-10-27', 33, -1)).toBeNull();
    expect(estimateDueDate('2026-10-27', 33.5, 0)).toBeNull();
    expect(estimateDueDate('2026-10-27', Number.NaN, 0)).toBeNull();
  });

  it('rejects an invalid exam date', () => {
    expect(estimateDueDate('', 33, 0)).toBeNull();
    expect(estimateDueDate('27/10/2026', 33, 0)).toBeNull();
    expect(estimateDueDate('2026-02-30', 33, 0)).toBeNull();
  });
});

describe('formatGestationalAge', () => {
  it('writes weeks, and days only when there are any', () => {
    expect(formatGestationalAge(33, 3)).toBe('33 minggu 3 hari');
    expect(formatGestationalAge(28, 0)).toBe('28 minggu');
    expect(formatGestationalAge(28)).toBe('28 minggu');
  });
});

describe('formatDueDate', () => {
  it('uses the dd/mm/yyyy form of the imported sheet rows', () => {
    expect(formatDueDate('2026-12-12')).toBe('12/12/2026');
    expect(formatDueDate('2027-06-08')).toBe('08/06/2027');
  });

  it('returns null for an empty or malformed value', () => {
    expect(formatDueDate('')).toBeNull();
    expect(formatDueDate('12/12/2026')).toBeNull();
  });
});

describe('isPlausibleDueDate', () => {
  it('accepts a due date within the range the UK inputs can produce', () => {
    expect(isPlausibleDueDate('2026-10-27', '2026-12-12')).toBe(true);
    expect(isPlausibleDueDate('2026-10-27', '2026-10-07')).toBe(true);
    expect(isPlausibleDueDate('2026-10-27', '2027-08-03')).toBe(true);
  });

  it('rejects a mistyped year or a date far outside a pregnancy', () => {
    expect(isPlausibleDueDate('2026-10-27', '0026-12-12')).toBe(false);
    expect(isPlausibleDueDate('2026-10-27', '2026-10-06')).toBe(false);
    expect(isPlausibleDueDate('2026-10-27', '2027-08-04')).toBe(false);
  });

  it('rejects malformed dates', () => {
    expect(isPlausibleDueDate('2026-10-27', '12/12/2026')).toBe(false);
    expect(isPlausibleDueDate('', '2026-12-12')).toBe(false);
  });
});
