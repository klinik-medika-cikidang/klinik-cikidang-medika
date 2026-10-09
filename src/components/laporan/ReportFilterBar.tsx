'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Funnel,
  ArrowCounterClockwise,
  UserCheck,
  Stethoscope,
  CaretDown,
  Check,
  CalendarBlank,
  Heartbeat,
} from '@phosphor-icons/react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { formatDateIndo } from '@/lib/utils';
import { VISIT_CATEGORY_LABELS, VISIT_CATEGORY_VALUES } from '@/constants/clinic';

const KATEGORI_OPTIONS = [
  { id: 'Semua', label: 'Semua Kategori' },
  ...VISIT_CATEGORY_VALUES.map((value) => ({ id: value, label: VISIT_CATEGORY_LABELS[value] })),
];

interface DoctorOption {
  id: string;
  nama: string;
}

interface ReportFilterBarProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  jenisPasien: string;
  onJenisPasienChange: (val: string) => void;
  kategoriProgram: string;
  onKategoriProgramChange: (val: string) => void;
  dokterId: string;
  onDokterIdChange: (val: string) => void;
  doctorsList: DoctorOption[];
  onApplyFilter: () => void;
  onResetFilter: () => void;
  isLoading?: boolean;
}

export function ReportFilterBar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  jenisPasien,
  onJenisPasienChange,
  kategoriProgram,
  onKategoriProgramChange,
  dokterId,
  onDokterIdChange,
  doctorsList,
  onApplyFilter,
  onResetFilter,
  isLoading,
}: ReportFilterBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<'jenis' | 'kategori' | 'dokter' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getJenisLabel = (val: string) => {
    if (val === 'UMUM') return 'Pasien UMUM (Tunai / TF)';
    if (val === 'BPJS') return 'Pasien BPJS Kesehatan';
    return 'Semua Pasien (Umum & BPJS)';
  };

  const getDokterLabel = (id: string) => {
    if (id === 'Semua') return 'Semua Dokter';
    const found = doctorsList.find((d) => d.id === id);
    return found ? found.nama : 'Semua Dokter';
  };

  const getKategoriLabel = (val: string) => {
    const found = KATEGORI_OPTIONS.find((opt) => opt.id === val);
    return found ? found.label : 'Semua Kategori';
  };

  const selectClass =
    'w-full px-3 py-1.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-300 rounded-xl flex items-center justify-between text-left text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none min-h-[44px] sm:min-h-[38px] transition';

  return (
    <div
      ref={dropdownRef}
      className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double tactile-card space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100/80 flex items-center justify-center text-teal-600 shrink-0">
            <Funnel weight="duotone" className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">Filter Parameter Laporan</h3>
            <p className="text-[11px] text-slate-500">
              Saring rekapan kunjungan, morbiditas, dan arus kas berdasarkan parameter
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-600">
            <CalendarBlank weight="duotone" className="w-3.5 h-3.5 text-teal-600" />
            <span>
              {startDate && endDate
                ? startDate === endDate
                  ? formatDateIndo(startDate)
                  : `${formatDateIndo(startDate)} s.d. ${formatDateIndo(endDate)}`
                : 'Semua Periode Data'}
            </span>
          </span>
          {(jenisPasien !== 'Semua' || kategoriProgram !== 'Semua' || dokterId !== 'Semua') && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-100 text-[10px] font-bold text-teal-700">
              Filter Khusus
            </span>
          )}
        </div>
      </div>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onChange={(start, end) => {
          onStartDateChange(start);
          onEndDateChange(end);
        }}
        isLoading={isLoading}
        idPrefix="report-filter"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <UserCheck weight="duotone" className="w-3.5 h-3.5 text-slate-400" />
            <span>Jenis Pasien</span>
          </label>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={activeDropdown === 'jenis'}
            onClick={() => setActiveDropdown(activeDropdown === 'jenis' ? null : 'jenis')}
            className={selectClass}
          >
            <span className="truncate">{getJenisLabel(jenisPasien)}</span>
            <CaretDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                activeDropdown === 'jenis' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {activeDropdown === 'jenis' && (
            <div
              role="listbox"
              className="absolute top-full mt-1 inset-x-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-popover p-1.5 space-y-1 animate-popover"
            >
              {[
                { id: 'Semua', label: 'Semua Pasien (Umum & BPJS)' },
                { id: 'UMUM', label: 'Pasien UMUM (Tunai / TF)' },
                { id: 'BPJS', label: 'Pasien BPJS Kesehatan' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={jenisPasien === opt.id}
                  onClick={() => {
                    onJenisPasienChange(opt.id);
                    setActiveDropdown(null);
                  }}
                  className={`w-full min-h-[44px] flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition text-left focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
                    jenisPasien === opt.id
                      ? 'bg-teal-50 text-teal-900 font-bold'
                      : 'hover:bg-slate-100 text-slate-700 font-medium'
                  }`}
                >
                  <span>{opt.label}</span>
                  {jenisPasien === opt.id && <Check className="w-3.5 h-3.5 text-teal-600" weight="bold" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Stethoscope weight="duotone" className="w-3.5 h-3.5 text-slate-400" />
            <span>Dokter Pemeriksa</span>
          </label>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={activeDropdown === 'dokter'}
            onClick={() => setActiveDropdown(activeDropdown === 'dokter' ? null : 'dokter')}
            className={selectClass}
          >
            <span className="truncate">{getDokterLabel(dokterId)}</span>
            <CaretDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                activeDropdown === 'dokter' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {activeDropdown === 'dokter' && (
            <div
              role="listbox"
              className="absolute top-full mt-1 inset-x-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-popover p-1.5 space-y-1 animate-popover max-h-56 overflow-y-auto"
            >
              {[{ id: 'Semua', nama: 'Semua Dokter' }, ...doctorsList].map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  role="option"
                  aria-selected={dokterId === doc.id}
                  onClick={() => {
                    onDokterIdChange(doc.id);
                    setActiveDropdown(null);
                  }}
                  className={`w-full min-h-[44px] flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition text-left focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
                    dokterId === doc.id
                      ? 'bg-teal-50 text-teal-900 font-bold'
                      : 'hover:bg-slate-100 text-slate-700 font-medium'
                  }`}
                >
                  <span>{doc.nama}</span>
                  {dokterId === doc.id && <Check className="w-3.5 h-3.5 text-teal-600" weight="bold" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Heartbeat weight="duotone" className="w-3.5 h-3.5 text-slate-400" />
            <span>Kategori Program</span>
          </label>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={activeDropdown === 'kategori'}
            onClick={() => setActiveDropdown(activeDropdown === 'kategori' ? null : 'kategori')}
            className={selectClass}
          >
            <span className="truncate">{getKategoriLabel(kategoriProgram)}</span>
            <CaretDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                activeDropdown === 'kategori' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {activeDropdown === 'kategori' && (
            <div
              role="listbox"
              className="absolute top-full mt-1 inset-x-0 z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-popover p-1.5 space-y-1 animate-popover max-h-56 overflow-y-auto"
            >
              {KATEGORI_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={kategoriProgram === opt.id}
                  onClick={() => {
                    onKategoriProgramChange(opt.id);
                    setActiveDropdown(null);
                  }}
                  className={`w-full min-h-[44px] flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition text-left focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
                    kategoriProgram === opt.id
                      ? 'bg-teal-50 text-teal-900 font-bold'
                      : 'hover:bg-slate-100 text-slate-700 font-medium'
                  }`}
                >
                  <span>{opt.label}</span>
                  {kategoriProgram === opt.id && <Check className="w-3.5 h-3.5 text-teal-600" weight="bold" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onResetFilter}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs tactile-btn transition flex-1 sm:flex-initial focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50"
        >
          <ArrowCounterClockwise weight="bold" className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset Filter</span>
        </button>

        <button
          type="button"
          onClick={onApplyFilter}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 border border-teal-700/80 shadow-btn-primary tactile-btn transition flex-1 sm:flex-initial disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
        >
          <Funnel weight="bold" className="w-3.5 h-3.5" />
          <span>Terapkan Filter</span>
        </button>
      </div>
    </div>
  );
}

export default ReportFilterBar;
