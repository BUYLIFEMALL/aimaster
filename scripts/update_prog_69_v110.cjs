const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('D:/Antigravity/AIMaster/.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function update() {
  const { data, error } = await supabase
    .from('programs')
    .update({ version: 'v1.10' })
    .eq('slug', 'landing-architect')
    .select('id, name, slug, version, app_url')
    .single();

  if (error) {
    console.error('Error updating program 69:', error);
  } else {
    console.log('Program 69 DB version updated successfully:', data);
  }
}

update();
