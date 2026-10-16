// Deploys committed, isolated sources after the recorded local build succeeds.
// Does not create/edit/delete environment variables, change Cron configuration or issue keys.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const redeploy = process.argv.includes('--redeploy');
const releases = JSON.parse(fs.readFileSync('docs/supabase-compat-rollout-20261016/releases.json', 'utf8')).filter(r => !only || r.slug === only);
// The web poster's ZIP is hosted by the main app: deploy both at the start of the same batch.
releases.sort((a, b) => (a.slug === 'naver-blog-auto-poster-web' ? 0 : a.slug === '.' ? 1 : 2) - (b.slug === 'naver-blog-auto-poster-web' ? 0 : b.slug === '.' ? 1 : 2));
const before = JSON.parse(fs.readFileSync('docs/supabase-compat-rollout-20261016/projects-before.json', 'utf8'));
const stateFile = process.env.PLATFORM_DEPLOY_STATE || 'docs/supabase-compat-rollout-20261016/deployments.json';
const results = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : [];
const revision = cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const platform = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
  const raw = m[2].trim(); platform[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
}
const apiKey = platform.SUPABASE_SECRET_KEY?.trim() || platform.SUPABASE_SERVICE_ROLE_KEY?.trim();
const metadataHeaders = { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
function save(row) {
  const i = results.findIndex(x => x.slug === row.slug);
  if (i < 0) results.push(row); else results[i] = row;
  fs.writeFileSync(stateFile, JSON.stringify(results, null, 2) + '\n');
}
function command(cmd, cwd, log) {
  return new Promise(resolve => cp.execFile('cmd.exe', ['/d', '/s', '/c', cmd], { cwd, windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
    if (log) fs.appendFileSync(log, stdout + '\n' + stderr);
    resolve({ ok: !err, stdout, stderr });
  }));
}
async function catalog(r) {
  if (!r.version) return { ok: true, root: true };
  const endpoint = `${platform.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/programs?slug=eq.${r.slug}`;
  const read = await fetch(endpoint + '&select=slug,version,extension_version,extension_download_url', { headers: metadataHeaders });
  if (!read.ok) throw new Error(`Catalog read HTTP ${read.status}`);
  const [current] = await read.json();
  if (current?.version === r.version && (!r.extension || current.extension_version === r.version)) return { ok: true, already_current: true };
  if (current?.version !== r.oldVersion) throw new Error('Catalog version changed concurrently; manual review required');
  const body = { version: r.version, updated_at: new Date().toISOString(), ...(r.extension ? { extension_version: r.version, extension_download_url: r.extension_download_url } : {}) };
  const patch = await fetch(endpoint + `&version=eq.${r.oldVersion}&select=slug,version,extension_version,extension_download_url`, { method: 'PATCH', headers: metadataHeaders, body: JSON.stringify(body) });
  if (!patch.ok || (await patch.json()).length !== 1) throw new Error('Guarded catalog update did not update exactly one row');
  return { ok: true, version: r.version };
}
async function snapshot(r) {
  const slug = r.slug === '.' ? 'aimaster' : r.slug;
  const destination = path.join(root, '.vercel/compat-deploy', revision.slice(0, 8), slug);
  fs.mkdirSync(destination, { recursive: true });
  const archive = path.join(destination, 'source.tar');
  const rootPaths = ['app', 'components', 'hooks', 'lib', 'types', 'utils', 'public', '.gitignore', '.vercelignore', 'AGENTS.md', 'CLAUDE.md', 'README.md', 'middleware.ts', 'next-env.d.ts', 'next.config.mjs', 'package.json', 'package-lock.json', 'postcss.config.mjs', 'tailwind.config.ts', 'tsconfig.json', 'vercel.json'];
  const tracked = new Set(cp.execFileSync('git', ['ls-tree', '--name-only', revision], { encoding: 'utf8' }).trim().split(/\r?\n/));
  const files = r.folder === '.' ? rootPaths.filter(f => tracked.has(f)) : [r.folder];
  cp.execFileSync('git', ['archive', '--format=tar', '--output', archive, revision, ...files], { windowsHide: true });
  cp.execFileSync('python', ['-c', 'import tarfile,pathlib,sys; base=pathlib.Path(sys.argv[2]).resolve(); tf=tarfile.open(sys.argv[1]); assert all((base/m.name).resolve().is_relative_to(base) for m in tf.getmembers()); tf.extractall(base,filter="data")', archive, destination], { windowsHide: true });
  fs.unlinkSync(archive);
  const deployRoot = r.folder === '.' ? destination : path.join(destination, r.folder);
  fs.mkdirSync(path.join(deployRoot, '.vercel'), { recursive: true });
  fs.copyFileSync(path.join(root, r.folder, '.vercel/project.json'), path.join(deployRoot, '.vercel/project.json'));
  if (r.slug === '.') {
    const installer = 'public/downloads/AIMaster-Naver-Blog-Auto-Poster-0.1.0.exe';
    if (!fs.existsSync(path.join(root, installer))) throw new Error('Existing installer download must be preserved');
    fs.copyFileSync(path.join(root, installer), path.join(deployRoot, installer));
  }
  return deployRoot;
}
let index = 0;
async function worker() {
  while (index < releases.length) {
    const r = releases[index++];
    if (!redeploy && results.some(x => x.slug === r.slug && x.ok && x.version === r.version)) continue;
    const slug = r.slug === '.' ? 'aimaster' : r.slug;
    const row = { slug: r.slug, version: r.version, revision, started: new Date().toISOString() };
    try {
      const build = JSON.parse(fs.readFileSync('.vercel/supabase-compat-builds/results.json', 'utf8')).find(x => x.slug === r.slug);
      if (!build?.ok || build.version !== r.version) throw new Error('Local build not passed');
      const project = before.find(p => p.slug === r.slug);
      if (!project?.ok || project.cron_changed) throw new Error('Unreviewed production/Cron configuration');
      const folder = await snapshot(r);
      const log = path.join(folder, '.vercel/compat-deploy.log');
      console.log(`DEPLOY START ${slug} ${r.version || ''}`);
      const deployed = await command('vercel deploy --prod --yes --scope buylife', folder, log);
      if (!deployed.ok) throw new Error('Production deployment failed; inspect private deployment log');
      const candidates = deployed.stdout.match(/https:\/\/[\w.-]+\.vercel\.app/g) || [];
      row.url = candidates.at(-1);
      if (!row.url) throw new Error('Deployment URL missing');
      const inspection = await command(`vercel inspect ${row.url} --scope buylife --format=json`, folder);
      if (!inspection.ok) throw new Error('Deployment inspection failed');
      const data = JSON.parse(inspection.stdout);
      row.deployment_id = data.id;
      row.readyState = data.readyState || data.status;
      if (row.readyState !== 'READY') throw new Error('Production deployment not READY');
      if (r.slug === 'ai-image-studio') {
        const alias = await command(`vercel alias set ${row.url} ai-image-studio.vercel.app --scope buylife`, folder, log);
        if (!alias.ok) throw new Error('Existing image-studio alias could not be moved');
      }
      row.catalog = await catalog(r);
      row.ok = true;
    } catch (e) { row.ok = false; row.error = e.message; }
    row.finished = new Date().toISOString();
    save(row);
    console.log(`DEPLOY ${row.ok ? 'PASS' : 'FAIL'} ${slug} ${row.error || row.deployment_id || ''} (${results.filter(x => x.ok).length}/${releases.length})`);
  }
}
Promise.all([worker(), worker(), worker()]).then(() => console.log('DEPLOY QUEUE DONE'));
