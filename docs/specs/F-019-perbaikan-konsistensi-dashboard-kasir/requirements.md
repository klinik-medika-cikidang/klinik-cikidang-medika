---
id: F-019-REQ
title: "Perbaikan Kategori Kunjungan, Konsistensi Dashboard, dan Tunggakan Kasir"
status: draft
owner: Developer
last_updated: 2026-10-28
priority: P1
milestone: Change Request
billing: bugfix (no charge)
---

# F-019: Perbaikan Kategori Kunjungan, Konsistensi Dashboard, dan Tunggakan Kasir

## 1. Executive Summary & Context

Client feedback received on 2026-10-27 (screenshots from the Pemeriksaan Dokter, Dashboard, Program Khusus, and Buku Kas screens) was audited on 2026-10-28. This spec bundles every item classified as a **defect in existing behavior**. The client is not charged for this bundle. Items classified as new features live in F-020 to F-023.

Audit findings that this spec resolves:

1. **ANC category cannot be saved.** `KategoriProgramPanel.tsx` updates `visits.kategori_program`, a column added by `supabase/migrations/20261009_f011_visit_category.sql`. F-011 `tasks.md` records the migration as applied to staging only, and the production list in `docs/context/state.yaml` does not include it. The real database error is also hidden: supabase-js returns `error` as a plain object, not an `Error` instance, so `err instanceof Error` is false and the toast falls back to the generic "Gagal menyimpan kategori kunjungan." The same pattern appears at 27 call sites. Root cause is **probable, not yet verified** against production (no database access during the audit).
2. **Dashboard opens on "Semua Periode".** `src/app/page.tsx` initialises `selectedPeriod` to `'all'`. The client expects "Bulan Ini".
3. **"Pendapatan Umum" disagrees with Laporan and the Excel export.** Three definitions coexist:
   - Dashboard "Pendapatan Umum": UMUM patients only, cash and transfer.
   - Laporan "Total Billing" and Excel `total_biaya`: every settled visit, including extra charges (`pendapatan_lain`) paid by BPJS patients.
   - Buku Kas "Tunai Masuk Laci": cash payments only.
4. **Trend charts ignore the selected period.** The "14 Hari" view takes the last 14 dates that have visits, so under "Bulan Ini" the trend summary shows 145 visits while the KPI card shows 291.
5. **Unpaid visits from earlier days disappear from the cashier.** `src/app/pendaftaran/page.tsx` loads only `tanggal_periksa = today`. Visits left as `Belum Bayar`, `Menunggu Kasir`, `Menunggu Pembayaran`, or `Piutang` on an earlier day cannot be settled anywhere.
6. **Buku Kas totals are not yet proven against DATA.** `docs/data/[DATA] Klinik Cikidang Medika  - REKAMMEDIS.csv` covers visits up to 2026-10-09. Monthly totals in the database have not been reconciled against it since the nominal migration of 2026-10-13.
7. **Fabricated fallback number.** The dashboard shows `patientCount || 4238`, so a failed count query displays an invented figure.
8. **UTC date on Program Khusus.** `src/app/program-khusus/page.tsx` derives "today" with `toISOString()`, which is the previous calendar day before 07:00 WIB.

---

## 2. User Stories & Acceptance Criteria

### User Story 1: Simpan Kategori Program Kunjungan (Dokter)
*As a doctor finishing an examination, I want to save ANC, PTM, KB, or 3 Eliminasi as the visit category, so that program visits can be filtered and reported.*

- **REQ-019-01.1**: The production database SHALL contain the column `visits.kategori_program VARCHAR(30) NOT NULL DEFAULT 'UMUM'` with the check constraint `visits_kategori_program_check`, as defined in `20261009_f011_visit_category.sql`.
- **REQ-019-01.2**: WHEN a doctor selects any category in `KategoriProgramPanel` and presses "Simpan Kategori", THEN the system SHALL persist the value and show the success toast.
- **REQ-019-01.3**: IF a Supabase call fails, THEN the UI SHALL show the database message (`message`, plus `hint` when present) in the toast instead of the generic fallback. The generic fallback SHALL be used only when the error carries no message.
- **REQ-019-01.4**: The error-message extraction SHALL be one shared helper used by every call site that currently uses `err instanceof Error ? err.message : '<fallback>'`.
- **REQ-019-01.5**: The "Kategori Program" filter on `/laporan` SHALL work in production for every category value.

### User Story 2: Dashboard Dibuka pada Bulan Ini (Owner)
- **REQ-019-02.1**: WHEN `/` is opened, THEN the selected period SHALL be "Bulan Ini" (`this_month`).
- **REQ-019-02.2**: The other presets ("Bulan Lalu", "Tahun", "Semua Periode", "Kustom") SHALL remain selectable without other changes.

### User Story 3: Satu Definisi Pendapatan (Owner)
*As the owner, I want the revenue figure on the Dashboard to match Laporan and the Excel export for the same period, so that I can trust every screen.*

- **REQ-019-03.1**: Cashier revenue for a visit SHALL be computed by one shared function: `0` IF the visit is not settled (`isSettledVisit`), ELSE `biaya_periksa` (0 for BPJS) plus `pendapatan_lain`.
- **REQ-019-03.2**: For the same date range, the Dashboard revenue card SHALL equal the Laporan "Total Billing" KPI AND the sum of `total_biaya` in the Excel visit sheet.
- **REQ-019-03.3**: The Dashboard card label SHALL state what it contains ("Pendapatan Kasir", covering UMUM fees and extra charges from BPJS patients). The Kapitasi BPJS card SHALL stay separate.
- **REQ-019-03.4**: Buku Kas "Tunai Masuk Laci" SHALL keep its cash-only definition and SHALL carry a caption stating that transfer payments are excluded, so that the difference with the Dashboard is explained on screen.

### User Story 4: Tren Mengikuti Periode (Owner)
- **REQ-019-04.1**: WHEN the daily view is active, THEN the visit and financial trend charts SHALL plot every calendar day of the selected period up to and including today, including days with zero activity. Days after today SHALL NOT be plotted, so that they are not read as days without activity. For "Semua Periode", the plotted month is the month of the latest visit.
- **REQ-019-04.2**: IF the selected period spans more than 31 days, THEN the daily view SHALL plot the calendar days of the last month inside that period.
- **REQ-019-04.3**: The daily toggle label SHALL describe the plotted range ("Harian" with the month name), not "14 Hari".
- **REQ-019-04.4**: WHEN the period is "Bulan Ini", THEN the trend summary tiles (Total Kunjungan, Pasien BPJS, Pasien Umum, Kas Masuk, Pengeluaran) SHALL equal the KPI cards for the same month.
- **REQ-019-04.5**: On viewports below 768px, a 31-bar chart SHALL scroll horizontally inside its own wrapper without causing page-level horizontal scroll.

### User Story 5: Tunggakan Kasir dari Hari Sebelumnya (Kasir)
*As a cashier, I want to see unpaid visits from previous days, so that a patient who pays a day later can be settled.*

- **REQ-019-05.1**: The cashier queue SHALL include visits from the previous `KASIR_CARRY_OVER_DAYS` days (constant in `src/constants/clinic.ts`, default 30) whose `status_pembayaran` is `Belum Bayar`, `Menunggu Kasir`, `Menunggu Pembayaran`, or `Piutang`.
- **REQ-019-05.2**: A carried-over visit SHALL show a visible "Tunggakan" badge with its examination date.
- **REQ-019-05.3**: WHEN a carried-over visit is settled, THEN the payment SHALL be saved on that visit row exactly as same-day payments are, and the visit SHALL leave the queue.
- **REQ-019-05.4**: Today's queue KPIs (total visits today, waiting for doctor) SHALL count only today's visits. The "menunggu bayar" count SHALL include carried-over visits.
- **REQ-019-05.5**: Revenue of a carried-over visit SHALL CONTINUE TO be reported on its `tanggal_periksa`. Booking revenue on the payment date is F-021.

### User Story 6: Buku Kas Cocok dengan DATA (Owner)
- **REQ-019-06.1**: A read-only audit script SHALL compare, per month from the first CSV month up to 2026-10-09, the database totals against the REKAMMEDIS CSV for: visit count, cashier revenue (`Pendapatan` + `Pendpatan lain`), clinic expenses, non-clinic expenses, and cash deposits (`SETOR TUNAI`).
- **REQ-019-06.2**: The script SHALL NOT write to any table and SHALL NOT print patient identity fields.
- **REQ-019-06.3**: Every month with a non-zero difference SHALL be listed with the differing rows' visit dates and amounts, and SHALL become a follow-up defect in this spec before F-019 closes.

### User Story 7: Tidak Ada Angka Karangan dan Tanggal Lokal
- **REQ-019-07.1**: IF the patient count query fails or returns null, THEN the dashboard SHALL show "-" and SHALL NOT show a hardcoded number.
- **REQ-019-08.1**: Program Khusus SHALL derive "today" with `formatLocalDateToYMD()` so that agenda counts follow the WIB calendar date.

---

## 3. Non-Regression Invariants

1. **INV-019-1**: Existing visit, payment, and cash-flow rows SHALL NOT be modified by this spec. The only schema change is promoting the existing F-011 migration, which is additive.
2. **INV-019-2**: Buku Kas drawer reconciliation (`summarizeCashPosition`, `isDrawerCashExpense`) SHALL CONTINUE TO produce the same values for the same inputs.
3. **INV-019-3**: Cancelled visits (`Batal`) SHALL CONTINUE TO be excluded from every count and total.
4. **INV-019-4**: `dokter_admin` access limits from F-011 SHALL CONTINUE TO apply to the cashier queue and reports.
5. **INV-019-5**: Every changed screen SHALL stay responsive at 360px, 768px, and 1024px+ with no page-level horizontal scroll.

## 4. Out of Scope

- Revenue booked on the payment date (F-021).
- Clinic vs non-clinic expense recap (F-020).
- Active-only Program Khusus view (F-022).
- Drawer opening balance (F-023).
- Whether `Piutang` revenue should be counted before it is paid. This is noted for F-021 and not changed here.
