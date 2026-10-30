import { describe, expect, it } from 'vitest';
import { describeDrawerEstimate } from './CashLiquidityCard';

describe('describeDrawerEstimate', () => {
  it('names Saldo Awal when the estimate starts from it', () => {
    expect(describeDrawerEstimate(150000, true)).toBe(
      'Saldo awal + tunai pasien dikurangi pengeluaran & setoran'
    );
  });

  it('explains a deficit against Saldo Awal plus cash received', () => {
    expect(describeDrawerEstimate(-50000, true)).toBe(
      'Setoran dan pengeluaran melampaui saldo awal ditambah kas masuk tunai'
    );
  });

  it('keeps the period-only wording when no opening balance is included', () => {
    expect(describeDrawerEstimate(0, false)).toBe(
      'Tunai pasien dikurangi pengeluaran & setoran'
    );
    expect(describeDrawerEstimate(-1, false)).toBe(
      'Setoran dan pengeluaran melampaui kas masuk tunai periode ini'
    );
  });
});
