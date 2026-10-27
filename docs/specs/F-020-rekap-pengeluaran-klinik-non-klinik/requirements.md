---
id: F-020-REQ
title: "Rekap Pengeluaran Klinik dan Non Klinik"
status: draft
owner: Developer
last_updated: 2026-10-28
priority: P2
milestone: Change Request
billing: new feature (charged)
---

# F-020: Rekap Pengeluaran Klinik dan Non Klinik

## 1. Executive Summary & Context

The client asked that totals "klinik atau non klinik" be shown and kept in line with DATA. In the clinic's Google Sheet, the ANALISA tab has a "PENGELUARAN TOTAL" pivot with the columns Year, Month, KLINIK, NON KLINIK, TOTAL, fed by the REKAMMEDIS columns "Pengeluaran Klinik" and "Pengeluaran non klinik".

The application stores the split already: the F-005 migration maps "Pengeluaran Klinik" to `Pengeluaran Obat / Operasional` and "Pengeluaran non klinik" to `Pengeluaran Non Klinik` (`scripts/lib/clinic-map.mjs`). No screen or export shows the two totals side by side. This spec adds that recap. It is a new reporting capability, not a defect.

**Assumption A-020-1**: "Non Klinik" means the category `Pengeluaran Non Klinik`. Every other operational expense category counts as "Klinik". Cash handovers (`Setor Tunai`, `Setor ke Rekening Pemilik`) are neither, consistent with F-018.

## 2. User Stories & Acceptance Criteria

### User Story 1: Pisahkan Pengeluaran Klinik dan Non Klinik (Owner)
*As the owner, I want every expense total split into Klinik and Non Klinik, so that I can see clinic operating cost apart from non-clinic spending, as in the Google Sheet.*

- **REQ-020-01.1**: A shared function SHALL classify each cash flow as `klinik`, `non_klinik`, or `null`. It SHALL return `non_klinik` for `Pengeluaran Non Klinik`, `klinik` for every other row where `isOperationalExpense` is true, and `null` otherwise.
- **REQ-020-01.2**: The Dashboard "Total Pengeluaran" card SHALL show the Klinik and Non Klinik subtotals for the selected period, and the two SHALL add up to the card total.
- **REQ-020-01.3**: The Buku Kas "Pengeluaran Operasional" card SHALL show the same two subtotals for the selected month.
- **REQ-020-01.4**: The Laporan KPI row SHALL show the same two subtotals for the active filter.

### User Story 2: Rekap Bulanan seperti Sheet ANALISA (Owner)
- **REQ-020-02.1**: Laporan SHALL provide a monthly recap table with columns Tahun, Bulan, Klinik, Non Klinik, Total for the active date range.
- **REQ-020-02.2**: The full Excel workbook SHALL include a sheet "Rekap Pengeluaran" with the same columns and one row per month.
- **REQ-020-02.3**: For every month up to 2026-10-09, the recap SHALL equal the CSV sums of "Pengeluaran Klinik" and "Pengeluaran non klinik" (after the F-019 audit has resolved any differences).

### User Story 3: Input yang Jelas (Kasir / Owner)
- **REQ-020-03.1**: The "Kas Keluar" form SHALL group expense categories under "Klinik" and "Non Klinik" headings so that staff pick the right side when entering a new expense.

## 3. Non-Regression Invariants

1. **INV-020-1**: Total operational expenses SHALL CONTINUE TO equal the current figure on Dashboard, Buku Kas, and Laporan.
2. **INV-020-2**: Drawer reconciliation and `Setor` handling from F-018 SHALL NOT change.
3. **INV-020-3**: No schema change and no change to stored cash-flow rows.
4. **INV-020-4**: All changed screens SHALL stay responsive at 360px, 768px, and 1024px+.

## 4. Out of Scope

- A Klinik / Non Klinik split for revenue. The source sheet has no such split.
- Re-categorising historical rows.
