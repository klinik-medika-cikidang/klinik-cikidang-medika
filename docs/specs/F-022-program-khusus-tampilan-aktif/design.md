---
id: F-022-DESIGN
title: "Technical Design: F-022 Tampilan Pasien Aktif pada Program Khusus"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Technical Design — F-022

Client-side filtering over data that is already loaded. No schema change, so `system-architecture.md` is omitted.

## 1. Component Inventory

| File | Change |
|---|---|
| `src/constants/clinic.ts` | `SIRKUMSISI_ACTIVE_DAYS = 14` |
| `src/lib/program-status.ts` (new), `src/lib/program-status.test.ts` | `isActiveTbc`, `isActiveCircumcision`, `isActivePostCare` |
| `src/app/program-khusus/page.tsx` | `viewScope` state per tab, KPI and counters over active rows |
| `src/components/program-khusus/ProgramKhususKpis.tsx` | "Aktif" wording on cards |
| `src/components/program-khusus/TbcControlCard.tsx`, `CircumcisionList.tsx`, `PostCareAgenda.tsx` | Render the scoped list; empty state text for "no active patients" |
| `src/app/page.tsx` | Clinical alert counts reuse the same helpers |

## 2. Detailed Design

```typescript
export function isActiveTbc(t: Pick<TbcProgram, 'status_tbc'>): boolean {
  return t.status_tbc === 'Dalam Pengobatan' || t.status_tbc === 'Mangkir';
}

export function isActiveCircumcision(c: Pick<Circumcision, 'tanggal_tindakan'>, today: string): boolean {
  if (!c.tanggal_tindakan) return false;
  return c.tanggal_tindakan >= addDays(today, -SIRKUMSISI_ACTIVE_DAYS);
}

export function isActivePostCare(p: Pick<PostCare, 'status_kontrol'>): boolean {
  return p.status_kontrol !== 'Sudah Kontrol';
}
```

- `today` comes from `formatLocalDateToYMD()` (fixed in F-019).
- `viewScope: Record<'tbc' | 'sirkumsisi' | 'observasi', 'aktif' | 'semua'>`, default `'aktif'` for all three. The toggle uses the existing `tabs.tsx` primitive from `src/components/ui/` as a two-option control, with 44px touch targets.
- Existing filters (`tbcFilter`, `circFilter`) apply after the scope filter.
- Dashboard alert `recentCircumcision` already counts the last 7 days; it switches to `isActiveCircumcision` so both screens agree.

## 3. Test Plan

- Unit: each helper at boundary dates (day 14 vs day 15), null procedure date, every `status_tbc` and `status_kontrol` value.
- Manual: counts on staging match a direct count of active rows; "Semua" shows the same totals as before the change.
- Responsive: the scope toggle and lists at 360px, 768px, 1024px.
