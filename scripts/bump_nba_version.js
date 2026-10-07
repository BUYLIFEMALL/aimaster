const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
    env[match[1]] = value.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL || 'https://esgxyikcnnvmlhygjkth.supabase.co', env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  const { data, error } = await supabase
    .from('programs')
    .update({ version: 'v1.15', updated_at: new Date().toISOString() })
    .eq('slug', 'naver-blog-agent')
    .select('id, slug, version');
  if (error) {
    console.error('Error updating programs table:', error);
    process.exit(1);
  }
  console.log('Successfully updated programs.version in DB:', data);
}
main();
