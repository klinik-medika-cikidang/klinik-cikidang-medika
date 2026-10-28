'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Scissors,
  CalendarBlank,
  Eye,
  X,
  CheckCircle,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowClockwise,
  DownloadSimple,
  ShieldCheck,
  CircleNotch,
  Image as ImageIcon,
  User,
  Plus,
  Camera,
  FolderOpen,
  ChatCircleText,
  Clock,
  Sparkle,
  PencilSimple,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { Circumcision } from '@/types/database';
import { formatRupiah, getErrorMessage } from '@/lib/utils';
import { getSignedMedicalPhotoUrl, uploadMedicalPhoto, compressImageToWebP } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';
import { EditCircumcisionModal } from '@/components/program-khusus/EditCircumcisionModal';

interface CircumcisionListProps {
  records: Circumcision[];
  onRefresh: () => void;
  isLoading?: boolean;
}

interface PhotoLightboxState {
  url: string;
  title: string;
  patientName: string;
  noRm: string;
  tanggal: string;
  metode: string;
  doctorName: string;
}

function ThumbnailItem({
  path,
  provider,
  label,
  onOpen,
}: {
  path: string;
  provider: 'supabase' | 'cloudinary';
  label: string;
  onOpen: (url: string) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadUrl() {
      try {
        setLoading(true);
        setError(false);
        const url = await getSignedMedicalPhotoUrl(path, provider);
        if (isMounted) setSignedUrl(url);
      } catch (err) {
        console.error('Error fetching signed thumbnail URL:', err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadUrl();
    return () => {
      isMounted = false;
    };
  }, [path, provider]);

  if (loading) {
    return (
      <div className="w-24 h-20 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-1 text-[10px] text-slate-400">
        <CircleNotch weight="bold" className="w-4 h-4 animate-spin text-teal-600" />
        <span>Memuat...</span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="w-24 h-20 rounded-xl bg-rose-50 border border-rose-200 flex flex-col items-center justify-center p-1 text-center text-[10px] text-rose-600">
        <ImageIcon weight="duotone" className="w-4 h-4 mb-0.5" />
        <span>Gagal muat</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(signedUrl)}
      className="group relative w-24 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 transition hover:border-teal-400 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none min-h-[44px]"
      title={`Klik untuk memperbesar ${label}`}
    >
      <img
        src={signedUrl}
        alt={label}
        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
      />
      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
        <Eye weight="bold" className="w-5 h-5 drop-shadow-sm" />
      </div>
      <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 py-0.5 px-1 text-[9px] font-bold text-white text-center truncate">
        {label}
      </div>
    </button>
  );
}

export function CircumcisionList({ records, onRefresh, isLoading }: CircumcisionListProps) {
  const [lightbox, setLightbox] = useState<PhotoLightboxState | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Quick follow-up photo upload modal state
  const [targetFollowUp, setTargetFollowUp] = useState<Circumcision | null>(null);
  const [editTarget, setEditTarget] = useState<Circumcision | null>(null);
  const [followUpFile, setFollowUpFile] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressionRatio, setCompressionRatio] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [updatedKondisiLuka, setUpdatedKondisiLuka] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  const handleOpenPhoto = (
    url: string,
    title: string,
    record: Circumcision
  ) => {
    setZoomLevel(100);
    setLightbox({
      url,
      title,
      patientName: record.pasien?.nama || 'Pasien',
      noRm: record.pasien?.no_rm || '-',
      tanggal: record.tanggal_tindakan
        ? new Date(record.tanggal_tindakan).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'Belum tercatat',
      metode: record.metode || 'Sirkumsisi',
      doctorName: record.dokter?.nama || 'dr. Ovan',
    });
  };

  const handleWhatsAppContact = (record: Circumcision) => {
    const rawPhone = record.pasien?.no_telepon?.replace(/[^0-9]/g, '');
    if (!rawPhone) {
      toast.error('Nomor telepon pasien belum tercatat di data rekam medis.');
      return;
    }
    const phone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;
    const patientName = record.pasien?.nama || 'Bapak/Ibu';
    const message = encodeURIComponent(
      `Halo ${patientName}, kami dari Layanan Sirkumsisi Modern Klinik Pratama Cikidang Medika menginfokan jadwal kontrol luka pasca sunat / pelepasan klamp. Mohon kesediaannya untuk hadir membawa putra tercinta agar kondisi pemulihan dapat dievaluasi langsung oleh dokter. Terima kasih.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // Process follow-up photo selection and instant client-side WebP compression
  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setFollowUpFile(file);

      const originalSizeKb = Math.round(file.size / 1024);
      const blob = await compressImageToWebP(file);
      const compressedSizeKb = Math.round(blob.size / 1024);

      setCompressedBlob(blob);
      setCompressionRatio(`${originalSizeKb} KB -> ${compressedSizeKb} KB WebP`);
      setPreviewUrl(URL.createObjectURL(blob));
      toast.success(`Foto dikompresi: ${originalSizeKb} KB menjadi ${compressedSizeKb} KB (WebP)`);
    } catch (err) {
      console.error('Error compressing image:', err);
      toast.error('Gagal mengompres gambar');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUploadFollowUpPhoto = async () => {
    if (!targetFollowUp || !compressedBlob) {
      toast.error('Silakan pilih foto kontrol terlebih dahulu');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload photo to private storage
      const result = await uploadMedicalPhoto(
        compressedBlob,
        targetFollowUp.pasien_id,
        targetFollowUp.id,
        targetFollowUp.storage_provider || 'supabase'
      );

      // 2. Update circumcision row in database
      const supabase = createClient();
      const updatedNotes = updatedKondisiLuka.trim()
        ? targetFollowUp.kondisi_luka
          ? `${targetFollowUp.kondisi_luka} • Evaluasi H+7: ${updatedKondisiLuka.trim()}`
          : updatedKondisiLuka.trim()
        : targetFollowUp.kondisi_luka;

      const { error } = await supabase
        .from('circumcisions')
        .update({
          foto_2_url: result.path,
          kondisi_luka: updatedNotes,
        })
        .eq('id', targetFollowUp.id);

      if (error) throw error;

      toast.success('Foto evaluasi kontrol H+7 berhasil diunggah!');
      setTargetFollowUp(null);
      setFollowUpFile(null);
      setCompressedBlob(null);
      setPreviewUrl(null);
      setUpdatedKondisiLuka('');
      onRefresh();
    } catch (err) {
      console.error('Error uploading follow-up photo:', err);
      toast.error(getErrorMessage(err, 'Gagal menyimpan foto kontrol'));
    } finally {
      setIsUploading(false);
    }
  };

  const missingDateCount = records.filter((record) => !record.tanggal_tindakan).length;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-52 bg-white rounded-2xl border border-slate-200/90 shadow-card-double animate-pulse p-5 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="h-5 w-40 bg-slate-200 rounded"></div>
              <div className="h-6 w-24 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="h-12 bg-slate-100 rounded-xl"></div>
            <div className="h-16 w-full bg-slate-100 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-10 text-center bg-white rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 text-slate-600 shadow-card-double">
        <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl w-fit mx-auto mb-3 border border-teal-200">
          <Scissors weight="duotone" className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Belum ada riwayat tindakan sirkumsisi</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Klik tombol &quot;+ Catat Sirkumsisi&quot; di atas untuk mendokumentasikan pasien tindakan bedah minor dan foto luka WebP privat.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {missingDateCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
          <WarningCircle weight="duotone" className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-bold">{missingDateCount} data sunat belum punya tanggal tindakan</strong> atau
            foto medis. Data ini berasal dari register SUNAT dan ditampilkan paling atas. Klik{' '}
            <strong className="font-bold">Edit</strong> pada kartu untuk melengkapinya.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {records.map((item) => {
          const methodLower = (item.metode || '').toLowerCase();
          const isKlamp = methodLower.includes('klamp');
          const isLaser = methodLower.includes('laser') || methodLower.includes('kauter');

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-card-double tactile-card flex flex-col justify-between hover:border-teal-400 transition-colors space-y-4"
            >
              <div className="space-y-3.5">
                {/* Header Kartu Pasien */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/90 flex items-center justify-center text-teal-700 shadow-2xs shrink-0">
                      <Scissors weight="duotone" className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {item.pasien?.nama || 'Pasien'}
                        </h4>
                        <span className="text-[11px] font-mono font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg border border-teal-200/80">
                          {item.pasien?.no_rm || '-'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        Desa {item.pasien?.desa || '-'} • Usia {item.pasien?.usia || '-'} thn • Operator:{' '}
                        <strong className="text-slate-800 font-medium">
                          {item.dokter?.nama || 'dr. Ovan'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                    {formatRupiah(item.biaya || 0)}
                  </span>
                </div>

                {/* Metadata Tindakan & Metode */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                      Tanggal Tindakan
                    </span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <CalendarBlank weight="duotone" className="w-3.5 h-3.5 text-teal-600" />
                      {item.tanggal_tindakan ? (
                        new Date(item.tanggal_tindakan).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      ) : (
                        <span className="text-amber-700">Belum tercatat</span>
                      )}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                      Metode Bedah
                    </span>
                    <span
                      className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded-md mt-0.5 border ${
                        isKlamp
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isLaser
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      {item.metode || 'Sirkumsisi'}
                    </span>
                  </div>
                </div>

                {/* Kondisi Luka Klinis */}
                {item.kondisi_luka && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">
                      Evaluasi Kondisi Luka
                    </span>
                    <p className="line-clamp-2 text-[11px] leading-relaxed">{item.kondisi_luka}</p>
                  </div>
                )}

                {item.catatan && (
                  <p className="text-[11px] text-slate-600 italic bg-amber-50/60 p-2 rounded-xl border border-amber-200/80">
                    Catatan: {item.catatan}
                  </p>
                )}
              </div>

              {/* Dual-Slot Foto Medis & Quick Actions */}
              <div className="pt-3 border-t border-slate-100/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {/* Slot 1: Foto Paska Tindakan */}
                  {item.foto_1_url ? (
                    <ThumbnailItem
                      path={item.foto_1_url}
                      provider={item.storage_provider || 'supabase'}
                      label="Paska Tindakan"
                      onOpen={(url) =>
                        handleOpenPhoto(url, 'Foto 1: Paska Tindakan Langsung', item)
                      }
                    />
                  ) : (
                    <div className="w-24 h-20 rounded-xl bg-slate-100/80 border border-dashed border-slate-300 flex flex-col items-center justify-center p-1 text-center text-[10px] text-slate-400">
                      <ImageIcon className="w-4 h-4 mb-0.5 text-slate-400" />
                      <span>Tanpa Foto 1</span>
                    </div>
                  )}

                  {/* Slot 2: Foto Evaluasi Kontrol H+7 */}
                  {item.foto_2_url ? (
                    <ThumbnailItem
                      path={item.foto_2_url}
                      provider={item.storage_provider || 'supabase'}
                      label="Evaluasi H+7"
                      onOpen={(url) =>
                        handleOpenPhoto(url, 'Foto 2: Evaluasi Kontrol H+7', item)
                      }
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetFollowUp(item);
                        setUpdatedKondisiLuka('');
                        setPreviewUrl(null);
                        setCompressedBlob(null);
                        setFollowUpFile(null);
                      }}
                      className="w-24 h-20 rounded-xl bg-teal-50/60 hover:bg-teal-100/80 border border-dashed border-teal-300 flex flex-col items-center justify-center p-1 text-center text-[10px] font-bold text-teal-700 tactile-btn transition group"
                      title="Unggah Foto Kontrol H+7 / Pelepasan Klamp"
                    >
                      <Plus className="w-4 h-4 mb-0.5 text-teal-600 group-hover:scale-110 transition-transform" weight="bold" />
                      <span>Foto H+7</span>
                    </button>
                  )}
                </div>

                {/* Right Actions: Edit Record + WhatsApp Follow-Up */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setEditTarget(item)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold tactile-btn transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                    title="Lengkapi tanggal tindakan dan foto medis"
                  >
                    <PencilSimple className="w-3.5 h-3.5 text-slate-600" weight="duotone" />
                    <span>Edit</span>
                  </button>

                  {item.pasien?.no_telepon && (
                    <button
                      type="button"
                      onClick={() => handleWhatsAppContact(item)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold tactile-btn transition focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                      title="Kirim pengingat kontrol pelepasan klamp / evaluasi luka via WhatsApp"
                    >
                      <ChatCircleText className="w-3.5 h-3.5 text-emerald-600" weight="fill" />
                      <span>Kontrol (WA)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Edit Modal: procedure date, weight, method, and both photo slots */}
      <EditCircumcisionModal
        isOpen={!!editTarget}
        record={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={onRefresh}
      />

      {/* Quick Upload Follow-Up Modal */}
      {targetFollowUp && (
        <Modal
          isOpen={!!targetFollowUp}
          onClose={() => setTargetFollowUp(null)}
          title={`Unggah Foto Kontrol H+7 - ${targetFollowUp.pasien?.nama || 'Pasien'}`}
          description="Dokumentasikan foto klinis pemulihan luka / pelepasan klamp terkompresi WebP"
          maxWidth="md"
        >
          <div className="p-5 space-y-4 text-xs">
            {/* Input file tersembunyi */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleSelectFile}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectFile}
              className="hidden"
            />

            {/* Tombol Ambil Foto Kamera vs Galeri */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isCompressing || isUploading}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-teal-200 bg-teal-50/80 hover:bg-teal-100 text-teal-800 font-bold tactile-btn transition min-h-[44px]"
              >
                <Camera className="w-4 h-4 text-teal-600" weight="bold" />
                <span>Kamera Langsung</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isCompressing || isUploading}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold tactile-btn transition min-h-[44px]"
              >
                <FolderOpen className="w-4 h-4 text-slate-600" weight="bold" />
                <span>Pilih dari Galeri</span>
              </button>
            </div>

            {/* Pratinjau Foto & Badge Kompresi WebP */}
            {isCompressing && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-600">
                <CircleNotch className="w-4 h-4 animate-spin text-teal-600" />
                <span>Mengompresi gambar ke WebP &lt; 300KB...</span>
              </div>
            )}

            {previewUrl && (
              <div className="space-y-2">
                <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img src={previewUrl} alt="Pratinjau Foto" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setCompressedBlob(null);
                      setFollowUpFile(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-xs"
                    title="Hapus foto"
                  >
                    <Trash className="w-3.5 h-3.5" weight="bold" />
                  </button>
                </div>

                {compressionRatio && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 font-medium">
                    <span className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" weight="bold" />
                      Kompresi WebP Siap
                    </span>
                    <span className="font-mono font-bold">{compressionRatio}</span>
                  </div>
                )}
              </div>
            )}

            {/* Evaluasi Luka Lanjutan */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                Evaluasi Luka Kontrol / Pelepasan Klamp:
              </label>
              <textarea
                value={updatedKondisiLuka}
                onChange={(e) => setUpdatedKondisiLuka(e.target.value)}
                placeholder="Contoh: Klamp terlepas dengan baik, luka kering, tidak ada tanda infeksi..."
                rows={2}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:outline-none text-xs text-slate-900 placeholder:text-slate-400 transition"
              />
            </div>

            {/* Aksi Batal & Simpan */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTargetFollowUp(null)}
                disabled={isUploading}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition min-h-[38px] shadow-btn-secondary tactile-btn"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUploadFollowUpPhoto}
                disabled={isUploading || !compressedBlob}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 rounded-xl transition min-h-[38px] flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none shadow-btn-primary tactile-btn border border-teal-700/80 disabled:opacity-50"
              >
                {isUploading ? 'Mengunggah...' : 'Simpan Foto Kontrol'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* HD Medical Lightbox Zoom Modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-slate-900 text-white w-full max-w-4xl rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="px-4 sm:px-6 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono text-[10px] uppercase font-bold border border-teal-500/30">
                    Rekam Medis Privat
                  </span>
                  <h3 className="text-sm font-bold text-slate-100 truncate">{lightbox.title}</h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pasien: <strong className="text-slate-200">{lightbox.patientName}</strong> (RM: {lightbox.noRm}) • Tanggal: {lightbox.tanggal} • {lightbox.metode} • {lightbox.doctorName}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Perkecil"
                  title="Perkecil (-25%)"
                >
                  <MagnifyingGlassMinus weight="bold" className="w-5 h-5" />
                </button>
                <span className="text-xs font-mono text-slate-300 px-1 min-w-[48px] text-center font-bold">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 250}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Perbesar"
                  title="Perbesar (+25%)"
                >
                  <MagnifyingGlassPlus weight="bold" className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Reset zoom"
                  title="Reset Zoom (100%)"
                >
                  <ArrowClockwise weight="bold" className="w-5 h-5" />
                </button>
                <a
                  href={lightbox.url}
                  download={`foto_sirkumsisi_${lightbox.noRm}.webp`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Unduh foto medis"
                  title="Unduh Berkas HD"
                >
                  <DownloadSimple weight="bold" className="w-5 h-5" />
                </a>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center ml-1"
                  aria-label="Tutup penampil foto"
                  title="Tutup (Esc)"
                >
                  <X weight="bold" className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Viewport */}
            <div className="flex-1 bg-black/90 overflow-auto flex items-center justify-center p-4 min-h-[320px] max-h-[70vh]">
              <img
                src={lightbox.url}
                alt={lightbox.title}
                style={{ width: `${zoomLevel}%`, maxWidth: 'none' }}
                className="object-contain transition-all duration-150 rounded-lg shadow-2xl"
              />
            </div>

            {/* Lightbox Footer & Security Disclaimer */}
            <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck weight="bold" className="w-4 h-4" />
                Kerahasiaan Medis Terlindungi (Token Signed URL Privat 1 Jam)
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                Klinik Pratama Cikidang Medika
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
