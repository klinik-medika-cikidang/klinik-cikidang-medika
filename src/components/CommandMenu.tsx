'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  House,
  UserPlus,
  Stethoscope,
  Heartbeat,
  Wallet,
  FileXls,
  Scissors,
  Pill,
  User,
  ArrowRight,
  Sparkle,
  CircleNotch,
} from '@phosphor-icons/react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { createClient } from '@/lib/supabase/client';
import type { Patient } from '@/types/database';
import { PatientQuickProfileModal } from '@/components/pendaftaran/PatientQuickProfileModal';
import { useAuth } from '@/lib/auth/AuthContext';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  href: string;
  keywords: string[];
}

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isQuickProfileOpen, setIsQuickProfileOpen] = useState(false);
  const router = useRouter();

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounced search patients against Supabase
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setPatients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        const clean = trimmed.replace(/[,()]/g, '');
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .or(`nama.ilike.%${clean}%,no_rm.ilike.%${clean}%,no_ktp.ilike.%${clean}%,no_bpjs.ilike.%${clean}%,desa.ilike.%${clean}%`)
          .limit(8);

        if (!error && data) {
          setPatients(data as unknown as Patient[]);
        } else {
          setPatients([]);
        }
      } catch (err) {
        console.error('Error searching patients:', err);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Predefined Quick Actions
  const quickActions: MenuItem[] = useMemo(
    () => [
      {
        id: 'act-new-patient',
        title: 'Daftarkan Pasien Baru',
        subtitle: 'Input data identitas & rekam medis awal',
        icon: UserPlus,
        iconColor: 'text-teal-600',
        href: '/pendaftaran?action=new',
        keywords: ['daftar', 'pasien baru', 'registrasi', 'tambah pasien', 'rm baru'],
      },
      {
        id: 'act-circumcision',
        title: 'Catat Tindakan Sirkumsisi (Sunat)',
        subtitle: 'Registrasi paket tindakan bedah sunat',
        icon: Scissors,
        iconColor: 'text-emerald-600',
        href: '/program-khusus?tab=circumcision&action=new',
        keywords: ['sunat', 'sirkumsisi', 'khitan', 'bedah', 'tindakan'],
      },
      {
        id: 'act-tbc',
        title: 'Buka Kartu Kendali TBC 6 Bulan',
        subtitle: 'Kohort pemantauan minum obat OAT DOTS',
        icon: Pill,
        iconColor: 'text-rose-600',
        href: '/program-khusus?tab=tbc&action=new',
        keywords: ['tbc', 'tb', 'paru', 'oat', 'dots', 'kendali'],
      },
      {
        id: 'act-cashflow',
        title: 'Catat Mutasi Buku Kas Tunai',
        subtitle: 'Pencatatan pengeluaran atau pendapatan klinik',
        icon: Wallet,
        iconColor: 'text-amber-600',
        href: '/buku-kas?action=new',
        keywords: ['kas', 'buku kas', 'keuangan', 'uang', 'mutasi', 'biaya', 'keluar', 'masuk'],
      },
    ],
    []
  );

  // Predefined Navigation Modules
  const navigationModules: MenuItem[] = useMemo(
    () => [
      {
        id: 'nav-dashboard',
        title: 'Dashboard Eksekutif & Ringkasan',
        subtitle: 'KPI pendapatan harian, tren pasien, & morbiiditas',
        icon: House,
        iconColor: 'text-slate-700',
        href: '/',
        keywords: ['dashboard', 'ringkasan', 'kpi', 'beranda', 'home', 'eksekutif'],
      },
      {
        id: 'nav-pendaftaran',
        title: 'Loket Pendaftaran & Kasir Pasien',
        subtitle: 'Antrean loket, kasir POS, & data master pasien',
        icon: UserPlus,
        iconColor: 'text-teal-600',
        href: '/pendaftaran',
        keywords: ['pendaftaran', 'loket', 'kasir', 'pos', 'antrean', 'bayar'],
      },
      {
        id: 'nav-rekam-medis',
        title: 'Pemeriksaan Dokter (E-Rekam Medis)',
        subtitle: 'Pemeriksaan klinis dokter, diagnosa ICD-10, & resep',
        icon: Stethoscope,
        iconColor: 'text-emerald-600',
        href: '/rekam-medis',
        keywords: ['rekam medis', 'dokter', 'periksa', 'poli', 'anamnesa', 'icd10', 'obat', 'resep'],
      },
      {
        id: 'nav-program-khusus',
        title: 'Program Khusus Medis (TBC, Sunat, Observasi)',
        subtitle: 'Registrasi program spesifik & pemantauan pasien',
        icon: Heartbeat,
        iconColor: 'text-rose-600',
        href: '/program-khusus',
        keywords: ['program khusus', 'tbc', 'sunat', 'observasi', 'pos rawat', 'khusus'],
      },
      {
        id: 'nav-buku-kas',
        title: 'Buku Kas Operasional & Likuiditas',
        subtitle: 'Pencatatan arus kas, kapitasi BPJS, & saldo operasional',
        icon: Wallet,
        iconColor: 'text-amber-600',
        href: '/buku-kas',
        keywords: ['buku kas', 'keuangan', 'arus kas', 'mutasi', 'kapitasi'],
      },
      {
        id: 'nav-laporan',
        title: 'Pusat Laporan & Ekspor Excel',
        subtitle: 'Rekapitulasi rawat jalan & ekspor file spreadsheet',
        icon: FileXls,
        iconColor: 'text-emerald-600',
        href: '/laporan',
        keywords: ['laporan', 'ekspor', 'excel', 'rekap', 'morbiditas', 'surveilans'],
      },
    ],
    []
  );

  const { canAccessRoute } = useAuth();
  const trimmedQuery = query.trim().toLowerCase();

  // Strict keyword matching for actions and navigation filtered by role permissions
  const filteredActions = useMemo(() => {
    const allowed = quickActions.filter((a) => canAccessRoute(a.href.split('?')[0]));
    if (!trimmedQuery) return allowed;
    return allowed.filter(
      (a) =>
        a.title.toLowerCase().includes(trimmedQuery) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(trimmedQuery)) ||
        a.keywords.some((k) => k.includes(trimmedQuery))
    );
  }, [trimmedQuery, quickActions, canAccessRoute]);

  const filteredNavigation = useMemo(() => {
    const allowed = navigationModules.filter((n) => canAccessRoute(n.href.split('?')[0]));
    if (!trimmedQuery) return allowed;
    return allowed.filter(
      (n) =>
        n.title.toLowerCase().includes(trimmedQuery) ||
        (n.subtitle && n.subtitle.toLowerCase().includes(trimmedQuery)) ||
        n.keywords.some((k) => k.includes(trimmedQuery))
    );
  }, [trimmedQuery, navigationModules, canAccessRoute]);

  const handleSelectPatient = (patient: Patient) => {
    setOpen(false);
    setSelectedPatient(patient);
    setIsQuickProfileOpen(true);
  };

  const handleSelectNav = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const isSearching = trimmedQuery.length > 0;
  const hasNoResults =
    isSearching &&
    !loading &&
    patients.length === 0 &&
    filteredActions.length === 0 &&
    filteredNavigation.length === 0;

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false} // Disable internal cmdk fuzzy match to eliminate confusing results
      >
        <CommandInput
          placeholder="Cari pasien (Nama, No RM, NIK, Desa) atau menu... (Ctrl+K)"
          value={query}
          onValueChange={setQuery}
        />

        <CommandList className="max-h-[380px]">
          {/* Loading Indicator */}
          {loading && (
            <div className="py-4 px-3 flex items-center justify-center gap-2 text-xs text-teal-600 font-semibold bg-teal-50/50">
              <CircleNotch className="w-4 h-4 animate-spin" />
              <span>Mencari data rekam medis pasien...</span>
            </div>
          )}

          {/* 1. HASIL PENCARIAN PASIEN SUPABASE */}
          {patients.length > 0 && (
            <CommandGroup heading={`Hasil Rekam Medis Pasien (${patients.length} Ditemukan)`}>
              {patients.map((p) => {
                const isBpjs = Boolean(p.no_bpjs && p.no_bpjs.trim().length > 0);
                return (
                  <CommandItem
                    key={p.id}
                    onSelect={() => handleSelectPatient(p)}
                    className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-teal-50/70 border border-transparent hover:border-teal-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 font-extrabold text-xs flex items-center justify-center shrink-0 border border-teal-200/80">
                        {p.nama.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {p.gelar ? `${p.gelar} ` : ''}
                            {p.nama}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/80 shrink-0">
                            {p.no_rm}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                              isBpjs
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-teal-50 text-teal-800 border-teal-200'
                            }`}
                          >
                            {isBpjs ? 'BPJS' : 'UMUM'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2 mt-0.5 truncate">
                          <span>Desa {p.desa}</span>
                          <span>•</span>
                          <span>Usia {p.usia || '-'} thn</span>
                          {p.no_ktp && (
                            <>
                              <span>•</span>
                              <span className="font-mono">NIK: {p.no_ktp}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] font-bold text-teal-600 flex items-center gap-1 shrink-0 ml-2">
                      <span className="hidden sm:inline">Lihat Profil</span>
                      <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Separator if both patients and actions/nav exist */}
          {patients.length > 0 && (filteredActions.length > 0 || filteredNavigation.length > 0) && (
            <CommandSeparator />
          )}

          {/* 2. AKSI TINDAKAN CEPAT */}
          {filteredActions.length > 0 && (
            <CommandGroup heading={isSearching ? 'Aksi Terkait' : 'Aksi Tindakan Cepat'}>
              {filteredActions.map((act) => {
                const Icon = act.icon;
                return (
                  <CommandItem
                    key={act.id}
                    onSelect={() => handleSelectNav(act.href)}
                    className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
                        <Icon className={`w-4 h-4 ${act.iconColor}`} weight="duotone" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs truncate">
                          {act.title}
                        </div>
                        {act.subtitle && (
                          <div className="text-[10px] text-slate-500 font-medium truncate">
                            {act.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Separator between actions and navigation */}
          {filteredActions.length > 0 && filteredNavigation.length > 0 && (
            <CommandSeparator />
          )}

          {/* 3. NAVIGASI MODUL KLINIK */}
          {filteredNavigation.length > 0 && (
            <CommandGroup heading={isSearching ? 'Modul Terkait' : 'Navigasi Modul Klinik'}>
              {filteredNavigation.map((nav) => {
                const Icon = nav.icon;
                return (
                  <CommandItem
                    key={nav.id}
                    onSelect={() => handleSelectNav(nav.href)}
                    className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
                        <Icon className={`w-4 h-4 ${nav.iconColor}`} weight="duotone" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs truncate">
                          {nav.title}
                        </div>
                        {nav.subtitle && (
                          <div className="text-[10px] text-slate-500 font-medium truncate">
                            {nav.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* 4. EMPTY STATE WITH ACTIONABLE CTA */}
          {hasNoResults && (
            <div className="py-8 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3 border border-teal-100 shadow-2xs">
                <User className="w-6 h-6" weight="duotone" />
              </div>
              <p className="text-xs font-bold text-slate-900">
                Tidak ditemukan pasien dengan kata kunci &quot;{query}&quot;
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                Periksa kembali ejaan nama, No. RM, NIK, atau daftarkan sebagai pasien baru di loket.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/pendaftaran?action=new&name=${encodeURIComponent(query)}`);
                }}
                className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn"
              >
                <span>+ Daftarkan &quot;{query}&quot; Sebagai Pasien Baru</span>
              </button>
            </div>
          )}
        </CommandList>

        {/* Footer Shortcut Helper */}
        <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Tekan</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-slate-600 shadow-2xs">
              ESC
            </kbd>
            <span>untuk menutup</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-teal-700">
            <Sparkle className="w-3 h-3 text-teal-600" weight="fill" />
            <span>Pencarian Cerdas SIM Cikidang Medika</span>
          </div>
        </div>
      </CommandDialog>

      {/* Patient Quick Profile Sheet Modal */}
      <PatientQuickProfileModal
        patient={selectedPatient}
        isOpen={isQuickProfileOpen}
        onClose={() => {
          setIsQuickProfileOpen(false);
          setSelectedPatient(null);
        }}
      />
    </>
  );
}
