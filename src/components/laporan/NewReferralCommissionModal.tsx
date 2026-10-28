'use client';

import React, { useState } from 'react';
import {
  WarningCircle,
  CircleNotch,
  HandHeart,
  User,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { Patient } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { PatientSearchAutocomplete } from '@/components/pendaftaran/PatientSearchAutocomplete';
import { createClient } from '@/lib/supabase/client';
import { REFERRAL_SERVICE_OPTIONS } from '@/constants/clinic';
import { getErrorMessage } from '@/lib/utils';

interface NewReferralCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewReferralCommissionModal({
  isOpen,
  onClose,
  onSuccess,
}: NewReferralCommissionModalProps) {
  const currentYear = new Date().getFullYear();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [sumberRujukan, setSumberRujukan] = useState('');
  const [jenisLayanan, setJenisLayanan] = useState<'infus' | 'usg' | 'lab'>('infus');
  const [nominalKomisi, setNominalKomisi] = useState<number>(0);
  const [tahunKomisi, setTahunKomisi] = useState<number>(currentYear);
  const [statusPembayaran, setStatusPembayaran] = useState<'Belum Dibayar' | 'Dibayar'>(
    'Belum Dibayar'
  );
  const [catatan, setCatatan] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedPatient(null);
    setSumberRujukan('');
    setJenisLayanan('infus');
    setNominalKomisi(0);
    setTahunKomisi(currentYear);
    setStatusPembayaran('Belum Dibayar');
    setCatatan('');
    setErrorMsg(null);
  };

  const handleSelectService = (service: 'infus' | 'usg' | 'lab') => {
    setJenisLayanan(service);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!sumberRujukan.trim()) {
      setErrorMsg('Nama bidan / sumber rujukan wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.from('referral_commissions').insert({
        pasien_id: selectedPatient?.id || null,
        sumber_rujukan: sumberRujukan.trim(),
        jenis_layanan: jenisLayanan,
        nominal_komisi: nominalKomisi,
        tahun_komisi: tahunKomisi,
        status_pembayaran: statusPembayaran,
        catatan: catatan.trim() || null,
      });

      if (error) throw error;

      toast.success(`Rujukan dari ${sumberRujukan.trim()} berhasil dicatat.`);
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating referral commission:', err);
      const msg = getErrorMessage(err, 'Gagal mencatat rujukan & komisi.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Catat Rujukan & Komisi Bidan"
      description="Rekam rujukan pasien kriteria infus, USG, atau lab untuk akumulasi komisi tahunan"
      icon={
        <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
          <HandHeart weight="duotone" className="w-5 h-5" />
        </div>
      }
      maxWidth="lg"
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
            <label className="block font-bold text-slate-800 mb-1.5">
              Sumber Rujukan (Nama Bidan) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={sumberRujukan}
              onChange={(e) => setSumberRujukan(e.target.value)}
              placeholder="Contoh: Bd. Resa / Bidan Desa Cikidang"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl min-h-[44px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Pasien Dirujuk (Opsional)
            </label>
            {selectedPatient ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span>{selectedPatient.nama}</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                    {selectedPatient.no_rm}
                  </span>
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
                onSelectPatient={(p) => setSelectedPatient(p)}
                onAddNewPatient={() =>
                  toast.info('Pasien belum terdaftar. Rujukan tetap dapat dicatat tanpa data master.')
                }
                placeholder="Cari pasien terdaftar (opsional)..."
              />
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Kriteria Layanan</label>
            <div className="grid grid-cols-3 gap-2">
              {REFERRAL_SERVICE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectService(opt.id)}
                  className={`p-2.5 rounded-xl border text-center transition tactile-btn min-h-[56px] ${
                    jenisLayanan === opt.id
                      ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-900 font-bold'
                      : 'bg-slate-50 border-slate-300 hover:border-teal-400 text-slate-700 font-semibold'
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Kriteria komisi
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">Nominal Komisi (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={new Intl.NumberFormat('id-ID').format(Math.max(0, nominalKomisi))}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setNominalKomisi(digits ? Number.parseInt(digits, 10) : 0);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl min-h-[44px] font-mono font-bold focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:outline-none transition"
              />
              <p className="text-[10px] text-slate-500 mt-1.5">
                Isi sesuai kesepakatan komisi klinik.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5">Tahun Komisi</label>
              <Select
                value={tahunKomisi}
                onChange={(e) => setTahunKomisi(Number(e.target.value))}
                searchable={false}
                headerTitle="Tahun Komisi"
                options={[currentYear - 1, currentYear, currentYear + 1].map((yr) => ({
                  value: yr,
                  label: String(yr),
                }))}
              />
              <p className="text-[10px] text-slate-500 mt-1.5">
                Periode akumulasi komisi tahunan.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Status Komisi</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Belum Dibayar', 'Dibayar'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusPembayaran(status)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition tactile-btn min-h-[40px] ${
                    statusPembayaran === status
                      ? 'bg-teal-600 text-white border-teal-700 shadow-btn-primary'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Catatan</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              placeholder="Contoh: Rujukan pasien infus DHF dari Bidan Desa Pangkalan"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:outline-none text-xs text-slate-900 placeholder:text-slate-400 transition"
            />
          </div>
        </div>

        <div className="shrink-0 sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-100 p-4 sm:px-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 z-10">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
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
              <>
                <User weight="bold" className="w-4 h-4" />
                <span>Simpan Rujukan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default NewReferralCommissionModal;
