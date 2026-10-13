'use client';

import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Bank,
  CircleNotch,
} from '@phosphor-icons/react';
import { formatRupiah, cn } from '@/lib/utils';

export interface CashFlowSummaryCardsProps {
  totalMasuk: number;
  totalKeluar: number;
  saldoBersih: number;
  totalSetorTunai: number;
  monthName?: string;
  isLoading?: boolean;
  className?: string;
}

export function CashFlowSummaryCards({
  totalMasuk,
  totalKeluar,
  saldoBersih,
  totalSetorTunai,
  monthName = 'Bulan Ini',
  isLoading = false,
  className,
}: CashFlowSummaryCardsProps) {
  const cards = [
    {
      title: 'Total Penerimaan Kas',
      subtitle: `Tunai Loket & Kapitasi (${monthName})`,
      amount: totalMasuk,
      icon: ArrowDownLeft,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      title: 'Pengeluaran Operasional',
      subtitle: `Obat & Operasional (${monthName}, Tanpa Setoran)`,
      amount: totalKeluar,
      icon: ArrowUpRight,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
    },
    {
      title: 'Saldo Kas Bersih (Net)',
      subtitle: 'Penerimaan Kas - Beban Operasional',
      amount: saldoBersih,
      icon: Wallet,
      iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
    },
    {
      title: 'Setor Tunai & Pemilik',
      subtitle: `Disetor ke Bank / Pemilik (${monthName})`,
      amount: totalSetorTunai,
      icon: Bank,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
  ];

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {cards.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double tactile-card flex flex-col justify-between space-y-3 relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  {item.title}
                </span>
                <span className="text-[11px] text-slate-600 block mt-0.5 font-medium">
                  {item.subtitle}
                </span>
              </div>
              <div
                className={cn(
                  'w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs',
                  item.iconBg
                )}
              >
                <Icon weight="duotone" className="w-5 h-5" />
              </div>
            </div>

            <div className="pt-1">
              {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 py-1">
                  <CircleNotch weight="bold" className="w-4 h-4 animate-spin text-teal-500" />
                  <span className="text-xs font-medium">Menghitung...</span>
                </div>
              ) : (
                <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-slate-900 tabular-nums">
                  {formatRupiah(item.amount)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CashFlowSummaryCards;
