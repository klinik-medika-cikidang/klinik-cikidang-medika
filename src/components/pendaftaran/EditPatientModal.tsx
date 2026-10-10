'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import {
  NotePencil,
  WarningCircle,
  IdentificationCard,
  Lock,
  MapPin,
  Heartbeat,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Patient } from '@/types/database';
import { DESA_OPTIONS, GELAR_OPTIONS, JENIS_KELAMIN_OPTIONS } from '@/constants/clinic';
import { Modal } from '@/components/ui';
import { Select } from '@/components/ui/Select';

const editPatientSchema = z.object({
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

export interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onPatientUpdated: (patient: Patient) => void;
}

export function EditPatientModal({
  isOpen,
  onClose,
  patient,
  onPatientUpdated,
}: EditPatientModalProps) {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !patient) {
      setErrorMessage(null);
      setFieldErrors({});
      return;
    }

    setGelar(patient.gelar || 'Tn.');
    setNama(patient.nama || '');
    setJenisKelamin(patient.jenis_kelamin || 'Laki-laki');
    setTanggalLahir(patient.tanggal_lahir || '');
    setUsia(patient.usia ?? '');
    setDesa(patient.desa || DESA_OPTIONS[0]);
    setAlamat(patient.alamat || '');
    setNoKtp(patient.no_ktp || '');
    setNoBpjs(patient.no_bpjs || '');
    setNoTelepon(patient.no_telepon || '');
    setPekerjaan(patient.pekerjaan || '');
    setRiwayatAlergi(patient.riwayat_alergi || 'Tidak Ada');
    setErrorMessage(null);
    setFieldErrors({});
  }, [isOpen, patient]);

  // Legacy village values are kept selectable so old records are not silently rewritten.
  const desaOptions = useMemo(() => {
    const base = DESA_OPTIONS.map((d) => ({ value: d as string, label: d as string }));
    const isLegacyValue = desa && !DESA_OPTIONS.some((d) => d === desa);
    return isLegacyValue ? [...base, { value: desa, label: `${desa} (data lama)` }] : base;
  }, [desa]);

  const handleDateChange = (val: string) => {
    setTanggalLahir(val);
    if (val) {
      const birthDate = new Date(val);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 0) {
        setUsia(calculatedAge);
      }
    }
  };

  const handleGelarChange = (newGelar: string) => {
    setGelar(newGelar);
    if (newGelar === 'Ny.' || newGelar === 'Nn.') {
      setJenisKelamin('Perempuan');
    } else if (newGelar === 'Tn.') {
      setJenisKelamin('Laki-laki');
    }
  };

  const handleJenisKelaminChange = (newJk: 'Laki-laki' | 'Perempuan') => {
    setJenisKelamin(newJk);
    if (newJk === 'Perempuan' && gelar === 'Tn.') {
      setGelar('Ny.');
    } else if (newJk === 'Laki-laki' && (gelar === 'Ny.' || gelar === 'Nn.')) {
      setGelar('Tn.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    setErrorMessage(null);
    setFieldErrors({});

    const parseResult = editPatientSchema.safeParse({
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
      parseResult.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        if (!errors[field]) {
          errors[field] = err.message;
        }
      });
      setFieldErrors(errors);
      setErrorMessage('Mohon perbaiki isian data yang belum valid di formulir.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const validData = parseResult.data;

      const { data, error } = await supabase
        .from('patients')
        .update({
          gelar: validData.gelar,
          nama: validData.nama.trim(),
          jenis_kelamin: validData.jenisKelamin,
          tanggal_lahir: validData.tanggalLahir,
          usia: validData.usia === '' || validData.usia === null || validData.usia === undefined ? null : validData.usia,
          desa: validData.desa,
          alamat: validData.alamat,
          no_ktp: validData.noKtp,
          no_bpjs: validData.noBpjs,
          no_telepon: validData.noTelepon,
          pekerjaan: validData.pekerjaan,
          riwayat_alergi: validData.riwayatAlergi,
        })
        .eq('id', patient.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Biodata pasien berhasil diperbarui!', {
        description: `No. RM: ${patient.no_rm} • ${validData.nama}`,
      });

      if (data) {
        onPatientUpdated(data as Patient);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Error updating patient:', err);
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui data pasien ke database.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!patient) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Biodata Pasien"
      description={`Perbarui informasi data master rekam medis [${patient.no_rm}]`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 p-5 sm:p-6 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs">
            <WarningCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" weight="bold" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Identitas Rekam Medis (Locked No RM) */}
        <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <IdentificationCard className="w-4 h-4 text-teal-600" weight="bold" />
              Identitas Rekam Medis
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-200/80 text-slate-600 text-[10px] font-bold rounded-lg">
              <Lock className="w-3 h-3 text-slate-500" weight="bold" />
              No. RM Terkunci
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                No. Rekam Medis
              </label>
              <input
                type="text"
                value={patient.no_rm}
                disabled
                className="w-full px-3.5 py-2.5 bg-slate-200/60 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-700 cursor-not-allowed min-h-[44px]"
              />
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
                onChange={(e) => handleDateChange(e.target.value)}
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
                  setUsia(e.target.value === '' ? '' : parseInt(e.target.value, 10));
                  if (fieldErrors.usia) setFieldErrors((prev) => ({ ...prev, usia: '' }));
                }}
                placeholder="Contoh: 35"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
              />
              {fieldErrors.usia && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.usia}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Domisili & Asuransi */}
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
                options={desaOptions}
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
                placeholder="Contoh: Kp. Pasir Kupa RT 02/04"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Kontak & Keselamatan Obat */}
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
                Nomor Telepon / WhatsApp
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
                Pekerjaan Pasien
              </label>
              <input
                type="text"
                value={pekerjaan}
                onChange={(e) => setPekerjaan(e.target.value)}
                placeholder="Contoh: Karyawan Pabrik / Petani / IRT"
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
            <NotePencil className="w-4 h-4" weight="bold" />
            <span>{isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EditPatientModal;
