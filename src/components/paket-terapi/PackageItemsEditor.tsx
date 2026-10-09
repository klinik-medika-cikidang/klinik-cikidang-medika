'use client';

import React from 'react';
import { Plus, Trash, CaretUp, CaretDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { THERAPY_PACKAGE_ITEM_TYPES, THERAPY_PACKAGE_ITEM_LABELS } from '@/constants/clinic';
import { formatRupiah, cn } from '@/lib/utils';
import {
  type DraftItem,
  newDraftItem,
  draftSubtotal,
  draftTotal,
  formatNumberInput,
  parseNumberInput,
} from './draft';

export interface PackageItemsEditorProps {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  disabled?: boolean;
  error?: string | null;
}

const jenisOptions = THERAPY_PACKAGE_ITEM_TYPES.map((value) => ({
  value,
  label: THERAPY_PACKAGE_ITEM_LABELS[value],
}));

// One editor for the whole item list. Add, edit, delete, and reorder all live here and
// the subtotal and package total are derived, so the owner never types a total by hand.
export function PackageItemsEditor({ items, onChange, disabled = false, error }: PackageItemsEditorProps) {
  const total = draftTotal(items);

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const removeItem = (key: string) => {
    onChange(items.filter((item) => item.key !== key));
  };

  const moveItem = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Rincian Item Paket
        </h3>
        <span className="text-[11px] font-semibold text-slate-500">
          {items.length} item
        </span>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-2xl px-4 py-6 text-center">
          Paket harus memiliki minimal satu item. Tekan Tambah Item untuk memulai.
        </p>
      )}

      <div className="space-y-3">
        {items.map((item, index) => {
          const subtotal = draftSubtotal(item);
          const hargaKosong = parseNumberInput(item.harga_satuan) === 0;
          return (
            <div
              key={item.key}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Item {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(index, -1)}
                    disabled={disabled || index === 0}
                    aria-label={`Naikkan item ${index + 1}`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-teal-700 hover:bg-white border border-transparent hover:border-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CaretUp className="w-4 h-4" weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 1)}
                    disabled={disabled || index === items.length - 1}
                    aria-label={`Turunkan item ${index + 1}`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-teal-700 hover:bg-white border border-transparent hover:border-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CaretDown className="w-4 h-4" weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    disabled={disabled}
                    aria-label={`Hapus item ${index + 1}`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Trash className="w-4 h-4" weight="bold" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <Select
                    label="Jenis"
                    options={jenisOptions}
                    value={item.jenis_item}
                    onValueChange={(val) => updateItem(item.key, { jenis_item: val as DraftItem['jenis_item'] })}
                    disabled={disabled}
                  />
                </div>
                <div className="sm:col-span-8">
                  <Input
                    label="Nama item"
                    placeholder="Contoh: Paracetamol 500 mg"
                    value={item.nama_item}
                    onChange={(e) => updateItem(item.key, { nama_item: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Jumlah"
                    inputMode="numeric"
                    value={item.qty}
                    onChange={(e) => updateItem(item.key, { qty: e.target.value.replace(/[^0-9]/g, '') })}
                    disabled={disabled}
                  />
                </div>
                <div className="sm:col-span-5">
                  <Input
                    label="Harga satuan"
                    inputMode="numeric"
                    leftElement={<span className="text-xs font-semibold">Rp</span>}
                    value={item.harga_satuan}
                    onChange={(e) =>
                      updateItem(item.key, { harga_satuan: formatNumberInput(parseNumberInput(e.target.value)) })
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="sm:col-span-4">
                  <div className="w-full space-y-1">
                    <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Subtotal
                    </span>
                    <div className="min-h-[44px] flex items-center px-3.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                        {formatRupiah(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-12">
                  <Input
                    label="Catatan (opsional)"
                    placeholder="Contoh: tarif tindakan belum diisi"
                    value={item.catatan}
                    onChange={(e) => updateItem(item.key, { catatan: e.target.value })}
                    disabled={disabled}
                  />
                </div>
              </div>

              {hargaKosong && (
                <p className="text-[11px] text-amber-700 font-medium">
                  Harga satuan masih nol. Paket tetap dapat disimpan, tetapi tandanya harga belum diisi.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={<Plus className="w-4 h-4" weight="bold" />}
        onClick={() => onChange([...items, newDraftItem()])}
        disabled={disabled}
      >
        Tambah Item
      </Button>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-teal-50/70 border border-teal-200 px-4 py-3">
        <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">Harga total paket</span>
        <span className={cn('text-base font-extrabold font-mono tabular-nums text-teal-900')}>
          {formatRupiah(total)}
        </span>
      </div>

      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
}
