'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle,
  WarningCircle,
  Stethoscope,
  Pill,
  Receipt,
  User,
  MapPin,
  ShieldCheck,
  Money,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Visit } from '@/types/database';
import { Modal, Button, Input, Select, Badge } from '@/components/ui';
import { formatRupiah, normalizeRupiah, cn } from '@/lib/utils';
import { METODE_PEMBAYARAN_OPTIONS } from '@/constants/clinic';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit | null;
  onPaymentSuccess: (updatedVisit: Visit) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  visit,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [biayaPeriksa, setBiayaPeriksa] = useState<number>(0);
  const [pendapatanLain, setPendapatanLain] = useState<number>(0);
  const [keteranganPendapatan, setKeteranganPendapatan] = useState<string>('');
  const [jenisPembayaran, setJenisPembayaran] = useState<'Tunai' | 'TF'>('Tunai');
  const [uangDiterima, setUangDiterima] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !visit) {
      setErrorMessage(null);
      return;
    }

    const periksa = visit.jenis_pasien === 'BPJS' ? 0 : normalizeRupiah(Number(visit.biaya_periksa || 0));
    const lain = normalizeRupiah(Number(visit.pendapatan_lain || 0));

    setBiayaPeriksa(periksa);
    setPendapatanLain(lain);
    setKeteranganPendapatan(visit.keterangan_pendapatan || '');
    setJenisPembayaran(visit.jenis_pembayaran || 'Tunai');
    setErrorMessage(null);

    const total = periksa + lain;
    setUangDiterima(total > 0 ? String(total) : '0');
  }, [isOpen, visit]);

  if (!isOpen || !visit) return null;

  const patient = visit.pasien;
  const patientFullName = patient
    ? [patient.gelar, patient.nama].filter(Boolean).join(' ')
    : 'Pasien';

  const totalTagihan = (visit.jenis_pasien === 'BPJS' ? 0 : Number(biayaPeriksa || 0)) + Number(pendapatanLain || 0);
  const nominalDiterima = Number(uangDiterima) || 0;
  const uangKembalian = Math.max(0, nominalDiterima - totalTagihan);
  const isKurangBayar = jenisPembayaran === 'Tunai' && totalTagihan > 0 && nominalDiterima < totalTagihan;

  const quickCashOptions = useMemo(() => {
    const list: Array<{ label: string; value: number; isPas: boolean }> = [];
    if (totalTagihan > 0) {
      list.push({ label: 'Uang Pas', value: totalTagihan, isPas: true });
    }
    const defaultNominals = [50000, 100000, 150000, 200000];
    defaultNominals.forEach((val) => {
      if (val !== totalTagihan) {
        list.push({ label: formatRupiah(val), value: val, isPas: false });
      }
    });
    return list;
  }, [totalTagihan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (pendapatanLain > 0 && !keteranganPendapatan.trim()) {
      setErrorMessage('Keterangan tindakan / biaya tambahan wajib diisi.');
      return;
    }

    if (isKurangBayar) {
      setErrorMessage('Uang yang diterima kurang dari total tagihan.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const finalBiayaPeriksa = visit.jenis_pasien === 'BPJS' ? 0 : normalizeRupiah(Number(biayaPeriksa || 0));
      const finalPendapatanLain = normalizeRupiah(Number(pendapatanLain || 0));

      const { data, error } = await supabase
        .from('visits')
        .update({
          biaya_periksa: finalBiayaPeriksa,
          pendapatan_lain: finalPendapatanLain,
          keterangan_pendapatan: keteranganPendapatan.trim() || null,
          jenis_pembayaran: jenisPembayaran,
          status_pembayaran: visit.jenis_pasien === 'BPJS' && totalTagihan === 0 ? 'Ditanggung BPJS' : 'Lunas',
        })
        .eq('id', visit.id)
        .select(`
          *,
          pasien:patients(*),
          dokter:doctors(*)
        `)
        .single();

      if (error) throw error;

      toast.success('Pelunasan kasir berhasil diselesaikan!', {
        description: `${patientFullName} • Total: ${formatRupiah(totalTagihan)} (${jenisPembayaran})`,
      });

      if (data) {
        onPaymentSuccess(data as unknown as Visit);
      }
      onClose();
    } catch (err) {
      console.error('Error settling payment:', err);
      const msg = err instanceof Error ? err.message : 'Gagal memproses pelunasan kasir.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pelunasan Kasir & Farmasi"
      description={
        <span>
          Nomor Antrian: <span className="font-bold text-emerald-700 font-mono">#{visit.nomor_antrian}</span> • Status:{' '}
          <span className="font-semibold text-slate-800">{visit.status_pembayaran}</span>
        </span>
      }
      icon={
        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
          <CreditCard className="w-5 h-5 text-emerald-700" weight="duotone" />
        </div>
      }
      maxWidth="lg"
    >
      <div className="shrink-0 px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            <User className="w-4 h-4 text-white" weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900">{patientFullName}</span>
              <Badge variant="umum" className="font-mono">
                {patient?.no_rm || '-'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" weight="duotone" />
                Desa {patient?.desa || '-'}
              </span>
              {patient?.usia !== undefined && patient?.usia !== null && (
                <>
                  <span>•</span>
                  <span>{patient.usia} thn</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div>
          {visit.jenis_pasien === 'BPJS' ? (
            <Badge variant="bpjs" size="md">
              <ShieldCheck className="w-3.5 h-3.5" weight="duotone" />
              BPJS {patient?.no_bpjs ? `(${patient.no_bpjs})` : ''}
            </Badge>
          ) : (
            <Badge variant="umum" size="md">
              Pasien Umum
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <WarningCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" weight="duotone" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Ringkasan Pemeriksaan Dokter */}
          <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-teal-950 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-teal-600" weight="duotone" />
                Pemeriksaan Dokter: {visit.dokter?.nama || 'Dokter Jaga'}
              </span>
              <span className="text-[11px] text-teal-700 font-mono">
                {visit.jam_periksa || '-'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Diagnosa Klinis (ICD-10)</span>
                {visit.kode_icd10 ? (
                  <div className="flex flex-wrap gap-1">
                    {visit.kode_icd10.split(',').map((code, idx) => {
                      const trimmedCode = code.trim();
                      const desc = visit.diagnosa_deskripsi?.split(';')[idx]?.trim() || '';
                      return (
                        <span
                          key={trimmedCode + idx}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-teal-200 rounded text-[11px] text-slate-800"
                        >
                          <span className="font-mono font-bold text-teal-700">{trimmedCode}</span>
                          {desc && <span className="text-slate-600 truncate max-w-[150px]">{desc}</span>}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="font-medium text-slate-500 italic">Belum diisi dokter</span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Tindakan Medis</span>
                <span className="font-medium text-slate-800">
                  {visit.tindakan || 'Pemeriksaan standar'}
                </span>
              </div>
            </div>

            {visit.terapi_obat && (
              <div className="pt-1.5 border-t border-teal-100/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 mb-1">
                  <Pill className="w-3.5 h-3.5 text-teal-600" weight="duotone" />
                  Resep Obat yang Diberikan:
                </span>
                <div className="bg-white p-2 rounded-lg border border-teal-100 text-slate-700 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                  {visit.terapi_obat}
                </div>
              </div>
            )}
          </div>

          {/* Rincian Tagihan */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" weight="duotone" />
                Rincian Tagihan Kasir
              </h3>
              {visit.jenis_pasien === 'BPJS' && (
                <Badge variant="bpjs">Klaim Kapitasi BPJS</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="number"
                min="0"
                step="1000"
                label="Biaya Pemeriksaan Pokok"
                leftElement={<span className="font-bold text-xs text-slate-500">Rp</span>}
                value={biayaPeriksa}
                onChange={(e) => setBiayaPeriksa(Number(e.target.value))}
                disabled={visit.jenis_pasien === 'BPJS'}
                helperText={visit.jenis_pasien === 'BPJS' ? 'Pasien BPJS ditanggung kapitasi (Rp 0)' : 'Tarif konsultasi & periksa'}
                className="font-mono font-bold"
              />

              <Input
                type="number"
                min="0"
                step="1000"
                label="Biaya Tindakan / Obat Tambahan"
                leftElement={<span className="font-bold text-xs text-slate-500">Rp</span>}
                value={pendapatanLain}
                onChange={(e) => setPendapatanLain(Number(e.target.value))}
                placeholder="0"
                className="font-mono font-bold"
              />
            </div>

            {pendapatanLain > 0 && (
              <div>
                <Input
                  label="Keterangan Tindakan / Biaya Tambahan"
                  requiredIndicator
                  value={keteranganPendapatan}
                  onChange={(e) => setKeteranganPendapatan(e.target.value)}
                  placeholder="Contoh: Nebulizer / Jahit Luka / Cek GDS"
                  required
                />
              </div>
            )}

            <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Tagihan Pasien
                </span>
                {visit.jenis_pasien === 'BPJS' && totalTagihan === 0 && (
                  <span className="text-[10px] text-emerald-400 font-medium">Ditanggung Penuh Kapitasi BPJS</span>
                )}
              </div>
              <span className="text-xl font-extrabold font-mono tracking-tight text-white">
                {formatRupiah(totalTagihan)}
              </span>
            </div>
          </div>

          {/* Metode Pembayaran & Kalkulator Kasir */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Money className="w-4 h-4 text-teal-600" weight="duotone" />
              Metode Pembayaran
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setJenisPembayaran('Tunai')}
                className={cn(
                  'py-3 px-4 min-h-[48px] rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all tactile-card',
                  jenisPembayaran === 'Tunai'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                )}
              >
                <Money className="w-4 h-4 shrink-0" weight="duotone" />
                <span>Tunai (Laci Kasir)</span>
              </button>
              <button
                type="button"
                onClick={() => setJenisPembayaran('TF')}
                className={cn(
                  'py-3 px-4 min-h-[48px] rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all tactile-card',
                  jenisPembayaran === 'TF'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                )}
              >
                <CreditCard className="w-4 h-4 shrink-0" weight="duotone" />
                <span>Transfer / QRIS</span>
              </button>
            </div>

            {jenisPembayaran === 'Tunai' && (
              <div className="pt-3 border-t border-slate-200 space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Pecahan Uang Cepat (Quick Cash)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Klik untuk set nominal diterima
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickCashOptions.map((opt) => {
                      const isSelected = nominalDiterima === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setUangDiterima(String(opt.value))}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-1.5 min-h-[38px] select-none',
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs ring-2 ring-emerald-200'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          )}
                        >
                          {opt.isPas && (
                            <CheckCircle className={cn('w-3.5 h-3.5', isSelected ? 'text-white' : 'text-emerald-600')} weight="bold" />
                          )}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    label="Uang yang Diterima"
                    leftElement={<span className="font-bold text-xs text-slate-500 font-mono">Rp</span>}
                    value={uangDiterima}
                    onChange={(e) => setUangDiterima(e.target.value)}
                    className="font-mono font-bold text-base"
                    placeholder="0"
                  />

                  <div
                    className={cn(
                      'p-3.5 rounded-xl border flex items-center justify-between transition-all min-h-[58px]',
                      isKurangBayar
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    )}
                  >
                    <div>
                      <span
                        className={cn(
                          'text-[10px] uppercase font-bold tracking-wider block',
                          isKurangBayar ? 'text-rose-700' : 'text-emerald-700'
                        )}
                      >
                        {isKurangBayar ? 'Kurang Bayar' : 'Uang Kembalian'}
                      </span>
                      <span className="text-lg font-extrabold font-mono tracking-tight">
                        {formatRupiah(isKurangBayar ? totalTagihan - nominalDiterima : uangKembalian)}
                      </span>
                    </div>
                    {nominalDiterima >= totalTagihan && totalTagihan > 0 && (
                      <Badge variant="lunas" className="shrink-0 font-bold">
                        {uangKembalian === 0 ? 'Uang Pas' : 'Lunas'}
                      </Badge>
                    )}
                    {isKurangBayar && (
                      <span className="text-xs font-bold text-rose-700 px-2 py-0.5 bg-rose-100/80 rounded border border-rose-200 shrink-0">
                        Kurang
                      </span>
                    )}
                  </div>
                </div>

                {isKurangBayar && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    Uang yang diterima kurang {formatRupiah(totalTagihan - nominalDiterima)} dari total tagihan.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 p-4 sm:px-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 z-10">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[44px]"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isKurangBayar}
            leftIcon={<CheckCircle className="w-4 h-4 text-white" weight="bold" />}
            className="w-full sm:w-auto min-h-[44px]"
          >
            Selesaikan Pembayaran & Cetak Kuitansi
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default PaymentModal;
