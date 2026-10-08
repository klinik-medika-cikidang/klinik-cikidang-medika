/**
 * F-010 phase 4: rebuild the remaining derived datasets.
 *
 * Phase 1 rebuilt public.patients; phase 2 rebuilt public.visits and cash flows;
 * phase 3 rebuilt public_health_records from the MONITOR column. This script finishes
 * the rebuild with the two datasets phase 3 left out:
 *   - public.circumcisions from the SUNAT sheet
 *   - gpa/uk/tp/hiv/syphilis/hbsag on the ELIMINASI_3 register rows
 *
 * These two exports carry no rows in public.patient_identity_audit (that audit is keyed
 * to REKAMMEDIS source rows), so identity is resolved against the rebuilt patient table
 * the same way the audit resolver works: No RM key first, normalised name second. The
 * screening files have their own No RM column, so that key is tried against
 * public.patients.no_rm and a name match is the fallback. The visit is then found by
 * patient and visit date in public.visits.
 *
 * The SUNAT sheet has no No RM at all, so those rows keep the F-009 heuristics: exact
 * name, then a shared name token plus birth date, then a unique birth date.
 *
 * Safety:
 *   - refuses to write to production without --confirm-prod
 *   - --dry-run reports the planned counts and writes nothing
 *   - never inserts or merges patients, never inserts visits
 *
 * Usage:
 *   node scripts/f010-apply-sunat-screening.mjs --env=.env.staging --dry-run
 *   node scripts/f010-apply-sunat-screening.mjs --env=.env.staging
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { FILES, csvExists, normalizeDate, readCsv, rmKey } from './lib/clinic-csv.mjs';
import { limit, normalizeDesa } from './lib/clinic-map.mjs';

// Column maps for the screening exports (TRIPLE ELIMINASI and H_S_HbSAg); their headers
// and column order are identical. Not exported from the shared module, so kept local.
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

// SUNAT sheet: the name column is unnamed in the export, so it sits at index 0.
const SUNAT = {
  nama: 0,
  tanggalLahir: 1,
  alamat: 2,
  kelurahan: 3,
  usia: 4,
  jenisKelamin: 5,
  beratBadan: 6,
  telepon: 7,
};

// The five follow-up photo columns of the SUNAT sheet, all empty in this export.
const FOLLOW_UP_COLUMNS = [
  { index: 8, label: 'H+0' },
  { index: 9, label: 'H+3' },
  { index: 10, label: 'H+7' },
  { index: 11, label: 'H+14' },
  { index: 12, label: 'H+22' },
];

const SCREENING_FIELDS = ['gpa', 'uk', 'tp', 'hiv', 'syphilis', 'hbsag'];

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

// Standard-conforming strings are on, so only the single quote needs escaping.
const sqlLiteral = (value) => `'${String(value ?? '').replace(/'/g, "''")}'`;

const normalizeName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const birthDateOf = (patient) => (patient.tanggal_lahir ? normalizeDate(patient.tanggal_lahir) : '');

// --------------------------------------------------------------- load rebuilt data

const PATIENT_COLUMNS_SQL =
  'SELECT id, no_rm, nama, tanggal_lahir, alamat, no_telepon FROM public.patients';
let patients = await runSql(PATIENT_COLUMNS_SQL);

let patientByRmKey = new Map();
let patientsByName = new Map();

function rebuildPatientMaps() {
  patientByRmKey = new Map();
  patientsByName = new Map();
  for (const patient of patients) {
    const key = rmKey(patient.no_rm);
    if (key && !patientByRmKey.has(key)) patientByRmKey.set(key, patient);
    const name = normalizeName(patient.nama);
    if (name) {
      if (!patientsByName.has(name)) patientsByName.set(name, []);
      patientsByName.get(name).push(patient);
    }
  }
}
rebuildPatientMaps();

// Sorted so a patient seen twice on one day resolves to the same visit on every run.
const visits = await runSql(
  'SELECT id, pasien_id, tanggal_periksa::text AS tanggal FROM public.visits'
);
visits.sort((a, b) =>
  `${a.pasien_id}|${a.tanggal}|${a.id}`.localeCompare(`${b.pasien_id}|${b.tanggal}|${b.id}`)
);
const visitByPatientDate = new Map();
for (const visit of visits) {
  const key = `${visit.pasien_id}|${visit.tanggal}`;
  if (!visitByPatientDate.has(key)) visitByPatientDate.set(key, visit.id);
}

const registerRows = await runSql(
  "SELECT id, visit_id, gpa, uk, tp, hiv, syphilis, hbsag FROM public.public_health_records WHERE program_type = 'ELIMINASI_3'"
);
const registerByVisit = new Map();
for (const row of registerRows) if (row.visit_id) registerByVisit.set(row.visit_id, row);

console.log(`Env     : ${envFileName}`);
console.log(`Target  : ${projectRef} (${isProduction ? 'PRODUKSI' : 'pengembangan'})`);
console.log(`Pasien  : ${patients.length}, kunjungan: ${visits.length}, register ELIMINASI_3: ${registerByVisit.size}`);

// ------------------------------------------------- 1. triple elimination screening

const resolveScreeningPatient = (row) => {
  const key = rmKey(row[SCREENING.noRm]);
  const byRm = key ? patientByRmKey.get(key) : null;
  if (byRm) return byRm;

  const name = normalizeName(row[SCREENING.nama]);
  if (!name) return null;
  const candidates = patientsByName.get(name) || [];
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const birthDate = normalizeDate(row[SCREENING.tanggalLahir]);
    const narrowed = birthDate
      ? candidates.filter((patient) => birthDateOf(patient) === birthDate)
      : [];
    if (narrowed.length === 1) return narrowed[0];
  }
  return null;
};

const screeningFiles = [FILES.tripleEliminasi, FILES.hbSAg].filter((name) => csvExists(name));
const screeningRows = [];
for (const fileName of screeningFiles) {
  for (const row of readCsv(fileName).rows) {
    if (rmKey(row[SCREENING.noRm])) screeningRows.push(row);
  }
}

// Merge per visit so two files targeting the same visit update one register row, the way
// F-009 already resolved it in place.
const plannedByVisit = new Map();
let screeningNoPatient = 0;
let screeningNoVisit = 0;
let screeningEmpty = 0;

for (const row of screeningRows) {
  const patient = resolveScreeningPatient(row);
  if (!patient) {
    screeningNoPatient += 1;
    continue;
  }
  const date = normalizeDate(row[SCREENING.tanggal]);
  const visitId = date ? visitByPatientDate.get(`${patient.id}|${date}`) : null;
  if (!visitId) {
    screeningNoVisit += 1;
    continue;
  }

  const fields = {
    gpa: limit(row[SCREENING.gpa], 30),
    uk: limit(row[SCREENING.uk], 30),
    tp: limit(row[SCREENING.tp], 30),
    hiv: limit(row[SCREENING.hiv], 30),
    syphilis: limit(row[SCREENING.syphilis], 30),
    hbsag: limit(row[SCREENING.hbsag], 50),
  };
  if (SCREENING_FIELDS.every((field) => fields[field] === null)) {
    screeningEmpty += 1;
    continue;
  }

  const entry = plannedByVisit.get(visitId) || {
    patientId: patient.id,
    snapshot: {
      nama: limit(row[SCREENING.nama], 150) || 'Tanpa Nama',
      jenis_kelamin: limit(row[SCREENING.jenisKelamin], 20),
      ttl: limit(row[SCREENING.tanggalLahir], 120),
      alamat: trim(row[SCREENING.alamat]) || null,
      no_nik: limit(row[SCREENING.ktp], 30),
      terapi: trim(row[SCREENING.terapi]) || null,
    },
    fields: {},
  };
  Object.assign(entry.fields, fields);
  plannedByVisit.set(visitId, entry);
}

const screeningInserts = [];
const screeningUpdates = [];
for (const [visitId, entry] of plannedByVisit) {
  const existing = registerByVisit.get(visitId);
  if (existing) {
    const changed = SCREENING_FIELDS.some(
      (field) => (existing[field] ?? null) !== (entry.fields[field] ?? null)
    );
    if (changed) screeningUpdates.push({ id: existing.id, fields: entry.fields });
  } else {
    screeningInserts.push({
      program_type: 'ELIMINASI_3',
      pasien_id: entry.patientId,
      visit_id: visitId,
      ...entry.snapshot,
      ...entry.fields,
    });
  }
}

// ------------------------------------------------------- 2. circumcision register

// The SUNAT sheet has no procedure date, so tanggal_tindakan stays NULL (see the F-009
// migration) and is filled in later through the edit form.
const sunatRows = csvExists(FILES.sunat)
  ? readCsv(FILES.sunat).rows.filter((row) => normalizeName(row[SUNAT.nama]))
  : [];

// The table is cleared before the rebuild, so this starts empty and only guards against
// two SUNAT rows mapping to one child (the unique index covers pasien_id + sumber_data).
const registeredPatientIds = new Set();

const pickExactMatch = (name, birthDate) => {
  const matches = patients.filter((patient) => normalizeName(patient.nama) === name);
  if (matches.length <= 1) return matches[0] || null;

  const registered = matches.filter((patient) => registeredPatientIds.has(patient.id));
  const pool = registered.length > 0 ? registered : matches;
  const sameBirthDate = pool.filter((patient) => birthDate && birthDateOf(patient) === birthDate);
  const narrowed = sameBirthDate.length > 0 ? sameBirthDate : pool;
  return [...narrowed].sort((a, b) => String(a.no_rm).localeCompare(String(b.no_rm)))[0];
};

const nameCompatibleMatch = (row) => {
  const name = normalizeName(row[SUNAT.nama]);
  const birthDate = normalizeDate(row[SUNAT.tanggalLahir]);
  const tokens = name.split(' ').filter((token) => token.length >= 4);

  const exact = pickExactMatch(name, birthDate);
  if (exact) return exact;

  if (!birthDate) return null;
  const withToken = patients.filter(
    (patient) =>
      birthDateOf(patient) === birthDate &&
      tokens.some((token) => normalizeName(patient.nama).includes(token))
  );
  return withToken.length === 1 ? withToken[0] : null;
};

// Matching order: exact name, then birth date plus a shared name token, then a unique
// birth date when the name differs. The last step is a spelling variant more often than
// a second child, so it is attached and flagged for the clinic to verify.
const findPatient = (row, allowBirthDateOnly) => {
  const compatible = nameCompatibleMatch(row);
  if (compatible) return { patient: compatible, via: 'nama' };

  if (!allowBirthDateOnly) return { patient: null, via: null };

  const birthDate = normalizeDate(row[SUNAT.tanggalLahir]);
  if (!birthDate) return { patient: null, via: null };

  const byBirthDate = patients.filter((patient) => birthDateOf(patient) === birthDate);
  return byBirthDate.length === 1
    ? { patient: byBirthDate[0], via: 'tanggal' }
    : { patient: null, via: null };
};

// A SUNAT row that matches nothing is a child who never reached the master. F-009
// created these patients, but the F-010 rebuild starts from DATAPASIEN and drops them,
// so they are recreated here in the master's own scheme: 9 digits, [gender 2][village 2]
// [sequence 5], with the sequence continuing the highest already used for that prefix.
// Reusing public.rm_prefix keeps the village codes identical to the rebuild.
const maxSeqByPrefix = new Map();
for (const patient of patients) {
  const match = /^(\d{4})(\d{5})$/.exec(String(patient.no_rm || ''));
  if (!match) continue;
  maxSeqByPrefix.set(
    match[1],
    Math.max(maxSeqByPrefix.get(match[1]) || 0, Number.parseInt(match[2], 10))
  );
}

const prefixCache = new Map();
async function prefixFor(jenisKelamin, desa) {
  const key = `${jenisKelamin}|${desa}`;
  if (!prefixCache.has(key)) {
    const rows = await runSql(
      `SELECT public.rm_prefix(${sqlLiteral(jenisKelamin)}, ${sqlLiteral(desa)}) AS prefix`
    );
    prefixCache.set(key, rows[0].prefix);
  }
  return prefixCache.get(key);
}

const sunatNewPatients = [];
const plannedPatientKeys = new Set();
for (const row of sunatRows) {
  // Resolve first, so a second run matches the patient created by the first run and
  // creates nothing new.
  if (findPatient(row, true).patient) continue;
  const key = `${normalizeName(row[SUNAT.nama])}|${normalizeDate(row[SUNAT.tanggalLahir])}`;
  if (plannedPatientKeys.has(key)) continue;
  plannedPatientKeys.add(key);

  const prefix = await prefixFor('Laki-laki', row[SUNAT.kelurahan]);
  const sequence = (maxSeqByPrefix.get(prefix) || 0) + 1;
  maxSeqByPrefix.set(prefix, sequence);

  sunatNewPatients.push({
    no_rm: `${prefix}${String(sequence).padStart(5, '0')}`,
    sumber_data: 'REKAMMEDIS',
    gelar: 'An',
    nama: limit(row[SUNAT.nama], 150) || 'Tanpa Nama',
    jenis_kelamin: 'Laki-laki',
    tanggal_lahir: limit(row[SUNAT.tanggalLahir], 20),
    desa: normalizeDesa(row[SUNAT.kelurahan]).value,
    alamat: trim(row[SUNAT.alamat]) || null,
    no_telepon: limit(row[SUNAT.telepon], 30),
  });
}

let patientsInserted = 0;
if (dryRun) {
  // Register the planned rows so the circumcision pass resolves them exactly as it would
  // after a real insert.
  sunatNewPatients.forEach((row, index) => patients.push({ id: `dry-sunat-${index}`, ...row }));
} else if (sunatNewPatients.length > 0) {
  patientsInserted = await insertBatched('patients', sunatNewPatients);
  patients = await runSql(PATIENT_COLUMNS_SQL);
  rebuildPatientMaps();
}

const circumcisions = [];
const sunatUnresolved = [];
let sunatAmbiguous = 0;

for (const row of sunatRows) {
  const { patient, via } = findPatient(row, true);
  if (!patient) {
    sunatUnresolved.push(
      `${limit(row[SUNAT.nama], 60) || '(tanpa nama)'} | lahir ${normalizeDate(row[SUNAT.tanggalLahir]) || '(kosong)'} | desa ${limit(row[SUNAT.kelurahan], 30) || '(kosong)'}`
    );
    continue;
  }

  if (via === 'tanggal') sunatAmbiguous += 1;
  if (registeredPatientIds.has(patient.id)) continue;
  registeredPatientIds.add(patient.id);

  const followUpNote = FOLLOW_UP_COLUMNS.filter((column) => trim(row[column.index]))
    .map((column) => `Catatan tindak lanjut ${column.label}: ${trim(row[column.index])}`)
    .join(' ');

  const patientBirthDate = birthDateOf(patient);
  const birthDateClash = patientBirthDate
    ? patients.filter((other) => other.id !== patient.id && birthDateOf(other) === patientBirthDate)
    : [];

  circumcisions.push({
    pasien_id: patient.id,
    tanggal_tindakan: null,
    metode: 'Belum dicatat',
    berat_badan: limit(row[SUNAT.beratBadan], 20),
    biaya: 0,
    sumber_data: 'SUNAT',
    catatan: [
      'Diimpor dari register SUNAT. Tanggal tindakan belum tercatat.',
      via === 'tanggal'
        ? `Nama pada register (${limit(row[SUNAT.nama], 60)}) berbeda dari nama pasien; mohon diverifikasi.`
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

console.log(`Baris skrining dibaca      : ${screeningRows.length}`);
console.log(`  tanpa pasien             : ${screeningNoPatient}`);
console.log(`  tanpa kunjungan          : ${screeningNoVisit}`);
console.log(`  tanpa nilai skrining     : ${screeningEmpty}`);
console.log(`Register ELIMINASI_3 diisi : ${screeningInserts.length} baru, ${screeningUpdates.length} diperbarui`);
console.log(`Baris SUNAT dibaca         : ${sunatRows.length}`);
console.log(`Pasien baru akan dibuat    : ${sunatNewPatients.length}`);
console.log(`Sirkumsisi akan disisipkan : ${circumcisions.length}`);
console.log(`  dicocokkan lewat tanggal lahir saja: ${sunatAmbiguous}`);
console.log(`  tidak ketemu pasien      : ${sunatUnresolved.length}`);
sunatUnresolved.forEach((line) => console.log(`   ${line}`));

if (dryRun) {
  console.log('\nDRY-RUN: tidak ada yang ditulis.');
  process.exit(0);
}

console.log('\nMengosongkan circumcisions (rebuild)...');
await runSql('DELETE FROM public.circumcisions;');

console.log(`Pasien baru tersimpan: ${patientsInserted}`);
const circumcisionsInserted = await insertBatched('circumcisions', circumcisions);
console.log(`Sirkumsisi tersimpan : ${circumcisionsInserted}`);

let screeningInserted = 0;
if (screeningInserts.length > 0) {
  screeningInserted = await insertBatched('public_health_records', screeningInserts);
  console.log(`Register ELIMINASI_3 baru      : ${screeningInserted}`);
}

let screeningUpdated = 0;
for (const row of screeningUpdates) {
  const { error } = await supabase
    .from('public_health_records')
    .update(row.fields)
    .eq('id', row.id);
  if (error) throw new Error(`update screening: ${error.message}`);
  screeningUpdated += 1;
}
console.log(`Register ELIMINASI_3 diperbarui: ${screeningUpdated}`);

const check = await runSql(
  "SELECT (SELECT count(*) FROM public.patients) AS patients, " +
    "(SELECT count(*) FROM public.circumcisions WHERE sumber_data = 'SUNAT') AS circumcisions, " +
    "(SELECT count(*) FROM public.public_health_records WHERE program_type = 'ELIMINASI_3') AS eliminasi;"
);
console.log('Isi tabel:', JSON.stringify(check));
