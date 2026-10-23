const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = {};
fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
});

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await client.from('programs').select('id, name, slug, version, app_url').eq('slug', 'ai-audio-analyzer').single();
  if (error) {
    console.error('조회 실패:', error);
  } else {
    console.log('78번 DB 메타데이터:', data);
  }
}

check();
