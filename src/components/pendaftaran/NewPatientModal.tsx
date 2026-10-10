'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import {
  UserPlus,
  WarningCircle,
  IdentificationCard,
  ArrowsClockwise,
  ShieldCheck,
  MapPin,
  Heartbeat,
} from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import type { Patient } from '@/types/database';
import {
  DESA_OPTIONS,
  DESA_RM_CODE,
  GELAR_OPTIONS,
  JENIS_KELAMIN_OPTIONS,
  JENIS_KELAMIN_RM_CODE,
} from '@/constants/clinic';
import { Modal } from '@/components/ui';
import { Select } from '@/components/ui/Select';

const patientSchema = z.object({
  noRm: z
    .string()
    .trim()
    .regex(/^\d{2}-\d{2}-\d{6}$/, 'Format No RM wajib 00-00-000000.'),
  gelar: z.string().trim().default('Tn.'),
  nama: z.string().trim().min(2, 'Nama pasien minimal 2 karakter.'),
  jenisKelamin: z.enum(['Laki-laki', 'Perempuan']),
  tanggalLahir: z.string().optional().nullable(),
  usia: z
    .union([
      z.number().int().min(0, 'Usia tidak boleh negatif.').max(130, 'Usia maksimal 130 tahun.'),
      z.literal(''),
    ])
    .optional()
    .nullable(),
  desa: z.string().trim().min(1, 'Desa domisili wajib dipilih.'),
  alamat: z.string().trim().optional().nullable(),
  noKtp: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{16}$/.test(val), {
      message: 'NIK KTP harus tepat 16 digit angka jika diisi.',
    })
    .optional()
    .nullable(),
  noBpjs: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{13}$/.test(val), {
      message: 'Nomor Kartu BPJS harus tepat 13 digit angka jika diisi.',
    })
    .optional()
    .nullable(),
  noTelepon: z.string().trim().optional().nullable(),
  pekerjaan: z.string().trim().optional().nullable(),
  riwayatAlergi: z.string().trim().default('Tidak Ada'),
});

export interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: (patient: Patient) => void;
  initialQuery?: string;
}

export function NewPatientModal({
  isOpen,
  onClose,
  onPatientCreated,
  initialQuery = '',
}: NewPatientModalProps) {
  const [noRm, setNoRm] = useState('');
  const [gelar, setGelar] = useState('Tn.');
  const [nama, setNama] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [usia, setUsia] = useState<number | ''>('');
  const [desa, setDesa] = useState<string>(DESA_OPTIONS[0]);
  const [alamat, setAlamat] = useState('');
  const [noKtp, setNoKtp] = useState('');
  const [noBpjs, setNoBpjs] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [pekerjaan, setPekerjaan] = useState('');
  const [riwayatAlergi, setRiwayatAlergi] = useState('Tidak Ada');

  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingRm, setIsGeneratingRm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const generateRmForParams = useCallback(
    async (jk: 'Laki-laki' | 'Perempuan', d: string) => {
      setIsGeneratingRm(true);
      try {
        const supabase = createClient();
        const jkCode = JENIS_KELAMIN_RM_CODE[jk];
        const desaCode = DESA_RM_CODE[d];

        if (!jkCode || !desaCode) {
          throw new Error('Kode jenis kelamin atau kode desa belum terdaftar.');
        }

        const prefix = `${jkCode}-${desaCode}`;

        const { data, error } = await supabase
          .from('patients')
          .select('no_rm')
          .like('no_rm', `${prefix}-%`)
          .order('no_rm', { ascending: false })
          .limit(1);

        if (error) throw error;

        const latestRm = data?.[0]?.no_rm || '';
        const latestSeqRaw = latestRm.split('-')[2] || '000000';
        const latestSeq = Number.parseInt(latestSeqRaw, 10);
        const nextSeq = Number.isNaN(latestSeq) ? 1 : latestSeq + 1;

        const formatted = `${prefix}-${String(nextSeq).padStart(6, '0')}`;
        setNoRm(formatted);
      } catch (err) {
        console.error('Failed to generate No RM:', err);
        setNoRm('00-00-000001');
      } finally {
        setIsGeneratingRm(false);
      }
    },
    []
  );

  // 1. Reset formulir HANYA saat modal pertama kali dibuka
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setFieldErrors({});
      return;
    }

    setNama(initialQuery.trim());
    setGelar('Tn.');
    setJenisKelamin('Laki-laki');
    setTanggalLahir('');
    setUsia('');
    setDesa(DESA_OPTIONS[0]);
    setAlamat('');
    setNoKtp('');
    setNoBpjs('');
    setNoTelepon('');
    setPekerjaan('');
    setRiwayatAlergi('Tidak Ada');
    setErrorMessage(null);
    setFieldErrors({});
  }, [isOpen, initialQuery]);

  // 2. Generate No RM saat modal terbuka dan ketika jenisKelamin atau desa berubah
  useEffect(() => {
    if (!isOpen) return;
    generateRmForParams(jenisKelamin, desa);
  }, [isOpen, jenisKelamin, desa, generateRmForParams]);

  const handleGelarChange = (newGelar: string) => {
    setGelar(newGelar);
    // Sinkronisasi otomatis jenis kelamin sesuai sapaan/gelar
    if (newGelar === 'Ny.' || newGelar === 'Nn.') {
      setJenisKelamin('Perempuan');
    } else if (newGelar === 'Tn.') {
      setJenisKelamin('Laki-laki');
    }
  };

  const handleJenisKelaminChange = (newJk: 'Laki-laki' | 'Perempuan') => {
    setJenisKelamin(newJk);
    // Sesuaikan gelar jika bertentangan dengan gender yang dipilih
    if (newJk === 'Perempuan' && gelar === 'Tn.') {
      setGelar('Ny.');
    } else if (newJk === 'Laki-laki' && (gelar === 'Ny.' || gelar === 'Nn.')) {
      setGelar('Tn.');
    }
  };

  const handleManualRefreshRm = () => {
    generateRmForParams(jenisKelamin, desa);
  };


  const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    setTanggalLahir(dob);

    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }

      if (calculatedAge >= 0) {
        setUsia(calculatedAge);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const parseResult = patientSchema.safeParse({
      noRm,
      gelar,
      nama,
      jenisKelamin,
      tanggalLahir: tanggalLahir || null,
      usia: usia === '' ? null : Number(usia),
      desa,
      alamat: alamat || null,
      noKtp: noKtp || null,
      noBpjs: noBpjs || null,
      noTelepon: noTelepon.trim() || null,
      pekerjaan: pekerjaan.trim() || null,
      riwayatAlergi: riwayatAlergi.trim() || 'Tidak Ada',
    });

    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (!errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      });
      setFieldErrors(errors);
      setErrorMessage(parseResult.error.issues[0]?.message || 'Periksa kembali kelengkapan formulir.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const validData = parseResult.data;

      const newRecord = {
        no_rm: validData.noRm,
        gelar: validData.gelar,
        nama: validData.nama,
        jenis_kelamin: validData.jenisKelamin,
        tanggal_lahir: validData.tanggalLahir || null,
        usia: validData.usia === '' || validData.usia === null || validData.usia === undefined ? null : validData.usia,
        desa: validData.desa,
        alamat: validData.alamat || null,
        no_ktp: validData.noKtp || null,
        no_bpjs: validData.noBpjs || null,
        no_telepon: validData.noTelepon || null,
        pekerjaan: validData.pekerjaan || null,
        riwayat_alergi: validData.riwayatAlergi || 'Tidak Ada',
      };

      const { data, error } = await supabase
        .from('patients')
        .insert(newRecord)
        .select()
        .single();

      if (error) {
        if (error.code === '23505' || error.message.includes('unique') || error.message.includes('no_rm')) {
          throw new Error(`Nomor RM "${validData.noRm}" sudah terdaftar dalam sistem. Silakan gunakan nomor lain.`);
        }
        throw new Error(error.message);
      }

      if (data) {
        onPatientCreated(data as Patient);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data pasien.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pendaftaran Pasien Baru"
      description="Lengkapi data identitas pasien untuk pembuatan No. Rekam Medis resmi"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 p-5 sm:p-6 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs">
            <WarningCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" weight="bold" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Identitas Utama Pasien */}
        <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <IdentificationCard className="w-4 h-4 text-teal-600" weight="bold" />
              Identitas Rekam Medis
            </span>
            <button
              type="button"
              onClick={handleManualRefreshRm}
              disabled={isGeneratingRm}
              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 tactile-btn"
              title="Generate ulang No. RM baru"
            >
              <ArrowsClockwise className={`w-3.5 h-3.5 ${isGeneratingRm ? 'animate-spin' : ''}`} weight="bold" />
              <span>No. RM Otomatis</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                No. Rekam Medis <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={noRm}
                onChange={(e) => {
                  setNoRm(e.target.value);
                  if (fieldErrors.noRm) setFieldErrors((prev) => ({ ...prev, noRm: '' }));
                }}
                placeholder={isGeneratingRm ? 'Membuat...' : '00-00-000000'}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
                required
              />
              {fieldErrors.noRm && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.noRm}</p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sapaan / Gelar
              </label>
              <Select
                value={gelar}
                onChange={(e) => handleGelarChange(e.target.value)}
                options={GELAR_OPTIONS.map((g) => ({ value: g, label: g }))}
                searchable={false}
                headerTitle="Sapaan / Gelar"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jenis Kelamin <span className="text-rose-500">*</span>
              </label>
              <Select
                value={jenisKelamin}
                onChange={(e) => handleJenisKelaminChange(e.target.value as 'Laki-laki' | 'Perempuan')}
                options={JENIS_KELAMIN_OPTIONS.map((jk) => ({ value: jk, label: jk }))}
                searchable={false}
                headerTitle="Jenis Kelamin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Lengkap Pasien <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                if (fieldErrors.nama) setFieldErrors((prev) => ({ ...prev, nama: '' }));
              }}
              placeholder="Contoh: Siti Aisyah"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
              required
            />
            {fieldErrors.nama && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.nama}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={tanggalLahir}
                onChange={handleDateOfBirthChange}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usia (Tahun)
              </label>
              <input
                type="number"
                min="0"
                max="130"
                value={usia}
                onChange={(e) => {
                  setUsia(e.target.value === '' ? '' : Number(e.target.value));
                  if (fieldErrors.usia) setFieldErrors((prev) => ({ ...prev, usia: '' }));
                }}
                placeholder="Contoh: 32"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
              />
              {fieldErrors.usia && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.usia}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Domisili & BPJS */}
        <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
          <div className="pb-2 border-b border-slate-200/70">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" weight="bold" />
              Domisili & Asuransi
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Desa Domisili <span className="text-rose-500">*</span>
              </label>
              <Select
                value={desa}
                onChange={(e) => {
                  setDesa(e.target.value);
                  if (fieldErrors.desa) setFieldErrors((prev) => ({ ...prev, desa: '' }));
                }}
                options={DESA_OPTIONS.map((d) => ({ value: d, label: d }))}
                searchable
                headerTitle="Desa Domisili"
              />
              {fieldErrors.desa && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.desa}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nomor Kartu BPJS (Opsional)
              </label>
              <input
                type="text"
                value={noBpjs}
                onChange={(e) => {
                  setNoBpjs(e.target.value);
                  if (fieldErrors.noBpjs) setFieldErrors((prev) => ({ ...prev, noBpjs: '' }));
                }}
                placeholder="13 digit angka kartu BPJS"
                maxLength={13}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
              />
              {fieldErrors.noBpjs && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.noBpjs}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                NIK KTP (Opsional)
              </label>
              <input
                type="text"
                value={noKtp}
                onChange={(e) => {
                  setNoKtp(e.target.value);
                  if (fieldErrors.noKtp) setFieldErrors((prev) => ({ ...prev, noKtp: '' }));
                }}
                placeholder="16 digit NIK KTP"
                maxLength={16}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
              />
              {fieldErrors.noKtp && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.noKtp}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Alamat / Kampung / RT / RW
              </label>
              <input
                type="text"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Contoh: Kp. Cigadog RT 02/01"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Kontak & Keamanan Alergi */}
        <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
          <div className="pb-2 border-b border-slate-200/70">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Heartbeat className="w-4 h-4 text-rose-600" weight="bold" />
              Kontak & Keselamatan Obat
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nomor Telepon / WA (Opsional)
              </label>
              <input
                type="tel"
                value={noTelepon}
                onChange={(e) => setNoTelepon(e.target.value)}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Pekerjaan Pasien (Opsional)
              </label>
              <input
                type="text"
                value={pekerjaan}
                onChange={(e) => setPekerjaan(e.target.value)}
                placeholder="Contoh: Karyawan Pabrik / Petani"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Riwayat Alergi Obat
            </label>
            <input
              type="text"
              value={riwayatAlergi}
              onChange={(e) => setRiwayatAlergi(e.target.value)}
              placeholder="Contoh: Amoxicillin, Paracetamol, Penicillin (Default: Tidak Ada)"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Isi &quot;Tidak Ada&quot; jika pasien tidak memiliki riwayat alergi obat tertentu.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 tactile-btn min-h-[44px]"
          >
            Batal & Tutup
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700 tactile-btn flex items-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" weight="bold" />
            <span>{isLoading ? 'Menyimpan...' : 'Simpan Pasien Baru'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default NewPatientModal;
