import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  const text = fs.readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv('D:/Antigravity/AIMaster/.env.local');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: p } = await supabase
    .from('programs')
    .select('*, pricing_plans(*)')
    .eq('slug', 'ai-audio-analyzer')
    .single();

  console.log('--- PROGRAM VERIFICATION ---');
  console.log('ID:', p.id);
  console.log('NAME:', p.name);
  console.log('SLUG:', p.slug);
  console.log('VERSION:', p.version);
  console.log('APP_URL:', p.app_url);
  console.log('THUMBNAIL_URL:', p.thumbnail_url);
  console.log('SORT_ORDER:', p.sort_order);
  console.log('BADGES:', p.badges);
  console.log('PLANS COUNT:', p.pricing_plans?.length);
}

run();
