'use client';

import React from 'react';
import {
  Users,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Scales,
} from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/utils';
import { ExpenseScopeBreakdown } from '@/components/finance/ExpenseScopeBreakdown';

export interface ReportKpiData {
  totalVisits: number;
  umumCount: number;
  bpjsCount: number;
  totalBilling: number;
  totalKasMasuk: number;
  totalKasKeluar: number;
  /** F-020 split of totalKasKeluar. */
  kasKeluarKlinik: number;
  kasKeluarNonKlinik: number;
  netIncome: number;
}

interface ReportKpisProps {
  data: ReportKpiData;
  isLoading?: boolean;
}

export function ReportKpis({ data, isLoading }: ReportKpisProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double animate-pulse space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-slate-200 rounded"></div>
              <div className="w-8 h-8 bg-slate-200 rounded-xl"></div>
            </div>
            <div className="h-7 w-28 bg-slate-200 rounded"></div>
            <div className="h-4 w-full bg-slate-100 rounded-full"></div>
            <div className="h-3 w-32 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // 1. Visit Ratio Calculations
  const totalVisits = data.totalVisits || 0;
  const umumPct = totalVisits > 0 ? Math.round((data.umumCount / totalVisits) * 100) : 0;
  const bpjsPct = totalVisits > 0 ? 100 - umumPct : 0;

  // 2. Billing Calculations
  const avgBillingPerVisit = totalVisits > 0 ? Math.round(data.totalBilling / totalVisits) : 0;

  // 3. Cash Flow Ratio Calculations
  const totalCashVolume = (data.totalKasMasuk || 0) + (data.totalKasKeluar || 0);
  const masukPct = totalCashVolume > 0 ? Math.round((data.totalKasMasuk / totalCashVolume) * 100) : (data.netIncome >= 0 ? 100 : 0);
  const keluarPct = totalCashVolume > 0 ? 100 - masukPct : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Volume Kunjungan Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double tactile-card flex flex-col justify-between hover:border-teal-400 transition-colors">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Volume Kunjungan
            </span>
            <div className="p-1.5 rounded-xl shrink-0 bg-teal-50 text-teal-600">
              <Users className="w-4 h-4" weight="duotone" />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 font-mono tracking-tight min-w-0">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate tabular-nums">
              {totalVisits.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-semibold text-slate-500">Pasien</span>
          </div>

          {/* Real Segmented Ratio Chart (Umum vs BPJS) */}
          <div className="my-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono font-medium">
              <span className="flex items-center gap-1.5 text-teal-700">
                <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                <span>Umum: {data.umumCount.toLocaleString('id-ID')} ({umumPct}%)</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <span>BPJS: {data.bpjsCount.toLocaleString('id-ID')} ({bpjsPct}%)</span>
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${umumPct}%` }}
                className="h-full bg-teal-600 transition-all duration-500"
                title={`Pasien Umum: ${data.umumCount} (${umumPct}%)`}
              />
              <div
                style={{ width: `${bpjsPct}%` }}
                className="h-full bg-emerald-600 transition-all duration-500"
                title={`Pasien BPJS: ${data.bpjsCount} (${bpjsPct}%)`}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-600 text-[11px] font-medium leading-tight truncate">
            {data.umumCount} Umum • {data.bpjsCount} BPJS
          </span>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border shrink-0 text-teal-700 bg-teal-50 border-teal-200">
            {totalVisits > 0 ? `${umumPct}% Umum` : '0 Pasien'}
          </span>
        </div>
      </div>

      {/* 2. Akumulasi Billing Kasir Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double tactile-card flex flex-col justify-between hover:border-emerald-400 transition-colors">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Akumulasi Billing Kasir
            </span>
            <div className="p-1.5 rounded-xl shrink-0 bg-emerald-50 text-emerald-600">
              <CreditCard className="w-4 h-4" weight="duotone" />
            </div>
          </div>

          <div className="flex items-baseline gap-1 font-mono tracking-tight min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 select-none shrink-0">
              Rp
            </span>
            <span
              className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate tabular-nums"
              title={formatRupiah(data.totalBilling)}
            >
              {formatRupiah(data.totalBilling).replace(/^Rp\s*/, '')}
            </span>
          </div>

          {/* Real Average Billing Intensity Bar */}
          <div className="my-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono font-medium">
              <span className="text-slate-600">Rata-rata Billing:</span>
              <span className="text-emerald-700 font-bold">
                {formatRupiah(avgBillingPerVisit)}{' '}
                <span className="text-slate-400 font-normal">/pasien</span>
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                style={{ width: `${data.totalBilling > 0 ? '100' : '0'}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                title={`Total Billing Kasir: ${formatRupiah(data.totalBilling)}`}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-600 text-[11px] font-medium leading-tight truncate">
            Poli umum, kasir &amp; tindakan
          </span>
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border shrink-0 text-emerald-700 bg-emerald-50 border-emerald-200">
            Omzet Faskes
          </span>
        </div>
      </div>

      {/* 3. Arus Kas Bersih (Net Flow) Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double tactile-card flex flex-col justify-between hover:border-indigo-400 transition-colors">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Arus Kas Bersih (Net Flow)
            </span>
            <div
              className={`p-1.5 rounded-xl shrink-0 ${
                data.netIncome >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Wallet className="w-4 h-4" weight="duotone" />
            </div>
          </div>

          <div className="flex items-baseline gap-1 font-mono tracking-tight min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 select-none shrink-0">
              Rp
            </span>
            <span
              className={`text-xl sm:text-2xl font-extrabold truncate tabular-nums ${
                data.netIncome >= 0 ? 'text-slate-900' : 'text-rose-700'
              }`}
              title={formatRupiah(data.netIncome)}
            >
              {formatRupiah(data.netIncome).replace(/^Rp\s*/, '')}
            </span>
          </div>

          {/* Real Inflow vs Outflow Ratio Bar */}
          <div className="my-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono font-medium">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <span>Masuk ({masukPct}%)</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                <span>Keluar ({keluarPct}%)</span>
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${masukPct}%` }}
                className="h-full bg-emerald-600 transition-all duration-500"
                title={`Pemasukan: ${formatRupiah(data.totalKasMasuk)} (${masukPct}%)`}
              />
              <div
                style={{ width: `${keluarPct}%` }}
                className="h-full bg-rose-500 transition-all duration-500"
                title={`Pengeluaran: ${formatRupiah(data.totalKasKeluar)} (${keluarPct}%)`}
              />
            </div>
          </div>

          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Rincian Pengeluaran</p>
            <ExpenseScopeBreakdown klinik={data.kasKeluarKlinik} nonKlinik={data.kasKeluarNonKlinik} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-600 text-[11px] font-medium leading-tight truncate">
            Masuk {formatRupiah(data.totalKasMasuk)} • Keluar {formatRupiah(data.totalKasKeluar)}
          </span>
          <span
            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border shrink-0 ${
              data.netIncome >= 0
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : 'text-rose-700 bg-rose-50 border-rose-200'
            }`}
          >
            {data.netIncome >= 0 ? 'Surplus' : 'Defisit'}
          </span>
        </div>
      </div>
    </div>
  );
}
