'use client';

import React, { useState } from 'react';
import {
  Bank,
  CheckCircle,
  Warning,
  WarningCircle,
  Coins,
  CalendarBlank,
  ArrowUpRight,
  ArrowDownLeft,
  Vault,
  PencilSimple,
  Plus,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/Badge';
import { MONTH_NAMES_ID } from '@/constants/clinic';
import { formatRupiah, formatDateIndo, cn } from '@/lib/utils';
import type { DrawerOpeningSource } from '@/lib/drawer-opening';

export interface DrawerReconciliationMetrics {
  cashVisitsTotal: number;
  cashVisitsCount: number;
  cashExpensesTotal: number;
  cashExpensesCount: number;
  cashDepositsTotal: number;
  cashDepositsCount: number;
}

// F-023: Saldo Awal for the month view and for the selected date.
export interface DrawerOpeningView {
  monthly: number;
  daily: number;
  source: DrawerOpeningSource;
  /** Month ('YYYY-MM-01') of the recorded opening the balance starts from. */
  fromPeriode: string | null;
  catatan?: string | null;
}

export interface CashReconciliationCardProps {
  monthLabel: string;
  selectedYear?: number;
  selectedMonth?: number;
  monthlyMetrics: DrawerReconciliationMetrics;
  dailyMetrics: DrawerReconciliationMetrics;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  onOpenSetorTunai?: () => void;
  /** null while it could not be loaded; the drawer then starts from Rp 0. */
  opening: DrawerOpeningView | null;
  openingError?: string | null;
  /** Passed only for the owner (REQ-023-01.2). */
  onEditOpening?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function CashReconciliationCard({
  monthLabel,
  selectedYear,
  selectedMonth,
  monthlyMetrics,
  dailyMetrics,
  selectedDate,
  onSelectedDateChange,
  onOpenSetorTunai,
  opening,
  openingError,
  onEditOpening,
  className,
}: CashReconciliationCardProps) {
  const [scope, setScope] = useState<'monthly' | 'daily'>('monthly');

  const active = scope === 'monthly' ? monthlyMetrics : dailyMetrics;
  const saldoAwal = opening ? (scope === 'monthly' ? opening.monthly : opening.daily) : 0;
  const rawRemaining =
    saldoAwal + active.cashVisitsTotal - active.cashExpensesTotal - active.cashDepositsTotal;

  const hasActivity =
    saldoAwal !== 0 ||
    active.cashVisitsTotal > 0 ||
    active.cashExpensesTotal > 0 ||
    active.cashDepositsTotal > 0;
  const isBalanced = hasActivity && rawRemaining === 0;
  const hasRemainingCash = rawRemaining > 0;
  const isDeficit = rawRemaining < 0;

  const yearStr = selectedYear ? String(selectedYear) : selectedDate.slice(0, 4);
  const monthStr = selectedMonth
    ? String(selectedMonth).padStart(2, '0')
    : selectedDate.slice(5, 7);
  const minDate = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate();
  const maxDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const formatSigned = (amount: number) =>
    amount < 0 ? `- ${formatRupiah(Math.abs(amount))}` : formatRupiah(amount);
  const periodeLabel = (periode: string | null) => {
    if (!periode) return '';
    const [y, m] = periode.split('-').map(Number);
    return `${MONTH_NAMES_ID[m - 1]} ${y}`;
  };
  const openingMissing = !opening || opening.source === 'missing';
  const openingHint = !opening
    ? openingError
      ? 'Saldo awal gagal dimuat, sisa laci dihitung dari Rp 0.'
      : 'Memuat saldo awal laci...'
    : opening.source === 'missing'
      ? scope === 'daily'
        ? 'Saldo awal bulan belum diisi. Angka ini hanya mutasi laci sejak tanggal 1 bulan ini.'
        : 'Saldo awal belum diisi. Sisa laci dihitung dari Rp 0.'
      : scope === 'daily'
        ? `Saldo awal bulan ditambah mutasi laci sejak tanggal 1 sampai sehari sebelum ${formatDateIndo(selectedDate)}.`
        : opening.source === 'recorded'
          ? 'Dicatat dari hasil hitung uang laci di awal bulan.'
          : `Lanjutan dari bulan sebelumnya, dihitung sejak saldo awal ${periodeLabel(opening.fromPeriode)}.`;
  const openingEditLabel =
    opening?.source === 'recorded'
      ? 'Ubah Saldo Awal'
      : opening?.source === 'carried'
        ? 'Catat Hasil Hitung'
        : 'Isi Saldo Awal';

  return (
    <div
      className={cn(
        'p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-card-double space-y-4',
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200/80 pb-3.5">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 text-white flex items-center justify-center shadow-btn-primary shrink-0">
            <Bank weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
              <span>
                Rekonsiliasi Fisik Laci Kasir ({scope === 'monthly' ? `Akumulasi ${monthLabel}` : formatDateIndo(selectedDate)})
              </span>
              {isBalanced ? (
                <Badge variant="success" size="sm">
                  Laci Seimbang (Rp 0)
                </Badge>
              ) : isDeficit ? (
                <Badge variant="danger" size="sm">
                  Setoran Melebihi Isi Laci
                </Badge>
              ) : hasRemainingCash ? (
                <Badge variant="warning" size="sm">
                  Ada Sisa Kas di Laci
                </Badge>
              ) : (
                <Badge variant="default" size="sm">
                  Belum Ada Mutasi
                </Badge>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Sisa Fisik di Laci Kasir = Saldo Awal + Uang Tunai Pasien Masuk &minus; Pengeluaran Tunai Laci &minus; Setoran ke Pemilik/Bank
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScope('monthly')}
              className={cn(
                'px-2.5 py-1.5 min-h-[34px] rounded-lg transition',
                scope === 'monthly'
                  ? 'bg-white text-teal-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Akumulasi {monthLabel}
            </button>
            <button
              type="button"
              onClick={() => setScope('daily')}
              className={cn(
                'px-2.5 py-1.5 min-h-[34px] rounded-lg transition',
                scope === 'daily'
                  ? 'bg-white text-teal-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Per Tanggal
            </button>
          </div>

          {scope === 'daily' && (
            <div className="relative flex items-center">
              <CalendarBlank
                weight="duotone"
                className="w-3.5 h-3.5 text-teal-600 absolute left-2.5 pointer-events-none"
              />
              <input
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => {
                  if (e.target.value) onSelectedDateChange(e.target.value);
                }}
                aria-label="Pilih tanggal rekonsiliasi laci"
                className="pl-8 pr-2.5 py-1.5 min-h-[36px] text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {onOpenSetorTunai && (
            <button
              type="button"
              onClick={onOpenSetorTunai}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-white hover:bg-teal-50/60 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold shadow-btn-secondary tactile-btn transition"
            >
              <Bank weight="duotone" className="w-3.5 h-3.5" />
              <span>Catat Setor Tunai</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3 pt-1">
        <div
          className={cn(
            'p-3.5 rounded-xl border space-y-1 min-w-0',
            openingMissing ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'
          )}
        >
          <div className="flex items-center justify-between gap-2 text-slate-500 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <Vault weight="bold" className="w-3.5 h-3.5 text-teal-600" />
              <span>Saldo Awal</span>
            </span>
            {opening?.source === 'recorded' && scope === 'monthly' ? (
              <Badge variant="success" size="sm">Dicatat</Badge>
            ) : opening && opening.source !== 'missing' ? (
              <Badge variant="default" size="sm">Lanjutan</Badge>
            ) : (
              <Badge variant="warning" size="sm">Belum diisi</Badge>
            )}
          </div>
          <div className="text-lg font-extrabold font-mono text-slate-900 tabular-nums">
            {formatSigned(saldoAwal)}
          </div>
          <p className={cn('text-[10px] leading-snug', openingMissing ? 'text-amber-900' : 'text-slate-500')}>
            {openingHint}
          </p>
          {openingError && (
            <p role="alert" className="text-[10px] leading-snug text-rose-700 break-words">
              {openingError}
            </p>
          )}
          {opening?.catatan && scope === 'monthly' && opening.source === 'recorded' && (
            <p className="text-[10px] leading-snug text-slate-600 break-words">Catatan: {opening.catatan}</p>
          )}
          {onEditOpening && opening && (
            <button
              type="button"
              onClick={onEditOpening}
              className="mt-1 inline-flex items-center justify-center gap-1.5 px-3 min-h-[44px] w-full sm:w-auto bg-white hover:bg-teal-50/60 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold shadow-btn-secondary tactile-btn transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              {opening.source === 'recorded' ? (
                <PencilSimple weight="bold" className="w-3.5 h-3.5" />
              ) : (
                <Plus weight="bold" className="w-3.5 h-3.5" />
              )}
              <span>{openingEditLabel}</span>
            </button>
          )}
        </div>

        {/* 1. Uang Tunai Masuk Laci */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <ArrowDownLeft weight="bold" className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tunai Masuk Laci</span>
            </span>
            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
              {active.cashVisitsCount} Pasien
            </span>
          </div>
          <div className="text-lg font-extrabold font-mono text-slate-900 tabular-nums">
            + {formatRupiah(active.cashVisitsTotal)}
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            Penerimaan tunai fisik dari pembayaran pasien di loket, tidak termasuk transfer.
            Karena itu bisa lebih kecil dari Pendapatan Kasir di Dashboard.
          </p>
        </div>

        {/* 2. Pengeluaran Tunai dari Laci (Operasional) */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <ArrowUpRight weight="bold" className="w-3.5 h-3.5 text-rose-600" />
              <span>Pengeluaran Tunai Laci</span>
            </span>
            <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[10px]">
              {active.cashExpensesCount} Transaksi
            </span>
          </div>
          <div className="text-lg font-extrabold font-mono text-rose-700 tabular-nums">
            &minus; {formatRupiah(active.cashExpensesTotal)}
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            Belanja obat, listrik, konsumsi &amp; biaya operasional dari laci
          </p>
        </div>

        {/* 3. Disetor ke Pemilik / Bank */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <Bank weight="bold" className="w-3.5 h-3.5 text-indigo-600" />
              <span>Disetor ke Pemilik / Bank</span>
            </span>
            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[10px]">
              {active.cashDepositsCount} Setoran
            </span>
          </div>
          <div className="text-lg font-extrabold font-mono text-indigo-700 tabular-nums">
            &minus; {formatRupiah(active.cashDepositsTotal)}
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            Akumulasi Setor Tunai &amp; Setor ke Rekening Pemilik
          </p>
        </div>

        {/* 4. Sisa Fisik di Laci Kasir */}
        <div
          className={cn(
            'p-3.5 rounded-xl border space-y-1 sm:col-span-2 2xl:col-span-1',
            isBalanced
              ? 'bg-emerald-50/60 border-emerald-200'
              : isDeficit
                ? 'bg-rose-50/70 border-rose-200'
                : hasRemainingCash
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
          )}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span
              className={
                isBalanced
                  ? 'text-emerald-800'
                  : isDeficit
                    ? 'text-rose-900'
                    : hasRemainingCash
                      ? 'text-amber-900'
                      : 'text-slate-700'
              }
            >
              Sisa Fisik di Laci Kasir
            </span>
            {isBalanced ? (
              <CheckCircle weight="duotone" className="w-4 h-4 text-emerald-600" />
            ) : isDeficit ? (
              <WarningCircle weight="duotone" className="w-4 h-4 text-rose-600" />
            ) : hasRemainingCash ? (
              <Warning weight="duotone" className="w-4 h-4 text-amber-600" />
            ) : (
              <Coins weight="duotone" className="w-4 h-4 text-slate-400" />
            )}
          </div>

          <div
            className={cn(
              'text-lg font-extrabold font-mono tabular-nums',
              isBalanced
                ? 'text-emerald-700'
                : isDeficit
                  ? 'text-rose-700'
                  : hasRemainingCash
                    ? 'text-amber-800'
                    : 'text-slate-700'
            )}
          >
            {isDeficit
              ? `- ${formatRupiah(Math.abs(rawRemaining))}`
              : formatRupiah(rawRemaining)}
          </div>

          <p className="text-[10px] text-slate-600 leading-snug">
            {isDeficit
              ? `Setoran dan pengeluaran melampaui saldo awal ditambah kas masuk tunai (${formatRupiah(Math.abs(rawRemaining))})${openingMissing ? '. Periksa apakah saldo awal laci sudah diisi.' : ''}`
              : isBalanced
                ? 'Seluruh uang tunai laci telah terpakai operasional atau disetor'
                : hasRemainingCash
                  ? 'Uang tunai fisik yang saat ini masih berada di laci kasir'
                  : 'Tidak ada sisa kas fisik di laci'}
          </p>
        </div>
      </div>

      {/* Catatan Edukasi Alur Kas */}
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
        <span className="font-bold text-teal-700 shrink-0">Catatan Alur Laci Kasir:</span>
        <span className="leading-relaxed">
          <strong>Saldo Awal</strong> diambil dari hasil hitung uang laci yang dicatat pemilik; bulan tanpa catatan melanjutkan sisa laci bulan sebelumnya. Setiap <strong>Pengeluaran Operasional</strong> yang dibayar tunai (beli obat, token listrik, konsumsi) maupun <strong>Setor Tunai / Setor ke Rekening Pemilik</strong> otomatis memotong <strong>Sisa Fisik di Laci Kasir</strong>. Khusus <strong>Setor ke Rekening Pemilik</strong> tidak dihitung sebagai beban biaya pengeluaran klinik sehingga laba bersih tidak berkurang. Pengeluaran yang dibayar via <strong>Transfer</strong> tetap dihitung sebagai biaya, tetapi tidak memotong laci.
        </span>
      </div>
    </div>
  );
}

export default CashReconciliationCard;
