const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv(path.join(__dirname, '..', '.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('programs')
    .update({ version: 'v1.14' })
    .eq('slug', 'ai-webtoon-studio')
    .select('slug, name, version, app_url');

  if (error) {
    console.error('Error updating program version:', error);
    process.exit(1);
  }

  console.log('Successfully updated program version in Supabase:', JSON.stringify(data, null, 2));
}

main();
