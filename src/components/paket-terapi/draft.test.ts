import { describe, expect, it } from 'vitest';
import {
  draftsToPayload,
  draftSubtotal,
  draftTotal,
  itemsToDrafts,
  newDraftItem,
  parseNumberInput,
  parseQty,
} from '@/components/paket-terapi/draft';
import type { TherapyPackageItem } from '@/types/database';

describe('F-012 package draft helpers', () => {
  it('parses grouped rupiah input back to a plain number', () => {
    expect(parseNumberInput('24.105')).toBe(24105);
    expect(parseNumberInput('Rp 1.234.567')).toBe(1234567);
    expect(parseNumberInput('')).toBe(0);
  });

  it('rejects non-positive quantities and prices at parse time', () => {
    expect(parseQty('0')).toBe(0);
    expect(parseQty('')).toBe(0);
    expect(parseQty('3')).toBe(3);
    expect(parseNumberInput('0')).toBe(0);
  });

  it('derives each subtotal as qty times price', () => {
    const item = newDraftItem({ qty: '3', harga_satuan: '24.105' });
    expect(draftSubtotal(item)).toBe(72315);
  });

  it('derives the package total as the sum of subtotals', () => {
    const items = [
      newDraftItem({ qty: '1', harga_satuan: '23.460' }),
      newDraftItem({ qty: '1', harga_satuan: '7.923' }),
      newDraftItem({ qty: '1', harga_satuan: '5.985' }),
    ];
    expect(draftTotal(items)).toBe(37368);
  });

  it('stores urutan and subtotal from the on-screen order when building the payload', () => {
    const items = [
      newDraftItem({ jenis_item: 'TINDAKAN', nama_item: '  Suntikan  ', qty: '1', harga_satuan: '0' }),
      newDraftItem({ jenis_item: 'OBAT', nama_item: 'Ketorolac', qty: '2', harga_satuan: '16.181' }),
    ];
    const payload = draftsToPayload(items);

    expect(payload[0]).toMatchObject({
      jenis_item: 'TINDAKAN',
      nama_item: 'Suntikan',
      urutan: 1,
      subtotal: 0,
      catatan: null,
    });
    expect(payload[1]).toMatchObject({
      jenis_item: 'OBAT',
      qty: 2,
      harga_satuan: 16181,
      subtotal: 32362,
      urutan: 2,
    });
  });

  it('hydrates drafts from saved items ordered by urutan', () => {
    const saved: TherapyPackageItem[] = [
      { id: 'b', package_id: 'p', jenis_item: 'OBAT', nama_item: 'Paracetamol', qty: 1, harga_satuan: 23460, subtotal: 23460, urutan: 2 },
      { id: 'a', package_id: 'p', jenis_item: 'TINDAKAN', nama_item: 'Suntikan', qty: 1, harga_satuan: 0, subtotal: 0, urutan: 1 },
    ];
    const drafts = itemsToDrafts(saved);
    expect(drafts.map((d) => d.nama_item)).toEqual(['Suntikan', 'Paracetamol']);
  });

  it('seeds one empty line so a new package is not blocked at the editor', () => {
    expect(itemsToDrafts([]).length).toBe(1);
  });
});
