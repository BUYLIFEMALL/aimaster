// Supply existing platform credentials only to the local verification process.
// No .env or Vercel setting is modified; values are never printed.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
const env = { ...process.env };
for (const line of fs.readFileSync(path.resolve('../.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && /^(NEXT_PUBLIC_SUPABASE_|SUPABASE_)/.test(m[1])) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) throw Error('Existing local platform credentials unavailable');
const mode = process.argv[2];
if (!['build', 'start'].includes(mode)) throw Error('Use: node tests/local.mjs build|start');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', mode, ...(mode === 'start' ? ['-p', '3032'] : [])], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
