'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HandHeart,
  DownloadSimple,
  Plus,
  ArrowClockwise,
  WarningCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Select } from '@/components/ui/Select';
import { formatRupiah, getErrorMessage } from '@/lib/utils';
import {
  exportReferralCommissionsToExcel,
  type ReferralCommissionExportRow,
} from '@/lib/excel';
import type { ReferralCommission } from '@/types/database';
import { NewReferralCommissionModal } from '@/components/laporan/NewReferralCommissionModal';

interface ReferralCommissionPanelProps {
  isLoading?: boolean;
}

const SERVICE_LABELS: Record<string, string> = {
  infus: 'Infus',
  usg: 'USG',
  lab: 'Cek Lab',
};

export function ReferralCommissionPanel({ isLoading: externalLoading }: ReferralCommissionPanelProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [records, setRecords] = useState<ReferralCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCommissions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('referral_commissions')
        .select('*, pasien:patients(nama, no_rm, desa)')
        .eq('tahun_komisi', selectedYear)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords((data as unknown as ReferralCommission[]) || []);
    } catch (err) {
      console.error('Error fetching referral commissions:', err);
      setErrorMessage(
        getErrorMessage(err, 'Gagal memuat data komisi rujukan.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  // Yearly aggregation per referral source (bidan)
  const aggregation = useMemo(() => {
    const map = new Map<
      string,
      { sumber: string; total: number; count: number; infus: number; usg: number; lab: number }
    >();

    records.forEach((rec) => {
      const key = rec.sumber_rujukan || 'Tanpa Nama';
      if (!map.has(key)) {
        map.set(key, { sumber: key, total: 0, count: 0, infus: 0, usg: 0, lab: 0 });
      }
      const entry = map.get(key)!;
      entry.count += 1;
      entry.total += Number(rec.nominal_komisi) || 0;
      if (rec.jenis_layanan === 'infus') entry.infus += 1;
      if (rec.jenis_layanan === 'usg') entry.usg += 1;
      if (rec.jenis_layanan === 'lab') entry.lab += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [records]);

  const totals = useMemo(() => {
    const totalKomisi = records.reduce((sum, r) => sum + (Number(r.nominal_komisi) || 0), 0);
    const totalDibayar = records
      .filter((r) => r.status_pembayaran === 'Dibayar')
      .reduce((sum, r) => sum + (Number(r.nominal_komisi) || 0), 0);
    return {
      totalKomisi,
      totalDibayar,
      outstanding: totalKomisi - totalDibayar,
      totalRujukan: records.length,
      jumlahBidan: aggregation.length,
    };
  }, [records, aggregation]);

  const handleExport = () => {
    if (records.length === 0) {
      toast.error('Belum ada data komisi rujukan untuk diunduh.');
      return;
    }

    try {
      const exportRows: ReferralCommissionExportRow[] = records.map((r) => ({
        tanggal: r.created_at ? r.created_at.split('T')[0] : '-',
        sumber_rujukan: r.sumber_rujukan || '-',
        nama_pasien: r.pasien?.nama || '-',
        jenis_layanan: SERVICE_LABELS[r.jenis_layanan] || r.jenis_layanan,
        nominal_komisi: Number(r.nominal_komisi) || 0,
        status_pembayaran: r.status_pembayaran,
        catatan: r.catatan || '-',
      }));

      exportReferralCommissionsToExcel(exportRows, selectedYear);
      toast.success(`Laporan komisi ${selectedYear} (${records.length} rujukan) berhasil diunduh.`);
    } catch (err) {
      console.error('Error exporting referral commissions:', err);
      toast.error('Gagal mengunduh laporan komisi rujukan.');
    }
  };

  const showSkeleton = isLoading || externalLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
            Tahun Komisi
          </span>
          <div className="w-28">
            <Select
              size="sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              searchable={false}
              headerTitle="Tahun Komisi"
              options={[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(
                (yr) => ({ value: yr, label: String(yr) })
              )}
            />
          </div>

          <button
            type="button"
            onClick={fetchCommissions}
            disabled={showSkeleton}
            title="Muat Ulang Data Komisi"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/90 shadow-btn-secondary tactile-btn transition disabled:opacity-50 flex items-center justify-center min-h-[38px] min-w-[38px]"
          >
            <ArrowClockwise
              className={`w-4 h-4 ${showSkeleton ? 'animate-spin text-teal-600' : ''}`}
              weight="bold"
            />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700/80 tactile-btn transition focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            <Plus weight="bold" className="w-3.5 h-3.5" />
            <span>Catat Rujukan Baru</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={showSkeleton || records.length === 0}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold shadow-btn-primary border border-emerald-700/80 tactile-btn transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
          >
            <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
            <span>Unduh Komisi Tahunan (.xlsx)</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchCommissions}
            className="font-semibold underline hover:no-underline shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double tactile-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Komisi {selectedYear}
            </span>
            <div className="p-1.5 rounded-xl shrink-0 bg-amber-50 text-amber-600">
              <HandHeart className="w-4 h-4" weight="duotone" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {formatRupiah(totals.totalKomisi)}
          </span>
          <p className="text-[11px] text-slate-500 mt-2">
            {totals.totalRujukan} rujukan dari {totals.jumlahBidan} sumber
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double tactile-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Sudah Dibayarkan
            </span>
            <div className="p-1.5 rounded-xl shrink-0 bg-emerald-50 text-emerald-600">
              <DownloadSimple className="w-4 h-4" weight="duotone" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono tabular-nums">
            {formatRupiah(totals.totalDibayar)}
          </span>
          <p className="text-[11px] text-slate-500 mt-2">Komisi dengan status Dibayar</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card-double tactile-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Belum Dibayarkan
            </span>
            <div className="p-1.5 rounded-xl shrink-0 bg-rose-50 text-rose-600">
              <WarningCircle className="w-4 h-4" weight="duotone" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-extrabold text-rose-700 font-mono tabular-nums">
            {formatRupiah(totals.outstanding)}
          </span>
          <p className="text-[11px] text-slate-500 mt-2">Akumulasi komisi belum dibayar</p>
        </div>
      </div>

      {showSkeleton ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double p-6 space-y-3 animate-pulse">
          <div className="h-6 w-56 bg-slate-200 rounded" />
          <div className="h-10 bg-slate-100 rounded-xl" />
          <div className="h-10 bg-slate-100 rounded-xl" />
        </div>
      ) : aggregation.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-600 shadow-card-double">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl w-fit mx-auto mb-3 border border-amber-200">
            <HandHeart className="w-8 h-8" weight="duotone" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Belum ada rujukan pada tahun {selectedYear}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Catat rujukan pasien kriteria infus, USG, atau cek lab untuk mulai mengakumulasi komisi
            tahunan bidan.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Akumulasi Komisi per Sumber Rujukan ({selectedYear})
            </span>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/90 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/90 whitespace-nowrap">
                <tr>
                  <th className="py-3 px-3.5">Sumber Rujukan</th>
                  <th className="py-3 px-3.5 text-right">Jumlah Rujukan</th>
                  <th className="py-3 px-3.5 text-right">Infus</th>
                  <th className="py-3 px-3.5 text-right">USG</th>
                  <th className="py-3 px-3.5 text-right">Cek Lab</th>
                  <th className="py-3 px-3.5 text-right">Total Komisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                {aggregation.map((row) => (
                  <tr key={row.sumber} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-slate-900">{row.sumber}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-700">
                      {row.count}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-600">{row.infus}</td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-600">{row.usg}</td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-600">{row.lab}</td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-amber-700">
                      {formatRupiah(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card-double overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Riwayat Rujukan
          </span>
          <span className="text-[11px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
            {records.length} data
          </span>
        </div>
        <div className="overflow-x-auto w-full">
          {records.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Belum ada riwayat rujukan pada tahun {selectedYear}
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/90 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/90 whitespace-nowrap">
                <tr>
                  <th className="py-3 px-3.5">Tanggal</th>
                  <th className="py-3 px-3.5">Sumber Rujukan</th>
                  <th className="py-3 px-3.5">Pasien</th>
                  <th className="py-3 px-3.5">Layanan</th>
                  <th className="py-3 px-3.5 text-right">Komisi</th>
                  <th className="py-3 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                      {rec.created_at ? rec.created_at.split('T')[0] : '-'}
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900">
                      {rec.sumber_rujukan}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">
                      {rec.pasien?.nama || '-'}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80">
                        {SERVICE_LABELS[rec.jenis_layanan] || rec.jenis_layanan}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(Number(rec.nominal_komisi) || 0)}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          rec.status_pembayaran === 'Dibayar'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                            : 'bg-amber-50 text-amber-700 border-amber-200/80'
                        }`}
                      >
                        {rec.status_pembayaran}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <NewReferralCommissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCommissions}
      />
    </div>
  );
}

export default ReferralCommissionPanel;
