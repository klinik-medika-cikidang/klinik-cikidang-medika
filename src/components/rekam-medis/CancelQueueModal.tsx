'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  XCircle,
  WarningCircle,
  CheckCircle,
  User,
  ArrowClockwise,
} from '@phosphor-icons/react';
import type { Visit } from '@/types/database';
import { cn } from '@/lib/utils';

export interface CancelQueueModalProps {
  isOpen: boolean;
  visit: Visit | null;
  onClose: () => void;
  onConfirm: (visitId: string, reason: string, note?: string) => Promise<void>;
}

const QUICK_REASONS = [
  'Pasien Pulang / Batal Sendiri',
  'Tidak Hadir saat Dipanggil Poli',
  'Salah Input / Pendaftaran Dobel',
  'Rujukan Darurat ke RS',
] as const;

export function CancelQueueModal({
  isOpen,
  visit,
  onClose,
  onConfirm,
}: CancelQueueModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(QUICK_REASONS[0]);
  const [customNote, setCustomNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(QUICK_REASONS[0]);
      setCustomNote('');
      setIsSubmitting(false);
    }
  }, [isOpen, visit?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !visit) return null;

  const patientName = visit.pasien
    ? [visit.pasien.gelar, visit.pasien.nama].filter(Boolean).join(' ')
    : 'Pasien Tanpa Nama';

  const tokenNumberStr = String(visit.nomor_antrian || '0').padStart(2, '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm(visit.id, selectedReason, customNote.trim() || undefined);
      onClose();
    } catch {
      // Error is caught and notified by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-popover overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/90 bg-rose-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" weight="duotone" />
            </div>
            <div>
              <h2
                id="cancel-modal-title"
                className="text-sm sm:text-base font-bold text-slate-900 tracking-tight"
              >
                Batalkan Antrean Pasien
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                Status antrean akan diubah menjadi &apos;Batal&apos; (rekam data tetap terjaga).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center disabled:opacity-50"
            aria-label="Tutup jendela konfirmasi"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Patient Snapshot Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white text-slate-800 font-mono font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0 shadow-2xs">
                #{tokenNumberStr}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {patientName}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                  <span className="font-mono text-teal-700 font-semibold">
                    {visit.pasien?.no_rm || '-'}
                  </span>
                  <span>•</span>
                  <span>{visit.pasien?.desa || '-'}</span>
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
              {visit.status_pembayaran}
            </span>
          </div>

          {/* Quick Select Reason Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Pilih Alasan Pembatalan <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left text-xs font-medium transition-all tactile-btn flex items-center justify-between gap-2 min-h-[44px]',
                      isSelected
                        ? 'border-rose-400 bg-rose-50/80 text-rose-950 font-bold ring-2 ring-rose-500/20'
                        : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <span className="leading-snug">{reason}</span>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-rose-600 shrink-0" weight="fill" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Custom Note */}
          <div className="space-y-1.5">
            <label htmlFor="cancel-custom-note" className="block text-xs font-bold text-slate-800">
              Catatan Tambahan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="cancel-custom-note"
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Contoh: Pasien terburu-buru ada urusan mendesak, berjanji kembali besok pagi..."
              maxLength={255}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors resize-none placeholder:text-slate-400"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>Maksimal 255 karakter</span>
              <span>{customNote.length}/255</span>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900 leading-relaxed">
            <WarningCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" weight="fill" />
            <div>
              <span className="font-bold">Info: </span>
              Pasien akan dipindahkan dari antrean aktif ke tab &apos;Batal&apos;. Antrean dapat dipulihkan kapan saja bila pasien datang kembali.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-btn-secondary tactile-btn min-h-[40px] disabled:opacity-50"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedReason}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs tactile-btn min-h-[40px] flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <ArrowClockwise className="w-4 h-4 animate-spin" weight="bold" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" weight="bold" />
                  <span>Ya, Batalkan Antrean</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
