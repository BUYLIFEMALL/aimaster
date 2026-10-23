const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const root = path.resolve(__dirname, '..');
const env = {};
fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase
    .from('programs')
    .update({ version: 'v1.10' })
    .eq('slug', 'ai-writing-editor')
    .select('id, name, slug, version');
  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Update success:', JSON.stringify(data, null, 2));
  }
}
run();
