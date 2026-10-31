---
id: F-024-REQ
title: "Isian Usia Kehamilan (UK) dan Taksiran Persalinan (TP) pada Register ANC"
status: draft
owner: Developer
last_updated: 2026-10-31
priority: P2
milestone: Change Request
billing: "manual UK/TP inputs: fix (no charge); automatic TP: small addition, agreed with the user to include"
---

# F-024: Isian UK dan TP pada Register ANC dan 3 Eliminasi

## 1. Context

On 2026-10-31 the clinic asked where to fill "TP" (taksiran persalinan), and said an automatic value is fine. Audit of the code and the old production database the same day:

- `public_health_records.uk` and `.tp` (VARCHAR(30), F-009 migration) exist, and Laporan Puskesmas and its Excel show both columns for ANC and 3 Eliminasi (F-015).
- No form fills them. `NewPublicHealthModal` has GPA, HbSAg, HIV and Sifilis only. On old production, 0 of 628 ANC rows have UK or TP; the 27 filled TP values on 3 Eliminasi rows all come from the sheet import (format `dd/mm/yyyy`, UK such as `28 minggu`).
- Doctors type UK inside the GPA field (`G2P1A0 H 39 MGG`).

Classification: a report column with no input path is incomplete delivery of F-015, so the manual inputs are a fix. The automatic TP is a small addition the user chose to include.

## 2. Requirements

- **REQ-024-01**: For ANC and 3 Eliminasi, the register form SHALL offer UK as whole weeks (required range 1 to 42 when filled) plus optional days (0 to 6), and TP as a date.
- **REQ-024-02**: WHEN UK is filled and the user has not edited TP by hand, TP SHALL be set to tanggal periksa + (280 - (weeks x 7 + days)) days (Naegele, 40 weeks).
- **REQ-024-03**: WHEN the user edits TP by hand (for example from the ultrasound EDD), later UK or tanggal periksa changes SHALL NOT overwrite it. A control SHALL let the user return to the computed value.
- **REQ-024-04**: The record SHALL store UK as text `"{w} minggu"` or `"{w} minggu {d} hari"` and TP as `dd/mm/yyyy`, the format of the imported sheet rows, so Laporan Puskesmas and Excel show old and new rows alike.
- **REQ-024-05**: Both fields SHALL be optional. Other programs SHALL NOT store UK or TP.
- **REQ-024-06**: The Program Kesehatan list SHALL show UK and TP next to GPA when present.
- **REQ-024-07**: The Program Kesehatan Excel download SHALL include UK and TP columns on the ANC and 3 Eliminasi sheets (Laporan Puskesmas already has them).
- **REQ-024-08**: A hand-typed TP SHALL be rejected when it is not between 20 days before and 280 days after tanggal periksa (the range UK 42w6d to 0 weeks can produce), so a mistyped year cannot be saved.

## 3. Non-Regression Invariants

- **INV-024-1**: No migration. No existing row is changed, including UK text that doctors typed inside GPA.
- **INV-024-2**: GPA, HbSAg, HIV, Sifilis, PTM and KB inputs keep their behavior.

## 4. Out of Scope

- Editing a saved register row (no edit flow exists today), so rows saved before this change keep UK and TP empty.
- Computing TP from HPHT (first day of last menstrual period).
