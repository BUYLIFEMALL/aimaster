// Read-only. Never prints credentials, hashes, line contents, or decoded strings.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oldPrefix = 'sb_secret_uRX6U';
const names = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', windowsHide: true }).split('\0').filter(Boolean);
const isSecret = value => {
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(value)) return true;
  for (const token of value.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try { if (JSON.parse(Buffer.from(token[1], 'base64url').toString('utf8')).role === 'service_role') return true; } catch {}
  }
  return false;
};
const findings = [];
let scanned = 0;
for (const name of names) {
  if (!/\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|sql|ya?ml|toml|py|txt)$/i.test(name)) continue;
  const full = path.join(root, name);
  if (!fs.existsSync(full) || fs.statSync(full).size > 2_000_000) continue;
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  scanned++;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let kind = isSecret(line) ? 'literal-secret' : null;
    if (!kind) for (const encoded of line.matchAll(/["'`]([A-Za-z0-9+/=]{40,})["'`]/g)) {
      if (isSecret(Buffer.from(encoded[1], 'base64').toString('utf8'))) { kind = 'encoded-secret'; break; }
    }
    if (kind) findings.push({ file: name, line: i + 1, kind });
  }
}
const environments = [];
function walk(dir, depth) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', '.vercel', '.analysis-threads-auto', 'scratch'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && depth < 4) walk(full, depth + 1);
    if (entry.isFile() && /^\.env(?:\..+)?$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      const key = text.match(/^\s*(?:export\s+)?SUPABASE_SERVICE_ROLE_KEY\s*=\s*([^\r\n]+)/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
      if (key) environments.push({ file: path.relative(root, full).replaceAll('\\', '/'), oldKeyPresent: key.startsWith(oldPrefix) });
    }
  }
}
walk(root, 0);
const report = { trackedTextFilesScanned: scanned, findings,
  localEnvironmentsWithServerKey: environments.length, localEnvironmentsWithOldKey: environments.filter(e => e.oldKeyPresent),
  temporaryNewKeyFileExists: fs.existsSync(path.join(process.env.USERPROFILE || '', 'new-supabase-key.txt')) };
console.log(JSON.stringify(report, null, 2));
process.exitCode = findings.length || report.localEnvironmentsWithOldKey.length ? 1 : 0;
