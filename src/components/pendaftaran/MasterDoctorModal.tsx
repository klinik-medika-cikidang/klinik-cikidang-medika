'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Stethoscope,
  Plus,
  PencilSimple,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  Check,
  X,
  UserGear,
} from '@phosphor-icons/react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import type { Doctor } from '@/types/database';
import { getErrorMessage } from '@/lib/utils';

interface MasterDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDoctorsUpdated?: () => void;
}

export function MasterDoctorModal({
  isOpen,
  onClose,
  onDoctorsUpdated,
}: MasterDoctorModalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [spesialisasi, setSpesialisasi] = useState('Dokter Umum');
  const [isAktif, setIsAktif] = useState(true);

  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('nama', { ascending: true });

      if (error) throw error;
      setDoctors((data as Doctor[]) || []);
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal memuat daftar dokter.');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDoctors();
      resetForm();
    }
  }, [isOpen, fetchDoctors]);

  const resetForm = () => {
    setEditingDoctorId(null);
    setNama('');
    setSpesialisasi('Dokter Umum');
    setIsAktif(true);
  };

  const handleStartEdit = (doc: Doctor) => {
    setEditingDoctorId(doc.id);
    setNama(doc.nama);
    setSpesialisasi(doc.spesialisasi || 'Dokter Umum');
    setIsAktif(doc.aktif);
  };

  const handleToggleAktif = async (doc: Doctor) => {
    try {
      const supabase = createClient();
      const nextAktif = !doc.aktif;
      const { error } = await supabase
        .from('doctors')
        .update({ aktif: nextAktif })
        .eq('id', doc.id);

      if (error) throw error;

      toast.success(
        nextAktif
          ? `${doc.nama} diaktifkan kembali.`
          : `${doc.nama} dinonaktifkan dari jadwal antrean.`
      );
      await fetchDoctors();
      onDoctorsUpdated?.();
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal mengubah status dokter.');
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error('Nama dokter wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      if (editingDoctorId) {
        // Update existing doctor
        const { error } = await supabase
          .from('doctors')
          .update({
            nama: nama.trim(),
            spesialisasi: spesialisasi.trim() || 'Dokter Umum',
            aktif: isAktif,
          })
          .eq('id', editingDoctorId);

        if (error) throw error;
        toast.success(`Data dokter "${nama.trim()}" berhasil diperbarui.`);
      } else {
        // Insert new doctor
        const { error } = await supabase
          .from('doctors')
          .insert({
            nama: nama.trim(),
            spesialisasi: spesialisasi.trim() || 'Dokter Umum',
            aktif: isAktif,
          });

        if (error) throw error;
        toast.success(`Dokter baru "${nama.trim()}" berhasil ditambahkan.`);
      }

      resetForm();
      await fetchDoctors();
      onDoctorsUpdated?.();
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal menyimpan data dokter.');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Master Dokter & Tenaga Medis"
      description="Atur nama dokter pemeriksa, spesialisasi, dan status aktif poli klinik."
      icon={<UserGear className="w-5 h-5 text-teal-600" weight="duotone" />}
      maxWidth="lg"
    >
      <div className="p-4 sm:p-5 space-y-5">
        {/* Form Tambah / Edit Dokter */}
        <form
          onSubmit={handleSubmit}
          className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              {editingDoctorId ? (
                <>
                  <PencilSimple className="w-4 h-4 text-amber-600" weight="bold" />
                  Edit Data Dokter
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-teal-600" weight="bold" />
                  Tambah Dokter Baru
                </>
              )}
            </h4>
            {editingDoctorId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
              >
                Batal Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap & Gelar <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Contoh: dr. Ade Sofyan"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Spesialisasi / Profesi
              </label>
              <Input
                type="text"
                placeholder="Dokter Umum / Bidan / dsb."
                value={spesialisasi}
                onChange={(e) => setSpesialisasi(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
              <input
                type="checkbox"
                checked={isAktif}
                onChange={(e) => setIsAktif(e.target.checked)}
                disabled={isSubmitting}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span>Aktif Praktik (Tampil di Antrean Loket)</span>
            </label>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="gap-1.5"
            >
              {editingDoctorId ? (
                <>
                  <Check className="w-4 h-4" weight="bold" />
                  Perbarui
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" weight="bold" />
                  Simpan Dokter
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Daftar Dokter Saat Ini */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Daftar Dokter Terdaftar ({doctors.length})
            </h4>
            <button
              type="button"
              onClick={fetchDoctors}
              disabled={isLoading}
              className="text-xs text-teal-700 hover:text-teal-800 flex items-center gap-1 font-medium disabled:opacity-50"
            >
              <ArrowClockwise className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <WarningCircle className="w-4 h-4 shrink-0 text-rose-600" weight="bold" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {doctors.map((doc) => {
              const isEditing = editingDoctorId === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isEditing
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        doc.aktif
                          ? 'bg-teal-50 text-teal-700 border border-teal-200/80'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      <Stethoscope className="w-5 h-5" weight="duotone" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {doc.nama}
                        </span>
                        <Badge
                          variant={doc.aktif ? 'success' : 'default'}
                          size="sm"
                        >
                          {doc.aktif ? 'Aktif Praktik' : 'Nonaktif'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {doc.spesialisasi || 'Dokter Umum'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(doc)}
                      className="h-8 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                    >
                      <PencilSimple className="w-3.5 h-3.5 mr-1" weight="bold" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleAktif(doc)}
                      className={`h-8 px-2.5 text-xs ${
                        doc.aktif
                          ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                          : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      {doc.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-slate-600"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
}
