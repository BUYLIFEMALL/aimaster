const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const { data: before, error: err1 } = await supabase
    .from('programs')
    .select('slug, name, version, app_url')
    .eq('slug', 'threads-affiliate-poster')
    .single();

  console.log('Before update:', before, err1);

  const { data: after, error: err2 } = await supabase
    .from('programs')
    .update({ version: 'v1.61', updated_at: new Date().toISOString() })
    .eq('slug', 'threads-affiliate-poster')
    .select('slug, name, version, app_url')
    .single();

  console.log('After update:', after, err2);
}

main().catch(console.error);
