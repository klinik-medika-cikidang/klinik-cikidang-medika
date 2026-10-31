// F-024: usia kehamilan (UK) and taksiran persalinan (TP) for the ANC and 3 Eliminasi registers.

const TERM_DAYS = 280;
const DAY_MS = 24 * 60 * 60 * 1000;

function isValidGestationalAge(weeks: number, days: number): boolean {
  return (
    Number.isInteger(weeks) && weeks >= 1 && weeks <= 42 &&
    Number.isInteger(days) && days >= 0 && days <= 6
  );
}

function parseYmd(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Date.UTC rolls 2026-02-30 over to March; reject instead of guessing.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/**
 * Due date by Naegele's rule from the gestational age measured on the exam date.
 * Computed in UTC so the result does not move with the browser time zone.
 */
export function estimateDueDate(examYmd: string, weeks: number, days = 0): string | null {
  if (!isValidGestationalAge(weeks, days)) return null;
  const exam = parseYmd(examYmd);
  if (!exam) return null;
  const due = new Date(exam.getTime() + (TERM_DAYS - (weeks * 7 + days)) * DAY_MS);
  return due.toISOString().slice(0, 10);
}

/**
 * A hand-typed TP must fall where the accepted UK range can put it (42w6d to 0 weeks),
 * which catches a mistyped year such as 0026 before it reaches the Puskesmas report.
 */
export function isPlausibleDueDate(examYmd: string, dueYmd: string): boolean {
  const exam = parseYmd(examYmd);
  const due = parseYmd(dueYmd);
  if (!exam || !due) return false;
  const offsetDays = Math.round((due.getTime() - exam.getTime()) / DAY_MS);
  return offsetDays >= TERM_DAYS - (42 * 7 + 6) && offsetDays <= TERM_DAYS;
}

export function formatGestationalAge(weeks: number, days = 0): string {
  return days > 0 ? `${weeks} minggu ${days} hari` : `${weeks} minggu`;
}

/** dd/mm/yyyy, the form the imported sheet rows already use in the register. */
export function formatDueDate(ymd: string): string | null {
  if (!parseYmd(ymd)) return null;
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}
