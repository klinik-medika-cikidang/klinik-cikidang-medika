'use client';

import React from 'react';
import {
  Users,
  CreditCard,
  Handshake,
  ArrowUpRight,
  Wallet,
} from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/utils';

export interface DashboardKpiData {
  totalVisits: number;
  /** Null when the patient count query failed; the card shows "-" instead of a number. */
  uniquePatients: number | null;
  /** Settled cashier revenue: UMUM fees plus extra charges paid by BPJS patients. */
  kasirRevenue: number;
  bpjsRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

interface DashboardKpiCardsProps {
  data: DashboardKpiData;
  isLoading?: boolean;
}

export function DashboardKpiCards({ data, isLoading }: DashboardKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, idx) => (
          <div
            key={idx}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double animate-pulse space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-slate-200 rounded"></div>
              <div className="w-8 h-8 bg-slate-200 rounded-xl"></div>
            </div>
            <div className="h-7 w-32 bg-slate-200 rounded"></div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full"></div>
            <div className="h-3 w-28 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalVisits = data.totalVisits || 0;
  const uniquePatientsLabel =
    data.uniquePatients === null ? '-' : data.uniquePatients.toLocaleString('id-ID');
  const totalRevenue = (data.kasirRevenue || 0) + (data.bpjsRevenue || 0);

  const kasirRevPct = totalRevenue > 0 ? Math.round((data.kasirRevenue / totalRevenue) * 100) : 0;
  const bpjsRevPct = totalRevenue > 0 ? 100 - kasirRevPct : 0;
  const expenseRatio = totalRevenue > 0 ? Math.min(100, Math.round((data.totalExpenses / totalRevenue) * 100)) : (data.totalExpenses > 0 ? 100 : 0);

  const cards = [
    {
      id: 'kunjungan',
      title: 'Total Kunjungan',
      value: totalVisits.toLocaleString('id-ID'),
      unit: 'Kunjungan',
      subtitle: `${uniquePatientsLabel} Pasien Terdaftar`,
      barLabel: 'Volume Pelayanan',
      barDetail: `${totalVisits} Rawat Jalan`,
      barPct: totalVisits > 0 ? 100 : 0,
      barColor: 'bg-teal-600',
      badge: 'Live Data',
      badgeColor: 'text-teal-700 bg-teal-50 border-teal-200',
      icon: Users,
      iconBg: 'bg-teal-50 text-teal-600',
    },
    {
      id: 'kasir',
      title: 'Pendapatan Kasir',
      value: formatRupiah(data.kasirRevenue),
      subtitle: 'Tarif umum + biaya tambahan pasien',
      barLabel: 'Kontribusi Omzet',
      barDetail: `${kasirRevPct}% total omzet`,
      barPct: kasirRevPct,
      barColor: 'bg-emerald-600',
      badge: `${kasirRevPct}% Omzet`,
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: CreditCard,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'bpjs',
      title: 'Kapitasi BPJS',
      value: formatRupiah(data.bpjsRevenue),
      subtitle: 'Klaim bulanan FKTP',
      barLabel: 'Porsi Kapitasi',
      barDetail: `${bpjsRevPct}% total omzet`,
      barPct: bpjsRevPct,
      barColor: 'bg-teal-600',
      badge: `${bpjsRevPct}% Omzet`,
      badgeColor: 'text-teal-700 bg-teal-50 border-teal-200',
      icon: Handshake,
      iconBg: 'bg-teal-50 text-teal-600',
    },
    {
      id: 'pengeluaran',
      title: 'Total Pengeluaran',
      value: formatRupiah(data.totalExpenses),
      subtitle: 'Obat & operasional',
      barLabel: 'Beban Operasional',
      barDetail: `${expenseRatio}% pemasukan`,
      barPct: expenseRatio,
      barColor: expenseRatio > 80 ? 'bg-rose-600' : 'bg-amber-500',
      badge: expenseRatio <= 70 ? 'Terkendali' : 'Perhatian',
      badgeColor:
        expenseRatio <= 70
          ? 'text-slate-700 bg-slate-100 border-slate-200'
          : 'text-rose-700 bg-rose-50 border-rose-200',
      icon: ArrowUpRight,
      iconBg: 'bg-rose-50 text-rose-600',
    },
    {
      id: 'saldo',
      title: 'Saldo Kas Bersih',
      value: formatRupiah(data.netIncome),
      subtitle: data.netIncome >= 0 ? 'Surplus kas riil' : 'Defisit kas operasional',
      barLabel: 'Kesehatan Arus Kas',
      barDetail: data.netIncome >= 0 ? 'Surplus Positif' : 'Defisit Negatif',
      barPct: data.netIncome >= 0 ? Math.min(100, Math.max(20, Math.round(((totalRevenue - data.totalExpenses) / (totalRevenue || 1)) * 100))) : 100,
      barColor: data.netIncome >= 0 ? 'bg-indigo-600' : 'bg-rose-600',
      badge: data.netIncome >= 0 ? 'Surplus' : 'Defisit',
      badgeColor:
        data.netIncome >= 0
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : 'text-rose-700 bg-rose-50 border-rose-200',
      icon: Wallet,
      iconBg: data.netIncome >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card) => {
        const IconComponent = card.icon;

        return (
          <div
            key={card.id}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double tactile-card flex flex-col justify-between hover:border-teal-400 transition-colors"
          >
            <div>
              {/* Header: Title & Icon Pill */}
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate mr-1">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-xl shrink-0 ${card.iconBg}`}>
                  <IconComponent className="w-4 h-4" weight="duotone" />
                </div>
              </div>

              {/* Value with Tabular Monospace & Responsive Fluid Scaling */}
              <div className="flex items-baseline gap-1 font-mono tracking-tight min-w-0">
                {card.value.startsWith('Rp') ? (
                  <>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-400 select-none shrink-0">
                      Rp
                    </span>
                    <span
                      className="text-lg sm:text-xl lg:text-lg xl:text-[1.18rem] 2xl:text-2xl font-extrabold text-slate-900 truncate tabular-nums"
                      title={card.value}
                    >
                      {card.value.replace(/^Rp\s*/, '')}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="text-lg sm:text-xl lg:text-lg xl:text-[1.18rem] 2xl:text-2xl font-extrabold text-slate-900 truncate tabular-nums"
                      title={card.value}
                    >
                      {card.value}
                    </span>
                    {card.unit && (
                      <span className="text-xs font-semibold text-slate-500 ml-1">
                        {card.unit}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Real Metric Proportional Track (replaces fake distorted sparkline) */}
              <div className="my-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 font-semibold">
                  <span className="truncate">{card.barLabel}</span>
                  <span className="shrink-0 text-slate-700">{card.barDetail}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    style={{ width: `${card.barPct}%` }}
                    className={`h-full ${card.barColor} transition-all duration-500 rounded-full`}
                  />
                </div>
              </div>
            </div>

            {/* Footer: Subtitle & Real Badge */}
            <div className="flex items-center justify-between gap-1 text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-600 text-[11px] font-medium leading-tight min-w-0">
                {card.subtitle}
              </span>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border shrink-0 ${card.badgeColor}`}
              >
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
