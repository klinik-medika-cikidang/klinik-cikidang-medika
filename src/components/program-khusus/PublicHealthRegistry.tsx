'use client';

import React, { useMemo, useState } from 'react';
import {
  DownloadSimple,
  WarningCircle,
  Heartbeat,
  Baby,
  ShieldCheck,
  FirstAid,
  CalendarBlank,
  Funnel,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatDateIndo } from '@/lib/utils';
import {
  exportPublicHealthToExcel,
  type PublicHealthExportRow,
} from '@/lib/excel';
import { classifyPtm, type PtmCategory } from '@/lib/clinical';
import type { PublicHealthProgramType, PublicHealthRecord } from '@/types/database';

interface PublicHealthRegistryProps {
  records: PublicHealthRecord[];
  isLoading?: boolean;
}

const PROGRAM_META: Record<
  PublicHealthProgramType,
  { label: string; icon: React.ElementType; accent: string }
> = {
  PTM: { label: 'PTM', icon: FirstAid, accent: 'text-rose-700 bg-rose-50 border-rose-200' },
  ANC: { label: 'ANC', icon: Baby, accent: 'text-teal-700 bg-teal-50 border-teal-200' },
  KB: { label: 'KB', icon: ShieldCheck, accent: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  ELIMINASI_3: {
    label: '3 Eliminasi',
    icon: Heartbeat,
    accent: 'text-amber-700 bg-amber-50 border-amber-200',
  },
};

const FILTERS: { id: PublicHealthProgramType | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Semua Program' },
  { id: 'PTM', label: 'PTM' },
  { id: 'ANC', label: 'ANC' },
  { id: 'KB', label: 'KB' },
  { id: 'ELIMINASI_3', label: '3 Eliminasi' },
];

const PTM_SUB_FILTERS: { id: PtmCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Semua PTM' },
  { id: 'Hipertensi', label: 'Hipertensi' },
  { id: 'Diabetes', label: 'Diabetes Melitus' },
  { id: 'Lainnya', label: 'PTM Lainnya' },
];

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function formatMonthLabel(yearMonth: string): string {
  if (yearMonth === 'ALL') return 'Semua Periode';
  const [year, month] = yearMonth.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  const name = MONTH_NAMES[monthIdx] || month;
  return `${name} ${year}`;
}

export function PublicHealthRegistry({ records, isLoading }: PublicHealthRegistryProps) {
  const currentYearMonth = useMemo(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  }, []);

  const [programFilter, setProgramFilter] = useState<PublicHealthProgramType | 'ALL'>('ALL');
  const [ptmSubFilter, setPtmSubFilter] = useState<PtmCategory | 'ALL'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentYearMonth);
    records.forEach((r) => {
      const rawDate = r.tanggal_periksa || r.created_at;
      if (rawDate && rawDate.length >= 7) {
        set.add(rawDate.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [records, currentYearMonth]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (programFilter !== 'ALL' && r.program_type !== programFilter) {
        return false;
      }

      if (selectedMonth !== 'ALL') {
        const rawDate = r.tanggal_periksa || r.created_at || '';
        if (!rawDate.startsWith(selectedMonth)) {
          return false;
        }
      }

      if (programFilter === 'PTM' && ptmSubFilter !== 'ALL') {
        const cat = classifyPtm(r);
        if (cat !== ptmSubFilter) {
          return false;
        }
      }

      return true;
    });
  }, [records, programFilter, selectedMonth, ptmSubFilter]);

  const programCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: records.length };
    records.forEach((r) => {
      counts[r.program_type] = (counts[r.program_type] || 0) + 1;
    });
    return counts;
  }, [records]);

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.error('Belum ada data program kesehatan pada periode ini untuk diunduh.');
      return;
    }

    try {
      const exportRows: PublicHealthExportRow[] = filteredRecords.map((r) => ({
        program_type: r.program_type,
        tanggal_periksa: r.tanggal_periksa
          ? formatDateIndo(r.tanggal_periksa)
          : r.created_at
          ? formatDateIndo(r.created_at)
          : '-',
        no_rm: r.no_rm || r.pasien?.no_rm || '-',
        nama: r.nama || '-',
        jenis_kelamin: r.jenis_kelamin || '-',
        ttl: r.ttl || '-',
        desa: r.desa || r.pasien?.desa || '-',
        alamat: r.alamat || '-',
        no_nik: r.no_nik || '-',
        diagnosa: r.diagnosa || '-',
        kategori_ptm: classifyPtm(r),
        gpa: r.gpa || '-',
        lab: r.lab || '-',
        terapi: r.terapi || '-',
        hbsag: r.hbsag || '-',
        hiv: r.hiv || '-',
        syphilis: r.syphilis || '-',
        jenis_kb: r.jenis_kb || '-',
        tanggal_kembali: r.tanggal_kembali ? formatDateIndo(r.tanggal_kembali) : '-',
      }));

      const periodLabel = formatMonthLabel(selectedMonth);
      const dateRange =
        selectedMonth === 'ALL'
          ? undefined
          : { start: periodLabel, end: periodLabel };

      exportPublicHealthToExcel(exportRows, dateRange);
      toast.success(
        `Laporan Puskesmas (${filteredRecords.length} data, ${periodLabel}) berhasil diunduh.`
      );
    } catch (err) {
      console.error('Error exporting public health records:', err);
      toast.error('Gagal mengunduh laporan program kesehatan.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-card-double">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setProgramFilter(f.id);
                if (f.id !== 'PTM') setPtmSubFilter('ALL');
              }}
              className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold tactile-btn transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
                programFilter === f.id
                  ? 'bg-teal-600 text-white shadow-btn-primary border border-teal-700 font-bold'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  programFilter === f.id
                    ? 'bg-teal-700/80 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {programCounts[f.id] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 min-h-[40px]">
            <CalendarBlank weight="duotone" className="w-4 h-4 text-teal-700 shrink-0" />
            <label htmlFor="period-month-select" className="text-[11px] font-bold text-slate-700 sr-only">
              Periode Bulan
            </label>
            <select
              id="period-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Semua Periode</option>
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {formatMonthLabel(ym)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isLoading || filteredRecords.length === 0}
            className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            <DownloadSimple weight="bold" className="w-4 h-4" />
            <span>Unduh Laporan Puskesmas (.xlsx)</span>
          </button>
        </div>
      </div>

      {programFilter === 'PTM' && (
        <div className="flex items-center gap-1.5 p-2 bg-rose-50/70 border border-rose-200/80 rounded-xl overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-rose-900 px-2 flex items-center gap-1 shrink-0">
            <Funnel weight="bold" className="w-3.5 h-3.5" />
            Filter PTM Puskesmas:
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {PTM_SUB_FILTERS.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setPtmSubFilter(sub.id)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition tactile-btn ${
                  ptmSubFilter === sub.id
                    ? 'bg-rose-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-rose-100/70 border border-rose-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double p-6 space-y-3 animate-pulse">
          <div className="h-6 w-52 bg-slate-200 rounded" />
          <div className="h-10 bg-slate-100 rounded-xl" />
          <div className="h-10 bg-slate-100 rounded-xl" />
          <div className="h-10 bg-slate-100 rounded-xl" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-600 shadow-card-double">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl w-fit mx-auto mb-3 border border-rose-200">
            <Heartbeat className="w-8 h-8" weight="duotone" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Belum ada data program kesehatan pada periode {formatMonthLabel(selectedMonth)}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Ganti pilihan bulan di pojok kanan atas atau klik tombol Program Kesehatan Baru untuk mencatat data baru.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Daftar Program Kesehatan
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                • {formatMonthLabel(selectedMonth)}
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg">
              {filteredRecords.length} data
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/90 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/90 whitespace-nowrap">
                <tr>
                  <th className="py-3 px-3">Program</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">No RM</th>
                  <th className="py-3 px-3">Nama Pasien</th>
                  <th className="py-3 px-3">JK</th>
                  <th className="py-3 px-3">Desa & Alamat</th>
                  <th className="py-3 px-3">Diagnosa Medis</th>
                  <th className="py-3 px-3">Keterangan Klinis (GPA / PTM / KB)</th>
                  <th className="py-3 px-3">Skrining Lab (3 Eliminasi)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                {filteredRecords.map((row) => {
                  const meta = PROGRAM_META[row.program_type];
                  const Icon = meta.icon;
                  const recordDate = row.tanggal_periksa || row.created_at;
                  const rmDisplay = row.no_rm || row.pasien?.no_rm || '-';
                  const desaDisplay = row.desa || row.pasien?.desa || '-';
                  const ptmCategory = classifyPtm(row);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${meta.accent}`}
                        >
                          <Icon className="w-3.5 h-3.5" weight="duotone" />
                          {meta.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                        {recordDate ? formatDateIndo(recordDate) : '-'}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                          {rmDisplay}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-900">{row.nama}</td>
                      <td className="py-3 px-3 text-slate-500">{row.jenis_kelamin || '-'}</td>

                      <td className="py-3 px-3 text-slate-700">
                        <div className="flex flex-col gap-0.5 max-w-[200px]">
                          <span className="font-bold text-slate-900 text-[11px]">
                            Desa {desaDisplay}
                          </span>
                          {row.alamat && (
                            <span className="text-[10px] text-slate-500 truncate" title={row.alamat}>
                              {row.alamat}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-800 font-medium max-w-[220px] truncate" title={row.diagnosa || '-'}>
                        {row.diagnosa || '-'}
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {row.program_type === 'ANC' ? (
                          <div className="flex flex-col gap-0.5">
                            {row.gpa && (
                              <span className="font-mono font-bold text-teal-800 text-[11px]">
                                GPA: {row.gpa}
                              </span>
                            )}
                            {row.terapi && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                                {row.terapi}
                              </span>
                            )}
                            {!row.gpa && !row.terapi && <span>-</span>}
                          </div>
                        ) : row.program_type === 'PTM' ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              ptmCategory === 'Hipertensi'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : ptmCategory === 'Diabetes'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {ptmCategory}
                          </span>
                        ) : row.program_type === 'KB' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800">{row.jenis_kb || '-'}</span>
                            {row.tanggal_kembali && (
                              <span className="text-[10px] font-mono text-slate-500">
                                Kembali: {formatDateIndo(row.tanggal_kembali)}
                              </span>
                            )}
                          </div>
                        ) : (
                          row.gpa ? (
                            <span className="font-mono font-bold text-teal-800 text-[11px]">
                              GPA: {row.gpa}
                            </span>
                          ) : (
                            '-'
                          )
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {row.program_type === 'ELIMINASI_3' ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                (row.hbsag || '').toLowerCase().includes('reaktif') &&
                                !(row.hbsag || '').toLowerCase().includes('non')
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              HBsAg: {row.hbsag || '-'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                (row.hiv || '').toLowerCase().includes('reaktif') &&
                                !(row.hiv || '').toLowerCase().includes('non')
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              HIV: {row.hiv || '-'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                (row.syphilis || '').toLowerCase().includes('reaktif') &&
                                !(row.syphilis || '').toLowerCase().includes('non')
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              Sifilis: {row.syphilis || '-'}
                            </span>
                          </div>
                        ) : row.program_type === 'ANC' ? (
                          row.hbsag ? (
                            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              HbSAg: {row.hbsag}
                            </span>
                          ) : (
                            '-'
                          )
                        ) : (
                          row.lab || '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="p-3.5 bg-teal-50/60 border border-teal-200/70 rounded-2xl flex items-start gap-2.5 text-[11px] text-teal-900">
        <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 mt-0.5 text-teal-700" />
        <span className="leading-relaxed">
          Data NIK, diagnosa, dan skrining lab pada halaman ini bersifat sensitif. Gunakan hanya untuk keperluan
          pelaporan resmi surveilans Puskesmas Cikidang dan jaga kerahasiaan rekam medis pasien.
        </span>
      </div>
    </div>
  );
}

export default PublicHealthRegistry;
