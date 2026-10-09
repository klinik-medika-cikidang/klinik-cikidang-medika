'use client';

import React, { useMemo, useState } from 'react';
import {
  MagnifyingGlass,
  PencilSimple,
  Power,
  Trash,
  Package,
  Plus,
  X,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { TherapyPackage } from '@/types/database';
import { formatRupiah, cn } from '@/lib/utils';

export interface PackageListProps {
  packages: TherapyPackage[];
  canManage: boolean;
  isLoading: boolean;
  appliedCounts: Record<string, number>;
  onCreate: () => void;
  onEdit: (pkg: TherapyPackage) => void;
  onToggleActive: (pkg: TherapyPackage) => void;
  onDelete: (pkg: TherapyPackage) => void;
}

function itemCount(pkg: TherapyPackage): number {
  return pkg.items?.length ?? 0;
}

function PriceValue({ value }: { value: number }) {
  if (Number(value) <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
        Harga belum diisi
      </span>
    );
  }
  return (
    <span className="font-mono tabular-nums font-bold text-slate-900">{formatRupiah(value)}</span>
  );
}

function StatusBadge({ aktif }: { aktif: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border',
        aktif
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-slate-100 text-slate-600 border-slate-300'
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', aktif ? 'bg-emerald-500' : 'bg-slate-400')}
        aria-hidden="true"
      />
      {aktif ? 'Aktif' : 'Nonaktif'}
    </span>
  );
}

function RowActions({
  pkg,
  canManage,
  applied,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  pkg: TherapyPackage;
  canManage: boolean;
  applied: boolean;
  onEdit: (pkg: TherapyPackage) => void;
  onToggleActive: (pkg: TherapyPackage) => void;
  onDelete: (pkg: TherapyPackage) => void;
}) {
  if (!canManage) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(pkg)}
        aria-label={`Ubah paket ${pkg.nama}`}
        title="Ubah paket"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-teal-700 hover:bg-teal-50 border border-transparent hover:border-teal-200 transition cursor-pointer"
      >
        <PencilSimple className="w-4 h-4" weight="bold" />
      </button>
      <button
        type="button"
        onClick={() => onToggleActive(pkg)}
        aria-label={pkg.aktif ? `Nonaktifkan paket ${pkg.nama}` : `Aktifkan paket ${pkg.nama}`}
        title={pkg.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition cursor-pointer"
      >
        <Power className="w-4 h-4" weight="bold" />
      </button>
      {!applied && (
        <button
          type="button"
          onClick={() => onDelete(pkg)}
          aria-label={`Hapus paket ${pkg.nama}`}
          title="Hapus paket"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
        >
          <Trash className="w-4 h-4" weight="bold" />
        </button>
      )}
    </div>
  );
}

export function PackageList({
  packages,
  canManage,
  isLoading,
  appliedCounts,
  onCreate,
  onEdit,
  onToggleActive,
  onDelete,
}: PackageListProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (pkg) =>
        pkg.nama.toLowerCase().includes(q) || (pkg.kode || '').toLowerCase().includes(q)
    );
  }, [packages, query]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 flex flex-col items-center text-center gap-3">
        <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200">
          <Package className="w-7 h-7" weight="duotone" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-900">Belum ada paket terapi</p>
          <p className="text-xs text-slate-500 max-w-sm">
            {canManage
              ? 'Buat paket pertama agar tindakan dan obat yang sering dipakai dapat diterapkan ke kunjungan dalam satu langkah.'
              : 'Paket terapi belum dibuat oleh pemilik klinik.'}
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            leftIcon={<Plus className="w-4 h-4" weight="bold" />}
            onClick={onCreate}
          >
            Buat Paket Pertama
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Cari nama atau kode paket..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftElement={<MagnifyingGlass className="w-4 h-4" weight="bold" />}
        aria-label="Cari paket terapi"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 flex flex-col items-center text-center gap-3">
          <p className="text-sm font-bold text-slate-900">
            Tidak ada paket yang cocok dengan &ldquo;{query.trim()}&rdquo;
          </p>
          <p className="text-xs text-slate-500">Periksa kembali kata kunci atau hapus filter pencarian.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<X className="w-4 h-4" weight="bold" />}
            onClick={() => setQuery('')}
          >
            Hapus Filter
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Paket</th>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3 text-right">Item</th>
                  <th className="px-4 py-3 text-right">Harga total</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((pkg) => {
                  const applied = (appliedCounts[pkg.id] || 0) > 0;
                  return (
                    <tr key={pkg.id} className={cn(!pkg.aktif && 'bg-slate-50/60')}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{pkg.nama}</div>
                        {pkg.deskripsi && (
                          <div className="text-xs text-slate-500 line-clamp-1 max-w-md">
                            {pkg.deskripsi}
                          </div>
                        )}
                        {applied && (
                          <div className="text-[11px] text-teal-700 font-medium mt-0.5">
                            Sudah pernah diterapkan ke kunjungan
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {pkg.kode || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                        {itemCount(pkg)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PriceValue value={pkg.harga_total} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge aktif={pkg.aktif} />
                      </td>
                      {canManage && (
                        <td className="px-4 py-2">
                          <RowActions
                            pkg={pkg}
                            canManage={canManage}
                            applied={applied}
                            onEdit={onEdit}
                            onToggleActive={onToggleActive}
                            onDelete={onDelete}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((pkg) => {
              const applied = (appliedCounts[pkg.id] || 0) > 0;
              return (
                <div
                  key={pkg.id}
                  className={cn(
                    'rounded-2xl border border-slate-200 bg-white p-4 space-y-3',
                    !pkg.aktif && 'bg-slate-50/60'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900">{pkg.nama}</div>
                      {pkg.kode && (
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">{pkg.kode}</div>
                      )}
                    </div>
                    <StatusBadge aktif={pkg.aktif} />
                  </div>
                  {pkg.deskripsi && (
                    <p className="text-xs text-slate-600">{pkg.deskripsi}</p>
                  )}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500 font-medium">{itemCount(pkg)} item</span>
                    <PriceValue value={pkg.harga_total} />
                  </div>
                  {applied && (
                    <p className="text-[11px] text-teal-700 font-medium">
                      Sudah pernah diterapkan ke kunjungan
                    </p>
                  )}
                  {canManage && (
                    <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
                      <RowActions
                        pkg={pkg}
                        canManage={canManage}
                        applied={applied}
                        onEdit={onEdit}
                        onToggleActive={onToggleActive}
                        onDelete={onDelete}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
