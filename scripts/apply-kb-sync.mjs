import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { readCsv } from './lib/clinic-csv.mjs';
import { parseDate } from './lib/clinic-map.mjs';

function readEnv(envFileName) {
  const envPath = path.resolve(process.cwd(), envFileName);
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...values] = trimmed.split('=');
        env[key.trim()] = values.join('=').trim().replace(/^['"]|['"]$/g, '');
      }
    });
  return env;
}

const envFileName = process.argv.find((a) => a.startsWith('--env='))?.slice(6) || '.env.local';
const env = readEnv(envFileName);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function syncKb() {
  console.log(`Syncing KB records using ${envFileName}...`);
  const { data: dbRows, error: fetchErr } = await supabase
    .from('public_health_records')
    .select('id, nama, tanggal_periksa, terapi, jenis_kb, tanggal_kembali')
    .eq('program_type', 'KB');

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    process.exit(1);
  }

  const kbCsv = readCsv('LAPORAN DPP DR. ADE SOFYAN - KB.csv').rows.slice(1);
  let updatedCount = 0;

  for (const csvRow of kbCsv) {
    const nama = csvRow[2].trim().toLowerCase();
    const tglPeriksa = parseDate(csvRow[10]);
    const tglKembali = parseDate(csvRow[18]);
    const rawTerapi = csvRow[17] || '';
    const jenisKb = rawTerapi.toLowerCase().includes('3')
      ? 'Suntik 3 Bulan'
      : rawTerapi.toLowerCase().includes('1')
      ? 'Suntik 1 Bulan'
      : 'Suntik 3 Bulan';

    const match = dbRows.find((d) => d.nama.trim().toLowerCase() === nama);
    if (match) {
      const updatePayload = {
        jenis_kb: jenisKb,
        tanggal_kembali: tglKembali,
      };
      if (tglPeriksa && (match.tanggal_periksa === '2026-10-10' || !match.tanggal_periksa)) {
        updatePayload.tanggal_periksa = tglPeriksa;
      }

      const { error: updErr } = await supabase
        .from('public_health_records')
        .update(updatePayload)
        .eq('id', match.id);

      if (updErr) {
        console.error(`Failed to update ${match.nama}:`, updErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  // Also backfill any remaining KB records that have '3bln' in terapi but jenis_kb is null
  const { error: genericErr } = await supabase
    .from('public_health_records')
    .update({ jenis_kb: 'Suntik 3 Bulan' })
    .eq('program_type', 'KB')
    .is('jenis_kb', null)
    .ilike('terapi', '%3%bln%');

  if (genericErr) {
    console.error('Generic backfill error:', genericErr.message);
  }

  console.log(`Successfully synced ${updatedCount} KB records.`);
}

syncKb();
