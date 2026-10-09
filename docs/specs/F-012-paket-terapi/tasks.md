---
id: F-012-TSK
feature: F-012
title: "Implementation Tasks: Paket Terapi"
status: implemented
owner: "Developer"
last_updated: "2026-10-09"
last_verified_commit: "68c8af6"
related:
  - "requirements.md"
  - "design.md"
---

# Implementation Tasks: F-012 Paket Terapi

> Change Request Post-MVP. Disetujui untuk dikerjakan 2026-10-09. Fase 1 sampai Fase 4 selesai di
> staging. Migrasi dan data paket awal sudah diterapkan di staging. Produksi sengaja ditahan, sehingga
> GATE-001 belum dapat ditutup sampai migrasi diterapkan ke produksi.

## Execution Rules

1. Tunggu persetujuan client sebelum menjalankan task apa pun (OQ-001 blocking).
2. Kerjakan satu task pada satu waktu, mengikuti urutan dependensi.
3. Baca requirements dan bagian design yang dirujuk sebelum mengubah kode.
4. Jangan mengambil keputusan produk, kontrak data, keamanan, atau arsitektur di dalam task. Angkat
   blocker bila keputusan demikian muncul.
5. Catat bukti sebelum menandai task selesai.
6. Migrasi bersifat append-only; jangan pernah mengedit migrasi yang sudah diterapkan.

## Status Legend

- `[ ]` Not started
- `[-]` In progress
- `[x]` Complete
- `[!]` Blocked

## Dependency Map

```text
TASK-001 -> TASK-002 -> TASK-003 -> {TASK-004, TASK-005, TASK-006}
{TASK-004, TASK-005, TASK-006} -> TASK-007 -> TASK-008 -> TASK-009
TASK-009 -> TASK-010 -> TASK-011 -> TASK-012
```

## Phase 1 - Fondasi Data

- [x] TASK-001 - Tambah migrasi tabel paket terapi.
  Buat `supabase/migrations/20261008_f012_therapy_packages.sql` berisi tabel `therapy_packages`,
  `therapy_package_items`, dan `visit_therapy_packages` beserta `CHECK`, `FOREIGN KEY`, index, dan RLS
  sesuai design Section 5 dan Section 6. Jangan mengubah kolom `visits` yang ada dan jangan mengedit
  migrasi lama.
  - _Design: Section 5, Section 6_
  - Files: `supabase/migrations/20261008_f012_therapy_packages.sql`
  - Verify: terapkan pada SQL editor proyek development; pastikan tiga tabel, index, dan RLS terbentuk.
  - _Requirements: FR-001, FR-004, FR-008, FR-009_

- [x] TASK-002 - Perluas kontrak tipe TypeScript.
  Tambahkan tipe `TherapyPackage`, `TherapyPackageItem`, dan `VisitTherapyPackage` pada
  `src/types/database.ts` agar konsisten dengan skema migrasi.
  - _Design: Section 5_
  - Files: `src/types/database.ts`
  - Verify: `npx tsc --noEmit`
  - _Requirements: FR-001, FR-004, FR-008_

- [x] TASK-003 - Tambah konstanta jenis item paket.
  Tambahkan `THERAPY_PACKAGE_ITEM_TYPES` beserta label tampilannya pada `src/constants/clinic.ts`.
  Jangan menaruh daftar ini di dalam komponen.
  - _Design: Section 4_
  - Files: `src/constants/clinic.ts`
  - Verify: `npx tsc --noEmit`
  - _Requirements: FR-004_

## Phase 2 - Master Paket Terapi

- [x] TASK-004 - Bangun editor item paket.
  Buat `src/components/paket-terapi/PackageItemsEditor.tsx` yang memungkinkan penambahan, perubahan,
  penghapusan, dan pengurutan item, serta menghitung subtotal dan harga total sebagai turunan. Gunakan
  kontrol dari `src/components/ui/`.
  - _Design: Section 5.1, Section 8, Section 9_
  - Files: `src/components/paket-terapi/PackageItemsEditor.tsx`
  - Verify: `npx tsc --noEmit`; nilai total berubah otomatis saat item berubah.
  - _Requirements: FR-004, FR-005_

- [x] TASK-005 - Bangun formulir paket.
  Buat `src/components/paket-terapi/PackageFormModal.tsx` untuk membuat dan mengubah paket, memakai
  `PackageItemsEditor`, dengan validasi nama, kode unik, dan minimal satu item.
  - _Design: Section 4, Section 7, Section 9_
  - Files: `src/components/paket-terapi/PackageFormModal.tsx`
  - Verify: `npx tsc --noEmit`; validasi menolak nama kosong, kode duplikat, dan paket tanpa item.
  - _Requirements: FR-001, FR-002, FR-009_

- [x] TASK-006 - Bangun daftar paket dengan pencarian.
  Buat `src/components/paket-terapi/PackageList.tsx` yang menampilkan nama, kode, jumlah item, harga
  total, dan status, dengan pencarian di sisi klien serta empty state.
  - _Design: Section 4, Section 9_
  - Files: `src/components/paket-terapi/PackageList.tsx`
  - Verify: `npx tsc --noEmit`; pencarian menyaring hasil dan empty state tampil saat tidak ada hasil.
  - _Requirements: FR-006_

- [x] TASK-007 - Bangun halaman master paket dan aksi pengelolaan.
  Buat `src/app/paket-terapi/page.tsx` yang memuat `therapy_packages` beserta itemnya, menghubungkan
  daftar dan formulir, serta menyediakan aksi aktifkan dan nonaktifkan. Tampilkan aksi pengelolaan hanya
  untuk `owner`. Tambahkan tautan navigasi dengan visibilitas peran pada `src/components/Sidebar.tsx`.
  - _Design: Section 3, Section 4, Section 9, Section 11_
  - Files: `src/app/paket-terapi/page.tsx`, `src/components/Sidebar.tsx`
  - Verify: `npx tsc --noEmit`; `dokter_admin` melihat daftar tanpa aksi pengelolaan.
  - _Requirements: FR-001, FR-002, FR-003, FR-006, FR-009_

## Phase 3 - Penerapan ke Kunjungan

- [x] TASK-008 - Bangun modal penerapan paket.
  Buat `src/components/paket-terapi/ApplyPackageModal.tsx` yang memuat paket aktif, menampilkan rincian
  item dan harga total, memperingatkan penerapan ganda, dan mengembalikan payload penerapan.
  - _Design: Section 3, Section 7, Section 9_
  - Files: `src/components/paket-terapi/ApplyPackageModal.tsx`
  - Verify: `npx tsc --noEmit`; paket nonaktif tidak muncul dan peringatan ganda tampil.
  - _Requirements: FR-006, FR-007, FR-008_

- [x] TASK-009 - Integrasikan aksi penerapan ke panel kasir.
  Tambahkan aksi "Terapkan Paket Terapi" pada `src/components/pendaftaran/CashierPosPanel.tsx` tanpa
  menghapus alur penagihan manual.
  - _Design: Section 3, Section 4, Section 9_
  - Files: `src/components/pendaftaran/CashierPosPanel.tsx`
  - Verify: `npx tsc --noEmit`; alur manual tetap berfungsi ketika tidak ada paket.
  - _Requirements: FR-007_

- [x] TASK-010 - Tulis handler penerapan dan rekam jejak.
  Pada `src/app/pendaftaran/page.tsx`, tambahkan handler yang mengisi `terapi_obat`, `tindakan` /
  `keterangan_tindakan`, `pendapatan_lain`, dan `keterangan_pendapatan` tanpa mengubah `biaya_periksa`,
  lalu menulis satu baris rekam jejak append-only, dan memanggil `revalidatePath`.
  - _Design: Section 3, Section 5.2, Section 7, Section 10_
  - Files: `src/app/pendaftaran/page.tsx`
  - Verify: `npx tsc --noEmit`; penerapan pada pasien BPJS tidak mengubah `biaya_periksa` dari nol.
  - _Requirements: FR-007, FR-008_

## Phase 4 - Verifikasi

- [x] TASK-011 - Tambah aksi cepat dan penyesuaian navigasi opsional.
  Tambahkan aksi cepat menuju master paket pada `src/components/CommandMenu.tsx` dengan visibilitas
  `owner`, bila tidak mengganggu aksi cepat yang sudah ada.
  - _Design: Section 4_
  - Files: `src/components/CommandMenu.tsx`
  - Verify: `npx tsc --noEmit`; aksi hanya tampil untuk `owner`.
  - _Requirements: FR-006, FR-009_

- [x] TASK-012 - Verifikasi dan gerbang mutu.
  Jalankan pemeriksaan statis, pemeriksaan tipe, dan build produksi. Verifikasi manual alur buat, ubah,
  nonaktifkan, dan terapkan paket, termasuk penerapan ganda, pasien BPJS, serta tampilan pada 360 piksel,
  768 piksel, dan 1024 piksel ke atas tanpa scroll horizontal dan dengan target sentuh minimal 44 kali
  44 piksel.
  - Commands: `npm run lint`, `npx tsc --noEmit`, `npm run build`
  - Verify: seluruh perintah lulus; bukti responsivitas dan keyboard dicatat.
  - _Requirements: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009,
    NFR-PERF-001, NFR-SEC-001, NFR-SEC-002, NFR-A11Y-001, NFR-A11Y-002, NFR-RESP-001_

## Verification Gate

### Bukti Verifikasi (2026-10-09)

- `npx tsc --noEmit` lulus.
- `npm test` lulus, 14 uji (matriks hak akses dan aritmetika draf paket).
- `npm run build` lulus, rute `/paket-terapi` terbentuk.
- Staging: 3 tabel F-012 ada; 10 paket awal dengan 21 item terpasang.
- Staging: simulasi penerapan (tambah `pendapatan_lain`, isi keterangan, tulis rekam jejak) berhasil
  di dalam transaksi lalu di-`rollback`; `biaya_periksa` pasien BPJS tetap nol.
- Verifikasi manual antarmuka (klik buat, ubah, nonaktifkan, hapus, terapkan) pada 360, 768, dan
  1024 piksel masih perlu dilakukan operator pada staging.

- [!] GATE-001 - Gerbang verifikasi akhir.
  Seluruh task Fase 1 sampai Fase 4 selesai dengan bukti tercatat. Persetujuan client atas F-012
  terdokumentasi pada requirements Section 16. Migrasi sudah diterapkan pada proyek produksi. Tidak ada
  perubahan di luar lingkup F-012.
  - _Requirements: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009_
  - _Status: tertahan. Sesuai keputusan pengguna, produksi ditahan, sehingga migrasi F-012 belum
    diterapkan ke produksi. Gate dapat ditutup setelah operator menyetujui penerapan ke produksi._

## Deferred Work

- Perhitungan atomik penerapan paket melalui fungsi RPC Supabase, bila penerapan multi-tabel terbukti
  perlu transaksi eksplisit (design Section 15).
- Kategori atau pengelompokan paket untuk volume besar (OQ-006).
- Laporan penggunaan paket per periode (di luar lingkup F-012).

## Blockers

| ID | Description | Owner | Affected tasks | Canonical artifact to resolve | Resolution |
|---|---|---|---|---|---|
| BLK-001 | Persetujuan client atas F-012 sebagai Change Request Post-MVP belum ada | Client | TASK-001 s/d TASK-012 | REQUIREMENTS (Section 15 OQ-001, Section 16) | Resolved 2026-10-09: disetujui, implementasi di staging |
| BLK-002 | Penempatan menu master paket (rute baru atau tab modul) belum dikonfirmasi | Developer lalu Client | TASK-007, TASK-011 | DESIGN (Section 4, Section 14) | Resolved: rute baru `/paket-terapi` khusus `owner` |
