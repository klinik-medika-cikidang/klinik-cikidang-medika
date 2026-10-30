'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Scissors,
  Camera,
  FolderOpen,
  Trash,
  CircleNotch,
  Image as ImageIcon,
  CalendarBlank,
  Info,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { createClient } from '@/lib/supabase/client';
import { compressImageToWebP, getSignedMedicalPhotoUrl, uploadMedicalPhoto } from '@/lib/storage';
import type { Circumcision } from '@/types/database';
import { getErrorMessage } from '@/lib/utils';

const METODE_OPTIONS = [
  { value: 'Laser / Kauter', label: 'Laser / Kauter' },
  { value: 'Klamp / Smart Klamp', label: 'Klamp / Smart Klamp' },
  { value: 'Konvensional', label: 'Konvensional' },
  { value: 'Belum dicatat', label: 'Belum dicatat' },
];

interface PhotoSlotState {
  file: File | null;
  previewUrl: string | null;
  compressedBlob: Blob | null;
  originalSizeKb: number | null;
  compressedSizeKb: number | null;
  isCompressing: boolean;
  removeExisting: boolean;
}

const emptySlot: PhotoSlotState = {
  file: null,
  previewUrl: null,
  compressedBlob: null,
  originalSizeKb: null,
  compressedSizeKb: null,
  isCompressing: false,
  removeExisting: false,
};

interface EditCircumcisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: Circumcision | null;
}

const fieldClass =
  'w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none transition min-h-[44px]';

const labelClass = 'text-xs font-bold text-slate-700';

// Imported SUNAT rows arrive with no procedure date and no photos. This form is where the
// clinic fills both in, so the register becomes usable without inventing data at import.
export function EditCircumcisionModal({
  isOpen,
  onClose,
  onSuccess,
  record,
}: EditCircumcisionModalProps) {
  const [tanggalTindakan, setTanggalTindakan] = useState('');
  const [beratBadan, setBeratBadan] = useState('');
  const [dokterId, setDokterId] = useState('');
  const [metode, setMetode] = useState('Belum dicatat');
  const [biayaDigits, setBiayaDigits] = useState('');
  const [kondisiLuka, setKondisiLuka] = useState('');
  const [catatan, setCatatan] = useState('');
  const [doctorsList, setDoctorsList] = useState<{ id: string; nama: string }[]>([]);

  const [slot1, setSlot1] = useState<PhotoSlotState>(emptySlot);
  const [slot2, setSlot2] = useState<PhotoSlotState>(emptySlot);
  const [existingUrl1, setExistingUrl1] = useState<string | null>(null);
  const [existingUrl2, setExistingUrl2] = useState<string | null>(null);

  const slot1CameraRef = useRef<HTMLInputElement>(null);
  const slot1GalleryRef = useRef<HTMLInputElement>(null);
  const slot2CameraRef = useRef<HTMLInputElement>(null);
  const slot2GalleryRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !record) return;

    setTanggalTindakan(record.tanggal_tindakan || '');
    setBeratBadan(record.berat_badan || '');
    setDokterId(record.dokter_id || '');
    setMetode(record.metode || 'Belum dicatat');
    setBiayaDigits(record.biaya ? String(record.biaya) : '');
    setKondisiLuka(record.kondisi_luka || '');
    setCatatan(record.catatan || '');
    setSlot1(emptySlot);
    setSlot2(emptySlot);

    let cancelled = false;
    async function loadProviders() {
      const supabase = createClient();
      const { data } = await supabase.from('doctors').select('id, nama').eq('aktif', true);
      if (!cancelled && data) setDoctorsList(data);
    }
    loadProviders();

    return () => {
      cancelled = true;
    };
  }, [isOpen, record]);

  // Existing photos live in a private bucket, so each preview needs its own signed URL.
  useEffect(() => {
    let cancelled = false;
    setExistingUrl1(null);
    setExistingUrl2(null);
    if (!isOpen || !record) return;

    const provider = record.storage_provider || 'supabase';
    async function loadSignedUrls() {
      if (record?.foto_1_url) {
        try {
          const url = await getSignedMedicalPhotoUrl(record.foto_1_url, provider);
          if (!cancelled) setExistingUrl1(url);
        } catch {
          if (!cancelled) setExistingUrl1(null);
        }
      }
      if (record?.foto_2_url) {
        try {
          const url = await getSignedMedicalPhotoUrl(record.foto_2_url, provider);
          if (!cancelled) setExistingUrl2(url);
        } catch {
          if (!cancelled) setExistingUrl2(null);
        }
      }
    }
    loadSignedUrls();

    return () => {
      cancelled = true;
    };
  }, [isOpen, record]);

  const handleProcessFile = async (file: File | undefined, slotNumber: 1 | 2) => {
    if (!file) return;

    const originalSizeKb = Math.round(file.size / 1024);
    const setSlot = slotNumber === 1 ? setSlot1 : setSlot2;
    setSlot({
      file,
      previewUrl: URL.createObjectURL(file),
      compressedBlob: null,
      originalSizeKb,
      compressedSizeKb: null,
      isCompressing: true,
      removeExisting: false,
    });

    try {
      const blob = await compressImageToWebP(file);
      const compressedSizeKb = Math.round(blob.size / 1024);
      setSlot((prev) => ({ ...prev, compressedBlob: blob, compressedSizeKb, isCompressing: false }));
      toast.success(`Foto ${slotNumber} dikompresi: ${originalSizeKb} KB menjadi ${compressedSizeKb} KB (WebP)`);
    } catch (error) {
      console.error('Error compressing medical photo:', error);
      setSlot((prev) => ({ ...prev, isCompressing: false }));
      toast.error('Gagal mengompres gambar, format file tidak didukung.');
    }
  };

  const handleClearSlot = (slotNumber: 1 | 2) => {
    if (slotNumber === 1) {
      if (slot1.previewUrl) URL.revokeObjectURL(slot1.previewUrl);
      setSlot1({ ...emptySlot, removeExisting: Boolean(record?.foto_1_url) });
      if (slot1CameraRef.current) slot1CameraRef.current.value = '';
      if (slot1GalleryRef.current) slot1GalleryRef.current.value = '';
    } else {
      if (slot2.previewUrl) URL.revokeObjectURL(slot2.previewUrl);
      setSlot2({ ...emptySlot, removeExisting: Boolean(record?.foto_2_url) });
      if (slot2CameraRef.current) slot2CameraRef.current.value = '';
      if (slot2GalleryRef.current) slot2GalleryRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!record) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const patch: Record<string, unknown> = {
        tanggal_tindakan: tanggalTindakan || null,
        berat_badan: beratBadan.trim() || null,
        dokter_id: dokterId || null,
        metode,
        kondisi_luka: kondisiLuka.trim() || null,
        catatan: catatan.trim() || null,
        biaya: Number.parseInt(biayaDigits || '0', 10) || 0,
      };

      const slots: { number: 1 | 2; state: PhotoSlotState; column: string }[] = [
        { number: 1, state: slot1, column: 'foto_1_url' },
        { number: 2, state: slot2, column: 'foto_2_url' },
      ];

      for (const { number, state, column } of slots) {
        if (state.compressedBlob) {
          const uploaded = await uploadMedicalPhoto(
            state.compressedBlob,
            record.pasien_id,
            record.id,
            record.storage_provider || 'supabase'
          );
          patch[column] = uploaded.path;
        } else if (state.removeExisting) {
          patch[column] = null;
        }
        void number;
      }

      const { error } = await supabase.from('circumcisions').update(patch).eq('id', record.id);
      if (error) throw error;

      toast.success('Data sirkumsisi berhasil diperbarui.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating circumcision:', error);
      toast.error(getErrorMessage(error, 'Gagal menyimpan perubahan data sirkumsisi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPhotoSlot = (
    slotNumber: 1 | 2,
    state: PhotoSlotState,
    existingUrl: string | null,
    cameraRef: React.RefObject<HTMLInputElement | null>,
    galleryRef: React.RefObject<HTMLInputElement | null>,
    label: string
  ) => {
    const previewSrc = state.previewUrl || (state.removeExisting ? null : existingUrl);

    return (
      <div className="space-y-2">
        <span className={labelClass}>{label}</span>

        <div className="flex items-start gap-3">
          <div className="w-28 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
            {state.isCompressing ? (
              <CircleNotch className="w-5 h-5 text-teal-600 animate-spin" />
            ) : previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt={label} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-[10px] text-slate-500 px-1">
                <ImageIcon className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                Belum ada foto
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSubmitting || state.isCompressing}
                onClick={() => cameraRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
              >
                <Camera weight="duotone" className="w-3.5 h-3.5 text-teal-600" />
                Kamera
              </button>
              <button
                type="button"
                disabled={isSubmitting || state.isCompressing}
                onClick={() => galleryRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
              >
                <FolderOpen weight="duotone" className="w-3.5 h-3.5 text-teal-600" />
                Galeri
              </button>
              {previewSrc && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleClearSlot(slotNumber)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                >
                  <Trash weight="duotone" className="w-3.5 h-3.5" />
                  Hapus
                </button>
              )}
            </div>

            {state.compressedBlob && (
              <p className="text-[11px] font-medium text-slate-600">
                Ukuran: {state.originalSizeKb} KB menjadi {state.compressedSizeKb} KB (WebP)
              </p>
            )}
            {state.removeExisting && (
              <p className="text-[11px] font-semibold text-rose-600">
                Foto akan dihapus saat disimpan.
              </p>
            )}
          </div>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => handleProcessFile(event.target.files?.[0], slotNumber)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleProcessFile(event.target.files?.[0], slotNumber)}
        />
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Data Sirkumsisi"
      icon={<Scissors weight="duotone" className="w-5 h-5 text-teal-600" />}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-2">
          <Info weight="duotone" className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-teal-900 leading-relaxed">
            {record?.pasien?.nama ? `${record.pasien.nama} - ` : ''}
            {record?.pasien?.no_rm || ''}
            {record?.tanggal_tindakan
              ? ''
              : '. Tanggal tindakan belum tercatat pada register, silakan lengkapi.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-sunat-tanggal" className={labelClass}>
              Tanggal Tindakan
            </label>
            <input
              id="edit-sunat-tanggal"
              type="date"
              value={tanggalTindakan}
              onChange={(event) => setTanggalTindakan(event.target.value)}
              className={fieldClass}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">Kosong berarti belum tercatat.</p>
              {tanggalTindakan && (
                <button
                  type="button"
                  onClick={() => setTanggalTindakan('')}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline"
                >
                  Kosongkan
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-sunat-berat" className={labelClass}>
              Berat Badan
            </label>
            <input
              id="edit-sunat-berat"
              type="text"
              value={beratBadan}
              onChange={(event) => setBeratBadan(event.target.value)}
              placeholder="Cth: 11,5Kg"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Select
              label="Dokter / Operator"
              value={dokterId}
              onValueChange={setDokterId}
              placeholder="Belum ditentukan"
              options={[
                { value: '', label: 'Belum ditentukan' },
                ...doctorsList.map((doctor) => ({ value: doctor.id, label: doctor.nama })),
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <Select
              label="Metode Bedah"
              value={metode}
              onValueChange={setMetode}
              options={METODE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-sunat-biaya" className={labelClass}>
              Biaya Tindakan
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                Rp
              </span>
              <input
                id="edit-sunat-biaya"
                type="text"
                inputMode="numeric"
                value={biayaDigits ? Number.parseInt(biayaDigits, 10).toLocaleString('id-ID') : ''}
                onChange={(event) => setBiayaDigits(event.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                className={`${fieldClass} pl-9 font-mono tabular-nums`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-sunat-kondisi" className={labelClass}>
              Evaluasi Kondisi Luka
            </label>
            <input
              id="edit-sunat-kondisi"
              type="text"
              value={kondisiLuka}
              onChange={(event) => setKondisiLuka(event.target.value)}
              placeholder="Cth: Luka bersih, perdarahan terkontrol"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-sunat-catatan" className={labelClass}>
            Catatan
          </label>
          <textarea
            id="edit-sunat-catatan"
            value={catatan}
            onChange={(event) => setCatatan(event.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
          {renderPhotoSlot(1, slot1, existingUrl1, slot1CameraRef, slot1GalleryRef, 'Foto 1: Paska Tindakan')}
          {renderPhotoSlot(2, slot2, existingUrl2, slot2CameraRef, slot2GalleryRef, 'Foto 2: Evaluasi Kontrol')}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 border border-teal-700/80 shadow-btn-primary tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            {isSubmitting ? (
              <CircleNotch className="w-3.5 h-3.5 animate-spin" weight="bold" />
            ) : (
              <CalendarBlank weight="duotone" className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EditCircumcisionModal;
