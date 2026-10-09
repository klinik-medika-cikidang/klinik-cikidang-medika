import type { TherapyPackageItem, TherapyPackageItemType } from '@/types/database';
import { THERAPY_PACKAGE_ITEM_TYPES } from '@/constants/clinic';

// The form edits items as an in-memory list until the owner saves. Quantity and price
// stay as strings while typing so the inputs never fight the user; they are parsed only
// to derive subtotals and the package total.
export type DraftItem = {
  key: string;
  jenis_item: TherapyPackageItemType;
  nama_item: string;
  qty: string;
  harga_satuan: string;
  catatan: string;
};

export function nextKey(): string {
  return `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newDraftItem(overrides: Partial<DraftItem> = {}): DraftItem {
  return {
    key: nextKey(),
    jenis_item: 'OBAT',
    nama_item: '',
    qty: '1',
    harga_satuan: '',
    catatan: '',
    ...overrides,
  };
}

export function itemsToDrafts(items: TherapyPackageItem[] = []): DraftItem[] {
  if (items.length === 0) return [newDraftItem()];
  return [...items]
    .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
    .map((item) =>
      newDraftItem({
        jenis_item: item.jenis_item,
        nama_item: item.nama_item,
        qty: String(item.qty ?? 1),
        harga_satuan: Number(item.harga_satuan || 0) ? formatNumberInput(Number(item.harga_satuan)) : '',
        catatan: item.catatan || '',
      })
    );
}

// Prices are entered as digits and shown grouped, so the value stored here is always a
// plain number. "24.105" typed by hand becomes 24105.
export function parseNumberInput(value: string): number {
  const digits = (value || '').replace(/[^0-9]/g, '');
  return digits ? Number.parseInt(digits, 10) : 0;
}

export function formatNumberInput(value: number): string {
  if (!value) return '';
  return new Intl.NumberFormat('id-ID').format(value);
}

export function parseQty(value: string): number {
  const digits = (value || '').replace(/[^0-9]/g, '');
  return digits ? Number.parseInt(digits, 10) : 0;
}

export function draftSubtotal(item: DraftItem): number {
  return parseQty(item.qty) * parseNumberInput(item.harga_satuan);
}

export function draftTotal(items: DraftItem[]): number {
  return items.reduce((sum, item) => sum + draftSubtotal(item), 0);
}

export function isDraftItemComplete(item: DraftItem): boolean {
  return item.nama_item.trim().length >= 2 && parseQty(item.qty) > 0;
}

export type PackageItemPayload = {
  jenis_item: TherapyPackageItemType;
  nama_item: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
  urutan: number;
  catatan: string | null;
};

// Reassigns urutan from the current on-screen order so a saved package prints its
// items in the same sequence the owner arranged.
export function draftsToPayload(items: DraftItem[]): PackageItemPayload[] {
  return items.map((item, index) => {
    const qty = parseQty(item.qty);
    const harga = parseNumberInput(item.harga_satuan);
    return {
      jenis_item: item.jenis_item,
      nama_item: item.nama_item.trim(),
      qty,
      harga_satuan: harga,
      subtotal: qty * harga,
      urutan: index + 1,
      catatan: item.catatan.trim() || null,
    };
  });
}

export function isValidItemType(value: string): value is TherapyPackageItemType {
  return (THERAPY_PACKAGE_ITEM_TYPES as string[]).includes(value);
}
