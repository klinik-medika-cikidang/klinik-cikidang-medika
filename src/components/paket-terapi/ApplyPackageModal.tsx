'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FirstAid, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { describeSupabaseError } from '@/lib/errors';
import { THERAPY_PACKAGE_ITEM_LABELS } from '@/constants/clinic';
import type { TherapyPackage, TherapyPackageItemType, Visit } from '@/types/database';
import { formatRupiah, cn } from '@/lib/utils';

export interface ApplyPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit | null;
  onSubmit: (pkg: TherapyPackage) => Promise<void>;
}

function sortItems(pkg: TherapyPackage): TherapyPackage {
  return {
    ...pkg,
    items: [...(pkg.items || [])].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0)),
  };
}

export function ApplyPackageModal({ isOpen, onClose, visit, onSubmit }: ApplyPackageModalProps) {
  const [packages, setPackages] = useState<TherapyPackage[]>([]);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!visit) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('therapy_packages')
        .select('*, items:therapy_package_items(*)')
        .eq('aktif', true)
        .order('nama', { ascending: true });
      if (error) throw error;
      setPackages(((data as unknown as TherapyPackage[]) || []).map(sortItems));

      const { data: applied, error: appliedError } = await supabase
        .from('visit_therapy_packages')
        .select('package_id')
        .eq('visit_id', visit.id);
      if (appliedError) throw appliedError;

      setAppliedIds(
        ((applied as Array<{ package_id: string | null }>) || [])
          .map((row) => row.package_id)
          .filter((id): id is string => Boolean(id))
      );
    } catch (err) {
      console.error('Gagal memuat paket terapi:', err);
      setLoadError(describeSupabaseError(err, 'Gagal memuat paket terapi aktif.'));
    } finally {
      setIsLoading(false);
    }
  }, [visit]);

  // Reload once per open so the list and the duplicate check reflect the current visit.
  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      setDuplicateConfirmed(false);
      setSubmitError(null);
      load();
    }
  }, [isOpen, load]);

  const selected = useMemo(
    () => packages.find((pkg) => pkg.id === selectedId) || null,
    [packages, selectedId]
  );
  const isDuplicate = Boolean(selected && appliedIds.includes(selected.id));
  const isBpjs = visit?.jenis_pasien === 'BPJS';
  const canSubmit = Boolean(selected) && !isSubmitting && (!isDuplicate || duplicateConfirmed);

  const handleSubmit = async () => {
    if (!selected || !canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(selected);
      onClose();
    } catch (err) {
      setSubmitError(describeSupabaseError(err, 'Gagal menerapkan paket terapi.'));
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => undefined : onClose}
      maxWidth="2xl"
      title="Terapkan Paket Terapi"
      description="Pilih paket aktif untuk ditambahkan ke tagihan kunjungan ini."
      icon={
        <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
          <FirstAid weight="duotone" className="w-5 h-5" />
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          {isBpjs && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] text-amber-900 font-medium">
              Pasien BPJS: biaya pemeriksaan tetap Rp 0. Nilai paket dicatat pada pendapatan lain
              beserta keterangannya.
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 flex items-start gap-2">
              <WarningCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" weight="bold" />
              <p className="text-[11px] text-rose-800 font-medium">{loadError}</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center">
              <p className="text-sm font-bold text-slate-900">Belum ada paket aktif</p>
              <p className="text-xs text-slate-500 mt-1">
                Penagihan manual tetap dapat digunakan seperti biasa.
              </p>
            </div>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="sr-only">Daftar paket aktif</legend>
                {packages.map((pkg) => {
                  const isChosen = pkg.id === selectedId;
                  const alreadyApplied = appliedIds.includes(pkg.id);
                  return (
                    <label
                      key={pkg.id}
                      className={cn(
                        'flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition min-h-[44px]',
                        isChosen
                          ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="paket-terapi"
                        className="mt-1 w-4 h-4 accent-teal-600 shrink-0"
                        checked={isChosen}
                        onChange={() => {
                          setSelectedId(pkg.id);
                          setDuplicateConfirmed(false);
                          setSubmitError(null);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900">{pkg.nama}</div>
                            {pkg.kode && (
                              <div className="font-mono text-[11px] text-slate-500 mt-0.5">{pkg.kode}</div>
                            )}
                          </div>
                          <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">
                            {formatRupiah(pkg.harga_total)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {pkg.items?.length ?? 0} item
                        </div>
                        {alreadyApplied && (
                          <div className="text-[11px] text-amber-700 font-semibold mt-1">
                            Sudah pernah diterapkan pada kunjungan ini
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </fieldset>

              {selected && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Rincian paket
                  </p>
                  <ul className="space-y-1.5">
                    {(selected.items || []).map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="min-w-0 flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border bg-white border-slate-200 text-slate-600 shrink-0">
                            {THERAPY_PACKAGE_ITEM_LABELS[item.jenis_item as TherapyPackageItemType]}
                          </span>
                          <span className="text-slate-800 truncate">
                            {item.nama_item}
                            {Number(item.qty) > 1 ? ` x${Number(item.qty)}` : ''}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums text-slate-700 shrink-0">
                          {formatRupiah(item.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                    <span>Total paket</span>
                    <span className="font-mono tabular-nums">{formatRupiah(selected.harga_total)}</span>
                  </div>
                </div>
              )}

              {isDuplicate && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 space-y-2">
                  <div className="flex items-start gap-2 text-[11px] text-amber-900 font-medium">
                    <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" weight="bold" />
                    <span>
                      Paket ini sudah diterapkan pada kunjungan ini. Menerapkan lagi akan menambah
                      nilai dan rekam jejak baru.
                    </span>
                  </div>
                  <label className="flex items-start gap-2 text-[11px] text-amber-900 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 accent-amber-600 shrink-0"
                      checked={duplicateConfirmed}
                      onChange={(e) => setDuplicateConfirmed(e.target.checked)}
                    />
                    <span>Saya mengerti dan ingin menerapkan lagi.</span>
                  </label>
                </div>
              )}

              {submitError && (
                <p className="text-[11px] text-rose-600 font-medium">{submitError}</p>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!canSubmit}
            leftIcon={!isSubmitting ? <CheckCircle className="w-4 h-4" weight="bold" /> : undefined}
          >
            {isDuplicate ? 'Terapkan Lagi' : 'Terapkan Paket'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
