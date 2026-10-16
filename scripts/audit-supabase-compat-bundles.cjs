const fs = require('node:fs');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const releases = JSON.parse(fs.readFileSync('docs/supabase-compat-rollout-20261016/releases.json', 'utf8'));
const rows = [];
function secretPresent(source) {
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(source)) return true;
  for (const m of source.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try { if (JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')).role === 'service_role') return true; } catch {}
  }
  return false;
}
for (const r of releases) {
  let files = 0; const findings = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.js$/.test(entry.name)) {
        files++;
        if (secretPresent(fs.readFileSync(full, 'utf8'))) findings.push(path.relative(r.folder, full).replaceAll('\\', '/'));
      }
    }
  }
  walk(path.join(r.folder, '.next/static'));
  rows.push({ slug: r.slug, files, ok: findings.length === 0, findings });
}
fs.writeFileSync('docs/supabase-compat-rollout-20261016/browser-bundle-audit.json', JSON.stringify(rows, null, 2) + '\n');
console.log(JSON.stringify({ projects: rows.length, js_files: rows.reduce((n, r) => n + r.files, 0), failed_projects: rows.filter(r => !r.ok).map(r => r.slug) }));
process.exitCode = rows.some(r => !r.ok) ? 1 : 0;
