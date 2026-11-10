// wp-blogger-auto DB — 실제 Postgres(도커, 네트워크 없음)에 마이그레이션을 적용해 확인한다. 운영 DB는 건드리지 않는다.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const container = execFileSync('docker', ['run', '--pull', 'never', '--rm', '-d', '--network', 'none', '--label', 'aimaster.wba-test=true',
  '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'], { encoding: 'utf8', windowsHide: true }).trim();
const q = v => `'${String(v).replaceAll("'", "''")}'`;
const sql = (text, role = 'postgres', uid = null) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], {
  input: (uid ? `select set_config('request.jwt.claim.sub', ${q(uid)}, false);` : '') + (role === 'postgres' ? '' : `set role ${role};`) + text,
  encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).trim().split('\n').filter(l => l && !/^[0-9a-f-]{36}$/.test(l) || l === '').join('\n');
const errorOf = fn => { try { fn(); return ''; } catch (e) { return String(e.stderr || e.message); } };
let n = 0; const check = async (name, run) => { await run(); console.log(`ok ${++n} - ${name}`); };
const migrations = readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort()
  .map(f => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
try {
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    const logs = execFileSync('docker', ['logs', container], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    if (logs.includes('init process complete')) { try { sql('select 1;'); ready = true; } catch {} }
    if (!ready) await new Promise(r => setTimeout(r, 150));
  }
  assert.ok(ready);
  // Supabase 흉내: 역할·auth.uid()·profiles·공용 연동 표·storage.buckets
  sql(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth,public,storage to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    create table public.profiles(id uuid primary key references auth.users(id),retention_exempt boolean not null default false);
    create table public.integration_catalog(key text primary key, kind text not null check (kind in ('oauth_account','api_key','account_set')), label text not null,
      description text, key_names text[] not null default '{}', scope_sets jsonb not null default '{}', guide_id uuid, connect_program_url text,
      sort_order int not null default 100, is_active boolean not null default true);
    insert into public.integration_catalog(key,kind,label) values ('youtube','oauth_account','YouTube 채널');
    create table public.member_platform_accounts(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
      platform text not null references public.integration_catalog(key), external_id text not null, access_token text not null);
    create table storage.buckets(id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);`);
  for (const m of migrations) sql(m);

  const user = randomUUID(), other = randomUUID(), admin = randomUUID();
  sql(`insert into auth.users values(${q(user)}),(${q(other)}),(${q(admin)});
    insert into profiles(id,retention_exempt) values(${q(user)},false),(${q(other)},false),(${q(admin)},true);`);
  const add = (u, extra = '') => sql(`insert into wba_posts(user_id,platform,title,html,images${extra ? ',' + extra.split('=')[0] : ''})
    values(${q(u)},'blogger','t','<p>b</p>','[{"path":"${u}/x/1.jpg","url":"https://u/1.jpg"}]'${extra ? ',' + extra.split('=').slice(1).join('=') : ''}) returning id;`, 'service_role');

  await check('DB01 카탈로그에 wordpress·blogger 추가, 마이그레이션을 두 번 적용해도 오류 없음', () => {
    for (const m of migrations) sql(m);
    assert.equal(sql(`select string_agg(key, ',' order by key) from integration_catalog where key in ('wordpress','blogger');`), 'blogger,wordpress');
    assert.equal(sql(`select scope_sets->'publish'->>0 from integration_catalog where key='blogger';`), 'https://www.googleapis.com/auth/blogger');
    assert.equal(sql(`select public::text from storage.buckets where id='wba-images';`), 'true');
  });

  await check('DB02 회원은 자기 글만 보이고, 넣기·고치기는 못 하며, 자기 글 지우기만 가능', () => {
    add(user); add(other);
    assert.equal(sql(`select count(*) from wba_posts;`, 'authenticated', user), '1');
    assert.match(errorOf(() => sql(`insert into wba_posts(user_id,platform) values(${q(user)},'wordpress');`, 'authenticated', user)), /permission denied/);
    assert.match(errorOf(() => sql(`update wba_posts set status='published';`, 'authenticated', user)), /permission denied/);
    sql(`delete from wba_posts;`, 'authenticated', user);
    assert.equal(sql(`select count(*) from wba_posts where user_id=${q(other)};`), '1', '다른 회원 글은 남음');
    assert.equal(sql(`select count(*) from wba_posts where user_id=${q(user)};`), '0');
  });

  await check('DB03 비로그인(anon)은 읽기 불가, 회원은 정리 함수 실행 불가', () => {
    assert.match(errorOf(() => sql(`select count(*) from wba_posts;`, 'anon')), /permission denied/);
    assert.match(errorOf(() => sql(`select * from wba_cleanup();`, 'authenticated', user)), /permission denied/);
  });

  await check('DB04 30일 정리: 만료 일반 글 삭제+이미지 경로 반환, 관리자·시험 계정 제외, 구글 발행 글은 본문만 비움, 기한 전 글 유지', () => {
    sql(`delete from wba_posts;`);
    add(user, `expires_at=now() - interval '1 day'`);
    add(admin, `expires_at=now() - interval '1 day'`);
    add(other, `expires_at=now() - interval '1 day'`);
    sql(`update wba_posts set keep_images=true, status='published' where user_id=${q(other)};`);
    add(user, `expires_at=now() + interval '10 days'`);
    const paths = sql(`select * from wba_cleanup();`, 'service_role');
    assert.equal(paths, `${user}/x/1.jpg`, '만료된 일반 글의 이미지 경로만');
    assert.equal(sql(`select count(*) from wba_posts where user_id=${q(user)};`), '1', '기한 전 글은 남음');
    assert.equal(sql(`select count(*) from wba_posts where user_id=${q(admin)};`), '1', '관리자·시험 계정 열외');
    assert.equal(sql(`select html || '|' || coalesce(expires_at::text,'null') || '|' || jsonb_array_length(images) from wba_posts where user_id=${q(other)};`), '|null|1', '본문만 비우고 이미지·기록 유지');
    assert.equal(sql(`select count(*) from wba_cleanup();`, 'service_role'), '0', '두 번째 정리는 할 일 없음');
  });

  await check('DB05 상태·방식 값 제한', () => {
    assert.match(errorOf(() => sql(`insert into wba_posts(user_id,platform,status) values(${q(user)},'blogger','done');`, 'service_role')), /check constraint/);
    assert.match(errorOf(() => sql(`insert into wba_posts(user_id,platform) values(${q(user)},'tistory');`, 'service_role')), /check constraint/);
    assert.match(errorOf(() => sql(`insert into wba_posts(user_id,platform,mode) values(${q(user)},'wordpress','now');`, 'service_role')), /check constraint/);
  });
  console.log(`\n${n}개 통과`);
} finally {
  execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore', windowsHide: true });
}
