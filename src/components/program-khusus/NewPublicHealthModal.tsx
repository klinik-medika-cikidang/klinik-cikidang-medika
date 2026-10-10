'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import {
  WarningCircle,
  CircleNotch,
  Heartbeat,
  User,
  Calendar,
  CheckCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { Patient, PublicHealthProgramType, Visit } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { PatientSearchAutocomplete } from '@/components/pendaftaran/PatientSearchAutocomplete';
import { createClient } from '@/lib/supabase/client';
import { TRIPLE_ELIMINASI_LABS, DESA_OPTIONS } from '@/constants/clinic';
import { classifyPtm, type PtmCategory } from '@/lib/clinical';
import { cn } from '@/lib/utils';

interface NewPublicHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultProgram?: PublicHealthProgramType;
  initialVisit?: Visit;
  initialPatient?: Patient;
}

const PROGRAM_OPTIONS: { id: PublicHealthProgramType; label: string; description: string }[] = [
  { id: 'PTM', label: 'PTM', description: 'Penyakit Tidak Menular (Hipertensi & DM)' },
  { id: 'ANC', label: 'ANC', description: 'Antenatal Care / Ibu Hamil (GPA)' },
  { id: 'KB', label: 'KB', description: 'Keluarga Berencana' },
  { id: 'ELIMINASI_3', label: '3 Eliminasi', description: 'ANC + Skrining HIV, HBsAg, dan Sifilis' },
];

const PTM_CATEGORY_OPTIONS: { id: PtmCategory; label: string }[] = [
  { id: 'Hipertensi', label: 'Hipertensi (Kardiovaskular)' },
  { id: 'Diabetes', label: 'Diabetes Melitus (DM)' },
  { id: 'Lainnya', label: 'PTM Lainnya' },
];

const baseSchema = z.object({
  programType: z.enum(['PTM', 'ANC', 'KB', 'ELIMINASI_3']),
  tanggalPeriksa: z.string().trim().min(1, 'Tanggal periksa wajib diisi.'),
  noRm: z.string().trim().optional().nullable(),
  nama: z.string().trim().min(2, 'Nama pasien minimal 2 karakter.'),
  jenisKelamin: z.string().trim().optional().nullable(),
  ttl: z.string().trim().optional().nullable(),
  desa: z.string().trim().optional().nullable(),
  alamat: z.string().trim().optional().nullable(),
  noNik: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{16}$/.test(val), {
      message: 'NIK harus tepat 16 digit angka jika diisi.',
    })
    .optional()
    .nullable(),
  diagnosa: z.string().trim().optional().nullable(),
  kategoriPtm: z.string().trim().optional().nullable(),
  gpa: z.string().trim().optional().nullable(),
  lab: z.string().trim().optional().nullable(),
  terapi: z.string().trim().optional().nullable(),
  hbsag: z.string().trim().optional().nullable(),
  hiv: z.string().trim().optional().nullable(),
  syphilis: z.string().trim().optional().nullable(),
  jenisKb: z.string().trim().optional().nullable(),
  tanggalKembali: z.string().trim().optional().nullable(),
});

export function NewPublicHealthModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProgram = 'PTM',
  initialVisit,
  initialPatient,
}: NewPublicHealthModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [programType, setProgramType] = useState<PublicHealthProgramType>(defaultProgram);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [tanggalPeriksa, setTanggalPeriksa] = useState(todayStr);
  const [noRm, setNoRm] = useState('');
  const [nama, setNama] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('');
  const [ttl, setTtl] = useState('');
  const [desa, setDesa] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noNik, setNoNik] = useState('');

  const [diagnosa, setDiagnosa] = useState('');
  const [kategoriPtm, setKategoriPtm] = useState<PtmCategory>('Hipertensi');
  const [gpa, setGpa] = useState('');
  const [lab, setLab] = useState('');
  const [terapi, setTerapi] = useState('');
  const [hbsag, setHbsag] = useState('');
  const [hiv, setHiv] = useState('');
  const [syphilis, setSyphilis] = useState('');
  const [jenisKb, setJenisKb] = useState('');
  const [tanggalKembali, setTanggalKembali] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    setProgramType(defaultProgram);
    const patient = initialPatient || (initialVisit?.pasien as Patient | undefined);

    if (patient) {
      setSelectedPatient(patient);
      setNoRm(patient.no_rm || '');
      setNama(patient.nama || '');
      setJenisKelamin(patient.jenis_kelamin || '');
      setTtl([patient.desa, patient.tanggal_lahir].filter(Boolean).join(', '));
      setDesa(patient.desa || '');
      setAlamat(patient.alamat || patient.desa || '');
      setNoNik(patient.no_ktp || '');
    } else {
      setSelectedPatient(null);
      setNoRm('');
      setNama('');
      setJenisKelamin('');
      setTtl('');
      setDesa('');
      setAlamat('');
      setNoNik('');
    }

    const tgl = initialVisit?.tanggal_periksa || todayStr;
    setTanggalPeriksa(tgl);

    const initDiag = initialVisit?.diagnosa_deskripsi || '';
    setDiagnosa(initDiag);
    setKategoriPtm(classifyPtm({ diagnosa: initDiag }));
    setGpa('');
    setLab(initialVisit?.lab || '');
    setTerapi(initialVisit?.terapi_obat || '');
    setHbsag('');
    setHiv('');
    setSyphilis('');
    setJenisKb('');
    setTanggalKembali('');
    setErrorMsg(null);
    setFieldErrors({});
  }, [isOpen, defaultProgram, initialVisit, initialPatient, todayStr]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setNoRm(patient.no_rm || '');
    setNama(patient.nama || '');
    setJenisKelamin(patient.jenis_kelamin || '');
    setTtl([patient.desa, patient.tanggal_lahir].filter(Boolean).join(', '));
    setDesa(patient.desa || '');
    setAlamat(patient.alamat || patient.desa || '');
    setNoNik(patient.no_ktp || '');
  };

  const handleDiagnosaChange = (val: string) => {
    setDiagnosa(val);
    if (programType === 'PTM') {
      const detected = classifyPtm({ diagnosa: val });
      setKategoriPtm(detected);
    }
  };

  const handleSetAllNonReaktif = () => {
    setHbsag('Non Reaktif');
    setHiv('Non Reaktif');
    setSyphilis('Non Reaktif');
    toast.success('Hasil HBsAg, HIV, dan Sifilis diset ke "Non Reaktif".');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    const parseResult = baseSchema.safeParse({
      programType,
      tanggalPeriksa,
      noRm: noRm || null,
      nama,
      jenisKelamin: jenisKelamin || null,
      ttl: ttl || null,
      desa: desa || null,
      alamat: alamat || null,
      noNik: noNik || null,
      diagnosa: diagnosa || null,
      kategoriPtm: programType === 'PTM' ? kategoriPtm : null,
      gpa: (programType === 'ANC' || programType === 'ELIMINASI_3') ? gpa || null : null,
      lab: lab || null,
      terapi: terapi || null,
      hbsag: hbsag || null,
      hiv: hiv || null,
      syphilis: syphilis || null,
      jenisKb: jenisKb || null,
      tanggalKembali: tanggalKembali || null,
    });

    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      });
      setFieldErrors(errors);
      setErrorMsg(parseResult.error.issues[0]?.message || 'Periksa kembali kelengkapan formulir.');
      return;
    }

    if (programType === 'KB' && !jenisKb.trim()) {
      setErrorMsg('Jenis KB wajib diisi untuk program KB.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const valid = parseResult.data;

      const { error } = await supabase.from('public_health_records').insert({
        program_type: valid.programType,
        pasien_id: selectedPatient?.id || initialVisit?.pasien_id || null,
        visit_id: initialVisit?.id || null,
        tanggal_periksa: valid.tanggalPeriksa,
        no_rm: valid.noRm,
        nama: valid.nama,
        jenis_kelamin: valid.jenisKelamin,
        ttl: valid.ttl,
        desa: valid.desa,
        alamat: valid.alamat,
        no_nik: valid.noNik,
        diagnosa: valid.diagnosa,
        kategori_ptm: valid.kategoriPtm,
        gpa: valid.gpa,
        lab: valid.lab,
        terapi: valid.terapi,
        hbsag: valid.hbsag,
        hiv: valid.hiv,
        syphilis: valid.syphilis,
        jenis_kb: valid.jenisKb,
        tanggal_kembali: valid.tanggalKembali || null,
      });

      if (error) throw error;

      toast.success(`Data ${programType} untuk ${valid.nama} berhasil disimpan.`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating public health record:', err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan data program kesehatan.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAnc = programType === 'ANC';
  const isKb = programType === 'KB';
  const isEliminasi = programType === 'ELIMINASI_3';

  const eliminasiValues: Record<string, string> = { hiv, hbsag, syphilis };
  const eliminasiMissing = TRIPLE_ELIMINASI_LABS.filter(
    (item) => !(eliminasiValues[item.key] || '').trim()
  ).map((item) => item.label);

  const showDiagnosa = programType === 'PTM' || isAnc || programType === 'ELIMINASI_3';
  const showLab = programType === 'PTM' || programType === 'ELIMINASI_3';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Input Data Program Kesehatan"
      description="Registrasi PTM, ANC, KB, dan 3 Eliminasi untuk pelaporan resmi Puskesmas"
      icon={
        <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
          <Heartbeat weight="duotone" className="w-5 h-5" />
        </div>
      }
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2.5">
              <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Jenis Program Kesehatan</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PROGRAM_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setProgramType(opt.id)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition tactile-btn min-h-[64px]',
                    programType === opt.id
                      ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20'
                      : 'bg-slate-50 border-slate-300 hover:border-teal-400'
                  )}
                >
                  <span className="block font-bold text-slate-900">{opt.label}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3">
            <span className="block font-bold text-slate-800 flex items-center gap-1.5">
              <User weight="duotone" className="w-4 h-4 text-teal-600" />
              Identitas Pasien & Universal Baseline (Puskesmas)
            </span>

            {selectedPatient ? (
              <div className="p-3 bg-white border border-emerald-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{selectedPatient.nama}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {selectedPatient.no_rm}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Desa {selectedPatient.desa || '-'} • {selectedPatient.jenis_kelamin || '-'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-[11px] text-emerald-800 font-bold underline p-1"
                >
                  Ganti
                </button>
              </div>
            ) : (
              <PatientSearchAutocomplete
                onSelectPatient={handleSelectPatient}
                onAddNewPatient={() =>
                  toast.info('Pasien belum terdaftar. Isi identitas secara manual di bawah.')
                }
                placeholder="Cari pasien terdaftar (opsional), atau isi manual..."
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tanggal Periksa <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={tanggalPeriksa}
                    onChange={(e) => setTanggalPeriksa(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                {fieldErrors.tanggalPeriksa && (
                  <p className="text-[10px] text-rose-600 font-semibold mt-1">{fieldErrors.tanggalPeriksa}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No. RM</label>
                <input
                  type="text"
                  value={noRm}
                  onChange={(e) => setNoRm(e.target.value)}
                  placeholder="Contoh: RM-00123"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama pasien"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
                {fieldErrors.nama && (
                  <p className="text-[10px] text-rose-600 font-semibold mt-1">{fieldErrors.nama}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                <Select
                  value={jenisKelamin}
                  onChange={(e) => setJenisKelamin(e.target.value)}
                  placeholder="Pilih jenis kelamin"
                  searchable={false}
                  headerTitle="Jenis Kelamin"
                  options={[
                    { value: 'Laki-laki', label: 'Laki-laki' },
                    { value: 'Perempuan', label: 'Perempuan' },
                  ]}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tempat, Tgl Lahir (TTL)</label>
                <input
                  type="text"
                  value={ttl}
                  onChange={(e) => setTtl(e.target.value)}
                  placeholder="Cikidang, 12-05-1995"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No. NIK</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={noNik}
                  onChange={(e) => setNoNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  placeholder="16 digit NIK"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
                {fieldErrors.noNik && (
                  <p className="text-[10px] text-rose-600 font-semibold mt-1">{fieldErrors.noNik}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Desa Domicile (PKM)</label>
                <Select
                  value={desa}
                  onChange={(e) => setDesa(e.target.value)}
                  placeholder="Pilih desa"
                  searchable
                  headerTitle="Desa Wilayah PKM"
                  options={DESA_OPTIONS.map((d) => ({ value: d, label: d }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Alamat Rinci / Kampung</label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Contoh: Kp. Cikidang Hilir RT 02/01"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-teal-50/50 border border-teal-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="block font-bold text-teal-950">
                Data Klinis Program: {programType}
              </span>
              {isEliminasi && (
                <button
                  type="button"
                  onClick={handleSetAllNonReaktif}
                  className="text-[11px] font-bold text-teal-700 bg-white hover:bg-teal-100 border border-teal-300 px-2 py-0.5 rounded-lg transition"
                >
                  Set Semua Non-Reaktif
                </button>
              )}
            </div>

            {programType === 'PTM' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Kategori PTM (Puskesmas)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PTM_CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setKategoriPtm(cat.id)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs font-semibold text-left transition tactile-btn flex items-center justify-between',
                        kategoriPtm === cat.id
                          ? 'bg-teal-600 text-white border-teal-700 font-bold shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <span>{cat.label}</span>
                      {kategoriPtm === cat.id && <CheckCircle className="w-3.5 h-3.5" weight="fill" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showDiagnosa && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Diagnosa</label>
                <input
                  type="text"
                  value={diagnosa}
                  onChange={(e) => handleDiagnosaChange(e.target.value)}
                  placeholder={
                    isAnc
                      ? 'Diagnosa ANC (mis: G2P1A0 UK 24 minggu)'
                      : programType === 'PTM'
                      ? 'Diagnosa PTM (mis: Hipertensi Primer / DM Tipe 2)'
                      : 'Diagnosa klinis'
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
            )}

            {(isAnc || isEliminasi) && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Obstetrik GPA (Gravida, Para, Abortus)
                </label>
                <input
                  type="text"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  placeholder="Contoh: G3P2A0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] font-mono font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Format manual: G = Jumlah Hamil, P = Partus (Melahirkan), A = Abortus (Keguguran). Contoh pasien hamil ke-3, melahirkan 2 kali, belum pernah keguguran: <strong>G3P2A0</strong>.
                </p>
              </div>
            )}

            {isAnc && (
              <>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Terapi / Suplemen</label>
                  <input
                    type="text"
                    value={terapi}
                    onChange={(e) => setTerapi(e.target.value)}
                    placeholder="Contoh: Fe + Asam Folat 1x1, Kalsium 1x1"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lab ANC (HbSAg)</label>
                  <Select
                    value={hbsag}
                    onChange={(e) => setHbsag(e.target.value)}
                    placeholder="Belum diperiksa"
                    searchable={false}
                    headerTitle="Hasil Lab ANC"
                    options={[
                      { value: 'Non Reaktif', label: 'Non Reaktif' },
                      { value: 'Reaktif', label: 'Reaktif' },
                    ]}
                  />
                </div>
              </>
            )}

            {showLab && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hasil Lab / Terapi</label>
                <input
                  type="text"
                  value={lab}
                  onChange={(e) => setLab(e.target.value)}
                  placeholder="Contoh: GDS 142 mg/dL, TD 150/90 mmHg"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
            )}

            {isEliminasi && (
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Hasil Skrining Triple Eliminasi (Puskesmas)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {TRIPLE_ELIMINASI_LABS.map((item) => (
                    <div key={item.key}>
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">
                        {item.label}
                      </span>
                      <Select
                        value={eliminasiValues[item.key]}
                        onChange={(e) => {
                          if (item.key === 'hiv') setHiv(e.target.value);
                          else if (item.key === 'hbsag') setHbsag(e.target.value);
                          else setSyphilis(e.target.value);
                        }}
                        placeholder={`${item.label}: belum diisi`}
                        searchable={false}
                        headerTitle={`Hasil ${item.label}`}
                        options={[
                          { value: 'Non Reaktif', label: 'Non Reaktif' },
                          { value: 'Reaktif', label: 'Reaktif' },
                        ]}
                      />
                    </div>
                  ))}
                </div>
                <p
                  className={cn(
                    'text-[11px] mt-1 font-medium',
                    eliminasiMissing.length === 0 ? 'text-emerald-700' : 'text-amber-700'
                  )}
                >
                  {eliminasiMissing.length === 0
                    ? 'Ketiga lab Triple Eliminasi terisi lengkap.'
                    : `Belum diisi: ${eliminasiMissing.join(', ')}.`}
                </p>
              </div>
            )}

            {isKb && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jenis KB <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={jenisKb}
                    onChange={(e) => setJenisKb(e.target.value)}
                    placeholder="Pilih jenis KB"
                    searchable
                    headerTitle="Jenis KB"
                    options={[
                      'Suntik 1 Bulan',
                      'Suntik 3 Bulan',
                      'Pil KB',
                      'IUD / Spiral',
                      'Implan',
                      'Kondom',
                      'MOW / MOP',
                    ].map((kb) => ({ value: kb, label: kb }))}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Kembali</label>
                  <input
                    type="date"
                    value={tanggalKembali}
                    onChange={(e) => setTanggalKembali(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg min-h-[40px] focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-100 p-4 sm:px-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition min-h-[38px] shadow-btn-secondary tactile-btn w-full sm:w-auto"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 rounded-xl transition min-h-[38px] flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none shadow-btn-primary tactile-btn border border-teal-700/80 w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              'Simpan Data Program'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default NewPublicHealthModal;
