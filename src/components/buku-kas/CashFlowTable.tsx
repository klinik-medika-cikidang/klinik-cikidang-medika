'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  MagnifyingGlass,
  ArrowDownLeft,
  ArrowUpRight,
  Bank,
  Trash,
  WarningCircle,
  CircleNotch,
  Funnel,
  FileXls,
} from '@phosphor-icons/react';
import type { CashFlow } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  formatRupiah,
  formatDateIndo,
  isCashHandoverToOwnerOrBank,
  isOperationalExpense,
  cn,
} from '@/lib/utils';

export interface CashFlowTableProps {
  cashFlows: CashFlow[];
  isLoading: boolean;
  onDelete?: (id: string) => Promise<void> | void;
  className?: string;
}

export function CashFlowTable({
  cashFlows,
  isLoading,
  onDelete,
  className,
}: CashFlowTableProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'Masuk' | 'Keluar' | 'Setoran'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForDelete, setSelectedForDelete] = useState<CashFlow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const uniqueCategories = Array.from(new Set(cashFlows.map((cf) => cf.kategori))).sort();

  const filteredItems = cashFlows.filter((cf) => {
    if (typeFilter === 'Masuk' && (cf.jenis !== 'Masuk' || isCashHandoverToOwnerOrBank(cf))) {
      return false;
    }
    if (typeFilter === 'Keluar' && !isOperationalExpense(cf)) {
      return false;
    }
    if (typeFilter === 'Setoran' && !isCashHandoverToOwnerOrBank(cf)) {
      return false;
    }
    if (categoryFilter !== 'all' && cf.kategori !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchKet = cf.keterangan?.toLowerCase().includes(q) || false;
      const matchKat = cf.kategori.toLowerCase().includes(q);
      const matchNom = String(cf.nominal).includes(q);
      return matchKet || matchKat || matchNom;
    }

    return true;
  });

  const handleDeleteConfirm = async () => {
    if (!selectedForDelete || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(selectedForDelete.id);
      toast.success(`Transaksi ${selectedForDelete.kategori} berhasil dihapus.`);
      setSelectedForDelete(null);
    } catch (err) {
      console.error('Failed to delete cash flow:', err);
      toast.error('Gagal menghapus transaksi mutasi kas.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileXls weight="duotone" className="w-5 h-5 text-teal-600" />
              Daftar Riwayat Mutasi Buku Kas
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Menampilkan {filteredItems.length} transaksi mutasi keuangan operasional &amp; setoran kasir
            </p>
          </div>

          <div className="inline-flex flex-wrap rounded-xl bg-slate-200/80 p-1 text-xs font-medium self-start lg:self-auto gap-0.5">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={cn(
                'px-3 py-1.5 min-h-[38px] rounded-lg transition font-semibold',
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Semua ({cashFlows.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('Masuk')}
              className={cn(
                'px-3 py-1.5 min-h-[38px] rounded-lg transition font-semibold flex items-center gap-1.5',
                typeFilter === 'Masuk'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              )}
            >
              <ArrowDownLeft weight="duotone" className="w-4 h-4" />
              <span>Masuk</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('Keluar')}
              className={cn(
                'px-3 py-1.5 min-h-[38px] rounded-lg transition font-semibold flex items-center gap-1.5',
                typeFilter === 'Keluar'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              )}
            >
              <ArrowUpRight weight="duotone" className="w-4 h-4" />
              <span>Pengeluaran</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('Setoran')}
              className={cn(
                'px-3 py-1.5 min-h-[38px] rounded-lg transition font-semibold flex items-center gap-1.5',
                typeFilter === 'Setoran'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-indigo-700'
              )}
            >
              <Bank weight="duotone" className="w-4 h-4" />
              <span>Setoran Pemilik/Bank</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="sm:col-span-8 relative flex items-center">
            <MagnifyingGlass
              weight="duotone"
              className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Cari keterangan mutasi atau nominal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 min-h-[44px] text-xs bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
          </div>

          <div className="sm:col-span-4">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              leftElement={<Funnel weight="duotone" className="w-4 h-4 text-slate-400" />}
              options={[
                { value: 'all', label: 'Semua Kategori' },
                ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
              ]}
              headerTitle="Filter Kategori Kas"
              placeholder="Semua Kategori"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 select-none">
            <tr>
              <th className="py-3.5 px-4 w-32">Tanggal</th>
              <th className="py-3.5 px-4 w-48">Kategori</th>
              <th className="py-3.5 px-4">Keterangan / Uraian</th>
              <th className="py-3.5 px-4 text-right w-36">Nominal</th>
              {onDelete && <th className="py-3.5 px-4 text-center w-20">Aksi</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={onDelete ? 5 : 4} className="py-12 text-center text-slate-400">
                  <CircleNotch weight="bold" className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                  <span>Memuat mutasi buku kas dari database...</span>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={onDelete ? 5 : 4} className="py-10 text-center text-slate-400 space-y-1">
                  <WarningCircle weight="duotone" className="w-6 h-6 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">Tidak ada transaksi mutasi</p>
                  <p className="text-[11px] text-slate-400">
                    Tidak ditemukan data mutasi kas yang cocok dengan kriteria filter saat ini.
                  </p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isSetoran = isCashHandoverToOwnerOrBank(item);
                const isMasuk = item.jenis === 'Masuk' && !isSetoran;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDateIndo(item.tanggal)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <Badge
                          variant={isSetoran ? 'umum' : isMasuk ? 'success' : 'danger'}
                          size="sm"
                        >
                          {isSetoran ? (
                            <Bank weight="bold" className="w-3 h-3" />
                          ) : isMasuk ? (
                            <ArrowDownLeft weight="bold" className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight weight="bold" className="w-3 h-3" />
                          )}
                          <span>{item.kategori}</span>
                        </Badge>
                        {isSetoran && (
                          <span className="text-[10px] font-semibold text-indigo-600">
                            Setoran Laci ke Pemilik/Bank (Bukan Pengeluaran)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="line-clamp-2">{item.keterangan || '-'}</span>
                    </td>
                    <td
                      className={cn(
                        'py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap',
                        isSetoran
                          ? 'text-indigo-700'
                          : isMasuk
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                      )}
                    >
                      {isSetoran ? '⇄' : isMasuk ? '+' : '-'} {formatRupiah(item.nominal)}
                    </td>
                    {onDelete && (
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedForDelete(item)}
                          aria-label={`Hapus transaksi ${item.kategori}`}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition min-w-[44px] min-h-[44px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-rose-400"
                        >
                          <Trash weight="duotone" className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedForDelete && (
        <Modal
          isOpen={Boolean(selectedForDelete)}
          onClose={() => setSelectedForDelete(null)}
          title="Konfirmasi Hapus Transaksi Kas"
          description="Tindakan ini akan menghapus catatan mutasi kas secara permanen dari database"
          maxWidth="md"
        >
          <div className="p-5 space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-rose-900 font-bold">
                <span>{selectedForDelete.kategori}</span>
                <span className="font-mono">
                  {selectedForDelete.jenis === 'Masuk' ? '+' : '-'} {formatRupiah(selectedForDelete.nominal)}
                </span>
              </div>
              <p className="text-rose-700">
                Tanggal: <span className="font-semibold">{formatDateIndo(selectedForDelete.tanggal)}</span>
              </p>
              {selectedForDelete.keterangan && (
                <p className="text-rose-600 text-[11px] italic">
                  &ldquo;{selectedForDelete.keterangan}&rdquo;
                </p>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus mutasi kas ini? Saldo buku kas bulanan akan otomatis terhitung ulang.
            </p>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setSelectedForDelete(null)}
                disabled={isDeleting}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="w-full sm:w-auto font-bold min-h-[44px]"
                leftIcon={
                  isDeleting ? (
                    <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash weight="duotone" className="w-4 h-4" />
                  )
                }
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Transaksi'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

export default CashFlowTable;
