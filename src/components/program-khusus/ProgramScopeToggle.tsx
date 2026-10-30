'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export type ProgramScope = 'aktif' | 'semua';

interface ProgramScopeToggleProps {
  value: ProgramScope;
  onChange: (scope: ProgramScope) => void;
  activeCount: number;
  totalCount: number;
}

const OPTIONS: Array<{ id: ProgramScope; label: string }> = [
  { id: 'aktif', label: 'Pasien Aktif' },
  { id: 'semua', label: 'Semua Riwayat' },
];

// A pair of pressed-state buttons rather than tabs: there is no tab panel to control,
// only a list that is narrowed in place.
export function ProgramScopeToggle({ value, onChange, activeCount, totalCount }: ProgramScopeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Cakupan daftar pasien"
      className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0"
    >
      {OPTIONS.map((option) => {
        const isSelected = value === option.id;
        return (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={isSelected ? 'secondary' : 'ghost'}
            aria-pressed={isSelected}
            onClick={() => onChange(option.id)}
            className={cn(
              'min-h-[44px] min-w-[44px] px-3 text-xs whitespace-nowrap',
              isSelected ? 'text-teal-800' : 'text-slate-600 font-semibold shadow-none'
            )}
          >
            {option.label}
            <span className="ml-1 font-mono tabular-nums">
              ({option.id === 'aktif' ? activeCount : totalCount})
            </span>
          </Button>
        );
      })}
    </div>
  );
}
