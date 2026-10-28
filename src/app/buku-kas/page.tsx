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
import {
  CashReconciliationCard,
  type DrawerReconciliationMetrics,
} from '@/components/buku-kas/CashReconciliationCard';
import { CashFlowTable } from '@/components/buku-kas/CashFlowTable';
import { AddCashFlowModal } from '@/components/buku-kas/AddCashFlowModal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  cn,
  formatDateIndo,
  formatLocalDateToYMD,
  isCashHandoverToOwnerOrBank,
  isDrawerCashExpense,
  isOperationalExpense,
  isSettledCashVisit,
  getErrorMessage,
} from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

interface CashVisitRow {
  tanggal_periksa: string;
  jenis_pasien: string;
  biaya_periksa: number;
  pendapatan_lain: number;
  jenis_pembayaran?: string | null;
  status_pembayaran?: string | null;
}

export default function BukuKasPage() {
  const { role } = useAuth();
  // F-011 BR-002: Dokter/Admin records transactions but does not see the income,
  // expense, and balance summaries, which stay owner-only.
  const isDokterAdmin = role === 'dokter_admin';
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const todayStr = formatLocalDateToYMD(currentDate);

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedReconciliationDate, setSelectedReconciliationDate] = useState<string>(todayStr);

  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [monthCashVisits, setMonthCashVisits] = useState<CashVisitRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      // Client request (Okt 2026): Dokter/Admin only needs today's mutations, so the
      // query itself is narrowed instead of fetching the month and hiding rows.
      const flowsQuery = isDokterAdmin
        ? supabase.from('cash_flows').select('*').eq('tanggal', todayStr)
        : supabase
            .from('cash_flows')
            .select('*')
            .gte('tanggal', startOfMonth)
            .lt('tanggal', endOfMonth);

      // Visit cash only feeds the owner-only summary and reconciliation cards.
      const visitsQuery = isDokterAdmin
        ? Promise.resolve({ data: [] as CashVisitRow[], error: null })
        : supabase
            .from('visits')
            .select(
              'tanggal_periksa, jenis_pasien, biaya_periksa, pendapatan_lain, jenis_pembayaran, status_pembayaran'
            )
            .gte('tanggal_periksa', startOfMonth)
            .lt('tanggal_periksa', endOfMonth);

      const [flowsRes, visitsRes] = await Promise.all([
        flowsQuery
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false }),
        visitsQuery,
      ]);

      if (flowsRes.error) throw flowsRes.error;
      if (visitsRes.error) throw visitsRes.error;

      const loadedFlows = (flowsRes.data as unknown as CashFlow[]) || [];
      const loadedVisits = ((visitsRes.data as unknown as CashVisitRow[]) || []).filter((v) => {
        if (!isSettledCashVisit(v)) return false;
        const biaya = v.jenis_pasien === 'BPJS' ? 0 : Number(v.biaya_periksa) || 0;
        const lain = Number(v.pendapatan_lain) || 0;
        return biaya + lain > 0;
      });

      setCashFlows(loadedFlows);
      setMonthCashVisits(loadedVisits);
    } catch (err) {
      console.error('Error fetching cash flows:', err);
      const msg =
        getErrorMessage(err, 'Gagal memuat mutasi buku kas dari database.');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear, isDokterAdmin, todayStr]);

  useEffect(() => {
    fetchCashFlows();
  }, [fetchCashFlows]);

  // Keep selectedReconciliationDate aligned with selectedMonth/selectedYear
  useEffect(() => {
    const prefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    if (!selectedReconciliationDate.startsWith(prefix)) {
      if (todayStr.startsWith(prefix)) {
        setSelectedReconciliationDate(todayStr);
      } else {
        setSelectedReconciliationDate(`${prefix}-01`);
      }
    }
  }, [selectedMonth, selectedYear, selectedReconciliationDate, todayStr]);

  const computeVisitCashAmount = (v: CashVisitRow) => {
    const biaya = v.jenis_pasien === 'BPJS' ? 0 : Number(v.biaya_periksa) || 0;
    const lain = Number(v.pendapatan_lain) || 0;
    return biaya + lain;
  };

  const monthCashVisitsTotal = monthCashVisits.reduce(
    (acc, v) => acc + computeVisitCashAmount(v),
    0
  );

  const otherMasukFlows = cashFlows.filter(
    (cf) => cf.jenis === 'Masuk' && !isCashHandoverToOwnerOrBank(cf)
  );
  const operationalExpenseFlows = cashFlows.filter((cf) => isOperationalExpense(cf));
  // Transfer-paid expenses still count toward Pengeluaran Operasional, but the drawer
  // reconciliation only subtracts what physically left the cashier drawer.
  const drawerExpenseFlows = operationalExpenseFlows.filter((cf) => isDrawerCashExpense(cf));
  const depositFlows = cashFlows.filter((cf) => isCashHandoverToOwnerOrBank(cf));

  const otherMasukTotal = otherMasukFlows.reduce(
    (acc, cf) => acc + (Number(cf.nominal) || 0),
    0
  );

  const totalMasuk = monthCashVisitsTotal + otherMasukTotal;

  const totalKeluar = operationalExpenseFlows.reduce(
    (acc, cf) => acc + (Number(cf.nominal) || 0),
    0
  );

  const saldoBersih = totalMasuk - totalKeluar;

  const totalSetorTunai = depositFlows.reduce(
    (acc, cf) => acc + (Number(cf.nominal) || 0),
    0
  );

  const monthlyMetrics: DrawerReconciliationMetrics = {
    cashVisitsTotal: monthCashVisitsTotal,
    cashVisitsCount: monthCashVisits.length,
    cashExpensesTotal: drawerExpenseFlows.reduce((acc, cf) => acc + (Number(cf.nominal) || 0), 0),
    cashExpensesCount: drawerExpenseFlows.length,
    cashDepositsTotal: totalSetorTunai,
    cashDepositsCount: depositFlows.length,
  };

  const dailyCashVisits = monthCashVisits.filter(
    (v) => v.tanggal_periksa === selectedReconciliationDate
  );
  const dailyExpenseFlows = drawerExpenseFlows.filter(
    (cf) => cf.tanggal === selectedReconciliationDate
  );
  const dailyDepositFlows = depositFlows.filter(
    (cf) => cf.tanggal === selectedReconciliationDate
  );

  const dailyMetrics: DrawerReconciliationMetrics = {
    cashVisitsTotal: dailyCashVisits.reduce((acc, v) => acc + computeVisitCashAmount(v), 0),
    cashVisitsCount: dailyCashVisits.length,
    cashExpensesTotal: dailyExpenseFlows.reduce(
      (acc, cf) => acc + (Number(cf.nominal) || 0),
      0
    ),
    cashExpensesCount: dailyExpenseFlows.length,
    cashDepositsTotal: dailyDepositFlows.reduce(
      (acc, cf) => acc + (Number(cf.nominal) || 0),
      0
    ),
    cashDepositsCount: dailyDepositFlows.length,
  };

  const handleOpenModal = (type: 'Masuk' | 'Keluar') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleCashFlowAdded = (newFlow: CashFlow) => {
    if (isDokterAdmin) {
      if (newFlow.tanggal === todayStr) {
        setCashFlows((prev) => [newFlow, ...prev]);
      } else {
        toast.info(
          `Transaksi tercatat untuk ${formatDateIndo(newFlow.tanggal)}, jadi tidak muncul di daftar hari ini.`
        );
      }
      return;
    }

    const [flowYear, flowMonth] = newFlow.tanggal.split('-').map(Number);
    if (flowYear === selectedYear && flowMonth === selectedMonth) {
      setCashFlows((prev) => [newFlow, ...prev]);
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
    } catch {
      toast.error('Terjadi kesalahan saat menghapus transaksi kas.');
    }
  };

  const handleManualRefresh = () => {
    fetchCashFlows();
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
        {isDokterAdmin ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CalendarBlank weight="duotone" className="w-4 h-4 text-teal-600" />
              Periode:
            </span>
            <span className="text-sm font-bold text-slate-900">
              Hari ini, {formatDateIndo(todayStr)}
            </span>
          </div>
        ) : (
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
        )}

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
          monthLabel={`${selectedMonthName} ${selectedYear}`}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          monthlyMetrics={monthlyMetrics}
          dailyMetrics={dailyMetrics}
          selectedDate={selectedReconciliationDate}
          onSelectedDateChange={setSelectedReconciliationDate}
          onOpenSetorTunai={() => handleOpenModal('Masuk')}
        />
      )}

      <CashFlowTable
        cashFlows={cashFlows}
        isLoading={isLoading}
        periodLabel={isDokterAdmin ? 'hari ini' : undefined}
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
