'use client';

import React from 'react';
import { formatRupiah, isLikelyShorthandRupiah } from '@/lib/utils';

export interface RupiahShorthandHintProps {
  value: number;
  onApply: (correctedValue: number) => void;
}

export function RupiahShorthandHint({ value, onApply }: RupiahShorthandHintProps) {
  if (!isLikelyShorthandRupiah(value)) return null;

  const corrected = Number(value) * 1000;

  return (
    <div
      role="alert"
      className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900 leading-snug"
    >
      <span className="flex-1">
        Terbaca <span className="font-mono font-bold">{formatRupiah(value)}</span>. Nominal disimpan
        dalam rupiah penuh. Maksudnya <span className="font-mono font-bold">{formatRupiah(corrected)}</span>?
      </span>
      <button
        type="button"
        onClick={() => onApply(corrected)}
        className="shrink-0 px-3 min-h-[44px] sm:min-h-[36px] rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 transition"
      >
        Ubah ke {formatRupiah(corrected)}
      </button>
    </div>
  );
}
