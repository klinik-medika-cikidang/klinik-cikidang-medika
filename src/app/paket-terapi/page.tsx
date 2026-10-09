'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FirstAid, Plus, WarningCircle, ArrowClockwise } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import type { TherapyPackage } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { describeSupabaseError } from '@/lib/errors';
import { PackageList } from '@/components/paket-terapi/PackageList';
import {
  PackageFormModal,
  type PackageFormPayload,
} from '@/components/paket-terapi/PackageFormModal';

function sortItems(pkg: TherapyPackage): TherapyPackage {
  return {
    ...pkg,
    items: [...(pkg.items || [])].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0)),
  };
}

export default function PaketTerapiPage() {
  const { role } = useAuth();
  const canManage = role === 'owner';

  const [packages, setPackages] = useState<TherapyPackage[]>([]);
  const [appliedCounts, setAppliedCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TherapyPackage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TherapyPackage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('therapy_packages')
        .select('*, items:therapy_package_items(*)')
        .order('nama', { ascending: true });

      if (error) throw error;
      setPackages(((data as unknown as TherapyPackage[]) || []).map(sortItems));

      const { data: appliedRows, error: appliedError } = await supabase
        .from('visit_therapy_packages')
        .select('package_id');
      if (appliedError) throw appliedError;

      const counts: Record<string, number> = {};
      ((appliedRows as Array<{ package_id: string | null }>) || []).forEach((row) => {
        if (row.package_id) counts[row.package_id] = (counts[row.package_id] || 0) + 1;
      });
      setAppliedCounts(counts);
    } catch (err) {
      console.error('Gagal memuat paket terapi:', err);
      setLoadError(describeSupabaseError(err, 'Gagal memuat daftar paket terapi.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleSubmit = async (payload: PackageFormPayload) => {
    const supabase = createClient();
    const hargaTotal = payload.items.reduce((sum, item) => sum + item.subtotal, 0);

    if (editing) {
      const { error: updateError } = await supabase
        .from('therapy_packages')
        .update({
          kode: payload.kode,
          nama: payload.nama,
          deskripsi: payload.deskripsi,
          harga_total: hargaTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);
      if (updateError) throw updateError;

      // Replace the item set so removed lines disappear and urutan follows the new order.
      const { error: clearError } = await supabase
        .from('therapy_package_items')
        .delete()
        .eq('package_id', editing.id);
      if (clearError) throw clearError;

      const { error: itemError } = await supabase
        .from('therapy_package_items')
        .insert(payload.items.map((item) => ({ ...item, package_id: editing.id })));
      if (itemError) throw itemError;

      toast.success('Paket terapi diperbarui.');
    } else {
      const { data: created, error: createError } = await supabase
        .from('therapy_packages')
        .insert({
          kode: payload.kode,
          nama: payload.nama,
          deskripsi: payload.deskripsi,
          harga_total: hargaTotal,
          aktif: true,
          created_by_role: role,
        })
        .select('id')
        .single();
      if (createError) throw createError;

      const { error: itemError } = await supabase
        .from('therapy_package_items')
        .insert(payload.items.map((item) => ({ ...item, package_id: created.id })));
      if (itemError) {
        // Drop the empty package so a failed item insert never lingers in the list.
        await supabase.from('therapy_packages').delete().eq('id', created.id);
        throw itemError;
      }

      toast.success('Paket terapi dibuat.');
    }

    setIsFormOpen(false);
    setEditing(null);
    await fetchPackages();
  };

  const handleToggleActive = async (pkg: TherapyPackage) => {
    const activating = !pkg.aktif;
    if (activating && (!pkg.items || pkg.items.length === 0)) {
      toast.error('Paket tanpa item tidak dapat diaktifkan. Tambahkan minimal satu item.');
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('therapy_packages')
        .update({ aktif: activating, updated_at: new Date().toISOString() })
        .eq('id', pkg.id);
      if (error) throw error;
      toast.success(activating ? 'Paket diaktifkan kembali.' : 'Paket dinonaktifkan.');
      await fetchPackages();
    } catch (err) {
      console.error('Gagal mengubah status paket:', err);
      toast.error(describeSupabaseError(err, 'Gagal mengubah status paket.'));
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('therapy_packages').delete().eq('id', pendingDelete.id);
      if (error) throw error;
      toast.success('Paket terapi dihapus.');
      setPendingDelete(null);
      await fetchPackages();
    } catch (err) {
      console.error('Gagal menghapus paket terapi:', err);
      toast.error(describeSupabaseError(err, 'Gagal menghapus paket terapi.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const existingKodes = useMemo(
    () => packages.map((pkg) => pkg.kode || '').filter(Boolean),
    [packages]
  );

  const activeCount = packages.filter((pkg) => pkg.aktif).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-card-double">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-200 shrink-0">
              <FirstAid className="w-5 h-5" weight="duotone" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Paket Terapi</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Kelola paket tindakan dan obat agar penagihan kunjungan dapat diisi dalam satu langkah.
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              type="button"
              leftIcon={<Plus className="w-4 h-4" weight="bold" />}
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
              className="shrink-0"
            >
              Buat Paket
            </Button>
          )}
        </div>

        {!isLoading && !loadError && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium border-t border-slate-100 pt-3">
            <span>{packages.length} paket</span>
            <span>{activeCount} aktif</span>
            {canManage && (
              <span className="text-slate-400">
                Harga paket hasil data klinik dapat disesuaikan melalui tombol Ubah.
              </span>
            )}
          </div>
        )}
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <WarningCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" weight="bold" />
            <p className="text-xs font-medium text-rose-800">{loadError}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<ArrowClockwise className="w-4 h-4" weight="bold" />}
            onClick={fetchPackages}
          >
            Coba Lagi
          </Button>
        </div>
      ) : (
        <PackageList
          packages={packages}
          canManage={canManage}
          isLoading={isLoading}
          appliedCounts={appliedCounts}
          onCreate={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
          onEdit={(pkg) => {
            setEditing(pkg);
            setIsFormOpen(true);
          }}
          onToggleActive={handleToggleActive}
          onDelete={(pkg) => setPendingDelete(pkg)}
        />
      )}

      {canManage && (
        <PackageFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          initial={editing}
          existingKodes={existingKodes}
          onSubmit={handleSubmit}
        />
      )}

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => (isDeleting ? undefined : setPendingDelete(null))}
        maxWidth="md"
        title="Hapus Paket Terapi"
        description="Paket yang belum pernah diterapkan dapat dihapus permanen."
        icon={
          <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
            <WarningCircle weight="duotone" className="w-5 h-5" />
          </div>
        }
      >
        <div className="px-5 sm:px-6 py-5 space-y-4">
          <p className="text-sm text-slate-700">
            Hapus paket{' '}
            <span className="font-bold text-slate-900">{pendingDelete?.nama}</span> beserta{' '}
            {pendingDelete?.items?.length ?? 0} item di dalamnya? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete} isLoading={isDeleting}>
              Hapus Paket
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
