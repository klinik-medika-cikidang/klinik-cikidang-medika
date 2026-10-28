'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarBlank,
  Tag,
  CurrencyCircleDollar,
  FloppyDisk,
  WarningCircle,
  CircleNotch,
  Money,
  Bank,
} from '@phosphor-icons/react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  CASH_FLOW_CATEGORIES,
  METODE_PEMBAYARAN_OPTIONS,
  type MetodePembayaranOption,
} from '@/constants/clinic';
import { createClient } from '@/lib/supabase/client';
import type { CashFlow } from '@/types/database';
import {
  formatRupiah,
  formatLocalDateToYMD,
  isCashHandoverToOwnerOrBank,
  isOperationalExpense,
  cn,
  getErrorMessage,
} from '@/lib/utils';

const cashFlowSchema = z.object({
  tanggal: z.string().trim().min(1, 'Tanggal transaksi wajib diisi.'),
  jenis: z.enum(['Masuk', 'Keluar'], {
    message: 'Jenis transaksi wajib dipilih.',
  }),
  kategori: z.string().trim().min(1, 'Kategori mutasi kas wajib dipilih.'),
  nominal: z.number().positive('Nominal kas wajib bernilai lebih dari Rp 0.'),
  keterangan: z.string().trim().optional().nullable(),
});

type CashFlowFormErrors = Partial<
  Record<'tanggal' | 'jenis' | 'kategori' | 'nominal' | 'keterangan', string>
>;

export interface AddCashFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'Masuk' | 'Keluar';
  onSuccess?: (newFlow: CashFlow) => void;
}

const formatExactRupiah = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0);

export function AddCashFlowModal({
  isOpen,
  onClose,
  initialType = 'Masuk',
  onSuccess,
}: AddCashFlowModalProps) {
  const getTodayString = () => formatLocalDateToYMD();

  const [jenis, setJenis] = useState<'Masuk' | 'Keluar'>(initialType);
  const [tanggal, setTanggal] = useState(getTodayString());
  const [kategori, setKategori] = useState('');
  const [nominalDisplay, setNominalDisplay] = useState('');
  const [nominalRaw, setNominalRaw] = useState<number>(0);
  const [keterangan, setKeterangan] = useState('');
  const [jenisPembayaran, setJenisPembayaran] = useState<MetodePembayaranOption>('Tunai');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CashFlowFormErrors>({});

  useEffect(() => {
    if (isOpen) {
      setJenis(initialType);
      const defaultCategories =
        initialType === 'Masuk' ? CASH_FLOW_CATEGORIES.masuk : CASH_FLOW_CATEGORIES.keluar;
      setKategori(defaultCategories[0] || '');
      setTanggal(getTodayString());
      setNominalDisplay('');
      setNominalRaw(0);
      setKeterangan('');
      setJenisPembayaran('Tunai');
      setErrorMessage(null);
      setFieldErrors({});
    }
  }, [isOpen, initialType]);

  const handleJenisChange = (newJenis: 'Masuk' | 'Keluar') => {
    setJenis(newJenis);
    const options = newJenis === 'Masuk' ? CASH_FLOW_CATEGORIES.masuk : CASH_FLOW_CATEGORIES.keluar;
    setKategori(options[0] || '');
    if (fieldErrors.jenis) {
      setFieldErrors((prev) => ({ ...prev, jenis: undefined }));
    }
  };

  const handleSetNominalValue = (num: number) => {
    setNominalRaw(num);
    setNominalDisplay(num > 0 ? new Intl.NumberFormat('id-ID').format(num) : '');
    if (fieldErrors.nominal) {
      setFieldErrors((prev) => ({ ...prev, nominal: undefined }));
    }
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      handleSetNominalValue(0);
      return;
    }

    const num = parseInt(rawVal, 10);
    handleSetNominalValue(num);
  };

  const showPaymentMethod = isOperationalExpense({ jenis, kategori });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parseResult = cashFlowSchema.safeParse({
      tanggal,
      jenis,
      kategori,
      nominal: nominalRaw,
      keterangan: keterangan.trim() || null,
    });

    if (!parseResult.success) {
      const errors: CashFlowFormErrors = {};
      parseResult.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CashFlowFormErrors;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      });
      setFieldErrors(errors);
      toast.error('Mohon periksa input formulir transaksi kas.');
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cash_flows')
        .insert({
          tanggal: parseResult.data.tanggal,
          jenis: parseResult.data.jenis,
          kategori: parseResult.data.kategori,
          nominal: parseResult.data.nominal,
          keterangan: parseResult.data.keterangan || null,
          // Deposits and incoming flows always stay Tunai; only operational spending can be TF.
          jenis_pembayaran: showPaymentMethod ? jenisPembayaran : 'Tunai',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(
        `Mutasi kas ${jenis === 'Masuk' ? 'masuk' : 'keluar'} sebesar ${formatExactRupiah(parseResult.data.nominal)} berhasil disimpan.`
      );

      if (onSuccess && data) {
        onSuccess(data as CashFlow);
      }
      onClose();
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal menyimpan transaksi kas ke database.');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = (
    jenis === 'Masuk' ? CASH_FLOW_CATEGORIES.masuk : CASH_FLOW_CATEGORIES.keluar
  ).map((cat) => ({ value: cat, label: cat }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={jenis === 'Masuk' ? 'Tambah Kas Masuk (Pemasukan)' : 'Tambah Kas Keluar (Pengeluaran)'}
      description="Catat mutasi arus kas operasional klinik dengan akurat"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="p-4 sm:p-6 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Jenis Transaksi Mutasi <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleJenisChange('Masuk')}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold border transition select-none',
                jenis === 'Masuk'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              <ArrowDownLeft weight="duotone" className="w-4 h-4 text-emerald-600" />
              <span>Kas Masuk (+)</span>
            </button>

            <button
              type="button"
              onClick={() => handleJenisChange('Keluar')}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold border transition select-none',
                jenis === 'Keluar'
                  ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              <ArrowUpRight weight="duotone" className="w-4 h-4 text-rose-600" />
              <span>Kas Keluar (-)</span>
            </button>
          </div>
          {fieldErrors.jenis && (
            <p className="text-[11px] text-rose-600 font-medium pl-1">{fieldErrors.jenis}</p>
          )}
        </div>

        <div>
          <Input
            label="Tanggal Transaksi"
            type="date"
            requiredIndicator
            value={tanggal}
            onChange={(e) => {
              setTanggal(e.target.value);
              if (fieldErrors.tanggal) {
                setFieldErrors((prev) => ({ ...prev, tanggal: undefined }));
              }
            }}
            leftElement={<CalendarBlank weight="duotone" className="w-4 h-4 text-slate-500" />}
          />
          {fieldErrors.tanggal && (
            <p className="text-[11px] text-rose-600 font-medium mt-1 pl-1">{fieldErrors.tanggal}</p>
          )}
        </div>

        <div>
          <Select
            label="Kategori Kas"
            requiredIndicator
            value={kategori}
            onChange={(e) => {
              setKategori(e.target.value);
              if (fieldErrors.kategori) {
                setFieldErrors((prev) => ({ ...prev, kategori: undefined }));
              }
            }}
            options={categoryOptions}
          />
          {fieldErrors.kategori && (
            <p className="text-[11px] text-rose-600 font-medium mt-1 pl-1">{fieldErrors.kategori}</p>
          )}
          {isCashHandoverToOwnerOrBank({ jenis, kategori }) && (
            <div className="mt-2 p-2.5 rounded-xl bg-teal-50/90 border border-teal-200/80 text-[11px] text-teal-800 leading-relaxed">
              <span className="font-bold">Info Setoran Pemilik / Bank:</span> Transaksi ini otomatis{' '}
              <span className="font-bold underline">mengurangi Sisa Fisik di Laci Kasir</span> dan masuk ke{' '}
              <span className="font-bold">Akumulasi Setor Tunai &amp; Pemilik</span> (tidak dihitung sebagai beban Pengeluaran Operasional klinik).
            </div>
          )}
        </div>

        {showPaymentMethod && (
          <div className="space-y-1.5">
            <span id="metode-bayar-label" className="block text-xs font-semibold text-slate-700">
              Dibayar dari <span className="text-rose-500">*</span>
            </span>
            <div role="radiogroup" aria-labelledby="metode-bayar-label" className="grid grid-cols-2 gap-2">
              {METODE_PEMBAYARAN_OPTIONS.map((metode) => (
                <button
                  key={metode}
                  type="button"
                  role="radio"
                  aria-checked={jenisPembayaran === metode}
                  onClick={() => setJenisPembayaran(metode)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold border transition select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600',
                    jenisPembayaran === metode
                      ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {metode === 'Tunai' ? (
                    <Money weight="duotone" className="w-4 h-4 text-teal-600" />
                  ) : (
                    <Bank weight="duotone" className="w-4 h-4 text-teal-600" />
                  )}
                  <span>{metode === 'Tunai' ? 'Tunai dari Laci' : 'Transfer'}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pl-1">
              {jenisPembayaran === 'TF'
                ? 'Tetap dihitung sebagai pengeluaran operasional, tetapi tidak mengurangi Sisa Fisik di Laci Kasir.'
                : 'Mengurangi Sisa Fisik di Laci Kasir.'}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs font-bold text-slate-400 select-none flex items-center gap-1">
              <CurrencyCircleDollar weight="duotone" className="w-4 h-4 text-slate-400" />
              <span>Rp</span>
            </span>
            <input
              type="text"
              required
              placeholder="Contoh: 2.500, 5.000, 50.000"
              value={nominalDisplay}
              onChange={handleNominalChange}
              className={cn(
                'w-full py-2.5 pl-14 pr-3 min-h-[44px] text-sm font-mono font-bold bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition',
                fieldErrors.nominal
                  ? 'border-rose-300 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-teal-500 focus:border-transparent'
              )}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {(jenis === 'Keluar'
              ? [2000, 5000, 10000, 25000, 50000, 100000]
              : [50000, 100000, 500000, 1000000]
            ).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetNominalValue(preset)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[10px] font-mono font-semibold border transition',
                  nominalRaw === preset
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                )}
              >
                {formatExactRupiah(preset)}
              </button>
            ))}
          </div>
          {fieldErrors.nominal ? (
            <p className="text-[11px] text-rose-600 font-medium pl-1">{fieldErrors.nominal}</p>
          ) : nominalRaw > 0 ? (
            <p className="text-[11px] font-mono text-slate-500 pl-1">
              Terbaca:{' '}
              <span className="font-semibold text-slate-800">{formatExactRupiah(nominalRaw)}</span>
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Keterangan / Rincian Transaksi
          </label>
          <textarea
            rows={3}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Contoh: Pencairan Dana Kapitasi BPJS September 2026 / Pembelian Paracetamol & Spuit 3cc..."
            className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 placeholder:text-slate-400 leading-relaxed"
          />
        </div>

        </div>

        {/* Sticky Footer Actions */}
        <div className="shrink-0 sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 p-4 sm:px-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 z-10">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[44px]"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            className={cn(
              'w-full sm:w-auto font-bold text-white shadow-xs min-h-[44px]',
              jenis === 'Masuk'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            )}
            leftIcon={
              isSubmitting ? (
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
              ) : (
                <FloppyDisk weight="duotone" className="w-4 h-4" />
              )
            }
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi Kas'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AddCashFlowModal;
