/**
 * Audit No RM consistency between the patient master and the visit register.
 *
 * Checks, in order:
 *   1. Does any No RM in the master point to more than one person?
 *   2. Does any person in the master appear under more than one No RM?
 *   3. Does every visit's No RM exist in the master?
 *   4. Does the visit's name and birth date match the master for that No RM?
 *   5. Is every No RM in the canonical 9-digit shape?
 *
 * Read-only. Names are printed only for the flagged rows, so the operator can verify.
 *
 * Usage:
 *   node scripts/audit-rm-consistency.mjs
 */
import { readCsv, FILES, PATIENT_COLUMNS_DATAPASIEN, VISIT_COLUMNS, normalizeDate } from './lib/clinic-csv.mjs';

const norm = (value) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const digits = (value) => (value || '').replace(/[^0-9]/g, '');
const canonical9 = (value) => {
  const d = digits(value);
  if (d.length === 8) return `0${d}`;
  return d;
};

const master = readCsv(FILES.datapasien);
const visits = readCsv(FILES.rekam);

// --- Master --------------------------------------------------------------
const byRm = new Map(); // rm -> [{ nama, dob }]
const byPerson = new Map(); // normName|dob -> Set(rm)
const badFormat = [];

for (const row of master.rows) {
  const rm = canonical9(row[PATIENT_COLUMNS_DATAPASIEN.noRm]);
  const nama = (row[PATIENT_COLUMNS_DATAPASIEN.nama] || '').trim();
  const dob = normalizeDate(row[PATIENT_COLUMNS_DATAPASIEN.tanggalLahir]);
  if (!rm) continue;

  if (!/^\d{9}$/.test(rm)) badFormat.push({ rm: row[PATIENT_COLUMNS_DATAPASIEN.noRm], nama });

  if (!byRm.has(rm)) byRm.set(rm, []);
  byRm.get(rm).push({ nama, dob, raw: row[PATIENT_COLUMNS_DATAPASIEN.noRm] });

  const personKey = `${norm(nama)}|${dob}`;
  if (!byPerson.has(personKey)) byPerson.set(personKey, new Set());
  byPerson.get(personKey).add(rm);
}

const rmWithManyNames = [...byRm.entries()].filter(
  ([, people]) => new Set(people.map((p) => norm(p.nama))).size > 1
);
const personWithManyRm = [...byPerson.entries()].filter(([, rms]) => rms.size > 1);

// --- Visits vs master ----------------------------------------------------
const missingInMaster = new Map(); // rm -> count
const nameMismatch = [];
const dobMismatch = [];
const visitBadRm = new Map();

for (const row of visits.rows) {
  const rm = canonical9(row[VISIT_COLUMNS.noRm]);
  const nama = (row[VISIT_COLUMNS.nama] || '').trim();
  const dob = normalizeDate(row[VISIT_COLUMNS.tanggalLahir]);
  if (!rm) continue;

  if (!/^\d{9}$/.test(rm)) visitBadRm.set(rm, (visitBadRm.get(rm) || 0) + 1);

  const people = byRm.get(rm);
  if (!people) {
    missingInMaster.set(rm, (missingInMaster.get(rm) || 0) + 1);
    continue;
  }
  const nameOk = people.some((p) => norm(p.nama) === norm(nama));
  if (!nameOk) {
    // Only flag when the name is not blank and does not match any holder of that RM.
    if (norm(nama)) nameMismatch.push({ rm, visit: nama, master: people.map((p) => p.nama).join(' / ') });
  } else {
    const holder = people.find((p) => norm(p.nama) === norm(nama));
    if (dob && holder.dob && dob !== holder.dob) {
      dobMismatch.push({ rm, visit: nama, dobVisit: dob, dobMaster: holder.dob });
    }
  }
}

// --- Report --------------------------------------------------------------
console.log('=== AUDIT KONSISTENSI NO RM ===');
console.log(`Master DATAPASIEN : ${master.rows.length} baris, ${byRm.size} No RM unik`);
console.log(`Kunjungan REKAMMEDIS: ${visits.rows.length} baris`);
console.log('');

const line = (label, count, extra = '') =>
  console.log(`  ${count === 0 ? 'OK  ' : 'FLAG'}  ${label}: ${count}${extra}`);

console.log('Master:');
line('No RM dipakai lebih dari satu nama', rmWithManyNames.length);
line('No RM punya lebih dari satu baris', [...byRm.values()].filter((p) => p.length > 1).length);
line('Orang (nama+tgl lahir) punya lebih dari satu No RM', personWithManyRm.length);
line('No RM bukan 9 digit', badFormat.length, badFormat.length ? ` (contoh: ${badFormat.slice(0, 3).map((b) => b.raw).join(', ')})` : '');
console.log('');
console.log('Kunjungan vs Master:');
line('No RM kunjungan tidak ada di master', missingInMaster.size, missingInMaster.size ? ` (${[...missingInMaster.values()].reduce((a, b) => a + b, 0)} baris)` : '');
line('Nama kunjungan beda dari master', nameMismatch.length);
line('Tgl lahir kunjungan beda dari master', dobMismatch.length);
line('No RM kunjungan bukan 9 digit', visitBadRm.size);

if (rmWithManyNames.length) {
  console.log('\nContoh No RM dengan lebih dari satu nama:');
  for (const [rm, people] of rmWithManyNames.slice(0, 15)) {
    console.log(`  ${rm}: ${people.map((p) => p.nama).join(' | ')}`);
  }
}
if (missingInMaster.size) {
  console.log('\nContoh No RM kunjungan yang tidak ada di master:');
  for (const [rm] of [...missingInMaster.entries()].slice(0, 15)) console.log(`  ${rm}`);
}
if (nameMismatch.length) {
  console.log('\nContoh nama kunjungan yang beda dari master:');
  for (const m of nameMismatch.slice(0, 15)) console.log(`  ${m.rm}: kunjungan "${m.visit}" vs master "${m.master}"`);
}
if (personWithManyRm.length) {
  console.log('\nContoh orang dengan lebih dari satu No RM:');
  for (const [key, rms] of personWithManyRm.slice(0, 15)) {
    console.log(`  ${key.split('|')[0]} (${key.split('|')[1] || '-'}): ${[...rms].join(', ')}`);
  }
}
