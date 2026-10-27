---
id: F-023-REQ
title: "Saldo Awal Laci Kasir"
status: draft
owner: Developer
last_updated: 2026-10-28
priority: P2
milestone: Change Request
billing: new feature (charged)
---

# F-023: Saldo Awal Laci Kasir

## 1. Executive Summary & Context

On 2026-10-27 Buku Kas showed "Sisa Fisik di Laci Kasir: - Rp 3.423.000" for the cumulative October view, with the warning "Setoran Melebihi Kas Masuk Periode Ini". The formula from F-018 is:

```text
Sisa Fisik = Tunai Masuk Laci − Pengeluaran Tunai Laci − Setoran ke Pemilik/Bank
```

Every month starts from zero. Cash that stayed in the drawer at the end of September and was deposited in October therefore appears as a deficit in October. The arithmetic is correct for the model F-018 defined; the model has no opening balance. Adding one is a new capability.

## 2. User Stories & Acceptance Criteria

### User Story 1: Catat Saldo Awal (Owner)
*As the owner, I want to record the physical cash counted in the drawer at the start of a month, so that the drawer balance continues from real cash on hand.*

- **REQ-023-01.1**: The system SHALL store at most one opening balance per month (`periode` = first day of the month) with a non-negative amount and an optional note.
- **REQ-023-01.2**: Only the `owner` role SHALL see the control to add or edit an opening balance in Buku Kas.
- **REQ-023-01.3**: The table SHALL have RLS enabled. Reads and writes SHALL require an authenticated session.

### User Story 2: Saldo Berlanjut Antar Bulan (Owner / Kasir)
- **REQ-023-02.1**: The monthly drawer balance SHALL be `Saldo Awal + Tunai Masuk Laci − Pengeluaran Tunai Laci − Setoran`.
- **REQ-023-02.2**: IF a month has a recorded opening balance, THEN that value SHALL be its Saldo Awal.
- **REQ-023-02.3**: IF a month has no recorded opening balance, THEN its Saldo Awal SHALL be the closing balance of the previous month, computed back to the latest month that has a recorded opening balance.
- **REQ-023-02.4**: IF no month up to the selected one has a recorded opening balance, THEN Saldo Awal SHALL be 0 AND the card SHALL show "Saldo awal belum diisi" with the add control for the owner.
- **REQ-023-02.5**: In the per-date view, Saldo Awal SHALL be the month's Saldo Awal plus all drawer movements from the first day of the month up to the day before the selected date.
- **REQ-023-02.6**: The Reconciliation card SHALL show Saldo Awal as its own line before Tunai Masuk Laci.

### User Story 3: Dashboard Konsisten
- **REQ-023-03.1**: The Dashboard liquidity card SHALL use the same drawer balance for "Bulan Ini".

## 3. Non-Regression Invariants

1. **INV-023-1**: For a month whose Saldo Awal resolves to 0, the drawer balance SHALL equal the current F-018 value.
2. **INV-023-2**: Operational expenses, net income, and deposit totals SHALL NOT change; Saldo Awal affects only the physical drawer balance.
3. **INV-023-3**: The migration SHALL be additive and append-only, and SHALL NOT modify `cash_flows` or `visits`.
4. **INV-023-4**: The changed card SHALL stay responsive at 360px, 768px, and 1024px+.

## 4. Out of Scope

- Daily cash-count (stock opname) logs.
- Automatic correction of past months.

## 5. Related

- If F-021 is approved, drawer cash follows the payment date; Saldo Awal applies on top of it unchanged.
