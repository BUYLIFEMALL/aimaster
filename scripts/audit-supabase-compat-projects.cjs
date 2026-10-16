const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const releases = JSON.parse(fs.readFileSync('docs/supabase-compat-rollout-20261016/releases.json', 'utf8'));
const rows = []; let index = 0;
const output = `docs/supabase-compat-rollout-20261016/projects-${process.argv.includes('--after') ? 'after' : 'before'}.json`;
async function worker() {
  while (index < releases.length) {
    const r = releases[index++];
    const id = JSON.parse(fs.readFileSync(path.join(r.folder, '.vercel/project.json'), 'utf8')).projectId;
    const row = { slug: r.slug, folder: r.folder, project: r.project, projectId: id };
    try {
      const raw = await new Promise((resolve, reject) => cp.execFile('cmd.exe', ['/d', '/s', '/c', `vercel api /v9/projects/${id} --scope buylife --raw`], { cwd: root, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => err ? reject(new Error('Project metadata request failed')) : resolve(stdout)));
      const data = JSON.parse(raw);
      const prod = data.targets?.production;
      row.production = prod ? { id: prod.id, url: prod.url, readyState: prod.readyState, aliases: prod.alias || [] } : null;
      row.crons = { enabled: !!data.crons?.enabledAt && !data.crons?.disabledAt, definitions: (data.crons?.definitions || []).map(({ path, schedule }) => ({ path, schedule })) };
      const localConfig = path.join(r.folder, 'vercel.json');
      const localCrons = fs.existsSync(localConfig) ? JSON.parse(fs.readFileSync(localConfig, 'utf8')).crons || [] : [];
      const normalize = x => JSON.stringify(x.map(({ path, schedule }) => ({ path, schedule })).sort((a, b) => a.path.localeCompare(b.path)));
      row.cron_changed = normalize(localCrons) !== normalize(row.crons.definitions);
      row.ok = true;
    } catch (e) { row.ok = false; row.error = e.message; }
    rows.push(row);
    console.log(`PROJECT ${row.ok ? 'OK' : 'FAIL'} ${r.project}${row.cron_changed ? ' CRON REVIEW' : ''}`);
  }
}
Promise.all([worker(), worker(), worker(), worker()]).then(async () => {
  // Shared Windows/SMB readers may briefly lock the file. Persist one complete audit.
  for (let attempt = 0; ; attempt++) {
    try { fs.writeFileSync(output, JSON.stringify(rows, null, 2) + '\n'); break; }
    catch (error) {
      if (attempt >= 9 || !['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(error.code)) throw error;
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  console.log('PROJECT AUDIT DONE');
}).catch(error => { console.error(error.message); process.exitCode = 1; });
