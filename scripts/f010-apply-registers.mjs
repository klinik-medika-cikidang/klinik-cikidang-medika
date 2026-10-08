/**
 * F-010 phase 3: rebuild the derived program registers from the audit map.
 *
 * Phase 1 rebuilt public.patients and the audit; phase 2 re-inserted visits and
 * cash flows. This script rebuilds the derived rows that hang off those visits:
 *   - public.public_health_records from the MONITOR column
 *   - visits.bidan_rujukan from the "Bdn." note in Ket. Tindakan
 *
 * Source rows are matched to visits through public.patient_identity_audit plus the
 * visit date and ICD code, so a row whose copied No RM disagreed with the master is
 * still matched correctly.
 *
 * Still pending: circumcisions from SUNAT.csv and the triple-elimination screening
 * fields, which need the SUNAT and screening exports and their own matching rules.
 *
 * Safety: --dry-run writes nothing; production requires --confirm-prod.
 *
 * Usage:
 *   node scripts/f010-apply-registers.mjs --env=.env.staging --dry-run
 *   node scripts/f010-apply-registers.mjs --env=.env.staging
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { FILES, VISIT_COLUMNS, extractBidan, readCsv } from './lib/clinic-csv.mjs';
import { parseDate } from './lib/clinic-map.mjs';

const MONITOR_TO_PROGRAM = {
  ANC: 'ANC',
  PTM: 'PTM',
  KB: 'KB',
  '3 ELIMINASI': 'ELIMINASI_3',
};

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

const trim = (value) => (value === undefined || value === null ? '' : String(value).trim());

const auditRows = await runSql(
  "SELECT source_row, resolved_patient_id FROM public.patient_identity_audit WHERE source_table = 'REKAMMEDIS'"
);
const patientByRow = new Map(auditRows.map((r) => [String(r.source_row), r.resolved_patient_id]));

const visitRows = await runSql(
  'SELECT id, pasien_id, tanggal_periksa::text AS tanggal, kode_icd10 FROM public.visits'
);
const visitIdByKey = new Map();
for (const visit of visitRows) {
  const key = `${visit.pasien_id}|${visit.tanggal}|${trim(visit.kode_icd10).toUpperCase()}`;
  if (!visitIdByKey.has(key)) visitIdByKey.set(key, visit.id);
}

const rekam = readCsv(FILES.rekam).rows;
const registers = [];
const seenRegister = new Set();
const bidanUpdates = [];
const unknownMonitor = new Set();

rekam.forEach((row, index) => {
  const sourceRow = trim(row[0]) || String(index + 2);
  const patientId = patientByRow.get(sourceRow);
  if (!patientId) return;

  const tanggal = parseDate(row[VISIT_COLUMNS.tanggalPeriksa]);
  if (!tanggal) return;
  const icd = trim(row[VISIT_COLUMNS.kodeIcd10]).toUpperCase();
  const visitId = visitIdByKey.get(`${patientId}|${tanggal}|${icd}`);
  if (!visitId) return;

  const monitor = trim(row[VISIT_COLUMNS.monitor]).toUpperCase().replace(/\s+/g, ' ');
  if (monitor) {
    const program = MONITOR_TO_PROGRAM[monitor];
    if (!program) {
      unknownMonitor.add(monitor);
    } else {
      const registerKey = `${visitId}|${program}`;
      if (!seenRegister.has(registerKey)) {
        seenRegister.add(registerKey);
        registers.push({
          program_type: program,
          pasien_id: patientId,
          visit_id: visitId,
          nama: trim(row[VISIT_COLUMNS.nama]) || 'Tanpa Nama',
          jenis_kelamin: trim(row[VISIT_COLUMNS.jenisKelamin]) || null,
          ttl: trim(row[VISIT_COLUMNS.tanggalLahir]) || null,
          alamat: trim(row[VISIT_COLUMNS.alamat]) || null,
          no_nik: trim(row[VISIT_COLUMNS.ktp]) || null,
          diagnosa: trim(row[VISIT_COLUMNS.diagnosa]) || null,
          lab: trim(row[VISIT_COLUMNS.lab]) || null,
          terapi: trim(row[VISIT_COLUMNS.terapi]) || null,
        });
      }
    }
  }

  const bidan = extractBidan(row[VISIT_COLUMNS.keteranganTindakan]);
  if (bidan) {
    // The column check requires the "Bdn." prefix in that exact casing.
    bidanUpdates.push({ id: visitId, bidan_rujukan: `Bdn.${bidan.slice(4)}` });
  }
});

console.log(`Env     : ${envFileName}`);
console.log(`Target  : ${projectRef} (${isProduction ? 'PRODUKSI' : 'pengembangan'})`);
console.log(`Register program akan disisipkan : ${registers.length}`);
console.log(`Update bidan_rujukan             : ${bidanUpdates.length}`);
if (unknownMonitor.size) console.log(`MONITOR tak dikenal              : ${[...unknownMonitor].join(', ')}`);

if (dryRun) {
  console.log('\nDRY-RUN: tidak ada yang ditulis.');
  process.exit(0);
}

await runSql('DELETE FROM public.public_health_records;');
console.log('\nMengosongkan public_health_records (rebuild)...');

const inserted = await insertBatched('public_health_records', registers);
console.log(`Register tersimpan: ${inserted}`);

let updated = 0;
for (const row of bidanUpdates) {
  const { error } = await supabase.from('visits').update({ bidan_rujukan: row.bidan_rujukan }).eq('id', row.id);
  if (error) throw new Error(`bidan_rujukan: ${error.message}`);
  updated += 1;
}
console.log(`Bidan tersimpan   : ${updated}`);

const check = await runSql(
  'SELECT (SELECT count(*) FROM public.public_health_records) AS registers, (SELECT count(*) FROM public.visits WHERE bidan_rujukan IS NOT NULL) AS bidan;'
);
console.log('Isi tabel:', JSON.stringify(check));
