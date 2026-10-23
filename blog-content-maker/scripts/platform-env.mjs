import fs from 'node:fs/promises';

// Local operator scripts use the same new-name-first policy as the application.
export async function loadPlatformEnv() {
  const raw = await fs.readFile(new URL('../.env.local', import.meta.url), 'utf8');
  const env = Object.fromEntries(raw.split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => {
    const n = l.indexOf('='); const value = l.slice(n + 1).trim();
    return [l.slice(0, n), value.startsWith('"') ? JSON.parse(value) : value];
  }));
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
  env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  return env;
}
