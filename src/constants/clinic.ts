/**
 * Canonical Clinic Constants & Configuration
 * Klinik Pratama Cikidang Medika
 */

import type { TherapyPackageItemType } from '@/types/database';

export const CLINIC_PROFILE = {
  name: 'Klinik Pratama Cikidang Medika',
  shortName: 'Klinik Cikidang Medika',
  tagline: 'Layanan Kesehatan Terpadu Masyarakat Cikidang',
  address: 'Jl. Raya Cikidang KM. 01, Kec. Cikidang, Kab. Sukabumi, Jawa Barat 43367',
  phone: '0857-2090-0012',
  email: 'klinik.cikidangmedika@gmail.com',
  license: '503/012/K-PRATAMA/DPMPTSP/2024',
  faskesCode: '0122B004',
} as const;

export const DESA_OPTIONS = [
  'Cikidang',
  'Pangkalan',
  'Cicareuh',
  'Cijambe',
  'Mekar Nangka',
  'Cikiray',
  'Sampora',
  'Nangka Koneng',
  'Bumisari',
  'Taman Sari',
  'Gunung Malang',
  'Cikaray Toyibah',
  'Luar Daerah',
] as const;

export type DesaOption = typeof DESA_OPTIONS[number];

export const GELAR_OPTIONS = ['Tn.', 'Ny.', 'Nn.', 'An.', 'By.'] as const;
export type GelarOption = typeof GELAR_OPTIONS[number];

export const JENIS_KELAMIN_OPTIONS = ['Laki-laki', 'Perempuan'] as const;
export type JenisKelaminOption = typeof JENIS_KELAMIN_OPTIONS[number];

export const JENIS_KELAMIN_RM_CODE: Record<JenisKelaminOption, string> = {
  'Laki-laki': '01',
  Perempuan: '02',
} as const;

export const DESA_RM_CODE: Record<string, string> = {
  Cikidang: '01',
  Pangkalan: '02',
  Cicareuh: '03',
  Cijambe: '04',
  'Mekar Nangka': '05',
  Cikiray: '06',
  Sampora: '07',
  'Nangka Koneng': '08',
  Bumisari: '09',
  'Taman Sari': '10',
  'Gunung Malang': '11',
  'Cikaray Toyibah': '12',
  'Luar Daerah': '13',
  // Legacy alias compatibility
  Tamansari: '10',
  Gunungmalang: '11',
  Bumiasih: '09',
  Nangerang: '05',
} as const;

export const JENIS_PASIEN_OPTIONS = ['BPJS', 'UMUM'] as const;
export type JenisPasienOption = typeof JENIS_PASIEN_OPTIONS[number];

export const METODE_PEMBAYARAN_OPTIONS = ['Tunai', 'TF'] as const;
export type MetodePembayaranOption = typeof METODE_PEMBAYARAN_OPTIONS[number];

export const DEFAULT_TARIFFS = {
  umum: 150000,
  bpjs: 0,
} as const;

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export const CASH_FLOW_CATEGORIES = {
  masuk: [
    'Kapitasi BPJS',
    'Setor Tunai',
    'Pendapatan Lain',
    'Rujukan USG / Lab',
  ],
  keluar: [
    'Pengeluaran Obat / Operasional',
    'Pengeluaran Non Klinik',
    'Operasional & Listrik/Air',
    'Honor & Transport',
    'Perlengkapan Medis',
    'Setor ke Rekening Pemilik',
  ],
} as const;

export type CashFlowCategoryMasuk = typeof CASH_FLOW_CATEGORIES.masuk[number];
export type CashFlowCategoryKeluar = typeof CASH_FLOW_CATEGORIES.keluar[number];
export type CashFlowCategory = CashFlowCategoryMasuk | CashFlowCategoryKeluar;

export const REFERRAL_SERVICE_OPTIONS = [
  { id: 'infus', label: 'Infus' },
  { id: 'usg', label: 'USG' },
  { id: 'lab', label: 'Cek Lab' },
] as const;

// Midwife referral sources are stored in visits.bidan_rujukan exactly as the clinic
// wrote them in the register ("Bdn.Tari"). The list exists for display only; a new
// value from the register still renders through bidanDisplayName.
export const BIDAN_REFERRAL_SOURCES = [
  { id: 'Bdn.Ai', label: 'Bidan Ai' },
  { id: 'Bdn.Desi', label: 'Bidan Desi' },
  { id: 'Bdn.Dewi', label: 'Bidan Dewi' },
  { id: 'Bdn.Nida', label: 'Bidan Nida' },
  { id: 'Bdn.Novi', label: 'Bidan Novi' },
  { id: 'Bdn.Rila', label: 'Bidan Rila' },
  { id: 'Bdn.Tari', label: 'Bidan Tari' },
  { id: 'Bdn.Trie', label: 'Bidan Trie' },
  { id: 'Bdn.Ulfah', label: 'Bidan Ulfah' },
] as const;

export function bidanDisplayName(stored: string | null | undefined): string {
  const raw = (stored || '').trim();
  if (!raw) return '-';
  const known = BIDAN_REFERRAL_SOURCES.find((entry) => entry.id.toLowerCase() === raw.toLowerCase());
  return known ? known.label : raw.replace(/^bdn\.\s*/i, 'Bidan ');
}

// Mirrors the MONITOR column of the visit log, which is what the Puskesmas register
// reports are built from.
export const PUBLIC_HEALTH_PROGRAM_LABELS: Record<string, string> = {
  PTM: 'PTM (Penyakit Tidak Menular)',
  ANC: 'ANC (Antenatal Care)',
  KB: 'KB (Keluarga Berencana)',
  ELIMINASI_3: '3 Eliminasi (HIV, Sifilis, Hepatitis B)',
};

export const PUBLIC_HEALTH_PROGRAM_ORDER = ['PTM', 'ANC', 'KB', 'ELIMINASI_3'] as const;

// F-012: the kinds of line an owner can add to a therapy package.
export const THERAPY_PACKAGE_ITEM_TYPES: TherapyPackageItemType[] = ['TINDAKAN', 'OBAT', 'LAIN'];

export const THERAPY_PACKAGE_ITEM_LABELS: Record<TherapyPackageItemType, string> = {
  TINDAKAN: 'Tindakan',
  OBAT: 'Obat',
  LAIN: 'Lainnya',
};

// F-011: visit-level program category. UMUM is the default so every visit carries a
// category even when the patient is not in a special program.
export const VISIT_CATEGORY_VALUES = ['UMUM', 'ANC', 'PTM', 'KB', 'ELIMINASI_3'] as const;
export type VisitCategory = typeof VISIT_CATEGORY_VALUES[number];

export const VISIT_CATEGORY_LABELS: Record<VisitCategory, string> = {
  UMUM: 'Umum',
  ANC: 'ANC',
  PTM: 'PTM',
  KB: 'KB',
  ELIMINASI_3: '3 Eliminasi',
};

export const VISIT_CATEGORY_DEFAULT: VisitCategory = 'UMUM';

// The outpatient follow-up agenda. The 2026-10-08 revision renamed the old
// "Pemantauan Pos Rawat" label to this one; the code keeps the PostCare data model.
export const OBSERVASI_LABEL = 'Observasi';

// Triple Eliminasi is ANC plus the three elimination labs. Completeness read from these
// fields; a blank field is reported as missing, never guessed.
export const TRIPLE_ELIMINASI_LABS = [
  { key: 'hiv', label: 'HIV' },
  { key: 'hbsag', label: 'HBsAg' },
  { key: 'syphilis', label: 'Sipilis' },
] as const;
