import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createCleanupHandler } from '../src/lib/cleanup.ts';

const label = 'aimaster.bnc-cleanup-test';
const container = execFileSync('docker', ['run', '--pull', 'never', '--rm', '-d', '--network', 'none', '--label', `${label}=true`,
  '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'], { encoding: 'utf8', windowsHide: true }).trim();
assert.match(container, /^[a-f0-9]{64}$/);
const q = value => `'${String(value).replaceAll("'", "''")}'`;
const hash = value => createHash('sha256').update(value).digest('hex');
let sqlCalls=0;
const sql = (text, role = 'postgres') => {sqlCalls++;return execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres'], {
  input: (role === 'postgres' ? '' : `set role ${role};`) + text, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
}).trim();};
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
    '../supabase/migrations/20261027042907_bnc_analysis.sql', '../supabase/migrations/20261027141316_bnc_neighbor_import.sql',
    '../supabase/migrations/20261028123000_bnc_work_retention.sql', '../supabase/migrations/20261028124500_bnc_work_cancel.sql',
    '../supabase/migrations/20261028143000_bnc_schedule_preferences.sql', '../supabase/migrations/20261029044735_bnc_schedule_cursor.sql', '../supabase/migrations/20261028233611_bnc_execution_evidence.sql', '../supabase/migrations/20261029140000_bnc_engagement_inbox.sql','../supabase/migrations/20261030001500_bnc_extension_execution.sql','../supabase/migrations/20261030094500_bnc_extension_context_reads.sql','../supabase/migrations/20261030101500_bnc_message_generation.sql','../supabase/migrations/20261030120000_bnc_extension_schedule.sql','../supabase/migrations/20261030133000_bnc_incoming_accept.sql']) {
    sql(readFileSync(new URL(file, import.meta.url), 'utf8'));
  }
  await check('CDB11 execution evidence cleanup is independently callable before other datasets',()=>{
    assert.equal(JSON.parse(sql("select bnc_execution_result_dispatch(null,'cleanup','{}');",'service_role')).expiredEvidenceRemoved,0);
  });
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
  const jobs=[];
  for(const state of ['draft','ready','claimed','armed','uncertain','succeeded','failed_no_effect','skipped']){
    const id=randomUUID(),neighbor='fixture-'+state,reserved=['claimed','armed','uncertain'].includes(state);
    sql(`insert into public.bnc_settings(user_id,enabled) values(${q(expired.user)},true) on conflict do nothing;
      insert into public.bnc_jobs(id,user_id,account_id,actor_id,neighbor_id,post_id,kind,body,state,
       approval_hash,approval_revision,generation,device_id,claim_day,reserved,created_at,expires_at)
      values(${q(id)},${q(expired.user)},${q(expired.account)},'fixture-owner',${q(neighbor)},'123','comment','expired-private-text',${q(state)},
       ${q(hash(id))},1,2,${q(expired.device)},current_date,${reserved},now()-interval '721 hours',now()-interval '1 hour');
      ${reserved?`insert into public.bnc_daily(user_id,day,kind,reserved) values(${q(expired.user)},current_date,'comment',1)
       on conflict(user_id,day,kind) do update set reserved=bnc_daily.reserved+1;`:''}
      ${['claimed','armed','uncertain','succeeded'].includes(state)?`insert into public.bnc_comment_slots values(${q(expired.user)},${q(neighbor)},current_date,${q(id)});`:''}`);
    jobs.push({id,state,neighbor});
  }
  const currentJob=randomUUID();
  sql(`insert into public.bnc_settings(user_id) values(${q(current.user)}) on conflict do nothing;
    insert into public.bnc_jobs(id,user_id,account_id,actor_id,neighbor_id,kind,body)
    values(${q(currentJob)},${q(current.user)},${q(current.account)},'fixture-current','other-neighbor','request','current-private-text');`);
  await check('CDB01 reader failure still expires analysis/import data, reports 503 and preserves member settings', async () => {
    failure = 'bnc_reader_dispatch';
    const response = await handler(request()), result = await response.json();
    assert.equal(response.status, 503); assert.equal(result.results.reader.ok, false);
    assert.equal(result.results.analysis.data.expiredJobsRemoved, 1); assert.equal(result.results.neighbors.data.expiredImportsRemoved, 1);
    assert.equal(result.results.work.data.expiredPayloadsRemoved, 8);
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
    assert.equal(result.results.work.data.expiredPayloadsRemoved, 0);
    assert.equal(sql('select count(*) from public.bnc_neighbor_directory;'), '2');
    assert.equal(sql('select not live_allowed from public.bnc_runtime;'), 't');
    assert.equal(sql('select not read_allowed from public.bnc_neighbor_import_policy;'), 't');
  });
  await check('CDB04 expired text is removed while successful/uncertain guards and exact lifetimes survive',async()=>{
    for(const job of jobs){
      const row=JSON.parse(sql(`select row_to_json(x) from (select state,body,approval_hash,generation,reserved,expires_at=created_at+interval '720 hours' as lifetime from bnc_jobs where id=${q(job.id)}) x;`));
      assert.equal(row.body,'');assert.equal(row.approval_hash,null);assert.equal(row.generation,2);assert.equal(row.lifetime,true);
      assert.equal(row.state,['draft','ready','claimed'].includes(job.state)?'skipped':job.state==='armed'?'uncertain':job.state);
      assert.equal(row.reserved,['armed','uncertain'].includes(job.state));
    }
    assert.equal(sql(`select reserved from bnc_daily where user_id=${q(expired.user)} and kind='comment';`),'2');
    assert.equal(sql(`select count(*) from bnc_comment_slots where user_id=${q(expired.user)};`),'3');
    assert.equal(sql(`select not enabled from bnc_settings where user_id=${q(expired.user)};`),'t');
    assert.equal(sql(`select body from bnc_jobs where id=${q(currentJob)};`),'current-private-text');
  });
  await check('CDB05 member roles cannot call cleanup; forged member or operation cannot run it',async()=>{
    for(const role of ['anon','authenticated'])assert.throws(()=>sql("select bnc_work_cleanup(null,'cleanup','{}');",role),/permission denied/);
    assert.throws(()=>sql(`select bnc_work_cleanup(${q(expired.user)},'cleanup','{}');`,'service_role'),/BNC_INVALID_INPUT/);
    assert.throws(()=>sql("select bnc_work_cleanup(null,'confirm','{}');",'service_role'),/BNC_INVALID_INPUT/);
  });
  await check('CDB06 cancel releases only unarmed reservations; uncertain/success guards remain and repeated cancellation is idempotent',async()=>{
    for(const state of ['draft','ready','claimed','armed','uncertain','succeeded']){
      const id=randomUUID(),neighbor='cancel-'+state,reserved=['claimed','armed','uncertain'].includes(state);
      sql(`insert into bnc_jobs(id,user_id,account_id,actor_id,neighbor_id,post_id,kind,body,state,generation,device_id,claim_day,reserved)
       values(${q(id)},${q(current.user)},${q(current.account)},'current-actor',${q(neighbor)},'456','comment','not-expired',${q(state)},2,${q(current.device)},current_date,${reserved});
       ${reserved?`insert into bnc_daily(user_id,day,kind,reserved) values(${q(current.user)},current_date,'comment',1) on conflict(user_id,day,kind) do update set reserved=bnc_daily.reserved+1;`:''}
       ${['claimed','armed','uncertain','succeeded'].includes(state)?`insert into bnc_comment_slots values(${q(current.user)},${q(neighbor)},current_date,${q(id)});`:''}`);
      const cancel=()=>JSON.parse(sql(`select bnc_work_cancel(${q(current.user)},${q(id)});`,'service_role'));
      const result=cancel();assert.equal(result.cancelled,['draft','ready','claimed'].includes(state));assert.equal(result.resultCheckRequired,['armed','uncertain'].includes(state));
      const revision=sql(`select revision from bnc_settings where user_id=${q(current.user)};`);assert.equal(cancel().state,result.state);assert.equal(sql(`select revision from bnc_settings where user_id=${q(current.user)};`),revision);
      assert.equal(sql(`select body from bnc_jobs where id=${q(id)};`),'not-expired');
      if(state==='armed'){
        const late=JSON.parse(sql(`select bnc_dispatch(${q(current.user)},'result',${q(JSON.stringify({id,generation:2,device_id:current.device,outcome:'success',verified:true}))}::jsonb);`,'service_role'));
        assert.equal(late.state,'succeeded');assert.equal(late.reserved,false);assert.equal(cancel().state,'succeeded');
      }
    }
    assert.equal(sql(`select reserved from bnc_daily where user_id=${q(current.user)} and kind='comment';`),'1');
    assert.equal(sql(`select count(*) from bnc_comment_slots where user_id=${q(current.user)};`),'3');
  });
  await check('CDB07 cancellation cannot address another member and direct member RPC execution is denied',async()=>{
    assert.throws(()=>sql(`select bnc_work_cancel(${q(expired.user)},${q(currentJob)});`,'service_role'),/BNC_NOT_FOUND/);
    for(const role of ['anon','authenticated'])assert.throws(()=>sql(`select bnc_work_cancel(${q(current.user)},${q(currentJob)});`,role),/permission denied/);
    assert.equal(sql(`select state from bnc_jobs where id=${q(currentJob)};`),'draft');
  });
  await check('CDB08 cleanup skips a locked member, handles another member, then clears the first on the next run',async()=>{
    const ids=[randomUUID(),randomUUID()];
    for(const [index,member]of fixtures.entries())sql(`insert into bnc_jobs(id,user_id,account_id,actor_id,neighbor_id,kind,body,state,created_at,expires_at)
     values(${q(ids[index])},${q(member.user)},${q(member.account)},'lock-fixture','lock-neighbor','request','expired-lock-text','ready',now()-interval '721 hours',now()-interval '1 hour');`);
    const child=spawn('docker',['exec','-i',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres'],{windowsHide:true,stdio:['pipe','pipe','pipe']});sqlCalls++;
    let output='',errors='';
    const finished=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(errors)));});
    const locked=new Promise((resolve,reject)=>{child.stdout.on('data',value=>{output+=value;if(output.includes('LOCKED'))resolve();});child.stderr.on('data',value=>{errors+=value;});child.on('error',reject);child.on('close',()=>{if(!output.includes('LOCKED'))reject(Error(errors||'lock not acquired'));});});
    child.stdin.end(`begin;select user_id from bnc_settings where user_id=${q(expired.user)} for update;select 'LOCKED';select pg_sleep(2);commit;`);
    try{
      await locked;
      const result=JSON.parse(sql("select bnc_work_cleanup(null,'cleanup','{}');",'service_role'));assert.equal(result.expiredPayloadsRemoved,1);
      assert.equal(sql(`select body from bnc_jobs where id=${q(ids[0])};`),'expired-lock-text');assert.equal(sql(`select body from bnc_jobs where id=${q(ids[1])};`),'');
    }finally{await finished;}
    assert.equal(JSON.parse(sql("select bnc_work_cleanup(null,'cleanup','{}');",'service_role')).expiredPayloadsRemoved,1);
  });
  await check('CDB09 schedule preferences persist without enabling execution or changing job approvals; stale revisions cannot overwrite',async()=>{
    const pref=(op,p={})=>JSON.parse(sql(`select bnc_schedule_preferences_dispatch(${q(current.user)},${q(op)},${q(JSON.stringify(p))}::jsonb);`,'service_role'));
    const before=sql(`select revision from bnc_settings where user_id=${q(current.user)};`),first=pref('get');assert.equal(first.revision,1);assert.equal(first.executionAvailable,false);
    const second=pref('save',{interval_minutes:30,start_minute:1320,end_minute:120,expected_revision:1});assert.equal(second.revision,2);assert.equal(second.interval_minutes,30);assert.equal(second.externalActions,0);
    assert.throws(()=>pref('save',{interval_minutes:60,start_minute:540,end_minute:1080,expected_revision:1}),/BNC_SCHEDULE_CHANGED/);assert.equal(pref('get').start_minute,1320);
    for(const p of [{interval_minutes:45,start_minute:0,end_minute:0,expected_revision:2},{interval_minutes:60,start_minute:-1,end_minute:0,expected_revision:2},{interval_minutes:60,start_minute:0,end_minute:1440,expected_revision:2},{interval_minutes:60,start_minute:0,end_minute:0,expected_revision:2,enabled:true}])assert.throws(()=>pref('save',p));
    assert.equal(pref('get').revision,2);assert.equal(sql(`select revision from bnc_settings where user_id=${q(current.user)};`),before);assert.equal(sql('select not live_allowed from bnc_runtime;'),'t');
  });
  await check('CDB10 schedule preferences are owner-only and member direct writes/RPC execution are denied',async()=>{
    sql(`select bnc_schedule_preferences_dispatch(${q(expired.user)},'get','{}');`,'service_role');
    assert.equal(sql(`select set_config('request.jwt.claim.sub',${q(current.user)},false);select count(*) from bnc_schedule_preferences;`,'authenticated').split('\n').at(-1),'1');
    for(const role of ['anon','authenticated'])assert.throws(()=>sql(`select bnc_schedule_preferences_dispatch(${q(current.user)},'get','{}');`,role),/permission denied/);
    assert.throws(()=>sql(`update bnc_schedule_preferences set interval_minutes=60 where user_id=${q(current.user)};`,'authenticated'),/permission denied/);
  });
  writeFileSync(new URL('../docs/evidence/cleanup-database-20261028.json', import.meta.url), JSON.stringify({
    checkedAt: new Date().toISOString(), database: sql('select version();'), tests, passed: tests.length,
    network: 'none', hostPorts: 0, actualSqlCalls: sqlCalls, cleanupRpcCalls: calls.length, fixtureMembers: 2,
    operatingDatabaseChanged: false, realAiCalls: 0, remaining: 'Production migration, scheduled Cron deletion and actual social actions remain unverified.',
  }, null, 2) + '\n');
} finally {
  const ownLabel = execFileSync('docker', ['inspect', '--format', `{{index .Config.Labels "${label}"}}`, container], { encoding: 'utf8', windowsHide: true }).trim();
  assert.equal(ownLabel, 'true', 'Container ownership mismatch: cleanup skipped');
  execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore', windowsHide: true });
}
