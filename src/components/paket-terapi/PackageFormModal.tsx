'use client';

import React, { useEffect, useState } from 'react';
import { FirstAid } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { TherapyPackage } from '@/types/database';
import { cn } from '@/lib/utils';
import { PackageItemsEditor } from './PackageItemsEditor';
import {
  type DraftItem,
  type PackageItemPayload,
  itemsToDrafts,
  draftsToPayload,
  isDraftItemComplete,
} from './draft';

export type PackageFormPayload = {
  kode: string | null;
  nama: string;
  deskripsi: string | null;
  items: PackageItemPayload[];
};

export interface PackageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial: TherapyPackage | null;
  existingKodes: string[];
  onSubmit: (payload: PackageFormPayload) => Promise<void>;
}

export function PackageFormModal({
  isOpen,
  onClose,
  initial,
  existingKodes,
  onSubmit,
}: PackageFormModalProps) {
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [items, setItems] = useState<DraftItem[]>(itemsToDrafts());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reload the form from the selected package each time the modal opens, so editing a
  // different package never shows the previous one's values.
  useEffect(() => {
    if (!isOpen) return;
    setNama(initial?.nama || '');
    setKode(initial?.kode || '');
    setDeskripsi(initial?.deskripsi || '');
    setItems(itemsToDrafts(initial?.items));
    setError(null);
    setIsSaving(false);
  }, [isOpen, initial]);

  const namaValid = nama.trim().length >= 2;
  const hasItems = items.length > 0 && items.every(isDraftItemComplete);
  const canSave = namaValid && hasItems && !isSaving;
  const isEditing = Boolean(initial);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!namaValid) {
      setError('Nama paket wajib diisi minimal 2 karakter.');
      return;
    }
    if (items.length === 0) {
      setError('Paket wajib memiliki minimal satu item.');
      return;
    }
    if (!hasItems) {
      setError('Setiap item wajib memiliki nama minimal 2 karakter dan jumlah lebih dari nol.');
      return;
    }

    const trimmedKode = kode.trim();
    if (trimmedKode) {
      const duplicate = existingKodes.some(
        (existing) =>
          existing.toLowerCase() === trimmedKode.toLowerCase() &&
          existing.toLowerCase() !== (initial?.kode || '').toLowerCase()
      );
      if (duplicate) {
        setError('Kode paket sudah digunakan.');
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSubmit({
        kode: trimmedKode || null,
        nama: nama.trim(),
        deskripsi: deskripsi.trim() || null,
        items: draftsToPayload(items),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan paket terapi.');
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={isEditing ? 'Ubah Paket Terapi' : 'Buat Paket Terapi'}
      description={
        isEditing
          ? 'Perubahan berlaku untuk penerapan berikutnya, tidak mengubah kunjungan yang sudah tercatat.'
          : 'Tentukan nama, kode, dan rincian item paket terapi.'
      }
      icon={
        <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
          <FirstAid weight="duotone" className="w-5 h-5" />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="px-5 sm:px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <Input
                label="Nama paket"
                placeholder="Contoh: Paket Terapi ISPA Dewasa"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                requiredIndicator
                disabled={isSaving}
              />
            </div>
            <div className="sm:col-span-5">
              <Input
                label="Kode paket (opsional)"
                placeholder="Contoh: PKT-ISPA-DW"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                disabled={isSaving}
                helperText="Kode harus unik bila diisi."
              />
            </div>
            <div className="sm:col-span-12">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Deskripsi (opsional)
              </label>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                rows={2}
                disabled={isSaving}
                placeholder="Ringkasan singkat isi paket dan penggunaannya."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:outline-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <PackageItemsEditor items={items} onChange={setItems} disabled={isSaving} error={error} />

          {!hasItems && (
            <p className="text-[11px] text-slate-500 font-medium">
              Tombol simpan aktif setelah nama paket terisi dan setiap item lengkap.
            </p>
          )}
        </div>

        <div
          className={cn(
            'shrink-0 sticky bottom-0 z-10 px-5 sm:px-6 py-4 border-t border-slate-200 bg-white/95 backdrop-blur-xs',
            'flex flex-col-reverse sm:flex-row sm:justify-end gap-2'
          )}
        >
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="submit" isLoading={isSaving} disabled={!canSave}>
            {isEditing ? 'Simpan Perubahan' : 'Simpan Paket'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
