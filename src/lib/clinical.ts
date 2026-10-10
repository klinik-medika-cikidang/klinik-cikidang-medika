import { normalizeRupiah } from './utils';

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

export interface BillingVisitInput {
  jenis_pasien: 'UMUM' | 'BPJS' | string;
  biaya_periksa?: number | null;
  pendapatan_lain?: number | null;
  is_gratis?: boolean | null;
  alasan_gratis?: string | null;
}

export interface ResolvedBilling {
  isGratis: boolean;
  biayaPeriksa: number;
  pendapatanLain: number;
  totalTagihan: number;
  alasanGratis: string;
}

export function resolveVisitBilling(
  visit: BillingVisitInput,
  defaultUmumTariff = 150000
): ResolvedBilling {
  const isFree = Boolean(
    visit.is_gratis ||
      (visit.jenis_pasien === 'UMUM' && visit.biaya_periksa === 0)
  );

  if (visit.jenis_pasien === 'BPJS') {
    return {
      isGratis: false,
      biayaPeriksa: 0,
      pendapatanLain: 0,
      totalTagihan: 0,
      alasanGratis: '',
    };
  }

  if (isFree) {
    return {
      isGratis: true,
      biayaPeriksa: 0,
      pendapatanLain: 0,
      totalTagihan: 0,
      alasanGratis: visit.alasan_gratis || 'Kontrol Pasca Tindakan',
    };
  }

  const biayaPeriksa =
    visit.biaya_periksa !== null && visit.biaya_periksa !== undefined
      ? normalizeRupiah(Number(visit.biaya_periksa))
      : defaultUmumTariff;
  const pendapatanLain = normalizeRupiah(Number(visit.pendapatan_lain || 0));

  return {
    isGratis: false,
    biayaPeriksa,
    pendapatanLain,
    totalTagihan: biayaPeriksa + pendapatanLain,
    alasanGratis: '',
  };
}

