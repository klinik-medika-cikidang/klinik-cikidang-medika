---
id: F-011-TSK
feature: F-011
title: "Tasks: Hak Akses dan Alur Kategorisasi Program"
status: implemented
owner: "Developer"
last_updated: "2026-10-09"
last_verified_commit: unverified
related:
  - "requirements.md"
  - "design.md"
---

# Tasks: F-011 Hak Akses dan Alur Kategorisasi Program

Status: dikerjakan bertahap di staging. OQ-001 ditafsirkan sementara lewat BR-002 dan perlu
konfirmasi klinik. Belum dipromosikan ke produksi. Dev dependency `vitest@2.1.9` ditambahkan
untuk unit test matriks izin (perintah `npm test`).

## Fase A - Izin dan rute

- [x] **TASK-011-1**: Perbarui `ROLE_PERMISSIONS` dan `ROLE_DEFAULT_ROUTES` di
  `src/lib/auth/AuthContext.tsx` sesuai matriks BR-001.
  _Requirements: FR-001, FR-002, FR-003, BR-001_

- [x] **TASK-011-2**: Pastikan penjagaan rute menolak rute terlarang dan mengarahkan ke halaman
  default peran, bukan hanya menyembunyikan menu. (Sudah ditegakkan `AppLayout`; rute default
  Dokter/Admin kini `/rekam-medis`.)
  _Requirements: FR-002, ERR-001, NFR-SEC-001_

- [x] **TASK-011-3**: Unit test matriks izin untuk kedua peran dan seluruh rute
  (`src/lib/auth/permissions.test.ts`, via Vitest). `npm test` lulus 6 test.
  _Requirements: BR-003, INV-003_

## Fase B - Batas pemantauan biaya

- [x] **TASK-011-4**: Sembunyikan tab dan kartu pemantauan biaya bagi Dokter/Admin di
  `src/app/laporan/page.tsx` (sudah bergating sejak F-009) dan `src/app/buku-kas/page.tsx`.
  _Requirements: FR-002, BR-002_

- [x] **TASK-011-5**: Sediakan mode transaksi buku kas untuk Dokter/Admin (pencatatan pengeluaran
  medis dan non medis) tanpa ringkasan pemasukan/pengeluaran.
  _Requirements: FR-001, BR-002_

## Fase C - Alur kategorisasi

- [x] **TASK-011-6**: Hapus kewajiban kategori saat pendaftaran di `src/components/pendaftaran/`.
  (Terverifikasi: pendaftaran memang tidak menanyakan program.)
  _Requirements: FR-004, AC-004.1_

- [x] **TASK-011-7**: Buat `supabase/migrations/20261009_f011_visit_category.sql` yang menambah
  `visits.kategori_program VARCHAR(30)` dengan default `UMUM`. Sudah diterapkan ke staging.
  _Requirements: FR-005, INV-001_

- [x] **TASK-011-8**: Tambah `kategori_program` ke `src/types/database.ts`.
  _Requirements: FR-005_

- [x] **TASK-011-9**: Buat panel kategorisasi di akhir alur rekam medis
  (`src/components/program-khusus/KategoriProgramPanel.tsx`), termasuk agenda observasi sebagai
  pilihan terakhir. Terpasang sebagai langkah 6 di `ExaminationForm`.
  _Requirements: FR-004, FR-008, AC-004.2, AC-008.2_

- [x] **TASK-011-10**: Isi kategori default `UMUM` untuk kunjungan tanpa program dan tambahkan
  filter kategori "Kategori Program" (termasuk "Umum") pada filter laporan.
  _Requirements: FR-005, BR-004_

## Fase D - Bahasa domain

- [x] **TASK-011-11**: Ganti label "Pemantauan Pos Rawat" menjadi "Observasi" melalui
  `src/constants/clinic.ts` dan seluruh pemakaiannya.
  _Requirements: FR-007_

- [x] **TASK-011-12**: Terapkan definisi Triple Eliminasi (ANC ditambah lab HIV, HBsAg, Sipilis) dan
  indikator kelengkapan lab yang belum diisi. Isian HIV, HBsAg, Sipilis dan indikator "Belum diisi"
  ditambahkan pada register program.
  _Requirements: FR-006, INV-002_

## Gate verifikasi akhir

- [ ] **TASK-011-13**: `npm run lint`, `npx tsc --noEmit`, `npm run build` lulus (sudah lulus); sisa uji klik dua peran dan periksa responsif 360px/768px/1024px+. Tidak ada em dash dan tidak ada PII di dokumen terlacak.
  _Requirements: NFR-UI-001, NFR-COPY-001, NFR-A11Y-001, INV-003_
