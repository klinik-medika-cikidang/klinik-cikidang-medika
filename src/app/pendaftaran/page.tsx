'use client';

import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UserPlus,
  ArrowClockwise,
  Plus,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Patient, TherapyPackage, Visit } from '@/types/database';
import { CashierKpiSummary } from '@/components/pendaftaran/CashierKpiSummary';
import { CashierPosPanel } from '@/components/pendaftaran/CashierPosPanel';
import { MasterPatientTable } from '@/components/pendaftaran/MasterPatientTable';
import { NewPatientModal } from '@/components/pendaftaran/NewPatientModal';
import { EditPatientModal } from '@/components/pendaftaran/EditPatientModal';
import { RegisterVisitModal } from '@/components/pendaftaran/RegisterVisitModal';
import { ReceiptModal } from '@/components/pendaftaran/ReceiptModal';
import { QueueTicketModal } from '@/components/pendaftaran/QueueTicketModal';
import { CancelQueueModal } from '@/components/rekam-medis/CancelQueueModal';
import { formatRupiah } from '@/lib/utils';

export default function PendaftaranKasirPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-xs text-slate-400">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mr-2" />
          Memuat loket pendaftaran...
        </div>
      }
    >
      <PendaftaranKasirContent />
    </Suspense>
  );
}

function PendaftaranKasirContent() {
  const { role } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(true);
  const [selectedPosVisit, setSelectedPosVisit] = useState<Visit | null>(null);
  const [isSubmittingPos, setIsSubmittingPos] = useState(false);
  const [tableResetSignal, setTableResetSignal] = useState(0);

  // Modals state
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [newPatientInitialQuery, setNewPatientInitialQuery] = useState('');
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [isRegisterVisitOpen, setIsRegisterVisitOpen] = useState(false);
  const [selectedPatientForVisit, setSelectedPatientForVisit] = useState<Patient | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [activeReceiptVisit, setActiveReceiptVisit] = useState<Visit | null>(null);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [activeTicketVisit, setActiveTicketVisit] = useState<Visit | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [visitToCancel, setVisitToCancel] = useState<Visit | null>(null);

  const posPanelRef = useRef<HTMLDivElement>(null);

  const [todayStats, setTodayStats] = useState({
    totalToday: 0,
    waitingDoctor: 0,
    waitingPayment: 0,
    todayRevenue: 0,
  });

  const isCancelled = (v: Visit) => v.status_pembayaran === 'Batal';

  const isSettled = (v: Visit) =>
    !isCancelled(v) && (v.status_pembayaran === 'Lunas' || v.status_pembayaran === 'Ditanggung BPJS');

  const isWaitingDoctor = (v: Visit) => {
    if (isCancelled(v)) return false;
    if (isSettled(v)) return false;
    if (v.status_pembayaran === 'Menunggu Kasir') return false;
    return v.status_pembayaran === 'Menunggu Dokter' || !v.kode_icd10;
  };

  const isWaitingPayment = (v: Visit) => {
    if (isCancelled(v)) return false;
    if (isSettled(v)) return false;
    if (isWaitingDoctor(v)) return false;
    return (
      v.status_pembayaran === 'Menunggu Kasir' ||
      v.status_pembayaran === 'Menunggu Pembayaran' ||
      Boolean(v.kode_icd10)
    );
  };

  const waitingVisits = useMemo(
    () => visits.filter(isWaitingPayment),
    [visits]
  );

  // Auto-sync selected visit for POS panel if none is selected or if current is settled
  useEffect(() => {
    if (waitingVisits.length > 0) {
      if (!selectedPosVisit || !waitingVisits.some((v) => v.id === selectedPosVisit.id)) {
        setSelectedPosVisit(waitingVisits[0]);
      }
    } else {
      setSelectedPosVisit(null);
    }
  }, [waitingVisits, selectedPosVisit]);

  const fetchVisits = useCallback(async () => {
    setIsLoadingVisits(true);

    try {
      const supabase = createClient();
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

      // 1. Fetch Today's Visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select(`
          *,
          pasien:patients(*),
          dokter:doctors(*)
        `)
        .eq('tanggal_periksa', todayStr)
        .order('nomor_antrian', { ascending: false });

      if (visitsError) throw visitsError;
      const visitList = (visitsData as unknown as Visit[]) || [];
      setVisits(visitList);

      // Compute live KPI metrics
      const total = visitList.length;
      const waitingDoc = visitList.filter(isWaitingDoctor).length;
      const waitingPay = visitList.filter(isWaitingPayment).length;
      const rev = visitList
        .filter((v) => v.status_pembayaran === 'Lunas')
        .reduce((sum, v) => {
          const periksa = v.jenis_pasien === 'BPJS' ? 0 : Number(v.biaya_periksa || 0);
          const lain = Number(v.pendapatan_lain || 0);
          return sum + periksa + lain;
        }, 0);

      setTodayStats({
        totalToday: total,
        waitingDoctor: waitingDoc,
        waitingPayment: waitingPay,
        todayRevenue: rev,
      });
    } catch (err) {
      console.error('Error fetching visits data:', err);
      toast.error('Gagal memuat data antrean kunjungan.');
    } finally {
      setIsLoadingVisits(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Fast actions arrive as query params from the command menu and quick profile. Reading them
  // through useSearchParams lets the effect fire when only the query changes, and the params
  // are then cleared so clicking the same action again is handled a second time.
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');
  const nameParam = searchParams.get('name') || searchParams.get('nama');
  const patientIdParam = searchParams.get('pasien_id');

  useEffect(() => {
    if (actionParam === 'new') {
      if (nameParam) setNewPatientInitialQuery(nameParam);
      setIsNewPatientOpen(true);
      router.replace('/pendaftaran');
      return;
    }

    if (actionParam !== 'register' || !patientIdParam) return;

    const fetchPatientForVisit = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientIdParam)
          .maybeSingle();

        if (data) {
          setSelectedPatientForVisit(data as Patient);
          setIsRegisterVisitOpen(true);
        }
      } catch (err) {
        console.error('Error fetching patient from URL param:', err);
      } finally {
        router.replace('/pendaftaran');
      }
    };
    fetchPatientForVisit();
  }, [actionParam, nameParam, patientIdParam, router]);

  // Handle settlement from CashierPosPanel
  const handleSettlePayment = async (
    visit: Visit,
    biayaPeriksa: number,
    pendapatanLain: number,
    keteranganPendapatan: string,
    uangDiterima: number,
    jenisPembayaran: 'Tunai' | 'TF',
    paymentState: 'Lunas' | 'Piutang' | 'Belum Bayar'
  ) => {
    setIsSubmittingPos(true);

    try {
      const supabase = createClient();
      const finalBiayaPeriksa = visit.jenis_pasien === 'BPJS' ? 0 : Number(biayaPeriksa || 0);
      const finalPendapatanLain = Number(pendapatanLain || 0);
      const totalTagihan = finalBiayaPeriksa + finalPendapatanLain;

      const finalStatus =
        visit.jenis_pasien === 'BPJS' && totalTagihan === 0 ? 'Ditanggung BPJS' : paymentState;
      const remainingPiutang = Math.max(0, totalTagihan - uangDiterima);

      const { data, error } = await supabase
        .from('visits')
        .update({
          biaya_periksa: finalBiayaPeriksa,
          pendapatan_lain: finalPendapatanLain,
          keterangan_pendapatan: keteranganPendapatan.trim() || null,
          jenis_pembayaran: jenisPembayaran,
          status_pembayaran: finalStatus,
          payment_state: finalStatus,
          piutang_nominal: finalStatus === 'Piutang' ? remainingPiutang : 0,
          piutang_note: finalStatus === 'Piutang' ? `Sisa piutang ${formatRupiah(remainingPiutang)}` : null,
        })
        .eq('id', visit.id)
        .select(`
          *,
          pasien:patients(*),
          dokter:doctors(*)
        `)
        .single();

      if (error) throw error;

      toast.success('Transaksi kasir berhasil diselesaikan!', {
        description: `Pasien ${visit.pasien?.nama || ''} • Total: ${formatRupiah(totalTagihan)} (${jenisPembayaran})`,
      });

      // Refresh data
      await fetchVisits();

      // Open receipt modal for instant printing
      if (data) {
        setActiveReceiptVisit(data as unknown as Visit);
        setIsReceiptOpen(true);
      }
    } catch (err) {
      console.error('Error settling POS payment:', err);
      toast.error(err instanceof Error ? err.message : 'Gagal menyelesaikan pembayaran kasir.');
      throw err;
    } finally {
      setIsSubmittingPos(false);
    }
  };

  // Applies a therapy package to the selected visit: additive columns only, so the
  // receipt and cash book keep one source of truth. It never touches biaya_periksa.
  const handleApplyPackage = async (visit: Visit, pkg: TherapyPackage) => {
    const supabase = createClient();
    const items = pkg.items || [];
    const obats = items.filter((item) => item.jenis_item === 'OBAT').map((item) => item.nama_item);
    const tindakans = items.filter((item) => item.jenis_item === 'TINDAKAN').map((item) => item.nama_item);
    const lainnya = items.filter((item) => item.jenis_item === 'LAIN').map((item) => item.nama_item);

    const appendLines = (existing: string | null | undefined, lines: string[]) => {
      const parts = [(existing || '').trim(), ...lines.map((line) => line.trim())].filter(Boolean);
      return parts.length ? parts.join('\n') : null;
    };
    const appendComma = (existing: string | null | undefined, lines: string[]) => {
      const parts = [(existing || '').trim(), ...lines.map((line) => line.trim())].filter(Boolean);
      return parts.length ? parts.join(', ') : null;
    };

    const nextTerapi = appendLines(visit.terapi_obat, obats);
    const nextTindakan = appendComma(visit.tindakan, tindakans);
    const nextKeteranganTindakan = appendComma(visit.keterangan_tindakan, [...tindakans, ...lainnya]);
    const nextPendapatanLain = Number(visit.pendapatan_lain || 0) + Number(pkg.harga_total || 0);
    const nextKeteranganPendapatan = appendComma(visit.keterangan_pendapatan, [pkg.nama]);

    const { data, error } = await supabase
      .from('visits')
      .update({
        terapi_obat: nextTerapi,
        tindakan: nextTindakan,
        keterangan_tindakan: nextKeteranganTindakan,
        pendapatan_lain: nextPendapatanLain,
        keterangan_pendapatan: nextKeteranganPendapatan,
      })
      .eq('id', visit.id)
      .select(`
        *,
        pasien:patients(*),
        dokter:doctors(*)
      `)
      .single();

    if (error) throw error;

    const { error: auditError } = await supabase.from('visit_therapy_packages').insert({
      visit_id: visit.id,
      package_id: pkg.id,
      nama_paket_snapshot: pkg.nama,
      harga_total_snapshot: pkg.harga_total,
      items_snapshot: items,
      applied_by_role: role,
    });

    if (auditError) throw auditError;

    toast.success('Paket terapi diterapkan.', {
      description: `${pkg.nama} ditambahkan ke tagihan kunjungan.`,
    });

    if (data) setSelectedPosVisit(data as unknown as Visit);
    await fetchVisits();
  };

  // Actions from table
  const handleSelectForPayment = (visit: Visit) => {
    setSelectedPosVisit(visit);
    posPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePrintReceipt = (visit: Visit) => {
    setActiveReceiptVisit(visit);
    setIsReceiptOpen(true);
  };

  const handlePrintTicket = (visit: Visit) => {
    setActiveTicketVisit(visit);
    setIsTicketOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setPatientToEdit(patient);
    setIsEditPatientOpen(true);
  };

  const handleRegisterVisit = (patient: Patient) => {
    setSelectedPatientForVisit(patient);
    setIsRegisterVisitOpen(true);
  };

  const handlePatientCreated = (newPatient: Patient) => {
    fetchVisits();
    setSelectedPatientForVisit(newPatient);
    setIsRegisterVisitOpen(true);
  };

  const handlePatientUpdated = () => {
    fetchVisits();
    toast.success('Data pasien berhasil diperbarui.');
  };

  const handleVisitRegistered = (newVisit: Visit) => {
    fetchVisits();
    setTableResetSignal((value) => value + 1);
    setActiveTicketVisit(newVisit);
    setIsTicketOpen(true);
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
      if (selectedPosVisit?.id === visitId) {
        setSelectedPosVisit(null);
      }
      return next;
    });

    toast.success('Antrean kunjungan berhasil dibatalkan.');
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
    setVisits((prev) => prev.map((v) => (v.id === visit.id ? updated : v)));

    toast.success('Antrean berhasil dipulihkan ke status Menunggu Dokter.');
  };

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6 sm:space-y-7 min-w-0 w-full pb-10">
      {/* ============================================================== */}
      {/* 1. TOP HEADER & PRIMARY ACTION CTA                             */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Loket Pendaftaran & Kasir
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Live Operasional
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Pelayanan loket antrean, registrasi pasien baru, pembayaran kasir, dan master rekam medis
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchVisits}
            disabled={isLoadingVisits}
            className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/90 shadow-btn-secondary tactile-btn transition disabled:opacity-50 flex items-center justify-center min-h-[40px] min-w-[40px] sm:min-h-[38px] sm:min-w-[38px]"
            title="Perbarui data antrean"
            aria-label="Perbarui data antrean"
          >
            <ArrowClockwise
              className={`w-4 h-4 ${isLoadingVisits ? 'animate-spin text-teal-600' : ''}`}
              weight="bold"
            />
          </button>

          <button
            type="button"
            onClick={() => setIsNewPatientOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-3.5 py-2 min-h-[40px] sm:min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            <Plus className="w-3.5 h-3.5" weight="bold" />
            <span>Pasien Baru</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CASHIER KPI SUMMARY STRIP (4 TACTILE CARDS)                 */}
      {/* ============================================================== */}
      <CashierKpiSummary
        totalToday={todayStats.totalToday}
        waitingDoctor={todayStats.waitingDoctor}
        waitingPayment={todayStats.waitingPayment}
        todayRevenue={todayStats.todayRevenue}
        isLoading={isLoadingVisits}
      />

      {/* ============================================================== */}
      {/* 3. CASHIER POS WORKSTATION (SPLIT VIEW COMPONENT)              */}
      {/* ============================================================== */}
      <div ref={posPanelRef}>
        <CashierPosPanel
          waitingVisits={waitingVisits}
          selectedVisit={selectedPosVisit}
          onSelectVisit={setSelectedPosVisit}
          onSettlePayment={handleSettlePayment}
          onApplyPackage={handleApplyPackage}
          isSubmitting={isSubmittingPos}
        />
      </div>

      {/* ============================================================== */}
      {/* 4. MASTER PATIENT & VISITS HIGH-DENSITY TABLE                  */}
      {/* ============================================================== */}
      <MasterPatientTable
        visits={visits}
        isLoadingVisits={isLoadingVisits}
        resetSignal={tableResetSignal}
        onSelectForPayment={handleSelectForPayment}
        onPrintReceipt={handlePrintReceipt}
        onPrintTicket={handlePrintTicket}
        onEditPatient={handleEditPatient}
        onRegisterVisit={handleRegisterVisit}
        onCancelVisit={handleOpenCancelModal}
        onRestoreVisit={handleRestoreQueue}
      />

      {/* ============================================================== */}
      {/* 5. MODALS & OVERLAYS                                           */}
      {/* ============================================================== */}
      <NewPatientModal
        isOpen={isNewPatientOpen}
        onClose={() => {
          setIsNewPatientOpen(false);
          setNewPatientInitialQuery('');
        }}
        onPatientCreated={handlePatientCreated}
        initialQuery={newPatientInitialQuery}
      />

      <EditPatientModal
        isOpen={isEditPatientOpen}
        onClose={() => {
          setIsEditPatientOpen(false);
          setPatientToEdit(null);
        }}
        patient={patientToEdit}
        onPatientUpdated={handlePatientUpdated}
      />

      <RegisterVisitModal
        isOpen={isRegisterVisitOpen}
        onClose={() => {
          setIsRegisterVisitOpen(false);
          setSelectedPatientForVisit(null);
        }}
        patient={selectedPatientForVisit}
        onVisitRegistered={handleVisitRegistered}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setActiveReceiptVisit(null);
        }}
        visit={activeReceiptVisit}
      />

      <QueueTicketModal
        isOpen={isTicketOpen}
        onClose={() => {
          setIsTicketOpen(false);
          setActiveTicketVisit(null);
        }}
        visit={activeTicketVisit}
      />

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
