// Extract the three clinic-review lists for F-010 validation, with real names and
// No RM so the doctor can check the spreadsheet directly. Output lands in docs/data
// (gitignored) because it is PII; nothing here is committed.
//
// Usage:
//   node scripts/f010-review-lists.mjs --env=.env.staging
//   node scripts/f010-review-lists.mjs --env=.env.production --confirm-prod

import fs from 'fs';
import path from 'path';
import { FILES, VISIT_COLUMNS, readCsv } from './lib/clinic-csv.mjs';
import { parseDate } from './lib/clinic-map.mjs';

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

const envFileName = argOf('env', '.env.staging');
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
if (isProduction && !process.argv.includes('--confirm-prod')) {
  console.error('DIHENTIKAN: target PRODUKSI. Tambahkan --confirm-prod bila memang disengaja.');
  process.exit(1);
}

async function runSql(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) {
    throw new Error(`SQL gagal (${response.status}): ${(await response.text()).slice(0, 400)}`);
  }
  return response.json();
}

const cell = (value) => (value === undefined || value === null ? '' : String(value).trim());

const rekam = readCsv(FILES.rekam).rows;

// Map the sheet's own "No" column to the Excel row so the doctor can find each row.
const excelRowByNo = new Map();
rekam.forEach((row, index) => {
  const no = cell(row[0]);
  if (no) excelRowByNo.set(no, index + 2);
});

const noDateRows = [];
rekam.forEach((row, index) => {
  if (parseDate(row[VISIT_COLUMNS.tanggalPeriksa])) return;
  noDateRows.push({
    baris: index + 2,
    no: cell(row[0]),
    noRm: cell(row[VISIT_COLUMNS.noRm]),
    nama: cell(row[VISIT_COLUMNS.nama]),
    tglLahir: cell(row[VISIT_COLUMNS.tanggalLahir]),
    desa: cell(row[VISIT_COLUMNS.desa]),
    dokter: cell(row[VISIT_COLUMNS.petugas]),
    diagnosa: cell(row[VISIT_COLUMNS.diagnosa]),
  });
});

const reviewRows = await runSql(
  "SELECT a.source_row, a.source_no_rm, a.source_nama, a.rule, a.resolved_no_rm, p.nama AS resolved_nama FROM public.patient_identity_audit a LEFT JOIN public.patients p ON p.id = a.resolved_patient_id WHERE a.status <> 'COCOK' ORDER BY a.source_row"
);

const sunatPatients = await runSql(
  "SELECT no_rm, nama, tanggal_lahir, desa FROM public.patients WHERE sumber_data = 'REKAMMEDIS' ORDER BY no_rm"
);

const payload = {
  generatedAt: new Date().toISOString(),
  source: projectRef,
  noDateRows,
  reviewRows: reviewRows.map((row) => ({
    baris: excelRowByNo.get(String(row.source_row)) || null,
    no: String(row.source_row),
    noRmSumber: cell(row.source_no_rm),
    namaSumber: cell(row.source_nama),
    aturan: cell(row.rule),
    noRmHasil: cell(row.resolved_no_rm),
    namaHasil: cell(row.resolved_nama),
  })),
  sunatPatients: sunatPatients.map((row) => ({
    noRm: cell(row.no_rm),
    nama: cell(row.nama),
    tglLahir: cell(row.tanggal_lahir),
    desa: cell(row.desa),
  })),
};

const outDir = path.resolve(process.cwd(), 'docs', 'data');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'f010-review-lists.json');
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');

console.log(`Target           : ${projectRef} (${isProduction ? 'PRODUKSI' : 'pengembangan'})`);
console.log(`Baris tanpa tanggal     : ${noDateRows.length}`);
console.log(`Baris perlu ditinjau    : ${payload.reviewRows.length}`);
console.log(`Pasien sunat hasil input: ${payload.sunatPatients.length}`);
console.log(`Disimpan: ${outPath}`);
