'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  ArrowClockwise,
  WarningCircle,
  CalendarCheck,
  MagnifyingGlass,
  Funnel,
  XCircle,
  Heartbeat,
} from '@phosphor-icons/react';
import { Lungs, BandageAdhesive } from 'healthicons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { TbcProgram, Circumcision, PostCare, PublicHealthRecord } from '@/types/database';
import { ProgramKhususKpis } from '@/components/program-khusus/ProgramKhususKpis';
import { TbcControlCard } from '@/components/program-khusus/TbcControlCard';
import { NewTbcModal } from '@/components/program-khusus/NewTbcModal';
import { CircumcisionList } from '@/components/program-khusus/CircumcisionList';
import { NewCircumcisionModal } from '@/components/program-khusus/NewCircumcisionModal';
import { PostCareAgenda } from '@/components/program-khusus/PostCareAgenda';
import { NewPostCareModal } from '@/components/program-khusus/NewPostCareModal';
import { PublicHealthRegistry } from '@/components/program-khusus/PublicHealthRegistry';
import { NewPublicHealthModal } from '@/components/program-khusus/NewPublicHealthModal';
import { formatLocalDateToYMD, getErrorMessage } from '@/lib/utils';
import {
  isActiveCircumcision,
  isActivePostCare,
  isActiveTbc,
  isDueTodayPostCare,
  isOverduePostCare,
} from '@/lib/program-status';
import { SIRKUMSISI_ACTIVE_DAYS } from '@/constants/clinic';
import {
  ProgramScopeToggle,
  scopeEmptyReason,
  type ProgramScope,
  type ScopeEmptyReason,
} from '@/components/program-khusus/ProgramScopeToggle';
import { Button } from '@/components/ui/Button';

type ProgramTab = 'tbc' | 'circumcision' | 'postcare' | 'kesehatan';
type TbcFilter = 'all' | 'intensif' | 'lanjutan' | 'mangkir' | 'selesai';
type CircumcisionFilter = 'all' | 'laser' | 'klamp' | 'konvensional' | 'pending-photo';
type ScopedTab = Exclude<ProgramTab, 'kesehatan'>;

interface EmptyCopy {
  title: string;
  message: string;
}

function tbcEmptyCopy(reason: ScopeEmptyReason, hiddenCount: number, query: string): EmptyCopy {
  switch (reason) {
    case 'empty-register':
      return {
        title: 'Belum ada pasien di kohort TBC',
        message: 'Klik tombol "Pasien TBC Baru" untuk mendaftarkan.',
      };
    case 'none-active':
      return {
        title: 'Tidak ada pasien TBC aktif',
        message:
          'Tidak ada pasien TBC yang sedang dalam pengobatan atau mangkir. Pilih "Semua Riwayat" untuk melihat riwayat kohort.',
      };
    case 'hidden-by-scope':
      return {
        title: 'Tidak ditemukan di Pasien Aktif',
        message: `${hiddenCount} pasien yang cocok sudah sembuh atau selesai berobat. Pilih "Semua Riwayat" untuk melihatnya.`,
      };
    case 'no-match':
      return {
        title: 'Tidak ada pasien TBC yang sesuai kriteria',
        message: query
          ? `Pencarian "${query}" tidak menemukan data di seluruh riwayat kohort. Periksa ejaan nama, No. RM, atau desa.`
          : 'Tidak ada pasien yang cocok dengan filter ini. Pilih filter lain.',
      };
  }
}

function circumcisionEmptyCopy(reason: ScopeEmptyReason, hiddenCount: number, query: string): EmptyCopy | null {
  switch (reason) {
    case 'empty-register':
      return null;
    case 'none-active':
      return {
        title: 'Tidak ada tindakan sirkumsisi aktif',
        message: `Tidak ada tindakan sirkumsisi dalam ${SIRKUMSISI_ACTIVE_DAYS} hari terakhir. Pilih "Semua Riwayat" untuk melihat tindakan sebelumnya.`,
      };
    case 'hidden-by-scope':
      return {
        title: 'Tidak ditemukan di Pasien Aktif',
        message: `${hiddenCount} tindakan yang cocok sudah lewat ${SIRKUMSISI_ACTIVE_DAYS} hari atau belum punya tanggal tindakan. Pilih "Semua Riwayat" untuk melihatnya.`,
      };
    case 'no-match':
      return {
        title: 'Tidak ada tindakan yang sesuai kriteria',
        message: query
          ? `Pencarian "${query}" tidak menemukan data di seluruh riwayat sirkumsisi. Periksa ejaan nama, No. RM, desa, atau dokter.`
          : 'Tidak ada tindakan yang cocok dengan filter ini. Pilih filter lain.',
      };
  }
}

export default function ProgramKhususPage() {
  const [activeTab, setActiveTab] = useState<ProgramTab>('tbc');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [tbcFilter, setTbcFilter] = useState<TbcFilter>('all');
  const [circFilter, setCircFilter] = useState<CircumcisionFilter>('all');
  // F-022: the three registers open on active patients; "Semua" restores the full history.
  const [viewScope, setViewScope] = useState<Record<ScopedTab, ProgramScope>>({
    tbc: 'aktif',
    circumcision: 'aktif',
    postcare: 'aktif',
  });

  // Data states
  const [tbcList, setTbcList] = useState<TbcProgram[]>([]);
  const [circumcisionList, setCircumcisionList] = useState<Circumcision[]>([]);
  const [postCareList, setPostCareList] = useState<PostCare[]>([]);
  const [publicHealthList, setPublicHealthList] = useState<PublicHealthRecord[]>([]);

  // Modal open states
  const [isTbcModalOpen, setIsTbcModalOpen] = useState(false);
  const [isCircumcisionModalOpen, setIsCircumcisionModalOpen] = useState(false);
  const [isPostCareModalOpen, setIsPostCareModalOpen] = useState(false);
  const [isPublicHealthModalOpen, setIsPublicHealthModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // 1. Fetch TBC programs
      const { data: tbcData, error: tbcErr } = await supabase
        .from('tbc_programs')
        .select('*, pasien:patients(id, no_rm, nama, desa, usia, jenis_kelamin, no_telepon)')
        .order('created_at', { ascending: false });
      if (tbcErr) throw tbcErr;
      setTbcList((tbcData as unknown as TbcProgram[]) || []);

      // 2. Fetch Circumcisions
      const { data: circData, error: circErr } = await supabase
        .from('circumcisions')
        .select('*, pasien:patients(id, no_rm, nama, desa, usia, no_telepon), dokter:doctors(id, nama)')
        // Rows still missing a procedure date come first: they are the clinic's work queue.
        .order('tanggal_tindakan', { ascending: false, nullsFirst: true });
      if (circErr) throw circErr;
      setCircumcisionList((circData as unknown as Circumcision[]) || []);

      // 3. Fetch Post Cares
      const { data: postData, error: postErr } = await supabase
        .from('post_cares')
        .select('*, pasien:patients(id, no_rm, nama, desa, usia, no_telepon)')
        .order('tanggal_kontrol_berikutnya', { ascending: true });
      if (postErr) throw postErr;
      setPostCareList((postData as unknown as PostCare[]) || []);

      // 4. Fetch Public Health Records (PTM, ANC, KB, 3 Eliminasi)
      const { data: healthData, error: healthErr } = await supabase
        .from('public_health_records')
        .select('*, pasien:patients(id, no_rm, nama, desa, usia, jenis_kelamin)')
        .order('tanggal_periksa', { ascending: false });
      if (healthErr) throw healthErr;
      setPublicHealthList((healthData as unknown as PublicHealthRecord[]) || []);
    } catch (err) {
      console.error('Error fetching program khusus data:', err);
      setErrorMessage(
        getErrorMessage(err, 'Gagal memuat data program khusus medis.')
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived surveillance counts
  const todayStr = useMemo(() => formatLocalDateToYMD(), []);

  const activeTbcList = useMemo(() => tbcList.filter(isActiveTbc), [tbcList]);
  const activeCircumcisionList = useMemo(
    () => circumcisionList.filter((c) => isActiveCircumcision(c, todayStr)),
    [circumcisionList, todayStr]
  );
  const activePostCareList = useMemo(() => postCareList.filter(isActivePostCare), [postCareList]);

  const scopedTbcList = viewScope.tbc === 'aktif' ? activeTbcList : tbcList;
  const scopedCircumcisionList =
    viewScope.circumcision === 'aktif' ? activeCircumcisionList : circumcisionList;
  const scopedPostCareList = viewScope.postcare === 'aktif' ? activePostCareList : postCareList;

  // KPI cards and tab counters always count active rows, whatever scope the list shows.
  const mangkirTbcCount = useMemo(() => {
    return activeTbcList.filter((t) => {
      if (t.status_tbc === 'Mangkir') return true;
      if (t.status_tbc === 'Dalam Pengobatan') {
        const startDate = new Date(t.tanggal_mulai);
        const now = new Date();
        const monthsPassed =
          (now.getFullYear() - startDate.getFullYear()) * 12 +
          (now.getMonth() - startDate.getMonth());
        return monthsPassed > (t.bulan_ke || 1);
      }
      return false;
    }).length;
  }, [activeTbcList]);

  const intensifTbcCount = useMemo(
    () => activeTbcList.filter((t) => t.fase_pengobatan === 'Intensif' || (t.bulan_ke || 1) <= 2).length,
    [activeTbcList]
  );
  const lanjutanTbcCount = useMemo(
    () => activeTbcList.filter((t) => t.fase_pengobatan === 'Lanjutan' || (t.bulan_ke || 1) > 2).length,
    [activeTbcList]
  );

  const totalCircumcisionRevenue = useMemo(
    () => activeCircumcisionList.reduce((sum, c) => sum + (Number(c.biaya) || 0), 0),
    [activeCircumcisionList]
  );
  const pendingFollowUpPhotos = useMemo(
    () => activeCircumcisionList.filter((c) => !c.foto_2_url).length,
    [activeCircumcisionList]
  );

  const todayPostCareCount = useMemo(
    () => activePostCareList.filter((p) => isDueTodayPostCare(p, todayStr)).length,
    [activePostCareList, todayStr]
  );
  const overduePostCareCount = useMemo(
    () => activePostCareList.filter((p) => isOverduePostCare(p, todayStr)).length,
    [activePostCareList, todayStr]
  );

  // Search and filter predicates are shared by the scoped list and the hidden-match
  // count, so the empty state can tell "outside Pasien Aktif" apart from "not recorded".
  const matchesTbc = useCallback(
    (prog: TbcProgram) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        prog.pasien?.nama?.toLowerCase().includes(q) ||
        prog.pasien?.no_rm?.toLowerCase().includes(q) ||
        prog.pasien?.desa?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (tbcFilter === 'intensif') return (prog.bulan_ke || 1) <= 2;
      if (tbcFilter === 'lanjutan') return (prog.bulan_ke || 1) > 2;
      if (tbcFilter === 'mangkir') return prog.status_tbc === 'Mangkir';
      if (tbcFilter === 'selesai')
        return prog.status_tbc === 'Sembuh' || prog.status_tbc === 'Pengobatan Lengkap';
      return true;
    },
    [searchQuery, tbcFilter]
  );

  const matchesCircumcision = useCallback(
    (rec: Circumcision) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        rec.pasien?.nama?.toLowerCase().includes(q) ||
        rec.pasien?.no_rm?.toLowerCase().includes(q) ||
        rec.pasien?.desa?.toLowerCase().includes(q) ||
        rec.dokter?.nama?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      const m = (rec.metode || '').toLowerCase();
      if (circFilter === 'laser') return m.includes('laser') || m.includes('kauter');
      if (circFilter === 'klamp') return m.includes('klamp');
      if (circFilter === 'konvensional') return m.includes('konvensional');
      if (circFilter === 'pending-photo') return !rec.foto_2_url;
      return true;
    },
    [searchQuery, circFilter]
  );

  const filteredTbcList = useMemo(() => scopedTbcList.filter(matchesTbc), [scopedTbcList, matchesTbc]);
  const filteredCircumcisionList = useMemo(
    () => scopedCircumcisionList.filter(matchesCircumcision),
    [scopedCircumcisionList, matchesCircumcision]
  );

  const hiddenTbcMatchCount = useMemo(
    () => tbcList.filter((t) => !isActiveTbc(t) && matchesTbc(t)).length,
    [tbcList, matchesTbc]
  );
  const hiddenCircumcisionMatchCount = useMemo(
    () =>
      circumcisionList.filter((c) => !isActiveCircumcision(c, todayStr) && matchesCircumcision(c)).length,
    [circumcisionList, todayStr, matchesCircumcision]
  );
  const tbcEmptyReason = scopeEmptyReason({
    scope: viewScope.tbc,
    totalCount: tbcList.length,
    hiddenMatchCount: hiddenTbcMatchCount,
    isNarrowed: searchQuery.trim() !== '' || tbcFilter !== 'all',
  });
  const circumcisionEmptyReason = scopeEmptyReason({
    scope: viewScope.circumcision,
    totalCount: circumcisionList.length,
    hiddenMatchCount: hiddenCircumcisionMatchCount,
    isNarrowed: searchQuery.trim() !== '' || circFilter !== 'all',
  });
  const tbcEmpty = tbcEmptyCopy(tbcEmptyReason, hiddenTbcMatchCount, searchQuery.trim());
  const circumcisionEmpty = circumcisionEmptyCopy(
    circumcisionEmptyReason,
    hiddenCircumcisionMatchCount,
    searchQuery.trim()
  );

  const showAllHistory = (tab: ScopedTab) => setViewScope((prev) => ({ ...prev, [tab]: 'semua' }));

  const filteredPostCareList = useMemo(() => {
    return scopedPostCareList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        item.pasien?.nama?.toLowerCase().includes(q) ||
        item.pasien?.no_rm?.toLowerCase().includes(q) ||
        item.pasien?.desa?.toLowerCase().includes(q)
      );
    });
  }, [scopedPostCareList, searchQuery]);

  const filteredPublicHealthList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return publicHealthList;
    return publicHealthList.filter((item) =>
      [item.nama, item.no_nik, item.alamat, item.diagnosa, item.jenis_kb]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [publicHealthList, searchQuery]);

  return (
    <div className="space-y-6 min-w-0 w-full pb-10">
      {/* 1. Master Clinical Header & Integrated Action Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Register Program Khusus Medis
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              Surveilans Klinis
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Kohort kartu kendali TBC 6 bulan, dokumentasi tindakan sirkumsisi foto privat WebP, dan agenda observasi
          </p>
        </div>

        {/* Adaptive Action Ribbon & Reload Button */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            title="Muat Ulang Data Surveilans"
            className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/90 shadow-btn-secondary tactile-btn transition disabled:opacity-50 flex items-center justify-center min-h-[40px] min-w-[40px] sm:min-h-[38px] sm:min-w-[38px]"
          >
            <ArrowClockwise className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} weight="bold" />
          </button>

          {activeTab === 'tbc' && (
            <button
              type="button"
              onClick={() => setIsTbcModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-3.5 py-2 min-h-[40px] sm:min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <Plus className="w-3.5 h-3.5" weight="bold" />
              <span>Pasien TBC Baru</span>
            </button>
          )}

          {activeTab === 'circumcision' && (
            <button
              type="button"
              onClick={() => setIsCircumcisionModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-3.5 py-2 min-h-[40px] sm:min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <Plus className="w-3.5 h-3.5" weight="bold" />
              <span>Catat Sirkumsisi</span>
            </button>
          )}

          {activeTab === 'postcare' && (
            <button
              type="button"
              onClick={() => setIsPostCareModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-3.5 py-2 min-h-[40px] sm:min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <Plus className="w-3.5 h-3.5" weight="bold" />
              <span>Jadwal Observasi</span>
            </button>
          )}

          {activeTab === 'kesehatan' && (
            <button
              type="button"
              onClick={() => setIsPublicHealthModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white px-3.5 py-2 min-h-[40px] sm:min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-rose-700/80 tactile-btn transition focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
            >
              <Plus className="w-3.5 h-3.5" weight="bold" />
              <span>Program Kesehatan Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Clinical Surveillance KPI Row */}
      <ProgramKhususKpis
        isLoading={isLoading}
        data={{
          totalTbc: activeTbcList.length,
          mangkirTbc: mangkirTbcCount,
          intensifTbc: intensifTbcCount,
          lanjutanTbc: lanjutanTbcCount,
          totalCircumcisions: activeCircumcisionList.length,
          totalCircumcisionRevenue: totalCircumcisionRevenue,
          pendingFollowUpPhotos: pendingFollowUpPhotos,
          postCareTodayCount: todayPostCareCount,
          postCareOverdueCount: overduePostCareCount,
          postCareActiveCount: activePostCareList.length,
        }}
      />

      {/* Error Alert Strip */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <WarningCircle className="w-4 h-4 shrink-0 text-rose-600" weight="duotone" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="font-semibold underline hover:no-underline shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 3. Sleek Recessed Track Segmented Sub-Tab Switcher */}
      <div className="w-full bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('tbc')}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
              activeTab === 'tbc'
                ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
            }`}
          >
            <Lungs className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="min-w-0 flex flex-col items-start text-left leading-tight">
              <span>Kartu Kendali TBC</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-600">{activeTbcList.length} aktif</span>
                {mangkirTbcCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold animate-pulse">
                    {mangkirTbcCount} Mangkir
                  </span>
                )}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('circumcision')}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
              activeTab === 'circumcision'
                ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
            }`}
          >
            <BandageAdhesive className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="min-w-0 flex flex-col items-start text-left leading-tight">
              <span>Sirkumsisi &amp; Foto</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-600">{activeCircumcisionList.length} aktif</span>
                {pendingFollowUpPhotos > 0 && (
                  <span className="bg-teal-100 text-teal-800 text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold">
                    {pendingFollowUpPhotos} Foto H+7
                  </span>
                )}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('postcare')}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
              activeTab === 'postcare'
                ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" weight="duotone" />
            <span className="min-w-0 flex flex-col items-start text-left leading-tight">
              <span>Agenda Observasi</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-600">{activePostCareList.length} aktif</span>
                {todayPostCareCount > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold">
                    {todayPostCareCount} Hari Ini
                  </span>
                )}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kesehatan')}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all tactile-btn flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none ${
              activeTab === 'kesehatan'
                ? 'bg-white text-teal-700 font-bold shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
            }`}
          >
            <Heartbeat className="w-4 h-4 text-rose-600 shrink-0" weight="duotone" />
            <span className="min-w-0 flex flex-col items-start text-left leading-tight">
              <span>Program Kesehatan</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-600">{publicHealthList.length} data</span>
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* 4. Sub-Tab Filter & Universal Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-card-double flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <MagnifyingGlass className="w-4 h-4" weight="bold" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pasien, No. RM, atau wilayah desa..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50/80 hover:bg-slate-100/70 focus:bg-white border border-slate-300/90 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <XCircle className="w-4 h-4" weight="fill" />
            </button>
          )}
        </div>

        {activeTab !== 'kesehatan' && (
          <ProgramScopeToggle
            value={viewScope[activeTab]}
            onChange={(scope) => {
              setViewScope((prev) => ({ ...prev, [activeTab]: scope }));
              if (activeTab === 'tbc' && scope === 'aktif' && tbcFilter === 'selesai') setTbcFilter('all');
            }}
            activeCount={
              activeTab === 'tbc'
                ? activeTbcList.length
                : activeTab === 'circumcision'
                  ? activeCircumcisionList.length
                  : activePostCareList.length
            }
            totalCount={
              activeTab === 'tbc'
                ? tbcList.length
                : activeTab === 'circumcision'
                  ? circumcisionList.length
                  : postCareList.length
            }
          />
        )}

        {/* Contextual Sub-tab Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 overflow-x-auto pb-1 xl:pb-0">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mr-1 shrink-0">
            <Funnel className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter:</span>
          </div>

          {activeTab === 'tbc' && (
            <>
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'intensif', label: 'Fase Intensif' },
                  { id: 'lanjutan', label: 'Fase Lanjutan' },
                  { id: 'mangkir', label: 'Mangkir' },
                  { id: 'selesai', label: 'Sembuh / Selesai' },
                ] as const
              )
                .filter((f) => !(viewScope.tbc === 'aktif' && f.id === 'selesai'))
                .map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTbcFilter(f.id)}
                  className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold tactile-btn transition flex items-center justify-center ${
                    tbcFilter === f.id
                      ? 'bg-teal-600 text-white shadow-btn-primary border border-teal-700 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </>
          )}

          {activeTab === 'circumcision' && (
            <>
              {(
                [
                  { id: 'all', label: 'Semua Metode' },
                  { id: 'laser', label: 'Laser / Kauter' },
                  { id: 'klamp', label: 'Klamp' },
                  { id: 'konvensional', label: 'Konvensional' },
                  { id: 'pending-photo', label: 'Tunggu Foto H+7' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCircFilter(f.id)}
                  className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold tactile-btn transition flex items-center justify-center ${
                    circFilter === f.id
                      ? 'bg-teal-600 text-white shadow-btn-primary border border-teal-700 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </>
          )}

          {activeTab === 'postcare' && (
            <span className="text-[11px] text-slate-500 font-medium">
              Kategori diatur pada tab kronologis di bawah
            </span>
          )}

          {activeTab === 'kesehatan' && (
            <span className="text-[11px] text-slate-500 font-medium">
              Filter program PTM, ANC, KB, dan 3 Eliminasi tersedia pada panel laporan di bawah
            </span>
          )}
        </div>
      </div>

      {/* 5. Tab Content Workspace with Crossfade Motion */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {activeTab === 'tbc' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                <span className="font-medium">
                  Menampilkan kohort OAT terstandar • Pasien mangkir memerlukan kunjungan rumah segera
                </span>
                <span className="text-[11px] font-bold text-slate-700 font-mono">
                  {filteredTbcList.length} dari {scopedTbcList.length} Pasien{viewScope.tbc === 'aktif' ? ' Aktif' : ''}
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-44 bg-white rounded-2xl border border-slate-200/90 shadow-card-double animate-pulse p-5 space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <div className="h-5 w-48 bg-slate-200 rounded"></div>
                        <div className="h-6 w-24 bg-slate-200 rounded-lg"></div>
                      </div>
                      <div className="h-14 bg-slate-100 rounded-xl"></div>
                      <div className="h-8 w-36 bg-slate-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : filteredTbcList.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-600 shadow-card-double">
                  <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl w-fit mx-auto mb-3 border border-purple-200">
                    <Lungs className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {tbcEmpty.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {tbcEmpty.message}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {(tbcEmptyReason === 'hidden-by-scope' || tbcEmptyReason === 'none-active') && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-[44px]"
                        onClick={() => showAllHistory('tbc')}
                      >
                        Tampilkan Semua Riwayat
                      </Button>
                    )}
                    {(searchQuery.trim() !== '' || tbcFilter !== 'all') && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-[44px] text-teal-700 hover:text-teal-900"
                        onClick={() => {
                          setSearchQuery('');
                          setTbcFilter('all');
                        }}
                      >
                        Reset Pencarian &amp; Filter
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTbcList.map((prog) => (
                    <TbcControlCard key={prog.id} program={prog} onRefresh={fetchData} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'circumcision' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                <span className="font-medium">
                  Dokumentasi bedah minor sirkumsisi modern, operator pelaksana, dan evaluasi foto luka privat
                </span>
                <span className="text-[11px] font-bold text-slate-700 font-mono">
                  {filteredCircumcisionList.length} dari {scopedCircumcisionList.length} Tindakan{viewScope.circumcision === 'aktif' ? ' Aktif' : ''}
                </span>
              </div>
              <CircumcisionList
                records={filteredCircumcisionList}
                emptyTitle={circumcisionEmpty?.title}
                emptyMessage={circumcisionEmpty?.message}
                emptyAction={
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {(circumcisionEmptyReason === 'hidden-by-scope' || circumcisionEmptyReason === 'none-active') && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-[44px]"
                        onClick={() => showAllHistory('circumcision')}
                      >
                        Tampilkan Semua Riwayat
                      </Button>
                    )}
                    {(searchQuery.trim() !== '' || circFilter !== 'all') && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-[44px] text-teal-700 hover:text-teal-900"
                        onClick={() => {
                          setSearchQuery('');
                          setCircFilter('all');
                        }}
                      >
                        Reset Pencarian &amp; Filter
                      </Button>
                    )}
                  </div>
                }
                onRefresh={fetchData}
                isLoading={isLoading}
              />
            </div>
          )}

          {activeTab === 'postcare' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                <span className="font-medium">
                  Observasi jadwal kontrol berkala pasien pasca rawat inap atau tindakan medis operatif
                </span>
                <span className="text-[11px] font-bold text-slate-700 font-mono">
                  {filteredPostCareList.length} dari {scopedPostCareList.length} Pasien{viewScope.postcare === 'aktif' ? ' Aktif' : ''}
                </span>
              </div>
              <PostCareAgenda
                records={filteredPostCareList}
                completedHiddenMessage={
                  viewScope.postcare === 'aktif' && postCareList.length > activePostCareList.length
                    ? 'Kontrol yang sudah selesai tidak tampil pada Pasien Aktif. Pilih "Semua Riwayat" untuk melihatnya.'
                    : undefined
                }
                onRefresh={fetchData}
                isLoading={isLoading}
              />
            </div>
          )}

          {activeTab === 'kesehatan' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                <span className="font-medium">
                  Register PTM, ANC, KB, dan 3 Eliminasi untuk pemantauan program serta laporan rutin ke Puskesmas
                </span>
                <span className="text-[11px] font-bold text-slate-700 font-mono">
                  {filteredPublicHealthList.length} dari {publicHealthList.length} Data
                </span>
              </div>
              <PublicHealthRegistry
                records={filteredPublicHealthList}
                isLoading={isLoading}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 6. Form Modals */}
      <NewTbcModal
        isOpen={isTbcModalOpen}
        onClose={() => setIsTbcModalOpen(false)}
        onSuccess={fetchData}
      />
      <NewCircumcisionModal
        isOpen={isCircumcisionModalOpen}
        onClose={() => setIsCircumcisionModalOpen(false)}
        onSuccess={fetchData}
      />
      <NewPostCareModal
        isOpen={isPostCareModalOpen}
        onClose={() => setIsPostCareModalOpen(false)}
        onSuccess={fetchData}
      />
      <NewPublicHealthModal
        isOpen={isPublicHealthModalOpen}
        onClose={() => setIsPublicHealthModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
