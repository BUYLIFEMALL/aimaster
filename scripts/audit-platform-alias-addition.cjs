// Read-only, value-free evidence for the owner's approved Production aliases.
const fs = require('node:fs');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
const dir = 'docs/supabase-compat-rollout-20261016';
const read = name => JSON.parse(fs.readFileSync(`${dir}/${name}.json`, 'utf8'));
const before = read('vercel-environment-names-before-addition');
const after = read('vercel-environment-names');
const additions = read('environment-addition-results');
const plan = read('environment-addition-plan');
const deployments = read('deployments');
const browser = read('browser-live-results');
const projectsBefore = read('projects-before');
const projectsAfter = read('projects-after');
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };
check(additions.length === 160 && additions.every(x => x.ok), 'All 160 approved additions must succeed');
check(new Set(additions.map(x => x.project)).size === 82, 'Expected 82 affected projects');
check(after.length === 83 && after.every(x => x.ok), 'Expected 83 current environment audits');
const signature = v => `${v.key}|${[...v.target].sort().join(',')}|${v.type}`;
for (const p of before) {
  const current = after.find(x => x.slug === p.slug);
  const signatures = new Set((current?.variables || []).map(signature));
  for (const v of p.variables) check(signatures.has(signature(v)), `${p.project}: existing variable scope/type changed: ${v.key}`);
}
for (const p of plan) {
  const current = after.find(x => x.slug === p.slug);
  for (const item of p.add) {
    const variable = current?.variables.find(v => v.key === item.key && v.target.includes('production'));
    check(!!variable, `${p.project}: missing approved alias ${item.key}`);
    if (variable) check(item.type === 'Secret' ? variable.type === 'sensitive' : variable.type !== 'sensitive', `${p.project}: wrong variable type ${item.key}`);
  }
}
for (const d of deployments) {
  check(d.ok && d.readyState === 'READY', `${d.slug}: deployment not READY`);
  const live = browser.find(x => x.slug === d.slug);
  check(live?.ok && live.browser === 'Microsoft Edge' && live.deployment_id === d.deployment_id, `${d.slug}: fresh deployment Edge verification missing`);
  const previous = projectsBefore.find(x => x.slug === d.slug);
  const current = projectsAfter.find(x => x.slug === d.slug);
  check(current?.ok && current.production?.id === d.deployment_id, `${d.slug}: current Production target differs`);
  check(JSON.stringify(previous?.crons) === JSON.stringify(current?.crons), `${d.slug}: Cron metadata changed`);
}
const proof = {
  checked_at: new Date().toISOString(),
  approved_projects: 82,
  added: additions.filter(x => x.ok).length,
  public_added: additions.filter(x => x.key === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' && x.ok).length,
  server_added: additions.filter(x => x.key === 'SUPABASE_SECRET_KEY' && x.ok).length,
  public_registered: after.filter(x => x.production_public === 'new').length,
  server_registered: after.filter(x => x.production_server === 'new').length,
  unused_server_key_exception: 'video-to-gif',
  preserved_existing_scopes_and_types: !errors.some(x => x.includes('existing variable')),
  ready_deployments: deployments.filter(x => x.ok).length,
  fresh_edge_checks: browser.filter(x => x.ok && deployments.some(d => d.slug === x.slug && d.deployment_id === x.deployment_id)).length,
  legacy_removed: false,
  keys_issued_or_revoked: false,
  paid_ai_calls: 0,
  errors,
};
fs.writeFileSync(`${dir}/environment-addition-audit.json`, JSON.stringify(proof, null, 2) + '\n');
console.log(JSON.stringify(proof));
if (errors.length) process.exitCode = 1;
