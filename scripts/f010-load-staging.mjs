/**
 * Load the F-010 staging tables from the clinic CSV exports.
 *
 * Why the Management API instead of the client SDK: the `staging` schema is
 * deliberately not exposed through PostgREST (see the F-010 migration), so the
 * loader writes with the project access token, the same path scripts/apply-sql.mjs
 * uses.
 *
 * Safety:
 *   - refuses to write to production without --confirm-prod
 *   - --dry-run prints the planned row counts and writes nothing
 *   - truncates the two staging tables before loading, so a re-run is clean
 *
 * Usage:
 *   node scripts/f010-load-staging.mjs --env=.env.staging --dry-run
 *   node scripts/f010-load-staging.mjs --env=.env.staging
 */

import fs from 'fs';
import path from 'path';
import { FILES, readCsv } from './lib/clinic-csv.mjs';

function readEnv(envFileName) {
  const envPath = path.resolve(process.cwd(), envFileName);
  if (!fs.existsSync(envPath)) return {};
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

const argOf = (name, fallback = null) => {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};

const envFileName = argOf('env', '.env.local');
const dryRun = process.argv.includes('--dry-run');
const confirmProd = process.argv.includes('--confirm-prod');
const env = readEnv(envFileName);

const token = env.SUPABASE_ACCESS_TOKEN;
const projectRef =
  env.SUPABASE_PROJECT_REF || /https:\/\/([^.]+)\./.exec(env.NEXT_PUBLIC_SUPABASE_URL || '')?.[1];
const prodRef = /https:\/\/([^.]+)\./.exec(readEnv('.env.production').NEXT_PUBLIC_SUPABASE_URL || '')?.[1];
const isProduction = Boolean(prodRef) && projectRef === prodRef;

if (!token || !projectRef) {
  console.error(`SUPABASE_ACCESS_TOKEN atau project ref tidak ada di ${envFileName}`);
  process.exit(1);
}
if (isProduction && !confirmProd) {
  console.error('DIHENTIKAN: target adalah PRODUKSI. Tambahkan --confirm-prod bila memang disengaja.');
  process.exit(1);
}

const DP_COLUMNS = [
  'no_urut', 'kode_jk', 'kode_desa', 'no_rm', 'gelar', 'nama', 'jenis_kelamin', 'tanggal_lahir',
  'usia', 'kode_alamat', 'alamat', 'no_ktp', 'no_jkn', 'no_telpn', 'asuransi', 'status_pernikahan',
  'pekerjaan', 'alergi_obat', 'no_asli_di', 'ket',
];

const RV_COLUMNS = [
  'row_no', 'no_rm', 'gelar', 'nama', 'jenis_kelamin', 'tanggal_lahir', 'usia', 'desa', 'alamat',
  'no_ktp', 'no_bpjs', 'tanggal_periksa', 'jam', 'bulan', 'kode_icd10', 'petugas', 'anamnesa',
  'diagnosa', 'terapi', 'monitor', 'lab', 'lab_hasil', 'penjamin', 'tarif', 'tindakan',
  'keterangan_tindakan', 'pendapatan_lain', 'keterangan_pendapatan', 'pengeluaran_klinik',
  'pengeluaran_non_klinik', 'keterangan_pengeluaran', 'setor_tunai', 'jenis_pembayaran',
];

// Standard-conforming strings are on, so only the single quote needs escaping.
const literal = (value) => {
  const text = value === undefined || value === null ? '' : String(value);
  if (text === '') return 'NULL';
  return `'${text.replace(/'/g, "''")}'`;
};

const at = (row, index) => (row[index] === undefined ? '' : row[index]);

async function runSql(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) {
    throw new Error(`SQL gagal (${response.status}): ${(await response.text()).slice(0, 400)}`);
  }
  return response.json().catch(() => null);
}

function buildInsert(table, columns, rows, batchSize = 500) {
  const statements = [];
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const values = batch.map((cells) => `(${cells.map(literal).join(',')})`).join(',');
    statements.push(`INSERT INTO staging.${table} (${columns.join(',')}) VALUES ${values};`);
  }
  return statements;
}

const datapasien = readCsv(FILES.datapasien).rows.map((row) =>
  DP_COLUMNS.map((_, index) => at(row, index))
);

const rekam = readCsv(FILES.rekam).rows.map((row, index) => {
  const rowNo = String(at(row, 0)).trim() || String(index + 2);
  const rest = Array.from({ length: RV_COLUMNS.length - 1 }, (_, k) => at(row, k + 1));
  return [rowNo, ...rest];
});

console.log(`Env     : ${envFileName}`);
console.log(`Target  : ${projectRef} (${isProduction ? 'PRODUKSI' : 'pengembangan'})`);
console.log(`Sumber  : ${FILES.datapasien} -> ${datapasien.length} baris`);
console.log(`Sumber  : ${FILES.rekam} -> ${rekam.length} baris`);

if (dryRun) {
  console.log('\nDRY-RUN: tidak ada yang ditulis.');
  console.log(`   staging.datapasien : ${datapasien.length} baris`);
  console.log(`   staging.rekam_visit: ${rekam.length} baris`);
  process.exit(0);
}

console.log('\nMengosongkan staging...');
await runSql('TRUNCATE staging.datapasien, staging.rekam_visit;');

console.log('Memuat staging.datapasien...');
let inserted = 0;
for (const statement of buildInsert('datapasien', DP_COLUMNS, datapasien)) {
  await runSql(statement);
  inserted += 500;
  console.log(`   ${Math.min(inserted, datapasien.length)}/${datapasien.length}`);
}

console.log('Memuat staging.rekam_visit...');
inserted = 0;
for (const statement of buildInsert('rekam_visit', RV_COLUMNS, rekam)) {
  await runSql(statement);
  inserted += 500;
  console.log(`   ${Math.min(inserted, rekam.length)}/${rekam.length}`);
}

const check = await runSql(
  'SELECT (SELECT count(*) FROM staging.datapasien) AS datapasien, (SELECT count(*) FROM staging.rekam_visit) AS rekam_visit;'
);
console.log('\nSelesai. Isi staging:', JSON.stringify(check));
