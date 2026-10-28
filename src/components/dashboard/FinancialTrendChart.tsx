'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendUp,
  CalendarBlank,
  ChartLineUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Scales,
} from '@phosphor-icons/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatRupiah } from '@/lib/utils';

export interface FinancialPoint {
  date?: string;
  month?: string;
  label: string;
  cashIn: number;
  cashOut: number;
  netIncome: number;
}

export type DailyFinancialPoint = FinancialPoint & { date: string };
export type MonthlyFinancialPoint = FinancialPoint & { month: string };

interface FinancialTrendChartProps {
  dailyData: DailyFinancialPoint[];
  /** Names the plotted month, for example "Harian Okt". */
  dailyLabel?: string;
  monthlyData: MonthlyFinancialPoint[];
  isLoading?: boolean;
}

function formatCompactRupiah(num: number): string {
  if (Math.abs(num) >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}jt`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${(num / 1_000).toFixed(0)}rb`;
  }
  return String(num);
}

export function FinancialTrendChart({
  dailyData,
  dailyLabel = 'Harian',
  monthlyData,
  isLoading,
}: FinancialTrendChartProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentData: FinancialPoint[] = viewMode === 'daily' ? dailyData : monthlyData;

  const totalIn = currentData.reduce((acc, curr) => acc + curr.cashIn, 0);
  const totalOut = currentData.reduce((acc, curr) => acc + curr.cashOut, 0);
  const netTotal = totalIn - totalOut;

  if (isLoading) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-5 w-48 bg-slate-200 rounded"></div>
          <div className="h-10 w-48 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="h-64 w-full bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-card-double space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
            <ChartLineUp weight="duotone" className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
              Tren Finansial &amp; Arus Kas
            </h3>
            <p className="text-[11px] text-slate-600 font-medium truncate">
              Kas masuk vs pengeluaran operasional
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex items-center p-0.5 bg-slate-50/90 rounded-xl border border-slate-200/90 shadow-2xs self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center gap-1 whitespace-nowrap ${
              viewMode === 'daily'
                ? 'bg-white text-emerald-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
            }`}
          >
            <CalendarBlank weight="duotone" className="w-3.5 h-3.5" />
            <span>{dailyLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center gap-1 whitespace-nowrap ${
              viewMode === 'monthly'
                ? 'bg-white text-emerald-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
            }`}
          >
            <TrendUp weight="duotone" className="w-3.5 h-3.5" />
            <span>12 Bulan</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Refined rounded-2xl & subtle dot accents, zero truncation) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-well flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-600 truncate">
                Kas Masuk
              </span>
            </div>
            <ArrowUpRight weight="bold" className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <span className="text-base font-extrabold text-emerald-700 font-mono tracking-tight">
            {formatRupiah(totalIn)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">omzet &amp; kapitasi</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-well flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-600 truncate">
                Pengeluaran
              </span>
            </div>
            <ArrowDownRight weight="bold" className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          </div>
          <span className="text-base font-extrabold text-rose-700 font-mono tracking-tight">
            {formatRupiah(totalOut)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">operasional &amp; obat</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-well flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-600 truncate">
                Surplus Kas
              </span>
            </div>
            <Scales weight="duotone" className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          </div>
          <span
            className={`text-base font-extrabold font-mono tracking-tight ${
              netTotal >= 0 ? 'text-teal-700' : 'text-rose-700'
            }`}
          >
            {formatRupiah(netTotal)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">saldo kas riil</span>
        </div>
      </div>

      {/* A month of daily points needs ~720px; below md it scrolls inside this wrapper, not the page. */}
      <div
        className="w-full overflow-x-auto md:overflow-visible rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        tabIndex={0}
        role="region"
        aria-label="Grafik tren finansial"
      >
        <div className={`h-64 sm:h-72 pt-1 ${viewMode === 'daily' ? 'min-w-[720px] md:min-w-0' : ''}`}>
          {isMounted && currentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData} margin={{ top: 10, right: 12, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="colorCashOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  width={42}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCompactRupiah}
                />
                <Tooltip content={<CustomFinancialTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                  formatter={(value) => {
                    if (value === 'cashIn') return 'Kas Masuk (Omzet & Kapitasi)';
                    if (value === 'cashOut') return 'Pengeluaran (Operasional & Obat)';
                    return value;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cashIn"
                  name="cashIn"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCashIn)"
                />
                <Area
                  type="monotone"
                  dataKey="cashOut"
                  name="cashOut"
                  stroke="#e11d48"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCashOut)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Belum ada catatan transaksi arus kas pada periode ini
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomFinancialTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const cashIn = payload.find((p: any) => p.dataKey === 'cashIn')?.value || 0;
    const cashOut = payload.find((p: any) => p.dataKey === 'cashOut')?.value || 0;
    const net = cashIn - cashOut;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-2 min-w-[210px]">
        <div className="font-bold border-b border-slate-700/80 pb-1.5 text-slate-200 flex items-center justify-between">
          <span>Periode: {label}</span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${net >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
            {net >= 0 ? 'Surplus' : 'Defisit'}
          </span>
        </div>
        <div className="space-y-1.5 font-mono">
          <div className="flex justify-between items-center text-emerald-400">
            <span className="font-sans flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Kas Masuk:</span>
            </span>
            <span className="font-bold">{formatRupiah(cashIn)}</span>
          </div>
          <div className="flex justify-between items-center text-rose-400">
            <span className="font-sans flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Kas Keluar:</span>
            </span>
            <span className="font-bold">{formatRupiah(cashOut)}</span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-slate-700/80 font-bold text-white">
            <span className="font-sans">Selisih Bersih:</span>
            <span
              className={`font-bold ${
                net >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatRupiah(net)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
