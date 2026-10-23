const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const dotenv = fs.readFileSync('prompt-template-studio/.env.local', 'utf8');
const env = {};
dotenv.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('programs')
    .update({ version: 'v1.04' })
    .eq('slug', 'prompt-template-studio')
    .select('slug, name, version');

  if (error) {
    console.error('DB Update Error:', error);
  } else {
    console.log('DB Updated Successfully:', data);
  }
}

run();
