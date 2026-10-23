const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

  if (!url || !key) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const sb = createClient(url, key);

  console.log('Updating programs table for personality-suite...');
  const { data, error } = await sb
    .from('programs')
    .update({ version: 'v1.20', updated_at: new Date().toISOString() })
    .eq('slug', 'personality-suite')
    .select('id, name, slug, version, app_url');

  if (error) {
    console.error('Update error:', error);
    process.exit(1);
  }

  console.log('Successfully updated program version in Supabase:');
  console.log(JSON.stringify(data, null, 2));
}

main();
