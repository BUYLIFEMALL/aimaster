import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('D:/Antigravity/AIMaster/.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: tableData, error: tableErr } = await supabase.from('insta_member_scheduler').select('*').limit(1);
  console.log('insta_member_scheduler select:', tableData, tableErr);
  const { data: prog, error: pErr } = await supabase.from('programs').select('name, slug, version').eq('slug', 'auto-instagram-posting');
  console.log('program version check:', prog, pErr);
}
check();
