/**
 * Run the full F-010 pipeline in order, so production promotion never runs the
 * steps out of sequence.
 *
 * Steps:
 *   1. backup            scripts/backup-clinic-data.mjs
 *   2. load staging      scripts/f010-load-staging.mjs
 *   3. identity (1)      scripts/f010-rebuild-identity.sql  via apply-sql.mjs
 *   4. visits + cash (2) scripts/f010-apply-derived.mjs
 *   5. register (3)      scripts/f010-apply-registers.mjs
 *   6. sunat + screen (4) scripts/f010-apply-sunat-screening.mjs
 *   7. verify
 *
 * Safety:
 *   - production requires --confirm-prod
 *   - --dry-run runs only the non-destructive steps in dry mode and prints the
 *     phase 1 SQL path instead of executing it
 *
 * Usage:
 *   node scripts/f010-promote.mjs --env=.env.staging --dry-run
 *   node scripts/f010-promote.mjs --env=.env.staging --confirm-dev-reset
 *   node scripts/f010-promote.mjs --env=.env.production --confirm-prod
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

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
  console.error('DIHENTIKAN: target adalah PRODUKSI. Tambahkan --confirm-prod bila memang disengaja.');
  process.exit(1);
}
if (!isProduction && !dryRun && !process.argv.includes('--confirm-dev-reset')) {
  console.error('DIHENTIKAN: langkah ini mengganti isi database pengembangan. Tambahkan --confirm-dev-reset.');
  process.exit(1);
}

const childEnv = { ...process.env, SUPABASE_ACCESS_TOKEN: token };

function run(label, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: childEnv });
  if (result.status !== 0) {
    console.error(`\nGAGAL pada langkah: ${label}`);
    process.exit(result.status || 1);
  }
}

function runSql(label, file) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(
    process.execPath,
    ['scripts/apply-sql.mjs', `--env=${envFileName}`, `--file=${file}`, ...(isProduction ? ['--confirm-prod'] : [])],
    { stdio: 'inherit', env: childEnv }
  );
  if (result.status !== 0) {
    console.error(`\nGAGAL pada langkah: ${label}`);
    process.exit(result.status || 1);
  }
}

console.log(`Env    : ${envFileName}`);
console.log(`Target : ${projectRef} (${isProduction ? 'PRODUKSI' : 'pengembangan'})`);
console.log(`Mode   : ${dryRun ? 'DRY-RUN' : 'NYATA'}`);

const passthrough = dryRun ? ['--dry-run'] : [];

if (!dryRun) {
  run('1. Backup', ['scripts/backup-clinic-data.mjs', projectRef, 'f010-promote-prebuild']);
}

run('2. Muat staging', ['scripts/f010-load-staging.mjs', `--env=${envFileName}`, ...passthrough]);

if (dryRun) {
  console.log('\n=== 3. Rebuild identitas (fase 1) ===');
  console.log('DRY-RUN: dilewati. Jalankan manual: scripts/f010-rebuild-identity.sql');
} else {
  runSql('3. Rebuild identitas (fase 1)', 'scripts/f010-rebuild-identity.sql');
}

run('4. Kunjungan dan kas (fase 2)', ['scripts/f010-apply-derived.mjs', `--env=${envFileName}`, ...passthrough]);
run('5. Register dan bidan (fase 3)', ['scripts/f010-apply-registers.mjs', `--env=${envFileName}`, ...passthrough]);
run('6. Sirkumsisi dan skrining (fase 4)', ['scripts/f010-apply-sunat-screening.mjs', `--env=${envFileName}`, ...passthrough]);

console.log('\n=== 7. Verifikasi ===');
const verify = spawnSync(
  process.execPath,
  [
    'scripts/apply-sql.mjs',
    `--env=${envFileName}`,
    '--query=SELECT (SELECT count(*) FROM public.patients) AS patients, (SELECT count(*) FROM public.visits) AS visits, (SELECT count(*) FROM public.public_health_records) AS registers, (SELECT count(*) FROM public.circumcisions) AS circumcisions, (SELECT count(*) FROM public.patient_identity_audit WHERE status <> \'COCOK\') AS perlu_tinjauan;',
    ...(isProduction ? ['--confirm-prod'] : []),
  ],
  { stdio: 'inherit', env: childEnv }
);

if (verify.status !== 0) process.exit(verify.status || 1);
console.log('\nSelesai.');
