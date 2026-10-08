/**
 * Reconcile the clinic database against the latest Google Sheets export.
 *
 * Why incremental instead of another full reset: production is already serving the
 * clinic, so the script has to be idempotent and must never drop a visit. It merges
 * duplicate patient identities, adds what the newer export contains, backfills the
 * derived registers, and can be re-run without changing anything the second time.
 *
 * Rules implemented here are owned by the F-009 specification:
 *   docs/specs/F-009-kelengkapan-data-pemantauan-bidan/
 *
 * Safety:
 *   - refuses to write without an explicit confirmation flag for the target class
 *   - a ten second cancel window before touching production
 *   - --dry-run reports every planned change and writes nothing
 *
 * Usage:
 *   node scripts/reconcile-clinic-data.mjs --dry-run
 *   node scripts/reconcile-clinic-data.mjs --confirm-dev-reset
 *   node scripts/reconcile-clinic-data.mjs --env=.env.production --confirm-prod-reset
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  FILES,
  MONITOR_TO_PROGRAM,
  VISIT_COLUMNS,
  canonicalRm,
  csvExists,
  extractBidan,
  normalizeDate,
  readCsv,
  rmKey,
} from './lib/clinic-csv.mjs';
import {
  cashFlowsFromRow,
  desaRmCode,
  formatRm,
  genderRmCode,
  limit,
  normalizeDesa,
  parseAge,
  patientFromVisitRow,
  visitFromRow,
} from './lib/clinic-map.mjs';

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
const env = readEnv(envFileName);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const projectRef = /https:\/\/([^.]+)\./.exec(env.NEXT_PUBLIC_SUPABASE_URL || '')?.[1];
const prodRef = /https:\/\/([^.]+)\./.exec(readEnv('.env.production').NEXT_PUBLIC_SUPABASE_URL || '')?.[1];
const isProduction = Boolean(prodRef) && projectRef === prodRef;

if (!dryRun) {
  if (isProduction && !process.argv.includes('--confirm-prod-reset')) {
    console.error(
      'DIHENTIKAN: target adalah project PRODUKSI.\n' +
        'Pastikan backup sudah dibuat, lalu jalankan dengan:\n' +
        '  node scripts/reconcile-clinic-data.mjs --env=.env.production --confirm-prod-reset'
    );
    process.exit(1);
  }
  if (!isProduction && !process.argv.includes('--confirm-dev-reset')) {
    console.error(
      'DIHENTIKAN: jalankan dengan flag eksplisit:\n' +
        '  node scripts/reconcile-clinic-data.mjs --confirm-dev-reset\n' +
        'atau pratinjau tanpa menulis:\n' +
        '  node scripts/reconcile-clinic-data.mjs --dry-run'
    );
    process.exit(1);
  }
}

console.log(`Env    : ${envFileName}`);
console.log(`Target : ${projectRef} (${isProduction ? 'PRODUKSI' : 'pengembangan'})`);
console.log(`Mode   : ${dryRun ? 'DRY RUN (tidak menulis)' : 'MENULIS'}`);

if (!dryRun && isProduction) {
  console.log('PERHATIAN: menulis ke PRODUKSI. Ada jeda 10 detik untuk pembatalan.');
  await new Promise((resolve) => setTimeout(resolve, 10000));
}

const PROGRAM_TABLES = [
  { table: 'tbc_programs', column: 'pasien_id' },
  { table: 'circumcisions', column: 'pasien_id' },
  { table: 'post_cares', column: 'pasien_id' },
  { table: 'public_health_records', column: 'pasien_id' },
  { table: 'referral_commissions', column: 'pasien_id' },
];

const DATAPASIEN = {
  noRm: 3,
  gelar: 4,
  nama: 5,
  jenisKelamin: 6,
  tanggalLahir: 7,
  usia: 8,
  desa: 9,
  alamat: 10,
  ktp: 11,
  bpjs: 12,
  telepon: 13,
  pekerjaan: 16,
  alergi: 17,
};

const SCREENING = {
  noRm: 1,
  nama: 3,
  jenisKelamin: 4,
  tanggalLahir: 5,
  alamat: 8,
  ktp: 9,
  tanggal: 11,
  gpa: 18,
  uk: 19,
  tp: 20,
  terapi: 21,
  hiv: 22,
  syphilis: 23,
  hbsag: 24,
};

const DEFAULT_ALERGI = new Set(['Tidak Ada', 'Tidak ada', '-', '']);

const report = {
  unknownMonitor: new Map(),
  sunatUnresolvedNames: [],
  desaNormalized: 0,
  unknownDesa: new Map(),
  invalidDate: [],
  invalidTime: 0,
  irregularRm: new Set(),
};

const counts = {
  mergedGroups: 0,
  mergedRowsRemoved: 0,
  paddedPatients: 0,
  insertedPatientsFromVisits: 0,
  insertedPatientsFromMaster: 0,
  enrichedPekerjaan: 0,
  enrichedAlergi: 0,
  enrichedTelepon: 0,
  insertedVisits: 0,
  insertedCashFlows: 0,
  registerFromMonitor: 0,
  monitorResolved: 0,
  registerFromScreening: 0,
  screeningUpdated: 0,
  screeningUnmatched: 0,
  sunatPatientsCompleted: 0,
  sunatPatientsCreated: 0,
  sunatPatientsAmbiguous: 0,
  sunatUnresolved: 0,
  circumcisionsFromSunat: 0,
  bidanRowsSet: 0,
};

// Keys used to match rows between the Sheets export and the database. A visit key is
// not unique: the same patient can be seen twice on one day with the same diagnosis,
// so counts are compared per key rather than treating the key as unique.
const visitKeyOf = (patientKey, tanggal, icd) =>
  `${patientKey}|${normalizeDate(tanggal)}|${(icd || '').trim().toUpperCase()}`;

// Some legacy rows hold a non-numeric value in the No RM column. The same fallback must
// be used everywhere or those rows silently fail to match a visit.
const patientKeyOf = (rawNoRm) => rmKey(rawNoRm) || `RAW:${String(rawNoRm || '').trim()}`;

function chunk(list, size) {
  const out = [];
  for (let index = 0; index < list.length; index += size) out.push(list.slice(index, index + size));
  return out;
}

async function selectAll(table, columns = '*') {
  const rows = [];
  const pageSize = 1000;
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    page += 1;
  }
  return rows;
}

async function insertBatched(table, rows, batchSize = 400) {
  let inserted = 0;
  for (const batch of chunk(rows, batchSize)) {
    if (!dryRun) {
      const { error } = await supabase.from(table).insert(batch);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    inserted += batch.length;
  }
  return inserted;
}

// ------------------------------------------------------------ preconditions

const missingFiles = [FILES.rekam, FILES.datapasien].filter((name) => !csvExists(name));
if (missingFiles.length > 0) {
  console.error(`Berkas sumber tidak ditemukan di docs/data: ${missingFiles.join(', ')}`);
  process.exit(1);
}

// --------------------------------------------------------- load current state

let patients = await selectAll('patients');
let visits = await selectAll('visits');
const visitCountBefore = visits.length;
const patientCountBefore = patients.length;

const { data: doctorsData, error: doctorError } = await supabase.from('doctors').select('id, nama');
if (doctorError) throw doctorError;
const doctorIdByName = new Map(doctorsData.map((doctor) => [doctor.nama.toLowerCase().trim(), doctor.id]));

// Program tables are tiny, so their referenced patients are collected once and the
// merge only repoints the ones that are actually used.
const referencedPatientIds = new Set();
for (const { table, column } of PROGRAM_TABLES) {
  const rows = await selectAll(table, `id, ${column}`);
  rows.forEach((row) => {
    if (row[column]) referencedPatientIds.add(row[column]);
  });
}

// ------------------------------------------------------------------ 1. merge

let patientsByKey = new Map();
let patientKeyById = new Map();

function reindex() {
  patientsByKey = new Map();
  patientKeyById = new Map();
  patients.forEach((patient) => {
    const key = patientKeyOf(patient.no_rm);
    patientsByKey.set(key, patient);
    patientKeyById.set(patient.id, key);
  });
}
reindex();

const identityScore = (patient) =>
  ['no_ktp', 'no_bpjs', 'alamat', 'tanggal_lahir', 'no_telepon', 'pekerjaan'].reduce(
    (score, column) => score + (String(patient[column] || '').trim() ? 1 : 0),
    0
  );

async function mergeIdentities() {
  const groups = new Map();
  patients.forEach((patient) => {
    const key = patientKeyOf(patient.no_rm);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(patient);
  });

  const duplicateGroups = [...groups.values()].filter((group) => group.length > 1);
  counts.mergedGroups = duplicateGroups.length;
  const allLoserIds = [];

  for (const group of duplicateGroups) {
    // Prefer the longer number (the one that kept its leading zero), then the row
    // with the most populated identity fields, then a stable id order.
    const ranked = [...group].sort((a, b) => {
      const lengthDiff = String(b.no_rm).length - String(a.no_rm).length;
      if (lengthDiff !== 0) return lengthDiff;
      const scoreDiff = identityScore(b) - identityScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return String(a.id).localeCompare(String(b.id));
    });

    const survivor = ranked[0];
    const losers = ranked.slice(1);
    const canonical = canonicalRm(survivor.no_rm);

    if (!dryRun) {
      const { error: repointError } = await supabase
        .from('visits')
        .update({ pasien_id: survivor.id })
        .in(
          'pasien_id',
          losers.map((loser) => loser.id)
        );
      if (repointError) throw new Error(`repoint visits: ${repointError.message}`);

      for (const loser of losers) {
        if (!referencedPatientIds.has(loser.id)) continue;
        for (const { table, column } of PROGRAM_TABLES) {
          const { error } = await supabase.from(table).update({ pasien_id: survivor.id }).eq(column, loser.id);
          if (error) throw new Error(`repoint ${table}: ${error.message}`);
        }
      }

      const survivorPatch = { no_rm_lama: survivor.no_rm_lama || losers[0].no_rm };
      if (canonical) survivorPatch.no_rm = canonical;
      const { error: survivorError } = await supabase
        .from('patients')
        .update(survivorPatch)
        .eq('id', survivor.id);
      if (survivorError) throw new Error(`update survivor: ${survivorError.message}`);

      survivor.no_rm = canonical || survivor.no_rm;
      survivor.no_rm_lama = survivorPatch.no_rm_lama;
    }

    allLoserIds.push(...losers.map((loser) => loser.id));
    counts.mergedRowsRemoved += losers.length;
  }

  if (!dryRun && allLoserIds.length > 0) {
    const { error } = await supabase.from('patients').delete().in('id', allLoserIds);
    if (error) throw new Error(`delete duplicate patients: ${error.message}`);
  }
}

// F-010: identity is owned by the audit-based rebuild, so the leading-zero merge is
// opt-in only. Running it by default would re-introduce the F-009 mis-merges.
if (process.argv.includes('--legacy-merge')) {
  await mergeIdentities();
} else {
  console.log('mergeIdentities dilewati: identitas pasien dikelola rebuild F-010.');
}

// Pad standalone 8-digit numbers so the leading zero is restored. Two values that pad
// to the same string are by definition the same merge group, so this cannot collide.
for (const patient of patients) {
  const canonical = canonicalRm(patient.no_rm);
  if (!canonical || canonical === patient.no_rm) continue;
  if (!dryRun) {
    const { error } = await supabase
      .from('patients')
      .update({ no_rm: canonical, no_rm_lama: patient.no_rm_lama || patient.no_rm })
      .eq('id', patient.id);
    if (error) throw new Error(`pad no_rm: ${error.message}`);
  }
  patient.no_rm_lama = patient.no_rm_lama || patient.no_rm;
  patient.no_rm = canonical;
  counts.paddedPatients += 1;
}

if (!dryRun) {
  patients = await selectAll('patients');
  visits = await selectAll('visits');
}
reindex();

// ---------------------------------------------------- 2. patients from the visit log

const rekam = readCsv(FILES.rekam);

const newPatients = [];
const seenNewKeys = new Set();
rekam.rows.forEach((row) => {
  const raw = (row[VISIT_COLUMNS.noRm] || '').trim();
  if (!raw) return;
  if (canonicalRm(raw) === null) report.irregularRm.add(raw);

  const key = patientKeyOf(raw);
  if (patientsByKey.has(key) || seenNewKeys.has(key)) return;
  seenNewKeys.add(key);
  newPatients.push({
    no_rm: canonicalRm(raw) || raw,
    sumber_data: 'REKAMMEDIS',
    ...patientFromVisitRow(row, report),
  });
});

counts.insertedPatientsFromVisits = newPatients.length;

if (dryRun) {
  // Register the planned rows so the rest of the run resolves them exactly as it
  // would after a real insert.
  newPatients.forEach((row, index) => patients.push({ id: `dry-patient-${index}`, ...row }));
  reindex();
} else {
  for (const batch of chunk(newPatients, 400)) {
    const { data, error } = await supabase.from('patients').insert(batch).select('*');
    if (error) throw new Error(`insert patients from visits: ${error.message}`);
    patients.push(...data);
  }
  reindex();
}

// ---------------------------------------------------------------- 3. new visits

// A visit key is not unique: the same patient can be seen twice on one day with the
// same diagnosis. Counts are compared per key so a legitimate second visit is kept,
// while a re-run still inserts nothing.
const dbKeyCounts = new Map();
visits.forEach((visit) => {
  const patientKey = patientKeyById.get(visit.pasien_id);
  if (!patientKey) return;
  const key = visitKeyOf(patientKey, visit.tanggal_periksa, visit.kode_icd10);
  dbKeyCounts.set(key, (dbKeyCounts.get(key) || 0) + 1);
});

const sourceKeyCounts = new Map();
rekam.rows.forEach((row) => {
  const key = visitKeyOf(
    patientKeyOf(row[VISIT_COLUMNS.noRm]),
    row[VISIT_COLUMNS.tanggalPeriksa],
    row[VISIT_COLUMNS.kodeIcd10]
  );
  sourceKeyCounts.set(key, (sourceKeyCounts.get(key) || 0) + 1);
});

const visitsToInsert = [];
const cashFlowsToInsert = [];
const insertedPerKey = new Map();

rekam.rows.forEach((row, rowIndex) => {
  const raw = (row[VISIT_COLUMNS.noRm] || '').trim();
  if (!raw) return;
  const key = patientKeyOf(raw);
  const patient = patientsByKey.get(key);
  if (!patient) return;

  const buildKey = visitKeyOf(key, row[VISIT_COLUMNS.tanggalPeriksa], row[VISIT_COLUMNS.kodeIcd10]);
  const needed = sourceKeyCounts.get(buildKey) || 0;
  const present = (dbKeyCounts.get(buildKey) || 0) + (insertedPerKey.get(buildKey) || 0);
  if (present >= needed) return;

  const visit = visitFromRow(row, { rowIndex, doctorIdByName, report });
  if (!visit) return;

  insertedPerKey.set(buildKey, (insertedPerKey.get(buildKey) || 0) + 1);
  visitsToInsert.push({ ...visit, pasien_id: patient.id });
  cashFlowsToInsert.push(...cashFlowsFromRow(row, visit.tanggal_periksa));
});

counts.insertedVisits = await insertBatched('visits', visitsToInsert);
counts.insertedCashFlows = await insertBatched('cash_flows', cashFlowsToInsert);

// ------------------------------------------------- 4. patient master enrichment

const masterOnlyPatients = [];
const enrichUpdates = [];

readCsv(FILES.datapasien).rows.forEach((row) => {
  const raw = (row[DATAPASIEN.noRm] || '').trim();
  if (!raw) return;
  const key = patientKeyOf(raw);
  const pekerjaan = limit(row[DATAPASIEN.pekerjaan], 100);
  const alergi = (row[DATAPASIEN.alergi] || '').trim();
  const telepon = limit(row[DATAPASIEN.telepon], 30);
  const existing = patientsByKey.get(key);

  if (!existing) {
    masterOnlyPatients.push({
      no_rm: canonicalRm(raw) || raw,
      sumber_data: 'DATAPASIEN',
      gelar: limit(row[DATAPASIEN.gelar], 10) || 'Tn',
      nama: limit(row[DATAPASIEN.nama], 150) || 'Tanpa Nama',
      jenis_kelamin: limit(row[DATAPASIEN.jenisKelamin], 20) || 'Laki-laki',
      tanggal_lahir: limit(row[DATAPASIEN.tanggalLahir], 20),
      usia: parseAge(row[DATAPASIEN.usia]),
      desa: normalizeDesa(row[DATAPASIEN.desa]).value,
      alamat: (row[DATAPASIEN.alamat] || '').trim() || null,
      no_ktp: limit(row[DATAPASIEN.ktp], 30),
      no_bpjs: limit(row[DATAPASIEN.bpjs], 30),
      no_telepon: telepon,
      pekerjaan,
      ...(alergi && !DEFAULT_ALERGI.has(alergi) ? { riwayat_alergi: alergi } : {}),
    });
    return;
  }

  const patch = {};
  if (pekerjaan && !String(existing.pekerjaan || '').trim()) {
    patch.pekerjaan = pekerjaan;
    counts.enrichedPekerjaan += 1;
  }
  if (telepon && !String(existing.no_telepon || '').trim()) {
    patch.no_telepon = telepon;
    counts.enrichedTelepon += 1;
  }
  if (alergi && !DEFAULT_ALERGI.has(alergi) && DEFAULT_ALERGI.has(String(existing.riwayat_alergi || '').trim())) {
    patch.riwayat_alergi = alergi;
    counts.enrichedAlergi += 1;
  }
  if (Object.keys(patch).length > 0) enrichUpdates.push({ id: existing.id, patch });
});

const patientsById = new Map(patients.map((patient) => [patient.id, patient]));
const enrichedPatients = [];
for (const { id, patch } of enrichUpdates) {
  const patient = patientsById.get(id);
  if (patient) enrichedPatients.push({ ...patient, ...patch });
}

// One upsert per batch instead of one request per patient; the full row is sent so the
// required columns stay populated.
if (!dryRun) {
  for (const batch of chunk(enrichedPatients, 400)) {
    const { error } = await supabase.from('patients').upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`enrich patients: ${error.message}`);
  }
}

counts.insertedPatientsFromMaster = await insertBatched('patients', masterOnlyPatients);

if (!dryRun) {
  patients = await selectAll('patients');
  reindex();
}

// ---------------------------------------------- 5. public health register backfill

const allVisits = await selectAll(
  'visits',
  'id, pasien_id, tanggal_periksa, kode_icd10, keterangan_tindakan, bidan_rujukan'
);
const visitIdsByKey = new Map();
const visitIdEntries = [];

function addVisitId(key, id) {
  if (!visitIdsByKey.has(key)) visitIdsByKey.set(key, []);
  visitIdsByKey.get(key).push(id);
  visitIdEntries.push({ key, id });
}

// Two source rows can share a key when the same patient is seen twice on one day with
// the same diagnosis. Taking one id per row keeps the second visit addressable.
function takeVisitId(key) {
  const list = visitIdsByKey.get(key);
  return list && list.length > 0 ? list.shift() : null;
}

allVisits.forEach((visit) => {
  const patientKey = patientKeyById.get(visit.pasien_id);
  if (!patientKey) return;
  addVisitId(visitKeyOf(patientKey, visit.tanggal_periksa, visit.kode_icd10), visit.id);
});

// A dry run has no ids for the planned visits, so stand-in ids are registered to keep
// the downstream steps identical to a real write.
if (dryRun) {
  visitsToInsert.forEach((visit, index) => {
    const patientKey = patientKeyById.get(visit.pasien_id);
    if (!patientKey) return;
    addVisitId(visitKeyOf(patientKey, visit.tanggal_periksa, visit.kode_icd10), `dry-visit-${index}`);
  });
}

function findVisitIdByDate(patientKey, date) {
  const needle = `${patientKey}|${date}|`;
  const found = visitIdEntries.find((entry) => entry.key.startsWith(needle));
  return found ? found.id : null;
}

const existingRegister = await selectAll(
  'public_health_records',
  'id, visit_id, program_type, gpa, uk, tp, hiv, syphilis, hbsag'
);
const existingRegisterByKey = new Map(
  existingRegister.filter((row) => row.visit_id).map((row) => [`${row.visit_id}|${row.program_type}`, row])
);

const monitorVisitIds = new Set();
const monitorExpectedKeys = new Set();
const registerToInsert = [];
const plannedRegisterKeys = new Set();

rekam.rows.forEach((row) => {
  const monitor = (row[VISIT_COLUMNS.monitor] || '').trim();
  if (!monitor) return;
  const program = MONITOR_TO_PROGRAM[monitor.toUpperCase()];
  if (!program) {
    report.unknownMonitor.set(monitor, (report.unknownMonitor.get(monitor) || 0) + 1);
    return;
  }

  const key = patientKeyOf(row[VISIT_COLUMNS.noRm]);
  const visitId = takeVisitId(
    visitKeyOf(key, row[VISIT_COLUMNS.tanggalPeriksa], row[VISIT_COLUMNS.kodeIcd10])
  );
  if (!visitId) {
    report.unknownMonitor.set(`${monitor} (kunjungan tidak ketemu)`, 1);
    return;
  }
  counts.monitorResolved += 1;
  monitorVisitIds.add(visitId);
  monitorExpectedKeys.add(`${visitId}|${program}`);

  const registerKey = `${visitId}|${program}`;
  if (existingRegisterByKey.has(registerKey) || plannedRegisterKeys.has(registerKey)) return;
  plannedRegisterKeys.add(registerKey);

  registerToInsert.push({
    program_type: program,
    pasien_id: patientsByKey.get(key)?.id ?? null,
    visit_id: visitId,
    nama: limit(row[VISIT_COLUMNS.nama], 150) || 'Tanpa Nama',
    jenis_kelamin: limit(row[VISIT_COLUMNS.jenisKelamin], 20),
    ttl: [row[VISIT_COLUMNS.tanggalLahir], row[VISIT_COLUMNS.usia]].filter(Boolean).join(' / ') || null,
    alamat: (row[VISIT_COLUMNS.alamat] || '').trim() || null,
    no_nik: limit(row[VISIT_COLUMNS.ktp], 30),
    diagnosa: (row[VISIT_COLUMNS.diagnosa] || '').trim() || null,
    lab: limit(row[VISIT_COLUMNS.lab], 100),
    terapi: (row[VISIT_COLUMNS.terapi] || '').trim() || null,
  });
  counts.registerFromMonitor += 1;
});

// ------------------------------------------- 6. triple elimination screening values

const screeningRows = [];
[FILES.tripleEliminasi, FILES.hbSAg].forEach((fileName) => {
  if (!csvExists(fileName)) return;
  readCsv(fileName).rows.forEach((row) => {
    if (rmKey(row[SCREENING.noRm])) screeningRows.push(row);
  });
});

const SCREENING_FIELDS = ['gpa', 'uk', 'tp', 'hiv', 'syphilis', 'hbsag'];

for (const row of screeningRows) {
  const key = patientKeyOf(row[SCREENING.noRm]);
  const date = normalizeDate(row[SCREENING.tanggal]);
  const visitId = findVisitIdByDate(key, date);

  const fields = {
    gpa: limit(row[SCREENING.gpa], 30),
    uk: limit(row[SCREENING.uk], 30),
    tp: limit(row[SCREENING.tp], 30),
    hiv: limit(row[SCREENING.hiv], 30),
    syphilis: limit(row[SCREENING.syphilis], 30),
    hbsag: limit(row[SCREENING.hbsag], 50),
  };

  if (!visitId || SCREENING_FIELDS.every((field) => fields[field] === null)) {
    counts.screeningUnmatched += 1;
    continue;
  }

  // Attach to the register row that already exists or is already planned for this
  // visit, so a re-run updates in place instead of adding a second row.
  const planned = registerToInsert.find(
    (entry) => entry.visit_id === visitId && entry.program_type === 'ELIMINASI_3'
  );
  if (planned) {
    Object.assign(planned, fields);
    counts.screeningUpdated += 1;
    continue;
  }

  const existing = existingRegisterByKey.get(`${visitId}|ELIMINASI_3`);
  if (existing) {
    const unchanged = SCREENING_FIELDS.every(
      (field) => (existing[field] ?? null) === (fields[field] ?? null)
    );
    if (!unchanged) {
      if (!dryRun) {
        const { error } = await supabase.from('public_health_records').update(fields).eq('id', existing.id);
        if (error) throw new Error(`update screening: ${error.message}`);
      }
      counts.screeningUpdated += 1;
    }
    continue;
  }

  // The source is explicitly a 3-eliminasi screening record, so a register row is
  // created for it even when the MONITOR column did not tag the visit.
  registerToInsert.push({
    program_type: 'ELIMINASI_3',
    pasien_id: patientsByKey.get(key)?.id ?? null,
    visit_id: visitId,
    nama: limit(row[SCREENING.nama], 150) || 'Tanpa Nama',
    jenis_kelamin: limit(row[SCREENING.jenisKelamin], 20),
    ttl: limit(row[SCREENING.tanggalLahir], 120),
    alamat: (row[SCREENING.alamat] || '').trim() || null,
    no_nik: limit(row[SCREENING.ktp], 30),
    terapi: (row[SCREENING.terapi] || '').trim() || null,
    ...fields,
  });
  plannedRegisterKeys.add(`${visitId}|ELIMINASI_3`);
  counts.registerFromScreening += 1;
}

await insertBatched('public_health_records', registerToInsert);

// ------------------------------------------------------- 7. circumcision register

// The SUNAT sheet has no procedure date, so tanggal_tindakan is stored as NULL, which
// means "not recorded yet" and is filled in later through the edit form. Inventing a
// date would put fabricated clinical data in a medical record, and skipping the row
// would leave children missing from the register.
if (csvExists(FILES.sunat)) {
  const FOLLOW_UP_COLUMNS = [
    { index: 8, label: 'H+0' },
    { index: 9, label: 'H+3' },
    { index: 10, label: 'H+7' },
    { index: 11, label: 'H+14' },
    { index: 12, label: 'H+22' },
  ];

  const normalizeName = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const birthDateOf = (patient) => (patient.tanggal_lahir ? normalizeDate(patient.tanggal_lahir) : '');

  // PostgREST returns rows unordered, and two children can share a name and a birth date,
  // so an exact-name match is resolved by a stable key: registered, then birth date, then No RM.
  const existingCircumcisions = await selectAll('circumcisions', 'id, pasien_id, sumber_data');
  const registeredPatientIds = new Set(
    existingCircumcisions.filter((row) => row.sumber_data === 'SUNAT').map((row) => row.pasien_id)
  );

  const pickExactMatch = (name, birthDate) => {
    const matches = patients.filter((patient) => normalizeName(patient.nama) === name);
    if (matches.length <= 1) return matches[0] || null;

    const registered = matches.filter((patient) => registeredPatientIds.has(patient.id));
    const pool = registered.length > 0 ? registered : matches;
    const sameBirthDate = pool.filter((patient) => birthDate && birthDateOf(patient) === birthDate);
    const narrowed = sameBirthDate.length > 0 ? sameBirthDate : pool;
    return [...narrowed].sort((a, b) => String(a.no_rm).localeCompare(String(b.no_rm)))[0];
  };

  // Matching order: exact name, then birth date plus a shared name token, then a unique
  // birth date when the name differs. The last step is a spelling variant more often than
  // a second child, so it is attached and flagged for the clinic to verify.
  const nameCompatibleMatch = (row) => {
    const name = normalizeName(row[0]);
    const birthDate = normalizeDate(row[1]);
    const tokens = name.split(' ').filter((token) => token.length >= 4);

    const exact = pickExactMatch(name, birthDate);
    if (exact) return exact;

    if (!birthDate) return null;
    const withToken = patients.filter(
      (patient) =>
        birthDateOf(patient) === birthDate && tokens.some((t) => normalizeName(patient.nama).includes(t))
    );
    return withToken.length === 1 ? withToken[0] : null;
  };

  const findPatient = (row, allowBirthDateOnly) => {
    const compatible = nameCompatibleMatch(row);
    if (compatible) return { patient: compatible, via: 'nama' };

    if (!allowBirthDateOnly) return { patient: null, via: null };

    const birthDate = normalizeDate(row[1]);
    if (!birthDate) return { patient: null, via: null };

    const byBirthDate = patients.filter((patient) => birthDateOf(patient) === birthDate);
    return byBirthDate.length === 1 ? { patient: byBirthDate[0], via: 'tanggal' } : { patient: null, via: null };
  };

  const sunatRows = readCsv(FILES.sunat).rows.filter((row) => normalizeName(row[0]));

  const sequenceByPrefix = new Map();
  patients.forEach((patient) => {
    const match = /^(\d{2})-(\d{2})-(\d{6})$/.exec(String(patient.no_rm || ''));
    if (!match) return;
    const prefix = `${match[1]}-${match[2]}-`;
    sequenceByPrefix.set(prefix, Math.max(sequenceByPrefix.get(prefix) || 0, Number.parseInt(match[3], 10)));
  });

  const sunatNewPatients = [];
  for (const row of sunatRows) {
    // Create only when nothing on file matches by name, by name token, or by a unique
    // birth date. A shared birth date with no name overlap is not enough evidence to
    // reuse an existing child, so the register row becomes a new patient and the clash is
    // recorded in catatan for the clinic to merge if it turns out to be the same boy.
    if (findPatient(row, true).patient) continue;

    const birthDate = normalizeDate(row[1]);

    const jkCode = genderRmCode((row[5] || '').trim() === 'Perempuan' ? 'Perempuan' : 'Laki-laki');
    const desaCode = desaRmCode(row[3]);
    const prefix = `${jkCode}-${desaCode}-`;
    const next = (sequenceByPrefix.get(prefix) || 0) + 1;
    sequenceByPrefix.set(prefix, next);

    sunatNewPatients.push({
      no_rm: formatRm(jkCode, desaCode, next),
      sumber_data: 'DATAPASIEN',
      gelar: 'An',
      nama: limit(row[0], 150) || 'Tanpa Nama',
      jenis_kelamin: 'Laki-laki',
      tanggal_lahir: limit(row[1], 20),
      usia: parseAge(String(row[4] || '').replace(/[^0-9]/g, '')),
      desa: normalizeDesa(row[3]).value,
      alamat: (row[2] || '').trim() || null,
      no_telepon: limit(row[7], 30),
    });
  }

  counts.sunatPatientsCreated = await insertBatched('patients', sunatNewPatients);

  if (dryRun) {
    sunatNewPatients.forEach((row, index) => patients.push({ id: `dry-sunat-${index}`, ...row }));
  } else if (sunatNewPatients.length > 0) {
    patients = await selectAll('patients');
  }
  reindex();

  const circumcisionsToInsert = [];

  for (const row of sunatRows) {
    const { patient, via } = findPatient(row, true);
    if (!patient) {
      counts.sunatUnresolved += 1;
      report.sunatUnresolvedNames.push(
        `${limit(row[0], 60) || '(tanpa nama)'} | lahir ${normalizeDate(row[1]) || '(kosong)'} | desa ${limit(row[3], 30) || '(kosong)'}`
      );
      continue;
    }

    const alamat = (row[2] || '').trim() || null;
    const telepon = limit(row[7], 30);
    const patch = {};
    if (alamat && !String(patient.alamat || '').trim()) patch.alamat = alamat;
    if (telepon && !String(patient.no_telepon || '').trim()) patch.no_telepon = telepon;
    if (Object.keys(patch).length > 0) {
      if (!dryRun) {
        const { error } = await supabase.from('patients').update(patch).eq('id', patient.id);
        if (error) throw new Error(`sunat patient: ${error.message}`);
      }
      counts.sunatPatientsCompleted += 1;
    }

    if (via === 'tanggal') counts.sunatPatientsAmbiguous += 1;

    if (registeredPatientIds.has(patient.id)) continue;
    registeredPatientIds.add(patient.id);

    const followUpNote = FOLLOW_UP_COLUMNS.filter((column) => (row[column.index] || '').trim())
      .map((column) => `Catatan tindak lanjut ${column.label}: ${(row[column.index] || '').trim()}`)
      .join(' ');

    const patientBirthDate = birthDateOf(patient);
    const birthDateClash = patientBirthDate
      ? patients.filter((other) => other.id !== patient.id && birthDateOf(other) === patientBirthDate)
      : [];

    circumcisionsToInsert.push({
      pasien_id: patient.id,
      tanggal_tindakan: null,
      metode: 'Belum dicatat',
      berat_badan: limit(row[6], 20),
      biaya: 0,
      sumber_data: 'SUNAT',
      catatan: [
        'Diimpor dari register SUNAT. Tanggal tindakan belum tercatat.',
        via === 'tanggal'
          ? `Nama pada register (${limit(row[0], 60)}) berbeda dari nama pasien; mohon diverifikasi.`
          : null,
        birthDateClash.length > 0
          ? `Ada pasien lain dengan tanggal lahir sama (No RM ${birthDateClash
              .map((other) => other.no_rm)
              .join(', ')}); mohon diverifikasi agar tidak ganda.`
          : null,
        followUpNote || null,
      ]
        .filter(Boolean)
        .join(' '),
    });
  }

  counts.circumcisionsFromSunat = await insertBatched('circumcisions', circumcisionsToInsert);
}

// ------------------------------------------------------- 8. bidan referral source

for (const visit of allVisits) {
  const bidan = extractBidan(visit.keterangan_tindakan);
  if (!bidan || visit.bidan_rujukan === bidan) continue;
  if (!dryRun) {
    const { error } = await supabase.from('visits').update({ bidan_rujukan: bidan }).eq('id', visit.id);
    if (error) throw new Error(`bidan_rujukan: ${error.message}`);
  }
  counts.bidanRowsSet += 1;
}

// ---------------------------------------------------------- 9. verify and report

const finalPatients = await selectAll('patients');
const finalVisits = await selectAll('visits', 'id, bidan_rujukan');
const finalCircumcisions = await selectAll('circumcisions', 'id, sumber_data, tanggal_tindakan');

const keyCounts = new Map();
finalPatients.forEach((patient) => {
  const key = patientKeyOf(patient.no_rm);
  keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
});
const duplicateKeys = [...keyCounts.values()].filter((count) => count > 1).length;

const monitorRegisterKeys = new Set([
  ...existingRegisterByKey.keys(),
  ...registerToInsert.map((entry) => `${entry.visit_id}|${entry.program_type}`),
]);
const monitorRegisterMissing = [...monitorExpectedKeys].filter(
  (key) => !monitorRegisterKeys.has(key)
).length;

const sourceBidanRows = rekam.rows.filter((row) => extractBidan(row[VISIT_COLUMNS.keteranganTindakan]));
const sourceBidanNames = new Set(
  sourceBidanRows.map((row) => extractBidan(row[VISIT_COLUMNS.keteranganTindakan]))
);
const existingBidanRows = allVisits.filter((visit) => visit.bidan_rujukan).length;
const plannedBidanRows = visitsToInsert.filter((visit) => extractBidan(visit.keterangan_tindakan)).length;
const bidanTotal = existingBidanRows + counts.bidanRowsSet + (dryRun ? plannedBidanRows : 0);
const programs = [...existingRegister, ...registerToInsert].reduce((acc, row) => {
  acc[row.program_type] = (acc[row.program_type] || 0) + 1;
  return acc;
}, {});

const expectedVisitCount = rekam.rows.length;
const checks = [
  {
    name: 'Identitas pasien ganda',
    expected: '0',
    actual: dryRun ? `${duplicateKeys} rencana digabung` : String(duplicateKeys),
    pass: dryRun ? counts.mergedGroups === duplicateKeys : duplicateKeys === 0,
  },
  {
    name: 'Jumlah kunjungan sama dengan baris REKAMMEDIS',
    expected: String(expectedVisitCount),
    actual: dryRun ? `${visitCountBefore} + ${counts.insertedVisits} rencana` : String(finalVisits.length),
    pass: (dryRun ? visitCountBefore + counts.insertedVisits : finalVisits.length) === expectedVisitCount,
  },
  {
    name: 'Kunjungan tidak berkurang',
    expected: `>= ${visitCountBefore}`,
    actual: dryRun ? String(visitCountBefore) : String(finalVisits.length),
    pass: (dryRun ? visitCountBefore : finalVisits.length) >= visitCountBefore,
  },
  {
    name: 'Baris MONITOR terpetakan ke kunjungan',
    expected: '808',
    actual: String(counts.monitorResolved),
    pass: counts.monitorResolved === 808,
  },
  {
    name: 'Setiap baris MONITOR punya baris register',
    expected: '0 belum terpenuhi',
    actual: String(monitorRegisterMissing),
    pass: monitorRegisterMissing === 0,
  },
  {
    name: 'MONITOR tidak terpetakan',
    expected: '0',
    actual: String(report.unknownMonitor.size),
    pass: report.unknownMonitor.size === 0,
  },
  {
    name: 'Baris rujukan bidan sesuai sumber',
    expected: String(sourceBidanRows.length),
    actual: String(bidanTotal),
    pass: bidanTotal === sourceBidanRows.length,
  },
  {
    name: 'Nama bidan terdistinct di sumber',
    expected: '9',
    actual: String(sourceBidanNames.size),
    pass: sourceBidanNames.size === 9,
  },
  {
    name: 'Register sirkumsisi dari SUNAT',
    expected: '43',
    actual: String(
      finalCircumcisions.filter((row) => row.sumber_data === 'SUNAT').length +
        (dryRun ? counts.circumcisionsFromSunat : 0)
    ),
    pass:
      finalCircumcisions.filter((row) => row.sumber_data === 'SUNAT').length +
        (dryRun ? counts.circumcisionsFromSunat : 0) ===
      43,
  },
];

console.log('\n=== RINGKASAN REKONSILIASI ===\n');
const lines = [
  ['Pasien sebelum', patientCountBefore],
  ['Kelompok identitas ganda', counts.mergedGroups],
  ['Baris pasien ganda dihapus', counts.mergedRowsRemoved],
  ['No RM dipulihkan ke 9 digit', counts.paddedPatients],
  ['Pasien baru dari log kunjungan', counts.insertedPatientsFromVisits],
  ['Pasien baru dari master pasien', counts.insertedPatientsFromMaster],
  ['Pasien diperkaya pekerjaan', counts.enrichedPekerjaan],
  ['Pasien diperkaya alergi', counts.enrichedAlergi],
  ['Pasien diperkaya telepon', counts.enrichedTelepon],
  ['Kunjungan baru', counts.insertedVisits],
  ['Baris kas baru', counts.insertedCashFlows],
  ['Register baru dari MONITOR', counts.registerFromMonitor],
  ['Baris MONITOR terpetakan', counts.monitorResolved],
  ['Register baru dari skrining', counts.registerFromScreening],
  ['Skrining diperbarui', counts.screeningUpdated],
  ['Skrining tidak cocok', counts.screeningUnmatched],
  ['Pasien sunat dilengkapi', counts.sunatPatientsCompleted],
  ['Pasien sunat dibuat baru', counts.sunatPatientsCreated],
  ['Pasien sunat ambigu (perlu review)', counts.sunatPatientsAmbiguous],
  ['Baris sunat tanpa pasien', counts.sunatUnresolved],
  ['Register sirkumsisi dibuat', counts.circumcisionsFromSunat],
  ['bidan_rujukan diisi', counts.bidanRowsSet],
  ['Total pasien sesudah', finalPatients.length],
];
lines.forEach(([label, value]) => console.log(`  ${String(label).padEnd(32)}: ${value}`));
console.log(`  ${'Register per program'.padEnd(32)}: ${JSON.stringify(programs)}`);
console.log(`  ${'Nama bidan (sumber)'.padEnd(32)}: ${[...sourceBidanNames].sort().join(', ') || '-'}`);
if (report.sunatUnresolvedNames.length > 0) {
  console.log(`\n  Baris SUNAT yang belum punya pasien:`);
  report.sunatUnresolvedNames.forEach((entry) => console.log(`    - ${entry}`));
}

console.log('\n=== PEMERIKSAAN ===\n');
checks.forEach((check) => {
  console.log(`  [${check.pass ? 'LULUS' : 'GAGAL'}] ${check.name}: harap ${check.expected}, dapat ${check.actual}`);
});

const failed = checks.filter((check) => !check.pass);

if (!dryRun) {
  const reportPath = path.resolve(
    process.cwd(),
    `docs/data/reconciliation-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        target: projectRef,
        counts,
        checks,
        registers: programs,
        bidan: [...sourceBidanNames].sort(),
        unknownMonitor: Object.fromEntries(report.unknownMonitor),
        unknownDesa: Object.fromEntries(report.unknownDesa),
        irregularRmCount: report.irregularRm.size,
        sunatUnresolvedNames: report.sunatUnresolvedNames,
        invalidDateRows: report.invalidDate,
        invalidTimeRows: report.invalidTime,
      },
      null,
      2
    )
  );
  console.log(`\nLaporan: ${path.relative(process.cwd(), reportPath)}`);
}

if (failed.length > 0) {
  console.error('\nGAGAL: ada pemeriksaan yang tidak lolos.');
  process.exit(2);
}

console.log(
  dryRun
    ? '\nPratinjau selesai, tidak ada yang ditulis. Terapkan dengan --confirm-dev-reset.'
    : '\nRekonsiliasi selesai.'
);
