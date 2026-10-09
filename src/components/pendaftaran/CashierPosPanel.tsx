'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle,
  Receipt,
  User,
  WarningCircle,
  Money,
  ArrowsClockwise,
  Pill,
  FirstAid,
} from '@phosphor-icons/react';
import type { TherapyPackage, Visit } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { ApplyPackageModal } from '@/components/paket-terapi/ApplyPackageModal';
import { formatRupiah, cn } from '@/lib/utils';

export interface CashierPosPanelProps {
  waitingVisits: Visit[];
  selectedVisit: Visit | null;
  onSelectVisit: (visit: Visit) => void;
  onSettlePayment: (
    visit: Visit,
    biayaPeriksa: number,
    pendapatanLain: number,
    keteranganPendapatan: string,
    uangDiterima: number,
    jenisPembayaran: 'Tunai' | 'TF',
    paymentState: 'Lunas' | 'Piutang' | 'Belum Bayar'
  ) => Promise<void>;
  onApplyPackage?: (visit: Visit, pkg: TherapyPackage) => Promise<void>;
  isSubmitting?: boolean;
}

export function CashierPosPanel({
  waitingVisits,
  selectedVisit,
  onSelectVisit,
  onSettlePayment,
  onApplyPackage,
  isSubmitting = false,
}: CashierPosPanelProps) {
  const formatRupiahInput = (value: number) => new Intl.NumberFormat('id-ID').format(Math.max(0, value || 0));
  const parseRupiahInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 0;
    return Number.parseInt(digits, 10) || 0;
  };

  const [biayaPeriksa, setBiayaPeriksa] = useState<number>(0);
  const [pendapatanLain, setPendapatanLain] = useState<number>(0);
  const [keteranganPendapatan, setKeteranganPendapatan] = useState<string>('');
  const [jenisPembayaran, setJenisPembayaran] = useState<'Tunai' | 'TF'>('Tunai');
  const [paymentState, setPaymentState] = useState<'Lunas' | 'Piutang' | 'Belum Bayar'>('Lunas');
  const [uangDiterimaStr, setUangDiterimaStr] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);

  // Sync state when selectedVisit changes
  useEffect(() => {
    if (!selectedVisit) {
      setBiayaPeriksa(0);
      setPendapatanLain(0);
      setKeteranganPendapatan('');
      setJenisPembayaran('Tunai');
      setPaymentState('Lunas');
      setUangDiterimaStr('');
      setErrorMessage(null);
      return;
    }

    const periksa =
      selectedVisit.jenis_pasien === 'BPJS'
        ? 0
        : Number(selectedVisit.biaya_periksa || 35000);
    const lain = Number(selectedVisit.pendapatan_lain || 0);

    setBiayaPeriksa(periksa);
    setPendapatanLain(lain);
    setKeteranganPendapatan(selectedVisit.keterangan_pendapatan || '');
    setJenisPembayaran(selectedVisit.jenis_pembayaran || 'Tunai');
    setPaymentState(
      selectedVisit.status_pembayaran === 'Piutang'
        ? 'Piutang'
        : selectedVisit.status_pembayaran === 'Belum Bayar'
          ? 'Belum Bayar'
          : 'Lunas'
    );
    setErrorMessage(null);

    const total = periksa + lain;
    setUangDiterimaStr(total > 0 ? formatRupiahInput(total) : '0');
  }, [selectedVisit]);

  const totalTagihan = useMemo(() => {
    if (!selectedVisit) return 0;
    const periksa = selectedVisit.jenis_pasien === 'BPJS' ? 0 : Number(biayaPeriksa || 0);
    const lain = Number(pendapatanLain || 0);
    return periksa + lain;
  }, [selectedVisit, biayaPeriksa, pendapatanLain]);

  const nominalDiterima = parseRupiahInput(uangDiterimaStr);
  const uangKembalian = Math.max(0, nominalDiterima - totalTagihan);
  const isKurangBayar =
    paymentState === 'Lunas' &&
    jenisPembayaran === 'Tunai' &&
    totalTagihan > 0 &&
    nominalDiterima < totalTagihan;

  // Quick cash tender options
  const quickCashOptions = useMemo(() => {
    const list: Array<{ label: string; value: number; isPas: boolean }> = [];
    if (totalTagihan > 0) {
      list.push({ label: `Uang Pas (${formatRupiah(totalTagihan)})`, value: totalTagihan, isPas: true });
    }
    const defaultNominals = [50000, 70000, 100000, 200000];
    defaultNominals.forEach((val) => {
      if (val !== totalTagihan) {
        list.push({ label: formatRupiah(val), value: val, isPas: false });
      }
    });
    return list;
  }, [totalTagihan]);

  // Parse structured doctor prescription
  const parsedPrescription = useMemo(() => {
    if (!selectedVisit?.terapi_obat) return [];
    return selectedVisit.terapi_obat
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const isHeader = line.startsWith('[') && line.endsWith(']');
        const parts = line.split(/\s*-\s*/);
        if (parts.length >= 2) {
          return {
            raw: line,
            name: parts[0],
            signa: parts.slice(1).join(' - '),
            isHeader,
          };
        }
        return {
          raw: line,
          name: line,
          signa: null,
          isHeader,
        };
      });
  }, [selectedVisit?.terapi_obat]);

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setErrorMessage(null);

    if (pendapatanLain > 0 && !keteranganPendapatan.trim()) {
      setErrorMessage('Keterangan tindakan / obat tambahan wajib diisi.');
      return;
    }

    if (isKurangBayar) {
      setErrorMessage('Uang tunai yang diterima kurang dari total tagihan lunas. Pilih status Piutang jika pasien belum membayar penuh.');
      return;
    }

    try {
      await onSettlePayment(
        selectedVisit,
        biayaPeriksa,
        pendapatanLain,
        keteranganPendapatan,
        nominalDiterima,
        jenisPembayaran,
        selectedVisit.jenis_pasien === 'BPJS' && totalTagihan === 0 ? 'Lunas' : paymentState
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses transaksi kasir.';
      setErrorMessage(msg);
    }
  };

  const selectedPatientName = selectedVisit?.pasien
    ? [selectedVisit.pasien.gelar, selectedVisit.pasien.nama].filter(Boolean).join(' ')
    : 'Pasien Belum Dipilih';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-card-double space-y-5 tactile-card">
      {/* Panel Top Header Bar (Harmonized with Dashboard Header Pattern) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-xl shrink-0">
            <CreditCard className="w-5 h-5 text-teal-600" weight="duotone" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Workstation Kasir & Farmasi
              </h2>
              <span className="px-2 py-0.5 bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold rounded-full font-mono">
                Live Terminal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Kelola antrean pelunasan, verifikasi resep obat dokter, dan terbitkan kuitansi kasir
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold font-mono">
            {waitingVisits.length} Menunggu Kasir
          </span>
        </div>
      </div>

      {/* 3-Column Master Balanced Grid (Items-start for natural card heights, zero empty void) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ============================================================== */}
        {/* COLUMN 1: DAFTAR ANTREAN PASIEN SIAP BAYAR (4 COLS)            */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Antrean Pasien Siap Bayar
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Pilih untuk memuat
            </span>
          </div>

          {waitingVisits.length === 0 ? (
            <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-2xl p-6 sm:p-7 min-h-[182px] text-center flex flex-col items-center justify-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shrink-0">
                <CheckCircle className="w-5 h-5" weight="duotone" />
              </div>
              <p className="text-xs font-bold text-slate-700 leading-tight">
                Semua Antrean Kasir Bersih
              </p>
              <p className="text-[11px] text-slate-500 max-w-[290px] mx-auto leading-relaxed">
                Tidak ada pasien yang sedang menunggu pembayaran kasir atau penyerahan obat saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[560px] pr-1">
              {waitingVisits.map((visit) => {
                const isSelected = selectedVisit?.id === visit.id;
                const p = visit.pasien;
                const patientName = p
                  ? [p.gelar, p.nama].filter(Boolean).join(' ')
                  : 'Pasien Tanpa Nama';

                const visitTagihan =
                  (visit.jenis_pasien === 'BPJS' ? 0 : Number(visit.biaya_periksa || 35000)) +
                  Number(visit.pendapatan_lain || 0);

                const isBpjs = visit.jenis_pasien === 'BPJS';

                return (
                  <div
                    key={visit.id}
                    onClick={() => onSelectVisit(visit)}
                    className={cn(
                      'border rounded-2xl p-3.5 shadow-well transition-all flex items-center justify-between gap-3 tactile-card cursor-pointer select-none',
                      isSelected
                        ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-card-hover'
                        : 'bg-slate-50/70 border-slate-200/90 hover:border-teal-400'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0 border',
                          isBpjs
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                            : 'bg-teal-100 border-teal-300 text-teal-900'
                        )}
                      >
                        #{visit.nomor_antrian}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {patientName}
                          </span>
                          <span
                            className={cn(
                              'text-[9px] font-bold font-mono px-1.5 py-0.2 rounded-full border',
                              isBpjs
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-teal-50 text-teal-800 border-teal-200'
                            )}
                          >
                            {visit.jenis_pasien}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 truncate font-medium">
                          {visit.terapi_obat ? (
                            <span className="flex items-center gap-1">
                              <Pill className="w-3 h-3 text-emerald-600 shrink-0" weight="bold" />
                              <span className="truncate">{visit.terapi_obat}</span>
                            </span>
                          ) : (
                            <span>{visit.tindakan || 'Pemeriksaan Dokter'}</span>
                          )}
                        </p>
                        <div className="text-[11px] font-mono mt-0.5">
                          {isBpjs && visitTagihan === 0 ? (
                            <span className="text-emerald-700 font-bold">
                              Tercover BPJS (Rp 0)
                            </span>
                          ) : (
                            <span className="text-slate-900 font-bold">
                              {formatRupiah(visitTagihan)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <span className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-btn-primary inline-flex items-center gap-1 min-h-[32px]">
                          <CheckCircle className="w-3 h-3" weight="bold" />
                          Dipilih
                        </span>
                      ) : isBpjs && visitTagihan === 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVisit(visit);
                          }}
                          className="px-3 py-1.5 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-btn-primary border border-emerald-700/80 transition-colors tactile-btn min-h-[32px]"
                        >
                          Serahkan Obat
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-btn-secondary transition-colors tactile-btn min-h-[32px] inline-flex items-center">
                          Pilih
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* COLUMN 2: RESEP OBAT & TERAPI DOKTER (4 COLS)                  */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-emerald-600" weight="bold" />
              Resep Obat & Terapi Dokter
            </span>
            {selectedVisit && parsedPrescription.length > 0 && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full font-mono">
                {parsedPrescription.filter((p) => !p.isHeader).length} Item Obat
              </span>
            )}
          </div>

          {!selectedVisit ? (
            <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-2xl p-6 sm:p-7 min-h-[182px] text-center flex flex-col items-center justify-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shrink-0">
                <Pill className="w-5 h-5" weight="duotone" />
              </div>
              <p className="text-xs font-bold text-slate-700 leading-tight">Rincian Obat Dokter</p>
              <p className="text-[11px] text-slate-500 max-w-[290px] mx-auto leading-relaxed">
                Pilih pasien di sebelah kiri untuk melihat resep obat, diagnosa ICD-10, dan signa dosis.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 flex flex-col space-y-3">
              {/* Doctor & Patient Context Tag */}
              <div className="space-y-2 pb-2.5 border-b border-slate-200/80">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-bold text-slate-900 truncate">
                    Pasien #{selectedVisit.nomor_antrian} &bull; {selectedPatientName}
                  </span>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600 shrink-0">
                    {selectedVisit.dokter?.nama || 'Dokter Jaga'}
                  </span>
                </div>

                {/* Diagnosis & Procedure Tags */}
                {(selectedVisit.kode_icd10 || selectedVisit.tindakan) && (
                  <div className="space-y-1.5 pt-1">
                    {selectedVisit.kode_icd10 && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded shrink-0">
                          {selectedVisit.kode_icd10}
                        </span>
                        <span className="text-slate-700 font-medium text-[11px] truncate">
                          {selectedVisit.diagnosa_deskripsi || 'Diagnosa Dokter'}
                        </span>
                      </div>
                    )}
                    {selectedVisit.tindakan && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <FirstAid className="w-3.5 h-3.5 text-teal-600 shrink-0" weight="bold" />
                        <span className="text-slate-500 font-medium">Tindakan:</span>
                        <span className="font-bold text-slate-800 truncate">{selectedVisit.tindakan}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Itemized Prescriptions */}
              <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
                {parsedPrescription.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <Pill className="w-6 h-6 mx-auto mb-1 text-slate-300" weight="bold" />
                    <p className="text-xs font-semibold text-slate-600">Tidak ada resep obat</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Pasien hanya menerima konsultasi / tindakan medis langsung.</p>
                  </div>
                ) : (
                  parsedPrescription.map((item, idx) => (
                    item.isHeader ? (
                      <div key={idx} className="p-2 bg-teal-50/80 border border-teal-200/80 rounded-xl text-[11px] text-teal-900 font-semibold">
                        {item.raw}
                      </div>
                    ) : (
                      <div
                        key={idx}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs flex items-start justify-between gap-2 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{item.name}</div>
                            {item.signa && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Signa: <span className="font-bold text-emerald-800">{item.signa}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  ))
                )}
              </div>

              {/* Dispensing Advice Note */}
              <div className="pt-2.5 border-t border-slate-200/70 text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Serahkan obat ke pasien setelah pembayaran kasir selesai.</span>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* COLUMN 3: KALKULATOR TENDER & PEMBAYARAN KASIR (4 COLS)        */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-teal-600" weight="bold" />
              Pelunasan & Terminal Kasir
            </span>
            {selectedVisit && (
              <span
                className={cn(
                  'text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border',
                  selectedVisit.jenis_pasien === 'BPJS'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-teal-50 text-teal-900 border-teal-200'
                )}
              >
                {selectedVisit.jenis_pasien}
              </span>
            )}
          </div>

          {!selectedVisit ? (
            <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-2xl p-6 sm:p-7 min-h-[182px] text-center flex flex-col items-center justify-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shrink-0">
                <CreditCard className="w-5 h-5" weight="duotone" />
              </div>
              <p className="text-xs font-bold text-slate-700 leading-tight">Kalkulator Pembayaran</p>
              <p className="text-[11px] text-slate-500 max-w-[290px] mx-auto leading-relaxed">
                Pilih pasien di sebelah kiri untuk menghitung biaya, kembalian tunai, dan cetak kuitansi.
              </p>
            </div>
          ) : (
            <form onSubmit={handleConfirmPayment} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 flex flex-col space-y-3.5">
              <div className="space-y-3">
                {errorMessage && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                    <WarningCircle className="w-4 h-4 shrink-0 text-rose-600" weight="bold" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {onApplyPackage && (
                  <div className="p-3 bg-white border border-teal-200/80 rounded-xl space-y-2 shadow-2xs">
                    <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FirstAid className="w-3.5 h-3.5 text-teal-600" weight="bold" />
                      Paket Terapi
                    </span>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Tambahkan tindakan dan obat dari paket ke tagihan kunjungan ini.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      leftIcon={<FirstAid className="w-4 h-4" weight="bold" />}
                      onClick={() => setIsApplyOpen(true)}
                      disabled={!selectedVisit}
                    >
                      Terapkan Paket Terapi
                    </Button>
                  </div>
                )}

                {/* 1. Rincian Komponen Biaya Box */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs shadow-2xs">
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Jasa Pemeriksaan</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedVisit.jenis_pasien === 'BPJS'
                        ? 'Rp 0 (BPJS)'
                        : formatRupiah(biayaPeriksa)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Tindakan / Resep Obat</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah(pendapatanLain)}
                    </span>
                  </div>

                  {keteranganPendapatan && (
                    <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200 font-mono">
                      Ket: {keteranganPendapatan}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-900">
                    <span>Total Tagihan:</span>
                    <span className="text-sm sm:text-base text-teal-700 font-mono font-bold">
                      {selectedVisit.jenis_pasien === 'BPJS' && totalTagihan === 0
                        ? 'Rp 0'
                        : formatRupiah(totalTagihan)}
                    </span>
                  </div>
                </div>

                {/* 2. Metode Pembayaran Toggle (Consistent Min-H and Button Style) */}
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setJenisPembayaran('Tunai')}
                      className={cn(
                        'py-1.5 px-3 min-h-[36px] rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition tactile-btn',
                        jenisPembayaran === 'Tunai'
                          ? 'bg-gradient-to-b from-teal-600 to-teal-700 text-white border-teal-700/80 shadow-btn-primary'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-btn-secondary'
                      )}
                    >
                      <Money className="w-4 h-4" weight="bold" />
                      <span>Tunai (Cash)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setJenisPembayaran('TF')}
                      className={cn(
                        'py-1.5 px-3 min-h-[36px] rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition tactile-btn',
                        jenisPembayaran === 'TF'
                          ? 'bg-gradient-to-b from-teal-600 to-teal-700 text-white border-teal-700/80 shadow-btn-primary'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-btn-secondary'
                      )}
                    >
                      <CreditCard className="w-4 h-4" weight="bold" />
                      <span>Transfer (TF)</span>
                    </button>
                  </div>
                </div>

                {/* 3. Status Pembayaran */}
                {selectedVisit.jenis_pasien !== 'BPJS' && (
                  <div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Lunas', 'Piutang', 'Belum Bayar'] as const).map((state) => (
                        <button
                          key={state}
                          type="button"
                          onClick={() => setPaymentState(state)}
                          className={cn(
                            'py-1.5 px-2 min-h-[36px] rounded-xl text-[11px] font-bold border flex items-center justify-center transition tactile-btn',
                            paymentState === state
                              ? 'bg-gradient-to-b from-teal-600 to-teal-700 text-white border-teal-700/80 shadow-btn-primary'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-btn-secondary'
                          )}
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Tender Section (Tunai) */}
                {jenisPembayaran === 'Tunai' && (
                  <div className="space-y-2.5">
                    {/* Quick Cash Buttons */}
                    <div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {quickCashOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setPaymentState('Lunas');
                              setUangDiterimaStr(formatRupiahInput(opt.value));
                            }}
                            className={cn(
                              'px-2.5 py-1.5 bg-white hover:bg-slate-50 border rounded-xl text-xs font-bold font-mono shadow-btn-secondary tactile-btn text-left truncate min-h-[34px]',
                              nominalDiterima === opt.value
                                ? 'border-teal-600 text-teal-700 ring-2 ring-teal-500/10'
                                : 'border-slate-300 text-slate-800'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Uang Diterima & Kembalian */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Uang Diterima
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <span className="text-xs font-mono font-bold text-teal-700">Rp</span>
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={uangDiterimaStr}
                            onChange={(e) => {
                              const parsed = parseRupiahInput(e.target.value);
                              setUangDiterimaStr(parsed > 0 ? formatRupiahInput(parsed) : '');
                            }}
                            placeholder="200.000"
                            className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold font-mono text-slate-900 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[38px]"
                          />
                        </div>
                      </div>

                      <div
                        className={cn(
                          'p-2 rounded-xl border shadow-well flex flex-col justify-center min-h-[38px]',
                          isKurangBayar
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        )}
                      >
                        <div className="text-[9px] font-bold uppercase tracking-wider">
                          {isKurangBayar ? 'Kurang Bayar' : paymentState === 'Piutang' ? 'Sisa Piutang' : 'Kembalian Pasien'}
                        </div>
                        <div className="text-sm font-bold font-mono">
                          {formatRupiah(
                            isKurangBayar || paymentState === 'Piutang'
                              ? Math.max(0, totalTagihan - nominalDiterima)
                              : uangKembalian
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Action Submit Button (Matching Dashboard Primary Button Specs) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isKurangBayar}
                  className={cn(
                    'w-full px-4 py-2 min-h-[38px] sm:min-h-[40px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 tactile-btn transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none',
                    isSubmitting || isKurangBayar
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-btn-primary border border-teal-700/80'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <ArrowsClockwise className="w-4 h-4 animate-spin text-white" weight="bold" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4 text-white" weight="bold" />
                      <span>
                        {selectedVisit.jenis_pasien === 'BPJS' && totalTagihan === 0
                          ? 'Konfirmasi Obat & Selesaikan'
                          : 'Konfirmasi Bayar & Cetak Kuitansi'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {onApplyPackage && (
        <ApplyPackageModal
          isOpen={isApplyOpen}
          onClose={() => setIsApplyOpen(false)}
          visit={selectedVisit}
          onSubmit={(pkg) => onApplyPackage(selectedVisit as Visit, pkg)}
        />
      )}
    </div>
  );
}

export default CashierPosPanel;
