/**
 * F-019 Task 5.1: read-only reconciliation of the database against the REKAMMEDIS
 * export, per month, for visit count, cashier revenue, clinic and non-clinic
 * expenses, and cash deposits.
 *
 * Nothing is written: every database call is a select. Only dates and amounts are
 * printed, never patient names, record numbers, or identity numbers.
 *
 * The CSV is read from <cwd>/docs/data, so run it from the checkout that holds the
 * (gitignored) export:
 *   node scripts/audit-bukukas-vs-csv.mjs --env=.env.staging [--until=2026-10-09]
 *
 * Legacy amounts: the 2026-10-13 backfill (ADR-004) multiplied stored values that
 * were > 0 and < 10000 by 1000, so CSV values get the same rule before comparing.
 *
 * The CSV side uses the same parseRupiah as the ETL, so a cell the ETL misread is
 * misread here too. Money cells that parseRupiah cannot read faithfully (decimal
 * comma, minus sign, letters) are counted and reported for manual review.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { FILES, VISIT_COLUMNS, DATA_DIR, csvExists, readCsv } from './lib/clinic-csv.mjs';
import { parseDate, parseRupiah } from './lib/clinic-map.mjs';

const CLINIC_EXPENSE = 'Pengeluaran Obat / Operasional';
const NON_CLINIC_EXPENSE = 'Pengeluaran Non Klinik';
const CASH_DEPOSIT = 'Setor Tunai';
const METRICS = ['kunjungan', 'pendapatan', 'keluarKlinik', 'keluarNonKlinik', 'setorTunai'];
const LABELS = {
  kunjungan: 'Kunjungan',
  pendapatan: 'Pendapatan kasir',
  keluarKlinik: 'Pengeluaran klinik',
  keluarNonKlinik: 'Pengeluaran non klinik',
  setorTunai: 'Setor tunai',
};

function readEnv(envFileName) {
  const envPath = path.resolve(process.cwd(), envFileName);
  if (!fs.existsSync(envPath)) return null;
  const env = {};
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        env[key.trim()] = values.join('=').trim();
      }
    });
  return env;
}

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

// Mirrors the ADR-004 backfill so CSV shorthand ("150" for Rp 150.000) compares with full Rupiah.
function toFullRupiah(raw) {
  const value = parseRupiah(raw);
  return value > 0 && value < 10000 ? value * 1000 : value;
}

const emptyBucket = () => Object.fromEntries(METRICS.map((m) => [m, 0]));

const MONEY_COLUMNS = ['tarif', 'pendapatanLain', 'pengeluaranKlinik', 'pengeluaranNonKlinik', 'setorTunai'];

// parseRupiah drops every non-digit, so these shapes would be read as a different number.
function isAmbiguousMoneyCell(raw) {
  const value = String(raw || '').trim();
  if (!value) return false;
  // A currency prefix ("Rp", "IDR Rp") is read correctly and is not flagged.
  return /,\d{1,2}$/.test(value) || value.includes('-') || /[a-z]/i.test(value.replace(/^(idr\s*)?(rp\.?\s*)?/i, ''));
}

function addTo(map, key, metric, amount) {
  if (!map.has(key)) map.set(key, emptyBucket());
  map.get(key)[metric] += amount;
}

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n);

async function fetchAll(supabase, table, columns, dateColumn, until) {
  const rows = [];
  const pageSize = 1000;
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .lte(dateColumn, until)
      .order(dateColumn, { ascending: true })
      .order('id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

async function main() {
  const envFileName = arg('env');
  const until = arg('until') || '2026-10-09';
  if (!envFileName) {
    console.error('Wajib --env=<file env>.');
    process.exit(2);
  }
  // A missing export must not look like "everything matched".
  if (!csvExists(FILES.rekam)) {
    console.error(`File CSV tidak ditemukan: ${path.join(DATA_DIR, FILES.rekam)}`);
    process.exit(2);
  }
  const env = readEnv(envFileName);
  const key = env?.SUPABASE_SERVICE_ROLE_KEY || env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!env?.NEXT_PUBLIC_SUPABASE_URL || !key) {
    console.error(`File env tidak lengkap atau tidak ada: ${envFileName}`);
    process.exit(2);
  }
  const ref = /https:\/\/([^.]+)\./.exec(env.NEXT_PUBLIC_SUPABASE_URL)?.[1] ?? 'tidak diketahui';
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false } });

  const csvMonths = new Map();
  const csvDays = new Map();
  let invalidDate = 0;
  const ambiguous = new Map();
  const { rows } = readCsv(FILES.rekam);
  for (const row of rows) {
    const tanggal = parseDate(row[VISIT_COLUMNS.tanggalPeriksa]);
    if (!tanggal) {
      invalidDate++;
      continue;
    }
    if (tanggal > until) continue;
    for (const column of MONEY_COLUMNS) {
      if (isAmbiguousMoneyCell(row[VISIT_COLUMNS[column]])) {
        ambiguous.set(column, (ambiguous.get(column) || 0) + 1);
      }
    }
    const values = {
      kunjungan: 1,
      pendapatan: toFullRupiah(row[VISIT_COLUMNS.tarif]) + toFullRupiah(row[VISIT_COLUMNS.pendapatanLain]),
      keluarKlinik: toFullRupiah(row[VISIT_COLUMNS.pengeluaranKlinik]),
      keluarNonKlinik: toFullRupiah(row[VISIT_COLUMNS.pengeluaranNonKlinik]),
      setorTunai: toFullRupiah(row[VISIT_COLUMNS.setorTunai]),
    };
    for (const m of METRICS) {
      addTo(csvMonths, tanggal.slice(0, 7), m, values[m]);
      addTo(csvDays, tanggal, m, values[m]);
    }
  }
  const firstMonth = [...csvMonths.keys()].sort()[0];
  if (!firstMonth) {
    console.error('CSV tidak berisi baris dengan tanggal valid.');
    process.exit(2);
  }
  const since = `${firstMonth}-01`;

  const visits = await fetchAll(
    supabase,
    'visits',
    'id, tanggal_periksa, biaya_periksa, pendapatan_lain, status_pembayaran',
    'tanggal_periksa',
    until
  );
  const flows = await fetchAll(supabase, 'cash_flows', 'id, tanggal, jenis, kategori, nominal', 'tanggal', until);

  const dbMonths = new Map();
  const dbDays = new Map();
  let cancelled = 0;
  for (const v of visits) {
    if (v.tanggal_periksa < since) continue;
    // Cancelled queue entries never existed in the spreadsheet.
    if (v.status_pembayaran === 'Batal') {
      cancelled++;
      continue;
    }
    const amount = (Number(v.biaya_periksa) || 0) + (Number(v.pendapatan_lain) || 0);
    for (const [m, n] of [['kunjungan', 1], ['pendapatan', amount]]) {
      addTo(dbMonths, v.tanggal_periksa.slice(0, 7), m, n);
      addTo(dbDays, v.tanggal_periksa, m, n);
    }
  }
  const otherCategories = new Map();
  for (const f of flows) {
    if (f.tanggal < since) continue;
    const nominal = Number(f.nominal) || 0;
    let metric = null;
    if (f.jenis === 'Keluar' && f.kategori === CLINIC_EXPENSE) metric = 'keluarKlinik';
    else if (f.jenis === 'Keluar' && f.kategori === NON_CLINIC_EXPENSE) metric = 'keluarNonKlinik';
    else if (f.kategori === CASH_DEPOSIT) metric = 'setorTunai';
    if (!metric) {
      const label = `${f.jenis} / ${f.kategori}`;
      otherCategories.set(label, (otherCategories.get(label) || 0) + nominal);
      continue;
    }
    addTo(dbMonths, f.tanggal.slice(0, 7), metric, nominal);
    addTo(dbDays, f.tanggal, metric, nominal);
  }

  console.log(`\nAUDIT BUKU KAS vs CSV (read-only) -> proyek ${ref}`);
  console.log(`Rentang: ${since} sampai ${until}. Baris CSV tanpa tanggal valid: ${invalidDate}. Kunjungan Batal di DB (dikecualikan): ${cancelled}.\n`);

  const months = [...new Set([...csvMonths.keys(), ...dbMonths.keys()])].sort();
  const differing = [];
  console.log(['Bulan', ...METRICS.map((m) => LABELS[m])].join(' | '));
  for (const month of months) {
    const c = csvMonths.get(month) || emptyBucket();
    const d = dbMonths.get(month) || emptyBucket();
    const cells = METRICS.map((m) => {
      const diff = d[m] - c[m];
      return diff === 0 ? `${fmt(c[m])} cocok` : `CSV ${fmt(c[m])} / DB ${fmt(d[m])} (selisih ${fmt(diff)})`;
    });
    if (METRICS.some((m) => d[m] !== c[m])) differing.push(month);
    console.log([month, ...cells].join(' | '));
  }

  if (otherCategories.size > 0) {
    console.log('\nKategori kas lain di DB (tidak ada padanannya di CSV, tidak dibandingkan):');
    for (const [label, total] of [...otherCategories.entries()].sort()) console.log(`  ${label}: ${fmt(total)}`);
  }

  // Per-day comparison runs for every month, so errors that cancel out inside a month
  // (a row on the wrong day, a missing row offset by a duplicate) still show up.
  const allDays = [...new Set([...csvDays.keys(), ...dbDays.keys()])].sort();
  const differingDays = [];
  for (const day of allDays) {
    const c = csvDays.get(day) || emptyBucket();
    const d = dbDays.get(day) || emptyBucket();
    const parts = METRICS.filter((m) => c[m] !== d[m]).map(
      (m) => `${LABELS[m]}: CSV ${fmt(c[m])} / DB ${fmt(d[m])}`
    );
    if (parts.length) differingDays.push(`  ${day}  ${parts.join('; ')}`);
  }

  console.log(`\nBulan dengan selisih: ${differing.length === 0 ? 'tidak ada' : differing.join(', ')}`);
  console.log(`Tanggal dengan selisih: ${differingDays.length} dari ${allDays.length} tanggal`);
  for (const line of differingDays) console.log(line);

  const ambiguousTotal = [...ambiguous.values()].reduce((a, b) => a + b, 0);
  console.log(`\nSel uang CSV yang formatnya meragukan (koma desimal, minus, huruf): ${ambiguousTotal}`);
  for (const [column, count] of ambiguous) console.log(`  ${column}: ${count}`);

  process.exit(differing.length === 0 && differingDays.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`Audit gagal: ${err.message}`);
  process.exit(2);
});
