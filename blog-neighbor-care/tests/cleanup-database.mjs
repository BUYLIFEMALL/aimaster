import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createCleanupHandler } from '../src/lib/cleanup.ts';

const label = 'aimaster.bnc-cleanup-test';
const container = execFileSync('docker', ['run', '--pull', 'never', '--rm', '-d', '--network', 'none', '--label', `${label}=true`,
  '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'], { encoding: 'utf8', windowsHide: true }).trim();
assert.match(container, /^[a-f0-9]{64}$/);
const q = value => `'${String(value).replaceAll("'", "''")}'`;
const hash = value => createHash('sha256').update(value).digest('hex');
const sql = (text, role = 'postgres') => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], {
  input: (role === 'postgres' ? '' : `set role ${role};`) + text, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
const tests = [];
async function check(name, run) { await run(); tests.push(name); console.log(`ok ${tests.length} - ${name}`); }
const request = () => new Request('https://fixture.test/api/cron/cleanup-reader', { headers: { authorization: 'Bearer fixture-only' } });
let failure = '';
const calls = [];
const handler = createCleanupHandler({ secret: () => 'fixture-only', rpc: async (name, args) => {
  assert.deepEqual(args, { p_user_id: null, p_operation: 'cleanup', p_payload: {} });
  calls.push(name);
  if (name === failure) return { data: null, error: { message: 'fixture SQL unavailable' } };
  return { data: JSON.parse(sql(`select public.${name}(null,'cleanup','{}');`, 'service_role')), error: null };
} });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    const logs = execFileSync('docker', ['logs', container], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    if (logs.includes('init process complete')) { try { sql('select 1;'); ready = true; break; } catch {} }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  assert.ok(ready);
  sql(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
  for (const file of ['../../supabase/migrations/0039_member_integrations.sql',
    '../supabase/migrations/20261026103202_bnc_server_queue.sql', '../supabase/migrations/20261026163340_bnc_reader_connection.sql',
    '../supabase/migrations/20261027042907_bnc_analysis.sql', '../supabase/migrations/20261027141316_bnc_neighbor_import.sql']) {
    sql(readFileSync(new URL(file, import.meta.url), 'utf8'));
  }
  const fixtures = [];
  for (const expired of [true, false]) {
    const user = randomUUID(), id = randomUUID(), profile = randomUUID(), run = randomUUID(), code = hash(randomUUID());
    const created = expired ? "now()-interval '721 hours'" : 'now()';
    const expiry = expired ? "now()-interval '1 hour'" : "now()+interval '720 hours'";
    sql(`insert into auth.users values(${q(user)});
      select public.bnc_reader_dispatch(${q(user)},'pair_issue',${q(JSON.stringify({ code_hash: code, blog_id: `fixture-${expired}` }))}::jsonb);`);
    const device = JSON.parse(sql(`select public.bnc_reader_dispatch(${q(user)},'pair_connect',${q(JSON.stringify({ code_hash: code, token_hash: hash(randomUUID()), device_name: 'Fixture Edge' }))}::jsonb);`, 'service_role'));
    const account = sql(`select account_id from public.bnc_reader_devices where id=${q(device.deviceId)};`);
    sql(`insert into public.bnc_reader_requests(id,user_id,blog_id,post_id,state,created_at,expires_at)
      values(${q(id)},${q(user)},'fixture','123','completed',${created},${expiry});
      insert into public.bnc_reader_materials(id,user_id,blog_id,post_id,title,body,content_hash,created_at,expires_at)
      values(${q(id)},${q(user)},'fixture','123','가상 제목','가상 본문',${q(hash(id))},${created},${expiry});
      insert into public.bnc_analysis_sources(user_id,blog_id,post_id,title,body,content_hash,created_at,expires_at)
      values(${q(user)},'fixture','123','가상 제목','가상 본문',${q(hash(id))},${created},${expiry});
      insert into public.bnc_analysis_jobs(id,user_id,kind,input_hash,input,material_ids,state,created_at,expires_at)
      values(${q(profile)},${q(user)},'profile',${q(hash(profile))},'{}',array[${q(id)}::uuid],'succeeded',${created},${expiry});
      insert into public.bnc_neighbor_imports(id,user_id,account_id,device_id,blog_id,policy_revision,state,created_at,expires_at)
      values(${q(run)},${q(user)},${q(account)},${q(device.deviceId)},'fixture',1,'confirmed',${created},${expiry});
      insert into public.bnc_neighbor_import_pages(import_id,page,nonce_hash,valid_until,rows,expires_at)
      values(${q(run)},1,${q(hash(run))},now(),'[]',${expiry});
      insert into public.bnc_neighbor_directory(user_id,account_id,neighbor_id,relation_type,new_posts_enabled,return_visits_enabled,last_import_id,observed_at)
      values(${q(user)},${q(account)},'neighbor','mutual',true,false,${q(run)},now());`);
    fixtures.push({ user, id, profile, run, account, device: device.deviceId });
  }
  const expired = fixtures[0], current = fixtures[1];
  await check('CDB01 reader failure still expires analysis/import data, reports 503 and preserves member settings', async () => {
    failure = 'bnc_reader_dispatch';
    const response = await handler(request()), result = await response.json();
    assert.equal(response.status, 503); assert.equal(result.results.reader.ok, false);
    assert.equal(result.results.analysis.data.expiredJobsRemoved, 1); assert.equal(result.results.neighbors.data.expiredImportsRemoved, 1);
    assert.equal(sql(`select count(*) from public.bnc_reader_materials where id=${q(expired.id)};`), '1');
    assert.equal(sql(`select count(*) from public.bnc_analysis_sources where user_id=${q(expired.user)};`), '0');
    assert.equal(sql(`select count(*) from public.bnc_neighbor_import_pages where import_id=${q(expired.run)};`), '0');
    assert.equal(sql(`select last_import_id is null and new_posts_enabled and not return_visits_enabled from public.bnc_neighbor_directory where user_id=${q(expired.user)};`), 't');
    assert.equal(sql(`select count(*) from public.bnc_reader_devices where id=${q(expired.device)};`), '1');
  });
  await check('CDB02 retry removes remaining expired body without deleting the other member or refreshing lifetime', async () => {
    failure = '';
    const response = await handler(request()), result = await response.json();
    assert.equal(response.status, 200); assert.equal(result.results.reader.data.expiredRequestsRemoved, 1);
    assert.equal(sql(`select count(*) from public.bnc_reader_materials where id=${q(expired.id)};`), '0');
    for (const table of ['bnc_reader_materials', 'bnc_analysis_jobs', 'bnc_analysis_sources', 'bnc_neighbor_imports']) {
      assert.equal(sql(`select count(*) from public.${table} where user_id=${q(current.user)};`), '1');
    }
    assert.equal(sql(`select expires_at=created_at+interval '720 hours' from public.bnc_reader_materials where id=${q(current.id)};`), 't');
  });
  await check('CDB03 repeated cleanup is idempotent, retains all directories and never enables gates', async () => {
    const response = await handler(request()), result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.results.reader.data.expiredRequestsRemoved, 0);
    assert.equal(result.results.analysis.data.expiredJobsRemoved, 0);
    assert.equal(result.results.neighbors.data.expiredImportsRemoved, 0);
    assert.equal(sql('select count(*) from public.bnc_neighbor_directory;'), '2');
    assert.equal(sql('select not live_allowed from public.bnc_runtime;'), 't');
    assert.equal(sql('select not read_allowed from public.bnc_neighbor_import_policy;'), 't');
  });
  writeFileSync(new URL('../docs/evidence/cleanup-database-20261028.json', import.meta.url), JSON.stringify({
    checkedAt: new Date().toISOString(), database: sql('select version();'), tests, passed: tests.length,
    network: 'none', hostPorts: 0, actualSqlCalls: calls.length, fixtureMembers: 2,
    operatingDatabaseChanged: false, realAiCalls: 0, remaining: 'Core social-job payload retention and live Cron deletion remain unverified.',
  }, null, 2) + '\n');
} finally {
  const ownLabel = execFileSync('docker', ['inspect', '--format', `{{index .Config.Labels "${label}"}}`, container], { encoding: 'utf8', windowsHide: true }).trim();
  assert.equal(ownLabel, 'true', 'Container ownership mismatch: cleanup skipped');
  execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore', windowsHide: true });
}
