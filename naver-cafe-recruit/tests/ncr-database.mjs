// naver-cafe-recruit DB — 실제 Postgres(도커)에 마이그레이션을 순서대로 적용해 확인한다.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const container = execFileSync('docker', ['run', '--pull', 'never', '--rm', '-d', '--network', 'none', '--label', 'aimaster.ncr-test=true',
  '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'], { encoding: 'utf8', windowsHide: true }).trim();
const q = v => `'${String(v).replaceAll("'", "''")}'`;
const sql = (text, role = 'postgres') => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], {
  input: (role === 'postgres' ? '' : `set role ${role};`) + text, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const errorOf = fn => { try { fn(); return ''; } catch (e) { return String(e.stderr || e.message); } };
let n = 0; const check = async (name, run) => { await run(); console.log(`ok ${++n} - ${name}`); };
try {
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    const logs = execFileSync('docker', ['logs', container], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    if (logs.includes('init process complete')) { try { sql('select 1;'); ready = true; } catch {} }
    if (!ready) await new Promise(r => setTimeout(r, 150));
  }
  assert.ok(ready);
  sql(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key);
    grant usage on schema auth,public to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    create table public.profiles(id uuid primary key references auth.users(id),retention_exempt boolean not null default false);`);
  for (const f of readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort())
    sql(readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
  const user = randomUUID(), other = randomUUID(), admin = randomUUID();
  sql(`insert into auth.users values(${q(user)}),(${q(other)}),(${q(admin)});insert into profiles(id,retention_exempt) values(${q(user)},false),(${q(other)},false),(${q(admin)},true);`);
  const call = (u, op, p = {}) => JSON.parse(sql(`select ncr_dispatch(${q(u)},${q(op)},${q(JSON.stringify(p))}::jsonb);`, 'service_role'));
  const always = { mode_known: true, mode_promo: true, mode_extract: false, daily_cap: 2, active_start_minute: 0, active_end_minute: 0 };

  await check('NC01 defaults before saving; extract mode cannot be turned on without the responsibility consent', () => {
    const s = call(user, 'settings_get'); assert.equal(s.daily_cap, 20); assert.equal(s.mode_extract, false); assert.equal(s.used_today, 0);
    assert.match(errorOf(() => call(user, 'settings_save', { ...always, mode_extract: true })), /NCR_EXTRACT_CONSENT_REQUIRED/);
    assert.equal(call(user, 'settings_get').mode_extract, false, 'the refused save left nothing behind');
    assert.match(errorOf(() => call(user, 'settings_save', { ...always, daily_cap: 30 })), /NCR_INPUT/);
    call(user, 'settings_save', always);
  });
  await check('NC02 known IDs are added once; malformed IDs are skipped; extract rows need extract mode', () => {
    const r = call(user, 'targets_add', { source_mode: 'known', rows: [{ naver_id: 'alpha01' }, { naver_id: 'beta02' }, { naver_id: 'alpha01' }, { naver_id: 'Bad Id!' }, { naver_id: 'gamma03' }] });
    assert.equal(r.added, 3); assert.equal(r.skipped, 2);
    assert.match(errorOf(() => call(user, 'targets_add', { source_mode: 'extract', rows: [{ naver_id: 'delta04' }] })), /NCR_EXTRACT_NOT_ENABLED/);
    assert.match(errorOf(() => call(user, 'targets_add', { source_mode: 'known', rows: Array.from({ length: 201 }, (_, i) => ({ naver_id: `id${i}xx` })) })), /NCR_INPUT/);
  });
  await check('NC03 nothing is invited before review; one approval reviews the drafts; skipped ones stay out', () => {
    assert.equal(call(user, 'next_target', { cafe_id: '12345' }).phase, 'idle');
    const list = call(user, 'targets_list').targets; const gamma = list.find(t => t.naver_id === 'gamma03');
    call(user, 'target_skip', { id: gamma.id });
    assert.equal(call(user, 'targets_review_all').reviewed, 2);
  });
  await check('NC04 next target respects the daily cap and never repeats someone already invited to that cafe', () => {
    const a = call(user, 'next_target', { cafe_id: '12345' }); assert.equal(a.phase, 'invite');
    call(user, 'sent_mark', { cafe_id: '12345', naver_id: a.naver_id, result: 'sent' });
    const b = call(user, 'next_target', { cafe_id: '12345' }); assert.equal(b.phase, 'invite'); assert.notEqual(b.naver_id, a.naver_id);
    call(user, 'sent_mark', { cafe_id: '12345', naver_id: b.naver_id, result: 'sent' });
    const c = call(user, 'next_target', { cafe_id: '12345' }); assert.equal(c.phase, 'waiting'); assert.equal(c.reason, 'daily_cap');
    call(user, 'sent_mark', { cafe_id: '12345', naver_id: a.naver_id, result: 'failed' });
    assert.equal(sql(`select result from ncr_sent where naver_id=${q(a.naver_id)};`), 'sent', 'a sent record is never overwritten');
  });
  await check('NC05 a Naver limit notice stops the rest of the day; outside the time window nothing is handed out', () => {
    call(user, 'settings_save', { ...always, daily_cap: 25 });
    call(user, 'sent_mark', { cafe_id: '999', naver_id: 'alpha01', result: 'limited', detail: '일일 초대 수 초과' });
    assert.equal(call(user, 'next_target', { cafe_id: '999' }).reason, 'limited_today');
    sql(`delete from ncr_sent where result='limited';`);
    const m = Number(sql(`select extract(hour from now() at time zone 'Asia/Seoul')::int*60+extract(minute from now() at time zone 'Asia/Seoul')::int;`));
    call(user, 'settings_save', { ...always, daily_cap: 25, active_start_minute: (m + 60) % 1440, active_end_minute: (m + 120) % 1440 });
    assert.equal(call(user, 'next_target', { cafe_id: '999' }).reason, 'outside_window');
  });
  await check('NC06 members are isolated: another member sees none of these targets or records', () => {
    assert.equal(call(other, 'targets_list').targets.length, 0); assert.equal(call(other, 'sent_list').sent.length, 0);
  });
  await check('NC07 the 30-day expiry is kept, the admin/test account is exempt, and the daily cleanup removes expired rows for everyone', () => {
    call(admin, 'targets_add', { source_mode: 'known', rows: [{ naver_id: 'keepme1' }] });
    assert.equal(sql(`select expires_at='9999-12-31 00:00:00+00' from ncr_targets where naver_id='keepme1';`), 't');
    assert.equal(sql(`select (expires_at-created_at)=interval '720 hours' from ncr_targets where user_id=${q(user)} limit 1;`), 't');
    sql(`update ncr_targets set expires_at=now()-interval '1 minute' where user_id=${q(user)};`);
    const r = JSON.parse(sql('select ncr_cleanup();', 'service_role'));
    assert.ok(r.targetsRemoved >= 3); assert.equal(sql(`select count(*) from ncr_targets where naver_id='keepme1';`), '1');
  });
  await check('NC08 members cannot touch the tables or call the functions directly', () => {
    assert.match(errorOf(() => sql('select * from ncr_targets;', 'authenticated')), /permission denied/i);
    assert.match(errorOf(() => sql(`select ncr_dispatch(${q(user)},'targets_list','{}');`, 'authenticated')), /permission denied/i);
    assert.match(errorOf(() => sql('select ncr_cleanup();', 'anon')), /permission denied/i);
  });
  console.log(`ncr database: ${n} passed`);
} finally { execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore', windowsHide: true }); }
