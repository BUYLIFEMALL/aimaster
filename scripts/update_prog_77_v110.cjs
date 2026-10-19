const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const rootEnvPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(rootEnvPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('programs')
    .update({ version: 'v1.10' })
    .eq('slug', 'ai-mastering-studio')
    .select();

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update success! Updated program:', data);
  }
}

main();
