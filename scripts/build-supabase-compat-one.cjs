// Build with only the new variable names, without editing any .env files.
const path = require('node:path');
const cp = require('node:child_process');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const folder = process.argv[2];
const cwd = path.resolve(__dirname, '..', folder);
const localRequire = createRequire(path.join(cwd, 'package.json'));
localRequire('@next/env').loadEnvConfig(cwd, false);
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
// Some local .env files only contain an OIDC token: Vercel injects DB variables remotely.
// For this local build test only, supply the same shared platform DB from the root.
const common = {};
for (const line of fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
  const value = m[2].trim(); common[m[1]] = value.startsWith('"') ? JSON.parse(value) : value.replace(/^'|'$/g, '');
}
env.NEXT_PUBLIC_SUPABASE_URL ||= common.NEXT_PUBLIC_SUPABASE_URL;
if (new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname !== 'esgxyikcnnvmlhygjkth.supabase.co') throw new Error('Unexpected local shared DB project');
env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || common.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || common.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
env.SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim() || common.SUPABASE_SECRET_KEY?.trim() || common.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SECRET_KEY) throw new Error('Local shared DB verification credentials missing');
// Existing encoded credentials remain supported on the server, as before.
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
env.SUPABASE_SERVICE_ROLE_KEY = '';
const r = cp.spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm run build'], { cwd, env, stdio: 'inherit', windowsHide: true });
const proof = path.resolve(__dirname, '../.vercel/supabase-compat-builds/config-proof');
fs.mkdirSync(proof, { recursive: true });
fs.writeFileSync(path.join(proof, (folder === '.' ? 'aimaster' : folder.replaceAll('/', '--')) + '.json'), JSON.stringify({ folder, new_public_present: true, new_server_present: true, old_names_empty: true, no_env_file_changes: true, exit_code: r.status }));
process.exit(r.status ?? 1);
