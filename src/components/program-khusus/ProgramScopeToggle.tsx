'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export type ProgramScope = 'aktif' | 'semua';

export type ScopeEmptyReason = 'empty-register' | 'none-active' | 'hidden-by-scope' | 'no-match';

export interface ScopeEmptyInput {
  scope: ProgramScope;
  /** Rows in the full register, before scope, search, or filter. */
  totalCount: number;
  /** Rows the active scope hides that would otherwise match the current search and filter. */
  hiddenMatchCount: number;
  /** True when a search query or a non-default filter is applied. */
  isNarrowed: boolean;
}

// Since F-022 the registers open on Pasien Aktif, so an empty list no longer means the
// patient was never recorded. Telling staff "belum ada riwayat" here invites duplicate entries.
export function scopeEmptyReason({
  scope,
  totalCount,
  hiddenMatchCount,
  isNarrowed,
}: ScopeEmptyInput): ScopeEmptyReason {
  if (totalCount === 0) return 'empty-register';
  if (scope === 'aktif' && hiddenMatchCount > 0) return isNarrowed ? 'hidden-by-scope' : 'none-active';
  return 'no-match';
}

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
      className="grid grid-cols-2 gap-2 w-full p-1 bg-slate-100 rounded-xl border border-slate-200/80 sm:inline-flex sm:items-center sm:w-auto sm:self-start sm:shrink-0 xl:self-auto"
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
              'min-h-[44px] min-w-[44px] w-full px-2 text-xs sm:w-auto sm:px-3 sm:whitespace-nowrap',
              isSelected ? 'text-teal-800' : 'text-slate-600 font-semibold shadow-none'
            )}
          >
            {/* Below sm the count drops to its own line so both buttons fit side by side at 360px. */}
            <span className="flex flex-col items-center leading-tight sm:flex-row sm:gap-1">
              <span>{option.label}</span>
              <span className="font-mono tabular-nums">
                ({option.id === 'aktif' ? activeCount : totalCount})
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
