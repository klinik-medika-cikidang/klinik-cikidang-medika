import React from 'react';
import { EXPENSE_SCOPE_LABELS } from '@/constants/clinic';
import { cn, formatRupiah } from '@/lib/utils';

interface ExpenseScopeBreakdownProps {
  klinik: number;
  nonKlinik: number;
  className?: string;
}

// F-020: the same Klinik / Non Klinik split on Dashboard, Buku Kas, and Laporan.
export function ExpenseScopeBreakdown({ klinik, nonKlinik, className }: ExpenseScopeBreakdownProps) {
  const rows = [
    { label: EXPENSE_SCOPE_LABELS.klinik, value: klinik, dot: 'bg-rose-500' },
    { label: EXPENSE_SCOPE_LABELS.non_klinik, value: nonKlinik, dot: 'bg-amber-500' },
  ];
  return (
    <dl className={cn('space-y-0.5 text-[11px]', className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap items-center justify-between gap-x-2">
          <dt className="flex items-center gap-1.5 min-w-0 text-slate-600 font-medium">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', row.dot)} aria-hidden="true" />
            {row.label}
          </dt>
          <dd className="ml-auto font-mono tabular-nums font-semibold text-slate-800">{formatRupiah(row.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
