const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = {};
fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
});

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function updateVersion() {
  const { data, error } = await client
    .from('programs')
    .update({ version: 'v1.10' })
    .eq('slug', 'ai-audio-analyzer')
    .select('id, name, slug, version, app_url');

  if (error) {
    console.error('버전 갱신 실패:', error);
    process.exit(1);
  } else {
    console.log('78번 DB 버전 v1.10 갱신 완료:', data);
  }
}

updateVersion();
