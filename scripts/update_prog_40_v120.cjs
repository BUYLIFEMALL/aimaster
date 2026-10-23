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
    .update({ version: 'v1.20' })
    .eq('slug', 'naver-cafe-poster')
    .select('id, name, slug, version, app_url');
  
  if (error) {
    console.error('Error updating program 40:', error);
  } else {
    console.log('Successfully updated program 40 to v1.20:', data);
  }
}
run();
