// Reads names/targets only. Vercel ciphertext and plaintext values are never persisted or printed.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const plan = JSON.parse(fs.readFileSync('docs/supabase-compat-rollout-20261016/releases.json', 'utf8'));
const rows = []; let index = 0;
async function worker() {
  while (index < plan.length) {
    const p = plan[index++];
    const row = { folder: p.folder, slug: p.slug, project: p.project };
    try {
      const raw = await new Promise((resolve, reject) => cp.execFile('cmd.exe', ['/d', '/s', '/c', 'vercel env ls --scope buylife --format=json'], { cwd: path.resolve(p.folder), windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => err ? reject(new Error('Vercel environment metadata request failed')) : resolve(stdout)));
      const data = JSON.parse(raw); const vars = data.envs || data;
      if (!Array.isArray(vars)) throw new Error('Unexpected metadata format');
      row.variables = vars.filter(v => /SUPABASE/.test(v.key)).map(v => ({ key: v.key, target: v.target, type: v.type }));
      const prod = new Set(row.variables.filter(v => v.target?.includes('production')).map(v => v.key));
      row.production_public = prod.has('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ? 'new' : prod.has('NEXT_PUBLIC_SUPABASE_ANON_KEY') ? 'legacy' : 'missing';
      row.production_server = prod.has('SUPABASE_SECRET_KEY') ? 'new' : prod.has('SUPABASE_SERVICE_ROLE_KEY') ? 'legacy' : prod.has('SUPABASE_SERVICE_ROLE_KEY_BASE64') ? 'encoded-legacy' : 'missing';
      row.ok = true;
    } catch (e) { row.ok = false; row.error = e.message; }
    rows.push(row);
    console.log(`${row.ok ? 'AUDIT' : 'FAIL'} ${p.project}: public=${row.production_public || '?'} server=${row.production_server || '?'}`);
  }
}
Promise.all([worker(), worker(), worker(), worker()]).then(async () => {
  for (let attempt = 0; ; attempt++) {
    try { fs.writeFileSync('docs/supabase-compat-rollout-20261016/vercel-environment-names.json', JSON.stringify(rows, null, 2) + '\n'); break; }
    catch (error) {
      if (attempt >= 9 || !['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(error.code)) throw error;
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  console.log(`AUDIT DONE ${rows.filter(x => x.ok).length}/${plan.length}`);
}).catch(error => { console.error(error.message); process.exitCode = 1; });
