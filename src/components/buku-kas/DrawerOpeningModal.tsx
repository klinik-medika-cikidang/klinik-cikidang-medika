'use client';

import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Coins, FloppyDisk, WarningCircle } from '@phosphor-icons/react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RupiahShorthandHint } from '@/components/ui/RupiahShorthandHint';
import { createClient } from '@/lib/supabase/client';
import type { CashDrawerOpening } from '@/types/database';
import { formatRupiah, getErrorMessage } from '@/lib/utils';

const openingSchema = z.object({
  nominal: z
    .number({ message: 'Nominal saldo awal wajib diisi. Isi 0 bila laci kosong.' })
    .min(0, 'Nominal saldo awal tidak boleh negatif.'),
  catatan: z.string().trim().optional(),
});

export interface DrawerOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** First day of the month the opening belongs to ('YYYY-MM-01'). */
  periode: string;
  monthLabel: string;
  /** Existing row of this month, when the owner is editing it. */
  recorded: CashDrawerOpening | null;
  /** Balance the system carried from earlier months, shown only as a reference. */
  carriedSaldo?: number | null;
  userId?: string | null;
  onSaved: (row: CashDrawerOpening) => void;
}

export function DrawerOpeningModal({
  isOpen,
  onClose,
  periode,
  monthLabel,
  recorded,
  carriedSaldo,
  userId,
  onSaved,
}: DrawerOpeningModalProps) {
  // null keeps "not filled" apart from a counted Rp 0.
  const [nominal, setNominal] = useState<number | null>(null);
  const [catatan, setCatatan] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNominal(recorded ? Number(recorded.nominal) || 0 : null);
    setCatatan(recorded?.catatan ?? '');
    setFieldError(null);
    setErrorMessage(null);
  }, [isOpen, recorded]);

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setNominal(digits ? parseInt(digits, 10) : null);
    setFieldError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = openingSchema.safeParse({ nominal: nominal ?? undefined, catatan });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Nominal saldo awal tidak valid.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const values = {
        nominal: parsed.data.nominal,
        catatan: parsed.data.catatan || null,
        updated_at: new Date().toISOString(),
      };
      // created_by records who counted the drawer first, so an edit leaves it untouched.
      const { data, error } = recorded
        ? await supabase.from('cash_drawer_openings').update(values).eq('periode', periode).select().single()
        : await supabase
            .from('cash_drawer_openings')
            .insert({ periode, ...values, ...(userId ? { created_by: userId } : {}) })
            .select()
            .single();
      if (error) throw error;

      toast.success(`Saldo awal ${monthLabel} sebesar ${formatRupiah(parsed.data.nominal)} tersimpan.`);
      onSaved(data as CashDrawerOpening);
      onClose();
    } catch (err) {
      const msg = `Gagal menyimpan saldo awal: ${getErrorMessage(err, 'kesalahan tidak dikenal.')}`;
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => undefined : onClose}
      title={recorded ? 'Ubah Saldo Awal Laci' : 'Isi Saldo Awal Laci'}
      description={monthLabel}
      icon={
        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
          <Coins weight="duotone" className="w-5 h-5" />
        </div>
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0" noValidate>
        <div className="p-4 sm:p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2"
            >
              <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Isi dengan uang tunai yang dihitung di laci kasir pada awal {monthLabel}, sebelum
            transaksi pertama bulan itu. Sisa laci bulan ini dihitung mulai dari angka ini.
          </p>

          {typeof carriedSaldo === 'number' && !recorded && (
            <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              Lanjutan dari bulan sebelumnya menurut sistem:{' '}
              <span className="font-mono font-bold tabular-nums text-slate-900">
                {carriedSaldo < 0 ? `- ${formatRupiah(Math.abs(carriedSaldo))}` : formatRupiah(carriedSaldo)}
              </span>
            </p>
          )}

          <div>
            <Input
              id="saldo-awal-nominal"
              label="Nominal Saldo Awal (Rp)"
              requiredIndicator
              inputMode="numeric"
              autoComplete="off"
              placeholder="Contoh: 1.500.000"
              value={nominal === null ? '' : new Intl.NumberFormat('id-ID').format(nominal)}
              onChange={handleNominalChange}
              disabled={isSaving}
              error={fieldError ?? undefined}
              aria-invalid={Boolean(fieldError)}
              leftElement={<span className="text-xs font-bold text-slate-500">Rp</span>}
              className="font-mono font-bold tabular-nums bg-white"
            />
            {nominal !== null && !fieldError && (
              <p className="text-[11px] font-mono text-slate-500 pl-1 mt-1">
                Terbaca: <span className="font-semibold text-slate-800">{formatRupiah(nominal)}</span>
              </p>
            )}
            <RupiahShorthandHint value={nominal ?? 0} onApply={(v) => setNominal(v)} />
          </div>

          <Input
            id="saldo-awal-catatan"
            label="Catatan"
            placeholder="Contoh: dihitung pagi sebelum loket buka"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            disabled={isSaving}
            helperText="Opsional."
          />
        </div>

        <div className="shrink-0 sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 p-4 sm:px-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 z-10">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto min-h-[44px]"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            className="w-full sm:w-auto min-h-[44px]"
            leftIcon={<FloppyDisk weight="duotone" className="w-4 h-4" />}
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Saldo Awal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default DrawerOpeningModal;
