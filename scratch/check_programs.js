const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) envVars[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('programs').select('id, name, slug, app_url');
  console.log(data);
}
check();
