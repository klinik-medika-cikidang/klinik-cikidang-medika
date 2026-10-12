'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HandHeart,
  WarningCircle,
  ArrowClockwise,
  Users,
  DownloadSimple,
  Gift,
  Calendar,
  Sparkle,
  CheckCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { BIDAN_REFERRAL_SOURCES, bidanDisplayName } from '@/constants/clinic';
import { describePeriod, formatDateIndo } from '@/lib/utils';
import { exportBidanAnnualRecapToExcel } from '@/lib/excel';

interface ReferralRow {
  id: string;
  tanggal_periksa: string;
  kode_icd10: string | null;
  tindakan: string | null;
  bidan_rujukan: string;
  patients: { nama: string; no_rm: string; desa: string } | null;
}

interface BidanSummary {
  bidan: string;
  label: string;
  referrals: number;
  patients: number;
}

interface BidanReferralPanelProps {
  startDate: string;
  endDate: string;
  isLoading?: boolean;
}

const cellClass = 'px-3 py-2 text-xs text-slate-700 align-top';
const headerCellClass =
  'px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left bg-slate-50 border-b border-slate-200';

export function BidanReferralPanel({
  startDate: pageStartDate,
  endDate: pageEndDate,
  isLoading: externalLoading,
}: BidanReferralPanelProps) {
  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState<'tahunan' | 'periode'>('tahunan');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [selectedBidan, setSelectedBidan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute active date range based on view mode
  const activeStartDate = mode === 'tahunan' ? `${selectedYear}-01-01` : pageStartDate;
  const activeEndDate = mode === 'tahunan' ? `${selectedYear}-12-31` : pageEndDate;

  const fetchReferrals = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from('visits')
        .select('id, tanggal_periksa, kode_icd10, tindakan, bidan_rujukan, patients(nama, no_rm, desa)')
        .not('bidan_rujukan', 'is', null)
        .order('tanggal_periksa', { ascending: false });

      if (activeStartDate) query = query.gte('tanggal_periksa', activeStartDate);
      if (activeEndDate) query = query.lte('tanggal_periksa', activeEndDate);

      const { data, error } = await query;
      if (error) throw error;

      setRows((data || []) as unknown as ReferralRow[]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gagal memuat data rujukan bidan dari server.';
      setErrorMessage(message);
      setRows([]);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [activeStartDate, activeEndDate]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  // Aggregate referrals ensuring ALL registered midwives are shown
  const summary = useMemo<BidanSummary[]>(() => {
    const byBidan = new Map<string, { referrals: number; patients: Set<string> }>();

    // Seed all 9 clinic partner midwives
    BIDAN_REFERRAL_SOURCES.forEach((b) => {
      byBidan.set(b.id, { referrals: 0, patients: new Set() });
    });

    // Populate from actual visits
    rows.forEach((row) => {
      const bidanKey = row.bidan_rujukan;
      if (!byBidan.has(bidanKey)) {
        byBidan.set(bidanKey, { referrals: 0, patients: new Set() });
      }
      const entry = byBidan.get(bidanKey)!;
      entry.referrals += 1;
      entry.patients.add(row.patients?.no_rm || row.id);
    });

    return [...byBidan.entries()]
      .map(([bidan, entry]) => ({
        bidan,
        label: bidanDisplayName(bidan),
        referrals: entry.referrals,
        patients: entry.patients.size,
      }))
      .sort((a, b) => b.referrals - a.referrals || a.label.localeCompare(b.label));
  }, [rows]);

  const selectedRows = useMemo(
    () => (selectedBidan ? rows.filter((row) => row.bidan_rujukan.toLowerCase() === selectedBidan.toLowerCase()) : []),
    [rows, selectedBidan]
  );

  const totalReferrals = useMemo(() => rows.length, [rows]);
  const activeMidwivesCount = useMemo(
    () => summary.filter((s) => s.referrals > 0).length,
    [summary]
  );
  const topReferrer = useMemo(
    () => (summary.length > 0 && summary[0].referrals > 0 ? summary[0] : null),
    [summary]
  );

  const isBusy = isLoading || Boolean(externalLoading);
  const periodLabel =
    mode === 'tahunan'
      ? `Tahun ${selectedYear} (1 Jan - 31 Des ${selectedYear})`
      : describePeriod(pageStartDate, pageEndDate);

  const handleExportExcel = () => {
    if (summary.length === 0) {
      toast.error('Belum ada data rujukan untuk diekspor.');
      return;
    }

    const summaryExport = summary.map((s, idx) => ({
      rank: idx + 1,
      bidan: s.bidan,
      label: s.label,
      referrals: s.referrals,
      patients: s.patients,
    }));

    const detailExport = rows.map((r) => ({
      bidan: bidanDisplayName(r.bidan_rujukan),
      tanggal_periksa: r.tanggal_periksa,
      no_rm: r.patients?.no_rm || '-',
      nama_pasien: r.patients?.nama || 'Pasien',
      desa: r.patients?.desa || '-',
      kode_icd10: r.kode_icd10 || '-',
      tindakan: r.tindakan || '-',
    }));

    exportBidanAnnualRecapToExcel(
      summaryExport,
      detailExport,
      mode === 'tahunan' ? selectedYear : currentYear
    );
    toast.success('File Rekap Bingkisan Bidan berhasil diunduh.');
  };

  return (
    <div className="space-y-5 min-w-0 w-full">
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchReferrals}
            className="font-semibold underline hover:no-underline shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 1. Header Toolbar & Mode Switcher */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-card-double flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4" weight="duotone" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Rekapitulasi Rujukan &amp; Alokasi Bingkisan Bidan
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              {mode === 'tahunan' ? `Tahun ${selectedYear}` : 'Filter Halaman'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Data pemantauan rujukan tindakan medis dari bidan mitra untuk apresiasi dan bingkisan akhir tahun.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('tahunan')}
              className={`px-3 py-1.5 rounded-lg transition min-h-[32px] ${
                mode === 'tahunan'
                  ? 'bg-white text-teal-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap Tahunan (Bingkisan)
            </button>
            <button
              type="button"
              onClick={() => setMode('periode')}
              className={`px-3 py-1.5 rounded-lg transition min-h-[32px] ${
                mode === 'periode'
                  ? 'bg-white text-teal-800 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Filter Tanggal
            </button>
          </div>

          {/* Year Selector if Tahunan */}
          {mode === 'tahunan' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Pilih tahun rekap rujukan bidan"
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-600 min-h-[34px]"
            >
              <option value={2026}>Tahun 2026</option>
              <option value={2025}>Tahun 2025</option>
              <option value={2024}>Tahun 2024</option>
            </select>
          )}

          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isBusy || rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-btn-primary disabled:opacity-50 min-h-[34px]"
          >
            <DownloadSimple className="w-3.5 h-3.5" weight="bold" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-card-double space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Total Rujukan Pasien</span>
            <Users className="w-4 h-4 text-teal-600" weight="duotone" />
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900">{totalReferrals} Kunjungan</div>
          <p className="text-[10px] text-slate-400">Periode: {periodLabel}</p>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-card-double space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Bidan Aktif Merujuk</span>
            <Gift className="w-4 h-4 text-emerald-600" weight="duotone" />
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-700">
            {activeMidwivesCount} dari {summary.length} Bidan
          </div>
          <p className="text-[10px] text-slate-400">Kandidat penerima bingkisan akhir tahun</p>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-card-double space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Rujukan Terbanyak (Top 1)</span>
            <Sparkle className="w-4 h-4 text-amber-500" weight="fill" />
          </div>
          <div className="text-sm font-extrabold text-slate-900 truncate">
            {topReferrer ? `${topReferrer.label} (${topReferrer.referrals} rujukan)` : '-'}
          </div>
          <p className="text-[10px] text-amber-600 font-semibold">
            {topReferrer ? 'Prioritas Bingkisan Utama (Tier 1)' : 'Belum ada data'}
          </p>
        </div>
      </div>

      {/* 3. Master Roster & Detail Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-4 min-w-0">
        {/* Left: Midwife Roster with Gift Badges */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double tactile-card overflow-hidden min-w-0">
          <header className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HandHeart weight="duotone" className="w-4 h-4 text-teal-600" />
              <h4 className="text-xs font-bold text-slate-900">Daftar Bidan Perujuk</h4>
            </div>
            <button
              type="button"
              onClick={fetchReferrals}
              disabled={isBusy}
              title="Muat ulang data rujukan"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 tactile-btn transition disabled:opacity-50"
            >
              <ArrowClockwise className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin text-teal-600' : ''}`} weight="bold" />
            </button>
          </header>

          {isBusy && !hasLoaded ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.map((entry) => {
                const isActive = entry.bidan.toLowerCase() === selectedBidan?.toLowerCase();
                const tier =
                  entry.referrals >= 15
                    ? { label: 'Bingkisan Utama', color: 'bg-amber-50 text-amber-800 border-amber-200' }
                    : entry.referrals >= 5
                    ? { label: 'Bingkisan Standar', color: 'bg-teal-50 text-teal-800 border-teal-200' }
                    : entry.referrals > 0
                    ? { label: 'Apresiasi', color: 'bg-sky-50 text-sky-800 border-sky-200' }
                    : { label: '0 Rujukan', color: 'bg-slate-50 text-slate-400 border-slate-200' };

                return (
                  <li key={entry.bidan}>
                    <button
                      type="button"
                      onClick={() => setSelectedBidan(isActive ? null : entry.bidan)}
                      aria-pressed={isActive}
                      className={`w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between gap-2.5 text-left transition ${
                        isActive ? 'bg-teal-50/80 border-l-4 border-l-teal-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {entry.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {entry.patients} pasien unik
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${tier.color}`}>
                            {tier.label}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                          isActive
                            ? 'bg-white text-teal-700 border-teal-300'
                            : entry.referrals > 0
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        <Users weight="duotone" className="w-3 h-3" />
                        {entry.referrals}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Right: Referral Visit Details */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double tactile-card overflow-hidden min-w-0">
          <header className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                {selectedBidan ? `Riwayat Pasien Rujukan ${bidanDisplayName(selectedBidan)}` : 'Riwayat Kunjungan Pasien'}
              </h4>
              <p className="text-[11px] text-slate-500">
                {selectedBidan
                  ? `${selectedRows.length} kunjungan tercatat pada ${periodLabel}`
                  : 'Klik salah satu nama bidan di sebelah kiri untuk melihat rincian pasien'}
              </p>
            </div>
          </header>

          {!selectedBidan ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Gift className="w-10 h-10 mx-auto text-teal-400/80" weight="duotone" />
              <p className="text-xs font-bold text-slate-700">Pilih Bidan untuk Melihat Rincian Pasien</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Daftar sebelah kiri menampilkan akumulasi seluruh rujukan per bidan. Klik salah satu nama bidan untuk melihat rincian tanggal, nama pasien, dan tindakan medis yang diberikan.
              </p>
            </div>
          ) : isBusy && !hasLoaded ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : selectedRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300" weight="duotone" />
              <p className="text-xs font-bold text-slate-600">
                {bidanDisplayName(selectedBidan)} belum memiliki rujukan pada {periodLabel}
              </p>
              <p className="text-[11px] text-slate-400">
                Saat pasien rujukan dari bidan ini berobat, pastikan dokter atau staf loket mencatat rujukan pada kolom Tindakan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr>
                    <th className={headerCellClass}>No RM</th>
                    <th className={headerCellClass}>Nama Pasien</th>
                    <th className={headerCellClass}>Tgl Periksa</th>
                    <th className={headerCellClass}>Kode ICD-10</th>
                    <th className={headerCellClass}>Tindakan Medis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className={`${cellClass} font-mono tabular-nums font-bold text-teal-700`}>
                        {row.patients?.no_rm || '-'}
                      </td>
                      <td className={`${cellClass} font-medium text-slate-900`}>
                        {row.patients?.nama || 'Pasien'}
                        <span className="block text-[11px] font-normal text-slate-500">
                          {row.patients?.desa || 'Luar Daerah'}
                        </span>
                      </td>
                      <td className={`${cellClass} whitespace-nowrap`}>
                        {formatDateIndo(row.tanggal_periksa)}
                      </td>
                      <td className={`${cellClass} font-mono tabular-nums`}>{row.kode_icd10 || '-'}</td>
                      <td className={cellClass}>
                        <span className="font-medium text-slate-800">{row.tindakan || '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default BidanReferralPanel;
