import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createWorkHandler } from '../src/lib/work-api.ts';
import { executeApprovedWork } from '../src/lib/execution/approvedWork.ts';
import {issueWorkerTicket} from '../src/lib/execution/workerTicket.ts';
import {runTicketedWork} from '../src/lib/execution/trustedHost.ts';

const image = 'postgres:17-alpine';
const label = `bnc-${randomUUID()}`;
const container = execFileSync('docker', ['run', '--pull', 'never', '--rm', '-d', '--network', 'none',
  '--label', `aimaster.bnc-test=${label}`, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{64}$/.test(container)) throw new Error('Unexpected container identifier');
const tests = []; let version = ''; let migration = '';
const quote = value => `'${String(value).replace(/'/g, "''")}'`;
const payload = value => `${quote(JSON.stringify(value))}::jsonb`;
const args = ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'];
function sql(text, role = 'postgres', member) {
  const prefix = role === 'postgres' ? '' : `set role ${role};`;
  const identity = member ? `select set_config('request.jwt.claim.sub',${quote(member)},false);` : '';
  return execFileSync('docker', args, { input: `${prefix}${identity}${text}`, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function asyncSql(text) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] }); let output = '', errors = '';
    child.stdout.on('data', x => { output += x; }); child.stderr.on('data', x => { errors += x; });
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(errors)));
    child.stdin.end(text);
  });
}
const json = output => JSON.parse(output.split('\n').filter(Boolean).at(-1));
const rpcSql = (userId, op, p = {}) => `select public.bnc_dispatch(${quote(userId)}::uuid,${quote(op)},${payload(p)});`;
const rpc = (m, op, p = {}) => json(sql(rpcSql(m.id, op, p), 'service_role'));
const rpcAsync = async (m, op, p = {}) => json(await asyncSql(`set role service_role;${rpcSql(m.id, op, p)}`));
async function check(name, fn) {
  try { await fn(); tests.push({ name, passed: true }); console.log(`ok ${tests.length} - ${name}`); }
  catch (error) { tests.push({ name, passed: false }); console.error(`not ok ${tests.length} - ${name}`); throw error; }
}
let serial = 0;
function member() {
  const id = randomUUID(), account = randomUUID(), second = randomUUID(); serial++;
  sql(`insert into auth.users values(${quote(id)});
    insert into public.member_platform_accounts values(${quote(account)},${quote(id)},'naver_blog','actor-${serial}'),
      (${quote(second)},${quote(id)},'naver_blog','actor-${serial}-second');`);
  const m = { id, account, second };
  rpc(m, 'settings'); return m;
}
function enabled() { const m = member(); rpc(m, 'configure', { enabled: true }); return m; }
function create(m, overrides = {}) {
  return rpc(m, 'create', { account_id: m.account, neighbor_id: `neighbor-${randomUUID()}`, post_id: '123', kind: 'comment', body: '가상 검수 문장', ...overrides });
}
function ready(m, overrides = {}) {
  const j = create(m, overrides);
  rpc(m, 'observe', { id: j.id, relationship: 'mutual', liked: false });
  return rpc(m, 'approve', { id: j.id });
}
const claim = (m, j) => rpc(m, 'claim', { id: j.id, device_id: randomUUID() });
const token = j => ({ id: j.id, generation: j.generation, device_id: j.device_id });
const arm = (m, j) => rpc(m, 'arm', token(j));
const result = (m, j, outcome, verified = false) => rpc(m, 'result', { ...token(j), outcome, verified });
const usage = (m, kind = 'comment') => json(sql(`select jsonb_build_object('reserved',reserved,'succeeded',succeeded)
  from public.bnc_daily where user_id=${quote(m.id)} and kind=${quote(kind)} order by day desc limit 1;`));

try {
  let isReady = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    const logs = execFileSync('docker', ['logs', container], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (logs.includes('init process complete')) {
      try { sql('select 1;'); isReady = true; break; } catch { /* final server startup */ }
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!isReady) throw new Error('Local PostgreSQL startup failed');
  version = sql('select version();');
  sql(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    create table public.member_platform_accounts(id uuid primary key,user_id uuid references auth.users(id),platform text,external_id text);
    grant select on public.member_platform_accounts to service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
  const files = readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter(n => n.endsWith('_bnc_server_queue.sql'));
  assert.equal(files.length, 1); migration = files[0];
  sql(readFileSync(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));

  await check('DB01 신규6표 모두RLS·함수는SECURITY INVOKER', () => {
    assert.equal(sql("select count(*) from pg_class where relnamespace='public'::regnamespace and relname like 'bnc_%' and relkind='r' and relrowsecurity;"), '6');
    assert.equal(sql("select prosecdef from pg_proc where oid='public.bnc_dispatch(uuid,text,jsonb)'::regprocedure;"), 'f');
  });
  const first = member(), second = member();
  await check('DB02 기본상한20/100/30·review/OFF·라이브차단', () => {
    const s = rpc(first, 'settings'); assert.equal(s.request_cap, 20); assert.equal(s.like_cap, 100); assert.equal(s.comment_cap, 30);
    assert.equal(s.mode, 'review'); assert.equal(s.enabled, false); assert.equal(s.live_allowed, false);
  });
  await check('DB03 RLS는회원본인행만조회', () => {
    assert.equal(sql('select count(*) from public.bnc_settings;', 'authenticated', first.id).split('\n').at(-1), '1');
    assert.equal(sql(`select count(*) from public.bnc_settings where user_id=${quote(second.id)};`, 'authenticated', first.id).split('\n').at(-1), '0');
  });
  await check('DB04 회원은설정/카운터/작업직접변경불가', () => {
    for (const table of ['bnc_settings', 'bnc_daily', 'bnc_jobs']) assert.throws(() => sql(`delete from public.${table};`, 'authenticated', first.id), /permission denied/);
    assert.throws(() => sql('update public.bnc_settings set comment_cap=0;', 'authenticated', first.id), /permission denied/);
  });
  await check('DB05 익명조회·회원/익명RPC·라이브게이트변경차단', () => {
    assert.throws(() => sql('select * from public.bnc_jobs;', 'anon'), /permission denied/);
    for (const role of ['anon', 'authenticated']) assert.throws(() => sql(rpcSql(first.id, 'settings'), role, first.id), /permission denied/);
    assert.throws(() => sql("update public.bnc_runtime set live_allowed=true,policy_reference='invalid';", 'service_role'), /permission denied/);
  });
  await check('DB06 타회원공용연결계정참조거절', () => assert.throws(() => create(first, { account_id: second.account }), /BNC_ACCOUNT_REQUIRED/));
  await check('DB07 DB상한CHECK·실패트랜잭션보존', () => {
    assert.throws(() => rpc(first, 'configure', { comment_cap: 31 }), /check constraint/);
    assert.equal(rpc(first, 'settings').comment_cap, 30);
  });
  await check('DB08 라이브기본차단은설정ON/선점도차단', () => {
    assert.throws(() => rpc(first, 'configure', { enabled: true }), /BNC_LIVE_DISABLED/);
    assert.throws(() => claim(first, ready(first)), /BNC_LIVE_DISABLED/);
  });
  // 가상회원 전용 로컬 DB에서만 게이트를 열어 실제 잠금/상태 전이를 시험한다.
  sql("update public.bnc_runtime set live_allowed=true,policy_reference='LOCAL FIXTURE ONLY - not platform authorization';");
  await check('DB09 별도DB연결2개·회원설정상한1개경합', async () => {
    const m = enabled(); rpc(m, 'configure', { comment_cap: 1 }); const jobs = [ready(m), ready(m)];
    const outcomes = await Promise.allSettled(jobs.map(j => rpcAsync(m, 'claim', { id: j.id, device_id: randomUUID() })));
    assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
    assert.match(outcomes.find(x => x.status === 'rejected').reason.message, /BNC_DAILY_CAP/);
    assert.deepEqual(usage(m), { reserved: 1, succeeded: 0 });
  });
  await check('DB10 별도DB연결40개·댓글30예약/10한도거절', async () => {
    const m = enabled(), jobs = Array.from({ length: 40 }, () => ready(m));
    const outcomes = await Promise.allSettled(jobs.map(j => rpcAsync(m, 'claim', { id: j.id, device_id: randomUUID() })));
    assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 30);
    assert.equal(outcomes.filter(x => x.status === 'rejected' && /BNC_DAILY_CAP/.test(x.reason.message)).length, 10);
    assert.deepEqual(usage(m), { reserved: 30, succeeded: 0 });
  });
  await check('DB11 연결계정/글/답글종류를바꿔도이웃당일1개', async () => {
    const m = enabled(), neighbor = 'same-neighbor';
    const jobs = [ready(m, { neighbor_id: neighbor }), ready(m, { neighbor_id: neighbor, account_id: m.second, post_id: '456', kind: 'reply' })];
    const outcomes = await Promise.allSettled(jobs.map(j => rpcAsync(m, 'claim', { id: j.id, device_id: randomUUID() })));
    assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
    assert.match(outcomes.find(x => x.status === 'rejected').reason.message, /BNC_NEIGHBOR_CAP/);
    assert.deepEqual(usage(m), { reserved: 1, succeeded: 0 });
  });
  await check('DB12 만료선점회수·세대펜싱·예약이중가산없음', () => {
    const m = enabled(), j = ready(m), old = claim(m, j);
    sql(`update public.bnc_jobs set lease_until=clock_timestamp()-interval '1 second' where id=${quote(j.id)};`);
    const next = claim(m, j); assert.equal(next.generation, old.generation + 1);
    assert.throws(() => arm(m, old), /BNC_STALE_CLAIM/); assert.equal(arm(m, next).state, 'armed');
    assert.deepEqual(usage(m), { reserved: 1, succeeded: 0 });
  });
  await check('DB13 armed만료는회수안함·결과불명은예약유지/계정중단', () => {
    const m = enabled(), j = arm(m, claim(m, ready(m)));
    sql(`update public.bnc_jobs set lease_until=clock_timestamp()-interval '1 second' where id=${quote(j.id)};`);
    assert.throws(() => claim(m, j), /BNC_UNCERTAIN/);
    assert.equal(result(m, j, 'success').state, 'uncertain');
    assert.deepEqual(usage(m), { reserved: 1, succeeded: 0 }); assert.equal(rpc(m, 'settings').enabled, false);
    assert.throws(() => rpc(m, 'configure', { enabled: true }), /BNC_UNCERTAIN/);
    assert.equal(result(m, j, 'success', true).state, 'succeeded'); assert.equal(rpc(m, 'settings').enabled, false);
  });
  await check('DB14 성공중복계산0·늦은실패로성공되돌림0', () => {
    const m = enabled(), j = arm(m, claim(m, ready(m)));
    result(m, j, 'success', true); result(m, j, 'success', true);
    assert.deepEqual(usage(m), { reserved: 0, succeeded: 1 });
    assert.throws(() => result(m, j, 'uncertain'), /BNC_TERMINAL/);
  });
  await check('DB15 미실행근거가있을때만슬롯반환', () => {
    const m = enabled(), j = arm(m, claim(m, ready(m)));
    assert.equal(result(m, j, 'no_effect', true).state, 'failed_no_effect'); assert.equal(usage(m).reserved, 0);
    const next = arm(m, claim(m, ready(m))); assert.equal(result(m, next, 'no_effect').state, 'uncertain'); assert.equal(usage(m).reserved, 1);
  });
  await check('DB16 공감ON/불명은동작없이건너뜀', () => {
    for (const liked of [true, null]) {
      const m = enabled(), j = ready(m, { kind: 'like' });
      rpc(m, 'observe', { id: j.id, relationship: 'mutual', liked });
      assert.equal(arm(m, claim(m, j)).state, 'skipped'); assert.equal(usage(m, 'like').reserved, 0);
    }
  });
  await check('DB17 신청성공은pending·수락전댓글거절', () => {
    const m = enabled(), neighbor = 'pending-neighbor', j = create(m, { kind: 'request', neighbor_id: neighbor, post_id: '' });
    rpc(m, 'approve', { id: j.id }); result(m, arm(m, claim(m, j)), 'success', true);
    const comment = create(m, { neighbor_id: neighbor }); rpc(m, 'approve', { id: comment.id });
    assert.throws(() => claim(m, comment), /BNC_NOT_MUTUAL/);
  });
  await check('DB18 관찰된서로이웃해제·오래된관계는등록허가거절', () => {
    const m = enabled(), j = claim(m, ready(m)); rpc(m, 'observe', { id: j.id, relationship: 'removed' });
    assert.throws(() => arm(m, j), /BNC_NOT_MUTUAL/);
    rpc(m, 'observe', { id: j.id, relationship: 'mutual' });
    sql(`update public.bnc_neighbors set verified_at=clock_timestamp()-interval '6 minutes' where user_id=${quote(m.id)};`);
    assert.throws(() => arm(m, j), /BNC_NOT_MUTUAL/);
  });
  await check('DB19 승인문장/설정변경·다른회원작업접근차단', () => {
    const m = enabled(), other = enabled(), j = ready(m); rpc(m, 'edit', { id: j.id, body: '수정 문장' });
    assert.throws(() => claim(m, j), /BNC_APPROVAL_CHANGED/);
    rpc(m, 'approve', { id: j.id }); rpc(m, 'configure', { mode: 'auto' });
    assert.throws(() => claim(m, j), /BNC_APPROVAL_CHANGED/);
    assert.throws(() => rpc(other, 'approve', { id: j.id }), /BNC_NOT_FOUND/);
  });
  await check('DB20 중단뒤등록허가차단·도착한성공결과는기록', () => {
    const m = enabled(), j = arm(m, claim(m, ready(m))); rpc(m, 'configure', { enabled: false });
    assert.equal(result(m, j, 'success', true).state, 'succeeded'); assert.equal(rpc(m, 'settings').enabled, false);
    const q = ready(m); assert.throws(() => claim(m, q), /BNC_STOPPED/);
  });
  await check('DB21 KST날짜·자정상한허가·이전날선점거절', () => {
    const m = enabled(), j = claim(m, ready(m)), active = arm(m, j);
    assert.equal(sql(`select (claim_day=(clock_timestamp() at time zone 'Asia/Seoul')::date)::text from public.bnc_jobs where id=${quote(j.id)};`), 'true');
    assert.equal(sql(`select (permit_until<=clock_timestamp()+interval '30 seconds' and
      permit_until<=((claim_day+1)::timestamp at time zone 'Asia/Seoul'))::text from public.bnc_jobs where id=${quote(active.id)};`), 'true');
    const old = claim(m, ready(m)); sql(`update public.bnc_jobs set claim_day=claim_day-1 where id=${quote(old.id)};`);
    assert.throws(() => arm(m, old), /BNC_DAY_CHANGED/);
  });
  await check('DB22 30일만료·문장수정은만료시각연장안함', () => {
    const m = enabled(), j = ready(m), edited = rpc(m, 'edit', { id: j.id, body: '다른 문장' });
    assert.equal(edited.expires_at, j.expires_at); rpc(m, 'approve', { id: j.id });
    sql(`update public.bnc_jobs set created_at=now()-interval '31 days',expires_at=now()-interval '1 day' where id=${quote(j.id)};`);
    assert.throws(() => claim(m, j), /BNC_EXPIRED/);
  });
  await check('DB23 계정연결해제시작업기록보존·재실행차단', () => {
    const m = enabled(), j = claim(m, ready(m)); sql(`delete from public.member_platform_accounts where id=${quote(m.account)};`);
    assert.equal(sql(`select count(*) from public.bnc_jobs where id=${quote(j.id)} and account_id is null;`), '1');
    assert.throws(() => arm(m, j), /BNC_ACCOUNT_REQUIRED/);
  });
  await check('DB24 변경한작업ID로같은공감작업중복예약불가·롤백보존', () => {
    const m = enabled(), base = { kind: 'like', neighbor_id: 'same-like' }, one = ready(m, base), two = ready(m, base);
    claim(m, one); assert.throws(() => claim(m, two), /duplicate key/); assert.equal(usage(m, 'like').reserved, 1);
  });
  await check('DB25 원래상한을낮추면예전승인으로arm불가', () => {
    const m = enabled(), j = claim(m, ready(m)); rpc(m, 'configure', { comment_cap: 0 });
    assert.throws(() => arm(m, j), /BNC_APPROVAL_CHANGED/);
  });
  await check('DB26 회원RLS는작업/원장/슬롯/관계도격리', () => {
    const m = enabled(); claim(m, ready(m));
    for (const table of ['bnc_jobs', 'bnc_daily', 'bnc_comment_slots', 'bnc_neighbors']) {
      assert.equal(sql(`select count(*) from public.${table} where user_id=${quote(m.id)};`, 'authenticated', first.id).split('\n').at(-1), '0');
      assert.equal(sql(`select count(*) from public.${table} where user_id=${quote(m.id)};`, 'authenticated', m.id).split('\n').at(-1), '1');
    }
  });
  await check('DB27 HTTP처리→서버회원ID결합→실제SQL·위조결과보고차단', async () => {
    const m = member(), calls = [];
    const handler = createWorkHandler({ authorize: async () => ({ allowed: true, userId: m.id }),
      execute: async (userId, op, p) => { calls.push(userId); return { data: await rpcAsync({ id: userId }, op, p), error: null }; } });
    const send = input => handler(new Request('http://localhost:3000/api/work', { method: 'POST', headers: {
      origin: 'http://localhost:3000', 'content-type': 'application/json', 'x-user-id': first.id,
    }, body: JSON.stringify(input) }));
    const response = await send({ operation: 'settings' }); assert.equal(response.status, 200);
    assert.equal((await response.json()).data.user_id, m.id); assert.deepEqual(calls, [m.id]);
    assert.equal((await send({ operation: 'result', payload: { verified: true } })).status, 403); assert.equal(calls.length, 1);
  });
  await check('DB28 등록직전허가재확인·만료/계정중단뒤에는실행불가', () => {
    const m = enabled(), j = arm(m, claim(m, ready(m)));
    assert.equal(rpc(m, 'verify_permit', token(j)).valid, true);
    sql(`update public.bnc_jobs set permit_until=clock_timestamp()-interval '1 second' where id=${quote(j.id)};`);
    assert.throws(() => rpc(m, 'verify_permit', token(j)), /BNC_PERMIT_EXPIRED/);
    const other = enabled(), active = arm(other, claim(other, ready(other)));
    rpc(other, 'configure', { enabled: false });
    assert.throws(() => rpc(other, 'verify_permit', token(active)), /BNC_STOPPED/);
  });
  function executorFixture(m,j){
    let applied=0;
    const context=()=>({accountId:j.account_id,actorId:j.actor_id,neighborId:j.neighbor_id,postId:j.post_id,checkedAt:Date.now()});
    const deps={authorize:async()=>true,permitted:async()=>true,
      load:async(user,id)=>json(sql(`select to_jsonb(j) from public.bnc_jobs j where user_id=${quote(user)} and id=${quote(id)};`)),
      rpc:async(user,op,p)=>rpc({id:user},op,p),adapter:{
        inspect:async()=>({...context(),restriction:'none',relationship:j.kind==='request'?'none':'mutual',liked:false,duplicate:false}),
        assertCurrent:async()=>true,apply:async()=>{applied++;},
        verify:async()=>({...context(),state:j.kind==='request'?'pending':j.kind==='like'?'liked':'commented',bodyHash:createHash('sha256').update(j.body).digest('hex'),effectId:'fixture-effect-1'})
      }};
    return {deps,applied:()=>applied,run:()=>executeApprovedWork({memberId:m.id,jobId:j.id,deviceId:'11111111-1111-4111-8111-111111111111'},deps)};
  }
  await check('DB29 private executor actual SQL claim/arm/permit/result settles synthetic request/like/comment once',async()=>{
    for(const kind of ['request','like','comment']){
      const m=enabled(),j=ready(m,{kind,post_id:kind==='request'?'':'123'}),f=executorFixture(m,j),r=await f.run();
      assert.equal(r.status,'succeeded');assert.equal(r.reportStored,true);assert.equal(f.applied(),1);
      assert.equal(usage(m,kind).reserved,0);assert.equal(usage(m,kind).succeeded,1);
      if(kind==='request')assert.equal(sql(`select state from public.bnc_neighbors where user_id=${quote(m.id)} and neighbor_id=${quote(j.neighbor_id)};`),'pending');
      assert.equal((await f.run()).status,'blocked');assert.equal(f.applied(),1);
    }
  });
  await check('DB30 ambiguous adapter outcome keeps SQL reservation and member OFF, no second external attempt',async()=>{
    const m=enabled(),j=ready(m),f=executorFixture(m,j);f.deps.adapter.verify=async()=>{throw Error('synthetic lost effect response');};
    const r=await f.run();assert.equal(r.status,'uncertain');assert.equal(r.reportStored,true);assert.equal(f.applied(),1);
    assert.equal(usage(m).reserved,1);assert.equal(usage(m).succeeded,0);assert.equal(rpc(m,'settings').enabled,false);
    assert.equal((await f.run()).status,'blocked');assert.equal(f.applied(),1);
  });
  await check('DB31 final context change after SQL permit prevents application and preserves uncertainty',async()=>{
    const m=enabled(),j=ready(m),f=executorFixture(m,j);f.deps.adapter.assertCurrent=async()=>false;
    const r=await f.run();assert.equal(r.status,'uncertain');assert.equal(r.externalAttempted,false);assert.equal(r.reportStored,true);
    assert.equal(f.applied(),0);assert.equal(usage(m).reserved,1);assert.equal(rpc(m,'settings').enabled,false);
  });
  sql(readFileSync(new URL('../supabase/migrations/20261028233611_bnc_execution_evidence.sql',import.meta.url),'utf8'));
  const settle=(m,p)=>json(sql(`select bnc_execution_result_dispatch(${quote(m.id)},'result',${payload(p)});`,'service_role'));
  function ticketed(m,j){
    const f=executorFixture(m,j),deviceId='11111111-1111-4111-8111-111111111111',secret='fixture-only-private-worker-secret-12345';let last;
    const ticket=issueWorkerTicket({memberId:m.id,jobId:j.id,deviceId,accountId:j.account_id,actorId:j.actor_id,bodyHash:createHash('sha256').update(j.body).digest('hex'),approvalRevision:j.approval_revision,generation:j.generation+1},secret);
    const store={member:async id=>({allowed:true,userId:id}),connected:async()=>true,load:f.deps.load,permitted:async()=>true,rpc:f.deps.rpc,result:async(user,p)=>{last=p;return settle({id:user},p);}};
    return {run:()=>runTicketedWork(ticket,{secret:()=>secret,store,adapter:f.deps.adapter}),last:()=>last,applied:f.applied};
  }
  let evidenceOwner,evidenceJob,evidencePayload;
  await check('DB32 authenticated private host atomically records minimal effect proof and SQL success',async()=>{
    for(const kind of ['request','like','comment']){
      const m=enabled(),j=ready(m,{kind,post_id:kind==='request'?'':'123'}),f=ticketed(m,j),r=await f.run();
      assert.equal(r.status,'succeeded');assert.equal(f.applied(),1);assert.equal(usage(m,kind).succeeded,1);
      assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${quote(j.id)};`),'1');
      assert.equal(sql(`select e.expires_at=j.expires_at from bnc_execution_evidence e join bnc_jobs j on j.id=e.job_id where j.id=${quote(j.id)};`),'t');
      const proof=json(sql(`select proof from bnc_execution_evidence where job_id=${quote(j.id)};`));
      assert.doesNotMatch(JSON.stringify(proof),/가상 검수 문장|cookie|token/);assert.equal(proof.kind,kind);
      assert.equal((await f.run()).status,'blocked');assert.equal(f.applied(),1);
      if(kind==='comment'){evidenceOwner=m;evidenceJob=j;evidencePayload=f.last();}
    }
  });
  await check('DB33 invalid evidence and failed state transitions roll back proof and success counters together',()=>{
    const m=enabled(),j=claim(m,ready(m)),now=new Date().toISOString();
    const proof={account_id:j.account_id,actor_id:j.actor_id,neighbor_id:j.neighbor_id,post_id:j.post_id,kind:j.kind,state:'commented',effect_id:'fixture-comment',body_hash:createHash('sha256').update(j.body).digest('hex'),observed_at:now};
    const p={...token(j),outcome:'success',verified:true,attempted_at:now,evidence:proof};
    assert.throws(()=>settle(m,p),/BNC_INVALID_STATE/);assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${quote(j.id)};`),'0');
    arm(m,j);for(const patch of [{body_hash:'a'.repeat(64)},{actor_id:'someone-else'},{body:'raw text'},{observed_at:new Date(Date.now()-60000).toISOString()}])assert.throws(()=>settle(m,{...p,evidence:{...proof,...patch}}),/BNC_EVIDENCE/);
    assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${quote(j.id)};`),'0');assert.equal(usage(m).reserved,1);assert.equal(usage(m).succeeded,0);
  });
  await check('DB34 effect proof replay is idempotent and cannot replace or extend the original evidence',()=>{
    const expiry=sql(`select expires_at from bnc_execution_evidence where job_id=${quote(evidenceJob.id)};`);
    settle(evidenceOwner,evidencePayload);assert.equal(usage(evidenceOwner).succeeded,1);
    assert.throws(()=>settle(evidenceOwner,{...evidencePayload,evidence:{...evidencePayload.evidence,effect_id:'changed-id'}}),/BNC_EVIDENCE_CHANGED/);
    assert.equal(sql(`select expires_at from bnc_execution_evidence where job_id=${quote(evidenceJob.id)};`),expiry);
    assert.throws(()=>sql(`update bnc_execution_evidence set proof='{}' where job_id=${quote(evidenceJob.id)};`,'service_role'),/permission denied/);
  });
  await check('DB35 evidence RLS isolates members and only the private service RPC can settle results',()=>{
    assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${quote(evidenceJob.id)};`,'authenticated',evidenceOwner.id).split('\n').at(-1),'1');
    assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${quote(evidenceJob.id)};`,'authenticated',first.id).split('\n').at(-1),'0');
    assert.throws(()=>sql('select * from bnc_execution_evidence;','anon'),/permission denied/);
    for(const role of ['anon','authenticated'])assert.throws(()=>sql(`select bnc_execution_result_dispatch(${quote(evidenceOwner.id)},'result',${payload(evidencePayload)});`,role),/permission denied/);
    assert.equal(sql("select prosecdef from pg_proc where oid='bnc_execution_result_dispatch(uuid,text,jsonb)'::regprocedure;"),'f');
  });
  await check('DB36 expired evidence cleanup removes only proof and preserves the minimal successful job',()=>{
    sql(`update bnc_execution_evidence set expires_at=now()-interval '1 second' where job_id=${quote(evidenceJob.id)};`);
    assert.equal(sql(`select count(*) from bnc_execution_evidence where job_id=${quote(evidenceJob.id)};`,'authenticated',evidenceOwner.id).split('\n').at(-1),'0');
    const result=json(sql("select bnc_execution_result_dispatch(null,'cleanup','{}');",'service_role'));assert.equal(result.expiredEvidenceRemoved,1);
    assert.equal(sql(`select state from bnc_jobs where id=${quote(evidenceJob.id)};`),'succeeded');
    assert.equal(usage(evidenceOwner).succeeded,1);assert.throws(()=>sql(`select bnc_execution_result_dispatch(${quote(evidenceOwner.id)},'cleanup','{}');`,'service_role'),/BNC_EVIDENCE_INPUT/);
  });
} finally {
  const ownLabel = execFileSync('docker', ['inspect', '--format', '{{index .Config.Labels "aimaster.bnc-test"}}', container], { encoding: 'utf8' }).trim();
  if (ownLabel !== label) throw new Error('Container ownership mismatch - cleanup skipped');
  execFileSync('docker', ['rm', '-f', '-v', container], { stdio: 'pipe' });
  const sourceFiles = ['src/lib/work-api.ts', 'src/app/api/work/route.ts', 'src/lib/access.ts', 'src/lib/execution/approvedWork.ts','src/lib/execution/workerTicket.ts','src/lib/execution/trustedHost.ts','supabase/migrations/20261028233611_bnc_execution_evidence.sql', `supabase/migrations/${migration}`, 'tests/database.mjs'];
  const hashes = Object.fromEntries(sourceFiles.filter(p => !p.endsWith('/')).map(p => [p,
    createHash('sha256').update(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')).digest('hex')]));
  mkdirSync(new URL('../docs/evidence/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../docs/evidence/database-20261026.json', import.meta.url), JSON.stringify({
    checkedAt: new Date().toISOString(), command: 'npm run test:database', version, image, network: 'none', hostPorts: [],
    tests, passed: tests.filter(x => x.passed).length, failed: tests.filter(x => !x.passed).length,
    operatingDatabaseChanged: false, fixtureUsersOnly: true, containerRemoved: true, sourceHashEncoding: 'UTF-8 CRLF normalized to LF', sourceSha256: hashes,
  }, null, 2)+'\n');
}
console.log(`PostgreSQL ${tests.length}개 통과. 로컬 컨테이너 정리 완료. 운영 DB 미변경.`);
