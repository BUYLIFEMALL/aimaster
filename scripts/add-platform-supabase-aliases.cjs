// Defaults to a value-free proposal. Actual environment changes require the owner's prior approval.
// Adds missing Production aliases only, never overwrites/deletes legacy values or creates Supabase keys.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const approved = process.argv.includes('--approved');
const plan = JSON.parse(fs.readFileSync('docs/supabase-compat-rollout-20261016/environment-addition-plan.json', 'utf8'));
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const selected = only ? plan.filter(r => r.slug === only || r.project === only) : plan;
if (!selected.length) throw new Error('No matching projects');
console.log(`${approved ? 'APPROVED APPLY' : 'DRY RUN'}: ${selected.length} projects / ${selected.reduce((n, r) => n + r.add.length, 0)} missing Production aliases. Preserve all existing variables.`);
if (!approved) { for (const r of selected) console.log(`${r.project}: ${r.add.map(x => `${x.key} (${x.type})`).join(', ')}`); process.exit(0); }
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
  const raw = m[2].trim(); env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
}
const base = env.NEXT_PUBLIC_SUPABASE_URL;
if (new URL(base).hostname !== 'esgxyikcnnvmlhygjkth.supabase.co') throw new Error('Unexpected shared project');
const values = {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
};
if (!values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_') || !values.SUPABASE_SECRET_KEY?.startsWith('sb_secret_')) throw new Error('Expected modern platform DB credentials; values not displayed');
const cli = path.join(process.env.APPDATA, 'npm/node_modules/vercel/dist/index.js');
if (!fs.existsSync(cli)) throw new Error('Vercel CLI installation not found');
const results = [];
async function main() {
  for (const key of Object.values(values)) {
    const response = await fetch(`${base}/rest/v1/programs?select=slug&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!response.ok) throw new Error(`Shared DB key validation failed (HTTP ${response.status})`);
  }
  for (const r of selected) {
    const cwd = path.join(root, r.folder);
    const listing = cp.spawnSync(process.execPath, [cli, 'env', 'ls', '--scope', 'buylife', '--format=json'], { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    if (listing.status !== 0) throw new Error(`Environment audit failed: ${r.project}`);
    const metadata = JSON.parse(listing.stdout);
    const variables = metadata.envs || metadata;
    for (const item of r.add) {
      if (variables.some(v => v.key === item.key && v.target?.includes('production'))) { console.log(`SKIP existing ${r.project} ${item.key}`); continue; }
      const args = [cli, 'env', 'add', item.key, 'production', '--yes', '--scope', 'buylife'];
      args.push(item.type === 'Secret' ? '--sensitive' : '--no-sensitive');
      const added = cp.spawnSync(process.execPath, args, { cwd, input: values[item.key] + '\n', encoding: 'utf8', windowsHide: true, timeout: 90000 });
      const row = { project: r.project, slug: r.slug, key: item.key, target: 'production', ok: added.status === 0 };
      results.push(row);
      fs.writeFileSync('docs/supabase-compat-rollout-20261016/environment-addition-results.json', JSON.stringify(results, null, 2) + '\n');
      if (!row.ok) throw new Error(`Alias addition failed: ${r.project} ${item.key}; credentials not displayed`);
      console.log(`ADDED ${r.project} ${item.key} (value hidden)`);
    }
  }
  console.log('Aliases added. Redeploy affected projects and rerun live member checks before considering legacy removal.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
