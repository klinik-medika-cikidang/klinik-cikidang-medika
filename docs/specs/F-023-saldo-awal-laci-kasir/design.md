---
id: F-023-DESIGN
title: "Technical Design: F-023 Saldo Awal Laci Kasir"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Technical Design — F-023

Adds one small table and changes one computation. Data-model and security decisions are recorded here instead of a separate `system-architecture.md`.

## 1. Schema

New migration `supabase/migrations/<ts>_f023_cash_drawer_openings.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.cash_drawer_openings (
  periode DATE PRIMARY KEY CHECK (EXTRACT(DAY FROM periode) = 1),
  nominal NUMERIC(15,2) NOT NULL CHECK (nominal >= 0),
  catatan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_drawer_openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses terautentikasi - cash_drawer_openings"
  ON public.cash_drawer_openings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

Risk **R-023-1**: owner-only writing is enforced in the UI, as with the other owner-only screens today. Enforcing it in RLS needs the role in `app_metadata` (not user-editable `user_metadata`). That is a project-wide security item and is not changed here.

## 2. Computation

```typescript
// Pure function so it can be tested without Supabase.
export function resolveDrawerOpening(params: {
  month: string;                         // 'YYYY-MM-01'
  openings: Record<string, number>;      // periode -> nominal, months <= month
  monthlyNet: Record<string, number>;    // periode -> cashIn - drawerExpenses - deposits
}): { saldoAwal: number; source: 'recorded' | 'carried' | 'missing' };
```

- Find the latest recorded opening `P <= month`. IF none, return `{ 0, 'missing' }`.
- `saldoAwal = openings[P] + Σ monthlyNet[m]` for `P <= m < month`.
- `monthlyNet` for the months between `P` and the selected month is loaded with the same drawer rules as today (`isSettledCashVisit`, `isDrawerCashExpense`, `isCashHandoverToOwnerOrBank`). The query range is `P` to the end of the selected month.

## 3. Component Inventory

| File | Change |
|---|---|
| `src/types/database.ts` | `CashDrawerOpening` |
| `src/lib/utils.ts`, `src/lib/utils.test.ts` | `resolveDrawerOpening`, `saldoAwal` input in `summarizeCashPosition` (default 0) |
| `src/app/buku-kas/page.tsx` | Load openings and the carry range; pass Saldo Awal for month and per-date mode |
| `src/components/buku-kas/CashReconciliationCard.tsx` | "Saldo Awal" line, "belum diisi" state |
| `src/components/buku-kas/DrawerOpeningModal.tsx` (new) | Owner form built from `Modal`, `Input`, `Button` primitives |
| `src/app/page.tsx` | Liquidity card uses the same Saldo Awal for "Bulan Ini" |

## 4. Test Plan

- Unit: recorded month, carried month, gap of two months, no opening at all, per-date carry inside a month.
- Staging: record an opening for October 2026 and confirm the drawer balance changes by exactly that amount.
- Regression: a month with no openings anywhere equals the current F-018 value (INV-023-1).
- Responsive: card and modal at 360px, 768px, 1024px.
