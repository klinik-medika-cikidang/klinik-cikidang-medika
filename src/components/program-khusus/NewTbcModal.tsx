'use client';

import React, { useState, useEffect } from 'react';
import {
  Pill,
  WarningCircle,
  CircleNotch,
  CaretDown,
  Check,
  User,
  CalendarBlank,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { Patient } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { PatientSearchAutocomplete } from '@/components/pendaftaran/PatientSearchAutocomplete';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils';

interface NewTbcModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPatient?: Patient | null;
}

export function NewTbcModal({ isOpen, onClose, onSuccess, initialPatient }: NewTbcModalProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient || null);
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split('T')[0]);
  const [tipePasien, setTipePasien] = useState<'Kasus Baru' | 'Kambuh' | 'Pindahan'>('Kasus Baru');
  const [kategoriOat, setKategoriOat] = useState<'Kategori 1' | 'Kategori 2'>('Kategori 1');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom popover dropdown states
  const [activeDropdown, setActiveDropdown] = useState<'tipe' | 'kategori' | null>(null);
  const [hasShaken, setHasShaken] = useState(false);

  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
    }
  }, [initialPatient, isOpen]);

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
      const { error } = await supabase.from('tbc_programs').insert({
        pasien_id: selectedPatient.id,
        tanggal_mulai: tanggalMulai,
        tipe_pasien: tipePasien,
        kategori_oat: kategoriOat,
        fase_pengobatan: 'Intensif',
        bulan_ke: 1,
        hasil_dahak_akhir: 'Belum Periksa',
        status_tbc: 'Dalam Pengobatan',
        catatan: catatan.trim() || null,
      });

      if (error) throw error;
      toast.success(`Pasien ${selectedPatient.nama} berhasil didaftarkan ke Kartu Kendali TBC 6 Bulan`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating TBC program:', err);
      setErrorMsg(getErrorMessage(err, 'Gagal mendaftarkan pasien ke program TBC'));
      toast.error('Gagal mendaftarkan pasien ke program TBC');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pendaftaran Kartu Kendali TBC 6 Bulan"
      description="Kohort pemantauan pengobatan OAT (Tuberkulosis) terstandar faskes"
      icon={
        <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-200">
          <Pill weight="duotone" className="w-5 h-5" />
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
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{selectedPatient.nama}</span>
                    <span className="text-[11px] font-mono font-bold text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200">
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
                  className="text-xs text-purple-800 font-bold underline hover:no-underline p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            {/* Tanggal Mulai Minum Obat */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                Tanggal Mulai Minum OAT <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:outline-none min-h-[44px] transition"
              />
            </div>

            {/* Custom Popover: Tipe Kasus Pasien */}
            <div className="relative">
              <label className="block font-bold text-slate-800 mb-1.5">
                Tipe Kasus Pasien:
              </label>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'tipe' ? null : 'tipe')}
                className="w-full px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between text-left text-xs font-medium text-slate-900 shadow-xs focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 min-h-[44px] transition"
              >
                <span className="font-bold text-slate-900">{tipePasien}</span>
                <CaretDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    activeDropdown === 'tipe' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'tipe' && (
                <div className="absolute top-full mt-1.5 inset-x-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-popover p-1.5 space-y-1 animate-popover">
                  {(
                    [
                      { id: 'Kasus Baru', desc: 'Pasien belum pernah minum OAT atau minum < 1 bulan' },
                      { id: 'Kambuh', desc: 'Pasien pernah sembuh lalu terkonfirmasi BTA positif kembali' },
                      { id: 'Pindahan', desc: 'Pasien rujukan pindahan dari faskes lain' },
                    ] as const
                  ).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setTipePasien(t.id);
                        setActiveDropdown(null);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                        tipePasien === t.id
                          ? 'bg-purple-50 text-purple-950 font-bold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <div>{t.id}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{t.desc}</div>
                      </div>
                      {tipePasien === t.id && <Check className="w-4 h-4 text-purple-700" weight="bold" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom Popover: Kategori Regimen OAT */}
          <div className="relative">
            <label className="block font-bold text-slate-800 mb-1.5">
              Kategori Regimen Obat OAT:
            </label>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'kategori' ? null : 'kategori')}
              className="w-full px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between text-left text-xs font-medium text-slate-900 shadow-xs focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 min-h-[44px] transition"
            >
              <div>
                <span className="font-bold text-slate-900">{kategoriOat}</span>
                <span className="text-[11px] text-slate-500 ml-2">
                  {kategoriOat === 'Kategori 1'
                    ? '(2HRZE / 4H3R3 - Pasien Baru)'
                    : '(2HRZES / 1HRZE / 5H3R3E3 - Pasien Ulang)'}
                </span>
              </div>
              <CaretDown
                className={`w-4 h-4 text-slate-500 transition-transform ${
                  activeDropdown === 'kategori' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {activeDropdown === 'kategori' && (
              <div className="absolute top-full mt-1.5 inset-x-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-popover p-1.5 space-y-1 animate-popover">
                {(
                  [
                    {
                      id: 'Kategori 1',
                      title: 'Kategori 1 (Pasien Baru)',
                      formula: 'Fase Intensif 2 bulan (4FDC) + Fase Lanjutan 4 bulan (2FDC)',
                    },
                    {
                      id: 'Kategori 2',
                      title: 'Kategori 2 (Pasien Pengobatan Ulang / Kambuh)',
                      formula: 'Regimen dengan tambahan Streptomisin / pengawasan ketat',
                    },
                  ] as const
                ).map((k) => (
                  <div
                    key={k.id}
                    onClick={() => {
                      setKategoriOat(k.id);
                      setActiveDropdown(null);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                      kategoriOat === k.id
                        ? 'bg-purple-50 text-purple-950 font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div>{k.title}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{k.formula}</div>
                    </div>
                    {kategoriOat === k.id && <Check className="w-4 h-4 text-purple-700" weight="bold" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catatan Anamnesa */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Catatan Klinis / Riwayat Kontak / Anamnesa:
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Keluhan batuk berdahak > 2 minggu, penurunan nafsu makan, kontak erat anggota keluarga serumah..."
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
                <span>Mendaftarkan...</span>
              </>
            ) : (
              'Daftarkan Pasien TBC'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
