/**
 * F-012: build starter therapy packages for staging from the clinic's own records.
 *
 * Package shape comes from the most frequent Terapi combinations in REKAMMEDIS.csv.
 * Drug prices are read from HARGA OBAT NURANI.csv (never hardcoded here), so the
 * numbers trace back to the clinic file. Items with no price in that list are seeded
 * at 0 with a catatan telling the owner to set the clinic tariff, matching FR-005
 * AC-005.3. The whole set is a starting point: the owner edits, adds, or deletes
 * packages and items from the master page.
 *
 * This writes SQL only. Apply it with:
 *   node scripts/apply-sql.mjs --env=.env.staging --file=docs/data/f012-seed-staging.sql
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR, FILES, parseCSVLine } from './lib/clinic-csv.mjs';

const OBAT_FILE = '[DATA] Klinik Cikidang Medika  - HARGA OBAT NURANI.csv';

// The export lists the pharmacy price with Indonesian thousand separators, so
// "24.105" is Rp 24.105. Commas never appear inside a price cell.
function readPriceMap() {
  const raw = fs.readFileSync(path.join(DATA_DIR, OBAT_FILE), 'utf-8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const map = new Map();
  for (const line of lines) {
    const [nameCell, priceCell] = parseCSVLine(line);
    const name = (nameCell || '').trim();
    const digits = (priceCell || '').replace(/[^0-9]/g, '');
    if (!name || !digits) continue;
    if (/^(nama obat|harga obat)/i.test(name)) continue;
    map.set(name, Number.parseInt(digits, 10));
  }
  return map;
}

const priceMap = readPriceMap();

// priceKey === null means the item is not in the price list and starts at 0.
function item(jenis, nama, qty, hargaSatuan, catatan) {
  return { jenis, nama, qty, hargaSatuan, catatan: catatan || null };
}

function priced(jenis, nama, qty, priceKey) {
  if (!priceMap.has(priceKey)) {
    throw new Error(`Harga tidak ditemukan di daftar obat: "${priceKey}"`);
  }
  return item(jenis, nama, qty, priceMap.get(priceKey), null);
}

const packages = [
  {
    kode: 'PKT-ISPA-DW',
    nama: 'Paket Terapi ISPA Dewasa',
    deskripsi: 'Batuk pilek atau ISPA dewasa: paracetamol, cetirizin, dan deksametason.',
    items: [
      priced('OBAT', 'Paracetamol 500 mg', 1, 'Paracetamol 500 isi 20'),
      priced('OBAT', 'Cetirizin 10 mg', 1, 'Cetirizin IFI Tab'),
      priced('OBAT', 'Dexamethasone 0,5 mg', 1, 'Dexametasone 0.5mg Tripa'),
    ],
  },
  {
    kode: 'PKT-BATUK-AN',
    nama: 'Paket Terapi Batuk Pilek Anak',
    deskripsi: 'Batuk pilek anak: paracetamol drop dan puyer racikan dokter.',
    items: [
      item('OBAT', 'Paracetamol drop anak', 1, 0, 'Harga belum diisi, sesuaikan tarif klinik'),
      item('OBAT', 'Puyer racikan dokter', 1, 0, 'Harga belum diisi, sesuaikan tarif klinik'),
    ],
  },
  {
    kode: 'PKT-INFEKSI-BAKTERI',
    nama: 'Paket Terapi Infeksi Bakteri',
    deskripsi: 'Infeksi bakteri ringan: amoksisilin dengan paracetamol.',
    items: [
      priced('OBAT', 'Amoxicillin 500 mg', 1, 'Amoxillin HJ 20'),
      priced('OBAT', 'Paracetamol 500 mg', 1, 'Paracetamol 500 isi 20'),
    ],
  },
  {
    kode: 'PKT-DISPEPSIA',
    nama: 'Paket Terapi Dispepsia',
    deskripsi: 'Nyeri lambung atau dispepsia: antasida dan ranitidin.',
    items: [
      priced('OBAT', 'Antasida tablet', 1, 'Antasida Deon Tab'),
      priced('OBAT', 'Ranitidin tablet', 1, 'Ranitidin Tab Hj'),
    ],
  },
  {
    kode: 'PKT-ASAM-LAMBUNG',
    nama: 'Paket Terapi Asam Lambung',
    deskripsi: 'Gastritis atau GERD: omeprazol.',
    items: [priced('OBAT', 'Omeprazole 20 mg', 1, 'OMZ Hj 20')],
  },
  {
    kode: 'PKT-SUNTIK-NYERI',
    nama: 'Paket Suntik Nyeri dan Radang',
    deskripsi: 'Suntikan nyeri dan radang: ketorolak dan deksametason injeksi.',
    items: [
      item('TINDAKAN', 'Suntikan (injeksi)', 1, 0, 'Tarif tindakan belum diisi'),
      priced('OBAT', 'Ketorolac injeksi 30 mg', 1, 'Ketorolac Inj Mepro'),
      priced('OBAT', 'Dexamethasone injeksi', 1, 'Dexamethasone Inj Mepro'),
    ],
  },
  {
    kode: 'PKT-SUNTIK-MUAL',
    nama: 'Paket Suntik Mual dan Muntah',
    deskripsi: 'Suntikan mual dan muntah: ondansetron dan ranitidin injeksi.',
    items: [
      item('TINDAKAN', 'Suntikan (injeksi)', 1, 0, 'Tarif tindakan belum diisi'),
      priced('OBAT', 'Ondansetron injeksi 4 mg', 1, 'Ondan Inj Berno 4mg'),
      priced('OBAT', 'Ranitidin injeksi', 1, 'Ranitidine Inj HJ'),
    ],
  },
  {
    kode: 'PKT-NEBU',
    nama: 'Paket Terapi Nebulizer',
    deskripsi: 'Nebulizer untuk sesak atau batuk. Tarif tindakan dan harga obat belum diisi.',
    items: [
      item('TINDAKAN', 'Tindakan nebulizer', 1, 0, 'Tarif tindakan belum diisi'),
      item('OBAT', 'Obat nebulizer (sesuai resep)', 1, 0, 'Harga belum diisi, sesuaikan tarif klinik'),
    ],
  },
  {
    kode: 'PKT-INFUS',
    nama: 'Paket Terapi Infus',
    deskripsi: 'Pemasangan infus dan cairan. Tarif tindakan dan harga cairan belum diisi.',
    items: [
      item('TINDAKAN', 'Pemasangan infus', 1, 0, 'Tarif tindakan belum diisi'),
      item('OBAT', 'Cairan infus (sesuai resep)', 1, 0, 'Harga belum diisi, sesuaikan tarif klinik'),
    ],
  },
  {
    kode: 'PKT-USG',
    nama: 'Paket Pemeriksaan USG',
    deskripsi: 'Pemeriksaan USG. Tarif tindakan belum diisi.',
    items: [item('TINDAKAN', 'Pemeriksaan USG', 1, 0, 'Tarif tindakan belum diisi')],
  },
];

const quote = (value) => (value === null || value === undefined ? 'null' : `'${String(value).replace(/'/g, "''")}'`);
const num = (value) => Number(value).toFixed(2);

const statements = ['begin;', ''];

for (const pkg of packages) {
  const total = pkg.items.reduce((sum, line) => sum + line.qty * line.hargaSatuan, 0);
  statements.push(
    `insert into public.therapy_packages (kode, nama, deskripsi, harga_total, aktif, created_by_role)`,
    `values (${quote(pkg.kode)}, ${quote(pkg.nama)}, ${quote(pkg.deskripsi)}, ${num(total)}, true, 'owner')`,
    `on conflict (kode) where kode is not null do update set`,
    `  nama = excluded.nama,`,
    `  deskripsi = excluded.deskripsi,`,
    `  harga_total = excluded.harga_total,`,
    `  updated_at = now();`,
    `delete from public.therapy_package_items where package_id = (select id from public.therapy_packages where kode = ${quote(pkg.kode)});`,
    ''
  );

  pkg.items.forEach((line, index) => {
    statements.push(
      `insert into public.therapy_package_items (package_id, jenis_item, nama_item, qty, harga_satuan, subtotal, urutan, catatan)`,
      `select id, ${quote(line.jenis)}, ${quote(line.nama)}, ${num(line.qty)}, ${num(line.hargaSatuan)}, ${num(line.qty * line.hargaSatuan)}, ${index + 1}, ${quote(line.catatan)}`,
      `from public.therapy_packages where kode = ${quote(pkg.kode)};`,
      ''
    );
  });
}

statements.push('commit;', '');

const outPath = path.join(DATA_DIR, 'f012-seed-staging.sql');
fs.writeFileSync(outPath, statements.join('\n'), 'utf-8');

const totalItems = packages.reduce((sum, pkg) => sum + pkg.items.length, 0);
console.log(`Ditulis: ${outPath}`);
console.log(`Paket : ${packages.length}`);
console.log(`Item  : ${totalItems}`);
for (const pkg of packages) {
  const total = pkg.items.reduce((sum, line) => sum + line.qty * line.hargaSatuan, 0);
  console.log(`  ${pkg.kode.padEnd(20)} ${String(total).padStart(9)}  ${pkg.nama}`);
}
