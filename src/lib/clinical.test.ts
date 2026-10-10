import { describe, expect, it } from 'vitest';
import { classifyPtm, resolveVisitBilling } from '@/lib/clinical';

describe('classifyPtm', () => {
  it('respects explicit kategori_ptm when present', () => {
    expect(classifyPtm({ kategori_ptm: 'Hipertensi', diagnosa: 'Demam biasa' })).toBe('Hipertensi');
    expect(classifyPtm({ kategori_ptm: 'Diabetes Melitus', diagnosa: 'Batuk' })).toBe('Diabetes');
  });

  it('classifies hypertension from ICD codes and clinical keywords', () => {
    expect(classifyPtm({ diagnosa: 'I10 - Essential (primary) hypertension' })).toBe('Hipertensi');
    expect(classifyPtm({ diagnosa: 'Hipertensi Grade 2' })).toBe('Hipertensi');
    expect(classifyPtm({ diagnosa: 'Obs HT + Cephalgia' })).toBe('Hipertensi');
    expect(classifyPtm({ diagnosa: 'Penyakit Kardiovaskular' })).toBe('Hipertensi');
  });

  it('classifies diabetes from ICD codes and clinical keywords', () => {
    expect(classifyPtm({ diagnosa: 'E11 - Type 2 diabetes mellitus' })).toBe('Diabetes');
    expect(classifyPtm({ diagnosa: 'DM Tipe 2 Tanpa Komplikasi' })).toBe('Diabetes');
    expect(classifyPtm({ diagnosa: 'Gula Darah Tinggi / Kencing Manis' })).toBe('Diabetes');
  });

  it('falls back to Lainnya for unclassified diagnoses', () => {
    expect(classifyPtm({ diagnosa: 'Gastritis Akut' })).toBe('Lainnya');
    expect(classifyPtm({ diagnosa: '' })).toBe('Lainnya');
    expect(classifyPtm({})).toBe('Lainnya');
  });
});

describe('resolveVisitBilling', () => {
  it('calculates standard tariff for UMUM patient when no cost is specified', () => {
    const res = resolveVisitBilling({ jenis_pasien: 'UMUM' });
    expect(res.isGratis).toBe(false);
    expect(res.biayaPeriksa).toBe(150000);
    expect(res.pendapatanLain).toBe(0);
    expect(res.totalTagihan).toBe(150000);
  });

  it('calculates custom tariff and additional income for UMUM patient', () => {
    const res = resolveVisitBilling({
      jenis_pasien: 'UMUM',
      biaya_periksa: 35000,
      pendapatan_lain: 15000,
    });
    expect(res.isGratis).toBe(false);
    expect(res.biayaPeriksa).toBe(35000);
    expect(res.pendapatanLain).toBe(15000);
    expect(res.totalTagihan).toBe(50000);
  });

  it('correctly resolves 0 bill when doctor explicitly sets biaya_periksa to 0 (falsy bug fix)', () => {
    const res = resolveVisitBilling({
      jenis_pasien: 'UMUM',
      biaya_periksa: 0,
      pendapatan_lain: 0,
    });
    expect(res.isGratis).toBe(true);
    expect(res.biayaPeriksa).toBe(0);
    expect(res.pendapatanLain).toBe(0);
    expect(res.totalTagihan).toBe(0);
    expect(res.alasanGratis).toBe('Kontrol Pasca Tindakan');
  });

  it('correctly resolves 0 bill when is_gratis flag is explicitly set with a custom reason', () => {
    const res = resolveVisitBilling({
      jenis_pasien: 'UMUM',
      biaya_periksa: 35000, // even if legacy/unsettled value was 35000
      pendapatan_lain: 20000,
      is_gratis: true,
      alasan_gratis: 'Keluarga Dokter / Staf',
    });
    expect(res.isGratis).toBe(true);
    expect(res.biayaPeriksa).toBe(0);
    expect(res.pendapatanLain).toBe(0);
    expect(res.totalTagihan).toBe(0);
    expect(res.alasanGratis).toBe('Keluarga Dokter / Staf');
  });

  it('ensures BPJS patient total tagihan is always 0 without marking as gratis', () => {
    const res = resolveVisitBilling({
      jenis_pasien: 'BPJS',
      biaya_periksa: 35000,
      pendapatan_lain: 0,
    });
    expect(res.isGratis).toBe(false);
    expect(res.biayaPeriksa).toBe(0);
    expect(res.pendapatanLain).toBe(0);
    expect(res.totalTagihan).toBe(0);
  });

  it('normalizes ribuan inputs (< 10000) to full Rupiah automatically', () => {
    const res = resolveVisitBilling({
      jenis_pasien: 'UMUM',
      biaya_periksa: 50,
      pendapatan_lain: 25,
    });
    expect(res.isGratis).toBe(false);
    expect(res.biayaPeriksa).toBe(50000);
    expect(res.pendapatanLain).toBe(25000);
    expect(res.totalTagihan).toBe(75000);
  });

  it('correctly aggregates clinic daily samples with mixed ribuan and full Rupiah', () => {
    // Exact scenario from clinic incident: 165, 175, 150000, 250, 50, 215
    const samples = [
      { jenis_pasien: 'UMUM', biaya_periksa: 165 },
      { jenis_pasien: 'UMUM', biaya_periksa: 175 },
      { jenis_pasien: 'UMUM', biaya_periksa: 150000 },
      { jenis_pasien: 'UMUM', biaya_periksa: 250 },
      { jenis_pasien: 'UMUM', biaya_periksa: 50 },
      { jenis_pasien: 'UMUM', biaya_periksa: 215 },
    ];
    const totalRevenue = samples.reduce((sum, item) => {
      const billing = resolveVisitBilling(item);
      return sum + billing.totalTagihan;
    }, 0);
    expect(totalRevenue).toBe(1005000);
  });
});

