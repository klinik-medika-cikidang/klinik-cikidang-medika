'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  DownloadSimple,
  Stack,
  WarningCircle,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { normalizeRupiah } from '@/lib/utils';
import {
  exportVisitsToExcel,
  exportCashFlowsToExcel,
  exportMorbidityToExcel,
  exportFullClinicWorkbook,
  type VisitExportRow,
  type CashFlowExportRow,
  type MorbidityExportRow,
} from '@/lib/excel';
import {
  ReportTabs,
  type ReportTabType,
} from '@/components/laporan/ReportTabs';
import { ReportFilterBar } from '@/components/laporan/ReportFilterBar';
import { ReportPreviewTable } from '@/components/laporan/ReportPreviewTable';
import { ReportKpis } from '@/components/laporan/ReportKpis';
import { ReferralCommissionPanel } from '@/components/laporan/ReferralCommissionPanel';
import { BidanReferralPanel } from '@/components/laporan/BidanReferralPanel';
import { PuskesmasReportPanel } from '@/components/laporan/PuskesmasReportPanel';

export default function LaporanPage() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const defaultStartDate = new Date(currentYear, currentMonth, 1)
    .toISOString()
    .split('T')[0];
  const defaultEndDate = new Date(currentYear, currentMonth + 1, 0)
    .toISOString()
    .split('T')[0];
  const { role } = useAuth();
  const isDokterAdmin = role === 'dokter_admin';
  // The bidan and Puskesmas views are clinical, so both roles read them; only the
  // financial tabs stay owner-only.
  const allowedTabs = useMemo<ReportTabType[]>(
    () =>
      isDokterAdmin
        ? ['morbiditas', 'bidan', 'puskesmas']
        : ['kunjungan', 'morbiditas', 'bidan', 'puskesmas', 'buku_kas', 'komisi'],
    [isDokterAdmin]
  );

  const [activeTab, setActiveTab] = useState<ReportTabType>(
    isDokterAdmin ? 'morbiditas' : 'kunjungan'
  );
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [jenisPasien, setJenisPasien] = useState('Semua');
  const [kategoriProgram, setKategoriProgram] = useState('Semua');
  const [dokterId, setDokterId] = useState('Semua');
  const [doctorsList, setDoctorsList] = useState<{ id: string; nama: string }[]>([]);

  // These tabs own their own period filter and workbook export.
  const isSelfContainedTab = activeTab === 'bidan' || activeTab === 'puskesmas';

  const [visitsData, setVisitsData] = useState<VisitExportRow[]>([]);
  const [morbidityData, setMorbidityData] = useState<MorbidityExportRow[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowExportRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('doctors').select('id, nama').eq('aktif', true);
        if (data) setDoctorsList(data);
      } catch (e) {
        console.error('Error loading doctors list:', e);
      }
    }
    loadDoctors();
  }, []);

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const pageSize = 1000;

      let allVisits: any[] = [];
      let visitPage = 0;

      while (true) {
        let query = supabase
          .from('visits')
          .select(
            'id, tanggal_periksa, jenis_pasien, biaya_periksa, pendapatan_lain, jenis_pembayaran, kode_icd10, diagnosa_deskripsi, dokter_id, doctors(nama), patients(nama, no_rm, jenis_kelamin, desa)'
          )
          .order('tanggal_periksa', { ascending: false })
          .range(visitPage * pageSize, (visitPage + 1) * pageSize - 1);

        if (startDate) query = query.gte('tanggal_periksa', startDate);
        if (endDate) query = query.lte('tanggal_periksa', endDate);
        if (jenisPasien !== 'Semua') query = query.eq('jenis_pasien', jenisPasien);
        if (kategoriProgram !== 'Semua') query = query.eq('kategori_program', kategoriProgram);
        if (dokterId !== 'Semua') query = query.eq('dokter_id', dokterId);

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        allVisits.push(...data);
        if (data.length < pageSize) break;
        visitPage++;
      }

      let allFlows: any[] = [];
      if (!isDokterAdmin) {
        let flowPage = 0;
        while (true) {
          let flowQuery = supabase
            .from('cash_flows')
            .select('id, tanggal, jenis, kategori, nominal, keterangan')
            .order('tanggal', { ascending: false })
            .range(flowPage * pageSize, (flowPage + 1) * pageSize - 1);

          if (startDate) flowQuery = flowQuery.gte('tanggal', startDate);
          if (endDate) flowQuery = flowQuery.lte('tanggal', endDate);

          const { data, error } = await flowQuery;
          if (error) throw error;
          if (!data || data.length === 0) break;

          allFlows.push(...data);
          if (data.length < pageSize) break;
          flowPage++;
        }
      }

      const formattedVisits: VisitExportRow[] = allVisits.map((v) => {
        const biaya = normalizeRupiah(Number(v.biaya_periksa) || 0);
        const lain = normalizeRupiah(Number(v.pendapatan_lain) || 0);

        return {
          no_rm: v.patients?.no_rm || '-',
          nama_pasien: v.patients?.nama || 'Pasien',
          jenis_kelamin: v.patients?.jenis_kelamin || '-',
          desa: v.patients?.desa || 'Luar Daerah',
          tanggal_periksa: v.tanggal_periksa,
          nama_dokter: v.doctors?.nama || 'dr. Ovan',
          kode_icd10: v.kode_icd10 || '-',
          diagnosa_deskripsi: v.diagnosa_deskripsi || '-',
          jenis_pasien: v.jenis_pasien,
          biaya_periksa: biaya,
          pendapatan_lain: lain,
          total_biaya: biaya + lain,
          jenis_pembayaran: v.jenis_pembayaran || 'Tunai',
        };
      });

      const formattedFlows: CashFlowExportRow[] = allFlows.map((f) => ({
        tanggal: f.tanggal,
        jenis: f.jenis,
        kategori: f.kategori,
        nominal: normalizeRupiah(Number(f.nominal) || 0),
        keterangan: f.keterangan || '-',
      }));

      const morbMap: Record<string, { code: string; name: string; count: number }> = {};
      let validDiagCount = 0;

      allVisits.forEach((v) => {
        if (v.kode_icd10) {
          validDiagCount++;
          const code = v.kode_icd10.trim().toUpperCase();
          const name = v.diagnosa_deskripsi || code;
          if (!morbMap[code]) {
            morbMap[code] = { code, name, count: 0 };
          }
          morbMap[code].count++;
        }
      });

      const formattedMorbidity: MorbidityExportRow[] = Object.values(morbMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((m, idx) => ({
          rank: idx + 1,
          kode_icd10: m.code,
          diagnosa_deskripsi: m.name,
          jumlah_kasus: m.count,
          persentase: validDiagCount > 0 ? (m.count / validDiagCount) * 100 : 0,
        }));

      setVisitsData(formattedVisits);
      setCashFlowData(formattedFlows);
      setMorbidityData(formattedMorbidity);
    } catch (err) {
      console.error('Error loading report data:', err);
      const msg =
        err instanceof Error ? err.message : 'Gagal memuat data laporan dari server.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, jenisPasien, kategoriProgram, dokterId, isDokterAdmin]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(isDokterAdmin ? 'morbiditas' : 'kunjungan');
    }
  }, [activeTab, allowedTabs, isDokterAdmin]);

  const handlePresetChange = (
    preset: 'today' | 'this_month' | 'last_month' | 'this_year' | 'all'
  ) => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth();

    if (preset === 'today') {
      const today = now.toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'this_month') {
      setStartDate(new Date(yr, mo, 1).toISOString().split('T')[0]);
      setEndDate(new Date(yr, mo + 1, 0).toISOString().split('T')[0]);
    } else if (preset === 'last_month') {
      setStartDate(new Date(yr, mo - 1, 1).toISOString().split('T')[0]);
      setEndDate(new Date(yr, mo, 0).toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      setStartDate(`${yr}-01-01`);
      setEndDate(`${yr}-12-31`);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleReset = () => {
    handlePresetChange('this_month');
    setJenisPasien('Semua');
    setKategoriProgram('Semua');
    setDokterId('Semua');
    toast.info('Filter laporan telah direset ke bulan ini.');
  };

  const handleExportActiveTab = () => {
    try {
      const dateRange = { start: startDate || 'Awal', end: endDate || 'Akhir' };

      if (activeTab === 'kunjungan') {
        exportVisitsToExcel(visitsData, dateRange);
        toast.success(`Laporan kunjungan (${visitsData.length} baris) berhasil diunduh.`);
      } else if (activeTab === 'morbiditas') {
        exportMorbidityToExcel(morbidityData, dateRange);
        toast.success(`Laporan morbiditas ICD-10 (${morbidityData.length} baris) berhasil diunduh.`);
      } else if (activeTab === 'buku_kas') {
        exportCashFlowsToExcel(cashFlowData, dateRange);
        toast.success(`Laporan arus kas (${cashFlowData.length} baris) berhasil diunduh.`);
      }
    } catch {
      toast.error('Gagal mengunduh file Excel.');
    }
  };

  const handleExportFullWorkbook = () => {
    try {
      const dateRange = { start: startDate || 'Awal', end: endDate || 'Akhir' };
      exportFullClinicWorkbook({
        visits: visitsData,
        flows: cashFlowData,
        morbidity: morbidityData,
        dateRange,
      });
      toast.success('Buku kerja konsolidasi lengkap (3 sheet) berhasil diunduh.');
    } catch {
      toast.error('Gagal membuat buku kerja konsolidasi Excel.');
    }
  };

  // Compute dynamic KPI summary metrics
  const kpiSummaryData = useMemo(() => {
    const totalVisits = visitsData.length;
    const umumCount = visitsData.filter((v) => v.jenis_pasien !== 'BPJS').length;
    const bpjsCount = visitsData.filter((v) => v.jenis_pasien === 'BPJS').length;
    const totalBilling = visitsData.reduce((sum, v) => sum + (v.total_biaya || 0), 0);

    const totalKasMasuk = cashFlowData
      .filter((c) => c.jenis === 'Masuk')
      .reduce((sum, c) => sum + (c.nominal || 0), 0);
    const totalKasKeluar = cashFlowData
      .filter((c) => c.jenis === 'Keluar')
      .reduce((sum, c) => sum + (c.nominal || 0), 0);
    const netIncome = totalKasMasuk - totalKasKeluar;

    return {
      totalVisits,
      umumCount,
      bpjsCount,
      totalBilling,
      totalKasMasuk,
      totalKasKeluar,
      netIncome,
    };
  }, [visitsData, cashFlowData]);

  return (
    <div className="space-y-6 min-w-0 w-full pb-10">
      {/* 1. Master Report Header & Integrated Action Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Pusat Laporan &amp; Ekspor Excel
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SheetJS Engine
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {isDokterAdmin
              ? 'Laporan klinis rawat jalan dan surveilans morbiditas ICD-10 untuk kebutuhan pelaporan program kesehatan.'
              : 'Konsolidasi data operasional rawat jalan, surveilans morbiditas ICD-10, dan mutasi arus kas klinik format .xlsx'}
          </p>
        </div>

        {/* Action Ribbon: Reload + Single Tab Export + Full 3-Sheet Workbook Export */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={fetchReportData}
            disabled={isLoading}
            title="Muat Ulang Data Laporan"
            className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/90 shadow-btn-secondary tactile-btn transition disabled:opacity-50 flex items-center justify-center min-h-[40px] min-w-[40px] sm:min-h-[38px] sm:min-w-[38px]"
          >
            <ArrowClockwise className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} weight="bold" />
          </button>

          <button
            type="button"
            onClick={handleExportActiveTab}
            disabled={
              isLoading || isSelfContainedTab || (activeTab === 'kunjungan' && visitsData.length === 0)
            }
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-3.5 py-2 min-h-[40px] sm:min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
            <span>Unduh Tab Ini (.xlsx)</span>
          </button>

          {!isDokterAdmin && !isSelfContainedTab && (
            <button
              type="button"
              onClick={handleExportFullWorkbook}
              disabled={isLoading || (visitsData.length === 0 && cashFlowData.length === 0)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-3.5 py-2 min-h-[40px] sm:min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-emerald-700/80 tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            >
              <Stack weight="bold" className="w-3.5 h-3.5" />
              <span>Rekap Lengkap (3 Sheet)</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert Strip if any */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchReportData}
            className="font-semibold underline hover:no-underline shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 2. Executive Report Summary KPI Row */}
      {!isDokterAdmin && <ReportKpis data={kpiSummaryData} isLoading={isLoading} />}

      {/* 3. Filter Parameter Laporan Card */}
      <ReportFilterBar
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        jenisPasien={jenisPasien}
        onJenisPasienChange={setJenisPasien}
        kategoriProgram={kategoriProgram}
        onKategoriProgramChange={setKategoriProgram}
        dokterId={dokterId}
        onDokterIdChange={setDokterId}
        doctorsList={doctorsList}
        onApplyFilter={fetchReportData}
        onResetFilter={handleReset}
        isLoading={isLoading}
      />

      {/* 4. Recessed Track Segmented Sub-Tab Switcher */}
      <ReportTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        allowedTabs={allowedTabs}
        counts={{
          kunjungan: visitsData.length,
          morbiditas: morbidityData.length,
          buku_kas: cashFlowData.length,
        }}
      />

      {/* 5. Consolidated Preview Table, Referral Commission, Bidan, or Puskesmas View */}
      {activeTab === 'komisi' ? (
        <ReferralCommissionPanel isLoading={isLoading} />
      ) : activeTab === 'bidan' ? (
        <BidanReferralPanel startDate={startDate} endDate={endDate} isLoading={isLoading} />
      ) : activeTab === 'puskesmas' ? (
        <PuskesmasReportPanel startDate={startDate} endDate={endDate} isLoading={isLoading} />
      ) : (
        <ReportPreviewTable
          activeTab={activeTab}
          visitsData={visitsData}
          morbidityData={morbidityData}
          cashFlowData={cashFlowData}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
