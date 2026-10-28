'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendUp,
  CalendarBlank,
  ChartBar,
  ChartLine,
  Users,
  Trophy,
} from '@phosphor-icons/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export interface TrendPoint {
  date?: string;
  month?: string;
  label: string;
  bpjs: number;
  umum: number;
  total: number;
}

export type DailyTrendPoint = TrendPoint & { date: string };
export type MonthlyTrendPoint = TrendPoint & { month: string };

interface VisitTrendChartProps {
  dailyData: DailyTrendPoint[];
  /** Names the plotted month, for example "Harian Okt". */
  dailyLabel?: string;
  monthlyData: MonthlyTrendPoint[];
  isLoading?: boolean;
}

export function VisitTrendChart({
  dailyData,
  dailyLabel = 'Harian',
  monthlyData,
  isLoading,
}: VisitTrendChartProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentData: TrendPoint[] = viewMode === 'daily' ? dailyData : monthlyData;

  const peakPoint =
    currentData.length > 0
      ? currentData.reduce((max, p) => (p.total > max.total ? p : max), currentData[0])
      : null;

  const totalPeriodVisits = currentData.reduce((acc, curr) => acc + curr.total, 0);
  const totalBpjsVisits = currentData.reduce((acc, curr) => acc + curr.bpjs, 0);
  const totalUmumVisits = currentData.reduce((acc, curr) => acc + curr.umum, 0);

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
      {/* Header with Compact Icon Toggle & Time Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-xl shrink-0">
            <TrendUp weight="duotone" className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
              Tren Kunjungan Pasien
            </h3>
            <p className="text-[11px] text-slate-600 font-medium truncate">
              Beban kunjungan &amp; rasio penjamin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          {/* Chart Type Compact Icon Toggle */}
          <div className="inline-flex items-center p-0.5 bg-slate-50/90 rounded-xl border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`h-7 sm:h-8 px-2 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center ${
                chartType === 'bar'
                  ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
              }`}
              title="Grafik Batang"
              aria-label="Tampilan Grafik Batang"
            >
              <ChartBar weight="duotone" className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`h-7 sm:h-8 px-2 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center ${
                chartType === 'area'
                  ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
              }`}
              title="Kurva Area"
              aria-label="Tampilan Kurva Area"
            >
              <ChartLine weight="duotone" className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time View Switcher */}
          <div className="inline-flex items-center p-0.5 bg-slate-50/90 rounded-xl border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center gap-1 whitespace-nowrap ${
                viewMode === 'daily'
                  ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
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
                  ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
              }`}
            >
              <TrendUp weight="duotone" className="w-3.5 h-3.5" />
              <span>12 Bulan</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards (Balanced 2x2 on laptop, reflows to 4 on 2xl to prevent any ellipsis truncation) */}
      <div className="grid grid-cols-2 2xl:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-well flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500 truncate">Total Kunjungan</span>
          </div>
          <span className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
            {totalPeriodVisits.toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">kunjungan selesai</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-well flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-600 truncate">Pasien BPJS</span>
            </div>
            <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200/60 shrink-0">
              {totalPeriodVisits > 0 ? ((totalBpjsVisits / totalPeriodVisits) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <span className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
            {totalBpjsVisits.toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">klaim faskes</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-well flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-600 truncate">Pasien Umum</span>
            </div>
            <span className="text-[10px] font-bold font-mono text-teal-700 bg-teal-50 px-1 rounded border border-teal-200/60 shrink-0">
              {totalPeriodVisits > 0 ? ((totalUmumVisits / totalPeriodVisits) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <span className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
            {totalUmumVisits.toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">billing kasir</span>
        </div>

        {peakPoint && (
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-well flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-600 truncate">Puncak Rekor</span>
            </div>
            <span className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
              {peakPoint.total} Pasien
            </span>
            <span className="text-[10px] text-amber-700 mt-0.5 truncate font-medium">
              {peakPoint.label}
            </span>
          </div>
        )}
      </div>

      {/* A month of daily bars needs ~720px; below md it scrolls inside this wrapper, not the page. */}
      <div
        className="w-full overflow-x-auto md:overflow-visible rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        tabIndex={0}
        role="region"
        aria-label="Grafik tren kunjungan"
      >
        <div className={`h-72 pt-2 ${viewMode === 'daily' ? 'min-w-[720px] md:min-w-0' : ''}`}>
          {isMounted && currentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  data={currentData}
                  margin={{ top: 10, right: 12, left: -8, bottom: viewMode === 'daily' ? 10 : 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                    angle={viewMode === 'daily' ? -45 : 0}
                    textAnchor={viewMode === 'daily' ? 'end' : 'middle'}
                    height={viewMode === 'daily' ? 45 : 30}
                  />
                  <YAxis
                    width={32}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomVisitTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="bpjs"
                    name="Pasien BPJS"
                    stackId="visits"
                    fill="#059669"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="umum"
                    name="Pasien Umum"
                    stackId="visits"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <AreaChart
                  data={currentData}
                  margin={{ top: 10, right: 12, left: -8, bottom: viewMode === 'daily' ? 10 : 0 }}
                >
                  <defs>
                    <linearGradient id="colorBpjs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="colorUmum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                    angle={viewMode === 'daily' ? -45 : 0}
                    textAnchor={viewMode === 'daily' ? 'end' : 'middle'}
                    height={viewMode === 'daily' ? 45 : 30}
                  />
                  <YAxis
                    width={32}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomVisitTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="bpjs"
                    name="Pasien BPJS"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorBpjs)"
                  />
                  <Area
                    type="monotone"
                    dataKey="umum"
                    name="Pasien Umum"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorUmum)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              Menyiapkan grafik interaktif...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomVisitTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const bpjsVal = (payload.find((p: any) => p.dataKey === 'bpjs')?.value as number) || 0;
    const umumVal = (payload.find((p: any) => p.dataKey === 'umum')?.value as number) || 0;
    const totVal = bpjsVal + umumVal;
    const bpjsPct = totVal > 0 ? Math.round((bpjsVal / totVal) * 100) : 0;
    const umumPct = totVal > 0 ? 100 - bpjsPct : 0;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl text-xs space-y-2 border border-slate-700 min-w-[200px]">
        <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1.5 flex items-center justify-between">
          <span>Periode: {label}</span>
          <span className="text-[10px] font-mono text-slate-400 font-semibold">{totVal} Pasien</span>
        </div>
        <div className="space-y-1.5 font-mono">
          <div className="flex justify-between items-center text-teal-400">
            <span className="flex items-center gap-1.5 font-sans">
              <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
              <span>Umum:</span>
            </span>
            <span className="font-bold">{umumVal} ({umumPct}%)</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span className="flex items-center gap-1.5 font-sans">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>BPJS:</span>
            </span>
            <span className="font-bold">{bpjsVal} ({bpjsPct}%)</span>
          </div>
          <div className="flex justify-between items-center font-bold text-white border-t border-slate-700/80 pt-1.5">
            <span className="font-sans">Total Kunjungan:</span>
            <span className="text-sm font-extrabold">{totVal} Pasien</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default VisitTrendChart;
