import { describe, it, expect } from 'vitest';
import {
  circumcisionActiveSince,
  isActiveCircumcision,
  isActivePostCare,
  isActiveTbc,
  isDueTodayPostCare,
  isOverduePostCare,
} from './program-status';

describe('isActiveTbc', () => {
  it('treats patients under treatment or lost to follow-up as active', () => {
    expect(isActiveTbc({ status_tbc: 'Dalam Pengobatan' })).toBe(true);
    expect(isActiveTbc({ status_tbc: 'Mangkir' })).toBe(true);
  });

  it('treats finished treatment as inactive', () => {
    expect(isActiveTbc({ status_tbc: 'Sembuh' })).toBe(false);
    expect(isActiveTbc({ status_tbc: 'Pengobatan Lengkap' })).toBe(false);
  });
});

describe('isActiveCircumcision', () => {
  const today = '2026-10-30';

  it('starts the window 14 days before today', () => {
    expect(circumcisionActiveSince(today)).toBe('2026-10-16');
    expect(circumcisionActiveSince('2026-03-05')).toBe('2026-02-19');
  });

  it('keeps day 14 and drops day 15', () => {
    expect(isActiveCircumcision({ tanggal_tindakan: '2026-10-16' }, today)).toBe(true);
    expect(isActiveCircumcision({ tanggal_tindakan: '2026-10-15' }, today)).toBe(false);
  });

  it('keeps a procedure done today', () => {
    expect(isActiveCircumcision({ tanggal_tindakan: today }, today)).toBe(true);
  });

  it('never treats a row without a procedure date as active', () => {
    expect(isActiveCircumcision({ tanggal_tindakan: null }, today)).toBe(false);
    expect(isActiveCircumcision({ tanggal_tindakan: '' }, today)).toBe(false);
  });
});

describe('isActivePostCare', () => {
  it('treats waiting and missed controls as active', () => {
    expect(isActivePostCare({ status_kontrol: 'Menunggu' })).toBe(true);
    expect(isActivePostCare({ status_kontrol: 'Mangkir' })).toBe(true);
  });

  it('treats a completed control as inactive', () => {
    expect(isActivePostCare({ status_kontrol: 'Sudah Kontrol' })).toBe(false);
  });
});

describe('isOverduePostCare and isDueTodayPostCare', () => {
  const today = '2026-10-30';
  const row = (status_kontrol: 'Menunggu' | 'Mangkir' | 'Sudah Kontrol', tanggal_kontrol_berikutnya: string) => ({
    status_kontrol,
    tanggal_kontrol_berikutnya,
  });

  it('puts a Mangkir agenda in the late group only, whatever its date', () => {
    for (const date of ['2026-10-29', today, '2026-11-02']) {
      expect(isOverduePostCare(row('Mangkir', date), today)).toBe(true);
      expect(isDueTodayPostCare(row('Mangkir', date), today)).toBe(false);
    }
  });

  it('places a waiting agenda by its date', () => {
    expect(isOverduePostCare(row('Menunggu', '2026-10-29'), today)).toBe(true);
    expect(isDueTodayPostCare(row('Menunggu', today), today)).toBe(true);
    expect(isOverduePostCare(row('Menunggu', today), today)).toBe(false);
    expect(isOverduePostCare(row('Menunggu', '2026-10-31'), today)).toBe(false);
  });

  it('ignores a finished agenda', () => {
    expect(isOverduePostCare(row('Sudah Kontrol', '2026-10-01'), today)).toBe(false);
    expect(isDueTodayPostCare(row('Sudah Kontrol', today), today)).toBe(false);
  });
});
