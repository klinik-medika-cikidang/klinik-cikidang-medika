'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Warning,
  CheckCircle,
  CaretRight,
  User,
  Heartbeat,
  Printer,
  CalendarCheck,
  Check,
  CaretDown,
  ChatCircleText,
  Phone,
  Clock,
  Flask,
} from '@phosphor-icons/react';
import { Lungs } from 'healthicons-react';
import { toast } from 'sonner';
import type { TbcProgram } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { TbTreatmentCardPrint } from '@/components/program-khusus/TbTreatmentCardPrint';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils';

interface TbcControlCardProps {
  program: TbcProgram;
  onRefresh: () => void;
}

export function TbcControlCard({ program, onRefresh }: TbcControlCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPrintCard, setShowPrintCard] = useState(false);

  // Form states
  const [currentMonth, setCurrentMonth] = useState(program.bulan_ke || 1);
  const [statusTbc, setStatusTbc] = useState(program.status_tbc);
  const [dahakResult, setDahakResult] = useState(program.hasil_dahak_akhir || 'Belum Periksa');
  const [notes, setNotes] = useState(program.catatan || '');

  // Popover state for custom selects in modal
  const [activeDropdown, setActiveDropdown] = useState<'month' | 'status' | 'dahak' | null>(null);

  // Check if defaulter (> 7 days passed expected month control date)
  const startDate = new Date(program.tanggal_mulai);
  const now = new Date();
  const expectedMonthsPassed =
    (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  const isMangkir =
    program.status_tbc === 'Mangkir' ||
    (program.status_tbc === 'Dalam Pengobatan' && expectedMonthsPassed > (program.bulan_ke || 1));

  // WhatsApp reminder message
  const handleWhatsAppContact = () => {
    const rawPhone = program.pasien?.no_telepon?.replace(/[^0-9]/g, '');
    if (!rawPhone) {
      toast.error('Nomor telepon pasien belum tercatat di data rekam medis.');
      return;
    }
    const phone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;
    const patientName = program.pasien?.nama || 'Bapak/Ibu';
    const message = encodeURIComponent(
      `Halo ${patientName}, kami dari Tim Layanan TB DOTS Klinik Pratama Cikidang Medika mengingatkan jadwal kontrol berkala dan pengambilan obat OAT rutin. Mohon kesediaannya untuk hadir kontrol ke klinik demi kelancaran masa pemulihan pengobatan 6 bulan. Terima kasih.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const fase = currentMonth <= 2 ? 'Intensif' : currentMonth < 6 ? 'Lanjutan' : 'Selesai';
      const { error } = await supabase
        .from('tbc_programs')
        .update({
          bulan_ke: currentMonth,
          fase_pengobatan: fase,
          status_tbc: statusTbc,
          hasil_dahak_akhir: dahakResult,
          catatan: notes.trim() || null,
        })
        .eq('id', program.id);

      if (error) throw error;
      toast.success(`Kendali TBC ${program.pasien?.nama || ''} berhasil diperbarui`);
      setShowUpdateModal(false);
      onRefresh();
    } catch (err) {
      console.error('Error updating TBC program:', err);
      toast.error(getErrorMessage(err, 'Gagal memperbarui status kendali TBC.'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border shadow-card-double p-4 sm:p-5 space-y-4 tactile-card transition-all ${
        isMangkir
          ? 'border-rose-300 ring-2 ring-rose-500/10 hover:border-rose-400'
          : 'border-slate-200/90 hover:border-teal-400'
      }`}
    >
      {/* 1. Header Info Pasien */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/90 flex items-center justify-center text-purple-700 shadow-2xs shrink-0">
            <Lungs className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                {program.pasien?.nama || 'Pasien TBC'}
              </h3>
              <span className="text-[11px] font-mono font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg border border-teal-200/80">
                {program.pasien?.no_rm || '-'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {program.tipe_pasien}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Desa {program.pasien?.desa || '-'} • Usia {program.pasien?.usia || '-'} thn •{' '}
              {program.pasien?.jenis_kelamin || '-'} • Mulai:{' '}
              <strong className="text-slate-700 font-medium">
                {new Date(program.tanggal_mulai).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </strong>
            </p>
          </div>
        </div>

        {/* Right Status Badges */}
        <div className="flex flex-wrap items-center gap-1.5 self-start">
          {isMangkir ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 animate-pulse">
              <Warning className="w-3.5 h-3.5 text-rose-600" weight="bold" />
              <span>Mangkir Kontrol</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" weight="bold" />
              <span>{program.status_tbc}</span>
            </span>
          )}
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
            {program.kategori_oat}
          </span>
        </div>
      </div>

      {/* 2. Defaulter Urgent Banner (When Overdue > 7 Days) */}
      {isMangkir && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-rose-50 via-rose-50/80 to-amber-50/50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-rose-900">
            <div className="p-1.5 bg-rose-100 text-rose-700 rounded-xl shrink-0">
              <Warning className="w-4 h-4" weight="bold" />
            </div>
            <div>
              <span className="font-bold">Peringatan Kepatuhan OAT: </span>
              <span>Pasien belum kontrol &gt; 7 hari dari jadwal bulan berjalan. Risiko resistensi obat (MDR-TB). Segera hubungi pasien atau PMO.</span>
            </div>
          </div>

          {program.pasien?.no_telepon && (
            <button
              type="button"
              onClick={handleWhatsAppContact}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs tactile-btn shrink-0"
              title="Hubungi Pasien / PMO via WhatsApp"
            >
              <ChatCircleText className="w-4 h-4" weight="fill" />
              <span>Hubungi Pasien (WA)</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Clinical Journey Progression Stepper (Intensive vs Continuation) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Progres Kohort Pengobatan OAT:</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              Bulan ke-{program.bulan_ke || 1} dari 6
            </span>
          </div>
          <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">
            Fase Aktif: <strong className="text-slate-800">{program.fase_pengobatan}</strong>
          </span>
        </div>

        {/* 2-Phase Annotated Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          {/* Phase 1: Intensive (Months 1-2) - 2 cols on md */}
          <div className="md:col-span-2 p-2.5 bg-purple-50/50 rounded-2xl border border-purple-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 border-b border-purple-200/60 pb-1">
              <span>FASE INTENSIF (4FDC)</span>
              <span className="text-[10px] text-purple-700 font-semibold">Bulan 1–2</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[1, 2].map((m) => {
                const isCompleted = m < (program.bulan_ke || 1);
                const isCurrent = m === (program.bulan_ke || 1);
                return (
                  <div
                    key={m}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      isCurrent
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-600/30 font-bold'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                        : 'bg-white text-slate-400 border-slate-200 font-medium'
                    }`}
                  >
                    <div className="text-[11px]">Bulan {m}</div>
                    <div className="text-[9px] mt-0.5">4FDC Harian</div>
                    {m === 2 && (
                      <div
                        className={`mt-1 text-[8px] font-extrabold px-1 py-0.2 rounded ${
                          isCurrent
                            ? 'bg-purple-800 text-purple-100'
                            : isCompleted
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        BTA Bln 2
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase 2: Continuation (Months 3-6) - 4 cols on md */}
          <div className="md:col-span-4 p-2.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 border-b border-slate-200/80 pb-1">
              <span>FASE LANJUTAN (2FDC)</span>
              <span className="text-[10px] text-slate-500 font-semibold">Bulan 3–6</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[3, 4, 5, 6].map((m) => {
                const isCompleted = m < (program.bulan_ke || 1);
                const isCurrent = m === (program.bulan_ke || 1);
                return (
                  <div
                    key={m}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      isCurrent
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs ring-2 ring-teal-600/30 font-bold'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                        : 'bg-white text-slate-400 border-slate-200 font-medium'
                    }`}
                  >
                    <div className="text-[11px]">Bulan {m}</div>
                    <div className="text-[9px] mt-0.5">2FDC</div>
                    {(m === 5 || m === 6) && (
                      <div
                        className={`mt-1 text-[8px] font-extrabold px-1 py-0.2 rounded truncate ${
                          isCurrent
                            ? 'bg-teal-800 text-teal-100'
                            : isCompleted
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {m === 5 ? 'BTA Bln 5' : 'BTA Akhir'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lab Dahak Evaluasi & Action Buttons */}
      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-inner">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-700">
            <Flask className="w-4 h-4 text-purple-600 shrink-0" weight="duotone" />
            <span>
              Evaluasi Dahak BTA Terakhir:{' '}
              <strong className="text-slate-900 font-bold font-mono">
                {program.hasil_dahak_akhir || 'Belum Periksa'}
              </strong>
            </span>
          </div>
          {program.catatan && (
            <p className="text-[11px] text-slate-500 italic max-w-xl">
              &ldquo;{program.catatan}&rdquo;
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowPrintCard(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-btn-secondary tactile-btn transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            title="Cetak Formulir TB 01 Saku Pasien"
          >
            <Printer className="w-3.5 h-3.5 text-purple-700" weight="bold" />
            <span>Cetak Kartu TB</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUpdateModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            <span>Update Status &amp; Sputum</span>
            <CaretRight className="w-3.5 h-3.5" weight="bold" />
          </button>
        </div>
      </div>

      {/* 5. Modal Update Status with Custom Floating Popovers */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title={`Perbarui Kendali TBC - ${program.pasien?.nama || 'Pasien'}`}
        description="Pembaruan progres kohort bulanan, hasil lab dahak BTA, dan evaluasi klinis"
        maxWidth="md"
      >
        <div className="p-5 space-y-4 text-xs">
          <div className="space-y-4">
            {/* Custom Popover 1: Progres Bulan Ke */}
            <div className="relative">
              <label className="block font-bold text-slate-800 mb-1.5">
                Progres Pengobatan (Bulan Ke):
              </label>
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === 'month' ? null : 'month')
                }
                className="w-full px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between text-left text-xs font-medium text-slate-900 shadow-xs focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    Bulan ke-{currentMonth}{' '}
                    <span className="font-normal text-slate-500">
                      ({currentMonth <= 2 ? 'Fase Intensif 4FDC' : 'Fase Lanjutan 2FDC'})
                    </span>
                  </div>
                </div>
                <CaretDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    activeDropdown === 'month' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'month' && (
                <div className="absolute top-full mt-1.5 inset-x-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-popover p-1.5 space-y-1 animate-popover">
                  {[1, 2, 3, 4, 5, 6].map((m) => (
                    <div
                      key={m}
                      onClick={() => {
                        setCurrentMonth(m);
                        setActiveDropdown(null);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                        currentMonth === m
                          ? 'bg-teal-50 text-teal-900 font-bold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <div>Bulan ke-{m}</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {m <= 2 ? 'Regimen 4FDC Harian' : 'Regimen 2FDC Lanjutan'}
                          {(m === 2 || m === 5 || m === 6) && ' • Uji BTA'}
                        </div>
                      </div>
                      {currentMonth === m && <Check className="w-4 h-4 text-teal-600" weight="bold" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Popover 2: Status Pengobatan */}
            <div className="relative">
              <label className="block font-bold text-slate-800 mb-1.5">
                Status Klinis Pasien:
              </label>
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === 'status' ? null : 'status')
                }
                className="w-full px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between text-left text-xs font-medium text-slate-900 shadow-xs focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition"
              >
                <div className="font-bold text-slate-900">{statusTbc}</div>
                <CaretDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    activeDropdown === 'status' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'status' && (
                <div className="absolute top-full mt-1.5 inset-x-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-popover p-1.5 space-y-1 animate-popover">
                  {(
                    [
                      { id: 'Dalam Pengobatan', desc: 'Pasien aktif berobat dan mengambil OAT rutin' },
                      { id: 'Sembuh', desc: 'Pengobatan selesai dengan hasil dahak BTA negatif' },
                      { id: 'Pengobatan Lengkap', desc: '6 bulan OAT tuntas tanpa data lab akhir' },
                      { id: 'Mangkir', desc: 'Tidak kontrol > 7 hari dari jadwal yang ditentukan' },
                    ] as const
                  ).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setStatusTbc(s.id);
                        setActiveDropdown(null);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                        statusTbc === s.id
                          ? 'bg-teal-50 text-teal-900 font-bold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <div>{s.id}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{s.desc}</div>
                      </div>
                      {statusTbc === s.id && <Check className="w-4 h-4 text-teal-600" weight="bold" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Popover 3: Hasil Dahak BTA */}
            <div className="relative">
              <label className="block font-bold text-slate-800 mb-1.5">
                Hasil Uji Dahak Mikroskopis BTA:
              </label>
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === 'dahak' ? null : 'dahak')
                }
                className="w-full px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between text-left text-xs font-medium text-slate-900 shadow-xs focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition"
              >
                <div className="font-bold text-slate-900 font-mono">{dahakResult}</div>
                <CaretDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    activeDropdown === 'dahak' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {activeDropdown === 'dahak' && (
                <div className="absolute top-full mt-1.5 inset-x-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-popover p-1.5 space-y-1 animate-popover">
                  {(
                    [
                      'Belum Periksa',
                      'Negatif (-)',
                      'Positif (+)',
                      'Positif (++)',
                      'Positif (+++)',
                    ] as const
                  ).map((d) => (
                    <div
                      key={d}
                      onClick={() => {
                        setDahakResult(d);
                        setActiveDropdown(null);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition font-mono ${
                        dahakResult === d
                          ? 'bg-teal-50 text-teal-900 font-bold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{d}</span>
                      {dahakResult === d && <Check className="w-4 h-4 text-teal-600" weight="bold" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                Catatan Klinis &amp; Evaluasi Minum Obat:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pasien teratur minum OAT, batuk berkurang, tidak ada efek samping berat..."
                rows={2}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:outline-none text-xs text-slate-900 placeholder:text-slate-400 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowUpdateModal(false)}
              disabled={isUpdating}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition min-h-[38px] shadow-btn-secondary tactile-btn"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 rounded-xl transition min-h-[38px] flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none shadow-btn-primary tactile-btn border border-teal-700/80"
            >
              {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Cetak Kartu Berobat TBC Saku */}
      <TbTreatmentCardPrint
        isOpen={showPrintCard}
        onClose={() => setShowPrintCard(false)}
        program={program}
      />
    </div>
  );
}
