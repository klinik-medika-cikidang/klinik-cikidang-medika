/**
 * F-010 phase 2: rebuild visits and cash flows from the audit map.
 *
 * Phase 1 (scripts/f010-rebuild-identity.sql) rebuilt public.patients from the
 * DATA master and left public.visits empty. This script re-inserts the visits and
 * cash flows, taking each visit's patient from public.patient_identity_audit
 * (source_row -> resolved_patient_id) instead of from the copied No RM.
 *
 * Row mapping is reused from scripts/lib/clinic-map.mjs, the same helpers the
 * F-005 and F-009 migrations use, so the derived rules stay identical.
 *
 * Safety:
 *   - refuses to write to production without --confirm-prod
 *   - --dry-run reports what would be inserted and writes nothing
 *
 * Usage:
 *   node scripts/f010-apply-derived.mjs --env=.env.staging --dry-run
 *   node scripts/f010-apply-derived.mjs --env=.env.staging
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { FILES, readCsv } from './lib/clinic-csv.mjs';
import { cashFlowsFromRow, visitFromRow } from './lib/clinic-map.mjs';

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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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

async function insertBatched(table, rows, size = 400) {
  let inserted = 0;
  for (let start = 0; start < rows.length; start += size) {
    const batch = rows.slice(start, start + size);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table}: ${error.message}`);
    inserted += batch.length;
  }
  return inserted;
}

const auditRows = await runSql(
  "SELECT source_row, resolved_patient_id FROM public.patient_identity_audit WHERE source_table = 'REKAMMEDIS'"
);
const patientByRow = new Map(auditRows.map((r) => [String(r.source_row), r.resolved_patient_id]));
console.log(`Peta audit: ${patientByRow.size} baris`);

const { data: doctors, error: doctorError } = await supabase.from('doctors').select('id, nama');
if (doctorError) throw doctorError;
const doctorIdByName = new Map(doctors.map((d) => [d.nama.toLowerCase().trim(), d.id]));

const report = { invalidDate: [], invalidTime: 0, desaNormalized: 0, unknownDesa: new Map() };
const rekam = readCsv(FILES.rekam).rows;

const visits = [];
const cashFlows = [];
let missingAudit = 0;
let invalidDate = 0;
const invalidSamples = [];

rekam.forEach((row, index) => {
  const sourceRow = String(row[0] || '').trim() || String(index + 2);
  const patientId = patientByRow.get(sourceRow);
  if (!patientId) {
    missingAudit += 1;
    return;
  }
  const visit = visitFromRow(row, { rowIndex: index, doctorIdByName, report });
  if (!visit) {
    invalidDate += 1;
    if (invalidSamples.length < 10) invalidSamples.push(`baris ${index + 2}: "${String(row[11] || '')}"`);
    return;
  }
  visit.pasien_id = patientId;
  visits.push(visit);
  cashFlows.push(...cashFlowsFromRow(row, visit.tanggal_periksa));
});

console.log(`Env     : ${envFileName}`);
console.log(`Target  : ${projectRef} (${isProduction ? 'PRODUKSI' : 'pengembangan'})`);
console.log(`Kunjungan akan disisipkan : ${visits.length}`);
console.log(`Transaksi kas            : ${cashFlows.length}`);
console.log(`Tanpa pasien di audit    : ${missingAudit}`);
console.log(`Tanggal tidak valid      : ${invalidDate}`);
invalidSamples.forEach((s) => console.log(`   ${s}`));

if (dryRun) {
  console.log('\nDRY-RUN: tidak ada yang ditulis.');
  process.exit(0);
}

console.log('\nMengosongkan cash_flows (rebuild)...');
await runSql('DELETE FROM public.cash_flows;');

const visitsInserted = await insertBatched('visits', visits);
const flowsInserted = await insertBatched('cash_flows', cashFlows);
console.log(`\nKunjungan tersimpan: ${visitsInserted}`);
console.log(`Kas tersimpan     : ${flowsInserted}`);

const check = await runSql(
  'SELECT (SELECT count(*) FROM public.visits) AS visits, (SELECT count(*) FROM public.cash_flows) AS cash_flows;'
);
console.log('Isi tabel:', JSON.stringify(check));
