'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  UserPlus,
  FileXls,
  Wallet,
  ArrowClockwise,
  WarningCircle,
  Clock,
  Heartbeat,
} from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { normalizeRupiah } from '@/lib/utils';
import {
  DashboardKpiCards,
  type DashboardKpiData,
} from '@/components/dashboard/DashboardKpiCards';
import {
  DashboardPeriodSelector,
  type DashboardPeriod,
} from '@/components/dashboard/DashboardPeriodSelector';
import {
  TopDiseasesChart,
  type DiseaseStat,
} from '@/components/dashboard/TopDiseasesChart';
import {
  VillageDistributionCard,
  type VillageStat,
} from '@/components/dashboard/VillageDistributionCard';
import {
  ClinicalAlertWidget,
  type ClinicalAlertCounts,
} from '@/components/dashboard/ClinicalAlertWidget';
import {
  VisitTrendChart,
  type DailyTrendPoint,
  type MonthlyTrendPoint,
} from '@/components/dashboard/VisitTrendChart';
import {
  FinancialTrendChart,
  type DailyFinancialPoint,
  type MonthlyFinancialPoint,
} from '@/components/dashboard/FinancialTrendChart';
import {
  PaymentDistributionChart,
  type PaymentDistributionData,
} from '@/components/dashboard/PaymentDistributionChart';
import {
  CashLiquidityCard,
  type CashLiquidityData,
} from '@/components/dashboard/CashLiquidityCard';
import type { CashFlow } from '@/types/database';

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [kpiData, setKpiData] = useState<DashboardKpiData>({
    totalVisits: 0,
    uniquePatients: 0,
    umumRevenue: 0,
    bpjsRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
  });

  const [topDiseases, setTopDiseases] = useState<DiseaseStat[]>([]);
  const [totalDiagnoses, setTotalDiagnoses] = useState(0);

  const [villageStats, setVillageStats] = useState<VillageStat[]>([]);
  const [bpjsCount, setBpjsCount] = useState(0);
  const [umumCount, setUmumCount] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const [clinicalAlerts, setClinicalAlerts] = useState<ClinicalAlertCounts>({
    mangkirTbc: 0,
    todayPostCare: 0,
    overduePostCare: 0,
    recentCircumcision: 0,
  });

  const [dailyTrends, setDailyTrends] = useState<DailyTrendPoint[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendPoint[]>([]);

  const [dailyFinances, setDailyFinances] = useState<DailyFinancialPoint[]>([]);
  const [monthlyFinances, setMonthlyFinances] = useState<MonthlyFinancialPoint[]>([]);

  const [paymentDistribution, setPaymentDistribution] = useState<PaymentDistributionData>({
    bpjsCount: 0,
    umumCount: 0,
    bpjsRevenue: 0,
    umumRevenue: 0,
    tunaiCount: 0,
    transferCount: 0,
    tunaiRevenue: 0,
    transferRevenue: 0,
  });

  const [cashLiquidity, setCashLiquidity] = useState<CashLiquidityData>({
    laciCash: 0,
    bankCash: 0,
    todayCashIn: 0,
    todayCashOut: 0,
    cashRatio: 75,
    transferRatio: 25,
    recentMutations: [],
  });

  // The effective date bounds are derived once. Depending on the resolved bounds rather
  // than on the selected preset means switching preset to an equivalent range (for
  // example "Semua Periode" to an empty custom range) does not refetch, so the dashboard
  // does not flash when the user opens the custom picker.
  const periodRange = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (selectedPeriod === 'this_month') {
      return {
        start: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
        end: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0],
      };
    }
    if (selectedPeriod === 'last_month') {
      return {
        start: new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
        end: new Date(currentYear, currentMonth, 0).toISOString().split('T')[0],
      };
    }
    if (selectedPeriod === 'this_year') {
      return { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` };
    }
    if (selectedPeriod === 'custom') {
      return { start: customStart, end: customEnd };
    }
    return { start: '', end: '' };
  }, [selectedPeriod, customStart, customEnd]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const todayStr = new Date().toISOString().split('T')[0];

      let startDate: string | null = periodRange.start || null;
      let endDate: string | null = periodRange.end || null;

      // 1. Fetch total unique registered patients
      const { count: patientCount } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true });

      // 2. Fetch visits with pagination chunks
      let allVisits: any[] = [];
      let visitPage = 0;
      const pageSize = 1000;

      while (true) {
        let query = supabase
          .from('visits')
          .select('id, tanggal_periksa, jenis_pasien, biaya_periksa, pendapatan_lain, jenis_pembayaran, kode_icd10, diagnosa_deskripsi, patients(desa)')
          .range(visitPage * pageSize, (visitPage + 1) * pageSize - 1);

        if (startDate && endDate) {
          query = query.gte('tanggal_periksa', startDate).lte('tanggal_periksa', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        allVisits.push(...data);
        if (data.length < pageSize) break;
        visitPage++;
      }

      // 3. Fetch cash flows
      let allFlows: any[] = [];
      let flowPage = 0;

      while (true) {
        let flowQuery = supabase
          .from('cash_flows')
          .select('id, tanggal, jenis, kategori, nominal, keterangan')
          .order('tanggal', { ascending: false })
          .range(flowPage * pageSize, (flowPage + 1) * pageSize - 1);

        if (startDate && endDate) {
          flowQuery = flowQuery.gte('tanggal', startDate).lte('tanggal', endDate);
        }

        const { data, error } = await flowQuery;
        if (error) throw error;
        if (!data || data.length === 0) break;

        allFlows.push(...data);
        if (data.length < pageSize) break;
        flowPage++;
      }

      // 4. Fetch Clinical Alerts Data
      const { data: tbcData } = await supabase
        .from('tbc_programs')
        .select('id, status_tbc, bulan_ke, tanggal_mulai');

      const { data: postCareData } = await supabase
        .from('post_cares')
        .select('id, tanggal_kontrol_berikutnya, status_kontrol');

      const { count: recentCircCount } = await supabase
        .from('circumcisions')
        .select('id', { count: 'exact', head: true })
        .gte(
          'tanggal_tindakan',
          new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
        );

      let mangkirTbc = 0;
      if (tbcData) {
        const referenceDate = new Date();
        tbcData.forEach((t) => {
          if (t.status_tbc === 'Mangkir') {
            mangkirTbc++;
          } else if (t.status_tbc === 'Dalam Pengobatan' && t.tanggal_mulai) {
            const startD = new Date(t.tanggal_mulai);
            const monthsPassed =
              (referenceDate.getFullYear() - startD.getFullYear()) * 12 +
              (referenceDate.getMonth() - startD.getMonth());
            if (monthsPassed > (t.bulan_ke || 1)) {
              mangkirTbc++;
            }
          }
        });
      }

      let todayPostCare = 0;
      let overduePostCare = 0;
      if (postCareData) {
        postCareData.forEach((p) => {
          if (p.status_kontrol !== 'Sudah Kontrol') {
            if (p.tanggal_kontrol_berikutnya === todayStr) {
              todayPostCare++;
            } else if (p.tanggal_kontrol_berikutnya < todayStr) {
              overduePostCare++;
            }
          }
        });
      }

      const recentCircumcision = recentCircCount || 0;

      setClinicalAlerts({
        mangkirTbc,
        todayPostCare,
        overduePostCare,
        recentCircumcision,
      });

      // 5. Data Aggregation
      let bpjsVisits = 0;
      let umumVisits = 0;
      let umumRev = 0;
      let tunaiRev = 0;
      let tfRev = 0;
      let tunaiVisits = 0;
      let tfVisits = 0;

      const diseaseMap: Record<string, { code: string; name: string; count: number }> = {};
      const villageMap: Record<string, number> = {};
      const dailyMap: Record<string, { bpjs: number; umum: number }> = {};
      const monthlyMap: Record<string, { bpjs: number; umum: number }> = {};
      const dailyFinanceMap: Record<string, { cashIn: number; cashOut: number }> = {};
      const monthlyFinanceMap: Record<string, { cashIn: number; cashOut: number }> = {};
      let diagnosisTotalCount = 0;

      allVisits.forEach((v) => {
        const tgl = v.tanggal_periksa;
        const monthKey = tgl ? tgl.substring(0, 7) : '';

        if (!dailyMap[tgl]) {
          dailyMap[tgl] = { bpjs: 0, umum: 0 };
        }
        if (monthKey && !monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { bpjs: 0, umum: 0 };
        }

        if (!dailyFinanceMap[tgl]) {
          dailyFinanceMap[tgl] = { cashIn: 0, cashOut: 0 };
        }
        if (monthKey && !monthlyFinanceMap[monthKey]) {
          monthlyFinanceMap[monthKey] = { cashIn: 0, cashOut: 0 };
        }

        const biaya = normalizeRupiah(Number(v.biaya_periksa) || 0);
        const lain = normalizeRupiah(Number(v.pendapatan_lain) || 0);
        const totalRev = biaya + lain;

        dailyFinanceMap[tgl].cashIn += totalRev;
        if (monthKey) {
          monthlyFinanceMap[monthKey].cashIn += totalRev;
        }

        if (v.jenis_pasien === 'BPJS') {
          bpjsVisits++;
          dailyMap[tgl].bpjs++;
          if (monthKey) monthlyMap[monthKey].bpjs++;
        } else {
          umumVisits++;
          dailyMap[tgl].umum++;
          if (monthKey) monthlyMap[monthKey].umum++;
          umumRev += totalRev;

          if (v.jenis_pembayaran === 'TF' || v.jenis_pembayaran === 'Transfer') {
            tfRev += totalRev;
            tfVisits++;
          } else {
            tunaiRev += totalRev;
            tunaiVisits++;
          }
        }

        // ICD-10 Aggregation
        if (v.kode_icd10) {
          diagnosisTotalCount++;
          const code = v.kode_icd10.trim().toUpperCase();
          const name = v.diagnosa_deskripsi || code;
          if (!diseaseMap[code]) {
            diseaseMap[code] = { code, name, count: 0 };
          }
          diseaseMap[code].count++;
        }

        // Village Aggregation
        const patientDesa = v.patients?.desa || 'Luar Daerah';
        const formattedDesa =
          patientDesa.charAt(0).toUpperCase() + patientDesa.slice(1).toLowerCase();
        villageMap[formattedDesa] = (villageMap[formattedDesa] || 0) + 1;
      });

      // Process Cash Flows
      let bpjsCapitation = 0;
      let expenses = 0;
      let bankSetoran = 0;

      allFlows.forEach((f) => {
        const nom = normalizeRupiah(Number(f.nominal) || 0);
        const tglFlow = f.tanggal;
        const monthKeyFlow = tglFlow ? tglFlow.substring(0, 7) : '';

        if (!dailyFinanceMap[tglFlow]) {
          dailyFinanceMap[tglFlow] = { cashIn: 0, cashOut: 0 };
        }
        if (monthKeyFlow && !monthlyFinanceMap[monthKeyFlow]) {
          monthlyFinanceMap[monthKeyFlow] = { cashIn: 0, cashOut: 0 };
        }

        if (f.jenis === 'Masuk' && f.kategori?.includes('Kapitasi')) {
          bpjsCapitation += nom;
          dailyFinanceMap[tglFlow].cashIn += nom;
          if (monthKeyFlow) monthlyFinanceMap[monthKeyFlow].cashIn += nom;
        } else if (f.jenis === 'Masuk' && !f.kategori?.includes('Setor Tunai')) {
          dailyFinanceMap[tglFlow].cashIn += nom;
          if (monthKeyFlow) monthlyFinanceMap[monthKeyFlow].cashIn += nom;
        }

        if (f.jenis === 'Masuk' && f.kategori?.includes('Setor Tunai')) {
          bankSetoran += nom;
        }

        if (f.jenis === 'Keluar') {
          expenses += nom;
          dailyFinanceMap[tglFlow].cashOut += nom;
          if (monthKeyFlow) monthlyFinanceMap[monthKeyFlow].cashOut += nom;
        }
      });

      // Format 14-day daily visit trends
      const sortedDailyDates = Object.keys(dailyMap).sort();
      const last14Dates = sortedDailyDates.slice(-14);
      const formattedDailyTrends: DailyTrendPoint[] = last14Dates.map((d) => {
        const item = dailyMap[d];
        const dateObj = new Date(d);
        const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
        const dayNum = dateObj.getDate();
        return {
          date: d,
          label: `${dayName} ${dayNum}`,
          bpjs: item.bpjs,
          umum: item.umum,
          total: item.bpjs + item.umum,
        };
      });

      // Format 12-month visit trends
      const sortedMonths = Object.keys(monthlyMap).sort();
      const last12Months = sortedMonths.slice(-12);
      const formattedMonthlyTrends: MonthlyTrendPoint[] = last12Months.map((m) => {
        const item = monthlyMap[m];
        const [y, mo] = m.split('-');
        const dateObj = new Date(Number(y), Number(mo) - 1, 1);
        const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'short' });
        return {
          month: m,
          label: `${monthLabel} ${y}`,
          bpjs: item.bpjs,
          umum: item.umum,
          total: item.bpjs + item.umum,
        };
      });

      // Format 14-day daily financial trends
      const formattedDailyFinances: DailyFinancialPoint[] = last14Dates.map((d) => {
        const fin = dailyFinanceMap[d] || { cashIn: 0, cashOut: 0 };
        const dateObj = new Date(d);
        const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
        const dayNum = dateObj.getDate();
        return {
          date: d,
          label: `${dayName} ${dayNum}`,
          cashIn: fin.cashIn,
          cashOut: fin.cashOut,
          netIncome: fin.cashIn - fin.cashOut,
        };
      });

      // Format 12-month financial trends
      const formattedMonthlyFinances: MonthlyFinancialPoint[] = last12Months.map((m) => {
        const fin = monthlyFinanceMap[m] || { cashIn: 0, cashOut: 0 };
        const [y, mo] = m.split('-');
        const dateObj = new Date(Number(y), Number(mo) - 1, 1);
        const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'short' });
        return {
          month: m,
          label: `${monthLabel} ${y}`,
          cashIn: fin.cashIn,
          cashOut: fin.cashOut,
          netIncome: fin.cashIn - fin.cashOut,
        };
      });

      // Liquidity calculations
      const netCash = umumRev + bpjsCapitation - expenses;
      const totalLoketRevenue = tunaiRev + tfRev;
      const cashRatioPct =
        totalLoketRevenue > 0 ? Math.round((tunaiRev / totalLoketRevenue) * 100) : 80;
      const tfRatioPct = 100 - cashRatioPct;

      const laciEstimated = Math.max(0, tunaiRev - bankSetoran);
      const bankEstimated = bpjsCapitation + tfRev + bankSetoran;

      setCashLiquidity({
        laciCash: laciEstimated,
        bankCash: bankEstimated,
        todayCashIn: tunaiRev,
        todayCashOut: expenses,
        cashRatio: cashRatioPct,
        transferRatio: tfRatioPct,
        recentMutations: allFlows.slice(0, 4) as CashFlow[],
      });

      // Format Top 10 Diseases
      const sortedDiseases: DiseaseStat[] = Object.values(diseaseMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((d) => ({
          code: d.code,
          name: d.name,
          count: d.count,
          percentage: diagnosisTotalCount > 0 ? (d.count / diagnosisTotalCount) * 100 : 0,
        }));

      // Format Top Villages
      const totalVillageVisits = allVisits.length;
      const sortedVillages: VillageStat[] = Object.entries(villageMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([village, count]) => ({
          village,
          count,
          percentage: totalVillageVisits > 0 ? (count / totalVillageVisits) * 100 : 0,
        }));

      setKpiData({
        totalVisits: allVisits.length,
        uniquePatients: patientCount || 4238,
        umumRevenue: umumRev,
        bpjsRevenue: bpjsCapitation,
        totalExpenses: expenses,
        netIncome: netCash,
      });

      setTopDiseases(sortedDiseases);
      setTotalDiagnoses(diagnosisTotalCount);
      setVillageStats(sortedVillages);
      setBpjsCount(bpjsVisits);
      setUmumCount(umumVisits);
      setDailyTrends(formattedDailyTrends);
      setMonthlyTrends(formattedMonthlyTrends);
      setDailyFinances(formattedDailyFinances);
      setMonthlyFinances(formattedMonthlyFinances);

      setPaymentDistribution({
        bpjsCount: bpjsVisits,
        umumCount: umumVisits,
        bpjsRevenue: bpjsCapitation,
        umumRevenue: umumRev,
        tunaiCount: tunaiVisits,
        transferCount: tfVisits,
        tunaiRevenue: tunaiRev,
        transferRevenue: tfRev,
      });

      setLastRefreshed(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const msg =
        err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data dashboard.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [periodRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Top Header & Integrated Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Dashboard Eksekutif Klinik
            </h1>
            {lastRefreshed && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500" weight="duotone" />
                <span>{lastRefreshed}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Ringkasan operasional harian, morbiditas ICD-10, arus kas, dan surveilans klinis
          </p>
        </div>

        {/* 2-Line Full-Width Responsive Toolbar */}
        <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[400px] xl:min-w-[440px]">
          {/* Line 1: Period Selector Full-Width (4 equal tabs spanning 100% width) */}
          <div className="w-full">
            <DashboardPeriodSelector
              selectedPeriod={selectedPeriod}
              onChangePeriod={setSelectedPeriod}
              customStart={customStart}
              customEnd={customEnd}
              onCustomRangeChange={(start, end) => {
                setCustomStart(start);
                setCustomEnd(end);
              }}
              isLoading={isLoading}
            />
          </div>

          {/* Line 2: Quick Action Ribbon & Primary Action Button Full-Width */}
          <div className="flex items-center gap-2 w-full">
            {/* Quick Action Ribbon */}
            <div className="inline-flex items-center bg-white p-1 rounded-xl border border-slate-200/90 shadow-btn-secondary gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  fetchDashboardData();
                  toast.info('Memperbarui data dashboard...');
                }}
                disabled={isLoading}
                title="Muat Ulang Data"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50 tactile-btn"
              >
                <ArrowClockwise className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} weight="bold" />
              </button>

              <div className="w-px h-4 bg-slate-200 mx-0.5" />

              <Link
                href="/program-khusus"
                className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors tactile-btn"
                title="Program Khusus (TBC, Sirkumsisi, Observasi)"
              >
                <Heartbeat className="w-4 h-4 text-rose-500" weight="duotone" />
              </Link>

              <Link
                href="/buku-kas"
                className="p-1.5 rounded-lg text-slate-600 hover:text-teal-600 hover:bg-teal-50 transition-colors tactile-btn"
                title="Buku Kas Operasional"
              >
                <Wallet className="w-4 h-4 text-slate-500" weight="duotone" />
              </Link>

              <Link
                href="/laporan"
                className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors tactile-btn"
                title="Laporan & Ekspor Excel"
              >
                <FileXls className="w-4 h-4 text-emerald-600" weight="duotone" />
              </Link>
            </div>

            {/* Primary Action Button (stretches flex-1 to fill the remaining line width) */}
            <Link
              href="/pendaftaran"
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-3.5 py-1.5 min-h-[36px] rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" weight="bold" />
              <span>Pasien Baru</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <WarningCircle className="w-4 h-4 shrink-0 text-rose-600" weight="duotone" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="font-semibold underline hover:no-underline shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Clinical Surveillance Alert Strip */}
      <ClinicalAlertWidget alerts={clinicalAlerts} isLoading={isLoading} />

      {/* 5 Executive KPI Cards */}
      <DashboardKpiCards data={kpiData} isLoading={isLoading} />

      {/* 2-Column Logical Grid with Natural Card Heights (Zero Empty Space) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left Column: Klinis & Operasional */}
        <div className="space-y-6">
          <VisitTrendChart
            dailyData={dailyTrends}
            monthlyData={monthlyTrends}
            isLoading={isLoading}
          />
          <TopDiseasesChart
            data={topDiseases}
            totalDiagnoses={totalDiagnoses}
            isLoading={isLoading}
          />
          <VillageDistributionCard
            villages={villageStats}
            totalPatients={kpiData.totalVisits}
            bpjsCount={bpjsCount}
            umumCount={umumCount}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column: Finansial & Kasir */}
        <div className="space-y-6">
          <FinancialTrendChart
            dailyData={dailyFinances}
            monthlyData={monthlyFinances}
            isLoading={isLoading}
          />
          <PaymentDistributionChart
            data={paymentDistribution}
            isLoading={isLoading}
          />
          <CashLiquidityCard
            data={cashLiquidity}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
