'use client';

import React from 'react';
import Link from 'next/link';
import {
  Wallet,
  Buildings,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  CaretRight,
  Receipt,
} from '@phosphor-icons/react';
import { formatRupiah, isCashHandoverToOwnerOrBank } from '@/lib/utils';
import type { CashFlow } from '@/types/database';

export interface CashLiquidityData {
  laciCash: number;
  bankCash: number;
  todayCashIn: number;
  todayCashOut: number;
  cashRatio: number; // percentage of cash payments
  transferRatio: number; // percentage of transfer payments
  recentMutations: CashFlow[];
  /** True when laciCash starts from the month's Saldo Awal, as on "Bulan Ini". */
  includesOpeningBalance?: boolean;
}

/** Explains how the drawer estimate was built, in the same terms as the Buku Kas card. */
export function describeDrawerEstimate(laciCash: number, includesOpeningBalance: boolean): string {
  if (laciCash < 0) {
    return includesOpeningBalance
      ? 'Setoran dan pengeluaran melampaui saldo awal ditambah kas masuk tunai'
      : 'Setoran dan pengeluaran melampaui kas masuk tunai periode ini';
  }
  return includesOpeningBalance
    ? 'Saldo awal + tunai pasien dikurangi pengeluaran & setoran'
    : 'Tunai pasien dikurangi pengeluaran & setoran';
}

interface CashLiquidityCardProps {
  data: CashLiquidityData;
  isLoading?: boolean;
}

export function CashLiquidityCard({ data, isLoading }: CashLiquidityCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-pulse">
        <div className="h-5 w-40 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-slate-100 rounded-xl"></div>
          <div className="h-20 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-card-double space-y-4">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
              <Wallet className="w-5 h-5 text-emerald-700" weight="duotone" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                Likuiditas Kas Riil &amp; Bank
              </h3>
              <p className="text-[11px] text-slate-600 font-medium truncate">
                Pemisahan sisa fisik laci loket vs saldo rekening &amp; pemilik
              </p>
            </div>
          </div>
          <Link
            href="/buku-kas"
            className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
          >
            <span>Buku Kas</span>
            <CaretRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 2 Cash Buckets: Laci vs Bank */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          {/* 1. Kas Tunai Laci Kasir */}
          <div
            className={`p-3.5 rounded-xl border space-y-1.5 ${
              data.laciCash < 0
                ? 'bg-rose-50/70 border-rose-200'
                : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" weight="duotone" />
                Sisa Fisik Laci Loket
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  data.laciCash < 0
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {data.laciCash < 0 ? 'Defisit Kas Masuk' : 'Fisik Kasir'}
              </span>
            </div>
            <div
              className={`text-lg font-bold font-mono ${
                data.laciCash < 0 ? 'text-rose-700' : 'text-slate-900'
              }`}
            >
              {data.laciCash < 0
                ? `- ${formatRupiah(Math.abs(data.laciCash))}`
                : formatRupiah(data.laciCash)}
            </div>
            <p className="text-[10px] text-slate-500">
              {describeDrawerEstimate(data.laciCash, Boolean(data.includesOpeningBalance))}
            </p>
          </div>

          {/* 2. Kas Rekening Bank & Pemilik */}
          <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-teal-900 flex items-center gap-1.5">
                <Buildings className="w-3.5 h-3.5 text-teal-600" weight="duotone" />
                Rekening &amp; Setoran Pemilik
              </span>
              <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">
                Bank / Owner
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-teal-900">
              {formatRupiah(data.bankCash)}
            </div>
            <p className="text-[10px] text-teal-600/80">
              Akumulasi kapitasi, transfer &amp; setoran tunai
            </p>
          </div>
        </div>

        {/* Rasio Metode Bayar */}
        <div className="pt-3 space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-600">
            <span>Rasio Pembayaran: Tunai {data.cashRatio}%</span>
            <span>Transfer {data.transferRatio}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${data.cashRatio}%` }}
              title={`Tunai: ${data.cashRatio}%`}
            ></div>
            <div
              className="bg-teal-600 h-full transition-all"
              style={{ width: `${data.transferRatio}%` }}
              title={`Transfer: ${data.transferRatio}%`}
            ></div>
          </div>
        </div>

        {/* Mutasi Terkini */}
        <div className="pt-3 space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Mutasi Kas Terakhir
          </div>
          {data.recentMutations.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic py-2 text-center">
              Belum ada mutasi kas tercatat
            </div>
          ) : (
            <div className="space-y-1.5">
              {data.recentMutations.slice(0, 3).map((m) => {
                const isSetoran = isCashHandoverToOwnerOrBank(m);
                const isMasuk = m.jenis === 'Masuk' && !isSetoran;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSetoran ? (
                        <Buildings className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      ) : isMasuk ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {m.kategori}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(m.tanggal).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {m.keterangan ? ` • ${m.keterangan}` : ''}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`font-mono font-bold shrink-0 text-[11px] ${
                        isSetoran
                          ? 'text-indigo-700'
                          : isMasuk
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {isSetoran ? '⇄' : isMasuk ? '+' : '-'} {formatRupiah(Number(m.nominal) || 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <Link
          href="/buku-kas"
          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition min-h-[44px]"
        >
          <Receipt className="w-4 h-4" weight="duotone" />
          <span>Buka Pencatatan Kas Operasional Lengkap</span>
        </Link>
      </div>
    </div>
  );
}
