import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtedbdvwyffvupjtdkpd.supabase.co';
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!serviceKey && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  }
}

if (!serviceKey && fs.existsSync('web-crawler/webapp/.env.local')) {
  const envContent = fs.readFileSync('web-crawler/webapp/.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase.from('programs').select('id, name, slug, version, app_url').eq('slug', 'web-crawler-saas');
  console.log('현재 DB 상태:', data, error);

  if (data && data.length > 0) {
    const { data: updateData, error: updateError } = await supabase
      .from('programs')
      .update({ version: 'v1.07', updated_at: new Date().toISOString() })
      .eq('slug', 'web-crawler-saas')
      .select();
    console.log('DB 업데이트 결과:', updateData, updateError);
  }
}
main();
