'use client';

import {
  Bank,
  CheckCircle,
  Warning,
  Coins,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah, cn } from '@/lib/utils';

export interface CashReconciliationCardProps {
  todayCashVisitsTotal: number;
  todayCashVisitsCount: number;
  todayCashDepositsTotal: number;
  onOpenSetorTunai?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function CashReconciliationCard({
  todayCashVisitsTotal,
  todayCashVisitsCount,
  todayCashDepositsTotal,
  onOpenSetorTunai,
  className,
}: CashReconciliationCardProps) {
  const selisih = todayCashVisitsTotal - todayCashDepositsTotal;
  const isBalanced = todayCashVisitsTotal > 0 && selisih === 0;
  const hasRemainingCash = selisih > 0;

  return (
    <div
      className={cn(
        'p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-card-double space-y-4',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 text-white flex items-center justify-center shadow-btn-primary shrink-0">
            <Bank weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
              <span>Rekonsiliasi Kasir &amp; Setoran Tunai Hari Ini</span>
              {isBalanced ? (
                <Badge variant="success" size="sm">
                  Seimbang (Lunas Disetor)
                </Badge>
              ) : hasRemainingCash ? (
                <Badge variant="warning" size="sm">
                  Ada Uang di Kasir
                </Badge>
              ) : (
                <Badge variant="default" size="sm">
                  Belum Ada Transaksi
                </Badge>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Mencocokkan penerimaan uang tunai fisik di laci kasir loket dengan catatan mutasi setoran bank di Buku Kas
            </p>
          </div>
        </div>

        {onOpenSetorTunai && (
          <button
            type="button"
            onClick={onOpenSetorTunai}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] bg-white hover:bg-slate-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold shadow-btn-secondary tactile-btn transition self-start sm:self-auto"
          >
            <Bank weight="duotone" className="w-3.5 h-3.5" />
            <span>Catat Setor Tunai</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Uang Tunai di Laci Kasir (Fisik)</span>
            <span className="font-mono font-bold text-slate-700">
              {todayCashVisitsCount} Pasien
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatRupiah(todayCashVisitsTotal)}
          </div>
          <p className="text-[10px] text-slate-400">
            Penerimaan uang cash fisik di laci loket kasir hari ini
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Tercatat Disetor ke Bank (Buku Kas)</span>
            <span className="text-emerald-600 font-bold text-[10px]">Buku Kas</span>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-700">
            {formatRupiah(todayCashDepositsTotal)}
          </div>
          <p className="text-[10px] text-slate-400">
            Mutasi masuk kategori Setor Tunai ke rekening klinik
          </p>
        </div>

        <div
          className={cn(
            'p-3.5 rounded-xl border space-y-1',
            isBalanced
              ? 'bg-emerald-50/60 border-emerald-200'
              : hasRemainingCash
              ? 'bg-amber-50/60 border-amber-200'
              : 'bg-slate-50 border-slate-200'
          )}
        >
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span
              className={
                isBalanced
                  ? 'text-emerald-800'
                  : hasRemainingCash
                  ? 'text-amber-800'
                  : 'text-slate-600'
              }
            >
              {isBalanced
                ? 'Status Rekonsiliasi'
                : hasRemainingCash
                ? 'Sisa Fisik di Laci Kasir'
                : 'Selisih Kas'}
            </span>
            {isBalanced ? (
              <CheckCircle weight="duotone" className="w-4 h-4 text-emerald-600" />
            ) : hasRemainingCash ? (
              <Warning weight="duotone" className="w-4 h-4 text-amber-600" />
            ) : (
              <Coins weight="duotone" className="w-4 h-4 text-slate-400" />
            )}
          </div>

          <div
            className={cn(
              'text-lg font-bold font-mono',
              isBalanced
                ? 'text-emerald-700'
                : hasRemainingCash
                ? 'text-amber-800'
                : 'text-slate-700'
            )}
          >
            {isBalanced ? 'Rp 0 (Selesai Disetor)' : formatRupiah(selisih)}
          </div>

          <p className="text-[10px] text-slate-500">
            {isBalanced
              ? 'Seluruh uang tunai loket kasir hari ini telah disetor rapi ke bank'
              : hasRemainingCash
              ? 'Uang fisik dipegang kasir yang belum disetor ke bank'
              : 'Tidak ada selisih kas yang belum disetor'}
          </p>
        </div>
      </div>

      {/* Catatan Edukasi Alur Kas */}
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
        <span className="font-bold text-teal-700 shrink-0">💡 Catatan Alur:</span>
        <span className="leading-relaxed">
          <strong>Loket Kasir</strong> mengumpulkan uang tunai (cash fisik di laci kasir). Saat uang tersebut disetorkan ke rekening bank klinik, staf mencatat <strong>Setor Tunai</strong> agar saldo di <strong>Buku Kas</strong> bertambah dan sisa fisik di laci menjadi seimbang (Rp 0).
        </span>
      </div>
    </div>
  );
}

export default CashReconciliationCard;
