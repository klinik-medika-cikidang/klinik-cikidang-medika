'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  MapPin,
  Flask,
  FileText,
  ShareNetwork,
  Scissors,
  Receipt,
  PaperPlaneTilt,
  ClockCounterClockwise,
  Plus,
  FloppyDisk,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Visit, Doctor } from '@/types/database';
import { DEFAULT_TARIFFS } from '@/constants/clinic';
import { Badge } from '@/components/ui';
import { Icd10QuickPicker, type DiagnosisItem } from '@/components/rekam-medis/Icd10QuickPicker';
import { VitalsWidget } from '@/components/rekam-medis/VitalsWidget';
import { PrescriptionQuickPicker } from '@/components/rekam-medis/PrescriptionQuickPicker';
import { PatientHistoryTimeline } from '@/components/rekam-medis/PatientHistoryTimeline';
import { SuratSakitModal } from '@/components/rekam-medis/SuratSakitModal';
import { SuratRujukanModal } from '@/components/rekam-medis/SuratRujukanModal';
import { NewTbcModal } from '@/components/program-khusus/NewTbcModal';
import { NewCircumcisionModal } from '@/components/program-khusus/NewCircumcisionModal';
import { KategoriProgramPanel } from '@/components/program-khusus/KategoriProgramPanel';
import { cn } from '@/lib/utils';

export interface ExaminationFormProps {
  visit: Visit;
  onSaveSuccess?: (updatedVisit: Visit, isHandover?: boolean) => void;
  className?: string;
}

function parseInitialDiagnoses(codesStr?: string | null, descStr?: string | null): DiagnosisItem[] {
  if (!codesStr || !codesStr.trim()) return [];
  const codes = codesStr.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  const descs = descStr ? descStr.split(';').map((d) => d.trim()).filter(Boolean) : [];
  return codes.map((code, idx) => ({
    code,
    name: descs[idx] || descs[0] || code,
    isPrimary: idx === 0,
  }));
}

export function ExaminationForm({
  visit,
  onSaveSuccess,
  className,
}: ExaminationFormProps) {
  // Anamnesis notes
  const [keluhan, setKeluhan] = useState('');

  // Vital signs state
  const [sistol, setSistol] = useState('');
  const [diastol, setDiastol] = useState('');
  const [nadi, setNadi] = useState('');
  const [suhu, setSuhu] = useState('');
  const [pernapasan, setPernapasan] = useState('');
  const [beratBadan, setBeratBadan] = useState('');
  const [tinggiBadan, setTinggiBadan] = useState('');

  // ICD-10 Diagnoses
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>(() =>
    parseInitialDiagnoses(visit.kode_icd10, visit.diagnosa_deskripsi)
  );

  // Therapy & Prescription
  const [terapiObat, setTerapiObat] = useState('');

  // Procedures & Point-of-Care Lab
  const [tindakan, setTindakan] = useState('');
  const [keteranganTindakan, setKeteranganTindakan] = useState('');
  const [lab, setLab] = useState('');
  const [labHasil, setLabHasil] = useState('');

  // Billing & Tariffs
  const [biayaPeriksa, setBiayaPeriksa] = useState<number>(() => {
    if (visit.biaya_periksa !== undefined && visit.biaya_periksa !== null) {
      return Number(visit.biaya_periksa);
    }
    return visit.jenis_pasien === 'BPJS' ? 0 : DEFAULT_TARIFFS.umum;
  });
  const [pendapatanLain, setPendapatanLain] = useState<number>(Number(visit.pendapatan_lain || 0));
  const [keteranganPendapatan, setKeteranganPendapatan] = useState(visit.keterangan_pendapatan || '');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Administrative & Program Modals
  const [isSuratSakitOpen, setIsSuratSakitOpen] = useState(false);
  const [isSuratRujukanOpen, setIsSuratRujukanOpen] = useState(false);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [isTbcModalOpen, setIsTbcModalOpen] = useState(false);
  const [isCircumcisionModalOpen, setIsCircumcisionModalOpen] = useState(false);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('doctors').select('*').eq('aktif', true);
        if (data) setDoctorsList(data as Doctor[]);
      } catch (e) {
        console.error('Failed to load doctors list:', e);
      }
    }
    loadDoctors();
  }, []);

  useEffect(() => {
    setKeluhan(visit.keluhan_anamnesa || '');
    setDiagnoses(parseInitialDiagnoses(visit.kode_icd10, visit.diagnosa_deskripsi));
    setTerapiObat(visit.terapi_obat || '');
    setTindakan(visit.tindakan || '');
    setKeteranganTindakan(visit.keterangan_tindakan || '');
    setLab(visit.lab || '');
    setLabHasil(visit.lab_hasil || '');
    setBiayaPeriksa(
      visit.biaya_periksa !== undefined && visit.biaya_periksa !== null
        ? Number(visit.biaya_periksa)
        : visit.jenis_pasien === 'BPJS' ? 0 : DEFAULT_TARIFFS.umum
    );
    setPendapatanLain(Number(visit.pendapatan_lain || 0));
    setKeteranganPendapatan(visit.keterangan_pendapatan || '');
    setErrorMessage(null);
  }, [visit.id, visit.biaya_periksa, visit.pendapatan_lain, visit.keterangan_pendapatan, visit.jenis_pasien]);

  const patient = visit.pasien;
  const isFinished = visit.status_pembayaran !== 'Menunggu Dokter';

  const patientAllergy = visit.pasien?.riwayat_alergi;
  const hasAllergy = Boolean(
    patientAllergy &&
      patientAllergy.trim() !== '' &&
      patientAllergy.trim().toLowerCase() !== 'tidak ada' &&
      patientAllergy.trim().toLowerCase() !== '-'
  );

  // Serialized values for DB
  const serializedCodes = useMemo(() => {
    const sorted = [...diagnoses].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    return sorted.map((d) => d.code).join(', ');
  }, [diagnoses]);

  const serializedDescriptions = useMemo(() => {
    const sorted = [...diagnoses].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    return sorted.map((d) => d.name).join('; ');
  }, [diagnoses]);

  // Intelligent Program Detection
  const isTbDiagnosis = useMemo(() => {
    const text = `${serializedCodes} ${serializedDescriptions}`.toLowerCase();
    return text.includes('a15') || text.includes('a16') || text.includes('tbc') || text.includes('tuberkulosis');
  }, [serializedCodes, serializedDescriptions]);

  const isCircumcisionDiagnosis = useMemo(() => {
    const text = `${tindakan} ${serializedDescriptions} ${keteranganTindakan}`.toLowerCase();
    return text.includes('sunat') || text.includes('sirkum') || text.includes('khitan') || text.includes('fimosis') || text.includes('n47');
  }, [tindakan, serializedDescriptions, keteranganTindakan]);

  // Sync Vitals to Anamnesis Notes
  const handleAppendVitalSigns = (vitalsString: string) => {
    setKeluhan((prev) => {
      if (!prev || !prev.trim()) return vitalsString;
      if (prev.includes('[TTV:')) {
        return prev.replace(/\[TTV:.*?\]/, vitalsString);
      }
      return `${prev.trim()}\n${vitalsString}`;
    });
  };

  // Save Examination Record
  const handleSave = async (isCompleteHandover: boolean) => {
    if (isCompleteHandover && diagnoses.length === 0) {
      setErrorMessage('Pilih minimal satu diagnosa ICD-10 sebelum mengirim pasien ke kasir & apotek.');
      toast.error('Diagnosa ICD-10 wajib diisi!');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const targetStatus = isCompleteHandover ? 'Menunggu Kasir' : visit.status_pembayaran;

      const { data, error } = await supabase
        .from('visits')
        .update({
          keluhan_anamnesa: keluhan.trim() || null,
          kode_icd10: serializedCodes || null,
          diagnosa_deskripsi: serializedDescriptions || null,
          terapi_obat: terapiObat.trim() || null,
          tindakan: tindakan.trim() || null,
          keterangan_tindakan: keteranganTindakan.trim() || null,
          lab: lab.trim() || null,
          lab_hasil: labHasil.trim() || null,
          biaya_periksa: visit.jenis_pasien === 'BPJS' ? 0 : Number(biayaPeriksa || 0),
          pendapatan_lain: Number(pendapatanLain || 0),
          keterangan_pendapatan: keteranganPendapatan.trim() || null,
          status_pembayaran: targetStatus,
        })
        .eq('id', visit.id)
        .select(`*, pasien:patients(*), dokter:doctors(*)`)
        .single();

      if (error) throw error;

      toast.success(
        isCompleteHandover
          ? 'Pemeriksaan selesai. Data pasien berhasil dikirim ke antrean kasir & apotek.'
          : 'Draft rekam medis berhasil disimpan.'
      );

      if (onSaveSuccess && data) {
        onSaveSuccess(data as unknown as Visit, isCompleteHandover);
      }
    } catch (err) {
      console.error('Error saving examination record:', err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan hasil pemeriksaan ke database.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const queueNumStr = String(visit.nomor_antrian || '0').padStart(2, '0');

  return (
    <>
      <div className={cn('bg-white border border-slate-200/90 rounded-2xl shadow-card-double overflow-hidden flex flex-col h-full min-h-0', className)}>
        {/* Banner Status Selesai / Sedang Diperiksa */}
        {isFinished && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" weight="fill" />
              <span>
                Pasien telah selesai diperiksa dan diteruskan ke loket kasir / apotek. Status: <strong>{visit.status_pembayaran}</strong>
              </span>
            </div>
            <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
              {visit.status_pembayaran}
            </span>
          </div>
        )}

        {/* Patient Clinical Identity Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-slate-50/70 shrink-0 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-teal-100 text-teal-900 border border-teal-200">
                  Antrean #{queueNumStr}
                </span>
                <Badge variant={visit.jenis_pasien === 'BPJS' ? 'bpjs' : 'umum'}>
                  {visit.jenis_pasien}
                </Badge>
                {isFinished ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" weight="fill" />
                    Selesai
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-900 border border-teal-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                    Sedang Diperiksa
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {patient ? `${patient.gelar ? patient.gelar + ' ' : ''}${patient.nama}` : 'Pasien'}
              </h2>

              <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap font-medium">
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                  No RM: {patient?.no_rm || '-'}
                </span>
                <span>&bull;</span>
                <span>
                  {patient?.jenis_kelamin === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}, {patient?.usia || '-'} tahun
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" weight="duotone" />
                  Desa {patient?.desa || '-'}
                </span>
                {patient?.no_bpjs && (
                  <>
                    <span>&bull;</span>
                    <span className="text-emerald-700 font-semibold font-mono">
                      BPJS: {patient.no_bpjs}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Administrative Quick Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsSuratSakitOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-btn-secondary tactile-btn"
                title="Cetak Surat Izin Sakit Resmi Dokter"
              >
                <FileText className="w-3.5 h-3.5 text-teal-600" weight="duotone" />
                <span>Surat Sakit</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSuratRujukanOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-btn-secondary tactile-btn"
                title="Cetak Surat Rujukan Eksternal Faskes Lanjutan"
              >
                <ShareNetwork className="w-3.5 h-3.5 text-teal-600" weight="duotone" />
                <span>Rujukan</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTbcModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-btn-secondary tactile-btn"
                title="Daftarkan Pasien ke Program OAT TBC"
              >
                <Plus className="w-3.5 h-3.5 text-rose-600" weight="bold" />
                <span>Register TBC</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCircumcisionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-btn-secondary tactile-btn"
                title="Catat Prosedur Sirkumsisi / Sunat"
              >
                <Scissors className="w-3.5 h-3.5 text-indigo-600" weight="duotone" />
                <span>Sirkumsisi</span>
              </button>
            </div>
          </div>

          {/* Allergy Warning Strip */}
          {hasAllergy && (
            <div className="p-3 rounded-2xl border border-rose-300 bg-rose-50 flex items-start gap-2.5 text-xs text-rose-900 shadow-2xs">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" weight="fill" />
              <div>
                <span className="font-extrabold uppercase tracking-wider text-[10px] text-rose-700 block">
                  Peringatan Riwayat Alergi Pasien:
                </span>
                <span className="font-bold text-rose-950 text-xs">{patientAllergy}</span>
              </div>
            </div>
          )}
        </div>

        {/* Unified Clinical Workstation Stream */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs font-medium">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" weight="fill" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION: Anamnesis Notes & Chief Complaints */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card-double space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 border border-teal-100/80 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" weight="duotone" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Catatan Anamnesa &amp; Keluhan Pasien
                  </h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Keluhan utama dan riwayat klinis saat ini
                  </p>
                </div>
              </div>
            </div>

            {visit.keluhan_anamnesa && (
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs">
                <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block mb-0.5">
                  Keluhan Awal dari Loket Pendaftaran:
                </span>
                <p className="font-medium text-slate-800">{visit.keluhan_anamnesa}</p>
              </div>
            )}

            <textarea
              rows={3}
              value={keluhan}
              onChange={(e) => setKeluhan(e.target.value)}
              placeholder="Ketik catatan anamnesa periksa dokter, keluhan utama, atau temuan fisik klinis..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/80 border border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:bg-white resize-y leading-relaxed outline-none transition"
            />
          </div>

          {/* SECTION 1: Vital Signs (TTV) with 1-Click Preset */}
          <VitalsWidget
            sistol={sistol}
            setSistol={setSistol}
            diastol={diastol}
            setDiastol={setDiastol}
            nadi={nadi}
            setNadi={setNadi}
            suhu={suhu}
            setSuhu={setSuhu}
            pernapasan={pernapasan}
            setPernapasan={setPernapasan}
            beratBadan={beratBadan}
            setBeratBadan={setBeratBadan}
            tinggiBadan={tinggiBadan}
            setTinggiBadan={setTinggiBadan}
            onAppendToAnamnesis={handleAppendVitalSigns}
          />

          {/* SECTION 2: Multi-ICD-10 Diagnostic Picker */}
          <Icd10QuickPicker
            diagnoses={diagnoses}
            onChangeDiagnoses={setDiagnoses}
          />

          {/* Program Intelligence Bridge Alerts */}
          {isTbDiagnosis && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900 gap-2">
              <div className="flex items-center gap-2">
                <WarningCircle className="w-4 h-4 text-rose-600 shrink-0" weight="fill" />
                <span>Terdeteksi indikasi diagnosa TBC pada pasien ini. Pastikan pasien terdaftar di Program OAT.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTbcModalOpen(true)}
                className="px-3 py-1.5 min-h-[34px] bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-btn-primary shrink-0 tactile-btn"
              >
                Buka Register TBC
              </button>
            </div>
          )}

          {isCircumcisionDiagnosis && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-900 gap-2">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-indigo-600 shrink-0" weight="duotone" />
                <span>Terdeteksi tindakan Sirkumsisi / Sunat pada kunjungan ini.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCircumcisionModalOpen(true)}
                className="px-3 py-1.5 min-h-[34px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-btn-primary shrink-0 tactile-btn"
              >
                Buka Register Sunat
              </button>
            </div>
          )}

          {/* SECTION 3: 1-Click Prescription Packages & Structured Table */}
          <PrescriptionQuickPicker
            terapiObat={terapiObat}
            onChangeTerapiObat={setTerapiObat}
            patientAllergy={patient?.riwayat_alergi}
            biayaPeriksa={biayaPeriksa}
            onChangeBiayaPeriksa={setBiayaPeriksa}
            pendapatanLain={pendapatanLain}
            onChangePendapatanLain={setPendapatanLain}
            keteranganPendapatan={keteranganPendapatan}
            onChangeKeteranganPendapatan={setKeteranganPendapatan}
            jenisPasien={visit.jenis_pasien}
          />

          {/* SECTION 4: Point-of-Care Lab & Procedures */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card-double space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-100/80 flex items-center justify-center shrink-0">
                  <Flask className="w-4 h-4" weight="duotone" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    4. Tindakan Klinis &amp; Lab Point-of-Care
                  </h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Pemeriksaan lab cepat dan prosedur tindakan medis dokter
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase">
                Opsional
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lab Point-of-Care */}
              <div className="space-y-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Pemeriksaan Lab Cepat (GDS, Asam Urat, Hb, Kolesterol)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Jenis Tes (mis: GDS)"
                    value={lab}
                    onChange={(e) => setLab(e.target.value)}
                    className="w-full px-3 py-1.5 min-h-[36px] text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Hasil (mis: 110 mg/dL)"
                    value={labHasil}
                    onChange={(e) => setLabHasil(e.target.value)}
                    className="w-full px-3 py-1.5 min-h-[36px] text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                  />
                </div>
              </div>

              {/* Clinical Procedures */}
              <div className="space-y-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Tindakan Medis / Prosedur Dokter
                </label>
                <input
                  type="text"
                  placeholder="Nama Tindakan (mis: Injeksi, Ganti Balut, Nebu)"
                  value={tindakan}
                  onChange={(e) => setTindakan(e.target.value)}
                  className="w-full px-3 py-1.5 min-h-[36px] text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
                <input
                  type="text"
                  placeholder="Catatan rincian tindakan medis..."
                  value={keteranganTindakan}
                  onChange={(e) => setKeteranganTindakan(e.target.value)}
                  className="w-full px-3 py-1.5 min-h-[36px] text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Collapsible Patient Past Medical History */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card-double overflow-hidden">
            <button
              type="button"
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition tactile-btn"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 shrink-0">
                  <ClockCounterClockwise className="w-4 h-4" weight="duotone" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    5. Riwayat Rekam Medis Kunjungan Lampau
                  </h4>
                  <p className="text-[11px] text-slate-500 font-normal">
                    {isHistoryExpanded ? 'Klik untuk menutup riwayat' : 'Klik untuk melihat riwayat diagnosa dan obat pasien sebelumnya'}
                  </p>
                </div>
              </div>

              <div className="p-1 rounded-lg text-slate-500 hover:text-slate-900">
                {isHistoryExpanded ? (
                  <CaretUp className="w-4 h-4" weight="bold" />
                ) : (
                  <CaretDown className="w-4 h-4" weight="bold" />
                )}
              </div>
            </button>

            {isHistoryExpanded && (
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50">
                <PatientHistoryTimeline
                  patientId={visit.pasien_id}
                  currentVisitId={visit.id}
                />
              </div>
            )}
          </div>

          <KategoriProgramPanel visit={visit} />
        </div>

        {/* Sticky Bottom Tactile Action Bar */}
        <div className="shrink-0 sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 sm:px-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 z-10 shadow-[0_-4px_12px_rgba(15,23,42,0.03)]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Resep dan diagnosa otomatis terhubung ke sistem kasir/farmasi
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-btn-secondary tactile-btn min-h-[36px] flex items-center justify-center gap-1.5"
              title="Simpan draft tanpa mengalihkan antrean"
            >
              <FloppyDisk className="w-3.5 h-3.5 text-slate-500" weight="bold" />
              <span>Simpan Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-4.5 py-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 transition tactile-btn min-h-[36px] flex items-center justify-center gap-2 min-w-[190px]"
              title="Selesai periksa dan teruskan rekam medis ke kasir & apotek"
            >
              {isSaving ? (
                <>
                  <CircleNotch className="w-3.5 h-3.5 animate-spin text-white" weight="bold" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt className="w-3.5 h-3.5 text-white" weight="bold" />
                  <span>Selesai Periksa &amp; Kirim Kasir</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Cetak Surat Izin Sakit */}
      {patient && (
        <SuratSakitModal
          isOpen={isSuratSakitOpen}
          onClose={() => setIsSuratSakitOpen(false)}
          visit={visit}
          patient={patient}
          doctors={doctorsList}
        />
      )}

      {/* Modal Cetak Surat Rujukan */}
      {patient && (
        <SuratRujukanModal
          isOpen={isSuratRujukanOpen}
          onClose={() => setIsSuratRujukanOpen(false)}
          visit={visit}
          patient={patient}
          doctors={doctorsList}
        />
      )}

      {/* Modal Register TBC */}
      {patient && (
        <NewTbcModal
          isOpen={isTbcModalOpen}
          onClose={() => setIsTbcModalOpen(false)}
          initialPatient={patient}
          onSuccess={() => {
            setIsTbcModalOpen(false);
            toast.success('Pasien berhasil didaftarkan ke Program Khusus TBC.');
          }}
        />
      )}

      {/* Modal Register Sunat / Sirkumsisi */}
      {patient && (
        <NewCircumcisionModal
          isOpen={isCircumcisionModalOpen}
          onClose={() => setIsCircumcisionModalOpen(false)}
          initialPatient={patient}
          onSuccess={() => {
            setIsCircumcisionModalOpen(false);
            toast.success('Tindakan Sirkumsisi berhasil dicatat.');
          }}
        />
      )}
    </>
  );
}

export default ExaminationForm;
