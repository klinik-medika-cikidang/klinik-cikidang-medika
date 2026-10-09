'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MagnifyingGlass,
  CreditCard,
  Receipt,
  Ticket,
  NotePencil,
  Stethoscope,
  Users,
  CheckCircle,
  PlusCircle,
} from '@phosphor-icons/react';
import type { Visit, Patient } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export type TableFilterTab =
  | 'hari_ini'
  | 'menunggu_dokter'
  | 'menunggu_kasir'
  | 'selesai'
  | 'master_pasien';

export interface MasterPatientTableProps {
  visits: Visit[];
  isLoadingVisits: boolean;
  resetSignal?: number;
  onSelectForPayment: (visit: Visit) => void;
  onPrintReceipt: (visit: Visit) => void;
  onPrintTicket: (visit: Visit) => void;
  onEditPatient: (patient: Patient) => void;
  onRegisterVisit: (patient: Patient) => void;
}

interface SearchSuggestion {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  queryValue: string;
}

export function MasterPatientTable({
  visits,
  isLoadingVisits,
  resetSignal,
  onSelectForPayment,
  onPrintReceipt,
  onPrintTicket,
  onEditPatient,
  onRegisterVisit,
}: MasterPatientTableProps) {
  const [activeTab, setActiveTab] = useState<TableFilterTab>('hari_ini');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const itemsPerPage = 10;

  const isSettled = (v: Visit) =>
    v.status_pembayaran === 'Lunas' || v.status_pembayaran === 'Ditanggung BPJS';

  const isWaitingDoctor = (v: Visit) => {
    if (isSettled(v)) return false;
    if (v.status_pembayaran === 'Menunggu Kasir') return false;
    return v.status_pembayaran === 'Menunggu Dokter' || !v.kode_icd10;
  };

  const isWaitingPayment = (v: Visit) => {
    if (isSettled(v)) return false;
    if (isWaitingDoctor(v)) return false;
    return (
      v.status_pembayaran === 'Menunggu Kasir' ||
      v.status_pembayaran === 'Menunggu Pembayaran' ||
      Boolean(v.kode_icd10)
    );
  };

  const countMenungguDokter = useMemo(
    () => visits.filter(isWaitingDoctor).length,
    [visits]
  );
  const countMenungguKasir = useMemo(
    () => visits.filter(isWaitingPayment).length,
    [visits]
  );
  const countSelesai = useMemo(
    () => visits.filter(isSettled).length,
    [visits]
  );

  const normalizedSearchQuery = searchQuery.toLowerCase().trim();
  const searchTerm = normalizedSearchQuery.replace(/[%,()]/g, '').trim();
  const isSearching = normalizedSearchQuery.length > 0;
  const showMasterView = isSearching || activeTab === 'master_pasien';

  // The clinic has thousands of patients, so the master view is searched and paged on the
  // database. Only the rows for the current page are held in memory.
  const [masterRows, setMasterRows] = useState<Patient[]>([]);
  const [masterTotal, setMasterTotal] = useState<number | null>(null);
  const [masterCount, setMasterCount] = useState(0);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);

  // The tab label states the true total, so it is counted once rather than inferred from a page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { count, error } = await supabase
          .from('patients')
          .select('id', { count: 'exact', head: true });
        if (error) throw error;
        if (!cancelled) setMasterTotal(count ?? 0);
      } catch (err) {
        console.error('Error counting patients:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resetSignal]);

  useEffect(() => {
    if (!showMasterView) return;

    if (isSearching && searchTerm.length < 2) {
      setMasterRows([]);
      setMasterCount(0);
      setIsLoadingMaster(false);
      return;
    }

    let cancelled = false;
    setIsLoadingMaster(true);

    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        let request = supabase.from('patients').select('*', { count: 'exact' });
        if (searchTerm.length >= 2) {
          request = request.or(
            `nama.ilike.%${searchTerm}%,no_rm.ilike.%${searchTerm}%,desa.ilike.%${searchTerm}%`
          );
        }

        const from = (currentPage - 1) * itemsPerPage;
        const { data, error, count } = await request
          .order(searchTerm.length >= 2 ? 'nama' : 'created_at', {
            ascending: searchTerm.length >= 2,
          })
          .range(from, from + itemsPerPage - 1);

        if (error) throw error;
        if (cancelled) return;
        setMasterRows((data as unknown as Patient[]) || []);
        setMasterCount(count ?? 0);
      } catch (err) {
        console.error('Error loading master patients:', err);
        if (!cancelled) {
          setMasterRows([]);
          setMasterCount(0);
        }
      } finally {
        if (!cancelled) setIsLoadingMaster(false);
      }
    }, isSearching ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showMasterView, isSearching, searchTerm, currentPage, resetSignal]);

  const filteredVisitsByTab = useMemo(() => {
    return visits.filter((v) => {
      if (activeTab === 'menunggu_dokter' && !isWaitingDoctor(v)) return false;
      if (activeTab === 'menunggu_kasir' && !isWaitingPayment(v)) return false;
      if (activeTab === 'selesai' && !isSettled(v)) return false;
      if (activeTab === 'master_pasien') return false;
      return true;
    });
  }, [activeTab, visits]);

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    if (!isSearching) return [];

    return masterRows.slice(0, 8).map((p) => ({
      id: `patient-${p.id}`,
      title: [p.gelar, p.nama].filter(Boolean).join(' '),
      subtitle: p.no_rm || '-',
      meta: p.desa || 'Desa belum diisi',
      queryValue: p.no_rm || p.nama || '',
    }));
  }, [isSearching, masterRows]);

  useEffect(() => {
    const hasQuery = searchQuery.trim().length > 0;
    if (hasQuery && searchSuggestions.length > 0) {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  }, [searchQuery, searchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setHighlightedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightedSuggestionIndex((current) => {
      if (!isSearchOpen || searchSuggestions.length === 0) return -1;
      if (current >= searchSuggestions.length) return searchSuggestions.length - 1;
      return current;
    });
  }, [isSearchOpen, searchSuggestions]);

  const applySearchQuery = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setIsSearchOpen(false);
    setHighlightedSuggestionIndex(-1);
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || searchSuggestions.length === 0) {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setHighlightedSuggestionIndex(-1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedSuggestionIndex((prev) =>
        prev < searchSuggestions.length - 1 ? prev + 1 : 0
      );
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : searchSuggestions.length - 1
      );
      return;
    }

    if (e.key === 'Enter' && highlightedSuggestionIndex >= 0) {
      e.preventDefault();
      applySearchQuery(searchSuggestions[highlightedSuggestionIndex].queryValue);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
      setHighlightedSuggestionIndex(-1);
    }
  };

  const totalPages = showMasterView
    ? Math.max(1, Math.ceil(masterCount / itemsPerPage))
    : Math.max(1, Math.ceil(filteredVisitsByTab.length / itemsPerPage));

  const paginatedData = useMemo(() => {
    if (showMasterView) return masterRows;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVisitsByTab.slice(start, start + itemsPerPage);
  }, [showMasterView, masterRows, filteredVisitsByTab, currentPage]);

  const activeRowCount = showMasterView ? masterCount : filteredVisitsByTab.length;
  const isTableLoading = showMasterView ? isLoadingMaster : isLoadingVisits;

  // With thousands of rows there are many pages, so the number buttons follow the current page.
  const pageWindow = useMemo(() => {
    const size = 5;
    let start = Math.max(1, currentPage - Math.floor(size / 2));
    const end = Math.min(totalPages, start + size - 1);
    start = Math.max(1, end - size + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const handleTabChange = (tab: TableFilterTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // A newly registered visit must be visible straight away, so a register action clears any
  // active search and returns the table to the day's list.
  const lastResetSignal = useRef(resetSignal);
  useEffect(() => {
    if (lastResetSignal.current === resetSignal) return;
    lastResetSignal.current = resetSignal;
    setSearchQuery('');
    setActiveTab('hari_ini');
    setCurrentPage(1);
    setIsSearchOpen(false);
  }, [resetSignal]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-card-double space-y-4 tactile-card">
      {/* Table Header (Harmonized with Dashboard Header Pattern) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-xl shrink-0">
            <Users className="w-5 h-5 text-teal-600" weight="duotone" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Daftar Master Pasien &amp; Antrean Kunjungan
            </h3>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              Cari, filter, dan kelola data antrean kunjungan serta master pasien terdaftar
            </p>
          </div>
        </div>

        <div ref={searchContainerRef} className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <MagnifyingGlass className="w-3.5 h-3.5" weight="bold" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0 && searchSuggestions.length > 0) {
                setIsSearchOpen(true);
              }
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cari pasien, No. RM, desa..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 focus:bg-white transition-colors min-h-[36px]"
          />

          {isSearchOpen && searchSuggestions.length > 0 && (
            <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-slate-200/90 rounded-2xl shadow-popover z-50 overflow-hidden">
              <ul className="max-h-72 overflow-y-auto py-1">
                {searchSuggestions.map((item, idx) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySearchQuery(item.queryValue)}
                      className={cn(
                        'w-full px-3 py-2 text-left transition-colors flex items-start justify-between gap-2',
                        idx === highlightedSuggestionIndex
                          ? 'bg-teal-50/80 border-l-2 border-l-teal-600'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">{item.meta}</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                        {item.subtitle}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs (Beveled Capsule per component-showcase.html) */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 w-full sm:w-fit overflow-x-auto select-none">
        <button
          type="button"
          onClick={() => handleTabChange('hari_ini')}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all tactile-btn',
            activeTab === 'hari_ini'
              ? 'bg-white text-slate-900 shadow-btn-secondary'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          Semua Kunjungan ({visits.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('menunggu_dokter')}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all tactile-btn flex items-center gap-1',
            activeTab === 'menunggu_dokter'
              ? 'bg-white text-slate-900 shadow-btn-secondary'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Stethoscope className="w-3.5 h-3.5 text-teal-600" weight="duotone" />
          <span>Menunggu Dokter ({countMenungguDokter})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('menunggu_kasir')}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all tactile-btn flex items-center gap-1',
            activeTab === 'menunggu_kasir'
              ? 'bg-white text-slate-900 shadow-btn-secondary'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <CreditCard className="w-3.5 h-3.5 text-purple-600" weight="duotone" />
          <span>Menunggu Kasir ({countMenungguKasir})</span>
          {countMenungguKasir > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('selesai')}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all tactile-btn flex items-center gap-1',
            activeTab === 'selesai'
              ? 'bg-white text-slate-900 shadow-btn-secondary'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" weight="duotone" />
          <span>Selesai / Lunas ({countSelesai})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('master_pasien')}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all tactile-btn flex items-center gap-1',
            activeTab === 'master_pasien'
              ? 'bg-white text-teal-700 shadow-btn-secondary font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Users className="w-3.5 h-3.5 text-teal-600" weight="duotone" />
          <span>Database Master Pasien{masterTotal !== null ? ` (${masterTotal})` : ''}</span>
        </button>
      </div>

      {/* Data Table */}
      {showMasterView && !isSearching && (
        <p className="text-[11px] text-slate-500 -mt-1">
          Ketik nama, No. RM, atau desa untuk mencari seluruh database pasien. Gunakan tombol
          halaman di bawah untuk menelusuri sisanya.
        </p>
      )}
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-xs border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200">
              <th className="text-left px-3.5 py-2.5 font-bold text-slate-600 uppercase tracking-wider text-[10px] whitespace-nowrap">
                No. RM
              </th>
              <th className="text-left px-3.5 py-2.5 font-bold text-slate-600 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Nama / Usia
              </th>
              <th className="text-left px-3.5 py-2.5 font-bold text-slate-600 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Desa / Domisili
              </th>
              <th className="text-left px-3.5 py-2.5 font-bold text-slate-600 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Jaminan
              </th>
              <th className="text-left px-3.5 py-2.5 font-bold text-slate-600 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Status
              </th>
              <th className="text-right px-3.5 py-2.5 font-bold text-slate-600 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isTableLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>
                    {showMasterView && isSearching
                      ? 'Mencari pasien di seluruh database...'
                      : 'Memuat data dari database klinik...'}
                  </span>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" weight="duotone" />
                  <p className="font-semibold text-slate-600 text-xs">
                    {isSearching ? 'Tidak ada pasien yang cocok' : 'Tidak ada data ditemukan'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isSearching && searchTerm.length < 2
                      ? 'Ketik minimal 2 karakter untuk mencari pasien.'
                      : isSearching
                        ? `Kata kunci "${searchQuery.trim()}" tidak ditemukan pada nama, No. RM, atau desa.`
                        : 'Coba ubah kata kunci pencarian atau pilih tab status lain.'}
                  </p>
                </td>
              </tr>
            ) : showMasterView ? (
              // Master Patients View
              (paginatedData as Patient[]).map((patient) => {
                const fullName = [patient.gelar, patient.nama].filter(Boolean).join(' ');
                const isBpjs = Boolean(patient.no_bpjs);

                return (
                  <tr
                    key={patient.id}
                    className="hover:bg-teal-50/50 transition-colors group"
                  >
                    <td className="px-3.5 py-2.5 font-mono font-bold text-teal-700 whitespace-nowrap">
                      {patient.no_rm}
                    </td>

                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-slate-900">{fullName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {patient.usia !== undefined ? `${patient.usia} thn` : '-'},{' '}
                        {patient.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                      </div>
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-700 font-medium whitespace-nowrap">
                      {patient.desa || '-'}
                    </td>

                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {isBpjs ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                          BPJS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                          Umum
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Terdaftar
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRegisterVisit(patient)}
                          className="px-2.5 py-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-[11px] font-bold shadow-btn-primary border border-teal-700/80 flex items-center gap-1 tactile-btn min-h-[32px]"
                          title="Daftarkan kunjungan baru untuk pasien ini"
                        >
                          <PlusCircle className="w-3.5 h-3.5" weight="bold" />
                          <span>Daftar Kunjungan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditPatient(patient)}
                          className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-[11px] font-bold shadow-btn-secondary transition-colors tactile-btn min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Edit biodata pasien"
                        >
                          <NotePencil className="w-3.5 h-3.5 text-slate-600" weight="bold" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              // Visits View
              (paginatedData as Visit[]).map((visit) => {
                const p = visit.pasien;
                const patientName = p
                  ? [p.gelar, p.nama].filter(Boolean).join(' ')
                  : 'Pasien Tidak Diketahui';

                const isBpjs = visit.jenis_pasien === 'BPJS';

                return (
                  <tr
                    key={visit.id}
                    className="hover:bg-teal-50/50 transition-colors group"
                  >
                    <td className="px-3.5 py-2.5 font-mono font-bold text-teal-700 whitespace-nowrap">
                      {p?.no_rm || '-'}
                    </td>

                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-slate-900">{patientName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {p?.usia !== undefined ? `${p.usia} thn` : '-'},{' '}
                        {p?.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                      </div>
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-700 font-medium whitespace-nowrap">
                      {p?.desa || '-'}
                    </td>

                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {isBpjs ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                          BPJS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                          Umum
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {isWaitingDoctor(visit) ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          Menunggu Dokter
                        </span>
                      ) : isWaitingPayment(visit) ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                          Siap Bayar
                        </span>
                      ) : isSettled(visit) ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Selesai
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {visit.status_pembayaran}
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. Primary Action: Bayar Kasir */}
                        {isWaitingPayment(visit) && (
                          <button
                            type="button"
                            onClick={() => onSelectForPayment(visit)}
                            className="px-2.5 py-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-[11px] font-bold shadow-btn-primary border border-teal-700/80 flex items-center gap-1 tactile-btn min-h-[32px]"
                            title="Buka transaksi di panel kasir"
                          >
                            <CreditCard className="w-3.5 h-3.5" weight="bold" />
                            <span>Bayar Kasir</span>
                          </button>
                        )}

                        {/* 2. Primary Action: Kuitansi */}
                        {isSettled(visit) && (
                          <button
                            type="button"
                            onClick={() => onPrintReceipt(visit)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 rounded-xl text-[11px] font-bold shadow-btn-secondary transition-colors tactile-btn flex items-center gap-1 min-h-[32px]"
                            title="Cetak kuitansi resmi klinik"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" weight="duotone" />
                            <span>Kuitansi</span>
                          </button>
                        )}

                        {/* 3. Primary Action: Karcis */}
                        {isWaitingDoctor(visit) && (
                          <button
                            type="button"
                            onClick={() => onPrintTicket(visit)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-teal-700 border border-teal-300 rounded-xl text-[11px] font-bold shadow-btn-secondary transition-colors tactile-btn flex items-center gap-1 min-h-[32px]"
                            title="Cetak karcis nomor antrian"
                          >
                            <Ticket className="w-3.5 h-3.5 text-teal-600" weight="duotone" />
                            <span>Karcis</span>
                          </button>
                        )}

                        {/* Secondary Action: Edit Biodata Pasien */}
                        {p && (
                          <button
                            type="button"
                            onClick={() => onEditPatient(p)}
                            className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-[11px] font-bold shadow-btn-secondary transition-colors tactile-btn min-h-[32px] min-w-[32px] flex items-center justify-center"
                            title="Edit biodata pasien"
                          >
                            <NotePencil className="w-3.5 h-3.5 text-slate-600" weight="bold" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 text-[10px] text-slate-500 font-medium gap-2 border-t border-slate-100">
        <span>
          Menampilkan{' '}
          <strong className="text-slate-800 font-mono">
            {activeRowCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
          </strong>{' '}
          sampai{' '}
          <strong className="text-slate-800 font-mono">
            {Math.min(currentPage * itemsPerPage, activeRowCount)}
          </strong>{' '}
          dari{' '}
          <strong className="text-slate-800 font-mono">{activeRowCount}</strong>{' '}
          data
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed tactile-btn"
            >
              &#8249;
            </button>

            {pageWindow.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors',
                  currentPage === pageNum
                    ? 'bg-teal-600 border border-teal-700 text-white shadow-2xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 tactile-btn'
                )}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed tactile-btn"
            >
              &#8250;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MasterPatientTable;
