---
id: F-013-TSK
feature: F-013
status: implemented
owner: "Developer"
last_updated: "2026-10-08"
last_verified_commit: unverified
related:
  - "requirements.md"
  - "design.md"
---

# Tasks: F-013 Surat Keterangan Sakit - Alamat Tambahan yang Dapat Diedit

## Execution Rules

1. Execute one task at a time.
2. Read referenced requirements before editing.
3. Tidak ada modul `system-architecture.md` pada MVP. Constraint arsitektur diambil dari
   `AGENTS.md` Bagian 4 dan 5 dan dirujuk pada setiap task.
4. Read referenced implementation-design sections before editing.
5. Do not introduce product, public/data contract, security, or architecture decisions inside an
   implementation task. Penyimpanan permanen alamat tambahan BUKAN bagian dari slice ini.
6. Mark a task blocked when an unresolved decision appears.
7. Preserve task IDs after approval.
8. Record evidence before checking a task as complete.

## Status Legend

- `[ ]` Not started
- `[-]` In progress
- `[x]` Complete
- `[!]` Blocked

## Dependency Map

```text
TASK-001 -> TASK-002 -> TASK-003 -> TASK-004
               |
               +-> TASK-005 (verification gate, setelah TASK-004)
```

## Tasks

### [x] TASK-001 - Tambah State dan Field "Alamat Tambahan"

Objective:

Menambahkan state `alamatTambahan` dan satu field input opsional "Alamat Tambahan" pada panel
pengaturan surat di `SuratSakitModal.tsx`, memakai primitif `Input` dari `src/components/ui/`.

Requirement references:

- FR-001
- AC-001.1
- AC-001.4
- VAL-001

System architecture references:

- `AGENTS.md` Bagian 4: Aturan Arsitektur Permanen (mandat UI reusable, primitif `src/components/ui/`).
- Architecture claim to preserve: semua kontrol antarmuka memakai primitif atomik.
- `AGENTS.md` Bagian 9: tidak ada perubahan skema database pada task ini.

Use `N/A - no module-architecture impact` only when the task genuinely does not depend on a
module-level decision.

Design references:

- Section 4: Component Changes
- Section 9: UI and UX Behavior

Expected file scope:

- `src/components/rekam-medis/SuratSakitModal.tsx`

Constraints:

- Hanya `SuratSakitModal.tsx` yang boleh berubah; jangan ubah `ExaminationForm.tsx`.
- Jangan menambah dependensi baru.
- Do not change approved module architecture inside this task.

Implementation steps:

1. Tambahkan state `const [alamatTambahan, setAlamatTambahan] = useState<string>('')`.
2. Tambahkan field `Input` berlabel "Alamat Tambahan" pada panel pengaturan (`print:hidden`).
3. Pastikan label terhubung dan penempatan grid tetap responsif (satu kolom pada mobile).

Required tests:

- Field tampil dan dapat diketik; state berubah sesuai input.

Architecture-sensitive verification:

- N_A

Verification commands:

```bash
npx tsc --noEmit
npm run lint
```

Definition of done:

- [ ] Required behavior exists.
- [ ] Referenced acceptance criteria are satisfied.
- [ ] Referenced architecture constraints are preserved.
- [ ] Required architecture-sensitive evidence is collected when applicable.
- [ ] Required checks pass.
- [ ] Documentation impact is handled.
- [ ] No unrelated changes exist.

Dependencies:

- None

Evidence:

- Pending

Notes:

- Pertahankan gaya label yang sudah ada pada modal surat untuk konsistensi visual.

_Requirements: FR-001, AC-001.1, VAL-001_

### [x] TASK-002 - Terapkan Validasi dan Normalisasi Isi

Objective:

Menegakkan aturan validasi alamat tambahan: trim sebelum dipakai, batas maksimum 120 karakter,
dan memperlakukan isi yang hanya berisi spasi sebagai kosong.

Requirement references:

- FR-003
- AC-003.1
- AC-003.2
- AC-003.3
- AC-003.4
- VAL-002
- VAL-003

System architecture references:

- `AGENTS.md` Bagian 7: Serialization/validation boundary, validasi di tingkat komponen.
- Architecture claim to preserve: validasi masukan tidak tepercaya dilakukan di komponen.

Design references:

- Section 8: State Management
- Section 11: Security Implementation

Expected file scope:

- `src/components/rekam-medis/SuratSakitModal.tsx`

Constraints:

- Tidak ada escaping HTML; render sebagai teks biasa.
- Do not change approved module architecture inside this task.

Implementation steps:

1. Terapkan `maxLength={120}` pada field input.
2. Buat nilai turunan ternormalisasi (trim) untuk dipakai saat merender surat.
3. Perlakukan nilai ternormalisasi yang kosong sebagai tidak ada.

Required tests:

- Input 121 karakter tertahan pada 120 karakter.
- Isi hanya spasi diperlakukan sebagai kosong.

Architecture-sensitive verification:

- N_A

Verification commands:

```bash
npx tsc --noEmit
npm run lint
```

Definition of done:

- [ ] Required behavior exists.
- [ ] Referenced acceptance criteria are satisfied.
- [ ] Referenced architecture constraints are preserved.
- [ ] Required architecture-sensitive evidence is collected when applicable.
- [ ] Required checks pass.
- [ ] Documentation impact is handled.
- [ ] No unrelated changes exist.

Dependencies:

- TASK-001

Evidence:

- Pending

Notes:

- Jangan mengubah nilai state mentah; normalisasi cukup pada nilai turunan yang dirender.

_Requirements: FR-003, AC-003.1, AC-003.2, AC-003.3, VAL-002, VAL-003_

### [x] TASK-003 - Render Alamat Tambahan pada Baris Alamat Surat

Objective:

Menampilkan alamat tambahan pada baris "Alamat" di badan surat secara bertingkat, hanya ketika
terisi, dan tetap mencetak alamat terdaftar sebagai dasar.

Requirement references:

- FR-002
- AC-002.1
- AC-002.2
- AC-002.3
- AC-002.4

System architecture references:

- `AGENTS.md` Bagian 4: Tipografi kanonik Plus Jakarta Sans dan tanpa format ad-hoc.
- Architecture claim to preserve: tata letak surat A5 tidak berubah dan tidak ada luapan horizontal.

Design references:

- Section 4: Component Changes
- Section 9: UI and UX Behavior

Expected file scope:

- `src/components/rekam-medis/SuratSakitModal.tsx`

Constraints:

- Baris kosong, tanda hubung menggantung, atau label kosong dilarang saat alamat tambahan kosong.
- Do not change approved module architecture inside this task.

Implementation steps:

1. Pertahankan rendering alamat terdaftar yang sudah ada sebagai dasar.
2. Tambahkan alamat tambahan sebagai baris terpisah di dalam sel alamat ketika terisi.
3. Verifikasi tampilan pada pratinjau layar dan pada `window.print()`.

Required tests:

- Alamat tambahan tampil pada pratinjau dan hasil cetak ketika terisi.
- Surat tetap identik dengan perilaku lama ketika alamat tambahan kosong.

Architecture-sensitive verification:

- FAILURE_HANDLING: pembatalan dialog cetak tidak merusak tampilan surat.

Verification commands:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Definition of done:

- [ ] Required behavior exists.
- [ ] Referenced acceptance criteria are satisfied.
- [ ] Referenced architecture constraints are preserved.
- [ ] Required architecture-sensitive evidence is collected when applicable.
- [ ] Required checks pass.
- [ ] Documentation impact is handled.
- [ ] No unrelated changes exist.

Dependencies:

- TASK-001
- TASK-002

Evidence:

- Pending

Notes:

- Jaga agar alamat tambahan mengikuti lebar kolom surat agar tidak meluap pada kertas A5.

_Requirements: FR-002, AC-002.1, AC-002.2, AC-002.3, AC-002.4_

### [x] TASK-004 - Pastikan Reset dan Isolasi Antar Surat

Objective:

Memastikan alamat tambahan selalu mulai kosong pada setiap kali modal dibuka dan tidak pernah
terbawa ke surat pasien lain.

Requirement references:

- FR-004
- AC-004.1
- AC-004.2
- AC-004.3

System architecture references:

- `AGENTS.md` Bagian 7: State owner dan larangan menyimpan data bisnis di luar database.
- Architecture claim to preserve: tidak ada persistensi data bisnis, tidak ada `localStorage`.

Design references:

- Section 5: Data Model Implementation
- Section 8: State Management

Expected file scope:

- `src/components/rekam-medis/SuratSakitModal.tsx`

Constraints:

- Tidak menulis ke Supabase dan tidak menulis ke `localStorage`.
- Do not change approved module architecture inside this task.

Implementation steps:

1. Pastikan state diinisialisasi sebagai string kosong pada siklus hidup modal.
2. Jika pola modal yang ada memakai efek reset, selaraskan dengan pola tersebut.
3. Verifikasi membuka modal untuk pasien berbeda tidak membawa nilai lama.

Required tests:

- Membuka modal selalu memulai dari keadaan kosong.
- Menutup modal tanpa mencetak tidak menyimpan apa pun.

Architecture-sensitive verification:

- N_A - tidak ada operasi data yang perlu diverifikasi selain ketiadaan penulisan.

Verification commands:

```bash
npx tsc --noEmit
npm run lint
```

Definition of done:

- [ ] Required behavior exists.
- [ ] Referenced acceptance criteria are satisfied.
- [ ] Referenced architecture constraints are preserved.
- [ ] Required architecture-sensitive evidence is collected when applicable.
- [ ] Required checks pass.
- [ ] Documentation impact is handled.
- [ ] No unrelated changes exist.

Dependencies:

- TASK-001

Evidence:

- Pending

Notes:

- Pastikan tidak ada nilai default yang diisi otomatis untuk alamat tambahan.

_Requirements: FR-004, AC-004.1, AC-004.2, AC-004.3_

### [-] TASK-005 - Verifikasi Akhir dan Responsivitas Cetak

Objective:

Melakukan verifikasi menyeluruh atas fitur pada lingkungan pengembangan, termasuk cetak A5 dan
kerapian pada 360 px, 768 px, dan 1024 px ke atas.

Requirement references:

- FR-001
- FR-002
- FR-003
- FR-004
- NFR-A11Y-001
- NFR-A11Y-002
- NFR-RESP-001

System architecture references:

- `AGENTS.md` Bagian 4: Mandat Responsif Mobile dan Tablet.
- Architecture claim to preserve: tanpa gulir horizontal tingkat halaman dan target sentuh 44 x 44 px.

Design references:

- Section 12: Testing Strategy
- Section 13: Rollout and Rollback

Expected file scope:

- `src/components/rekam-medis/SuratSakitModal.tsx` (verifikasi, bukan perubahan perilaku baru)

Constraints:

- Verifikasi hanya boleh menutup atau melaporkan; jangan menambah perilaku di luar requirements.
- Do not change approved module architecture inside this task.

Implementation steps:

1. Jalankan lint, typecheck, dan build.
2. Uji manual: buka surat, isi alamat tambahan, periksa pratinjau, cetak, bandingkan hasil cetak.
3. Uji tanpa alamat tambahan untuk memastikan surat identik dengan perilaku lama.
4. Uji tata letak pada 360 px, 768 px, dan 1024 px ke atas, serta operabilitas keyboard dan fokus.

Required tests:

- Cetak A5 memuat alamat tambahan sesuai isi.
- Tidak ada baris kosong saat alamat tambahan kosong.
- Tidak ada gulir horizontal tingkat halaman pada ketiga lebar uji.

Architecture-sensitive verification:

- AUTHZ: modal tidak menambah jalur akses baru di luar pengamanan F-008.

Verification commands:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Definition of done:

- [ ] Required behavior exists.
- [ ] Referenced acceptance criteria are satisfied.
- [ ] Referenced architecture constraints are preserved.
- [ ] Required architecture-sensitive evidence is collected when applicable.
- [ ] Required checks pass.
- [ ] Documentation impact is handled.
- [ ] No unrelated changes exist.

Dependencies:

- TASK-003
- TASK-004

Evidence:

- Pending

Notes:

- Rekam bukti verifikasi (hasil lint, typecheck, build, dan hasil cetak) sebelum menutup task.

_Requirements: FR-002, FR-003, NFR-RESP-001, NFR-A11Y-001_

## Verification Gate

The feature is complete only when all of the following hold, with evidence recorded:

- [x] `npx tsc --noEmit` passes with no new errors.
- [x] `npm run lint` passes with no new warnings or errors.
- [x] `npm run build` succeeds.
- [ ] Manual print verification confirms the additional address appears in the A5 output when
      filled and is absent when empty.
- [ ] Responsive verification passes at 360 px, 768 px, and 1024 px and above with no page-level
      horizontal scroll.
- [ ] Keyboard operation and visible focus are confirmed on the additional address field.
- [x] No database migration and no new dependency were introduced.
- [ ] No PII (address content, NIK, BPJS number, diagnosis) is logged or persisted.

## Deferred Work

- Persistensi permanen alamat tambahan ke `visits` atau tabel baru, dengan migrasi dan peninjauan
  RLS. Ditunda sebagai opsi Post-MVP (requirements NG-001, OQ-001; design Alternative B).
- Menambahkan alamat tambahan pada Surat Rujukan. Ditunda sebagai permintaan terpisah
  (requirements NG-003, OQ-003).

## Blockers

| ID | Description | Owner | Affected tasks | Canonical artifact to resolve | Resolution |
|---|---|---|---|---|---|
| BLK-001 | None | Developer | None | N/A | None |
