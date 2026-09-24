import fs from 'fs';

let envText = '';
try {
  envText = fs.readFileSync('.env.local', 'utf8');
} catch (e) {}

const env = {};
envText.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://esgxyikcnnvmlhygjkth.supabase.co';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ3h5aWtjbm52bWxoeWdqa3RoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDI0ODEyOSwiZXhwIjoyMDU1ODI0MTI5fQ.0NndE7L-Q1iHk01n1kQ1i1i1i1i1i1i1i1i1i1i1i1i';

async function run() {
  const keyRes = await fetch(`${supabaseUrl}/rest/v1/user_api_keys?select=provider,api_key`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });

  const keys = await keyRes.json();
  console.log("All DB Providers:", keys);

  const repKey = keys?.find(k => k.provider === 'replicate')?.api_key;
  if (!repKey) {
    console.log("Replicate key not in user_api_keys.");
    return;
  }

  const model = 'black-forest-labs/flux-2-max';
  const res = await fetch(`https://api.replicate.com/v1/models/${model}`, {
    headers: { Authorization: `Bearer ${repKey}` }
  });

  const data = await res.json();
  console.log(`\n============================`);
  console.log(`📌 Model: ${model}`);
  console.log(`Description: ${data.description}`);
  console.log(`OpenAPI Schema Input:`, JSON.stringify(data.latest_version?.openapi_schema?.components?.schemas?.Input, null, 2));
}

run();
