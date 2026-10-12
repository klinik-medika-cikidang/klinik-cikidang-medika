'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import {
  WarningCircle,
  ShieldCheck,
  Stethoscope,
  User,
  MapPin,
  Ticket,
  Info,
  HandHeart,
  UserGear,
} from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import type { Patient, Doctor, Visit } from '@/types/database';
import {
  DEFAULT_TARIFFS,
  BIDAN_REFERRAL_SOURCES,
  bidanDisplayName,
  normalizeBidanName,
} from '@/constants/clinic';
import { Modal } from '@/components/ui';
import { Select } from '@/components/ui/Select';
import { MasterDoctorModal } from './MasterDoctorModal';

const visitSchema = z.object({
  dokterId: z.string().trim().min(1, 'Pilih dokter pemeriksa terlebih dahulu.'),
  nomorAntrian: z.string().trim().min(1, 'Nomor antrean wajib ada.'),
  jenisPasien: z.enum(['BPJS', 'UMUM']),
  keluhan: z.string().trim().optional().nullable(),
});

export interface RegisterVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onVisitRegistered: (visit: Visit) => void;
}

export function RegisterVisitModal({
  isOpen,
  onClose,
  patient,
  onVisitRegistered,
}: RegisterVisitModalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [nomorAntrian, setNomorAntrian] = useState<string>('1');
  const [keluhan, setKeluhan] = useState('');
  const [jenisPasien, setJenisPasien] = useState<'BPJS' | 'UMUM'>('UMUM');
  const [bidanRujukan, setBidanRujukan] = useState<string>('');

  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

  const fetchDoctorsList = useCallback(async () => {
    setIsLoadingDoctors(true);
    try {
      const supabase = createClient();
      const { data: docData, error: docError } = await supabase
        .from('doctors')
        .select('id, nama, spesialisasi, aktif')
        .eq('aktif', true)
        .order('nama', { ascending: true });

      if (docError) throw docError;

      const sortedDocs = [...(docData || [])].sort((a, b) => {
        const isADr = a.nama.toLowerCase().startsWith('dr');
        const isBDr = b.nama.toLowerCase().startsWith('dr');
        if (isADr && !isBDr) return -1;
        if (!isADr && isBDr) return 1;
        return a.nama.localeCompare(b.nama);
      });

      setDoctors(sortedDocs);
      if (sortedDocs.length > 0) {
        setSelectedDoctorId((prev) => (prev && sortedDocs.some((d) => d.id === prev) ? prev : sortedDocs[0].id));
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setIsLoadingDoctors(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !patient) {
      setErrorMessage(null);
      setFieldErrors({});
      return;
    }

    setErrorMessage(null);
    setFieldErrors({});
    setKeluhan('');
    setBidanRujukan('');

    if (patient.no_bpjs && patient.no_bpjs.trim().length > 0) {
      setJenisPasien('BPJS');
    } else {
      setJenisPasien('UMUM');
    }

    const initData = async () => {
      await fetchDoctorsList();
      try {
        const supabase = createClient();
        // Canonical Indonesian date (WIB / Asia/Jakarta)
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
        const { count, error: countError } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true })
          .eq('tanggal_periksa', todayStr);

        if (countError) throw countError;
        setNomorAntrian(String((count || 0) + 1));
      } catch (err) {
        console.error('Error initializing queue count:', err);
      }
    };

    initData();
  }, [isOpen, patient, fetchDoctorsList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    setErrorMessage(null);
    setFieldErrors({});

    const parseResult = visitSchema.safeParse({
      dokterId: selectedDoctorId,
      nomorAntrian,
      jenisPasien,
      keluhan: keluhan || null,
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
      setErrorMessage(parseResult.error.issues[0]?.message || 'Periksa kembali formulir pendaftaran.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const validData = parseResult.data;
      const now = new Date();
      // Ensure WIB local date & time
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
      const jamStr = now.toTimeString().split(' ')[0];
      const bulanStr = now.toLocaleString('id-ID', { month: 'long', timeZone: 'Asia/Jakarta' });

      const statusAwal = 'Menunggu Dokter';
      const initialTariff = validData.jenisPasien === 'BPJS' ? 0 : DEFAULT_TARIFFS.umum;

      const newVisit = {
        nomor_antrian: validData.nomorAntrian,
        pasien_id: patient.id,
        dokter_id: validData.dokterId,
        tanggal_periksa: todayStr,
        jam_periksa: jamStr,
        bulan: bulanStr,
        keluhan_anamnesa: validData.keluhan || null,
        bidan_rujukan: normalizeBidanName(bidanRujukan),
        jenis_pasien: validData.jenisPasien,
        biaya_periksa: initialTariff,
        pendapatan_lain: 0,
        keterangan_pendapatan: null,
        jenis_pembayaran: null,
        status_pembayaran: statusAwal,
      };

      const { data, error } = await supabase
        .from('visits')
        .insert(newVisit)
        .select(`
          *,
          pasien:patients(*),
          dokter:doctors(*)
        `)
        .single();

      if (error) throw error;

      if (data) {
        onVisitRegistered(data as unknown as Visit);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftarkan kunjungan pasien.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !patient) return null;

  const patientFullName = [patient.gelar, patient.nama].filter(Boolean).join(' ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pendaftaran Kunjungan Poli"
      description={
        <span>
          Nomor Antrean Hari Ini: <span className="font-bold text-teal-600 font-mono">#{nomorAntrian}</span>
        </span>
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 p-4 sm:p-5 space-y-3.5">
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
            <WarningCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" weight="bold" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Patient Info Tactile Card (Double-Bezel concentric design) */}
        <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-teal-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-btn-primary shrink-0">
              <User className="w-4 h-4" weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900">{patientFullName}</span>
                <span className="px-1.5 py-0.2 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-mono font-bold rounded-md">
                  {patient.no_rm}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3 h-3 text-slate-400" weight="bold" />
                  {patient.desa}
                </span>
                <span>•</span>
                <span>{patient.jenis_kelamin}</span>
                {patient.usia !== undefined && patient.usia !== null && (
                  <>
                    <span>•</span>
                    <span>{patient.usia} thn</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            {patient.no_bpjs ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-600" weight="bold" />
                BPJS: {patient.no_bpjs}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold">
                Pasien Umum
              </span>
            )}
          </div>
        </div>

        {/* 2. Doctor & Patient Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Dokter Pemeriksa <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsDoctorModalOpen(true)}
                className="text-[11px] text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1 tactile-btn"
                title="Kelola daftar nama dokter & spesialisasi"
              >
                <UserGear className="w-3.5 h-3.5" weight="bold" />
                <span>Kelola Dokter</span>
              </button>
            </div>
            <Select
              value={selectedDoctorId}
              onChange={(e) => {
                setSelectedDoctorId(e.target.value);
                if (fieldErrors.dokterId) setFieldErrors((prev) => ({ ...prev, dokterId: '' }));
              }}
              disabled={isLoadingDoctors}
              placeholder={isLoadingDoctors ? 'Memuat dokter...' : 'Pilih dokter pemeriksa'}
              headerTitle="Dokter Pemeriksa"
              options={doctors.map((d) => ({
                value: d.id,
                label: d.nama,
                subtitle: d.spesialisasi || undefined,
              }))}
            />
            {fieldErrors.dokterId && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.dokterId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kategori Pasien <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJenisPasien('BPJS')}
                className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all tactile-btn ${
                  jenisPasien === 'BPJS'
                    ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white border-emerald-700 shadow-btn-primary'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4" weight="bold" />
                <span>BPJS</span>
              </button>

              <button
                type="button"
                onClick={() => setJenisPasien('UMUM')}
                className={`py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all tactile-btn ${
                  jenisPasien === 'UMUM'
                    ? 'bg-gradient-to-b from-teal-600 to-teal-700 text-white border-teal-700 shadow-btn-primary'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Stethoscope className="w-4 h-4" weight="bold" />
                <span>UMUM</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Keluhan / Anamnesa Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Keluhan Utama / Anamnesa Awal
          </label>
          <textarea
            rows={2}
            value={keluhan}
            onChange={(e) => setKeluhan(e.target.value)}
            placeholder="Contoh: Demam tinggi sejak 2 hari yang lalu disertai batuk kering dan pusing"
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:bg-white transition-colors"
          />
        </div>

        {/* 4. Rujukan Bidan (Opsional) */}
        <div className="p-3 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <HandHeart className="w-4 h-4 text-teal-600" weight="duotone" />
              Rujukan Bidan <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
            </span>
            {bidanRujukan && (
              <button
                type="button"
                onClick={() => setBidanRujukan('')}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold underline hover:no-underline"
              >
                Batal
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {BIDAN_REFERRAL_SOURCES.map((b) => {
              const isSelected = bidanRujukan.toLowerCase() === b.id.toLowerCase();
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBidanRujukan(isSelected ? '' : b.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition tactile-btn min-h-[30px] ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200/90 hover:bg-teal-50 hover:border-teal-300'
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Information Card */}
        <div className="p-3 bg-teal-50/70 border border-teal-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-teal-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" weight="bold" />
          <div className="space-y-0.5">
            <p className="font-extrabold text-teal-950">Alur Pelayanan Antrean Poli:</p>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              Setelah terdaftar, karcis antrean diterbitkan untuk pasien. Rincian pemeriksaan, diagnosis ICD-10, tindakan, dan resep obat akan dicatat dokter di ruang periksa sebelum pelunasan di kasir.
            </p>
          </div>
        </div>

        {/* 5. Modal Footer Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 tactile-btn min-h-[44px]"
          >
            Batal & Tutup
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700 tactile-btn flex items-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <Ticket className="w-4 h-4" weight="bold" />
            <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftarkan & Ambil Antrean'}</span>
          </button>
        </div>
      </form>

      <MasterDoctorModal
        isOpen={isDoctorModalOpen}
        onClose={() => setIsDoctorModalOpen(false)}
        onDoctorsUpdated={fetchDoctorsList}
      />
    </Modal>
  );
}

export default RegisterVisitModal;
