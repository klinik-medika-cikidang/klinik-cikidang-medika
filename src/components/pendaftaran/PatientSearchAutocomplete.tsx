'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MagnifyingGlass,
  CircleNotch,
  UserPlus,
  X,
  MapPin,
  NotePencil,
  ShieldWarning,
} from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import type { Patient } from '@/types/database';
import { cn, formatDateShort } from '@/lib/utils';

export interface PatientSearchAutocompleteProps {
  onSelectPatient: (patient: Patient) => void;
  onEditPatient?: (patient: Patient) => void;
  onAddNewPatient: () => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function PatientSearchAutocomplete({
  onSelectPatient,
  onEditPatient,
  onAddNewPatient,
  className,
  placeholder = 'Cari pasien berdasarkan Nama, No RM, atau Desa...',
  autoFocus = false,
}: PatientSearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    let isCurrent = true;

    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        // Remove commas and parentheses to prevent PostgREST URI syntax parse errors
        const cleanQuery = trimmed.replace(/[,()]/g, '');

        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .or(`nama.ilike.%${cleanQuery}%,no_rm.ilike.%${cleanQuery}%,desa.ilike.%${cleanQuery}%`)
          .order('nama', { ascending: true })
          .limit(10);

        if (!isCurrent) return;

        if (error) {
          console.error('Error searching patients:', error.message);
          setResults([]);
        } else {
          setResults((data as unknown as Patient[]) || []);
        }
      } catch (err) {
        if (!isCurrent) return;
        console.error('Unexpected error searching patients:', err);
        setResults([]);
      } finally {
        if (isCurrent) {
          setIsLoading(false);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleSelectPatient = (patient: Patient) => {
    onSelectPatient(patient);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleAddNewPatient = () => {
    setIsOpen(false);
    onAddNewPatient();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (!isOpen) return;

    if (results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectPatient(results[selectedIndex]);
        }
      }
    } else if (!isLoading && query.trim().length >= 2 && e.key === 'Enter') {
      e.preventDefault();
      handleAddNewPatient();
    }
  };

  const hasSearchQuery = query.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn('relative w-full', isOpen && hasSearchQuery ? 'z-40' : '', className)}>
      <div className="relative flex items-center bg-white rounded-xl border border-slate-200 shadow-xs transition-all focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100 min-h-[44px]">
        <div className="pl-3.5 pr-2 flex items-center justify-center text-slate-400 pointer-events-none">
          <MagnifyingGlass className="w-4 h-4" weight="duotone" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (hasSearchQuery) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Pencarian cepat pasien"
          aria-autocomplete="list"
          aria-expanded={isOpen && hasSearchQuery}
          className="w-full py-2.5 pr-8 text-sm sm:text-xs text-slate-900 placeholder-slate-400 bg-transparent outline-none min-h-[44px]"
        />

        <div className="pr-3 flex items-center gap-1.5 shrink-0">
          {isLoading ? (
            <CircleNotch className="w-4 h-4 text-teal-600 animate-spin" weight="bold" />
          ) : query.length === 0 ? (
            <kbd
              className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded select-none cursor-pointer hover:bg-slate-200 hover:text-slate-600 transition"
              onClick={() => inputRef.current?.focus()}
              title="Tekan tombol '/' di keyboard untuk mencari pasien"
            >
              /
            </kbd>
          ) : (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition min-w-[32px] min-h-[32px] flex items-center justify-center"
              title="Hapus pencarian"
              aria-label="Hapus teks pencarian"
            >
              <X className="w-4 h-4" weight="bold" />
            </button>
          )}
        </div>
      </div>

      {isOpen && hasSearchQuery && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-card-double z-50 overflow-hidden divide-y divide-slate-100">
          {results.length > 0 ? (
            <div>
              <div className="px-3 py-2 bg-slate-50 text-[11px] font-semibold text-slate-500 flex justify-between items-center">
                <span>Hasil Pencarian ({results.length} pasien)</span>
                <span className="text-[10px] text-slate-400 font-normal">Gunakan panah ↑↓ dan Enter</span>
              </div>

              <ul
                role="listbox"
                aria-label="Daftar pasien ditemukan"
                className="max-h-80 overflow-y-auto divide-y divide-slate-100"
              >
                {results.map((patient, index) => {
                  const isSelected = selectedIndex === index;
                  const fullName = [patient.gelar, patient.nama].filter(Boolean).join(' ');

                  return (
                    <li
                      key={patient.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectPatient(patient)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition select-none',
                        isSelected ? 'bg-teal-50/80 border-l-4 border-l-teal-600 pl-3' : 'hover:bg-slate-50'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {fullName}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 shrink-0">
                            {patient.no_rm}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" weight="duotone" />
                            {patient.desa}
                          </span>
                          <span>•</span>
                          <span>{patient.jenis_kelamin}</span>
                          {patient.usia !== undefined && patient.usia !== null && (
                            <>
                              <span>•</span>
                              <span>{patient.usia} thn</span>
                            </>
                          )}
                          {patient.tanggal_lahir && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[10px]">
                                Lahir: {formatDateShort(patient.tanggal_lahir)}
                              </span>
                            </>
                          )}
                          {patient.no_bpjs && (
                            <>
                              <span>•</span>
                              <span className="bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-medium border border-teal-200 text-[10px]">
                                BPJS: {patient.no_bpjs}
                              </span>
                            </>
                          )}
                          {patient.riwayat_alergi &&
                            patient.riwayat_alergi.trim() !== '' &&
                            patient.riwayat_alergi.trim().toLowerCase() !== 'tidak ada' && (
                              <>
                                <span>•</span>
                                <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold border border-red-200 text-[10px] inline-flex items-center gap-0.5">
                                  <ShieldWarning className="w-3 h-3 text-red-600" weight="fill" />
                                  Alergi: {patient.riwayat_alergi}
                                </span>
                              </>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onEditPatient && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
                              onEditPatient(patient);
                            }}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200 transition inline-flex items-center gap-1"
                            title="Edit data pasien"
                          >
                            <NotePencil className="w-3 h-3 text-slate-500" weight="bold" />
                            <span>Edit</span>
                          </button>
                        )}
                        <span className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 px-2 py-1 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 transition">
                          Pilih
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
                <span>Pasien tidak terdaftar di hasil?</span>
                <button
                  type="button"
                  onClick={handleAddNewPatient}
                  className="text-teal-700 font-semibold hover:underline inline-flex items-center gap-1.5 min-h-[36px]"
                >
                  <UserPlus className="w-3.5 h-3.5" weight="duotone" />
                  <span>Daftarkan Sebagai Pasien Baru</span>
                </button>
              </div>
            </div>
          ) : !isLoading ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <MagnifyingGlass className="w-5 h-5" weight="duotone" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-800">
                  Pasien &quot;{query}&quot; tidak ditemukan
                </p>
                <p className="text-[11px] text-slate-500">
                  Tidak ditemukan pasien yang sesuai dengan No RM, Nama, atau Desa tersebut.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddNewPatient}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-btn-primary transition w-full sm:w-auto min-h-[36px] tactile-btn"
              >
                <UserPlus className="w-3.5 h-3.5" weight="duotone" />
                <span>Daftarkan Sebagai Pasien Baru</span>
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default PatientSearchAutocomplete;
