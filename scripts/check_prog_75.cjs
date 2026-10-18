const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkProg() {
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, slug, version, app_url')
    .eq('slug', 'blog-content-maker');
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  console.log('Programs:', data);
}
checkProg();
