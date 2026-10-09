'use client';

import React from 'react';
import {
  CalendarCheck,
} from '@phosphor-icons/react';
import { Lungs, BandageAdhesive } from 'healthicons-react';
import { formatRupiah } from '@/lib/utils';

export interface ProgramKhususKpiData {
  // TBC stats
  totalTbc: number;
  mangkirTbc: number;
  intensifTbc: number;
  lanjutanTbc: number;

  // Circumcision stats
  totalCircumcisions: number;
  totalCircumcisionRevenue: number;
  pendingFollowUpPhotos: number;

  // Post care stats
  postCareTodayCount: number;
  postCareOverdueCount: number;
  postCareCompletedCount: number;
}

interface ProgramKhususKpisProps {
  data: ProgramKhususKpiData;
  isLoading?: boolean;
}

export function ProgramKhususKpis({ data, isLoading }: ProgramKhususKpisProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double animate-pulse space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-slate-200 rounded"></div>
              <div className="w-8 h-8 bg-slate-200 rounded-xl"></div>
            </div>
            <div className="h-7 w-28 bg-slate-200 rounded"></div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full"></div>
            <div className="h-3 w-32 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // 1. Kohort TBC calculations
  const totalTbc = data.totalTbc || 0;
  const mangkirTbc = data.mangkirTbc || 0;
  const compliantTbc = Math.max(0, totalTbc - mangkirTbc);
  const tbcCompliancePct = totalTbc > 0 ? Math.round((compliantTbc / totalTbc) * 100) : 100;
  const tbcBarDetail =
    totalTbc > 0
      ? `${tbcCompliancePct}% Taat (${compliantTbc}/${totalTbc})`
      : 'Belum ada pasien';
  const tbcBarColor =
    mangkirTbc > 0
      ? tbcCompliancePct < 80
        ? 'bg-rose-500'
        : 'bg-amber-500'
      : 'bg-teal-600';

  // 2. Sirkumsisi & Foto Medis calculations
  const totalCirc = data.totalCircumcisions || 0;
  const pendingPhotos = data.pendingFollowUpPhotos || 0;
  const completedPhotos = Math.max(0, totalCirc - pendingPhotos);
  const photoPct = totalCirc > 0 ? Math.round((completedPhotos / totalCirc) * 100) : 100;
  const circBarDetail =
    totalCirc > 0
      ? `${photoPct}% Lengkap (${completedPhotos}/${totalCirc})`
      : 'Belum ada tindakan';
  const circBarColor = photoPct === 100 ? 'bg-teal-600' : 'bg-amber-500';

  // 3. Agenda Observasi calculations
  const postCompleted = data.postCareCompletedCount || 0;
  const postOverdue = data.postCareOverdueCount || 0;
  const postToday = data.postCareTodayCount || 0;
  const totalPostCare = postCompleted + postOverdue + postToday;
  const postCompletionPct = totalPostCare > 0 ? Math.round((postCompleted / totalPostCare) * 100) : 100;
  const postBarDetail =
    totalPostCare > 0
      ? `${postCompletionPct}% Selesai (${postCompleted}/${totalPostCare})`
      : 'Belum ada agenda';
  const postBarColor = postOverdue > 0 ? 'bg-rose-500' : 'bg-teal-600';

  const cards = [
    {
      id: 'kpi-tbc',
      title: 'Kohort TBC (DOTS)',
      value: `${totalTbc} Pasien`,
      unit: '',
      subtitle: `${data.intensifTbc || 0} Intensif • ${data.lanjutanTbc || 0} Lanjutan`,
      barLabel: 'Kepatuhan Kontrol OAT',
      barDetail: tbcBarDetail,
      barPct: tbcCompliancePct,
      barColor: tbcBarColor,
      badge:
        mangkirTbc > 0
          ? `${mangkirTbc} Mangkir`
          : '100% Taat',
      badgeColor:
        mangkirTbc > 0
          ? 'text-rose-700 bg-rose-50 border-rose-200'
          : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: Lungs,
      iconBg: 'bg-teal-50 text-teal-700 border border-teal-200/80',
    },
    {
      id: 'kpi-sirkumsisi',
      title: 'Sirkumsisi & Foto Medis',
      value: `${totalCirc} Tindakan`,
      unit: '',
      subtitle: `Omzet ${formatRupiah(data.totalCircumcisionRevenue)}`,
      barLabel: 'Dokumentasi Foto Medis',
      barDetail: circBarDetail,
      barPct: photoPct,
      barColor: circBarColor,
      badge:
        pendingPhotos > 0
          ? `${pendingPhotos} Tunggu Foto`
          : 'Foto Lengkap',
      badgeColor:
        pendingPhotos > 0
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: BandageAdhesive,
      iconBg: 'bg-teal-50 text-teal-700 border border-teal-200/80',
    },
    {
      id: 'kpi-posrawat',
      title: 'Agenda Pasien Observasi',
      value: `${postToday} Hari Ini`,
      unit: '',
      subtitle: `${postCompleted} Selesai • ${postOverdue} Lewat`,
      barLabel: 'Tingkat Kunjungan Kontrol',
      barDetail: postBarDetail,
      barPct: postCompletionPct,
      barColor: postBarColor,
      badge:
        postOverdue > 0
          ? `${postOverdue} Overdue`
          : 'Terkontrol',
      badgeColor:
        postOverdue > 0
          ? 'text-rose-700 bg-rose-50 border-rose-200'
          : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: CalendarCheck,
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => {
        const IconComponent = card.icon;

        return (
          <div
            key={card.id}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double tactile-card flex flex-col justify-between hover:border-teal-400 transition-colors"
          >
            <div>
              {/* Header: Title & Icon Pill */}
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate mr-1">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-xl shrink-0 ${card.iconBg}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>

              {/* Value with Tabular Monospace & Responsive Fluid Scaling */}
              <div className="flex items-baseline gap-1 font-mono tracking-tight min-w-0">
                <span
                  className="text-lg sm:text-xl lg:text-lg xl:text-[1.18rem] 2xl:text-2xl font-extrabold text-slate-900 truncate tabular-nums"
                  title={card.value}
                >
                  {card.value}
                </span>
              </div>

              {/* Real Clinical Proportional Progress Track (replaces distorted sparkline) */}
              <div className="my-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 font-semibold">
                  <span className="truncate">{card.barLabel}</span>
                  <span className="shrink-0 text-slate-700">{card.barDetail}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    style={{ width: `${card.barPct}%` }}
                    className={`h-full ${card.barColor} transition-all duration-500 rounded-full`}
                  />
                </div>
              </div>
            </div>

            {/* Footer: Subtitle & Real Clinical Status Badge */}
            <div className="flex items-center justify-between gap-1 text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-600 text-[11px] font-medium leading-tight truncate">
                {card.subtitle}
              </span>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border shrink-0 ${card.badgeColor}`}
              >
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
