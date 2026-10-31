---
id: F-024-DESIGN
title: "Technical Design: F-024 Isian UK dan TP"
status: draft
owner: Developer
last_updated: 2026-10-31
---

# Technical Design — F-024

UI and a pure helper only. No schema change.

## Helper: `src/lib/pregnancy.ts`

- `estimateDueDate(examYmd, weeks, days = 0)`: returns `YYYY-MM-DD`, or null when the date or UK is invalid (weeks outside 1 to 42, days outside 0 to 6, non-integers). Date math in UTC so the result does not shift with the browser time zone.
- `formatGestationalAge(weeks, days)`: `"33 minggu"` or `"33 minggu 3 hari"`.
- `formatDueDate(ymd)`: `YYYY-MM-DD` to `dd/mm/yyyy`.
- `isPlausibleDueDate(examYmd, dueYmd)`: true when the due date is between 20 days before and 280 days after the exam date.

Check against the clinic's ultrasound on 2026-10-27: UK 33 weeks 3 days gives 2026-12-12, equal to the Mindray EDD for that measurement.

## Form: `NewPublicHealthModal`

- State `ukWeeks`, `ukDays`, `tpManual`, `tpEdited`. No effect: `computedTp` is derived from `tanggalPeriksa` and UK on every render, and the TP input shows `tpEdited ? tpManual : computedTp`.
- Typing in TP sets `tpManual` and `tpEdited`. "Hitung dari UK" clears `tpEdited`, so the computed date shows again.
- Validation before insert: days without weeks; weeks outside 1 to 42 or days above 6; TP outside `isPlausibleDueDate`. Errors are linked to the inputs with `aria-invalid` and `aria-describedby`.
- Insert writes `uk` and `tp` only for ANC and ELIMINASI_3, so a value typed before switching to PTM or KB is dropped.

## List: `PublicHealthRegistry`

- ANC and 3 Eliminasi cells show `UK ... • TP ...` under GPA when present.
- The registry Excel download (`PUBLIC_HEALTH_SHEET_CONFIG` in `src/lib/excel.ts`) gets UK and TP columns after GPA on the ANC and 3 Eliminasi sheets.
