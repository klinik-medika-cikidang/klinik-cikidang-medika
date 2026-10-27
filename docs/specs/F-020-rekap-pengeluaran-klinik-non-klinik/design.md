---
id: F-020-DESIGN
title: "Technical Design: F-020 Rekap Pengeluaran Klinik dan Non Klinik"
status: draft
owner: Developer
last_updated: 2026-10-28
---

# Technical Design — F-020

Read-only aggregation over existing `cash_flows` rows. No schema change, so `system-architecture.md` is omitted.

## 1. Component Inventory

| File | Change |
|---|---|
| `src/lib/utils.ts`, `src/lib/utils.test.ts` | `getExpenseScope`, `summarizeExpensesByScope`, `groupExpensesByMonth` |
| `src/constants/clinic.ts` | `EXPENSE_SCOPE_LABELS`, grouped `CASH_FLOW_CATEGORIES.keluar` for the form |
| `src/app/page.tsx`, `src/components/dashboard/DashboardKpiCards.tsx` | Subtotals on "Total Pengeluaran" |
| `src/app/buku-kas/page.tsx`, `src/components/buku-kas/CashFlowSummaryCards.tsx` | Subtotals on "Pengeluaran Operasional" |
| `src/app/laporan/page.tsx`, `src/components/laporan/ReportKpis.tsx` | Subtotals and monthly recap table |
| `src/lib/excel.ts` | "Rekap Pengeluaran" sheet in `exportFullClinicWorkbook` |
| `src/components/buku-kas/AddCashFlowModal.tsx` | Grouped category options |

## 2. Detailed Design

```typescript
export type ExpenseScope = 'klinik' | 'non_klinik';

export function getExpenseScope(flow: { jenis?: string | null; kategori?: string | null }): ExpenseScope | null {
  if (!isOperationalExpense(flow)) return null;
  return flow.kategori === 'Pengeluaran Non Klinik' ? 'non_klinik' : 'klinik';
}

export function summarizeExpensesByScope(flows: CashFlowLike[]): { klinik: number; nonKlinik: number; total: number };

export function groupExpensesByMonth(flows: CashFlowLike[]): Array<{
  year: number; month: number; klinik: number; nonKlinik: number; total: number;
}>;
```

- Every surface builds its subtotal from `summarizeExpensesByScope` over the flows it already loads, so INV-020-1 holds by construction.
- Months with no expense rows inside the range still appear with zeros in the recap and Excel sheet, matching the pivot layout of the source sheet.
- Laporan monthly recap renders as a table inside an `overflow-x-auto` wrapper; currency cells use tabular numbers.

## 3. Test Plan

- Unit: scope classification for each category in `CASH_FLOW_CATEGORIES.keluar`, `Setor` rows, and `Masuk` rows; monthly grouping across a year boundary.
- Data check: recap for 2026-01 to 2026-09 against the CSV sums produced by the F-019 audit script.
- Responsive: 360px, 768px, 1024px on the three changed screens.
