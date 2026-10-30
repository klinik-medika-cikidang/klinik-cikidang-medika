import { SIRKUMSISI_ACTIVE_DAYS } from '@/constants/clinic';
import type { Circumcision, PostCare, TbcProgram } from '@/types/database';
import { formatLocalDateToYMD } from '@/lib/utils';

// Program Khusus and the dashboard alert banner share these definitions, so both
// screens count the same patients.

export function isActiveTbc(t: Pick<TbcProgram, 'status_tbc'>): boolean {
  return t.status_tbc === 'Dalam Pengobatan' || t.status_tbc === 'Mangkir';
}

/** First procedure date that still counts as active for the given local `today` (YYYY-MM-DD). */
export function circumcisionActiveSince(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  return formatLocalDateToYMD(new Date(y, m - 1, d - SIRKUMSISI_ACTIVE_DAYS));
}

// Imported rows without a procedure date cannot be placed in time, so they are never active.
export function isActiveCircumcision(
  c: Pick<Circumcision, 'tanggal_tindakan'>,
  today: string
): boolean {
  if (!c.tanggal_tindakan) return false;
  return c.tanggal_tindakan >= circumcisionActiveSince(today);
}

export function isActivePostCare(p: Pick<PostCare, 'status_kontrol'>): boolean {
  return p.status_kontrol === 'Menunggu' || p.status_kontrol === 'Mangkir';
}

type PostCareSchedule = Pick<PostCare, 'status_kontrol' | 'tanggal_kontrol_berikutnya'>;

/** A Mangkir agenda is late whatever its date, so it never also counts as due today. */
export function isOverduePostCare(p: PostCareSchedule, today: string): boolean {
  if (!isActivePostCare(p)) return false;
  return p.status_kontrol === 'Mangkir' || p.tanggal_kontrol_berikutnya < today;
}

export function isDueTodayPostCare(p: PostCareSchedule, today: string): boolean {
  return isActivePostCare(p) && !isOverduePostCare(p, today) && p.tanggal_kontrol_berikutnya === today;
}
