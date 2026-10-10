export type PtmCategory = 'Hipertensi' | 'Diabetes' | 'Lainnya';

export function classifyPtm(record: {
  diagnosa?: string | null;
  kategori_ptm?: string | null;
}): PtmCategory {
  if (record.kategori_ptm) {
    const explicit = record.kategori_ptm.toLowerCase();
    if (explicit.includes('hipertensi')) return 'Hipertensi';
    if (explicit.includes('diabet')) return 'Diabetes';
  }

  const text = (record.diagnosa || '').toLowerCase();
  if (!text) return 'Lainnya';

  // Diabetes patterns (takes precedence over generic "darah tinggi" when "gula darah" is present)
  const isDiabetes =
    text.includes('diabetes') ||
    /\bdm\b/.test(text) ||
    text.includes('e10') ||
    text.includes('e11') ||
    text.includes('e14') ||
    text.includes('kencing manis') ||
    text.includes('gula darah') ||
    text.includes('gds tinggi');

  if (isDiabetes) return 'Diabetes';

  // Hipertensi patterns
  const isHipertensi =
    text.includes('hipertensi') ||
    /\bht\b/.test(text) ||
    text.includes('i10') ||
    text.includes('i11') ||
    text.includes('i15') ||
    text.includes('tekanan darah tinggi') ||
    text.includes('tensi tinggi') ||
    text.includes('kardio') ||
    (!text.includes('gula') && text.includes('darah tinggi'));

  if (isHipertensi) return 'Hipertensi';

  return 'Lainnya';
}
