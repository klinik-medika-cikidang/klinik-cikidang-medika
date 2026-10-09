---
id: F-012-DESIGN
feature: F-012
title: "Design: Paket Terapi"
status: in_progress
owner: "Developer"
last_updated: "2026-10-08"
last_verified_commit: unverified
related:
  - "requirements.md"
  - "../../architecture/overview.md"
  - "../../architecture/data-model.md"
---

# Design: F-012 Paket Terapi

> Change Request Post-MVP. Dokumen ini adalah rencana dan TIDAK BOLEH dieksekusi sebelum client
> menyetujui F-012 (requirements Section 15, OQ-001).

> Dokumen ini memetakan requirements ke repositori nyata dan tidak mengulang arsitektur yang sudah
> dimiliki `docs/architecture/overview.md`.

## 1. Design Summary

F-012 menambahkan dua lapisan kecil pada sistem yang sudah ada.

Lapisan pertama adalah **master data paket terapi**: sebagian besar bersifat konfigurasi, dikelola
`owner`, dan tidak menyentuh alur klinis pasien. Dua tabel baru (`therapy_packages` dan
`therapy_package_items`) menyimpan definisi paket dan itemnya.

Lapisan kedua adalah **penerapan paket ke kunjungan**, yang menempel pada alur kasir yang sudah ada.
Penerapan tidak menciptakan sumber kebenaran tagihan baru. Ia mengisi kolom `visits` yang sudah dipakai
hari ini (`terapi_obat`, `tindakan`, `keterangan_tindakan`, `pendapatan_lain`,
`keterangan_pendapatan`) dan menulis satu baris rekam jejak append-only pada `visit_therapy_packages`
untuk audit. Keputusan ini menjaga kuitansi, buku kas, dan laporan tetap membaca kolom yang sama.

Input arsitektur:

- `AGENTS.md` Section 4 (arah dependensi), Section 5 (tanggung jawab direktori), Section 9 (aturan basis
  data), Section 10 (aturan keamanan), Section 14 (tindakan yang dilarang).
- `docs/architecture/overview.md` untuk batas klien Supabase dan adapter.
- `docs/architecture/data-model.md` untuk bentuk entitas `visits`.
- ADR terkait: tidak ada yang perlu diubah.

Design Read untuk lapisan UI: aplikasi klinik internal untuk staf dan pemilik, dengan bahasa visual teal
klinis yang sudah ada, dial ENERGY 2 / RHYTHM 2 / MOTION 1. Arah mengikuti sistem yang ada pada
`src/constants/theme.ts` dan kosakata komponen yang sudah mapan (`shadow-card-double`, `tactile-card`,
`tactile-btn`), bukan bahasa visual baru.

## 2. Existing Context

Modul yang relevan:

- `supabase/migrations/20260918_init_klinik_cikidang.sql`: mendefinisikan `visits` dengan kolom
  `tindakan VARCHAR(100)`, `keterangan_tindakan TEXT`, `terapi_obat TEXT`, `pendapatan_lain NUMERIC(15,2)`,
  `keterangan_pendapatan TEXT`, `biaya_periksa NUMERIC(15,2)`.
- `supabase/migrations/20260926_f008_public_health_and_debt.sql`: contoh penambahan tabel dan RLS baru
  dengan pola `ENABLE ROW LEVEL SECURITY` lalu `CREATE POLICY`.
- `src/app/pendaftaran/page.tsx`: `handleSettlePayment` menulis `biaya_periksa`, `pendapatan_lain`,
  `keterangan_pendapatan`, `jenis_pembayaran`, `status_pembayaran`, dan `payment_state`.
- `src/components/pendaftaran/CashierPosPanel.tsx`: panel kasir. Mengelola input `biayaPeriksa`,
  `pendapatanLain`, `keteranganPendapatan`, dan menampilkan `terapi_obat` yang sudah terisi.
- `src/components/ui/`: `Modal`, `Button`, `Input`, `Select`, `Badge`, `Card`, `Table`.
- `src/constants/clinic.ts`: konstanta kanonik kanal klinik, salah satunya `DEFAULT_TARIFFS`.
- `src/types/database.ts`: kontrak tipe `Visit`, `Patient`, dan seterusnya.
- `src/lib/utils.ts`: `formatRupiah` dan `cn`.

Pola yang harus dipertahankan:

- Satu primitif `ui/` yang dapat dipakai ulang per kontrol. Kontrol baru masuk ke `src/components/ui/`
  bila benar-benar generik; kontrol spesifik fitur masuk ke folder fitur.
- Uang sebagai `NUMERIC(15,2)`, ditampilkan melalui `formatRupiah`.
- Kesalahan ditampilkan dalam Bahasa Indonesia melalui `sonner`.
- Tidak ada library state eksternal; gunakan state React pada halaman.
- Tabel dan formulir TIDAK BOLEH meluber keluar halaman pada mobile.
- Migrasi bersifat append-only dan tidak mengedit migrasi yang sudah diterapkan.

Batasan:

- Tidak menambah dependensi baru.
- Nama pasien, NIK, nomor BPJS, dan diagnosis tidak masuk log.

## 3. Proposed Implementation Flow

Alur penerapan paket ke kunjungan:

```text
Kasir (CashierPosPanel) atau aksi pada kunjungan
  -> buka ApplyPackageModal
  -> supabase.from('therapy_packages').select(item + items).eq('aktif', true)
  -> pilih paket -> modal menampilkan rincian item dan harga total (formatRupiah)
  -> konfirmasi
  -> cek rekam jejak: paket sudah pernah diterapkan pada kunjungan ini?
       - ya  -> tampilkan peringatan, minta konfirmasi eksplisit
       - tidak -> lanjut
  -> tulis ke visits:
       pendapatan_lain      = pendapatan_lain lama + harga_total paket
       keterangan_pendapatan = gabungan teks lama + nama paket
       terapi_obat          = gabungan item jenis OBAT
       tindakan / keterangan_tindakan = item jenis TINDAKAN
  -> tulis 1 baris rekam jejak ke visit_therapy_packages (nama, harga, item snapshot)
  -> revalidatePath('/pendaftaran')
  -> tampilkan toast sukses Bahasa Indonesia
```

Alur master paket (khusus `owner`):

```text
/ paket-terapi (owner)
  -> PackageList membaca therapy_packages + hitung jumlah item dan harga total
  -> cari / saring di klien
  -> PackageFormModal membuat atau mengubah paket
       -> PackageItemsEditor menambah / mengubah / menghapus item
       -> harga total dihitung dari subtotal item
  -> simpan -> revalidatePath('/paket-terapi')
  -> toggle aktif/nonaktif
```

Urutan:

1. Migrasi menambahkan tabel baru beserta index dan kebijakan RLS. Aditif, tidak mengubah kolom lama.
2. Tipe TypeScript dan konstanta item ditambahkan.
3. Master paket dibangun lebih dulu, karena penerapan bergantung padanya.
4. Penerapan ke kunjungan dibangun pada alur kasir, memakai kolom yang sudah ada.
5. Verifikasi dijalankan sebelum rilis.

## 4. Component Changes

| Component or path | Change | Responsibility |
|---|---|---|
| `supabase/migrations/20261008_f012_therapy_packages.sql` | Create | Tabel paket, item, dan rekam jejak penerapan, beserta index dan RLS |
| `src/types/database.ts` | Modify | Tambah tipe `TherapyPackage`, `TherapyPackageItem`, `VisitTherapyPackage` |
| `src/constants/clinic.ts` | Modify | Tambah `THERAPY_PACKAGE_ITEM_TYPES` dan label tampilannya |
| `src/app/paket-terapi/page.tsx` | Create | Halaman master paket, akses baca untuk semua peran, kelola untuk `owner` |
| `src/components/paket-terapi/PackageList.tsx` | Create | Daftar paket dengan pencarian, status, jumlah item, harga total |
| `src/components/paket-terapi/PackageFormModal.tsx` | Create | Formulir buat dan ubah paket |
| `src/components/paket-terapi/PackageItemsEditor.tsx` | Create | Editor item: jenis, nama, kuantitas, harga satuan, subtotal, urutan |
| `src/components/paket-terapi/ApplyPackageModal.tsx` | Create | Pilih paket aktif, tampilkan rincian, konfirmasi, dan serahkan payload |
| `src/components/pendaftaran/CashierPosPanel.tsx` | Modify | Tambah aksi "Terapkan Paket Terapi" dan tampilkan paket yang diterapkan |
| `src/app/pendaftaran/page.tsx` | Modify | Handler penerapan paket dan penulisan ke kolom `visits` |
| `src/components/Sidebar.tsx` | Modify | Tambah tautan navigasi `Paket Terapi` dengan visibilitas peran |
| `src/components/CommandMenu.tsx` | Modify | Tambah aksi cepat menuju master paket (opsional, `owner`) |

Ditandai belum pasti: penempatan master paket sebagai rute baru `/paket-terapi` bergantung pada OQ-005.
Alternatif penempatannya dibahas di Section 14.

## 5. Data Model Implementation

### 5.1 Definisi paket

Tabel `public.therapy_packages`:

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | UUID PRIMARY KEY | `gen_random_uuid()` |
| `kode` | VARCHAR(30) | UNIQUE, boleh null selama tidak duplikat |
| `nama` | VARCHAR(150) NOT NULL | Wajib |
| `deskripsi` | TEXT | Opsional |
| `harga_total` | NUMERIC(15,2) NOT NULL DEFAULT 0 | Jumlah subtotal item, dihitung saat simpan |
| `aktif` | BOOLEAN NOT NULL DEFAULT true | Soft state, bukan hapus |
| `created_by_role` | VARCHAR(30) | Peran pembuat untuk audit |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | Diperbarui saat ubah |

Tabel `public.therapy_package_items`:

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | UUID PRIMARY KEY | `gen_random_uuid()` |
| `package_id` | UUID NOT NULL | REFERENCES `therapy_packages(id)` ON DELETE CASCADE |
| `jenis_item` | VARCHAR(20) NOT NULL | CHECK IN (`TINDAKAN`, `OBAT`, `LAIN`) |
| `nama_item` | VARCHAR(150) NOT NULL | Wajib |
| `qty` | NUMERIC(10,2) NOT NULL DEFAULT 1 | Lebih besar dari nol |
| `harga_satuan` | NUMERIC(15,2) NOT NULL DEFAULT 0 | Tidak negatif |
| `subtotal` | NUMERIC(15,2) NOT NULL DEFAULT 0 | `qty * harga_satuan` |
| `urutan` | INT NOT NULL DEFAULT 1 | Urutan tampil |
| `catatan` | TEXT | Opsional |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | |

### 5.2 Rekam jejak penerapan dan snapshot

Tabel `public.visit_therapy_packages` menyimpan setiap penerapan sebagai catatan append-only. Ini yang
memenuhi AC-002.4, AC-003.4, dan FR-008 tanpa mengubah riwayat kunjungan saat definisi paket berubah.

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | UUID PRIMARY KEY | `gen_random_uuid()` |
| `visit_id` | UUID NOT NULL | REFERENCES `visits(id)` ON DELETE CASCADE |
| `package_id` | UUID | REFERENCES `therapy_packages(id)` ON DELETE SET NULL |
| `nama_paket_snapshot` | VARCHAR(150) NOT NULL | Nama saat diterapkan |
| `harga_total_snapshot` | NUMERIC(15,2) NOT NULL DEFAULT 0 | Harga saat diterapkan |
| `items_snapshot` | JSONB NOT NULL DEFAULT '[]' | Salinan item saat diterapkan |
| `applied_by_role` | VARCHAR(30) | Peran penerap untuk audit |
| `applied_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

Catatan sumber kebenaran: `visits.pendapatan_lain` tetap sumber kebenaran nilai tagihan. Rekam jejak
TIDAK BOLEH dipakai untuk menghitung ulang tagihan; ia hanya untuk audit. Aturan ini dinyatakan pada
BR-007 dan diuji pada Section 12.

## 6. Database Changes

- Migrasi diperlukan: ya.
- Buat: `supabase/migrations/20261008_f012_therapy_packages.sql`.
- Tidak mengubah kolom lama pada `visits`. Seluruh perubahan bersifat aditif.
- Backfill: tidak ada. Paket diisi oleh `owner` melalui antarmuka setelah rilis.
- Operasi destruktif: tidak ada. Paket tidak dihapus permanen; hanya dinonaktifkan.
- Rollback / roll-forward: karena migrasi hanya menambah tabel baru, rollback cukup dengan menghentikan
  penggunaan fitur dan membiarkan tabel kosong. Tidak ada data lama yang perlu dipulihkan. Jika tabel
  benar-benar perlu dibuang, lakukan hanya pada lingkungan development setelah konfirmasi operator.
- Dampak otorisasi atau RLS: tabel baru mengaktifkan RLS. Kebijakan mengikuti pola F-008 (tabel dikunci
  berdasarkan peran). Pengelolaan definisi paket dibatasi `owner`; pembacaan paket aktif dan penulisan
  rekam jejak penerapan diizinkan untuk peran klinik.
- Index:

| Index | Tujuan |
|---|---|
| `uq_therapy_packages_kode` (unique, `kode`) | Menegakkan VAL-002 |
| `idx_therapy_packages_aktif` (`aktif`) | Menyaring paket aktif untuk penerapan |
| `idx_therapy_package_items_package_id` (`package_id`) | Mengambil item per paket |
| `idx_visit_therapy_packages_visit_id` (`visit_id`) | Rekam jejak dan cek penerapan ganda |
| `idx_visit_therapy_packages_package_id` (`package_id`) | Audit per paket |

Index dipilih sempit dan disengaja. Pada volume satu klinik, pencarian nama paket dilakukan di klien
setelah satu query kecil, sehingga tidak perlu index teks penuh.

## 7. API / Integration Contract

Tidak ada REST API kustom. Aplikasi memakai Supabase client SDK.

### Baca: daftar paket aktif untuk penerapan

Input: filter `aktif = true`, opsional pencarian nama atau kode.

Output satu baris paket beserta itemnya:

```json
{
  "id": "uuid",
  "kode": "PKT-INFUS",
  "nama": "Paket Infus Dewasa",
  "harga_total": 150000,
  "aktif": true,
  "items": [
    { "jenis_item": "TINDAKAN", "nama_item": "Pemasangan infus", "qty": 1, "harga_satuan": 100000, "subtotal": 100000 },
    { "jenis_item": "OBAT", "nama_item": "Cairan RL", "qty": 1, "harga_satuan": 50000, "subtotal": 50000 }
  ]
}
```

### Tulis: penerapan paket ke kunjungan

Payload yang dikirim handler:

```json
{
  "visit_id": "uuid",
  "package_id": "uuid",
  "nama_paket_snapshot": "Paket Infus Dewasa",
  "harga_total_snapshot": 150000,
  "items_snapshot": [],
  "pendapatan_lain_hasil": 150000,
  "keterangan_pendapatan_hasil": "Paket Infus Dewasa"
}
```

| Error code / event failure | Condition | Client / consumer behavior |
|---|---|---|
| `42P01` | Tabel paket belum dibuat karena migrasi belum diterapkan | Tampilkan pesan Bahasa Indonesia, jangan render daftar kosong sebagai sukses |
| `23503` | `visit_id` atau `package_id` tidak valid | Batalkan dan tampilkan pesan kesalahan |
| `42501` | Peran tidak berhak menulis definisi paket | Tolak aksi dan tampilkan pesan Bahasa Indonesia |
| `PGRST301` | Sesi kedaluwarsa | Arahkan ke `/login` |

- Backward compatible: ya. Semua perubahan aditif dan aplikasi lama tetap berfungsi.
- Affected clients/consumers: `/paket-terapi` (baru) dan `/pendaftaran` (kasir).
- Timeout/retry: ditangani Supabase SDK.
- Idempotency penerapan: dijaga di sisi aplikasi dengan memeriksa rekam jejak sebelum menulis
  (AC-008.3). Tabel rekam jejak bersifat append-only, jadi penerapan berulang yang disengaja menghasilkan
  dua baris dan dua penambahan nilai, sesuai keputusan pengguna.

## 8. State Management

State owner: state React pada halaman, sejalan dengan pola yang ada. Tidak ada store eksternal.

```text
initial -> loading -> success | empty | error
```

- Efek samping dipicu dari event handler dan helper fetch `useEffect`, bukan dari render.
- Editor item menyimpan daftar item sebagai state lokal dan menghitung `harga_total` sebagai turunan,
  sehingga pengguna tidak pernah mengetik total secara bebas (AC-005.2).
- Modal penerapan memuat paket aktif sekali saat dibuka dan menyimpan pilihan di state lokal.
- Sumber kebenaran lokal/remote: basis data adalah satu-satunya sumber kebenaran. Tidak ada data bisnis
  di `localStorage`.

## 9. UI and UX Behavior

### Master paket

- Daftar berbentuk tabel di desktop dan kartu bertumpuk di mobile, tidak ada scroll horizontal halaman.
- Harga total dan subtotal memakai tipografi angka tabular.
- Paket nonaktif tetap terlihat dengan badge redup, tetapi tidak muncul di modal penerapan.
- Aksi pengelolaan (`Buat`, `Ubah`, `Aktifkan`, `Nonaktifkan`) hanya tampil untuk `owner`.

### Penerapan pada kasir

- Aksi "Terapkan Paket Terapi" berada di area kasir, bukan menggantikan input manual. Penagihan manual
  tetap utuh ketika tidak ada paket (AC-007.5).
- Modal penerapan menampilkan rincian item sebelum konfirmasi, sehingga staf melihat apa yang akan
  ditagihkan.
- Setelah diterapkan, `pendapatan_lain` dan `keterangan_pendapatan` langsung tercermin pada ringkasan
  tagihan kasir yang sudah ada.
- KETIKA paket yang sama sudah ada pada kunjungan itu, tampilkan peringatan dan minta konfirmasi
  eksplisit (AC-008.3).

### Aksesibilitas dan responsivitas

- Semua kontrol fokus keyboard dengan indikator fokus terlihat.
- Target sentuh minimal 44 kali 44 piksel dengan jarak minimal 8 piksel.
- Diuji pada 360 piksel, 768 piksel, dan 1024 piksel ke atas tanpa scroll horizontal halaman.

## 10. Error Handling and Observability Implementation

- Setiap panggilan Supabase memeriksa `error` sebelum memakai `data`.
- Pesan kesalahan ditampilkan dalam Bahasa Indonesia. Tidak ada kesalahan yang ditelan demi terlihat
  sukses.
- Penerapan paket dilakukan sebagai satu urutan tulisan dan diperlakukan sebagai satu unit; bila bagian
  rekam jejak gagal setelah `visits` berubah, sistem harus memberi tahu pengguna dan mencatat kejadian
  tanpa menulis data pasien ke log.
- Tidak ada PII pada log. Hanya pengenal non-sensitif seperti `visit_id` dan `package_id` yang dicatat.

## 11. Security Implementation

- RLS aktif pada ketiga tabel baru.
- Kebijakan mengikuti pola proyek: `CREATE POLICY` untuk akses aplikasi klinik. Pembatasan peran
  pengelolaan paket dilakukan pada kebijakan tulis, sesuai AC-009.4, sehingga penyembunyian tombol pada
  antarmuka bukan satu-satunya kontrol.
- Peran `dokter_admin` dapat membaca paket dan menulis rekam jejak penerapan, tetapi tidak dapat
  menulis definisi paket.
- Tidak ada kunci `service_role` pada kode klien.
- Validasi input nama dan kode paket di sisi form, dengan batasan basis data sebagai lapisan terakhir.

## 12. Testing Strategy

Belum ada runner pengujian yang dikonfigurasi di repositori. Fokus verifikasi pada pemeriksaan tipe,
lint, dan verifikasi manual terstruktur sampai Vitest ditambahkan.

### Unit

- Perhitungan `harga_total` dari daftar item, termasuk qty desimal dan harga nol.
- Perbandingan penerapan ganda berdasarkan rekam jejak.

### Integrasi / kontrak

- Penulisan ke `visits` saat penerapan paket mengisi kolom yang benar tanpa mengubah `biaya_periksa`.
- Penerapan pada pasien `BPJS` tidak mengubah `biaya_periksa` dari nol.

### Architecture-sensitive

- Uji otorisasi: `dokter_admin` tidak dapat menulis definisi paket melalui SDK.
- Uji konsistensi: mengubah harga paket tidak mengubah rekam jejak penerapan lama.
- Uji keandalan: kegagalan rekam jejak tidak boleh menampilkan penerapan sebagai sukses.

### UI

- Daftar paket dan pencarian, termasuk empty state.
- Modal penerapan beserta peringatan penerapan ganda.
- Keterbacaan harga dengan angka tabular.

### Manual / runtime

- Verifikasi responsivitas pada 360 piksel, 768 piksel, dan 1024 piksel ke atas.
- Verifikasi keyboard dan indikator fokus.

## 13. Rollout and Rollback

- Rollout: migrasi aditif diterapkan lebih dulu pada proyek development, diverifikasi, lalu proyek
  produksi. Master paket dibiarkan kosong dan diisi `owner`. Fitur penerapan muncul otomatis dan aman
  ketika belum ada paket, karena alur penagihan manual tetap berjalan.
- Rollback: hentikan penggunaan fitur dengan menyembunyikan entri navigasi. Tabel dapat dibiarkan
  (aditif, tanpa dampak pada modul lama). Tidak ada data lama yang perlu dipulihkan.
- Tidak ada downtime yang diharapkan. Tidak ada perubahan pada kontrak data lama.

## 14. Local Implementation Alternatives

### Alternative A: Satu kolom pada `visits` tanpa rekam jejak

Menambahkan `visits.paket_terapi_id` dan `visits.paket_terapi_items` (JSONB) alih-alih tabel rekam jejak
terpisah, lalu mengandalkan `pendapatan_lain` untuk nilai. Lebih sedikit tabel, tetapi menyimpan snapshot
di kolom `visits` mengotori entitas kunjungan dan menyulitkan audit per paket. Ditolak karena migrasi
`visits` berisiko lebih tinggi daripada tabel baru, dan karena satu kunjungan bisa memuat lebih dari satu
paket (BR-006).

### Alternative B: Menyimpan definisi paket sebagai satu dokumen JSON

Menyimpan seluruh paket dan itemnya pada satu kolom JSONB tanpa tabel item. Mengurangi jumlah tabel,
tetapi menghilangkan batasan kolom (`CHECK`, `FOREIGN KEY`) dan menyulitkan pencarian serta audit harga
per item. Ditolak karena aturan validasi dan integritas data lebih mahal untuk dipertahankan di dalam
JSON.

### Alternative C: Paket hardcoded pada konstanta

Menaruh paket langsung pada `src/constants/clinic.ts` tanpa tabel basis data. Paling cepat dibuat, tetapi
pemilik tidak dapat mengubah paket atau harga sendiri, dan setiap perubahan menuntut deploy ulang.
Ditolak karena bertentangan dengan ASM-005 bahwa pemilik mengelola paket sendiri.

## 15. Architecture / ADR Impact Check

- Perubahan arsitektur: tidak ada perubahan tipe arsitektur. Tetap monolit Next.js App Router dengan
  Supabase client SDK.
- Kontrak publik: tidak ada API publik yang berubah.
- Keputusan yang perlu ADR: tidak ada. Model paket mengikuti keputusan penyimpanan yang sudah ada.
- Dependensi baru: tidak ada.
- Risiko residual: penerapan paket mengubah beberapa kolom `visits` dalam satu urutan tanpa transaksi
  eksplisit. Pada volume satu klinik ini diterima; bila perlu atomik, pindahkan penulisan ke fungsi RPC
  Supabase sebagai tindak lanjut Post-MVP.

## 16. Approval

- Product owner: Client (Klinik Pratama Cikidang Medika), melalui developer
- Status: DRAFT (rencana saja, belum boleh dieksekusi)
- Approved date: Pending
- Notes: Dokumen ini disusun sebagai rencana Post-MVP. Implementasi menunggu persetujuan client atas
  F-012 sesuai requirements Section 15 OQ-001 dan AGENTS.md Section 14.
