const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let SUPABASE_URL = '';
let SERVICE_KEY = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SERVICE_KEY = line.split('=')[1].trim();
});

async function checkDmGuide() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_guides?select=id,title,category&title=ilike.*DM*`, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });

  const data = await response.json();
  console.log('DM Guides:', data);
}

checkDmGuide();
