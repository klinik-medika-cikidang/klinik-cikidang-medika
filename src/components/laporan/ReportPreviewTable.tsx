'use client';

import React, { useState, useMemo } from 'react';
import {
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { formatRupiah } from '@/lib/utils';
import { Select } from '@/components/ui/Select';
import type {
  VisitExportRow,
  CashFlowExportRow,
  MorbidityExportRow,
} from '@/lib/excel';
import type { ReportTabType } from './ReportTabs';

interface ReportPreviewTableProps {
  activeTab: ReportTabType;
  visitsData: VisitExportRow[];
  morbidityData: MorbidityExportRow[];
  cashFlowData: CashFlowExportRow[];
  isLoading?: boolean;
}

export function ReportPreviewTable({
  activeTab,
  visitsData,
  morbidityData,
  cashFlowData,
  isLoading,
}: ReportPreviewTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (activeTab === 'kunjungan') {
      if (!q) return visitsData;
      return visitsData.filter(
        (v) =>
          v.nama_pasien.toLowerCase().includes(q) ||
          v.no_rm.toLowerCase().includes(q) ||
          v.desa.toLowerCase().includes(q) ||
          v.kode_icd10.toLowerCase().includes(q) ||
          v.diagnosa_deskripsi.toLowerCase().includes(q) ||
          v.nama_dokter.toLowerCase().includes(q)
      );
    }

    if (activeTab === 'morbiditas') {
      if (!q) return morbidityData;
      return morbidityData.filter(
        (m) =>
          m.kode_icd10.toLowerCase().includes(q) ||
          m.diagnosa_deskripsi.toLowerCase().includes(q)
      );
    }

    if (activeTab === 'buku_kas') {
      if (!q) return cashFlowData;
      return cashFlowData.filter(
        (c) =>
          c.kategori.toLowerCase().includes(q) ||
          c.keterangan.toLowerCase().includes(q) ||
          c.jenis.toLowerCase().includes(q)
      );
    }

    return [];
  }, [activeTab, visitsData, morbidityData, cashFlowData, searchQuery]);

  const totalRows = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = filteredData.slice(startIndex, startIndex + pageSize);

  const visitsSummary = useMemo(() => {
    let totalBiaya = 0;
    let umumCount = 0;
    let bpjsCount = 0;

    visitsData.forEach((v) => {
      totalBiaya += v.total_biaya || 0;
      if (v.jenis_pasien === 'BPJS') bpjsCount++;
      else umumCount++;
    });

    return { totalBiaya, umumCount, bpjsCount };
  }, [visitsData]);

  const cashFlowSummary = useMemo(() => {
    let totalMasuk = 0;
    let totalKeluar = 0;

    cashFlowData.forEach((c) => {
      if (c.jenis === 'Masuk') totalMasuk += c.nominal || 0;
      if (c.jenis === 'Keluar') totalKeluar += c.nominal || 0;
    });

    return { totalMasuk, totalKeluar, net: totalMasuk - totalKeluar };
  }, [cashFlowData]);

  const morbiditySummary = useMemo(() => {
    let totalCases = 0;
    morbidityData.forEach((m) => {
      totalCases += m.jumlah_kasus || 0;
    });
    return { totalCases };
  }, [morbidityData]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-card-double space-y-4 animate-pulse">
        <div className="h-6 w-56 bg-slate-200 rounded"></div>
        <div className="h-10 bg-slate-100 rounded-xl"></div>
        <div className="space-y-2 pt-2">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-10 bg-slate-50 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double overflow-hidden flex flex-col justify-between">
      {/* Table Toolbar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/60">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass
            weight="bold"
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Cari data pada tabel..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 min-h-[38px] text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <XCircle className="w-4 h-4" weight="fill" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 justify-between sm:justify-end">
          <span className="text-[11px] font-medium text-slate-500 shrink-0">
            Tampilkan per halaman:
          </span>
          <div className="w-32">
            <Select
              size="sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              searchable={false}
              headerTitle="Jumlah Baris"
              options={[
                { value: 15, label: '15 baris' },
                { value: 25, label: '25 baris' },
                { value: 50, label: '50 baris' },
                { value: 100, label: '100 baris' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Bounded scroll container so the header row stays visible while the body scrolls,
          and wide tables scroll here instead of pushing the page sideways. */}
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh] w-full">
        {pageRows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <WarningCircle weight="duotone" className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Tidak ada data ditemukan</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Cobalah mengatur ulang parameter filter tanggal atau kata kunci pencarian.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-600">
            {activeTab === 'kunjungan' && (
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/90 select-none whitespace-nowrap">
                <tr>
                  <th className="py-3 px-3.5">No RM</th>
                  <th className="py-3 px-3.5">Nama Pasien</th>
                  <th className="py-3 px-3.5">L/P</th>
                  <th className="py-3 px-3.5">Desa</th>
                  <th className="py-3 px-3.5">Tgl Periksa</th>
                  <th className="py-3 px-3.5">Tgl Bayar</th>
                  <th className="py-3 px-3.5">Dokter</th>
                  <th className="py-3 px-3.5">Diagnosa ICD-10</th>
                  <th className="py-3 px-3.5">Jenis Pasien</th>
                  <th className="py-3 px-3.5 text-right">Tagihan (tgl periksa)</th>
                </tr>
              </thead>
            )}

            {activeTab === 'morbiditas' && (
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/90 select-none whitespace-nowrap">
                <tr>
                  <th className="py-3 px-3.5 w-16 text-center">Peringkat</th>
                  <th className="py-3 px-3.5">Kode ICD-10</th>
                  <th className="py-3 px-3.5">Nama Diagnosa Medis</th>
                  <th className="py-3 px-3.5 text-right">Jumlah Kasus</th>
                  <th className="py-3 px-3.5 text-right">Persentase</th>
                </tr>
              </thead>
            )}

            {activeTab === 'buku_kas' && (
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/90 select-none whitespace-nowrap">
                <tr>
                  <th className="py-3 px-3.5">Tanggal</th>
                  <th className="py-3 px-3.5">Jenis</th>
                  <th className="py-3 px-3.5">Kategori Arus Kas</th>
                  <th className="py-3 px-3.5">Keterangan</th>
                  <th className="py-3 px-3.5 text-right">Nominal (Rp)</th>
                </tr>
              </thead>
            )}

            <tbody className="divide-y divide-slate-100 whitespace-nowrap">
              {activeTab === 'kunjungan' &&
                (pageRows as VisitExportRow[]).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-teal-700">
                      <span className="bg-teal-50 text-teal-700 border border-teal-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                        {row.no_rm}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900">
                      {row.nama_pasien}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500">{row.jenis_kelamin}</td>
                    <td className="py-3 px-3.5 text-slate-600">{row.desa}</td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                      {row.tanggal_periksa}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                      {row.tanggal_bayar}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-700">
                      {row.nama_dokter}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200/80 px-1.5 py-0.5 rounded text-[11px] mr-1.5">
                        {row.kode_icd10 || '-'}
                      </span>
                      <span className="truncate inline-block max-w-xs align-bottom text-slate-800">
                        {row.diagnosa_deskripsi || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          row.jenis_pasien === 'BPJS'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200/80'
                            : 'bg-teal-50 text-teal-700 border border-teal-200/80'
                        }`}
                      >
                        {row.jenis_pasien}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(row.total_biaya)}
                    </td>
                  </tr>
                ))}

              {activeTab === 'morbiditas' &&
                (pageRows as MorbidityExportRow[]).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-500">
                      #{row.rank}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-teal-700">
                      <span className="bg-teal-50 text-teal-700 border border-teal-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                        {row.kode_icd10}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900">
                      {row.diagnosa_deskripsi}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                      {row.jumlah_kasus.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-600">
                      {row.persentase.toFixed(2)}%
                    </td>
                  </tr>
                ))}

              {activeTab === 'buku_kas' &&
                (pageRows as CashFlowExportRow[]).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                      {row.tanggal}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          row.jenis === 'Masuk'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        }`}
                      >
                        {row.jenis}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900">
                      {row.kategori}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 truncate max-w-xs">
                      {row.keterangan || '-'}
                    </td>
                    <td
                      className={`py-3 px-3.5 text-right font-mono font-bold ${
                        row.jenis === 'Masuk' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {row.jenis === 'Masuk' ? '+' : '-'} {formatRupiah(row.nominal)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Summary Banner with Metric Chips & Tactile Steppers */}
      <div className="p-3.5 sm:p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-600 font-medium">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-slate-700 font-medium shadow-2xs">
            <span>Total Data:</span>
            <strong className="text-slate-900 font-mono font-bold">{totalRows.toLocaleString('id-ID')}</strong>
            <span>baris</span>
          </span>

          {activeTab === 'kunjungan' && (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200/80 text-teal-800 font-medium shadow-2xs">
                <span>Umum:</span>
                <strong className="font-mono font-bold">{visitsSummary.umumCount}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200/80 text-teal-800 font-medium shadow-2xs">
                <span>BPJS:</span>
                <strong className="font-mono font-bold">{visitsSummary.bpjsCount}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-medium shadow-2xs">
                <span>Total Tagihan (tgl periksa):</span>
                <strong className="font-mono font-bold">{formatRupiah(visitsSummary.totalBiaya)}</strong>
              </span>
            </>
          )}

          {activeTab === 'morbiditas' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200/80 text-teal-800 font-medium shadow-2xs">
              <span>Total Kasus Morbiditas:</span>
              <strong className="font-mono font-bold">{morbiditySummary.totalCases.toLocaleString('id-ID')}</strong>
            </span>
          )}

          {activeTab === 'buku_kas' && (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-medium shadow-2xs">
                <span>Masuk:</span>
                <strong className="font-mono font-bold">{formatRupiah(cashFlowSummary.totalMasuk)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-800 font-medium shadow-2xs">
                <span>Keluar:</span>
                <strong className="font-mono font-bold">{formatRupiah(cashFlowSummary.totalKeluar)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-800 font-medium shadow-2xs">
                <span>Saldo Bersih:</span>
                <strong className="font-mono font-bold">{formatRupiah(cashFlowSummary.net)}</strong>
              </span>
            </>
          )}
        </div>

        {/* Tactile Pagination Steppers */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <span className="text-slate-500 text-[11px] font-medium font-mono">
            Halaman {safePage} dari {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={safePage <= 1}
            aria-label="Halaman sebelumnya"
            className="p-2 min-h-[38px] min-w-[38px] inline-flex items-center justify-center bg-white border border-slate-300 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition shadow-btn-secondary tactile-btn"
          >
            <CaretLeft weight="bold" className="w-4 h-4 text-slate-700" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={safePage >= totalPages}
            aria-label="Halaman selanjutnya"
            className="p-2 min-h-[38px] min-w-[38px] inline-flex items-center justify-center bg-white border border-slate-300 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition shadow-btn-secondary tactile-btn"
          >
            <CaretRight weight="bold" className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportPreviewTable;
