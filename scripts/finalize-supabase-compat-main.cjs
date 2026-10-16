// Keep the already-verified main deployment with its ignored installer artifact after docs-only Git CI.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const current = cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const verified = JSON.parse(fs.readFileSync('docs/supabase-compat-rollout-20261016/deployments.json', 'utf8')).find(r => r.slug === '.');
const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8')).projectId;
const runtimePaths = ['app', 'components', 'hooks', 'lib', 'types', 'utils', 'public', 'middleware.ts', 'next.config.mjs', 'package.json', 'package-lock.json', 'postcss.config.mjs', 'tailwind.config.ts', 'tsconfig.json', 'vercel.json'];
const unchanged = cp.spawnSync('git', ['diff', '--quiet', verified.revision, current, '--', ...runtimePaths], { windowsHide: true });
if (unchanged.status !== 0) throw new Error('Main runtime changed since verified artifact: deploy latest sources with installer instead of promoting older code');
function cli(command) {
  const result = cp.spawnSync('cmd.exe', ['/d', '/s', '/c', command], { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('Vercel command failed; inspect local private log');
  return result.stdout;
}
function metadata() { return JSON.parse(cli(`vercel api /v9/projects/${project} --scope buylife --raw`)); }
async function main() {
  let settled = false;
  for (let i = 0; i < 90; i++) {
    const data = metadata();
    const rows = [...(data.latestDeployments || []), data.targets?.production].filter(Boolean);
    const relevant = rows.filter(d => d.meta?.githubCommitSha === current);
    if (relevant.some(d => ['READY', 'ERROR', 'CANCELED'].includes(d.readyState))) { settled = true; break; }
    if (i % 10 === 0) console.log('Waiting for final documentation Git deployment to settle');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!settled) throw new Error('Final Git deployment state not confirmed; do not race a pending automatic production deployment');
  if (metadata().targets?.production?.id !== verified.deployment_id) {
    const command = `vercel promote ${verified.url} --yes --scope buylife`;
    const result = cp.spawnSync('cmd.exe', ['/d', '/s', '/c', command], { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    fs.writeFileSync('.vercel/final-main-promotion.log', result.stdout + '\n' + result.stderr);
    if (result.status !== 0 && metadata().targets?.production?.id !== verified.deployment_id) throw new Error('Promotion failed');
  }
  const after = metadata().targets.production;
  if (after.id !== verified.deployment_id || after.readyState !== 'READY') throw new Error('Verified main deployment is not the current READY target');
  let homepage, installer, zip;
  for (let attempt = 0; attempt < 6; attempt++) {
    [homepage, installer, zip] = await Promise.all([
      fetch('https://www.buylife.xyz', { method: 'HEAD' }),
      fetch('https://www.buylife.xyz/downloads/AIMaster-Naver-Blog-Auto-Poster-0.1.0.exe', { method: 'HEAD' }),
      fetch('https://www.buylife.xyz/downloads/naver-blog-auto-poster-web-extension-latest.zip', { method: 'HEAD' }),
    ]);
    if ([homepage, installer, zip].every(r => r.status === 200)) break;
    // Alias propagation can briefly serve the previous Git deployment after promotion.
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  const proof = { documentation_revision: current, deployment_id: after.id, runtime_unchanged: true, homepage_http: homepage.status, installer_http: installer.status, extension_zip_http: zip.status, checked_at: new Date().toISOString() };
  fs.writeFileSync('.vercel/final-main-promotion.json', JSON.stringify(proof, null, 2));
  if ([homepage, installer, zip].some(r => r.status !== 200)) throw new Error('Final public artifacts did not all return HTTP 200');
  console.log(JSON.stringify(proof));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
