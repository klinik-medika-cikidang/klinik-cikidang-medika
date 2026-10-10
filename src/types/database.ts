export type PatientSumberData = 'REKAMMEDIS' | 'DATAPASIEN';

export type Patient = {
  id: string;
  no_rm: string;
  no_rm_lama?: string;
  sumber_data?: PatientSumberData;
  gelar: string;
  nama: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  tanggal_lahir: string;
  usia?: number;
  desa: string;
  alamat?: string;
  no_ktp?: string;
  no_bpjs?: string;
  riwayat_alergi?: string;
  no_telepon?: string;
  pekerjaan?: string;
  created_at: string;
};

export type Doctor = {
  id: string;
  nama: string;
  spesialisasi?: string;
  aktif: boolean;
  created_at?: string;
};

export type Visit = {
  id: string;
  nomor_antrian?: string;
  pasien_id: string;
  dokter_id?: string;
  tanggal_periksa: string;
  jam_periksa?: string;
  bulan: string;
  kode_icd10?: string;
  diagnosa_deskripsi?: string;
  keluhan_anamnesa?: string;
  terapi_obat?: string;
  tindakan?: string;
  keterangan_tindakan?: string;
  bidan_rujukan?: string;
  lab?: string;
  lab_hasil?: string;
  jenis_pasien: 'BPJS' | 'UMUM';
  kategori_program: 'UMUM' | 'ANC' | 'PTM' | 'KB' | 'ELIMINASI_3';
  biaya_periksa: number;
  pendapatan_lain: number;
  keterangan_pendapatan?: string;
  jenis_pembayaran?: 'Tunai' | 'TF';
  status_pembayaran:
    | 'Menunggu Dokter'
    | 'Menunggu Kasir'
    | 'Menunggu Pembayaran'
    | 'Lunas'
    | 'Ditanggung BPJS'
    | 'Belum Bayar'
    | 'Piutang'
    | 'Pending'
    | 'Batal';
  alasan_batal?: string;
  dibatalkan_pada?: string;
  is_gratis?: boolean;
  alasan_gratis?: string;
  payment_state?: 'Menunggu Pembayaran' | 'Lunas' | 'Ditanggung BPJS' | 'Belum Bayar' | 'Piutang';
  piutang_nominal?: number;
  piutang_note?: string;
  piutang_approved_by_owner_at?: string;
  pasien?: Patient;
  dokter?: Doctor;
  created_at: string;
};

export type CashFlow = {
  id: string;
  tanggal: string;
  jenis: 'Masuk' | 'Keluar';
  kategori: 'Kapitasi BPJS' | 'Pendapatan Lain' | 'Pengeluaran Obat' | 'Pengeluaran Non Klinik' | 'Operasional' | 'Setor Tunai';
  nominal: number;
  keterangan?: string;
  created_at: string;
};

export type TbcProgram = {
  id: string;
  pasien_id: string;
  tanggal_mulai: string;
  tipe_pasien: 'Kasus Baru' | 'Kambuh' | 'Pindahan';
  kategori_oat: 'Kategori 1' | 'Kategori 2';
  fase_pengobatan: 'Intensif' | 'Lanjutan' | 'Selesai' | 'Putus';
  bulan_ke: number;
  hasil_dahak_akhir?: string;
  status_tbc: 'Dalam Pengobatan' | 'Sembuh' | 'Pengobatan Lengkap' | 'Mangkir';
  catatan?: string;
  pasien?: Patient;
  created_at: string;
};

export type Circumcision = {
  id: string;
  pasien_id: string;
  dokter_id?: string;
  // Null means the clinic has not recorded the procedure date yet, which is the state of
  // every row imported from the SUNAT register.
  tanggal_tindakan: string | null;
  metode: string;
  kondisi_luka?: string;
  foto_1_url?: string;
  foto_2_url?: string;
  storage_provider: 'supabase' | 'cloudinary';
  biaya: number;
  berat_badan?: string;
  sumber_data?: string;
  catatan?: string;
  pasien?: Patient;
  dokter?: Doctor;
  created_at: string;
};

export type PostCare = {
  id: string;
  pasien_id: string;
  visit_id?: string;
  tanggal_kontrol_berikutnya: string;
  kondisi_terakhir?: string;
  keluhan_lanjutan?: string;
  status_kontrol: 'Menunggu' | 'Sudah Kontrol' | 'Mangkir';
  pasien?: Patient;
  visit?: Visit;
  created_at: string;
};

export type PublicHealthProgramType = 'PTM' | 'ANC' | 'KB' | 'ELIMINASI_3';

export type PublicHealthRecord = {
  id: string;
  program_type: PublicHealthProgramType;
  pasien_id?: string;
  tanggal_periksa?: string;
  no_rm?: string;
  nama: string;
  jenis_kelamin?: 'Laki-laki' | 'Perempuan' | string;
  ttl?: string;
  desa?: string;
  alamat?: string;
  no_nik?: string;
  diagnosa?: string;
  kategori_ptm?: 'Hipertensi' | 'Diabetes' | 'Lainnya' | string;
  lab?: string;
  terapi?: string;
  hbsag?: string;
  gpa?: string;
  uk?: string;
  tp?: string;
  hiv?: string;
  syphilis?: string;
  jenis_kb?: string;
  tanggal_kembali?: string;
  dokter_id?: string;
  visit_id?: string;
  created_by_role?: string;
  created_at: string;
  updated_at?: string;
  pasien?: Patient;
  dokter?: Doctor;
  visit?: Visit;
};

export type ReferralCommission = {
  id: string;
  pasien_id?: string;
  visit_id?: string;
  sumber_rujukan: string;
  jenis_layanan: 'infus' | 'usg' | 'lab';
  nominal_komisi: number;
  tahun_komisi: number;
  status_pembayaran: 'Belum Dibayar' | 'Dibayar';
  catatan?: string;
  created_at: string;
  updated_at?: string;
  pasien?: Patient;
  visit?: Visit;
};

export type TherapyPackageItemType = 'TINDAKAN' | 'OBAT' | 'LAIN';

export type TherapyPackageItem = {
  id: string;
  package_id: string;
  jenis_item: TherapyPackageItemType;
  nama_item: string;
  qty: number;
  satuan?: string | null;
  harga_satuan: number;
  subtotal: number;
  urutan: number;
  catatan?: string | null;
  created_at?: string;
};

export type TherapyPackage = {
  id: string;
  kode?: string | null;
  nama: string;
  deskripsi?: string | null;
  harga_total: number;
  aktif: boolean;
  created_by_role?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: TherapyPackageItem[];
};

// Append-only audit of one package application. It never drives the bill; visits.pendapatan_lain
// stays the single source of truth.
export type VisitTherapyPackage = {
  id: string;
  visit_id: string;
  package_id?: string | null;
  nama_paket_snapshot: string;
  harga_total_snapshot: number;
  items_snapshot: TherapyPackageItem[];
  applied_by_role?: string | null;
  applied_at: string;
};

export type UserRole = 'owner' | 'dokter_admin';

export type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  clinic?: string;
};
