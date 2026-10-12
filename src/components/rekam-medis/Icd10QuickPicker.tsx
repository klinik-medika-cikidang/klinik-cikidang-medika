'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MagnifyingGlass,
  Tag,
  CheckCircle,
  X,
  Plus,
  Star,
  WarningCircle,
  Stethoscope,
  Check,
} from '@phosphor-icons/react';
import { POPULAR_ICD10, COMMON_ICD10_LIST, type Icd10Item } from '@/constants/icd10';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface DiagnosisItem {
  code: string;
  name: string;
  isPrimary: boolean;
}

export interface Icd10QuickPickerProps {
  diagnoses: DiagnosisItem[];
  onChangeDiagnoses: (diagnoses: DiagnosisItem[]) => void;
  className?: string;
}

export const ICD10_CATEGORIES = [
  'Semua',
  'Kasus Terbanyak',
  'Respirasi',
  'Pencernaan',
  'Infeksi Tropis',
  'Kardiovaskular',
  'Endokrin',
  'Kulit',
  'Mata & THT',
  'Urologi',
  'Kebidanan',
  'Saraf & Psikiatri',
  'Muskuloskeletal',
  'Trauma & Tindakan',
  'Gejala Umum',
] as const;

export type Icd10CategoryTab = (typeof ICD10_CATEGORIES)[number];

export function Icd10QuickPicker({
  diagnoses,
  onChangeDiagnoses,
  className,
}: Icd10QuickPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Icd10CategoryTab>('Semua');
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualName, setManualName] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isCodeSelected = (code: string) => {
    return diagnoses.some((d) => d.code.toUpperCase() === code.toUpperCase());
  };

  // Filter diagnoses candidates by category and search query
  const candidateList = useMemo(() => {
    let baseList: readonly Icd10Item[];

    if (activeCategory === 'Kasus Terbanyak') {
      baseList = POPULAR_ICD10;
    } else if (activeCategory === 'Semua') {
      baseList = COMMON_ICD10_LIST;
    } else if (activeCategory === 'Mata & THT') {
      baseList = COMMON_ICD10_LIST.filter(
        (item) => item.category === 'Mata' || item.category === 'THT'
      );
    } else if (activeCategory === 'Saraf & Psikiatri') {
      baseList = COMMON_ICD10_LIST.filter(
        (item) => item.category === 'Saraf' || item.category === 'Psikiatri'
      );
    } else {
      baseList = COMMON_ICD10_LIST.filter((item) => item.category === activeCategory);
    }

    if (!searchQuery.trim()) {
      return baseList;
    }

    const q = searchQuery.trim().toLowerCase();
    // When searching, match across code, name, and category
    return baseList.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
    );
  }, [activeCategory, searchQuery]);

  const handleToggleDiagnosis = (item: Icd10Item) => {
    if (isCodeSelected(item.code)) {
      handleRemoveDiagnosis(item.code);
    } else {
      handleAddDiagnosis(item.code, item.name);
    }
  };

  const handleAddDiagnosis = (code: string, name: string) => {
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    if (!cleanCode || !cleanName) return;

    if (isCodeSelected(cleanCode)) return;

    const isFirst = diagnoses.length === 0;
    const newDiagnoses: DiagnosisItem[] = [
      ...diagnoses,
      { code: cleanCode, name: cleanName, isPrimary: isFirst },
    ];
    onChangeDiagnoses(newDiagnoses);
    setSearchQuery('');
  };

  const handleRemoveDiagnosis = (code: string) => {
    const filtered = diagnoses.filter((d) => d.code.toUpperCase() !== code.toUpperCase());
    if (filtered.length > 0 && !filtered.some((d) => d.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    onChangeDiagnoses(filtered);
  };

  const handleSetPrimary = (code: string) => {
    const updated = diagnoses.map((d) => ({
      ...d,
      isPrimary: d.code.toUpperCase() === code.toUpperCase(),
    }));
    onChangeDiagnoses(updated);
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || !manualName.trim()) return;
    handleAddDiagnosis(manualCode, manualName);
    setManualCode('');
    setManualName('');
    setShowManualForm(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (candidateList.length > 0) {
        const topResult = candidateList[0];
        handleAddDiagnosis(topResult.code, topResult.name);
      } else if (searchQuery.trim().length >= 2) {
        setShowManualForm(true);
        setManualName(searchQuery.trim());
      }
    }
  };

  const primaryDiagnosis = diagnoses.find((d) => d.isPrimary);
  const secondaryDiagnoses = diagnoses.filter((d) => !d.isPrimary);

  return (
    <div className={cn('bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card-double space-y-4', className)}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100/80 shrink-0">
            <Tag className="w-5 h-5" weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>2. Diagnosa Klinis ICD-10 Standar FKTP BPJS</span>
                <span className="text-rose-500 font-extrabold">*</span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">
              Katalog 144 diagnosa primer FKTP, pencarian instan, dan kategorisasi klinis terpadu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setShowManualForm((prev) => !prev)}
            className="px-3 py-1.5 min-h-[36px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-btn-secondary tactile-btn inline-flex items-center gap-1.5"
            title="Input kode ICD-10 custom/manual jika di luar katalog standar"
          >
            <Plus className="w-3.5 h-3.5 text-teal-600" weight="bold" />
            <span>{showManualForm ? 'Tutup Input Manual' : 'Input Kode Manual'}</span>
          </button>

          <span
            className={cn(
              'text-xs font-mono font-bold px-3 py-1.5 rounded-xl border min-h-[36px] inline-flex items-center',
              diagnoses.length > 0
                ? 'bg-teal-50 text-teal-900 border-teal-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            )}
          >
            {diagnoses.length > 0 ? `${diagnoses.length} Diagnosa Terpilih` : 'Wajib 1 Diagnosa'}
          </span>
        </div>
      </div>

      {/* Manual Input Form Drawer */}
      {showManualForm && (
        <form
          onSubmit={handleAddManual}
          className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-700" weight="duotone" />
              <span className="text-xs font-bold text-teal-900">
                Input Kode ICD-10 &amp; Nama Diagnosa Medis Manual
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <input
                type="text"
                placeholder="Kode ICD (mis: K29.7)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold uppercase bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-600 min-h-[38px]"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Deskripsi Diagnosa (mis: Gastritis Kronis Eksaserbasi Akut)"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-600 min-h-[38px] font-medium"
                required
              />
            </div>
            <div>
              <Button
                type="submit"
                size="sm"
                className="w-full text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white min-h-[38px] shadow-btn-primary"
              >
                + Tambah Diagnosa
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* 2-Column Split Workbench Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch min-h-[460px]">
        {/* Left Column: ICD-10 Catalog & Fast Filtering (7 Cols on Wide Screens) */}
        <div className="xl:col-span-7 flex flex-col space-y-3 min-w-0">
          {/* Autocomplete Search Bar */}
          <div className="relative">
            <div className="relative flex items-center">
              <MagnifyingGlass
                className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none"
                weight="bold"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Cari kode atau nama penyakit (mis: ISPA, Hipertensi, K30, Gastritis, Asma)..."
                aria-label="Cari kode atau diagnosa ICD-10"
                className="w-full pl-10 pr-24 py-2 min-h-[40px] text-xs bg-slate-50/90 border border-slate-300 rounded-xl font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:bg-white transition-all outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  aria-label="Hapus kata kunci pencarian"
                >
                  <X className="w-4 h-4" weight="bold" />
                </button>
              ) : (
                <div className="absolute right-2.5 flex items-center pointer-events-none">
                  <span className="text-[10px] text-slate-500 font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs font-semibold">
                    Enter ↵
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Clinical Category Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Kategori Kasus Klinis:</span>
              <span className="font-mono text-teal-700 font-bold">
                {candidateList.length} penyakit tersedia
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {ICD10_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border shrink-0 min-h-[32px] tactile-btn',
                      isActive
                        ? 'bg-teal-600 text-white border-teal-600 shadow-btn-primary'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Candidate Diagnosis Cards Grid */}
          <div className="flex-1 overflow-y-auto max-h-[380px] xl:max-h-[460px] pr-1 border border-slate-200/80 rounded-2xl p-2.5 bg-slate-50/50 space-y-2">
            {candidateList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {candidateList.map((item) => {
                  const selected = isCodeSelected(item.code);
                  return (
                    <button
                      key={`${item.code}-${item.name}`}
                      type="button"
                      onClick={() => handleToggleDiagnosis(item)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 min-h-[56px] tactile-btn select-none',
                        selected
                          ? 'bg-teal-50/90 border-teal-500 shadow-xs ring-1 ring-teal-500/20'
                          : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-teal-400 shadow-2xs'
                      )}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <span
                          className={cn(
                            'font-mono font-extrabold text-[11px] px-2 py-0.5 rounded-md border tracking-tight',
                            selected
                              ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          )}
                        >
                          {item.code}
                        </span>

                        <div className="flex items-center gap-1">
                          {item.category && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.category}
                            </span>
                          )}

                          {selected ? (
                            <span className="text-[11px] font-bold text-teal-700 bg-teal-100/80 px-1.5 py-0.5 rounded flex items-center gap-1 border border-teal-200">
                              <Check className="w-3 h-3" weight="bold" />
                              Terpilih
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400 group-hover:text-teal-600">
                              + Pilih
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        {item.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center space-y-2 bg-white rounded-xl border border-dashed border-slate-300">
                <WarningCircle className="w-6 h-6 text-slate-400 mx-auto" weight="duotone" />
                <p className="text-xs font-semibold text-slate-700">
                  Tidak ditemukan diagnosa yang cocok dengan &quot;{searchQuery}&quot; pada kategori {activeCategory}.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {activeCategory !== 'Semua' && (
                    <button
                      type="button"
                      onClick={() => setActiveCategory('Semua')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition min-h-[34px]"
                    >
                      Cari di Semua Kategori
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualForm(true);
                      setManualName(searchQuery);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition min-h-[34px] shadow-btn-primary"
                  >
                    Tambah Manual: &quot;{searchQuery}&quot;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Diagnoses Workstation (5 Cols on Wide Screens) */}
        <div className="xl:col-span-5 bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-700" weight="duotone" />
                <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                  Diagnosa Pasien Terpilih
                </span>
              </div>
              <span
                className={cn(
                  'text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border',
                  diagnoses.length > 0
                    ? 'bg-teal-100 text-teal-900 border-teal-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                )}
              >
                {diagnoses.length} Diagnosa
              </span>
            </div>

            {diagnoses.length === 0 ? (
              <div className="p-8 text-center space-y-3 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-100">
                  <Stethoscope className="w-6 h-6" weight="duotone" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">
                    Belum Ada Diagnosa Dipilih
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Klik kartu diagnosa di sebelah kiri atau gunakan kotak pencarian untuk memasukkan diagnosa ICD-10. Pasien wajib memiliki minimal 1 diagnosa utama.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] xl:max-h-[440px] overflow-y-auto pr-1">
                {/* 1. Primary Diagnosis Card */}
                {primaryDiagnosis && (
                  <div className="p-4 bg-teal-50/90 border-2 border-teal-500 rounded-2xl shadow-xs space-y-2 relative animate-fade-in">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-teal-700 text-white rounded-full text-[10px] font-extrabold flex items-center gap-1 uppercase tracking-wider shadow-2xs">
                          <Star className="w-3 h-3 text-amber-300" weight="fill" />
                          Diagnosa Utama
                        </span>
                        <span className="font-mono text-xs font-extrabold text-teal-900 bg-white px-2 py-0.5 rounded-md border border-teal-200">
                          [{primaryDiagnosis.code}]
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDiagnosis(primaryDiagnosis.code)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus diagnosa ini"
                        aria-label={`Hapus ${primaryDiagnosis.code}`}
                      >
                        <X className="w-4 h-4" weight="bold" />
                      </button>
                    </div>

                    <div className="text-sm font-extrabold text-teal-950 leading-snug">
                      {primaryDiagnosis.name}
                    </div>

                    <p className="text-[10px] text-teal-700 font-medium">
                      Ditentukan sebagai diagnosa primer untuk klaim BPJS, Surat Sakit, dan rekam medis.
                    </p>
                  </div>
                )}

                {/* 2. Secondary Diagnoses List */}
                {secondaryDiagnoses.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Diagnosa Sekunder / Tambahan ({secondaryDiagnoses.length}):
                    </span>

                    {secondaryDiagnoses.map((diag) => (
                      <div
                        key={`${diag.code}-${diag.name}`}
                        className="p-3 bg-white border border-slate-300 rounded-xl shadow-2xs space-y-1.5 transition hover:border-slate-400"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold uppercase">
                              Sekunder
                            </span>
                            <span className="font-mono text-xs font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              [{diag.code}]
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveDiagnosis(diag.code)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus diagnosa ini"
                            aria-label={`Hapus ${diag.code}`}
                          >
                            <X className="w-4 h-4" weight="bold" />
                          </button>
                        </div>

                        <div className="text-xs font-bold text-slate-900 leading-snug">
                          {diag.name}
                        </div>

                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(diag.code)}
                            className="text-[11px] font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 hover:underline"
                          >
                            <Star className="w-3 h-3 text-amber-500" weight="bold" />
                            Jadikan Diagnosa Utama
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Guidance */}
          <div className="pt-3 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Standar ICD-10 FKTP &amp; BPJS</span>
            <span className="font-bold text-teal-800">
              {diagnoses.length > 0 ? '✓ Siap Diteruskan' : 'Pilih Minimal 1'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Icd10QuickPicker;
