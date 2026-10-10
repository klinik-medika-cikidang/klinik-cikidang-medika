'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  CalendarBlank,
  ArrowClockwise,
  WarningCircle,
  PlusCircle,
  CheckCircle,
  ArrowsOut,
  ArrowsIn,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Visit } from '@/types/database';
import { QueueList } from '@/components/rekam-medis/QueueList';
import { ExaminationForm } from '@/components/rekam-medis/ExaminationForm';
import { CancelQueueModal } from '@/components/rekam-medis/CancelQueueModal';
import { cn } from '@/lib/utils';

export default function RekamMedisPage() {
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExamExpanded, setIsExamExpanded] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [visitToCancel, setVisitToCancel] = useState<Visit | null>(null);

  const fetchVisits = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          pasien:patients(*),
          dokter:doctors(*)
        `)
        .eq('tanggal_periksa', selectedDate)
        .order('nomor_antrian', { ascending: true });

      if (error) throw error;

      const visitList = (data as unknown as Visit[]) || [];
      setVisits(visitList);

      if (selectedVisit) {
        const found = visitList.find((v) => v.id === selectedVisit.id);
        if (found) {
          setSelectedVisit(found);
        } else {
          // If previously selected visit is no longer in list, find next waiting
          const firstWaiting = visitList.find(
            (v) => v.status_pembayaran === 'Menunggu Dokter' && !v.kode_icd10
          );
          setSelectedVisit(firstWaiting || null);
        }
      } else if (visitList.length > 0) {
        const firstWaiting = visitList.find(
          (v) => v.status_pembayaran === 'Menunggu Dokter' && !v.kode_icd10
        );
        setSelectedVisit(firstWaiting || null);
      } else {
        setSelectedVisit(null);
      }
    } catch (err) {
      console.error('Error fetching queue visits:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal memuat antrean pasien dari database.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedVisit?.id]);

  useEffect(() => {
    fetchVisits();
  }, [selectedDate]);

  // Handle URL query parameter pasien_id (from Navbar Search & Quick Profile)
  useEffect(() => {
    if (typeof window === 'undefined' || visits.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const pasienId = params.get('pasien_id');
    if (pasienId) {
      const match = visits.find((v) => v.pasien_id === pasienId);
      if (match) {
        setSelectedVisit(match);
      }
    }
  }, [visits]);

  const handleSelectVisit = (visit: Visit) => {
    setSelectedVisit(visit);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        document.getElementById('exam-workstation')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSaveSuccess = (updatedVisit: Visit, isHandover?: boolean) => {
    setVisits((prev) => {
      const nextList = prev.map((v) => (v.id === updatedVisit.id ? updatedVisit : v));

      if (isHandover) {
        // Find next waiting patient in the queue
        const remainingWaiting = nextList.filter(
          (v) => v.id !== updatedVisit.id && v.status_pembayaran === 'Menunggu Dokter' && !v.kode_icd10
        );
        if (remainingWaiting.length > 0) {
          setSelectedVisit(remainingWaiting[0]);
        } else {
          // Queue is clear! Set selectedVisit to null to show clean standby state
          setSelectedVisit(null);
        }
      } else {
        setSelectedVisit(updatedVisit);
      }

      return nextList;
    });
  };

  const handleOpenCancelModal = (visit: Visit) => {
    setVisitToCancel(visit);
    setIsCancelModalOpen(true);
  };

  const handleCancelQueue = async (visitId: string, reason: string, note?: string) => {
    const fullReason = note ? `${reason}: ${note}` : reason;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('visits')
      .update({
        status_pembayaran: 'Batal',
        alasan_batal: fullReason,
        dibatalkan_pada: new Date().toISOString(),
      })
      .eq('id', visitId)
      .select(`
        *,
        pasien:patients(*),
        dokter:doctors(*)
      `)
      .single();

    if (error) {
      toast.error(`Gagal membatalkan antrean: ${error.message}`);
      throw error;
    }

    const updated = data as unknown as Visit;
    setVisits((prev) => {
      const next = prev.map((v) => (v.id === visitId ? updated : v));
      if (selectedVisit?.id === visitId) {
        const nextWaiting = next.find(
          (v) => v.id !== visitId && v.status_pembayaran === 'Menunggu Dokter' && !v.kode_icd10
        );
        setSelectedVisit(nextWaiting || null);
      }
      return next;
    });

    toast.success('Antrean pasien berhasil dibatalkan.');
  };

  const handleRestoreQueue = async (visit: Visit) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('visits')
      .update({
        status_pembayaran: 'Menunggu Dokter',
        alasan_batal: null,
        dibatalkan_pada: null,
      })
      .eq('id', visit.id)
      .select(`
        *,
        pasien:patients(*),
        dokter:doctors(*)
      `)
      .single();

    if (error) {
      toast.error(`Gagal memulihkan antrean: ${error.message}`);
      return;
    }

    const updated = data as unknown as Visit;
    setVisits((prev) => {
      const next = prev.map((v) => (v.id === visit.id ? updated : v));
      if (!selectedVisit) {
        setSelectedVisit(updated);
      }
      return next;
    });

    toast.success('Antrean berhasil dipulihkan ke status Menunggu Dokter.');
  };

  const hasWaitingPatients = visits.some(
    (v) => v.status_pembayaran === 'Menunggu Dokter' && !v.kode_icd10
  );

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 text-white flex items-center justify-center shadow-btn-primary shrink-0">
            <Stethoscope className="w-5 h-5" weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Pemeriksaan Dokter (Poli 1)
              </h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Poli Aktif
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Workstation klinis terpadu: tanda vital, paket resep 1-klik, diagnosa ICD-10, dan riwayat rekam medis
            </p>
          </div>
        </div>

        {/* Date Filter & Quick Refresh Controls */}
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-btn-secondary min-h-[36px] flex-1 sm:flex-initial">
            <CalendarBlank className="w-4 h-4 text-slate-500 shrink-0" weight="bold" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Pilih tanggal periksa antrean"
              className="text-xs font-semibold text-slate-800 outline-none bg-transparent cursor-pointer w-full font-mono"
            />
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(getTodayString())}
            disabled={selectedDate === getTodayString()}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-btn-secondary tactile-btn min-h-[36px]"
          >
            Hari Ini
          </button>

          <button
            type="button"
            onClick={() => setIsExamExpanded((prev) => !prev)}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-btn-secondary tactile-btn min-h-[36px] inline-flex items-center gap-1.5"
            title={isExamExpanded ? 'Kembalikan layout 2 kolom' : 'Perbesar area periksa dokter'}
            aria-label={isExamExpanded ? 'Kembalikan layout 2 kolom' : 'Perbesar area periksa dokter'}
          >
            {isExamExpanded ? <ArrowsIn className="w-4 h-4 text-teal-600" weight="bold" /> : <ArrowsOut className="w-4 h-4 text-teal-600" weight="bold" />}
            <span>{isExamExpanded ? 'Tampilan Normal' : 'Perbesar Area Periksa'}</span>
          </button>

          <button
            type="button"
            onClick={fetchVisits}
            disabled={isLoading}
            className="w-9 h-9 min-h-[36px] bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl transition shadow-btn-secondary tactile-btn flex items-center justify-center shrink-0"
            title="Muat ulang antrean"
            aria-label="Muat ulang antrean pasien"
          >
            <ArrowClockwise className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : 'text-slate-600'}`} weight="bold" />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <WarningCircle className="w-4 h-4 shrink-0 text-rose-600" weight="fill" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchVisits}
            className="px-3 py-1 bg-white border border-rose-300 text-rose-700 rounded-lg text-xs font-bold shadow-2xs hover:bg-rose-50"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 2-Column Clinical Layout */}
      <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch', isExamExpanded && 'lg:grid-cols-1')}>
        {/* Left Column: Patient Queue Panel */}
        <div className={cn('lg:col-span-5 xl:col-span-4 h-full', isExamExpanded && 'hidden')}>
          <QueueList
            visits={visits}
            selectedVisitId={selectedVisit?.id || null}
            onSelectVisit={handleSelectVisit}
            isLoading={isLoading}
            onRefresh={fetchVisits}
            onCancelVisit={handleOpenCancelModal}
            onRestoreVisit={handleRestoreQueue}
          />
        </div>

        {/* Right Column: Unified Clinical Workstation */}
        <div
          id="exam-workstation"
          className={cn('lg:col-span-7 xl:col-span-8 scroll-mt-6 h-full lg:h-[calc(100vh-140px)]', isExamExpanded && 'lg:col-span-1 xl:col-span-1')}
        >
          {selectedVisit ? (
            <ExaminationForm
              key={selectedVisit.id}
              visit={selectedVisit}
              onSaveSuccess={handleSaveSuccess}
              className="h-full"
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-14 text-center shadow-card-double space-y-4">
              {visits.length > 0 && !hasWaitingPatients ? (
                // Standby: All patients completed
                <>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-well">
                    <CheckCircle className="w-7 h-7" weight="duotone" />
                  </div>

                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Seluruh Pasien Hari Ini Selesai Diperiksa
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      Tidak ada antrean pasien yang sedang menunggu ruang dokter saat ini. Seluruh data rekam medis pasien telah berhasil diteruskan ke loket kasir &amp; apotek.
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-400 font-medium">
                    Klik tab &quot;Selesai&quot; pada panel antrean di sebelah kiri jika dokter ingin meninjau kembali rekam medis pasien yang telah selesai.
                  </p>
                </>
              ) : (
                // Standby: No patient selected yet
                <>
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-200 shadow-well">
                    <Stethoscope className="w-7 h-7" weight="duotone" />
                  </div>

                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Pilih Pasien di Antrean untuk Memulai Pemeriksaan
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">
                      Klik salah satu kartu pasien di antrean sebelah kiri atau tekan tombol &quot;Panggil &amp; Periksa&quot; untuk membuka workstation dokter, tanda vital, resep cepat, dan diagnosa ICD-10.
                    </p>
                  </div>

                  {visits.length === 0 && !isLoading && (
                    <div className="pt-2">
                      <Link href="/pendaftaran">
                        <button
                          type="button"
                          className="px-3.5 py-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 inline-flex items-center gap-1.5 tactile-btn min-h-[36px]"
                        >
                          <PlusCircle className="w-4 h-4" weight="bold" />
                          <span>Daftarkan Pasien di Loket</span>
                        </button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <CancelQueueModal
        isOpen={isCancelModalOpen}
        visit={visitToCancel}
        onClose={() => {
          setIsCancelModalOpen(false);
          setVisitToCancel(null);
        }}
        onConfirm={handleCancelQueue}
      />
    </div>
  );
}
