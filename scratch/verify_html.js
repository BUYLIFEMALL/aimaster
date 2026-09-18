const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let SUPABASE_URL = '';
let SERVICE_KEY = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SERVICE_KEY = line.split('=')[1].trim();
});

async function verifyHtmlContent() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_guides?id=eq.6cdae259-b9d2-45ae-9c21-e5f498f78956`, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });

  const data = await response.json();
  console.log('Updated Guide Record:', data[0]?.title);
  console.log('Content Start:', data[0]?.content.substring(0, 300));
}

verifyHtmlContent();
