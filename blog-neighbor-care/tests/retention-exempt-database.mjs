// v1.15 관리자·시험 계정(profiles.retention_exempt) 30일 정리 열외 — 실제 Postgres에 모든 마이그레이션을 순서대로 적용해 확인한다.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { createCleanupHandler } from '../src/lib/cleanup.ts';

const exemptMigration = '20261104120000_bnc_retention_exempt.sql';
const FAR = '9999-12-31 00:00:00+00';
const container = execFileSync('docker', ['run', '--pull', 'never', '--rm', '-d', '--network', 'none', '--label', 'aimaster.bnc-retention-exempt-test=true',
  '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'], { encoding: 'utf8', windowsHide: true }).trim();
assert.match(container, /^[a-f0-9]{64}$/);
const q = v => `'${String(v).replaceAll("'", "''")}'`;
const sql = (text, role = 'postgres') => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], {
  input: (role === 'postgres' ? '' : `set role ${role};`) + text, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
const migration = name => sql(readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
const tests = [];
async function check(name, run) { await run(); tests.push(name); console.log(`ok ${tests.length} - ${name}`); }

function member(exempt) {
  const m = { user: randomUUID(), account: randomUUID(), actor: `actor${randomUUID().slice(0, 8)}` };
  sql(`insert into auth.users values(${q(m.user)});insert into public.profiles(id,retention_exempt) values(${q(m.user)},${exempt});
    insert into member_platform_accounts(id,user_id,platform,external_id,access_token) values(${q(m.account)},${q(m.user)},'naver_blog',${q(m.actor)},'fixture-only');`);
  sql(`select bnc_dispatch(${q(m.user)},'configure','{"enabled":true}'::jsonb);`, 'service_role');
  return m;
}
// observedAgo: 관측 시각을 얼마나 과거로 둘지(30일보다 길면 이미 만료된 줄)
function inbox(m, observedAgo = '1 minute') {
  const id = randomUUID();
  sql(`insert into bnc_engagement_inbox(id,user_id,account_id,actor_id,neighbor_id,own_post_id,comment_id,observed_at,created_at,expires_at)
    values(${q(id)},${q(m.user)},${q(m.account)},${q(m.actor)},'fixture-neighbor','123',${q(`c-${id}`)},
    now()-interval ${q(observedAgo)},now()-interval ${q(observedAgo)},now()-interval ${q(observedAgo)}+interval '720 hours');`);
  return id;
}
const expiry = id => sql(`select to_char(expires_at at time zone 'UTC','YYYY-MM-DD') from bnc_engagement_inbox where id=${q(id)};`);
const exists = (table, where) => sql(`select count(*) from ${table} where ${where};`) === '1';
function monitor(m, createdAgo) {
  sql(`insert into bnc_monitors(user_id,state,account_id,neighbors,ai_enabled,budget_micros,max_ai,created_at,expires_at)
    values(${q(m.user)},'finished',${q(m.account)},array['fixture-neighbor'],false,0,0,now()-interval ${q(createdAgo)},now()-interval ${q(createdAgo)}+interval '7 days');`);
}

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
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    create table public.profiles(id uuid primary key references auth.users(id),retention_exempt boolean not null default false);`);
  sql(readFileSync(new URL('../../supabase/migrations/0039_member_integrations.sql', import.meta.url), 'utf8'));
  const all = readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort();
  assert.ok(all.includes(exemptMigration));
  for (const file of all.filter(f => f < exemptMigration)) migration(file);
  sql("update bnc_runtime set live_allowed=true,policy_reference='isolated-fixture-only';");

  const exempt = member(true), normal = member(false);
  const before = { exempt: inbox(exempt), normal: inbox(normal) };
  monitor(exempt, '40 days'); monitor(normal, '40 days');

  await check('RX01 applying the migration turns an exempt member’s existing 30-day expiry into 9999-12-31 only', () => {
    migration(exemptMigration);
    assert.equal(expiry(before.exempt), '9999-12-31');
    assert.notEqual(expiry(before.normal), '9999-12-31');
    assert.equal(sql(`select count(*) from pg_trigger where tgname='bnc_keep_exempt_expiry' and not tgisinternal;`), '18');
  });

  await check('RX02 new rows: exempt 30-day expiry kept forever (check constraint allows it), normal member still 30 days', () => {
    const e = inbox(exempt), n = inbox(normal);
    assert.equal(expiry(e), '9999-12-31');
    assert.equal(sql(`select (expires_at-observed_at)='720 hours'::interval from bnc_engagement_inbox where id=${q(n)};`), 't');
  });

  await check('RX03 short working deadlines and members without a profile row are not touched', () => {
    sql(`create table public.rx_probe(user_id uuid,expires_at timestamptz);
      create trigger rx before insert or update of expires_at on public.rx_probe for each row execute function bnc_private.keep_exempt_expiry();
      insert into public.rx_probe values(${q(exempt.user)},now()+interval '2 minutes'),(${q(exempt.user)},now()+interval '24 hours'),(${q(exempt.user)},now()+interval '7 days'),
        (${q(exempt.user)},now()+interval '720 hours'),(${q(randomUUID())},now()+interval '720 hours');`);
    assert.equal(sql(`select string_agg((expires_at=${q(FAR)}::timestamptz)::text,',' order by expires_at) from public.rx_probe;`), 'false,false,false,false,true');
    sql(`update public.rx_probe set expires_at=now() where user_id=${q(exempt.user)} and expires_at=${q(FAR)}::timestamptz;`);
    assert.equal(sql(`select count(*) from public.rx_probe where expires_at=${q(FAR)}::timestamptz;`), '0', 'forced expiry still works');
    sql('drop table public.rx_probe;');
  });

  await check('RX04 daily cleanup (all 12 RPCs) removes the normal member’s expired rows and keeps every exempt row', async () => {
    const oldNormal = inbox(normal, '31 days');
    const handler = createCleanupHandler({ secret: () => 'fixture-only', rpc: async (name, args) =>
      ({ data: JSON.parse(sql(`select public.${name}(${args.p_user_id},'cleanup','{}');`, 'service_role')), error: null }) });
    const res = await handler(new Request('https://fixture.test/api/cron/cleanup-reader', { headers: { authorization: 'Bearer fixture-only' } }));
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(Object.keys(body.results).length, 12);
    assert.equal(exists('bnc_engagement_inbox', `id=${q(oldNormal)}`), false, 'normal member 30-day row removed');
    assert.equal(exists('bnc_engagement_inbox', `id=${q(before.normal)}`), true, 'normal member fresh row kept');
    assert.equal(sql(`select count(*) from bnc_engagement_inbox where user_id=${q(exempt.user)};`), '2');
    assert.equal(exists('bnc_monitors', `user_id=${q(exempt.user)}`), true, 'exempt finished monitor kept');
    assert.equal(exists('bnc_monitors', `user_id=${q(normal.user)}`), false, 'normal finished monitor removed 30 days after its window');
  });

  await check('RX06 the engagement source guard still blocks every other change', () => {
    assert.throws(() => sql(`update bnc_engagement_inbox set expires_at=${q(FAR)}::timestamptz where id=${q(before.normal)};`), /BNC_SOURCE_CHANGED/);
    assert.throws(() => sql(`update bnc_engagement_inbox set expires_at=now()+interval '1 day' where id=${q(before.exempt)};`), /BNC_SOURCE_CHANGED/);
    assert.throws(() => sql(`update bnc_engagement_inbox set neighbor_id='other-neighbor' where id=${q(before.exempt)};`), /BNC_SOURCE_CHANGED/);
  });

  await check('RX05 members cannot call the exemption helpers', () => {
    assert.throws(() => sql(`select bnc_private.retention_exempt(${q(exempt.user)});`, 'authenticated'));
  });
  console.log(`retention exempt database: ${tests.length} passed`);
} finally {
  execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore', windowsHide: true });
}
