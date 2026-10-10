'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DownloadSimple, WarningCircle, ArrowClockwise, FolderOpen } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { PUBLIC_HEALTH_PROGRAM_LABELS, PUBLIC_HEALTH_PROGRAM_ORDER } from '@/constants/clinic';
import { describePeriod } from '@/lib/utils';
import {
  exportPuskesmasRegisterToExcel,
  puskesmasColumnsFor,
  type PuskesmasRegisterExportRow,
} from '@/lib/excel';

const PAGE_SIZE = 1000;

interface PuskesmasReportPanelProps {
  startDate: string;
  endDate: string;
  isLoading?: boolean;
}

function text(value: unknown, fallback = '-') {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  return raw || fallback;
}

export function PuskesmasReportPanel({
  startDate,
  endDate,
  isLoading: externalLoading,
}: PuskesmasReportPanelProps) {
  const [activeProgram, setActiveProgram] = useState<string>(PUBLIC_HEALTH_PROGRAM_ORDER[0]);
  const [rows, setRows] = useState<PuskesmasRegisterExportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRegister = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const collected: PuskesmasRegisterExportRow[] = [];
      let page = 0;

      while (true) {
        let query = supabase
          .from('public_health_records')
          .select(
            'id, program_type, tanggal_periksa, no_rm, desa, nama, jenis_kelamin, ttl, alamat, no_nik, diagnosa, lab, terapi, hbsag, gpa, uk, tp, hiv, syphilis, jenis_kb, tanggal_kembali, visits(tanggal_periksa, bulan, kode_icd10, doctors(nama)), patients(no_rm, gelar, usia, desa, alamat, no_ktp, no_bpjs)'
          )
          .order('tanggal_periksa', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (startDate) query = query.gte('tanggal_periksa', startDate);
        if (endDate) query = query.lte('tanggal_periksa', endDate);

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        data.forEach((record: any) => {
          const visit = record.visits || {};
          const patient = record.patients || {};
          collected.push({
            program_type: record.program_type,
            no_rm: text(record.no_rm, text(patient.no_rm)),
            gelar_jk: text(patient.gelar),
            nama: text(record.nama, text(record.no_rm, text(patient.no_rm, 'Tanpa Nama'))),
            jenis_kelamin: text(record.jenis_kelamin || patient.jenis_kelamin),
            tanggal_lahir: text(patient.tanggal_lahir || record.ttl),
            usia: patient.usia === null || patient.usia === undefined ? '-' : String(patient.usia),
            desa: text(record.desa, text(patient.desa)),
            alamat: text(record.alamat || patient.alamat),
            no_ktp: text(record.no_nik || patient.no_ktp),
            no_bpjs: text(patient.no_bpjs),
            tanggal_periksa: text(record.tanggal_periksa, text(visit.tanggal_periksa)),
            bulan: text(visit.bulan),
            kode_icd10: text(visit.kode_icd10),
            petugas: text(visit.doctors?.nama),
            anamnesa: text(record.lab, text(record.diagnosa)),
            diagnosa: text(record.diagnosa),
            gpa: text(record.gpa),
            uk: text(record.uk),
            tp: text(record.tp),
            terapi: text(record.terapi),
            hiv: text(record.hiv),
            syphilis: text(record.syphilis),
            hbsag: text(record.hbsag),
            jenis_kb: text(record.jenis_kb, text(record.terapi)),
            kunjungan_kembali: text(record.tanggal_kembali),
          });
        });

        if (data.length < PAGE_SIZE) break;
        page += 1;
      }

      setRows(collected);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gagal memuat register kesehatan dari server.';
      setErrorMessage(message);
      setRows([]);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRegister();
  }, [fetchRegister]);

  const countsByProgram = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((row) => {
      counts[row.program_type] = (counts[row.program_type] || 0) + 1;
    });
    return counts;
  }, [rows]);

  const programRows = useMemo(
    () => rows.filter((row) => row.program_type === activeProgram),
    [rows, activeProgram]
  );

  const columns = useMemo(() => puskesmasColumnsFor(activeProgram), [activeProgram]);
  const isBusy = isLoading || Boolean(externalLoading);
  const periodLabel = describePeriod(startDate, endDate);
  const dateRange = { start: startDate || 'Awal', end: endDate || 'Akhir' };

  const handleExport = () => {
    try {
      exportPuskesmasRegisterToExcel(rows, dateRange);
      toast.success(`Laporan Puskesmas (${rows.length} catatan) berhasil diunduh.`);
    } catch {
      toast.error('Gagal mengunduh file Excel.');
    }
  };

  return (
    <div className="space-y-5 min-w-0 w-full">
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchRegister}
            className="font-semibold underline hover:no-underline shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double tactile-card overflow-hidden min-w-0">
        <header className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FolderOpen weight="duotone" className="w-4 h-4 text-teal-600" />
              <h4 className="text-xs font-bold text-slate-900">Laporan Puskesmas</h4>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Register {PUBLIC_HEALTH_PROGRAM_LABELS[activeProgram] || activeProgram} untuk periode {periodLabel}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchRegister}
              disabled={isBusy}
              title="Muat ulang register"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/90 tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <ArrowClockwise className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin text-teal-600' : ''}`} weight="bold" />
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isBusy || rows.length === 0}
              className="inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 min-h-[44px] sm:min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
              <span>Unduh (.xlsx)</span>
            </button>
          </div>
        </header>

        <div className="px-4 py-3 border-b border-slate-100">
          <div
            role="tablist"
            aria-label="Program kesehatan"
            className="grid gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/90"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
          >
            {PUBLIC_HEALTH_PROGRAM_ORDER.map((program) => {
              const isActive = program === activeProgram;
              return (
                <button
                  key={program}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveProgram(program)}
                  className={`min-h-[44px] sm:min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
                    isActive
                      ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
                  }`}
                >
                  <span className="truncate">{program}</span>
                  <span
                    className={`shrink-0 px-1.5 rounded-full text-[10px] font-bold border ${
                      isActive ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    {countsByProgram[program] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {isBusy && !hasLoaded ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : programRows.length === 0 ? (
          <p className="p-4 text-xs text-slate-500">
            Program {activeProgram} belum memiliki catatan pada {periodLabel}. Ubah periode atau pilih program lain.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1024px] border-collapse">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      scope="col"
                      className="sticky top-0 z-10 px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left bg-slate-50 border-b border-slate-200 whitespace-nowrap"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {programRows.map((row, index) => (
                  <tr key={`${row.no_rm}-${row.tanggal_periksa}-${index}`} className="hover:bg-slate-50/80">
                    {columns.map((column) => {
                      const value = text(row[column.key]);
                      const isNumericColumn = ['no_rm', 'tanggal_lahir', 'usia', 'no_ktp', 'no_bpjs', 'kode_icd10'].includes(
                        String(column.key)
                      );
                      return (
                        <td
                          key={String(column.key)}
                          className={`px-3 py-2 text-xs align-top ${
                            isNumericColumn
                              ? 'font-mono tabular-nums text-slate-900 whitespace-nowrap'
                              : 'text-slate-700'
                          }`}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PuskesmasReportPanel;
