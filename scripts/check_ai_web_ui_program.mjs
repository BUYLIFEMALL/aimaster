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

async function check() {
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, slug, short_desc, thumbnail_url, app_url, badges, is_active, version, sort_order, category_id')
    .eq('slug', 'react-ui-showcase')
    .single();

  if (error) {
    console.error('Error fetching program:', error);
    return;
  }
  console.log('Program Record:', JSON.stringify(data, null, 2));

  // 또한 categories 테이블에서 해당 카테고리 이름 확인
  if (data.category_id) {
    const { data: cat } = await supabase.from('categories').select('id, name, slug').eq('id', data.category_id).single();
    console.log('Category:', cat);
  }
}

check();
