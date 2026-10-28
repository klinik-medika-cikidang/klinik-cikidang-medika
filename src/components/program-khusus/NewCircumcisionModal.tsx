'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Scissors,
  Camera,
  FolderOpen,
  Trash,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  FileImage,
  ArrowClockwise,
  CaretDown,
  Check,
  ShieldCheck,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { Patient } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { PatientSearchAutocomplete } from '@/components/pendaftaran/PatientSearchAutocomplete';
import { createClient } from '@/lib/supabase/client';
import { compressImageToWebP, uploadMedicalPhoto } from '@/lib/storage';
import { formatLocalDateToYMD, getErrorMessage } from '@/lib/utils';

interface NewCircumcisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPatient?: Patient | null;
}

interface PhotoSlotState {
  file: File | null;
  previewUrl: string | null;
  compressedBlob: Blob | null;
  originalSizeKb: number | null;
  compressedSizeKb: number | null;
  isCompressing: boolean;
}

const initialSlotState: PhotoSlotState = {
  file: null,
  previewUrl: null,
  compressedBlob: null,
  originalSizeKb: null,
  compressedSizeKb: null,
  isCompressing: false,
};

export function NewCircumcisionModal({
  isOpen,
  onClose,
  onSuccess,
  initialPatient,
}: NewCircumcisionModalProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient || null);
  const [hasShaken, setHasShaken] = useState(false);

  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
    }
  }, [initialPatient, isOpen]);

  const [tanggalTindakan, setTanggalTindakan] = useState(() => formatLocalDateToYMD());
  const [dokterNama, setDokterNama] = useState('dr. Ovan');
  const [metode, setMetode] = useState('Laser / Kauter');
  const [biaya, setBiaya] = useState(750000);
  const [kondisiLuka, setKondisiLuka] = useState('Luka bersih, perdarahan terkontrol');
  const [catatan, setCatatan] = useState('');

  // Dropdown states for custom popovers
  const [activeDropdown, setActiveDropdown] = useState<'dokter' | 'metode' | null>(null);

  const [slot1, setSlot1] = useState<PhotoSlotState>(initialSlotState);
  const [slot2, setSlot2] = useState<PhotoSlotState>(initialSlotState);

  const slot1CameraRef = useRef<HTMLInputElement>(null);
  const slot1GalleryRef = useRef<HTMLInputElement>(null);
  const slot2CameraRef = useRef<HTMLInputElement>(null);
  const slot2GalleryRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProcessFile = async (file: File | undefined, slotNumber: 1 | 2) => {
    if (!file) return;

    const origKb = Math.round(file.size / 1024);
    const preview = URL.createObjectURL(file);

    const updateState = slotNumber === 1 ? setSlot1 : setSlot2;

    updateState({
      file,
      previewUrl: preview,
      compressedBlob: null,
      originalSizeKb: origKb,
      compressedSizeKb: null,
      isCompressing: true,
    });

    try {
      const blob = await compressImageToWebP(file);
      const compKb = Math.round(blob.size / 1024);
      updateState((prev) => ({
        ...prev,
        compressedBlob: blob,
        compressedSizeKb: compKb,
        isCompressing: false,
      }));
      toast.success(`Foto ${slotNumber} dikompresi: ${origKb} KB -> ${compKb} KB (WebP)`);
    } catch (err) {
      console.error('Error compressing medical photo:', err);
      updateState((prev) => ({
        ...prev,
        isCompressing: false,
      }));
      toast.error('Gagal mengompres gambar, format file tidak didukung.');
    }
  };

  const handleClearSlot = (slotNumber: 1 | 2) => {
    if (slotNumber === 1) {
      if (slot1.previewUrl) URL.revokeObjectURL(slot1.previewUrl);
      setSlot1(initialSlotState);
      if (slot1CameraRef.current) slot1CameraRef.current.value = '';
      if (slot1GalleryRef.current) slot1GalleryRef.current.value = '';
    } else {
      if (slot2.previewUrl) URL.revokeObjectURL(slot2.previewUrl);
      setSlot2(initialSlotState);
      if (slot2CameraRef.current) slot2CameraRef.current.value = '';
      if (slot2GalleryRef.current) slot2GalleryRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMsg('Silakan cari dan pilih pasien terlebih dahulu');
      setHasShaken(true);
      setTimeout(() => setHasShaken(false), 500);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setUploadProgress('Menyimpan data tindakan...');

    try {
      const supabase = createClient();
      const tindakanTempId = `sirkum_${Date.now()}`;

      let foto1Url: string | null = null;
      let foto2Url: string | null = null;
      let usedProvider: 'supabase' | 'cloudinary' = 'supabase';

      // 1. Upload Foto 1 jika ada
      if (slot1.compressedBlob) {
        setUploadProgress('Mengunggah Foto Paska Tindakan (WebP)...');
        const res1 = await uploadMedicalPhoto(
          slot1.compressedBlob,
          selectedPatient.id,
          `${tindakanTempId}_1`,
          'supabase'
        );
        foto1Url = res1.path;
        usedProvider = res1.provider;
      }

      // 2. Upload Foto 2 jika ada
      if (slot2.compressedBlob) {
        setUploadProgress('Mengunggah Foto Evaluasi Kontrol (WebP)...');
        const res2 = await uploadMedicalPhoto(
          slot2.compressedBlob,
          selectedPatient.id,
          `${tindakanTempId}_2`,
          usedProvider
        );
        foto2Url = res2.path;
      }

      // 3. Cari id dokter dari tabel doctors
      setUploadProgress('Merekam ke database klinik...');
      const { data: docData } = await supabase
        .from('doctors')
        .select('id')
        .ilike('nama', `%${dokterNama.replace('dr. ', '')}%`)
        .maybeSingle();

      // 4. Insert data sirkumsisi
      const { error: insertErr } = await supabase.from('circumcisions').insert({
        pasien_id: selectedPatient.id,
        dokter_id: docData?.id || null,
        tanggal_tindakan: tanggalTindakan,
        metode,
        biaya,
        kondisi_luka: kondisiLuka.trim() || null,
        catatan: catatan.trim() || null,
        foto_1_url: foto1Url,
        foto_2_url: foto2Url,
        storage_provider: usedProvider,
      });

      if (insertErr) throw insertErr;

      toast.success(`Tindakan sirkumsisi pasien ${selectedPatient.nama} berhasil didokumentasikan`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving circumcision record:', err);
      setErrorMsg(getErrorMessage(err, 'Gagal menyimpan data sirkumsisi'));
      toast.error('Gagal mendokumentasikan tindakan sirkumsisi');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const renderPhotoSlot = (slotNumber: 1 | 2, label: string, sublabel: string) => {
    const slot = slotNumber === 1 ? slot1 : slot2;
    const cameraRef = slotNumber === 1 ? slot1CameraRef : slot2CameraRef;
    const galleryRef = slotNumber === 1 ? slot1GalleryRef : slot2GalleryRef;

    return (
      <div className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/70 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="font-bold text-slate-800 text-xs">{label}</span>
            <span className="text-[10px] text-slate-500">{sublabel}</span>
          </div>

          {slot.previewUrl ? (
            <div className="space-y-2 mt-2">
              <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-950 aspect-video flex items-center justify-center">
                <img
                  src={slot.previewUrl}
                  alt={label}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleClearSlot(slotNumber)}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center shadow-xs"
                  aria-label="Hapus foto"
                  title="Hapus foto"
                >
                  <Trash weight="bold" className="w-4 h-4" />
                </button>
              </div>

              {slot.isCompressing ? (
                <div className="flex items-center gap-1.5 text-[11px] text-teal-600 font-medium">
                  <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengompresi ke WebP &lt; 300KB...</span>
                </div>
              ) : slot.compressedSizeKb ? (
                <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium">
                  <span className="flex items-center gap-1 font-bold">
                    <ShieldCheck weight="bold" className="w-3.5 h-3.5 text-emerald-600" />
                    WebP Siap
                  </span>
                  <span className="font-mono font-bold">
                    {slot.originalSizeKb} KB &rarr; {slot.compressedSizeKb} KB
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 text-center border border-dashed border-slate-300 rounded-xl p-3.5 bg-white">
              <FileImage weight="duotone" className="w-8 h-8 text-teal-300 mx-auto mb-1.5" />
              <p className="text-[11px] font-medium text-slate-600 mb-2.5">
                Dokumentasi foto medis luka
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold tactile-btn transition min-h-[44px]"
                >
                  <Camera weight="bold" className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Kamera HP</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold tactile-btn transition min-h-[44px]"
                >
                  <FolderOpen weight="bold" className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Galeri File</span>
                </button>
              </div>

              {/* Kamera langsung untuk tablet/ponsel */}
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleProcessFile(e.target.files?.[0], slotNumber)}
                className="hidden"
              />

              {/* Pemilih file standar untuk laptop/desktop */}
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleProcessFile(e.target.files?.[0], slotNumber)}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pencatatan Tindakan Sunat (Sirkumsisi) Modern"
      description="Dokumentasi metode bedah minor, operator medis, dan evaluasi foto luka WebP privat"
      icon={
        <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
          <Scissors weight="duotone" className="w-5 h-5" />
        </div>
      }
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2.5">
              <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Cari & Pilih Pasien */}
          <div className={hasShaken && !selectedPatient ? 'animate-shake' : ''}>
            <label className="block font-bold text-slate-800 mb-1.5">
              Pilih Pasien Terdaftar <span className="text-rose-500">*</span>
            </label>
            {selectedPatient ? (
              <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{selectedPatient.nama}</span>
                    <span className="text-[11px] font-mono font-bold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                      {selectedPatient.no_rm}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Desa {selectedPatient.desa} • {selectedPatient.jenis_kelamin} • Usia {selectedPatient.usia || '-'} thn
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-teal-800 font-bold underline hover:no-underline p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  Ganti Pasien
                </button>
              </div>
            ) : (
              <PatientSearchAutocomplete
                onSelectPatient={(p) => setSelectedPatient(p)}
                onAddNewPatient={() => toast.info('Silakan daftarkan pasien baru pada modul Pendaftaran')}
                placeholder="Ketik Nama, No. RM, atau Desa pasien..."
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Tanggal Tindakan */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                Tanggal Tindakan <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={tanggalTindakan}
                onChange={(e) => setTanggalTindakan(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 min-h-[44px] transition"
              />
            </div>

            {/* Custom Popover: Dokter / Operator Pelaksana */}
            <div className="relative">
              <label className="block font-bold text-slate-800 mb-1.5">
                Dokter / Operator Pelaksana:
              </label>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'dokter' ? null : 'dokter')}
                className="w-full px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between text-left text-xs font-medium text-slate-900 shadow-xs focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 min-h-[44px] transition"
              >
                <span className="font-bold text-slate-900">{dokterNama}</span>
                <CaretDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    activeDropdown === 'dokter' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'dokter' && (
                <div className="absolute top-full mt-1.5 inset-x-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-popover p-1.5 space-y-1 animate-popover">
                  {(
                    [
                      { id: 'dr. Ovan', desc: 'Dokter Umum / Penanggung Jawab Medis' },
                      { id: 'dr. Neneng', desc: 'Dokter Umum' },
                      { id: 'Admin/Bdn.Resa', desc: 'Admin / Bidan Resa' },
                    ] as const
                  ).map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setDokterNama(doc.id);
                        setActiveDropdown(null);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                        dokterNama === doc.id
                          ? 'bg-teal-50 text-teal-900 font-bold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <div>{doc.id}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{doc.desc}</div>
                      </div>
                      {dokterNama === doc.id && <Check className="w-4 h-4 text-teal-600" weight="bold" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Custom Popover: Metode Sirkumsisi */}
            <div className="relative">
              <label className="block font-bold text-slate-800 mb-1.5">
                Metode Bedah Sirkumsisi:
              </label>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'metode' ? null : 'metode')}
                className="w-full px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between text-left text-xs font-medium text-slate-900 shadow-xs focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 min-h-[44px] transition"
              >
                <span className="font-bold text-slate-900">{metode}</span>
                <CaretDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    activeDropdown === 'metode' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'metode' && (
                <div className="absolute top-full mt-1.5 inset-x-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-popover p-1.5 space-y-1 animate-popover">
                  {(
                    [
                      { id: 'Laser / Kauter', desc: 'Pemotongan dengan panas elektrokauter, minim perdarahan' },
                      { id: 'Klamp / Smart Klamp', desc: 'Teknik klamp cincin higienis tanpa jahitan dan perban' },
                      { id: 'Konvensional / Bedah Minor', desc: 'Teknik bedah minor standar dengan penjahitan' },
                    ] as const
                  ).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setMetode(m.id);
                        setActiveDropdown(null);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                        metode === m.id
                          ? 'bg-teal-50 text-teal-900 font-bold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <div>{m.id}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{m.desc}</div>
                      </div>
                      {metode === m.id && <Check className="w-4 h-4 text-teal-600" weight="bold" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tarif Tindakan */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                Biaya Tindakan (Rp):
              </label>
              <input
                type="number"
                value={biaya}
                onChange={(e) => setBiaya(Number(e.target.value))}
                step="10000"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 min-h-[44px] transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Evaluasi Kondisi Luka / Observasi Klinis:
            </label>
            <input
              type="text"
              value={kondisiLuka}
              onChange={(e) => setKondisiLuka(e.target.value)}
              placeholder="Contoh: Luka bersih, tidak ada perdarahan aktif, edema minimal..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 min-h-[44px] transition"
            />
          </div>

          {/* Upload Foto Medis (2 Slot) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">
                Dokumentasi Foto Medis (Privat &amp; Terenkripsi):
              </label>
              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Otomatis WebP &lt; 300KB
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Pilih kamera langsung pada tablet/smartphone klinik atau unggah berkas dari komputer.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {renderPhotoSlot(1, 'Foto 1: Paska Tindakan', 'Saat tindakan selesai')}
              {renderPhotoSlot(2, 'Foto 2: Evaluasi / Kontrol H+7', 'Opsional / saat kunjungan kontrol')}
            </div>
          </div>

          {/* Catatan / Terapi Pulang */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Catatan Tambahan &amp; Terapi Obat Pulang:
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Amoxicillin 3x1 sirup, Paracetamol 3x1 sirup prn demam, edukasi luka tidak boleh basah 3 hari..."
              rows={2}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:outline-none text-xs text-slate-900 placeholder:text-slate-400 transition"
            />
          </div>
        </div>

        {/* Sticky Footer Actions */}
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
                <span>{uploadProgress || 'Menyimpan Tindakan...'}</span>
              </>
            ) : (
              'Simpan Tindakan Sirkumsisi'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
