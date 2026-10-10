'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Pill,
  Lightning,
  Trash,
  Plus,
  Receipt,
  WarningCircle,
  MagnifyingGlass,
  Sparkle,
  FirstAid,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { CLINIC_DRUG_CATALOG, FAST_SIGNA_CHIPS, type PrescriptionPreset } from '@/constants/prescriptions';
import { formatRupiah, cn } from '@/lib/utils';

export interface PrescriptionItem {
  id: string;
  name: string;
  dosage: string;
  instruction: string;
}

export interface PrescriptionQuickPickerProps {
  terapiObat: string;
  onChangeTerapiObat: (val: string) => void;
  patientAllergy?: string | null;
  biayaPeriksa: number;
  onChangeBiayaPeriksa: (val: number) => void;
  pendapatanLain: number;
  onChangePendapatanLain: (val: number) => void;
  keteranganPendapatan: string;
  onChangeKeteranganPendapatan: (val: string) => void;
  jenisPasien?: 'BPJS' | 'Umum' | string;
  className?: string;
  onOpenTherapyPackageModal?: () => void;
  items?: PrescriptionItem[];
  onItemsChange?: (items: PrescriptionItem[]) => void;
  appliedPackageNames?: string[];
}

// 1-Click Clinical Presets
const PRESET_PACKS = [
  {
    id: 'ispa',
    name: 'ISPA Dewasa',
    summary: 'Amoxicillin + Paracetamol + CTM',
    items: [
      { id: 'amox-500', name: 'Amoxicillin', dosage: '500 mg', instruction: '3x1 tab pc (10 tab habiskan)' },
      { id: 'pct-500', name: 'Paracetamol', dosage: '500 mg', instruction: '3x1 tab prn demam/nyeri (10 tab)' },
      { id: 'ctm-4', name: 'CTM (Chlorpheniramine)', dosage: '4 mg', instruction: '3x1 tab pc (10 tab)' },
    ],
  },
  {
    id: 'maag',
    name: 'Maag / Gastritis',
    summary: 'Antasida + Omeprazole + Ranitidin',
    items: [
      { id: 'antasida', name: 'Antasida DOEN', dosage: 'Kombinasi', instruction: '3x1 tab kunyah ac (10 tab)' },
      { id: 'omep-20', name: 'Omeprazole', dosage: '20 mg', instruction: '2x1 kap ac 30 mnt sblm makan (10 kap)' },
      { id: 'rani-150', name: 'Ranitidin', dosage: '150 mg', instruction: '2x1 tab ac (10 tab)' },
    ],
  },
  {
    id: 'alergi',
    name: 'Alergi / Dermatitis',
    summary: 'Cetirizine + Betametason Krim',
    items: [
      { id: 'cet-10', name: 'Cetirizine', dosage: '10 mg', instruction: '1x1 tab malam hari (10 tab)' },
      { id: 'beta-krim', name: 'Betametason Krim', dosage: '0.1%', instruction: '2x1 oles tipis area gatal (1 tube)' },
    ],
  },
];

export function PrescriptionQuickPicker({
  terapiObat,
  onChangeTerapiObat,
  patientAllergy,
  biayaPeriksa,
  onChangeBiayaPeriksa,
  pendapatanLain,
  onChangePendapatanLain,
  keteranganPendapatan,
  onChangeKeteranganPendapatan,
  jenisPasien,
  className,
  onOpenTherapyPackageModal,
  items,
  onItemsChange,
  appliedPackageNames,
}: PrescriptionQuickPickerProps) {
  const [internalItems, setInternalItems] = useState<PrescriptionItem[]>([]);
  const structuredItems = items !== undefined ? items : internalItems;
  const setStructuredItems = (newItems: PrescriptionItem[]) => {
    if (onItemsChange) {
      onItemsChange(newItems);
    } else {
      setInternalItems(newItems);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Sync structured items to free text
  const syncToFreeText = (newItems: PrescriptionItem[]) => {
    setStructuredItems(newItems);
    if (newItems.length === 0) return;
    const lines = newItems.map((it) => `${it.name} ${it.dosage} - ${it.instruction}`);
    onChangeTerapiObat(lines.join('\n'));
  };

  // 1-Click Preset Click
  const handleApplyPreset = (packId: string) => {
    const pack = PRESET_PACKS.find((p) => p.id === packId);
    if (!pack) return;

    const newItems: PrescriptionItem[] = pack.items.map((it, idx) => ({
      id: `${it.id}-${Date.now()}-${idx}`,
      name: it.name,
      dosage: it.dosage,
      instruction: it.instruction,
    }));

    syncToFreeText(newItems);
    toast.success(`Paket resep "${pack.name}" diterapkan.`);
  };

  // Add individual drug from search
  const handleAddDrug = (drug: PrescriptionPreset) => {
    const newItem: PrescriptionItem = {
      id: `${drug.id}-${Date.now()}`,
      name: drug.name,
      dosage: drug.dosage,
      instruction: drug.instruction,
    };

    const nextList = [...structuredItems, newItem];
    syncToFreeText(nextList);
    setSearchQuery('');
    setIsDropdownOpen(false);
    toast.success(`${drug.name} ditambahkan ke resep.`);
  };

  // Remove individual drug
  const handleRemoveDrug = (id: string) => {
    const nextList = structuredItems.filter((it) => it.id !== id);
    syncToFreeText(nextList);
    if (nextList.length === 0) {
      onChangeTerapiObat('');
    }
  };

  // Add fast signa chip to textarea
  const handleAppendSigna = (signaText: string) => {
    const current = terapiObat.trim();
    const updated = current ? `${current} (${signaText})` : `(${signaText})`;
    onChangeTerapiObat(updated);
  };

  // Allergy Clash Detection
  const matchedAllergen = useMemo(() => {
    if (!patientAllergy || !patientAllergy.trim()) return null;
    const cleanAllergy = patientAllergy.toLowerCase().trim();
    if (cleanAllergy === 'tidak ada' || cleanAllergy === '-') return null;

    const allergenTokens = cleanAllergy
      .split(/[,;\/\s]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);

    const fullTherapyLower = terapiObat.toLowerCase();
    for (const token of allergenTokens) {
      if (fullTherapyLower.includes(token)) {
        return token;
      }
    }
    return null;
  }, [patientAllergy, terapiObat]);

  // Drug catalog filter
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return CLINIC_DRUG_CATALOG.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.dosage.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const totalBill = Number(biayaPeriksa || 0) + Number(pendapatanLain || 0);

  return (
    <div className={cn('bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card-double space-y-5', className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100/80 shrink-0">
            <Pill className="w-4 h-4" weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              3. Terapi Obat &amp; Resep Apotek
            </h3>
            <p className="text-[11px] text-slate-500 font-normal">
              Pilih paket 1-klik untuk efisiensi tinggi atau racik obat mandiri
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200">
          {structuredItems.length} Obat Terjadwal
        </span>
      </div>

      {/* Allergy Clash Warning Alert */}
      {matchedAllergen && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-xs text-rose-900">
          <WarningCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" weight="fill" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[10px] text-rose-700 block">
              Peringatan Kontraindikasi Alergi Pasien!
            </span>
            <span>
              Resep yang Anda masukkan mengandung kata <strong>&quot;{matchedAllergen}&quot;</strong> yang tercatat pada riwayat alergi obat pasien. Mohon pastikan kembali keamanan resep sebelum mengirim ke apotek.
            </span>
          </div>
        </div>
      )}

      {/* 1-Click Preset Packages Cards & Master Therapy Package Trigger */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
              Paket Resep Cepat Klinis (1-Klik):
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">&bull; Otomatis mengisi resep &amp; tindakan</span>
          </div>

          {onOpenTherapyPackageModal && (
            <button
              type="button"
              onClick={onOpenTherapyPackageModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 transition-all tactile-btn shadow-2xs group min-h-[36px]"
              title="Buka daftar paket tindakan dan obat resmi klinik dari database"
            >
              <FirstAid className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" weight="duotone" />
              <span>Pilih Paket Terapi Master</span>
            </button>
          )}
        </div>

        {/* Applied Packages Badges */}
        {appliedPackageNames && appliedPackageNames.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap p-2.5 bg-teal-50/70 border border-teal-200 rounded-xl">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
              Paket Terpasang di Kunjungan Ini:
            </span>
            {appliedPackageNames.map((name, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-900 bg-white border border-teal-300 px-2.5 py-0.5 rounded-lg shadow-2xs font-mono"
              >
                <FirstAid className="w-3 h-3 text-teal-600 shrink-0" weight="fill" />
                <span>{name}</span>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESET_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => handleApplyPreset(pack.id)}
              className="px-3.5 py-2.5 bg-slate-50/70 hover:bg-teal-50/60 border border-slate-300 hover:border-teal-400 rounded-xl text-left transition-all tactile-btn group shadow-2xs min-h-[44px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-teal-900">
                  {pack.name}
                </span>
                <Lightning className="w-3.5 h-3.5 text-amber-500 opacity-60 group-hover:opacity-100" weight="fill" />
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                {pack.summary}
              </p>
            </button>
          ))}

          {onOpenTherapyPackageModal && (
            <button
              type="button"
              onClick={onOpenTherapyPackageModal}
              className="px-3.5 py-2.5 bg-teal-50/80 hover:bg-teal-100/90 border border-teal-300 hover:border-teal-500 rounded-xl text-left transition-all tactile-btn group shadow-2xs min-h-[44px] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-950 group-hover:text-teal-900 flex items-center gap-1.5">
                  <FirstAid className="w-3.5 h-3.5 text-teal-600 shrink-0" weight="fill" />
                  Paket Terapi Master
                </span>
                <span className="text-[10px] font-bold text-teal-800 bg-white px-1.5 py-0.5 rounded border border-teal-200">
                  Resmi
                </span>
              </div>
              <p className="text-[11px] text-teal-700 font-mono mt-0.5 truncate">
                Bundel tindakan + obat klinik
              </p>
            </button>
          )}
        </div>
      </div>

      {/* Medication Search Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <MagnifyingGlass
            className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none"
            weight="bold"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim()) setIsDropdownOpen(true);
            }}
            placeholder="Tambah obat lain dari katalog (misal: Amoxicillin, Antasida, Captopril, Metformin)..."
            aria-label="Cari obat apotek"
            className="w-full pl-10 pr-4 py-1.5 min-h-[36px] text-xs bg-slate-50/80 border border-slate-300 rounded-xl font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:bg-white transition-all outline-none"
          />
        </div>

        {/* Dropdown Suggestions */}
        {isDropdownOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-popover z-50 max-h-52 overflow-y-auto divide-y divide-slate-100 animate-popover p-1">
            {searchResults.length > 0 ? (
              searchResults.map((drug) => (
                <div
                  key={drug.id}
                  onClick={() => handleAddDrug(drug)}
                  className="p-2.5 rounded-xl flex items-center justify-between text-xs hover:bg-teal-50/70 cursor-pointer transition select-none"
                >
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-teal-600 shrink-0" weight="duotone" />
                    <div>
                      <span className="font-bold text-slate-900">{drug.name}</span>
                      <span className="text-slate-500 ml-2 font-mono text-[11px]">
                        {drug.dosage} &bull; {drug.instruction}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
                    <Plus className="w-2.5 h-2.5" weight="bold" />
                    <span>Tambah</span>
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">
                Obat tidak ditemukan di katalog standar. Anda dapat mengetik dosis langsung di catatan resep bebas di bawah.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Itemized Structured Medication Table */}
      <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl overflow-hidden shadow-well">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/90 bg-slate-100/70">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Tabel Obat Resep Apotek:
          </span>
          <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
            {structuredItems.length} item
          </span>
        </div>

        <div className="divide-y divide-slate-100 min-h-[60px]">
          {structuredItems.length === 0 ? (
            <div className="px-4 py-4 text-xs text-slate-400 text-center font-medium">
              Belum ada obat dalam tabel resep. Klik salah satu paket 1-klik di atas atau cari obat dari katalog.
            </div>
          ) : (
            structuredItems.map((item) => (
              <div
                key={item.id}
                className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-white/60 transition gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Pill className="w-3.5 h-3.5" weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <span className="text-slate-500 text-[11px] ml-1.5 font-mono">
                      ({item.dosage})
                    </span>
                    <p className="text-[11px] text-teal-800 font-mono mt-0.5 truncate">
                      {item.instruction}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveDrug(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Hapus obat ini dari resep"
                  aria-label={`Hapus ${item.name}`}
                >
                  <Trash className="w-4 h-4" weight="bold" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Free-Text Monospace Textarea (Synchronized with table) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span>Catatan Resep Apotek Lengkap (Dapat Diedit Bebas)</span>
          </label>
          <span className="text-[11px] text-slate-400">
            Diteruskan ke loket apotek &amp; kasir
          </span>
        </div>
        <textarea
          rows={3}
          value={terapiObat}
          onChange={(e) => onChangeTerapiObat(e.target.value)}
          placeholder="Contoh:&#10;Amoxicillin 500 mg - 3x1 tab pc (10 tab habiskan)&#10;Paracetamol 500 mg - 3x1 tab prn demam/nyeri (10 tab)"
          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 resize-y leading-relaxed"
        />

        {/* Quick Signa Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Sisipkan Signa:
          </span>
          {FAST_SIGNA_CHIPS.map((chip) => (
            <button
              key={chip.signa}
              type="button"
              onClick={() => handleAppendSigna(chip.signa)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 rounded-md text-[10px] font-mono text-slate-700 transition"
              title={chip.label}
            >
              {chip.signa}
            </button>
          ))}
        </div>
      </div>

      {/* Billing Summary Box (Handover to Cashier) */}
      <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/80 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" weight="duotone" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                Rincian Biaya &amp; Tindakan (Diteruskan ke Kasir)
              </h4>
              <p className="text-[11px] text-slate-500 font-normal">
                Ditagihkan saat pelunasan di loket pembayaran
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">
              Estimasi Tagihan Pasien
            </span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {formatRupiah(totalBill)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Biaya Periksa Dokter (Rp)
            </label>
            <input
              type="number"
              value={biayaPeriksa}
              onChange={(e) => onChangeBiayaPeriksa(Number(e.target.value))}
              disabled={jenisPasien === 'BPJS'}
              className="w-full px-3 py-1.5 min-h-[36px] text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 outline-none disabled:bg-slate-100 disabled:text-slate-500"
            />
            {jenisPasien === 'BPJS' && (
              <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                ✓ Pasien BPJS Kesehatan (Tercover Kapitasi Rp 0)
              </span>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Biaya Tindakan / Tagihan Tambahan (Rp)
            </label>
            <input
              type="number"
              value={pendapatanLain}
              onChange={(e) => onChangePendapatanLain(Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-1.5 min-h-[36px] text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Keterangan Tindakan / Biaya Tambahan
          </label>
          <input
            type="text"
            value={keteranganPendapatan}
            onChange={(e) => onChangeKeteranganPendapatan(e.target.value)}
            placeholder="Contoh: Jahit Luka 3 simpul, Nebulizer 1x, Perban ganti balut..."
            className="w-full px-3 py-1.5 min-h-[36px] text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 outline-none font-medium"
          />
        </div>
      </div>
    </div>
  );
}

export default PrescriptionQuickPicker;
