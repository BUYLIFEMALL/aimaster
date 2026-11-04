// v1.17 C-1 (2): 같은 글·같은 동작 작업은 만들 때부터 막는다 — 실제 Postgres에 모든 마이그레이션을 순서대로 적용해 확인.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const container = execFileSync('docker', ['run', '--pull', 'never', '--rm', '-d', '--network', 'none', '--label', 'aimaster.bnc-duplicate-guard-test=true',
  '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'], { encoding: 'utf8', windowsHide: true }).trim();
assert.match(container, /^[a-f0-9]{64}$/);
const q = v => `'${String(v).replaceAll("'", "''")}'`;
const sql = (text, role = 'postgres') => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], {
  input: (role === 'postgres' ? '' : `set role ${role};`) + text, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
const tests = [];
async function check(name, run) { await run(); tests.push(name); console.log(`ok ${tests.length} - ${name}`); }
const errorOf = fn => { try { fn(); return ''; } catch (e) { return String(e.stderr || e.message); } };

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
  for (const file of readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort())
    sql(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  sql("update bnc_runtime set live_allowed=true,policy_reference='isolated-fixture-only';");
  const user = randomUUID(), account = randomUUID();
  sql(`insert into auth.users values(${q(user)});insert into public.profiles(id) values(${q(user)});
    insert into member_platform_accounts(id,user_id,platform,external_id,access_token) values(${q(account)},${q(user)},'naver_blog','myblog','fixture-only');`);
  sql(`select bnc_dispatch(${q(user)},'configure','{"enabled":true}'::jsonb);`, 'service_role');
  const create = (kind, post, body = '') => JSON.parse(sql(`select bnc_dispatch(${q(user)},'create',${q(JSON.stringify({ account_id: account, neighbor_id: 'neighbor', kind, post_id: post, body }))}::jsonb);`, 'service_role'));

  let first;
  await check('DG01 the same post and the same action cannot get a second job, even while the first is only a draft', () => {
    first = create('like', '111');
    assert.equal(first.state, 'draft');
    assert.match(errorOf(() => create('like', '111')), /BNC_DUPLICATE_ACTION/);
    assert.equal(sql(`select count(*) from bnc_jobs where post_id='111' and kind='like';`), '1');
  });
  await check('DG02 a different post or a different action on the same post is still allowed', () => {
    assert.equal(create('like', '222').state, 'draft');
    assert.equal(create('comment', '111', '좋은 글 잘 읽었습니다.').state, 'draft');
  });
  await check('DG03 a stopped (skipped) job does not block making the job again', () => {
    sql(`update bnc_jobs set state='skipped' where id=${q(first.id)};`);
    assert.equal(create('like', '111').state, 'draft');
  });
  await check('DG04 members cannot call the guard helper directly', () => {
    assert.match(errorOf(() => sql('select bnc_private.block_duplicate_job();', 'authenticated')), /permission denied|denied/i);
  });
  console.log(`duplicate guard database: ${tests.length} passed`);
} finally {
  execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore', windowsHide: true });
}
