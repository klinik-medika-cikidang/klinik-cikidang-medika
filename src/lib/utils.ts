import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeRupiah(amount: number): number {
  if (!amount || isNaN(amount)) return 0;
  // Historical clinic CSV data recorded numbers in thousands (ribuan)
  if (amount > 0 && amount < 10000) {
    return amount * 1000;
  }
  return amount;
}

export function formatRupiah(amount: number): string {
  const normalized = normalizeRupiah(amount);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(normalized);
}

export function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

const INDO_MONTH_MAP: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, ags: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

export function parseFlexibleDate(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim().replace(/,/g, ' ');
  if (!clean) return null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 2. Day-first standard: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 3. Compact 8-digit numeric: DDMMYYYY
  const compactMatch = clean.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactMatch) {
    const d = parseInt(compactMatch[1], 10);
    const m = parseInt(compactMatch[2], 10);
    const y = parseInt(compactMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 4. Textual month format: "15 Agustus 1990" or "15-Ags-1990" or "15 Aug 1990"
  const textMatch = clean.match(/^(\d{1,2})\s*[-/.\s]\s*([a-zA-Z]+)\s*[-/.\s]\s*(\d{4})$/);
  if (textMatch) {
    const d = parseInt(textMatch[1], 10);
    const monthWord = textMatch[2].toLowerCase();
    const y = parseInt(textMatch[3], 10);
    const m = INDO_MONTH_MAP[monthWord];
    if (m && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
}

export function calculateAgeFromDob(dobString: string | null | undefined): number | null {
  if (!dobString) return null;
  try {
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  } catch {
    return null;
  }
}

// Reports state the period they are showing, so an empty result or a printed copy is
// never ambiguous about what was searched.
export function describePeriod(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return 'Semua Periode Data';
  if (startDate && endDate && startDate === endDate) return formatDateIndo(startDate);
  if (startDate && endDate) return `${formatDateIndo(startDate)} sampai ${formatDateIndo(endDate)}`;
  if (startDate) return `Mulai ${formatDateIndo(startDate)}`;
  return `Sampai ${formatDateIndo(endDate)}`;
}

/**
 * Formats a Date object to YYYY-MM-DD using local calendar components.
 * Prevents UTC timezone shift (e.g. UTC+7 WIB shifting 1st of month to previous month in toISOString).
 */
export function formatLocalDateToYMD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
