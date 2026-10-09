'use client';

import React, { useState } from 'react';
import {
  CalendarCheck,
  WarningCircle,
  CircleNotch,
  CalendarBlank,
  User,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { Patient } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { PatientSearchAutocomplete } from '@/components/pendaftaran/PatientSearchAutocomplete';
import { createClient } from '@/lib/supabase/client';

interface NewPostCareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewPostCareModal({ isOpen, onClose, onSuccess }: NewPostCareModalProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [hasShaken, setHasShaken] = useState(false);
  const [tglKontrol, setTglKontrol] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [kondisiTerakhir, setKondisiTerakhir] = useState('');
  const [keluhanLanjutan, setKeluhanLanjutan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setErrorMsg('Silakan cari dan pilih pasien dari data master terlebih dahulu.');
      setHasShaken(true);
      setTimeout(() => setHasShaken(false), 500);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.from('post_cares').insert({
        pasien_id: selectedPatient.id,
        tanggal_kontrol_berikutnya: tglKontrol,
        kondisi_terakhir: kondisiTerakhir.trim() || null,
        keluhan_lanjutan: keluhanLanjutan.trim() || null,
        status_kontrol: 'Menunggu',
      });

      if (error) throw error;
      toast.success(`Jadwal observasi untuk ${selectedPatient.nama} berhasil dijadwalkan`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating post care entry:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menjadwalkan observasi');
      toast.error('Gagal menjadwalkan observasi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Jadwalkan Observasi Pasien"
      description="Observasi pasca rawat inap rumah sakit atau pasca tindakan bedah minor"
      icon={
        <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
          <CalendarCheck weight="duotone" className="w-5 h-5" />
        </div>
      }
      maxWidth="lg"
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
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{selectedPatient.nama}</span>
                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
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
                  className="text-xs text-emerald-800 font-bold underline hover:no-underline p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
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

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Tanggal Kontrol Berikutnya <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={tglKontrol}
              onChange={(e) => setTglKontrol(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 min-h-[44px] transition"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Diagnosa / Kondisi Terakhir Saat Pulang Rawat:
            </label>
            <input
              type="text"
              value={kondisiTerakhir}
              onChange={(e) => setKondisiTerakhir(e.target.value)}
              placeholder="Contoh: Pasca opname Typhoid 4 hari di RSUD Sekarwangi, demam sudah reda..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 min-h-[44px] transition"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Keluhan Lanjutan / Rencana Observasi Faskes:
            </label>
            <textarea
              value={keluhanLanjutan}
              onChange={(e) => setKeluhanLanjutan(e.target.value)}
              placeholder="Contoh: Perlu evaluasi lab darah tepi ulang, pemeriksaan tanda vital berkala, edukasi diet..."
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
                <span>Menyimpan...</span>
              </>
            ) : (
              'Jadwalkan Observasi'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
