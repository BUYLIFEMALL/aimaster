// v1.18 C-2 자동 운영 — 실제 Postgres에 모든 마이그레이션을 순서대로 적용해 확인한다.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const container = execFileSync('docker', ['run', '--pull', 'never', '--rm', '-d', '--network', 'none', '--label', 'aimaster.bnc-autopilot-test=true',
  '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'], { encoding: 'utf8', windowsHide: true }).trim();
assert.match(container, /^[a-f0-9]{64}$/);
const q = v => `'${String(v).replaceAll("'", "''")}'`;
const sql = (text, role = 'postgres') => execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], {
  input: (role === 'postgres' ? '' : `set role ${role};`) + text, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
const tests = [];
async function check(name, run) { await run(); tests.push(name); console.log(`ok ${tests.length} - ${name}`); }
const errorOf = fn => { try { fn(); return ''; } catch (e) { return String(e.stderr || e.message); } };
const hex = c => c.repeat(64);

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
  const user = randomUUID(), account = randomUUID(), device = randomUUID();
  sql(`insert into auth.users values(${q(user)});insert into public.profiles(id) values(${q(user)});
    insert into member_platform_accounts(id,user_id,platform,external_id,access_token) values(${q(account)},${q(user)},'naver_blog','myblog','fixture-only');
    insert into bnc_reader_devices(id,user_id,account_id,blog_id,token_hash,device_name) values(${q(device)},${q(user)},${q(account)},'myblog',${q(hex('d'))},'fixture');
    insert into bnc_settings(user_id) values(${q(user)});
    insert into bnc_neighbor_directory(user_id,account_id,neighbor_id,relation_type,new_posts_enabled,return_visits_enabled,observed_at) values
     (${q(user)},${q(account)},'alpha','mutual',true,true,now()),(${q(user)},${q(account)},'beta','mutual',true,true,now()),(${q(user)},${q(account)},'off','mutual',false,false,now());`);
  const target = (neighbor, post) => sql(`insert into bnc_post_targets(user_id,account_id,neighbor_id,post_id,title,content_hash,created_at,expires_at)
    values(${q(user)},${q(account)},${q(neighbor)},${q(post)},'새 글',${q(hex('e'))},now(),now()+interval '720 hours') returning id;`);
  const dispatch = (op, payload = {}) => JSON.parse(sql(`select bnc_autopilot_dispatch(${q(user)},${q(op)},${q(JSON.stringify(payload))}::jsonb);`, 'service_role'));
  const prepare = () => JSON.parse(sql(`select bnc_autopilot_prepare(${q(user)},${q(device)});`, 'service_role'));
  const jobs = kind => sql(`select count(*) from bnc_jobs where user_id=${q(user)} and kind=${q(kind)};`);
  const readyCount = kind => sql(`select count(*) from bnc_jobs j join bnc_settings s on s.user_id=j.user_id where j.user_id=${q(user)} and j.kind=${q(kind)} and j.state='ready' and j.approval_revision=s.revision;`);

  await check('AD01 before 시작하기 nothing is automatic: prepare does nothing and the summary says off', () => {
    target('alpha', '1001');
    assert.equal(prepare().auto, false); assert.equal(jobs('like'), '0');
    const g = dispatch('get'); assert.equal(g.consented, false); assert.equal(g.paused, false);
  });
  await check('AD02 one save turns on execution, caps, mode, time window and this device\'s permission together; a stale revision is refused', () => {
    const rev = dispatch('get').revision;
    const save = { mode: 'auto', tasks: ['like', 'comment'], like_cap: 2, comment_cap: 1, interval_minutes: 60, start_minute: 0, end_minute: 0, expected_revision: rev, device_id: device, confirmed: true };
    assert.match(errorOf(() => dispatch('save', { ...save, expected_revision: rev + 5 })), /BNC_STALE_REVISION/);
    assert.match(errorOf(() => dispatch('save', { ...save, confirmed: false })), /BNC_STALE_REVISION/);
    const g = dispatch('save', save);
    assert.equal(g.consented, true); assert.equal(g.enabled, true); assert.equal(g.mode, 'auto'); assert.equal(g.likeCap, 2); assert.equal(g.commentCap, 1);
    assert.equal(g.schedule.startMinute, 0);
    assert.equal(sql(`select array_to_string(kinds,',') from bnc_extension_permissions where device_id=${q(device)};`), 'comment,like,reply');
  });
  await check('AD03 auto mode: new posts get an approved like each, up to the daily cap; neighbors that are off are skipped; repeating does nothing new', () => {
    target('beta', '2001'); target('off', '3001'); target('alpha', '1002');
    const r = prepare(); assert.equal(r.likes, 2);
    assert.equal(jobs('like'), '2'); assert.equal(readyCount('like'), '2');
    assert.equal(sql(`select count(*) from bnc_jobs where neighbor_id='off';`), '0');
    assert.equal(prepare().likes, 0, 'cap reached for today'); assert.equal(jobs('like'), '2');
  });
  await check('AD04 a post that already has a like job (even skipped) is never liked again automatically', () => {
    sql(`update bnc_settings set like_cap=10 where user_id=${q(user)};`);
    sql(`update bnc_jobs set state='skipped' where user_id=${q(user)} and kind='like' and post_id='1001';`);
    const r = prepare(); assert.equal(r.likes, 1, 'only the remaining new post');
    assert.equal(sql(`select count(*) from bnc_jobs where post_id='1001' and kind='like';`), '1');
  });
  await check('AD05 only monitor-made comment drafts that passed the quality check are adopted and approved, within the comment cap', () => {
    const profile = randomUUID(), m1 = randomUUID(), m2 = randomUUID(), mine = randomUUID();
    const t1 = target('alpha', '4001'), t2 = target('beta', '4002');
    sql(`insert into bnc_analysis_jobs(id,user_id,kind,input_hash,input,state,revision,reviewed_result,expires_at) values(${q(profile)},${q(user)},'profile',${q(hex('f'))},'{"ownBlogId":"myblog"}','succeeded',1,'{"profile":{}}',now()+interval '700 hours');`);
    const body = '첫 문단에서 말씀하신 준비 과정이 정말 구체적이라 따라 해 보고 싶어졌어요. 다음 글도 기다릴게요.';
    const msg = (id, neighbor, post) => sql(`insert into bnc_message_jobs(id,user_id,kind,account_id,profile_id,profile_revision,input_hash,input,sources,neighbor_id,post_id,state,result,expires_at)
      values(${q(id)},${q(user)},'comment',${q(account)},${q(profile)},1,${q(hex('a'))},'{}','{}',${q(neighbor)},${q(post)},'succeeded',${q(JSON.stringify({ text: body }))}::jsonb,now()+interval '700 hours');`);
    msg(m1, 'alpha', '4001'); msg(m2, 'beta', '4002'); msg(mine, 'alpha', '1002');
    sql(`insert into bnc_monitor_attempts(id,user_id,session_id,target_id,neighbor_id,post_id,state,expires_at) values
      (${q(m1)},${q(user)},${q(randomUUID())},${q(t1)},'alpha','4001','succeeded',now()+interval '700 hours'),
      (${q(m2)},${q(user)},${q(randomUUID())},${q(t2)},'beta','4002','succeeded',now()+interval '700 hours');`);
    const r = prepare(); assert.equal(r.comments, 1, 'comment cap 1');
    assert.equal(jobs('comment'), '1'); assert.equal(readyCount('comment'), '1');
    assert.equal(sql(`select draft_job_id is null from bnc_message_jobs where id=${q(mine)};`), 't', 'a member-made draft is left for the member');
    assert.equal(prepare().comments, 0);
  });
  await check('AD06 the pause stops everything at once; resume continues; review mode prepares nothing', () => {
    target('beta', '5001');
    assert.equal(dispatch('pause').paused, true); assert.equal(prepare().paused, true);
    const before = jobs('like'); assert.equal(prepare().prepared, 0); assert.equal(jobs('like'), before);
    assert.equal(dispatch('resume').paused, false); assert.equal(prepare().likes, 1);
    sql(`update bnc_settings set mode='review' where user_id=${q(user)};`); target('alpha', '5002'); assert.equal(prepare().auto, false);
  });
  await check('AD07 members cannot read the table or call the functions directly', () => {
    assert.match(errorOf(() => sql('select * from bnc_autopilot;', 'authenticated')), /permission denied/i);
    assert.match(errorOf(() => sql(`select bnc_autopilot_prepare(${q(user)},${q(device)});`, 'authenticated')), /permission denied/i);
    assert.match(errorOf(() => sql(`select bnc_autopilot_dispatch(${q(user)},'get','{}');`, 'anon')), /permission denied/i);
  });
  console.log(`autopilot database: ${tests.length} passed`);
} finally {
  execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore', windowsHide: true });
}
