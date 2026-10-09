const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=(.*)?\s*$/);
  if (m) {
    let v = m[2] ? m[2].trim() : '';
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.substring(1, v.length - 1);
    }
    env[m[1]] = v;
  }
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function check() {
  const { data: user, error } = await sb.auth.admin.getUserById('168ac841-2223-4a24-930d-c789cd79c8c9');
  console.log('Admin user by ID:', user ? { id: user.user.id, email: user.user.email, email_confirmed_at: user.user.email_confirmed_at, banned_until: user.user.banned_until } : error);
}
check();
