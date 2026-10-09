'use client';

import React, { useEffect, useState } from 'react';
import { Printer, X, FileText, Calendar, User, Stethoscope } from '@phosphor-icons/react';
import { CLINIC_PROFILE } from '@/constants/clinic';
import { Patient, Visit, Doctor } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

interface SuratSakitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit;
  patient: Patient;
  doctors: Doctor[];
}

export function SuratSakitModal({
  isOpen,
  onClose,
  visit,
  patient,
  doctors,
}: SuratSakitModalProps) {
  const [jumlahHari, setJumlahHari] = useState<number>(3);
  const [tanggalMulai, setTanggalMulai] = useState<string>(
    visit.tanggal_periksa || new Date().toISOString().split('T')[0]
  );
  const [pekerjaan, setPekerjaan] = useState<string>(patient.pekerjaan || 'Karyawan / Wiraswasta');
  const [anjuran, setAnjuran] = useState<string>('Istirahat cukup dan minum obat secara teratur.');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    visit.dokter_id || (doctors[0]?.id ?? '')
  );
  const [alamatTambahan, setAlamatTambahan] = useState<string>('');

  // AC-004.1: the extra address never carries over from a previous patient or visit.
  useEffect(() => {
    if (isOpen) setAlamatTambahan('');
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0] || {
    nama: 'dr. Ovan',
    spesialisasi: 'Dokter Umum',
  };

  // Hitung tanggal selesai
  const startDate = new Date(tanggalMulai);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (jumlahHari > 0 ? jumlahHari - 1 : 0));
  const tanggalSelesai = endDate.toISOString().split('T')[0];

  const formatTanggalIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getRomawiBulan = (monthIdx: number) => {
    const romawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romawi[monthIdx] || 'IX';
  };

  const currentMonthRomawi = getRomawiBulan(new Date(tanggalMulai).getMonth());
  const currentYear = new Date(tanggalMulai).getFullYear();
  const nomorSurat = `SKS/CKM/${currentMonthRomawi}/${currentYear}/${patient.no_rm.slice(-4)}`;

  // Trimmed once so the printed letter never shows leading or trailing spaces.
  const alamatTambahanTrimmed = alamatTambahan.trim();

  const handlePrint = () => {
    window.print();
  };

  const terbilangHari = (n: number): string => {
    const kata = [
      '',
      'satu',
      'dua',
      'tiga',
      'empat',
      'lima',
      'enam',
      'tujuh',
      'delapan',
      'sembilan',
      'sepuluh',
      'sebelas',
      'dua belas',
      'tiga belas',
      'empat belas',
    ];
    return kata[n] || String(n);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm print:fixed print:inset-0 print:m-0 print:bg-white print:p-0">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl print:max-h-none print:w-full print:rounded-none print:shadow-none">
        {/* Header Kontrol (Hanya Tampil di Layar, Sembunyi Saat Cetak) */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <FileText weight="duotone" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Surat Keterangan Istirahat Sakit (SKS)
              </h2>
              <p className="text-xs text-slate-500">
                No. RM: {patient.no_rm} • {patient.nama}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2 border-teal-600 text-teal-700 hover:bg-teal-50"
            >
              <Printer weight="duotone" className="h-4 w-4" />
              <span>Cetak Surat (A5)</span>
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form Pengaturan Singkat (Sembunyi Saat Cetak) */}
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-3 sm:grid-cols-4 print:hidden">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Lama Istirahat (Hari)
            </label>
            <input
              type="number"
              min={1}
              max={14}
              value={jumlahHari}
              onChange={(e) => setJumlahHari(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Mulai Tanggal
            </label>
            <input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Pekerjaan Pasien
            </label>
            <input
              type="text"
              value={pekerjaan}
              onChange={(e) => setPekerjaan(e.target.value)}
              placeholder="Contoh: Karyawan Pabrik"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Dokter Pemeriksa
            </label>
            <Select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              size="sm"
              searchable={false}
              headerTitle="Dokter Pemeriksa"
              options={doctors.map((d) => ({ value: d.id, label: d.nama }))}
            />
          </div>
          <div className="sm:col-span-4">
            <Input
              id="sks-alamat-tambahan"
              label="Alamat Tambahan"
              type="text"
              maxLength={120}
              value={alamatTambahan}
              onChange={(e) => setAlamatTambahan(e.target.value)}
              placeholder="Contoh: alamat kos atau tempat kerja (opsional)"
              helperText="Hanya dipakai pada surat ini, maksimum 120 karakter."
            />
          </div>
        </div>

        {/* Lembar Surat Keterangan Sakit (Format Cetak A5 / Print Preview) */}
        <div className="overflow-y-auto p-8 print:overflow-visible print:p-0">
          <div className="mx-auto max-w-[148mm] rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:max-w-none print:border-none print:p-0 print:shadow-none">
            {/* KOP SURAT RESMI */}
            <div className="border-b-2 border-double border-slate-800 pb-3 text-center">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 uppercase">
                {CLINIC_PROFILE.name}
              </h1>
              <p className="text-[11px] leading-snug text-slate-600">
                {CLINIC_PROFILE.address}
              </p>
              <p className="text-[10px] text-slate-500">
                Telp: {CLINIC_PROFILE.phone} • Email: {CLINIC_PROFILE.email} • Izin:{' '}
                {CLINIC_PROFILE.license}
              </p>
            </div>

            {/* JUDUL SURAT */}
            <div className="mt-4 text-center">
              <h2 className="text-xs font-bold tracking-wider text-slate-900 underline uppercase">
                SURAT KETERANGAN ISTIRAHAT SAKIT
              </h2>
              <p className="text-[11px] font-medium text-slate-600">Nomor: {nomorSurat}</p>
            </div>

            {/* ISI SURAT */}
            <div className="mt-4 text-[12px] leading-relaxed text-slate-800">
              <p>
                Yang bertanda tangan di bawah ini, Dokter Pemeriksa pada{' '}
                <strong>{CLINIC_PROFILE.name}</strong>, menerangkan dengan sebenarnya bahwa:
              </p>

              <div className="my-3 space-y-1 rounded-lg border border-slate-100 bg-slate-50/50 p-3 print:border-none print:bg-transparent print:p-0">
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-4 text-slate-600">Nama Pasien</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-bold text-slate-900">
                    {patient.gelar} {patient.nama}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-4 text-slate-600">Nomor Rekam Medis</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-mono font-medium">{patient.no_rm}</span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-4 text-slate-600">Umur / Tgl Lahir</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7">
                    {patient.usia ? `${patient.usia} Tahun` : '-'} (Lahir: {patient.tanggal_lahir || '-'})
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-4 text-slate-600">Jenis Kelamin</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7">{patient.jenis_kelamin}</span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-4 text-slate-600">Pekerjaan</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7">{pekerjaan}</span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-4 text-slate-600">Alamat</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7">
                    {patient.alamat ? `${patient.alamat}, ` : ''}Desa {patient.desa}
                    {alamatTambahanTrimmed && (
                      <>
                        <br />
                        {alamatTambahanTrimmed}
                      </>
                    )}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-justify">
                Berdasarkan hasil pemeriksaan medis yang dilakukan pada hari ini, pasien tersebut
                dalam kondisi sakit dan memerlukan istirahat selama{' '}
                <strong>
                  {jumlahHari} ({terbilangHari(jumlahHari)}) hari
                </strong>
                , terhitung mulai tanggal{' '}
                <strong>{formatTanggalIndo(tanggalMulai)}</strong> sampai dengan tanggal{' '}
                <strong>{formatTanggalIndo(tanggalSelesai)}</strong>.
              </p>

              {visit.diagnosa_deskripsi && (
                <p className="mt-2 text-justify">
                  <span className="text-slate-600">Diagnosa Medis: </span>
                  <span className="font-medium italic text-slate-800">
                    {visit.kode_icd10 ? `[${visit.kode_icd10}] ` : ''}
                    {visit.diagnosa_deskripsi}
                  </span>
                </p>
              )}

              {anjuran && (
                <p className="mt-1 text-justify text-slate-700">
                  <span className="text-slate-600">Anjuran: </span>
                  {anjuran}
                </p>
              )}

              <p className="mt-3">
                Demikian surat keterangan ini dibuat dengan sebenarnya untuk diketahui dan
                dipergunakan sebagaimana mestinya.
              </p>
            </div>

            {/* TANDA TANGAN & STEMPEL */}
            <div className="mt-6 flex justify-between text-[11px] text-slate-800">
              <div className="text-center">
                <p className="text-slate-500">Pasien / Keluarga</p>
                <div className="h-14"></div>
                <p className="font-semibold text-slate-800">
                  ( {patient.gelar} {patient.nama} )
                </p>
              </div>

              <div className="text-center">
                <p className="text-slate-600">
                  Cikidang, {formatTanggalIndo(tanggalMulai)}
                </p>
                <p className="font-semibold text-slate-900">Dokter Pemeriksa,</p>
                <div className="relative flex h-14 items-center justify-center">
                  <span className="text-[10px] text-slate-400 italic print:hidden">
                    [Tanda Tangan & Cap Klinik]
                  </span>
                </div>
                <p className="font-bold text-slate-900 underline">{selectedDoctor.nama}</p>
                <p className="text-[10px] text-slate-500">SIP: 446.1/021/SIP.DOKTER/2023</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
