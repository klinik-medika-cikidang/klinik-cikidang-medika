import { describe, it, expect } from 'vitest';
import { scopeEmptyReason } from './ProgramScopeToggle';

describe('scopeEmptyReason', () => {
  it('reports an empty register when nothing was ever recorded', () => {
    expect(scopeEmptyReason({ scope: 'aktif', totalCount: 0, hiddenMatchCount: 0, isNarrowed: false })).toBe(
      'empty-register'
    );
    expect(scopeEmptyReason({ scope: 'semua', totalCount: 0, hiddenMatchCount: 0, isNarrowed: true })).toBe(
      'empty-register'
    );
  });

  it('says no patient is active when the active scope alone empties the list', () => {
    expect(scopeEmptyReason({ scope: 'aktif', totalCount: 12, hiddenMatchCount: 12, isNarrowed: false })).toBe(
      'none-active'
    );
  });

  it('points to Semua Riwayat when a search or filter only matches rows the active scope hides', () => {
    expect(scopeEmptyReason({ scope: 'aktif', totalCount: 40, hiddenMatchCount: 1, isNarrowed: true })).toBe(
      'hidden-by-scope'
    );
  });

  it('reports a plain miss when the search matches nothing in the full register', () => {
    expect(scopeEmptyReason({ scope: 'aktif', totalCount: 40, hiddenMatchCount: 0, isNarrowed: true })).toBe(
      'no-match'
    );
    expect(scopeEmptyReason({ scope: 'semua', totalCount: 40, hiddenMatchCount: 0, isNarrowed: true })).toBe(
      'no-match'
    );
  });

  it('ignores hidden matches when the full history is already shown', () => {
    expect(scopeEmptyReason({ scope: 'semua', totalCount: 40, hiddenMatchCount: 3, isNarrowed: true })).toBe(
      'no-match'
    );
  });
});
