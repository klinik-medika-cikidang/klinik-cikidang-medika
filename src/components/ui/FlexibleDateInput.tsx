'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ClipboardText, X, Check } from '@phosphor-icons/react';
import { parseFlexibleDate, calculateAgeFromDob, formatDateIndo } from '@/lib/utils';
import { toast } from 'sonner';

export interface FlexibleDateInputProps {
  value: string; // ISO string 'YYYY-MM-DD' or ''
  onChange: (isoDate: string, calculatedAge?: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function FlexibleDateInput({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY (bisa copy-paste)',
  disabled = false,
  className = '',
  id,
}: FlexibleDateInputProps) {
  const [inputText, setInputText] = useState('');
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  // Synchronize internal display when value changes externally
  useEffect(() => {
    if (!value) {
      setInputText('');
      return;
    }
    // If value is YYYY-MM-DD, format as DD/MM/YYYY for user-friendly display
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [_, y, m, d] = match;
      setInputText(`${d}/${m}/${y}`);
    } else {
      setInputText(value);
    }
  }, [value]);

  const applyParsedDate = (parsedIso: string) => {
    const age = calculateAgeFromDob(parsedIso);
    onChange(parsedIso, age);
    setPasteSuccess(true);
    setTimeout(() => setPasteSuccess(false), 2000);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;

    const parsed = parseFlexibleDate(text);
    if (parsed) {
      e.preventDefault();
      applyParsedDate(parsed);
      toast.success(`Tanggal ditempel: ${formatDateIndo(parsed)}`);
    }
  };

  const handlePasteButtonClick = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        toast.info('Gunakan shortcut Ctrl+V untuk menempel tanggal di kolom input.');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error('Papan klip (clipboard) kosong.');
        return;
      }
      const parsed = parseFlexibleDate(text);
      if (parsed) {
        applyParsedDate(parsed);
        toast.success(`Berhasil menempel tanggal: ${formatDateIndo(parsed)}`);
      } else {
        toast.error(`Format tanggal "${text}" tidak dikenali. Contoh yang didukung: 15/08/1990 atau 15-08-1990.`);
      }
    } catch {
      toast.info('Gunakan shortcut Ctrl+V untuk menempel tanggal di kolom input.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputText(raw);

    if (!raw.trim()) {
      onChange('', null);
      return;
    }

    const parsed = parseFlexibleDate(raw);
    if (parsed) {
      const age = calculateAgeFromDob(parsed);
      onChange(parsed, age);
    }
  };

  const handleBlur = () => {
    if (!inputText.trim()) {
      onChange('', null);
      return;
    }
    const parsed = parseFlexibleDate(inputText);
    if (parsed) {
      applyParsedDate(parsed);
    } else if (value) {
      // Revert to current valid value display
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        setInputText(`${match[3]}/${match[2]}/${match[1]}`);
      }
    }
  };

  const handleHiddenDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      applyParsedDate(val);
    }
  };

  const handleOpenCalendar = () => {
    const el = hiddenDateRef.current;
    if (!el) return;
    try {
      if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
        (el as HTMLInputElement & { showPicker?: () => void }).showPicker!();
      } else {
        el.focus();
      }
    } catch {
      el.focus();
    }
  };

  const handleClear = () => {
    setInputText('');
    onChange('', null);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-3.5 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-colors min-h-[44px]"
        />

        {/* Hidden native date picker to allow standard browser calendar popover */}
        <input
          ref={hiddenDateRef}
          type="date"
          value={value}
          onChange={handleHiddenDateChange}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />

        {/* Action button controls */}
        <div className="absolute right-1.5 flex items-center gap-1">
          {inputText && (
            <button
              type="button"
              onClick={handleClear}
              title="Hapus tanggal"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handlePasteButtonClick}
            title="Tempel tanggal dari clipboard (WhatsApp)"
            className={`px-2 py-1.5 text-[11px] font-bold rounded-lg border transition flex items-center gap-1 min-h-[32px] ${
              pasteSuccess
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border-slate-200 hover:border-teal-300'
            }`}
          >
            {pasteSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" weight="bold" />
                <span className="hidden sm:inline">Ditempel</span>
              </>
            ) : (
              <>
                <ClipboardText className="w-3.5 h-3.5" weight="bold" />
                <span className="hidden sm:inline">Tempel</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenCalendar}
            title="Buka kalender"
            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 rounded-lg transition min-h-[32px] min-w-[32px] flex items-center justify-center"
          >
            <Calendar className="w-4 h-4 text-teal-600" weight="duotone" />
          </button>
        </div>
      </div>

      {value && (
        <p className="text-[11px] text-teal-700 font-medium px-1 flex items-center gap-1">
          <span>✓ {formatDateIndo(value)}</span>
        </p>
      )}
    </div>
  );
}

export default FlexibleDateInput;
