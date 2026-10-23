const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
};
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

async function run() {
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, slug, app_url, version, extension_version, category_id')
    .or('slug.eq.seo-thumbnail-pro,slug.ilike.%thumbnail%');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
