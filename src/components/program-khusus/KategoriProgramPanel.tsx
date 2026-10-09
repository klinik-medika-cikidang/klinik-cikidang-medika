'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Heartbeat, CalendarCheck, Check } from '@phosphor-icons/react';
import type { Visit } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { NewPublicHealthModal } from '@/components/program-khusus/NewPublicHealthModal';
import { NewPostCareModal } from '@/components/program-khusus/NewPostCareModal';
import {
  VISIT_CATEGORY_LABELS,
  VISIT_CATEGORY_DEFAULT,
  OBSERVASI_LABEL,
  type VisitCategory,
} from '@/constants/clinic';
import { cn } from '@/lib/utils';

// ANC, PTM, KB, and 3 Eliminasi each have a register row in public_health_records. The
// visit category is the summary that lets a visit be filtered without reading the register.
const HEALTH_PROGRAMS: VisitCategory[] = ['ANC', 'PTM', 'KB', 'ELIMINASI_3'];
const CHIP_ORDER: VisitCategory[] = ['UMUM', 'ANC', 'PTM', 'KB', 'ELIMINASI_3'];

function asHealthProgram(value: VisitCategory): 'ANC' | 'PTM' | 'KB' | 'ELIMINASI_3' {
  return value === 'UMUM' ? 'PTM' : value;
}

export interface KategoriProgramPanelProps {
  visit: Visit;
  onSaved?: (kategori: VisitCategory) => void;
  className?: string;
}

export function KategoriProgramPanel({ visit, onSaved, className }: KategoriProgramPanelProps) {
  const initial = (visit.kategori_program as VisitCategory) || VISIT_CATEGORY_DEFAULT;
  const [kategori, setKategori] = useState<VisitCategory>(initial);
  const [savedKategori, setSavedKategori] = useState<VisitCategory>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isObservasiModalOpen, setIsObservasiModalOpen] = useState(false);

  const isHealthProgram = HEALTH_PROGRAMS.includes(kategori);
  const isDirty = kategori !== savedKategori;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('visits')
        .update({ kategori_program: kategori })
        .eq('id', visit.id);

      if (error) throw error;

      setSavedKategori(kategori);
      toast.success(`Kategori kunjungan disimpan: ${VISIT_CATEGORY_LABELS[kategori]}.`);
      onSaved?.(kategori);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan kategori kunjungan.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="kategori-program-heading"
      className={cn('p-4 bg-white rounded-2xl border border-slate-200/90 shadow-card-double space-y-4', className)}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
          <Heartbeat weight="duotone" className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 id="kategori-program-heading" className="text-sm font-extrabold text-slate-900">
            Kategori Program
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Langkah terakhir. Pilih program bila pasien mengikutinya, atau biarkan{' '}
            {VISIT_CATEGORY_LABELS.UMUM} untuk pasien umum.
          </p>
        </div>
      </div>

      <div role="radiogroup" aria-label="Pilih kategori program" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CHIP_ORDER.map((value) => {
          const active = kategori === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setKategori(value)}
              className={cn(
                'flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-xl border text-xs font-bold transition tactile-btn text-left focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none',
                active
                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              )}
            >
              <span>{VISIT_CATEGORY_LABELS[value]}</span>
              {active && <Check weight="bold" className="w-4 h-4 text-teal-700 shrink-0" />}
            </button>
          );
        })}
      </div>

      {kategori === 'ELIMINASI_3' && (
        <p className="text-[11px] text-slate-600">
          Triple Eliminasi berarti ANC ditambah pemeriksaan lab HIV, HBsAg, dan Sipilis. Isi yang
          tersedia lewat register program; bagian yang belum diisi ditandai, bukan ditebak.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          isLoading={isSaving}
          leftIcon={<Check weight="bold" className="w-3.5 h-3.5" />}
        >
          Simpan Kategori
        </Button>

        {isHealthProgram && (
          <Button
            variant="outline"
            onClick={() => setIsProgramModalOpen(true)}
            leftIcon={<Heartbeat weight="duotone" className="w-4 h-4" />}
          >
            Lengkapi Register Program
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => setIsObservasiModalOpen(true)}
          leftIcon={<CalendarCheck weight="duotone" className="w-4 h-4" />}
        >
          Jadwalkan {OBSERVASI_LABEL}
        </Button>
      </div>

      <NewPublicHealthModal
        isOpen={isProgramModalOpen}
        onClose={() => setIsProgramModalOpen(false)}
        onSuccess={() => setIsProgramModalOpen(false)}
        defaultProgram={asHealthProgram(kategori)}
      />
      <NewPostCareModal
        isOpen={isObservasiModalOpen}
        onClose={() => setIsObservasiModalOpen(false)}
        onSuccess={() => setIsObservasiModalOpen(false)}
      />
    </section>
  );
}
