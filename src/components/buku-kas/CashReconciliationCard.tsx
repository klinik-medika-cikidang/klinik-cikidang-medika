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

export type OpeningTileStatus = 'loading' | 'error' | 'missing' | 'recorded' | 'carried';
export type DrawerBalanceState = 'unknown' | 'balanced' | 'deficit' | 'remaining' | 'empty';

export interface ReconciliationView {
  openingStatus: OpeningTileStatus;
  /** null while the figure is not known yet, so the card never shows a made-up Rp 0. */
  saldoAwal: number | null;
  remaining: number | null;
  balance: DrawerBalanceState;
}

/**
 * Decides what the card may claim. An opening that is loading or failed to load is not the
 * same as a month nobody filled, and movements still loading must not be mixed with it.
 */
export function resolveReconciliationView(params: {
  opening: DrawerOpeningView | null;
  openingError?: string | null;
  isLoading?: boolean;
  /** Set when the month's movements failed to load; the drawer then cannot be computed. */
  movementsError?: string | null;
  scope: 'monthly' | 'daily';
  active: DrawerReconciliationMetrics;
}): ReconciliationView {
  const { opening, openingError, scope, active } = params;
  const isLoading = params.isLoading || Boolean(params.movementsError);
  const openingStatus: OpeningTileStatus = !opening
    ? openingError
      ? 'error'
      : 'loading'
    : opening.source;

  // The daily opening is built from the month's movements, so it waits for them too.
  const saldoAwal =
    opening && (scope === 'monthly' || !isLoading)
      ? scope === 'monthly'
        ? opening.monthly
        : opening.daily
      : null;
  if (saldoAwal === null || isLoading) {
    return { openingStatus, saldoAwal, remaining: null, balance: 'unknown' };
  }

  const remaining =
    saldoAwal + active.cashVisitsTotal - active.cashExpensesTotal - active.cashDepositsTotal;
  const hasActivity =
    saldoAwal !== 0 ||
    active.cashVisitsTotal > 0 ||
    active.cashExpensesTotal > 0 ||
    active.cashDepositsTotal > 0;
  const balance: DrawerBalanceState =
    remaining < 0 ? 'deficit' : remaining > 0 ? 'remaining' : hasActivity ? 'balanced' : 'empty';
  return { openingStatus, saldoAwal, remaining, balance };
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
  /** null while loading or after a failed load; the remaining cash is then not computed. */
  opening: DrawerOpeningView | null;
  openingError?: string | null;
  /** True while a known opening is being refetched; its value stays on screen meanwhile. */
  isOpeningRefreshing?: boolean;
  /** Passed only for the owner (REQ-023-01.2). */
  onEditOpening?: () => void;
  /** True while the month's cash movements are loading. */
  isLoading?: boolean;
  /** Set when the month's cash movements failed to load. */
  movementsError?: string | null;
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
  isOpeningRefreshing = false,
  onEditOpening,
  isLoading = false,
  movementsError = null,
  className,
}: CashReconciliationCardProps) {
  const [scope, setScope] = useState<'monthly' | 'daily'>('monthly');

  const active = scope === 'monthly' ? monthlyMetrics : dailyMetrics;
  const view = resolveReconciliationView({ opening, openingError, isLoading, movementsError, scope, active });
  // A failed load shows a dash, never the previous month's figures or a pulsing placeholder.
  const movementsUnavailable = isLoading || Boolean(movementsError);
  const { openingStatus, saldoAwal } = view;
  const rawRemaining = view.remaining ?? 0;
  const isUnknown = view.balance === 'unknown';
  const isBalanced = view.balance === 'balanced';
  const hasRemainingCash = view.balance === 'remaining';
  const isDeficit = view.balance === 'deficit';
  const isWaiting = isLoading || openingStatus === 'loading';

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
  const openingMissing = openingStatus === 'missing';
  const openingHint = !opening
    ? openingError
      ? 'Saldo awal gagal dimuat, jadi sisa laci belum dihitung.'
      : 'Memuat saldo awal laci...'
    : isOpeningRefreshing
      ? 'Memperbarui saldo awal laci...'
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

  // While a figure is unknown the tile shows a placeholder, never a computed Rp 0.
  const renderAmount = (text: string | null, colorClass: string, pending: boolean) => (
    <div className={cn('text-lg font-extrabold font-mono tabular-nums min-h-[28px]', colorClass)}>
      {text !== null ? (
        text
      ) : pending ? (
        <>
          <span
            aria-hidden="true"
            className="inline-block h-5 w-28 max-w-full rounded-md bg-slate-200 animate-pulse align-middle"
          />
          <span className="sr-only">Memuat</span>
        </>
      ) : (
        <span className="text-slate-500">-</span>
      )}
    </div>
  );

  return (
    <div
      aria-busy={isWaiting || isOpeningRefreshing}
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
              {isUnknown ? (
                <Badge variant="default" size="sm">
                  {isWaiting ? 'Memuat' : 'Belum Bisa Dihitung'}
                </Badge>
              ) : isBalanced ? (
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
            {openingStatus === 'loading' ? (
              <Badge variant="default" size="sm">Memuat</Badge>
            ) : openingStatus === 'error' ? (
              <Badge variant="danger" size="sm">Gagal dimuat</Badge>
            ) : openingStatus === 'missing' ? (
              <Badge variant="warning" size="sm">Belum diisi</Badge>
            ) : openingStatus === 'recorded' && scope === 'monthly' ? (
              <Badge variant="success" size="sm">Dicatat</Badge>
            ) : (
              <Badge variant="default" size="sm">Lanjutan</Badge>
            )}
          </div>
          {renderAmount(
            saldoAwal === null ? null : formatSigned(saldoAwal),
            'text-slate-900',
            saldoAwal === null && isWaiting
          )}
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
              {movementsUnavailable ? '-' : active.cashVisitsCount} Pasien
            </span>
          </div>
          {renderAmount(
            movementsUnavailable ? null : `+ ${formatRupiah(active.cashVisitsTotal)}`,
            'text-slate-900',
            isLoading
          )}
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
              {movementsUnavailable ? '-' : active.cashExpensesCount} Transaksi
            </span>
          </div>
          {renderAmount(
            movementsUnavailable ? null : `− ${formatRupiah(active.cashExpensesTotal)}`,
            'text-rose-700',
            isLoading
          )}
          <p className="text-[10px] text-slate-500 leading-snug">
            Pengeluaran klinik dan non klinik yang dibayar tunai dari laci
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
              {movementsUnavailable ? '-' : active.cashDepositsCount} Setoran
            </span>
          </div>
          {renderAmount(
            movementsUnavailable ? null : `− ${formatRupiah(active.cashDepositsTotal)}`,
            'text-indigo-700',
            isLoading
          )}
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

          {renderAmount(
            isUnknown ? null : formatSigned(rawRemaining),
            isBalanced
              ? 'text-emerald-700'
              : isDeficit
                ? 'text-rose-700'
                : hasRemainingCash
                  ? 'text-amber-800'
                  : 'text-slate-700',
            isUnknown && isWaiting
          )}

          <p className="text-[10px] text-slate-600 leading-snug">
            {isUnknown
              ? isWaiting
                ? 'Menunggu data laci selesai dimuat.'
                : 'Sisa laci belum bisa dihitung karena saldo awal gagal dimuat. Tekan tombol muat ulang di atas.'
              : isDeficit
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
