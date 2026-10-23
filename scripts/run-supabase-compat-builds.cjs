const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const folder = '.vercel/supabase-compat-builds';
fs.mkdirSync(folder, { recursive: true });
const releases = JSON.parse(fs.readFileSync('docs/supabase-compat-rollout-20261016/releases.json', 'utf8'));
const stateFile = `${folder}/results.json`;
const results = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : [];
let index = 0;
function save() { fs.writeFileSync(stateFile, JSON.stringify(results, null, 2)); }
async function worker() {
  while (index < releases.length) {
    const r = releases[index++];
    const proof = `${folder}/config-proof/${r.folder === '.' ? 'aimaster' : r.folder.replaceAll('/', '--')}.json`;
    const dotenv = path.join(r.folder, '.env.local');
    const rawEnv = fs.existsSync(dotenv) ? fs.readFileSync(dotenv, 'utf8') : '';
    const localPublicWasPresent = /^NEXT_PUBLIC_SUPABASE_URL=/m.test(rawEnv) && /^NEXT_PUBLIC_SUPABASE_(PUBLISHABLE|ANON)_KEY=/m.test(rawEnv);
    if (results.some(x => x.slug === r.slug && x.ok) && (fs.existsSync(proof) || localPublicWasPresent)) continue;
    const slug = r.slug === '.' ? 'aimaster' : r.slug;
    const logFile = `${folder}/${slug}.log`;
    const fd = fs.openSync(logFile, 'w');
    const start = Date.now();
    console.log(`BUILD START ${slug} ${r.version || ''}`);
    if (!fs.existsSync(path.join(r.folder, 'node_modules/next/package.json'))) {
      const install = cp.spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm ci --no-audit --no-fund'], { cwd: path.resolve(r.folder), stdio: ['ignore', fd, fd], windowsHide: true });
      if (install.status !== 0) {
        results.push({ slug: r.slug, version: r.version, ok: false, phase: 'install', logFile }); save(); fs.closeSync(fd); continue;
      }
    }
    const code = await new Promise(resolve => {
      const child = cp.spawn(process.execPath, ['scripts/build-supabase-compat-one.cjs', r.folder], { cwd: root, stdio: ['ignore', fd, fd], windowsHide: true });
      child.on('error', () => resolve(-1));
      child.on('exit', resolve);
    });
    fs.closeSync(fd);
    const row = { slug: r.slug, version: r.version, ok: code === 0, exit_code: code, seconds: Math.round((Date.now() - start) / 1000), logFile };
    const previous = results.findIndex(x => x.slug === r.slug);
    if (previous >= 0) results[previous] = row; else results.push(row);
    save();
    console.log(`BUILD ${row.ok ? 'PASS' : 'FAIL'} ${slug} ${row.seconds}s (${results.filter(x => x.ok).length}/${releases.length})`);
  }
}
Promise.all([worker(), worker()]).then(() => console.log('BUILD QUEUE DONE'));
