'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarBlank, Info, WarningCircle } from '@phosphor-icons/react';
import { formatLocalDateToYMD } from '@/lib/utils';

export type PeriodMode = 'single' | 'range';
export type PeriodPreset = 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
  idPrefix?: string;
  showPresets?: boolean;
}

function toDateInputValue(date: Date) {
  return formatLocalDateToYMD(date);
}

function presetRange(preset: Exclude<PeriodPreset, 'custom'>) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'this_month':
      return {
        start: toDateInputValue(new Date(year, month, 1)),
        end: toDateInputValue(new Date(year, month + 1, 0)),
      };
    case 'last_month':
      return {
        start: toDateInputValue(new Date(year, month - 1, 1)),
        end: toDateInputValue(new Date(year, month, 0)),
      };
    case 'this_year':
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    default:
      return { start: '', end: '' };
  }
}

// A period is only applied once it can be filtered by. Half a range is not a period,
// so it is held in local draft state instead of triggering a query and a reload flash
// on every intermediate click.
function isApplicable(start: string, end: string) {
  if (!start && !end) return true;
  if (!start || !end) return false;
  return end >= start;
}

const inputClass =
  'w-full px-3 py-1.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none transition min-h-[44px] sm:min-h-[38px]';

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  isLoading,
  idPrefix = 'period',
  showPresets = true,
}: DateRangePickerProps) {
  const [mode, setMode] = useState<PeriodMode>('range');
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);

  // Props change only when an applicable period is applied, so sync here rather than on
  // every keystroke. A half-finished selection stays in the draft.
  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
  }, [startDate, endDate]);

  const activePreset = useMemo<PeriodPreset>(() => {
    const presets: Exclude<PeriodPreset, 'custom'>[] = ['this_month', 'last_month', 'this_year', 'all'];
    for (const preset of presets) {
      const range = presetRange(preset);
      if (range.start === startDate && range.end === endDate) return preset;
    }
    return 'custom';
  }, [startDate, endDate]);

  const apply = (start: string, end: string) => {
    if (!isApplicable(start, end)) return;
    onChange(start, end);
  };

  const updateDraft = (start: string, end: string) => {
    setDraftStart(start);
    setDraftEnd(end);
    apply(start, end);
  };

  const isIncompleteRange =
    mode === 'range' && Boolean(draftStart) !== Boolean(draftEnd) && !(draftStart && draftEnd);
  const isReversed = Boolean(draftStart && draftEnd && draftEnd < draftStart);

  const handleModeChange = (nextMode: PeriodMode) => {
    setMode(nextMode);
    if (nextMode === 'single' && draftStart && draftEnd && draftStart !== draftEnd) {
      updateDraft(draftStart, draftStart);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100/80 flex items-center justify-center text-teal-600 shrink-0">
            <CalendarBlank weight="duotone" className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">Periode Laporan</h3>
            <p className="text-[11px] text-slate-500">Pilih satu tanggal, atau satu rentang tanggal</p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Mode periode"
          className="bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/90 shadow-2xs self-start sm:self-auto"
        >
          <div className="grid grid-cols-2 gap-0.5">
            {(
              [
                { id: 'single' as PeriodMode, label: 'Satu Tanggal' },
                { id: 'range' as PeriodMode, label: 'Rentang Tanggal' },
              ]
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={mode === option.id}
                disabled={isLoading}
                onClick={() => handleModeChange(option.id)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all tactile-btn whitespace-nowrap focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 ${
                  mode === option.id
                    ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mode === 'single' ? (
          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-single`} className="text-xs font-bold text-slate-700">
              Tanggal
            </label>
            <input
              id={`${idPrefix}-single`}
              type="date"
              value={draftStart}
              disabled={isLoading}
              onChange={(event) => updateDraft(event.target.value, event.target.value)}
              className={inputClass}
            />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor={`${idPrefix}-start`} className="text-xs font-bold text-slate-700">
                Tanggal Mulai
              </label>
              <input
                id={`${idPrefix}-start`}
                type="date"
                value={draftStart}
                disabled={isLoading}
                aria-invalid={isReversed}
                onChange={(event) => updateDraft(event.target.value, draftEnd)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${idPrefix}-end`} className="text-xs font-bold text-slate-700">
                Tanggal Selesai
              </label>
              <input
                id={`${idPrefix}-end`}
                type="date"
                value={draftEnd}
                disabled={isLoading}
                aria-invalid={isReversed}
                onChange={(event) => updateDraft(draftStart, event.target.value)}
                className={inputClass}
              />
            </div>
          </>
        )}
      </div>

      {isReversed && (
        <p role="alert" className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600">
          <WarningCircle weight="duotone" className="w-3.5 h-3.5 shrink-0" />
          Tanggal selesai tidak boleh lebih awal dari tanggal mulai.
        </p>
      )}

      {!isReversed && isIncompleteRange && (
        <p role="status" className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
          <Info weight="duotone" className="w-3.5 h-3.5 shrink-0 text-teal-600" />
          {draftStart
            ? 'Lengkapi tanggal selesai untuk menerapkan periode.'
            : 'Lengkapi tanggal mulai untuk menerapkan periode.'}
        </p>
      )}

      {showPresets && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Preset
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0.5 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/90 shadow-2xs w-full sm:w-auto">
            {(
              [
                { id: 'this_month' as const, label: 'Bulan Ini' },
                { id: 'last_month' as const, label: 'Bulan Lalu' },
                { id: 'this_year' as const, label: `Tahun ${new Date().getFullYear()}` },
                { id: 'all' as const, label: 'Semua Data' },
              ]
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={isLoading}
                aria-pressed={activePreset === preset.id}
                onClick={() => {
                  const range = presetRange(preset.id);
                  updateDraft(range.start, range.end);
                }}
                className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all tactile-btn whitespace-nowrap focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 ${
                  activePreset === preset.id
                    ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
