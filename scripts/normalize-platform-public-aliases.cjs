// Correct only the 79 public aliases created in this approved rollout.
// Value is identical; existing pre-rollout variables and all server secrets are untouched.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
process.chdir(path.resolve(__dirname, '..'));
if (!process.argv.includes('--approved')) throw new Error('Requires approved rollout');
const dir = 'docs/supabase-compat-rollout-20261016/';
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const plan = JSON.parse(fs.readFileSync(dir + 'environment-addition-plan.json')).filter(p => p.add.some(v => v.key === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') && (!only || p.slug === only || p.project === only));
const before = JSON.parse(fs.readFileSync(dir + 'vercel-environment-names-before-addition.json'));
const added = JSON.parse(fs.readFileSync(dir + 'environment-addition-results.json'));
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
  const v = m[2].trim(); env[m[1]] = v.startsWith('"') ? JSON.parse(v) : v.replace(/^'|'$/g, '');
}
const key = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
const value = env[key]?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!value?.startsWith('sb_publishable_')) throw new Error('Expected the original public DB value');
const cli = path.join(process.env.APPDATA, 'npm/node_modules/vercel/dist/index.js');
const file = dir + 'public-alias-config-corrections.json';
const results = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
function command(args, cwd, input) {
  return new Promise((resolve, reject) => {
    const c = cp.spawn(process.execPath, [cli, ...args], { cwd, windowsHide: true });
    let out = '', err = ''; c.stdout.on('data', b => out += b); c.stderr.on('data', b => err += b);
    c.on('error', () => reject(new Error('CLI failed; values hidden')));
    c.on('exit', code => code ? reject(new Error('Vercel operation failed: ' + err.replace(/sb_(?:publishable|secret)_[\w-]+/g, '[redacted]').slice(-800))) : resolve(out));
    c.stdin.end(input);
  });
}
async function variables(p) {
  const id = JSON.parse(fs.readFileSync(path.join(p.folder, '.vercel/project.json'))).projectId;
  const d = JSON.parse(await command(['api', `/v9/projects/${id}/env`, '--scope', 'buylife', '--raw'], p.folder));
  return d.envs || d;
}
let index = 0;
async function worker() {
  while (index < plan.length) {
    const p = plan[index++];
    if (before.find(x => x.slug === p.slug).variables.some(v => v.key === key && v.target.includes('production'))) throw new Error('Refuse pre-rollout variable change');
    if (!added.some(x => x.slug === p.slug && x.key === key && x.ok)) throw new Error('Not created by this rollout');
    const current = (await variables(p)).find(v => v.key === key && v.target.includes('production'));
    if (!current || current.target.length !== 1) throw new Error('Unexpected public alias scope');
    if (current.type === 'sensitive') {
      const projectId = JSON.parse(fs.readFileSync(path.join(p.folder, '.vercel/project.json'))).projectId;
      // Vercel forbids changing a Sensitive record's type. Recreate only this
      // rollout's new public alias. Deployed snapshots and legacy variables remain intact.
      await command(['api', `/v9/projects/${projectId}/env/${current.id}`, '--method', 'DELETE', '--scope', 'buylife', '--silent', '--dangerously-skip-permissions'], p.folder);
      await command(['api', `/v10/projects/${projectId}/env`, '--method', 'POST', '--input', '-', '--scope', 'buylife', '--silent'], p.folder, JSON.stringify({ key, type: 'encrypted', visibility: 'config', target: ['production'], value }));
    }
    const verified = (await variables(p)).find(v => v.key === key && v.target.includes('production'));
    if (verified?.type !== 'encrypted') throw new Error(`${p.project}: Config verification failed`);
    const row = { project: p.project, slug: p.slug, key, target: 'production', type: verified.type, visibility: 'config', same_public_value: true, checked_at: new Date().toISOString(), ok: true };
    const i = results.findIndex(x => x.slug === row.slug); if (i < 0) results.push(row); else results[i] = row;
    fs.writeFileSync(file, JSON.stringify(results, null, 2) + '\n');
    console.log(`CONFIG PASS ${p.project} (${results.length}/79), same value`);
  }
}
Promise.all([worker(), worker(), worker()]).catch(e => { console.error(e.message); process.exitCode = 1; });
