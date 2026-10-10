'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Wallet,
  CalendarBlank,
  ArrowClockwise,
  WarningCircle,
  ArrowDownLeft,
  ArrowUpRight,
} from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import type { CashFlow } from '@/types/database';
import { MONTH_NAMES_ID } from '@/constants/clinic';
import { CashFlowSummaryCards } from '@/components/buku-kas/CashFlowSummaryCards';
import { CashReconciliationCard } from '@/components/buku-kas/CashReconciliationCard';
import { CashFlowTable } from '@/components/buku-kas/CashFlowTable';
import { AddCashFlowModal } from '@/components/buku-kas/AddCashFlowModal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { cn, normalizeRupiah } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

export default function BukuKasPage() {
  const { role } = useAuth();
  // F-011 BR-002: Dokter/Admin records transactions but does not see the income,
  // expense, and balance summaries, which stay owner-only.
  const isDokterAdmin = role === 'dokter_admin';
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const todayStr = currentDate.toISOString().split('T')[0];

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [todayCashVisitsTotal, setTodayCashVisitsTotal] = useState(0);
  const [todayCashVisitsCount, setTodayCashVisitsCount] = useState(0);
  const [todayCashDepositsTotal, setTodayCashDepositsTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Masuk' | 'Keluar'>('Masuk');

  const fetchCashFlows = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      const startOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
      const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
      const endOfMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('cash_flows')
        .select('*')
        .gte('tanggal', startOfMonth)
        .lt('tanggal', endOfMonth)
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCashFlows((data as unknown as CashFlow[]) || []);
    } catch (err) {
      console.error('Error fetching cash flows:', err);
      const msg =
        err instanceof Error ? err.message : 'Gagal memuat mutasi buku kas dari database.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchReconciliation = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('biaya_periksa, pendapatan_lain')
        .eq('tanggal_periksa', todayStr)
        .eq('jenis_pembayaran', 'Tunai')
        .eq('status_pembayaran', 'Lunas');

      if (!visitsError && visitsData) {
        const totalVisitsCash = visitsData.reduce((acc, v) => {
          const biaya = normalizeRupiah(Number(v.biaya_periksa) || 0);
          const lain = normalizeRupiah(Number(v.pendapatan_lain) || 0);
          return acc + biaya + lain;
        }, 0);
        setTodayCashVisitsTotal(totalVisitsCash);
        setTodayCashVisitsCount(visitsData.length);
      }

      const { data: flowData, error: flowError } = await supabase
        .from('cash_flows')
        .select('nominal')
        .eq('tanggal', todayStr)
        .eq('kategori', 'Setor Tunai');

      if (!flowError && flowData) {
        const totalDeposits = flowData.reduce(
          (acc, f) => acc + normalizeRupiah(Number(f.nominal) || 0),
          0
        );
        setTodayCashDepositsTotal(totalDeposits);
      }
    } catch (err) {
      console.error('Error fetching cashier reconciliation:', err);
    }
  }, [todayStr]);

  useEffect(() => {
    fetchCashFlows();
  }, [fetchCashFlows]);

  useEffect(() => {
    fetchReconciliation();
  }, [fetchReconciliation]);

  const totalMasuk = cashFlows
    .filter((cf) => cf.jenis === 'Masuk')
    .reduce((acc, cf) => acc + (normalizeRupiah(Number(cf.nominal)) || 0), 0);

  const totalKeluar = cashFlows
    .filter((cf) => cf.jenis === 'Keluar')
    .reduce((acc, cf) => acc + (normalizeRupiah(Number(cf.nominal)) || 0), 0);

  const saldoBersih = totalMasuk - totalKeluar;

  const totalSetorTunai = cashFlows
    .filter((cf) => cf.kategori === 'Setor Tunai')
    .reduce((acc, cf) => acc + (normalizeRupiah(Number(cf.nominal)) || 0), 0);

  const handleOpenModal = (type: 'Masuk' | 'Keluar') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleCashFlowAdded = (newFlow: CashFlow) => {
    const [flowYear, flowMonth] = newFlow.tanggal.split('-').map(Number);
    if (flowYear === selectedYear && flowMonth === selectedMonth) {
      setCashFlows((prev) => [newFlow, ...prev]);
    }
    if (newFlow.tanggal === todayStr) {
      fetchReconciliation();
    }
  };

  const handleDeleteCashFlow = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('cash_flows').delete().eq('id', id);

      if (error) {
        toast.error(`Gagal menghapus transaksi: ${error.message}`);
        return;
      }

      setCashFlows((prev) => prev.filter((cf) => cf.id !== id));
      fetchReconciliation();
    } catch {
      toast.error('Terjadi kesalahan saat menghapus transaksi kas.');
    }
  };

  const handleManualRefresh = () => {
    fetchCashFlows();
    fetchReconciliation();
    toast.info('Memperbarui data mutasi kas...');
  };

  const selectedMonthName = MONTH_NAMES_ID[selectedMonth - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 text-white flex items-center justify-center shadow-btn-primary shrink-0">
            <Wallet weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Buku Kas Operasional &amp; Kapitasi BPJS
              </h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Arus Kas
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Pencatatan dana kapitasi BPJS, pembelian obat, operasional non-klinik, dan setor tunai
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleOpenModal('Masuk')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-emerald-700/80 tactile-btn transition focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
          >
            <ArrowDownLeft weight="bold" className="w-3.5 h-3.5 shrink-0" />
            <span>Kas Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenModal('Keluar')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-rose-700/80 tactile-btn transition focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
          >
            <ArrowUpRight weight="bold" className="w-3.5 h-3.5 shrink-0" />
            <span>Kas Keluar</span>
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-card-double flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CalendarBlank weight="duotone" className="w-4 h-4 text-teal-600" />
            Periode Laporan:
          </span>

          <div className="w-36">
            <Select
              size="sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              options={MONTH_NAMES_ID.map((name, idx) => ({ value: idx + 1, label: name }))}
            />
          </div>

          <div className="w-24">
            <Select
              size="sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              options={[2024, 2025, 2026, 2027].map((yr) => ({ value: yr, label: String(yr) }))}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedMonth(currentMonth);
              setSelectedYear(currentYear);
            }}
            disabled={selectedMonth === currentMonth && selectedYear === currentYear}
            className="px-3.5 py-1.5 min-h-[36px] rounded-xl text-xs font-bold bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-300 shadow-btn-secondary tactile-btn transition"
          >
            Bulan Ini
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="w-9 h-9 min-h-[36px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-btn-secondary tactile-btn flex items-center justify-center shrink-0 transition"
            title="Muat ulang mutasi kas"
            aria-label="Muat ulang mutasi kas"
          >
            <ArrowClockwise
              weight="bold"
              className={cn('w-4 h-4 text-slate-600', isLoading && 'animate-spin text-teal-600')}
            />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WarningCircle weight="duotone" className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCashFlows}
            className="text-xs min-h-[38px]"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {!isDokterAdmin && (
        <CashFlowSummaryCards
          totalMasuk={totalMasuk}
          totalKeluar={totalKeluar}
          saldoBersih={saldoBersih}
          totalSetorTunai={totalSetorTunai}
          monthName={`${selectedMonthName} ${selectedYear}`}
          isLoading={isLoading}
        />
      )}

      {!isDokterAdmin && (
        <CashReconciliationCard
          todayCashVisitsTotal={todayCashVisitsTotal}
          todayCashVisitsCount={todayCashVisitsCount}
          todayCashDepositsTotal={todayCashDepositsTotal}
          onOpenSetorTunai={() => handleOpenModal('Masuk')}
        />
      )}

      <CashFlowTable
        cashFlows={cashFlows}
        isLoading={isLoading}
        onDelete={handleDeleteCashFlow}
      />

      <AddCashFlowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialType={modalType}
        onSuccess={handleCashFlowAdded}
      />
    </div>
  );
}
