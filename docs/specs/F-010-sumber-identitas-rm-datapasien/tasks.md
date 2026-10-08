---
id: F-010-TSK
feature: F-010
title: "Tasks: Sumber Identitas No RM dari DATAPASIEN"
status: draft
owner: "Developer"
last_updated: "2026-10-05"
last_verified_commit: unverified
related:
  - "requirements.md"
  - "design.md"
  - "../../runbooks/f010-remigrasi-datapasien.md"
---

# Tasks: F-010 Sumber Identitas No RM dari DATAPASIEN

Status: rehearsal staging fase 1 selesai dan terverifikasi. Promosi produksi menunggu jawaban klinik dan OQ-004.

Hasil rehearsal staging (2026-10-08): `patients` 3.725, audit 7.818 baris, 0 unresolved, 18 perlu
tinjauan (`RM_NAMA_IDENTIK` 7.729, `RM_NAMA_VARIAN` 56, `NAMA_UNIK` 13, `NAMA+TIEBREAK` 2,
`RM_SAJA` 11, `NAMA_AMBIGU` 7). Fase 2 terverifikasi: `visits` 7.792, `cash_flows` 1.617, 0 kunjungan
tanpa pasien. Back up pra-rehearsal: `docs/data/f010-staging-prebuild-*.json`.

Fase 2 kunjungan dan kas: `scripts/f010-apply-derived.mjs`. Fase 3 register dan bidan:
`scripts/f010-apply-registers.mjs`. Fase 4 sirkumsisi dan skrining: `scripts/f010-apply-sunat-screening.mjs`.
Pembungkus produksi: `scripts/f010-promote.mjs`.

Status staging (2026-10-08), lengkap: `patients` 3.748 (semua RM 9 digit), `visits` 7.792,
`cash_flows` 1.617, `public_health_records` 811 (ELIMINASI_3 40), `circumcisions` 43,
`bidan_rujukan` 82, audit perlu tinjauan 18.

Catatan: 23 pasien sunat tidak ada di master `DATA`, jadi dibuatkan otomatis dengan No RM 9 digit
lanjutan. Ini masuk daftar konfirmasi klinik.

Penggabungan `rmKey` di `scripts/reconcile-clinic-data.mjs` kini opt-in (`--legacy-merge`) dan tidak
lagi jalan secara default.

## Fase A - Fondasi skema

- [x] **TASK-010-1**: Terapkan migrasi DDL
  `supabase/migrations/20261005_f010_datapasien_identity_source.sql` (fungsi bantu, skema `staging`,
  tabel `patient_identity_audit`, resolver, view tinjauan).
  _Requirements: FR-001, FR-004, FR-005_

- [ ] **TASK-010-2**: Tambah `patient_identity_audit` dan `v_patient_identity_review` ke
  `src/types/database.ts` agar tipe selaras dengan skema.
  _Requirements: FR-004, FR-005_

- [x] **TASK-010-3**: Buat pemuat `staging` (`scripts/f010-load-staging.mjs`) (skrip operator) yang membaca `DATAPASIEN.csv` dan
  `REKAMMEDIS.csv` ke `staging.datapasien` dan `staging.rekam_visit`, dengan pengaman target
  produksi dan `--dry-run`.
  _Requirements: FR-001, FR-002, NFR-SEC-001_

## Fase B - Perbaikan logika migrasi

- [ ] **TASK-010-4**: Hapus penggabungan berbasis `rmKey` di `scripts/reconcile-clinic-data.mjs`.
  Pasien hanya digabung bila ada bukti identitas (nama identik atau tanggal lahir + desa sama).
  _Requirements: FR-003, BR-003_

- [ ] **TASK-010-5**: Ubah `scripts/reconcile-clinic-data.mjs` agar sumber master pasien adalah
  `DATAPASIEN.csv` dan pemetaan kunjungan memakai `public.patient_identity_audit` sebagai peta.
  _Requirements: FR-001, FR-002_

- [ ] **TASK-010-6**: Tambah penulisan laporan `docs/data/f010-report-<timestamp>.json` (jumlah per
  aturan, daftar `PERLU_TINJAUAN`, jumlah kunjungan) dan cetak ringkasan verifikasi.
  _Requirements: FR-004, FR-005, NFR-AUDIT-001_

## Fase C - Generator No RM aplikasi

- [ ] **TASK-010-7**: Perbaiki `generateNextNoRm` di `src/components/pendaftaran/NewPatientModal.tsx`
  agar menghitung urutan dari nomor historis 9 digit pada prefix yang sama, bukan hanya nomor
  ber-format dash, dan menghasilkan format yang konsisten.
  _Requirements: FR-007_

- [ ] **TASK-010-8**: Selaraskan penomoran pasien baru di `scripts/reconcile-clinic-data.mjs` (jalur
  sunat) dengan skema `rm_prefix` + urutan yang sama.
  _Requirements: FR-007_

## Fase D - Rehearsal staging

- [x] **TASK-010-9**: Muat `staging` di proyek pengembangan dan jalankan rebuild fase 1
  (`scripts/f010-load-staging.mjs` + `scripts/f010-rebuild-identity.sql`)
  (lihat `docs/runbooks/f010-remigrasi-datapasien.md`).
  _Requirements: FR-001, FR-002, FR-008_

- [x] **TASK-010-10**: Verifikasi hasil staging: jumlah `visits` = 7.671, jumlah pasien = jumlah
  baris `DATAPASIEN` + pasien baru, tidak ada `resolved_patient_id` NULL, dan view tinjauan berisi
  ~162 baris.
  _Requirements: FR-002, FR-005, FR-006, INV-001, INV-002_

- [ ] **TASK-010-11**: Jalankan rebuild dua kali di staging dan pastikan jumlah baris tidak berubah
  (idempoten).
  _Requirements: FR-008, INV-006_

- [ ] **TASK-010-12**: Uji unit SQL untuk `rm_digits`, `rm_key`, `normalize_rm`, `norm_name`,
  `names_overlap`, `rm_prefix`, dan kontrak `f010_resolve_patient` (selalu satu baris).
  _Requirements: FR-002, BR-006_

## Fase E - Promosi produksi (setelah persetujuan klinik)

- [ ] **TASK-010-13**: Backup produksi (`node scripts/backup-clinic-data.mjs <ref> prod-f010`).
  _Requirements: NFR-REL-001, PRE-001_

- [ ] **TASK-010-14**: Konfirmasi tidak ada data baru pasca-migrasi 2026-10-01 pada
  `patients`, `visits`, dan `cash_flows`.
  _Requirements: ASM-003_

- [ ] **TASK-010-15**: Jalankan rebuild fase 1 dan fase 2 di produksi, lalu bangun ulang data
  program (register kesehatan, sunat, bidan) lewat skrip.
  _Requirements: FR-002, FR-006_

- [ ] **TASK-010-16**: Verifikasi produksi sesuai TASK-010-10 dan cocokkan dengan laporan.
  _Requirements: FR-006, INV-001, INV-002, INV-003_

## Fase F - Serah terima dan pembersihan

- [ ] **TASK-010-17**: Serahkan daftar `v_patient_identity_review` ke klinik dan minta keputusan
  atas OQ-001 dan OQ-002.
  _Requirements: FR-005, OQ-001, OQ-002_

- [ ] **TASK-010-18**: Setelah klinik menerima, hapus skema `staging` dan tabel audit (atau arsipkan
  laporan lalu hapus).
  _Requirements: FR-004_

- [ ] **TASK-010-19**: Perbarui `docs/specs/_index.md`, catat ADR perubahan sumber kebenaran
  identitas, dan perbarui `docs/context/state.yaml` bila implementasi dimulai.
  _Requirements: -_

## Gate verifikasi akhir

- [ ] **TASK-010-20**: `npm run lint`, `npx tsc --noEmit`, `npm run build` lulus; migrasi dapat
  diulang tanpa perubahan (INV-006); tidak ada PII di berkas terlacak (NFR-SEC-002).
  _Requirements: NFR-SEC-002, INV-006_
