import { describe, expect, it } from 'vitest';
import { classifyPtm } from '@/lib/clinical';

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
