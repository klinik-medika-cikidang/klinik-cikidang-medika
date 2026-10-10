/**
 * Dump clinic tables to a local JSON file as a rollback safety net.
 *
 * Runs read-only through the Supabase Management API, so it needs a personal
 * access token rather than database credentials. Output lands in `docs/data/`,
 * which is gitignored because it contains patient data.
 *
 * Usage:
 *   node scripts/backup-clinic-data.mjs --env=.env.production [label]
 *   SUPABASE_ACCESS_TOKEN=... node scripts/backup-clinic-data.mjs <projectRef> [label]
 */

import fs from 'fs';
import path from 'path';

function readEnv(envFileName) {
  const envPath = path.resolve(process.cwd(), envFileName);
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
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

const envFileName = argOf('env');
const fileEnv = envFileName ? readEnv(envFileName) : {};
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

// With --env the positional argument is the label; otherwise it is the project ref.
const projectRef = envFileName
  ? fileEnv.SUPABASE_PROJECT_REF ||
    /https:\/\/([^.]+)\./.exec(fileEnv.NEXT_PUBLIC_SUPABASE_URL || '')?.[1]
  : positional[0];
const label = (envFileName ? positional[0] : positional[1]) || 'backup';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || fileEnv.SUPABASE_ACCESS_TOKEN;

if (!projectRef) {
  console.error('Project ref tidak ditemukan. Sertakan --env=<file> atau argumen projectRef.');
  process.exit(1);
}

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN wajib diset (env atau berkas --env).');
  process.exit(1);
}

const TABLES = [
  'doctors',
  'patients',
  'visits',
  'cash_flows',
  'tbc_programs',
  'circumcisions',
  'post_cares',
  'public_health_records',
  'referral_commissions',
  'therapy_packages',
  'therapy_package_items',
  'visit_therapy_packages',
];

async function runQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Query gagal (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

async function fetchTable(tableName) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const data = await runQuery(
      `select * from public.${tableName} order by created_at limit ${pageSize} offset ${offset}`
    );
    if (!Array.isArray(data) || data.length === 0) break;

    rows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function main() {
  console.log(`Backup project: ${projectRef}`);
  const dump = { projectRef, label, createdAt: new Date().toISOString(), tables: {} };

  let totalRows = 0;
  for (const table of TABLES) {
    try {
      const rows = await fetchTable(table);
      dump.tables[table] = rows;
      totalRows += rows.length;
      console.log(`  ${table}: ${rows.length} baris`);
    } catch (error) {
      console.log(`  ${table}: dilewati (${error.message})`);
      dump.tables[table] = null;
    }
  }

  const backupDir = path.resolve(process.cwd(), 'docs/data');
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(backupDir, `${label}-${stamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(dump), 'utf-8');

  const sizeMb = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
  console.log(`\nBackup selesai: ${totalRows} baris, ${sizeMb} MB`);
  console.log(`Berkas: ${filePath}`);
}

main().catch((error) => {
  console.error('Backup gagal:', error.message);
  process.exit(1);
});
