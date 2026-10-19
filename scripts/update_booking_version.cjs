const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// .env.local 파싱
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://esgxyikcnnvmlhygjkth.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log('Target Supabase ref: esgxyikcnnvmlhygjkth (AIMaster 운영 DB)');
  const { data: before, error: fetchErr } = await supabase
    .from('programs')
    .select('id, name, slug, version, app_url')
    .eq('slug', 'booking-reminder')
    .single();

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    process.exit(1);
  }

  console.log('Before update:', before);

  const { data: updated, error: updateErr } = await supabase
    .from('programs')
    .update({ version: 'v1.20' })
    .eq('slug', 'booking-reminder')
    .select('id, name, slug, version, app_url')
    .single();

  if (updateErr) {
    console.error('Update error:', updateErr);
    process.exit(1);
  }

  console.log('After update:', updated);
}

main().catch(console.error);
