---
id: F-021-REQ
title: "Pencatatan Tanggal Bayar Pasien"
status: draft
owner: Developer
last_updated: 2026-10-28
priority: P1
milestone: Change Request
billing: new feature (charged)
---

# F-021: Pencatatan Tanggal Bayar Pasien

## 1. Executive Summary & Context

The client asked how to handle a patient who is registered one day, is not discharged that day, and pays the next day. F-019 makes the unpaid visit visible again in the cashier queue. That alone still books the money on the examination date (`tanggal_periksa`), because the schema has no payment date. The result:

- Today's drawer reconciliation misses cash that physically entered the drawer today.
- The earlier day shows revenue that had not been received on that day.

This spec adds a payment date and moves every cash and revenue figure to it. Visit counts, morbidity, and program registers stay on the examination date. It is a new capability with a schema change, not a defect.

Related observation: `Piutang` is not in `UNSETTLED_PAYMENT_STATUSES`, so the full bill of a partially paid visit is counted as revenue on the examination date. This spec records the received amount per payment date so that the drawer reflects cash actually received.

## 2. User Stories & Acceptance Criteria

### User Story 1: Simpan Tanggal Bayar (Kasir)
- **REQ-021-01.1**: The `visits` table SHALL have a nullable column `tanggal_bayar DATE`.
- **REQ-021-01.2**: WHEN a cashier settles a visit (Lunas, Piutang, or free visit), THEN `tanggal_bayar` SHALL be set to the current WIB date.
- **REQ-021-01.3**: WHEN a `Piutang` visit is paid off on a later day, THEN `tanggal_bayar` SHALL be updated to the payoff date and the paid-off amount SHALL be recorded for that date.
- **REQ-021-01.4**: Visits settled before this change SHALL keep `tanggal_bayar` null and SHALL be treated as paid on `tanggal_periksa` (no backfill of historical rows).

### User Story 2: Kas Mengikuti Tanggal Bayar (Owner / Kasir)
- **REQ-021-02.1**: Cashier revenue on Dashboard, Laporan, Excel, and Buku Kas SHALL be grouped and filtered by the cash date `COALESCE(tanggal_bayar, tanggal_periksa)`.
- **REQ-021-02.2**: Buku Kas "Tunai Masuk Laci", in both the monthly and the per-date mode, SHALL use the cash date.
- **REQ-021-02.3**: Visit counts, ICD-10 morbidity, village distribution, and program registers SHALL CONTINUE TO use `tanggal_periksa`.
- **REQ-021-02.4**: The receipt SHALL print both the examination date and the payment date when they differ.

### User Story 3: Laporan Pembayaran Tertunda (Owner)
- **REQ-021-03.1**: The Excel visit sheet SHALL include a "Tanggal Bayar" column.
- **REQ-021-03.2**: Laporan SHALL let the owner list visits whose payment date differs from the examination date for the active range.

## 3. Non-Regression Invariants

1. **INV-021-1**: For every day where all visits were paid on the same day, Dashboard, Laporan, and Buku Kas totals SHALL equal the values before this change.
2. **INV-021-2**: No existing row SHALL be updated by the migration.
3. **INV-021-3**: RLS on `visits` and on any new view SHALL keep the access rules of F-011.
4. **INV-021-4**: The migration SHALL be additive and append-only in `supabase/migrations/`.

## 4. Out of Scope

- Inpatient or overnight-stay workflow (beds, discharge). The system stays an outpatient system.
- Splitting one visit into several partial-payment records beyond a single piutang payoff.
