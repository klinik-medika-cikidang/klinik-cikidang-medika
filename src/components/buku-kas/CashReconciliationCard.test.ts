import { describe, expect, it } from 'vitest';
import {
  resolveReconciliationView,
  type DrawerOpeningView,
  type DrawerReconciliationMetrics,
} from './CashReconciliationCard';

const metrics = (over: Partial<DrawerReconciliationMetrics> = {}): DrawerReconciliationMetrics => ({
  cashVisitsTotal: 0,
  cashVisitsCount: 0,
  cashExpensesTotal: 0,
  cashExpensesCount: 0,
  cashDepositsTotal: 0,
  cashDepositsCount: 0,
  ...over,
});

const opening = (over: Partial<DrawerOpeningView> = {}): DrawerOpeningView => ({
  monthly: 500_000,
  daily: 650_000,
  source: 'recorded',
  fromPeriode: '2026-10-01',
  ...over,
});

describe('resolveReconciliationView', () => {
  it('treats a null opening without an error as loading, not as an unfilled month', () => {
    const view = resolveReconciliationView({
      opening: null,
      scope: 'monthly',
      active: metrics({ cashDepositsTotal: 300_000 }),
    });
    expect(view.openingStatus).toBe('loading');
    expect(view.saldoAwal).toBeNull();
    expect(view.remaining).toBeNull();
    expect(view.balance).toBe('unknown');
  });

  it('reports a failed load and never computes a deficit from Rp 0', () => {
    const view = resolveReconciliationView({
      opening: null,
      openingError: 'Gagal memuat saldo awal laci kasir: timeout',
      scope: 'monthly',
      active: metrics({ cashDepositsTotal: 300_000 }),
    });
    expect(view.openingStatus).toBe('error');
    expect(view.balance).toBe('unknown');
  });

  it('keeps Belum diisi only for a month that truly has no opening', () => {
    const view = resolveReconciliationView({
      opening: opening({ monthly: 0, daily: 0, source: 'missing', fromPeriode: null }),
      scope: 'monthly',
      active: metrics({ cashDepositsTotal: 300_000 }),
    });
    expect(view.openingStatus).toBe('missing');
    expect(view.remaining).toBe(-300_000);
    expect(view.balance).toBe('deficit');
  });

  it('hides the remaining cash while the month movements are still loading', () => {
    const view = resolveReconciliationView({
      opening: opening(),
      isLoading: true,
      scope: 'monthly',
      active: metrics({ cashVisitsTotal: 1_000_000 }),
    });
    expect(view.saldoAwal).toBe(500_000);
    expect(view.remaining).toBeNull();
    expect(view.balance).toBe('unknown');
  });

  it('computes nothing when the month movements failed to load', () => {
    for (const scope of ['monthly', 'daily'] as const) {
      const view = resolveReconciliationView({
        opening: opening(),
        movementsError: 'Gagal memuat mutasi buku kas dari database.',
        scope,
        active: metrics({ cashVisitsTotal: 1_000_000 }),
      });
      expect(view.remaining).toBeNull();
      expect(view.balance).toBe('unknown');
    }
  });

  it('waits for the movements before showing the per-date opening', () => {
    const view = resolveReconciliationView({
      opening: opening(),
      isLoading: true,
      scope: 'daily',
      active: metrics(),
    });
    expect(view.saldoAwal).toBeNull();
  });

  it('computes the remaining cash from the opening of the active scope', () => {
    const active = metrics({ cashVisitsTotal: 200_000, cashExpensesTotal: 50_000, cashDepositsTotal: 100_000 });
    expect(resolveReconciliationView({ opening: opening(), scope: 'monthly', active })).toMatchObject({
      saldoAwal: 500_000,
      remaining: 550_000,
      balance: 'remaining',
    });
    expect(resolveReconciliationView({ opening: opening(), scope: 'daily', active })).toMatchObject({
      saldoAwal: 650_000,
      remaining: 700_000,
    });
  });

  it('separates a balanced drawer from a month with no movement', () => {
    const empty = resolveReconciliationView({
      opening: opening({ monthly: 0 }),
      scope: 'monthly',
      active: metrics(),
    });
    expect(empty.balance).toBe('empty');

    const balanced = resolveReconciliationView({
      opening: opening({ monthly: 100_000 }),
      scope: 'monthly',
      active: metrics({ cashDepositsTotal: 100_000 }),
    });
    expect(balanced.balance).toBe('balanced');
  });
});
