'use client';

import React from 'react';
import { MONTH_NAMES_ID } from '@/constants/clinic';
import { formatRupiah, type MonthlyExpenseRecap } from '@/lib/utils';

interface ExpenseRecapTableProps {
  rows: MonthlyExpenseRecap[];
  isLoading?: boolean;
}

// F-020: monthly recap laid out like the PENGELUARAN TOTAL pivot in the clinic sheet.
export function ExpenseRecapTable({ rows, isLoading }: ExpenseRecapTableProps) {
  const totals = rows.reduce(
    (acc, r) => ({ klinik: acc.klinik + r.klinik, nonKlinik: acc.nonKlinik + r.nonKlinik, total: acc.total + r.total }),
    { klinik: 0, nonKlinik: 0, total: 0 }
  );

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double p-4 sm:p-5 space-y-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Rekap Pengeluaran Bulanan</h2>
        <p className="text-[11px] text-slate-600 font-medium">
          Klinik dan Non Klinik per bulan untuk periode filter. Setoran ke pemilik atau bank tidak termasuk.
        </p>
      </div>

      {isLoading ? (
        <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">Tidak ada pengeluaran pada periode ini.</p>
      ) : (
        <div
          className="overflow-x-auto -mx-1 px-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          tabIndex={0}
          role="region"
          aria-label="Rekap pengeluaran bulanan"
        >
          <table className="w-full min-w-[480px] text-xs border-collapse">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th scope="col" className="py-2 pr-3 font-bold">Tahun</th>
                <th scope="col" className="py-2 pr-3 font-bold">Bulan</th>
                <th scope="col" className="py-2 pr-3 font-bold text-right">Klinik</th>
                <th scope="col" className="py-2 pr-3 font-bold text-right">Non Klinik</th>
                <th scope="col" className="py-2 font-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.year}-${r.month}`} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-mono tabular-nums text-slate-700">{r.year}</td>
                  <td className="py-2 pr-3 text-slate-700">{MONTH_NAMES_ID[r.month - 1]}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-800">{formatRupiah(r.klinik)}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-800">{formatRupiah(r.nonKlinik)}</td>
                  <td className="py-2 text-right font-mono tabular-nums font-bold text-slate-900">{formatRupiah(r.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold text-slate-900">
                <th scope="row" colSpan={2} className="py-2 pr-3 text-left">Total Periode</th>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatRupiah(totals.klinik)}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatRupiah(totals.nonKlinik)}</td>
                <td className="py-2 text-right font-mono tabular-nums">{formatRupiah(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
