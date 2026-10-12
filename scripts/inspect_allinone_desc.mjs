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
    .select('id, name, slug, short_desc, description, version, updated_at')
    .eq('id', '6fc5e240-9e72-45b2-90aa-b259e74ddd03')
    .single();

  console.log('--- ALLINONE GRAPHIC VERIFICATION ---');
  console.log('ID:', p.id);
  console.log('NAME:', p.name);
  console.log('SLUG:', p.slug);
  console.log('VERSION:', p.version);
  console.log('SHORT_DESC:', p.short_desc);
  console.log('UPDATED_AT:', p.updated_at);
  console.log('DESCRIPTION:\n', p.description);
}

run();
