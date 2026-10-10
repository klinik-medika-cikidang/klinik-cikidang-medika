'use client';

import React, { useRef } from 'react';
import { Printer, CheckCircle, FileText } from '@phosphor-icons/react';
import { useReactToPrint } from 'react-to-print';
import type { Visit } from '@/types/database';
import { CLINIC_PROFILE } from '@/constants/clinic';
import { Modal } from '@/components/ui';
import { formatRupiah } from '@/lib/utils';

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit | null;
}

export function ReceiptModal({ isOpen, onClose, visit }: ReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const patientFullName = visit?.pasien
    ? [visit.pasien.gelar, visit.pasien.nama].filter(Boolean).join(' ')
    : 'Pasien';

  const doctorName = visit?.dokter?.nama || 'Dokter Jaga';
  const receiptNo = visit
    ? `KUI-${visit.tanggal_periksa.replace(/-/g, '')}-${String(visit.nomor_antrian || '1').padStart(3, '0')}`
    : 'KUI-000';
  const totalAmount = Number(visit?.biaya_periksa || 0) + Number(visit?.pendapatan_lain || 0);
  const isFreeVisit = Boolean(
    visit?.is_gratis ||
    (visit?.jenis_pasien === 'UMUM' && totalAmount === 0 && visit?.status_pembayaran === 'Lunas')
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${receiptNo}-${patientFullName.replace(/\s+/g, '_')}`,
  });

  if (!isOpen || !visit) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kuitansi Pembayaran Pasien"
      description="Pratinjau kuitansi pelunasan kasir resmi Klinik Pratama Cikidang Medika"
      maxWidth="lg"
    >
      <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-5 space-y-3">
        {/* Printable Receipt Voucher Content */}
        <div
          ref={printRef}
          className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3 print:p-2 print:border-none print:shadow-none text-slate-900"
        >
          {/* Clinic Official Header */}
          <div className="text-center pb-2.5 border-b-2 border-slate-900 space-y-0.5">
            <h1 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-slate-900">
              {CLINIC_PROFILE.name}
            </h1>
            <p className="text-[11px] text-slate-600 leading-tight">
              {CLINIC_PROFILE.address}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              Telp: {CLINIC_PROFILE.phone} &bull; Izin: {CLINIC_PROFILE.license}
            </p>
          </div>

          {/* Receipt Meta Bar */}
          <div className="flex justify-between items-center text-xs py-1 border-b border-dashed border-slate-300">
            <div>
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">No. Kuitansi</span>
              <span className="font-mono font-bold text-teal-700 text-xs sm:text-sm">{receiptNo}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Waktu Transaksi</span>
              <span className="font-medium text-slate-800 font-mono text-xs">
                {visit.tanggal_periksa} {visit.jam_periksa ? `• ${visit.jam_periksa}` : ''}
              </span>
            </div>
          </div>

          {/* Patient & Doctor Data Card */}
          <div className="grid grid-cols-2 gap-2 text-xs p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80 print:bg-transparent print:p-1 print:border-slate-300">
            <div>
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Nama Pasien</span>
              <span className="font-bold text-slate-900 text-xs">{patientFullName}</span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                {visit.pasien?.desa || '-'} {visit.pasien?.usia ? `(${visit.pasien.usia} thn)` : ''}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">No. Rekam Medis</span>
              <span className="font-mono font-bold text-teal-700 text-xs">
                {visit.pasien?.no_rm || '-'}
              </span>
              <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                {visit.jenis_pasien}
                {visit.pasien?.no_bpjs ? ` (${visit.pasien.no_bpjs})` : ''}
              </span>
            </div>
            <div className="col-span-2 pt-1.5 border-t border-slate-200 print:border-slate-300 flex justify-between items-center text-[11px]">
              <span className="text-slate-500 font-medium">Dokter Pemeriksa:</span>
              <span className="font-bold text-slate-800">{doctorName}</span>
            </div>
            {visit.kode_icd10 && (
              <div className="col-span-2 pt-1 border-t border-slate-200 print:border-slate-300 flex justify-between items-start text-[11px]">
                <span className="text-slate-500 font-medium shrink-0">Diagnosa ICD-10:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[260px]">
                  {visit.kode_icd10} {visit.diagnosa_deskripsi ? `(${visit.diagnosa_deskripsi})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Itemized Billing Breakdown Table */}
          <div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] uppercase text-slate-700">
                  <th className="text-left py-1.5 font-bold tracking-wider">Rincian Layanan / Tindakan</th>
                  <th className="text-right py-1.5 font-bold tracking-wider">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2">
                    <span className="font-bold block text-slate-900 text-xs">
                      Pemeriksaan & Konsultasi Dokter
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {visit.jenis_pasien === 'BPJS'
                        ? 'Layanan Pasien BPJS (Klaim Kapitasi Bulanan)'
                        : 'Pemeriksaan Dokter Umum & Tindakan Standar'}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono font-bold text-slate-900 text-xs">
                    {visit.jenis_pasien === 'BPJS' ? (
                      <span className="text-emerald-700 font-bold">Rp 0 (BPJS)</span>
                    ) : isFreeVisit ? (
                      <span className="text-emerald-700 font-bold">Rp 0 (Diskon 100%)</span>
                    ) : (
                      formatRupiah(Number(visit.biaya_periksa || 0))
                    )}
                  </td>
                </tr>

                {isFreeVisit && (visit.alasan_gratis || visit.keterangan_pendapatan) && (
                  <tr>
                    <td colSpan={2} className="py-1.5 px-2.5 bg-emerald-50/80 rounded-lg text-emerald-950 text-[11px] font-medium border border-emerald-200/60">
                      Alasan Pembebasan Biaya:{' '}
                      <span className="font-bold">{visit.alasan_gratis || visit.keterangan_pendapatan || 'Kontrol Pasca Tindakan'}</span>
                    </td>
                  </tr>
                )}

                {Number(visit.pendapatan_lain || 0) > 0 && (
                  <tr>
                    <td className="py-2">
                      <span className="font-bold block text-slate-900 text-xs">
                        {visit.keterangan_pendapatan || 'Tindakan Tambahan / Resep Obat'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Layanan tambahan dan tindakan medis kasir
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900 text-xs">
                      {formatRupiah(Number(visit.pendapatan_lain))}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-extrabold text-xs">
                  <td className="py-2 uppercase tracking-wider text-slate-900">Total Pelunasan</td>
                  <td className="py-2 text-right font-mono text-sm sm:text-base text-slate-900">
                    {formatRupiah(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Status & Method Badge */}
          <div className="flex justify-between items-center px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs print:bg-transparent print:border-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 print:hidden" weight="bold" />
              <span>
                {isFreeVisit ? 'STATUS: LUNAS (BEBAS BIAYA / DISKON 100%)' : 'STATUS: LUNAS'}
              </span>
            </div>
            <div className="text-slate-700 text-xs font-medium">
              Metode:{' '}
              <span className="font-bold text-slate-900">
                {isFreeVisit ? 'Bebas Biaya' : (visit.jenis_pembayaran || 'Tunai')}
              </span>
            </div>
          </div>

          {/* Signature Columns - Compact Ergonomic Height */}
          <div className="pt-2 grid grid-cols-2 gap-4 text-center text-xs">
            <div className="space-y-6">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pasien / Keluarga</p>
              <div className="pt-3 border-t border-slate-300 mx-4 font-bold text-[11px] text-slate-800">
                ( {patientFullName} )
              </div>
            </div>
            <div className="space-y-6">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Petugas Kasir</p>
              <div className="pt-3 border-t border-slate-300 mx-4 font-bold text-[11px] text-slate-800">
                ( Kasir Loket )
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-2 border-t border-slate-200 text-center text-[10px] text-slate-500 italic">
            Terima kasih atas kunjungan Anda. Semoga lekas sembuh dan sehat selalu.
          </div>
        </div>

        {/* Modal Action Buttons (Hidden on print) */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 tactile-btn min-h-[44px]"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => handlePrint()}
            className="px-5 py-2 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-btn-primary border border-teal-700 tactile-btn flex items-center gap-2 min-h-[44px]"
          >
            <Printer className="w-4 h-4" weight="bold" />
            <span>Cetak Kuitansi (Print)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ReceiptModal;
