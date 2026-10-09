'use client';

import React, { useState } from 'react';
import {
  CalendarBlank,
  CheckCircle,
  Clock,
  Warning,
  CircleNotch,
  ChatCircleText,
  CalendarPlus,
  Check,
  Calendar,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { PostCare } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';

interface PostCareAgendaProps {
  records: PostCare[];
  onRefresh: () => void;
  isLoading?: boolean;
}

export function PostCareAgenda({ records, onRefresh, isLoading }: PostCareAgendaProps) {
  const [filterTab, setFilterTab] = useState<'today' | 'overdue' | 'upcoming' | 'completed'>('today');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<PostCare | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayList = records.filter(
    (r) => r.tanggal_kontrol_berikutnya === todayStr && r.status_kontrol !== 'Sudah Kontrol'
  );
  const overdueList = records.filter(
    (r) => r.tanggal_kontrol_berikutnya < todayStr && r.status_kontrol !== 'Sudah Kontrol'
  );
  const upcomingList = records.filter(
    (r) => r.tanggal_kontrol_berikutnya > todayStr && r.status_kontrol !== 'Sudah Kontrol'
  );
  const completedList = records.filter((r) => r.status_kontrol === 'Sudah Kontrol');

  const handleMarkComplete = async (id: string) => {
    setUpdatingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('post_cares')
        .update({ status_kontrol: 'Sudah Kontrol' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Pasien berhasil ditandai telah menyelesaikan observasi');
      onRefresh();
    } catch (err) {
      console.error('Error updating post-care status:', err);
      toast.error('Gagal memperbarui status kontrol');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleTarget || !newDate) {
      toast.error('Silakan tentukan tanggal kontrol baru');
      return;
    }

    setIsRescheduling(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('post_cares')
        .update({
          tanggal_kontrol_berikutnya: newDate,
          status_kontrol: 'Menunggu',
        })
        .eq('id', rescheduleTarget.id);

      if (error) throw error;
      toast.success(
        `Jadwal kontrol ${rescheduleTarget.pasien?.nama || 'Pasien'} berhasil diubah ke ${new Date(
          newDate
        ).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
      );
      setRescheduleTarget(null);
      setNewDate('');
      onRefresh();
    } catch (err) {
      console.error('Error rescheduling post-care:', err);
      toast.error('Gagal menjadwalkan ulang kontrol');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleWhatsAppReminder = (item: PostCare) => {
    const rawPhone = item.pasien?.no_telepon?.replace(/[^0-9]/g, '');
    if (!rawPhone) {
      toast.error('Nomor telepon pasien belum tercatat di data rekam medis.');
      return;
    }
    const phone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;
    const patientName = item.pasien?.nama || 'Bapak/Ibu';
    const dateFormatted = new Date(item.tanggal_kontrol_berikutnya).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const isOverdue = item.tanggal_kontrol_berikutnya < todayStr;
    const greeting = isOverdue
      ? `Halo ${patientName}, kami dari Layanan Observasi Klinik Pratama Cikidang Medika menginfokan bahwa jadwal kontrol kesehatan Anda yang terjadwal pada ${dateFormatted} telah terlewat. Mohon kesediaannya untuk hadir kontrol agar proses pemulihan dapat dipantau oleh dokter. Terima kasih.`
      : `Halo ${patientName}, kami dari Layanan Observasi Klinik Pratama Cikidang Medika mengingatkan jadwal kontrol berkala paska tindakan/rawat inap pada hari ini (${dateFormatted}). Kami tunggu kedatangannya di klinik. Terima kasih.`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(greeting)}`, '_blank');
  };

  const activeList =
    filterTab === 'today'
      ? todayList
      : filterTab === 'overdue'
      ? overdueList
      : filterTab === 'upcoming'
      ? upcomingList
      : completedList;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 bg-white rounded-2xl border border-slate-200/90 shadow-card-double animate-pulse p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-40 bg-slate-200 rounded"></div>
              <div className="h-6 w-24 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="h-3 w-56 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Sleek Recessed Segmented Sub-Tabs Track */}
      <div className="w-full bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 w-full">
          <button
            type="button"
            onClick={() => setFilterTab('today')}
            className={`h-9 px-3 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
              filterTab === 'today'
                ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
            }`}
          >
            <Clock weight="duotone" className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="truncate">Hari Ini ({todayList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('overdue')}
            className={`h-9 px-3 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
              filterTab === 'overdue'
                ? 'bg-white text-rose-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
            }`}
          >
            <Warning weight="duotone" className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate">Overdue ({overdueList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('upcoming')}
            className={`h-9 px-3 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
              filterTab === 'upcoming'
                ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
            }`}
          >
            <CalendarBlank weight="duotone" className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="truncate">Mendatang ({upcomingList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('completed')}
            className={`h-9 px-3 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
              filterTab === 'completed'
                ? 'bg-white text-emerald-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
            }`}
          >
            <CheckCircle weight="duotone" className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Selesai ({completedList.length})</span>
          </button>
        </div>
      </div>

      {/* 2. List Items */}
      {activeList.length === 0 ? (
        <div className="p-8 sm:p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-600 shadow-card-double">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl w-fit mx-auto mb-3 border border-emerald-200">
            <CheckCircle weight="duotone" className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {filterTab === 'today'
              ? 'Tidak ada jadwal observasi untuk hari ini'
              : filterTab === 'overdue'
              ? 'Luar biasa! Tidak ada pasien yang mangkir atau terlambat jadwal kontrol'
              : filterTab === 'upcoming'
              ? 'Belum ada agenda kontrol lanjutan untuk hari-hari mendatang'
              : 'Belum ada catatan riwayat kontrol yang ditandai selesai'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Semua pasien pada kategori ini terpantau rapi. Klik &quot;+ Jadwal Observasi&quot; di atas untuk memasukkan jadwal baru.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeList.map((item) => {
            const isItemOverdue = item.tanggal_kontrol_berikutnya < todayStr && item.status_kontrol !== 'Sudah Kontrol';
            const isItemToday = item.tanggal_kontrol_berikutnya === todayStr && item.status_kontrol !== 'Sudah Kontrol';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-card-double tactile-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${
                  isItemOverdue
                    ? 'border-rose-300 ring-2 ring-rose-500/10 hover:border-rose-400'
                    : isItemToday
                    ? 'border-teal-300 hover:border-teal-400'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2 min-w-0">
                  {/* Patient Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {item.pasien?.nama || 'Pasien Observasi'}
                    </h4>
                    <span className="text-[11px] font-mono font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg border border-teal-200/80">
                      RM: {item.pasien?.no_rm}
                    </span>
                    <span className="text-xs text-slate-500">Desa {item.pasien?.desa}</span>
                    {item.pasien?.usia && (
                      <span className="text-xs text-slate-500">• {item.pasien?.usia} thn</span>
                    )}
                  </div>

                  {/* Scheduled Date Indicator */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Jadwal Kontrol:</span>
                    <strong
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-bold border ${
                        isItemOverdue
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : isItemToday
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(item.tanggal_kontrol_berikutnya).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>

                    {isItemOverdue && (
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full animate-pulse">
                        Terlewat
                      </span>
                    )}

                    {item.status_kontrol === 'Sudah Kontrol' && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" weight="bold" />
                        Sudah Kontrol Selesai
                      </span>
                    )}
                  </div>

                  {/* Medical Condition & Notes */}
                  {item.kondisi_terakhir && (
                    <p className="text-xs text-slate-600">
                      <span className="text-slate-500 font-medium">Diagnosa / Kondisi: </span>
                      <strong className="text-slate-800">{item.kondisi_terakhir}</strong>
                    </p>
                  )}
                  {item.keluhan_lanjutan && (
                    <p className="text-[11px] text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/90 inline-block font-medium">
                      Keluhan Lanjutan: {item.keluhan_lanjutan}
                    </p>
                  )}
                </div>

                {/* Actions: Mark Completed, Reschedule, WhatsApp */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* WhatsApp Reminder Button */}
                  {item.pasien?.no_telepon && item.status_kontrol !== 'Sudah Kontrol' && (
                    <button
                      type="button"
                      onClick={() => handleWhatsAppReminder(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold tactile-btn transition"
                      title="Kirim pengingat kontrol ramah via WhatsApp"
                    >
                      <ChatCircleText className="w-3.5 h-3.5 text-emerald-600" weight="fill" />
                      <span>Ingatkan (WA)</span>
                    </button>
                  )}

                  {/* Reschedule Button */}
                  {item.status_kontrol !== 'Sudah Kontrol' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRescheduleTarget(item);
                        setNewDate(item.tanggal_kontrol_berikutnya);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-btn-secondary tactile-btn transition"
                      title="Atur ulang tanggal kunjungan pasien"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-slate-600" weight="bold" />
                      <span>Jadwalkan Ulang</span>
                    </button>
                  )}

                  {/* Complete Button */}
                  {item.status_kontrol !== 'Sudah Kontrol' && (
                    <button
                      type="button"
                      onClick={() => handleMarkComplete(item.id)}
                      disabled={updatingId === item.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[38px] bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition disabled:opacity-50"
                    >
                      {updatingId === item.id ? (
                        <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle weight="bold" className="w-4 h-4" />
                      )}
                      <span>{updatingId === item.id ? 'Menyimpan...' : 'Tandai Selesai'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Modal Reschedule Jadwal Kontrol */}
      {rescheduleTarget && (
        <Modal
          isOpen={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          title={`Jadwalkan Ulang Kontrol - ${rescheduleTarget.pasien?.nama || 'Pasien'}`}
          description="Sesuaikan tanggal kontrol berikutnya jika pasien meminta perubahan waktu kedatangan"
          maxWidth="sm"
        >
          <div className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                Tanggal Kontrol Baru:
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={todayStr}
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:outline-none min-h-[40px] transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Jadwal sebelumnya:{' '}
                <strong>
                  {new Date(rescheduleTarget.tanggal_kontrol_berikutnya).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                disabled={isRescheduling}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition min-h-[38px] shadow-btn-secondary tactile-btn"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRescheduleSubmit}
                disabled={isRescheduling || !newDate}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 rounded-xl transition min-h-[38px] flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none shadow-btn-primary tactile-btn border border-teal-700/80"
              >
                {isRescheduling ? 'Menyimpan...' : 'Simpan Jadwal Baru'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
