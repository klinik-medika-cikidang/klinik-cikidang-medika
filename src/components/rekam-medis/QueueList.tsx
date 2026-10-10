'use client';

import React, { useState } from 'react';
import {
  Users,
  MagnifyingGlass,
  ArrowClockwise,
  Clock,
  CheckCircle,
  Stethoscope,
  MapPin,
  XCircle,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import type { Visit } from '@/types/database';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface QueueListProps {
  visits: Visit[];
  selectedVisitId: string | null;
  onSelectVisit: (visit: Visit) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onCancelVisit?: (visit: Visit) => void;
  onRestoreVisit?: (visit: Visit) => void;
}

export function QueueList({
  visits,
  selectedVisitId,
  onSelectVisit,
  isLoading,
  onRefresh,
  onCancelVisit,
  onRestoreVisit,
}: QueueListProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'waiting' | 'done' | 'cancelled'>('waiting');
  const [searchQuery, setSearchQuery] = useState('');

  const isVisitCancelled = (v: Visit) => v.status_pembayaran === 'Batal';
  const isVisitDone = (v: Visit) =>
    !isVisitCancelled(v) && (v.status_pembayaran !== 'Menunggu Dokter' || Boolean(v.kode_icd10));
  const isVisitWaiting = (v: Visit) => !isVisitCancelled(v) && !isVisitDone(v);

  const filteredVisits = visits.filter((v) => {
    if (filterStatus === 'waiting' && !isVisitWaiting(v)) return false;
    if (filterStatus === 'done' && !isVisitDone(v)) return false;
    if (filterStatus === 'cancelled' && !isVisitCancelled(v)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = v.pasien?.nama?.toLowerCase().includes(q) || false;
      const rmMatch = v.pasien?.no_rm?.toLowerCase().includes(q) || false;
      const desaMatch = v.pasien?.desa?.toLowerCase().includes(q) || false;
      return nameMatch || rmMatch || desaMatch;
    }

    return true;
  });

  const waitingCount = visits.filter(isVisitWaiting).length;
  const doneCount = visits.filter(isVisitDone).length;
  const cancelledCount = visits.filter(isVisitCancelled).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double flex flex-col h-[520px] lg:h-[calc(100vh-140px)] min-h-0 overflow-hidden">
      {/* Header Panel */}
      <div className="p-4 border-b border-slate-200/90 bg-slate-50/70 space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 border border-teal-100/80 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Antrean Ruang Periksa
              </h2>
              <p className="text-[11px] text-slate-500 font-normal">
                {waitingCount} pasien menunggu panggilan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="w-8 h-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-slate-200/90 shadow-2xs flex items-center justify-center tactile-btn shrink-0"
            title="Muat ulang antrean"
            aria-label="Muat ulang antrean pasien"
          >
            <ArrowClockwise className={cn('w-4 h-4', isLoading && 'animate-spin text-teal-600')} weight="bold" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <MagnifyingGlass className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" weight="bold" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pasien, No RM, atau desa..."
            aria-label="Cari pasien dalam antrean"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 min-h-[36px] transition font-medium"
          />
        </div>

        {/* Recessed Track Filter Tabs (Dashboard Style) */}
        <div className="w-full bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/90 shadow-2xs grid grid-cols-4 gap-0.5">
          <button
            type="button"
            onClick={() => setFilterStatus('waiting')}
            className={cn(
              'h-7 sm:h-8 px-1 rounded-lg text-xs transition-all tactile-btn flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none',
              filterStatus === 'waiting'
                ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent font-medium'
            )}
          >
            <span>Menunggu</span>
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded-full text-[10px] font-mono font-bold">
              {waitingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('done')}
            className={cn(
              'h-7 sm:h-8 px-1 rounded-lg text-xs transition-all tactile-btn flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none',
              filterStatus === 'done'
                ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent font-medium'
            )}
          >
            <span>Selesai</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-mono font-bold">
              {doneCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('cancelled')}
            className={cn(
              'h-7 sm:h-8 px-1 rounded-lg text-xs transition-all tactile-btn flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none',
              filterStatus === 'cancelled'
                ? 'bg-white text-rose-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent font-medium'
            )}
          >
            <span>Batal</span>
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-900 rounded-full text-[10px] font-mono font-bold">
              {cancelledCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={cn(
              'h-7 sm:h-8 px-1 rounded-lg text-xs transition-all tactile-btn flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none',
              filterStatus === 'all'
                ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent font-medium'
            )}
          >
            <span>Semua</span>
            <span className="text-[10px] text-slate-500 font-mono">({visits.length})</span>
          </button>
        </div>
      </div>

      {/* Patient Queue Cards Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 space-y-3">
            <ArrowClockwise className="w-6 h-6 animate-spin mx-auto text-teal-600" weight="bold" />
            <p className="text-xs font-medium text-slate-600">Memuat antrean pasien dari database...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/60 border border-dashed border-slate-300 rounded-2xl space-y-3 my-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mx-auto shadow-well">
              <CheckCircle className="w-6 h-6" weight="duotone" />
            </div>
            <div className="max-w-xs mx-auto">
              <h4 className="text-xs font-bold text-slate-900">
                {filterStatus === 'waiting'
                  ? 'Tidak Ada Antrean Menunggu di Poli'
                  : filterStatus === 'cancelled'
                    ? 'Tidak Ada Antrean yang Dibatalkan'
                    : 'Belum Ada Pasien Terdata'}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {filterStatus === 'waiting'
                  ? 'Seluruh pasien yang terdaftar telah selesai diperiksa dokter. Pasien baru dari loket akan otomatis muncul di sini.'
                  : filterStatus === 'cancelled'
                    ? 'Tidak ada antrean pasien yang berstatus batal untuk tanggal periksa ini.'
                    : 'Tidak ada data antrean pasien yang cocok dengan kriteria pencarian Anda.'}
              </p>
            </div>
          </div>
        ) : (
          filteredVisits.map((visit) => {
            const isSelected = selectedVisitId === visit.id;
            const cancelled = isVisitCancelled(visit);
            const done = isVisitDone(visit);
            const waiting = isVisitWaiting(visit);
            const fullName = visit.pasien
              ? [visit.pasien.gelar, visit.pasien.nama].filter(Boolean).join(' ')
              : 'Pasien';
            const queueNumberStr = String(visit.nomor_antrian || '0').padStart(2, '0');

            return (
              <div
                key={visit.id}
                onClick={() => onSelectVisit(visit)}
                className={cn(
                  'p-3 rounded-xl border transition-all cursor-pointer select-none space-y-2 tactile-card',
                  isSelected
                    ? 'border-teal-600 bg-teal-50/70 shadow-xs ring-2 ring-teal-500/20'
                    : cancelled
                      ? 'border-rose-200/90 bg-rose-50/30 hover:border-rose-300 shadow-2xs'
                      : 'border-slate-200/90 bg-white hover:border-teal-300 hover:bg-slate-50/80 shadow-2xs'
                )}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Token Number Box */}
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border shadow-2xs',
                        cancelled
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : done
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                            : 'bg-amber-100 border-amber-300 text-amber-900'
                      )}
                    >
                      #{queueNumberStr}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-xs text-slate-900 truncate">
                          {fullName}
                        </h3>
                        <Badge
                          variant={visit.jenis_pasien === 'BPJS' ? 'bpjs' : 'umum'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {visit.jenis_pasien}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono text-teal-700 font-bold text-[10px]">
                          {visit.pasien?.no_rm || '-'}
                        </span>
                        <span>•</span>
                        <span className="truncate flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" weight="duotone" />
                          {visit.pasien?.desa || '-'}
                        </span>
                        {visit.pasien?.usia !== undefined && (
                          <>
                            <span>•</span>
                            <span>{visit.pasien.usia} th</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {cancelled ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                      <XCircle className="w-3 h-3 text-rose-600" weight="fill" />
                      Batal
                    </span>
                  ) : done ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle className="w-3 h-3 text-emerald-600" weight="fill" />
                      Selesai
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" weight="bold" />
                      Antre
                    </span>
                  )}
                </div>

                {/* Complaint Preview */}
                {visit.keluhan_anamnesa && !cancelled && (
                  <p className="text-[11px] text-slate-600 line-clamp-1 bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-200/80 font-medium">
                    <span className="font-bold text-slate-700">Keluhan: </span>
                    {visit.keluhan_anamnesa}
                  </p>
                )}

                {/* Cancellation Reason Preview */}
                {cancelled && visit.alasan_batal && (
                  <p className="text-[11px] text-rose-800 bg-rose-50/80 px-2.5 py-1.5 rounded-xl border border-rose-200/80 font-medium leading-relaxed">
                    <span className="font-bold text-rose-900">Alasan: </span>
                    {visit.alasan_batal}
                  </p>
                )}

                {/* Direct Action Bar */}
                <div className="pt-1 flex items-center justify-between gap-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {visit.jam_periksa || 'Hari ini'}
                  </span>

                  {cancelled ? (
                    onRestoreVisit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreVisit(visit);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition tactile-btn flex items-center gap-1 min-h-[30px] bg-white hover:bg-slate-50 text-teal-700 border border-teal-200 shadow-btn-secondary"
                        title="Pulihkan antrean pasien ke status menunggu dokter"
                      >
                        <ArrowCounterClockwise className="w-3.5 h-3.5 text-teal-600" weight="bold" />
                        <span>Pulihkan Antrean</span>
                      </button>
                    )
                  ) : waiting ? (
                    <div className="flex items-center gap-1.5">
                      {onCancelVisit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelVisit(visit);
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 transition tactile-btn min-h-[30px] flex items-center gap-1"
                          title="Batalkan antrean pasien ini"
                          aria-label={`Batalkan antrean ${fullName}`}
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" weight="bold" />
                          <span>Batalkan</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVisit(visit);
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-bold transition tactile-btn flex items-center gap-1 min-h-[30px]',
                          isSelected
                            ? 'bg-teal-600 text-white shadow-btn-primary'
                            : 'bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 shadow-btn-secondary'
                        )}
                      >
                        <Stethoscope className="w-3.5 h-3.5" weight="bold" />
                        <span>{isSelected ? 'Sedang Diperiksa' : 'Panggil & Periksa'}</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">
                      Telah Selesai
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default QueueList;
