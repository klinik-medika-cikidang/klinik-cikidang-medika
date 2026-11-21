// F-015: Jenis KB is a suggested list plus whatever staff have typed before.

import { KB_METHOD_MAX_LENGTH } from '@/constants/clinic';

/** Trims, collapses inner whitespace, and caps the length to fit jenis_kb VARCHAR(100). */
export function normalizeKbMethod(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, KB_METHOD_MAX_LENGTH).trim();
}

/**
 * Defaults first, then stored values in their given order. Duplicates are compared
 * ignoring case and spacing, so "suntik  2 bulan" does not sit next to "Suntik 2 Bulan".
 */
export function mergeKbMethods(
  defaults: readonly string[],
  stored: readonly (string | null | undefined)[]
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of [...defaults, ...stored]) {
    const value = normalizeKbMethod(raw);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged;
}

/** Normalises a typed value and reuses an existing option's spelling when it matches ignoring case. */
export function resolveKbMethod(raw: string | null | undefined, options: readonly string[]): string {
  const value = normalizeKbMethod(raw);
  if (!value) return '';
  const key = value.toLowerCase();
  return options.find((opt) => normalizeKbMethod(opt).toLowerCase() === key) ?? value;
}
