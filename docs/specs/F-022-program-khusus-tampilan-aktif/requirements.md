---
id: F-022-REQ
title: "Tampilan Pasien Aktif pada Program Khusus"
status: draft
owner: Developer
last_updated: 2026-10-28
priority: P2
milestone: Change Request
billing: new feature (charged)
---

# F-022: Tampilan Pasien Aktif pada Program Khusus

## 1. Executive Summary & Context

The client asked that Program Khusus show only patients who are currently active in Kartu Kendali TBC, Sirkumsisi, and Agenda Observasi. Program Kesehatan stays as it is.

Today `src/app/program-khusus/page.tsx` loads every row of each register and computes the KPI cards over all of them. Example from the 2026-10-27 screenshot: "46 Tindakan, 46 Tunggu Foto", while all 46 rows are imported history from the SUNAT sheet, which never had photos. The current behavior matches the F-006 contract, so this is a change of behavior, not a defect.

## 2. User Stories & Acceptance Criteria

### User Story 1: Default Hanya Pasien Aktif (Dokter / Owner)
- **REQ-022-01.1**: Kartu Kendali TBC, Sirkumsisi, and Agenda Observasi SHALL open in an "Aktif" view by default.
- **REQ-022-01.2**: Each of the three tabs SHALL offer a "Semua" toggle that restores the full register, including the existing filters.
- **REQ-022-01.3**: Program Kesehatan SHALL NOT change.

### User Story 2: Definisi Aktif
- **REQ-022-02.1**: A TBC patient SHALL be active WHEN `status_tbc` is `Dalam Pengobatan` or `Mangkir`.
- **REQ-022-02.2**: A circumcision SHALL be active WHEN `tanggal_tindakan` is within the last `SIRKUMSISI_ACTIVE_DAYS` days (constant in `src/constants/clinic.ts`, default 14, covering the H+7 control). Rows with a null `tanggal_tindakan` SHALL NOT be active.
- **REQ-022-02.3**: An observation agenda item SHALL be active WHEN `status_kontrol` is `Menunggu` or `Mangkir`.

### User Story 3: KPI Mengikuti Pasien Aktif
- **REQ-022-03.1**: The three KPI cards and the tab counters SHALL count active rows only, and each card SHALL state that it counts active patients.
- **REQ-022-03.2**: The "Tunggu Foto" counter SHALL count only active circumcisions without a follow-up photo.
- **REQ-022-03.3**: The dashboard "Perhatian Klinis" banner SHALL use the same active definitions so that its numbers match Program Khusus.

## 3. Non-Regression Invariants

1. **INV-022-1**: No register row SHALL be deleted, hidden in the database, or modified.
2. **INV-022-2**: Search, the existing TBC and circumcision filters, edit, print, and photo upload SHALL CONTINUE TO work in the "Semua" view.
3. **INV-022-3**: The Program Kesehatan Excel export (`exportPublicHealthToExcel`) SHALL NOT change.
4. **INV-022-4**: All changed views SHALL stay responsive at 360px, 768px, and 1024px+.

## 4. Out of Scope

- Changes to Program Kesehatan (PTM, ANC, KB, 3 Eliminasi).
- Filling in missing procedure dates for imported circumcision rows.
