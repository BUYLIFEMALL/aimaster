import fs from 'node:fs';
import { execSync } from 'node:child_process';

function loadEnv(path) {
  const text = fs.readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, '');
  }
  return env;
}

const rootEnv = loadEnv('D:/Antigravity/AIMaster/.env.local');

const envVars = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', val: rootEnv.NEXT_PUBLIC_SUPABASE_URL },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', val: rootEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', val: rootEnv.SUPABASE_SERVICE_ROLE_KEY },
];

for (const env of envVars) {
  for (const target of ['production', 'preview', 'development']) {
    try {
      console.log(`Adding ${env.key} to ${target}...`);
      execSync(`echo "${env.val}" | vercel env add ${env.key} ${target}`, {
        cwd: 'D:/Antigravity/AIMaster/ai-audio-analyzer',
        stdio: 'inherit',
        shell: 'powershell.exe',
      });
    } catch (e) {
      console.log(`Failed to add or already exists: ${env.key} (${target})`);
    }
  }
}

console.log('Environment variables setup complete.');
