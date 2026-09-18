require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://esgxyikcnnvmlhygjkth.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyGuide() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_guides?id=eq.6cdae259-b9d2-45ae-9c21-e5f498f78956`, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });

  const data = await response.json();
  console.log('Verification Result:', data);
}

verifyGuide();
