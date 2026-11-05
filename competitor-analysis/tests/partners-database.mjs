// 제휴 타깃 찾기(v1.10) DB — 실제 Postgres(도커)에 새 마이그레이션만 적용해 회원 격리·수정 가능 칸·30일·정리를 확인한다.
// 기존 공용 트리거 함수(v1.08 competitor_stamp_content_created_at)는 원본과 같은 본문으로 미리 만든다. 네트워크 없음.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const container = execFileSync('docker', ['run', '--pull', 'never', '--rm', '-d', '--network', 'none', '--label', 'aimaster.competitor-test=true',
  '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'], { encoding: 'utf8', windowsHide: true }).trim();
const q = v => `'${String(v).replaceAll("'", "''")}'`;
const sql = (text, as = null) => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], {
  input: (as ? `set role authenticated; set request.jwt.claim.sub = ${q(as)};` : '') + text, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const errorOf = fn => { try { fn(); return ''; } catch (e) { return String(e.stderr || e.message); } };
let n = 0; const check = (name, run) => { run(); console.log(`ok ${++n} - ${name}`); };
try {
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    const logs = execFileSync('docker', ['logs', container], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    if (logs.includes('init process complete')) { try { sql('select 1;'); ready = true; } catch {} }
    if (!ready) await new Promise(r => setTimeout(r, 150));
  }
  assert.ok(ready);
  const v108 = readFileSync(new URL('../supabase/migrations/20261016115339_member_owned_generated_data_retention.sql', import.meta.url), 'utf8');
  const stamp = v108.slice(v108.indexOf('create function public.competitor_stamp_content_created_at()'), v108.indexOf('revoke all on function public.competitor_stamp_content_created_at()'));
  assert.ok(stamp.includes('statement_timestamp()'), 'the shared trigger body was found in v1.08');
  sql(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema cron;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table cron.jobs(name text, schedule text, command text);
    create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.jobs values(n,s,c) returning 1::bigint $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to authenticated;
    create table public.profiles(id uuid primary key references auth.users(id),retention_exempt boolean not null default false);
    ${stamp}`);
  sql(readFileSync(new URL('../supabase/migrations/20261105140000_partner_channels.sql', import.meta.url), 'utf8'));
  const a = randomUUID(), b = randomUUID(), admin = randomUUID();
  sql(`insert into auth.users values(${q(a)}),(${q(b)}),(${q(admin)});
    insert into profiles values(${q(a)},false),(${q(b)},false),(${q(admin)},true);`);
  const add = (who, name, extra = '') => sql(`insert into competitor_partner_channels(user_id,keyword,channel_type,name,url${extra ? ',created_at' : ''})
    values(${q(who)},'공동구매','blog',${q(name)},${q('https://blog.naver.com/' + name)}${extra ? ',' + extra : ''}) returning id;`, extra ? null : who);

  check('PD01 a member adds and sees only own channels; inserting for another member is refused', () => {
    add(a, 'alpha'); add(b, 'beta');
    assert.equal(sql('select string_agg(name, \',\') from competitor_partner_channels;', a), 'alpha');
    assert.equal(sql('select string_agg(name, \',\') from competitor_partner_channels;', b), 'beta');
    assert.match(errorOf(() => sql(`insert into competitor_partner_channels(user_id,keyword,channel_type,name) values(${q(b)},'x','blog','spoof');`, a)), /row-level security/);
  });
  check('PD02 another member\'s row cannot be changed or deleted (0 rows)', () => {
    const bid = sql('select id from competitor_partner_channels where name=\'beta\';');
    assert.equal(sql(`with u as (update competitor_partner_channels set public_phone='010-2222-3333' where id=${q(bid)} returning 1) select count(*) from u;`, a), '0');
    assert.equal(sql(`with d as (delete from competitor_partner_channels where id=${q(bid)} returning 1) select count(*) from d;`, a), '0');
    assert.equal(sql(`select coalesce(public_phone,'') from competitor_partner_channels where id=${q(bid)};`), '');
  });
  check('PD03 a member may fix contact columns but not name, score or scan status', () => {
    sql(`update competitor_partner_channels set public_phone='010-9876-5432', phones_mobile='{}', primary_contact=null where name='alpha';`, a);
    assert.equal(sql('select public_phone from competitor_partner_channels where name=\'alpha\';'), '010-9876-5432');
    for (const col of ["name='renamed'", 'match_score=99', "scan_status='done'", 'profile_match_score=60', "display_name='x'"])
      assert.match(errorOf(() => sql(`update competitor_partner_channels set ${col} where name='alpha';`, a)), /permission denied/, col);
  });
  check('PD04 the creation time comes from the database and cannot be forged or extended', () => {
    sql(`insert into competitor_partner_channels(user_id,keyword,channel_type,name,created_at) values(${q(a)},'x','shop','forged','2099-01-01');`, a);
    assert.equal(sql('select created_at < now() + interval \'1 minute\' from competitor_partner_channels where name=\'forged\';'), 't');
    const before = sql('select created_at from competitor_partner_channels where name=\'alpha\';');
    sql(`update competitor_partner_channels set contact_note='memo' where name='alpha';`, a);
    assert.equal(sql('select created_at from competitor_partner_channels where name=\'alpha\';'), before);
  });
  check('PD05 rows older than 30 days are hidden from members except the exempt admin/test accounts', () => {
    add(a, 'old-a', "now() - interval '31 days'"); add(admin, 'old-admin', "now() - interval '40 days'");
    assert.equal(sql('select count(*) from competitor_partner_channels where name=\'old-a\';', a), '0');
    assert.equal(sql('select count(*) from competitor_partner_channels where name=\'old-admin\';', admin), '1');
  });
  check('PD06 cleanup deletes only expired non-exempt rows; only the database owner can run it; hourly job registered', () => {
    assert.match(errorOf(() => sql('select cleanup_competitor_partner_channels();', a)), /permission denied/);
    assert.equal(JSON.parse(sql('select cleanup_competitor_partner_channels();')).partner_channels, 1);
    assert.equal(sql('select string_agg(name, \',\' order by name) from competitor_partner_channels where name like \'old%\';'), 'old-admin');
    assert.equal(sql('select schedule from cron.jobs where name=\'competitor-partner-channels-retention-30d\';'), '11 * * * *');
  });
  check('PD07 consent rows are owner-only and the e-mail collection switch defaults to off', () => {
    sql(`insert into competitor_partner_consents(user_id,notice_version) values(${q(a)},1);`, a);
    assert.equal(sql('select collect_email from competitor_partner_consents;', a), 'f');
    assert.equal(sql('select count(*) from competitor_partner_consents;', b), '0');
    assert.match(errorOf(() => sql(`insert into competitor_partner_consents(user_id,notice_version) values(${q(a)},1);`, b)), /row-level security/);
    assert.equal(sql(`with u as (update competitor_partner_consents set collect_email=true where user_id=${q(a)} returning 1) select count(*) from u;`, b), '0');
  });
  check('PD08 anonymous visitors have no access to either table', () => {
    for (const t of ['competitor_partner_channels', 'competitor_partner_consents'])
      assert.match(errorOf(() => sql(`set role anon; select count(*) from ${t};`)), /permission denied/);
  });
  console.log(`# ${n} checks passed`);
} finally {
  execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore', windowsHide: true });
}
