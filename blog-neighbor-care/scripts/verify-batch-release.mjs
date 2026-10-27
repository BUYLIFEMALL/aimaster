import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {prepareBatchRelease,newTables} from './prepare-batch-release.mjs';
const container=execFileSync('docker',['run','--pull','never','--rm','-d','--network','none','--label','aimaster.bnc-release-test=true','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{encoding:'utf8',windowsHide:true}).trim();
assert.match(container,/^[a-f0-9]{64}$/);
const sql=text=>execFileSync('docker',['exec','-i',container,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres'],{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe'],windowsHide:true}).trim();
const result=prepareBatchRelease(),checks=[];let stopped=false;
const check=(name,fn)=>{fn();checks.push(name);console.log(`ok ${checks.length} - ${name}`);};
const objects=()=>Number(sql(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in (${newTables.map(x=>`'${x}'`).join(',')});`));
try{
 let ready=false;for(let i=0;i<100;i++){try{const logs=execFileSync('docker',['logs',container],{encoding:'utf8',stdio:['pipe','pipe','pipe']});if(logs.includes('init process complete')){sql('select 1;');ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,150));}assert.ok(ready);
 check('BATCH01 missing prerequisite aborts before any new object',()=>{assert.throws(()=>sql(result.apply),/BNC_RELEASE_MISSING_PREREQUISITE/);assert.equal(objects(),0);});
 sql(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
 for(const file of ['../../supabase/migrations/0039_member_integrations.sql','../supabase/migrations/20261026163340_bnc_reader_connection.sql','../supabase/migrations/20261026103202_bnc_server_queue.sql'])sql(readFileSync(new URL(file,import.meta.url),'utf8'));
 check('BATCH02 readonly preflight proves all prerequisites and no new objects',()=>{const data=JSON.parse(sql('begin read only;'+result.preflight+'commit;'));assert.ok(Object.values(data.prerequisites).every(Boolean));assert.equal(data.existingRpcReady,true);assert.equal(data.socialLiveAllowed,false);assert.deepEqual(data.newObjectsAlreadyPresent,[]);});
 check('BATCH03 failure after both source migrations rolls back all seven tables and two functions',()=>{
  const broken=result.apply.replace(/commit;\s*$/,"do $$begin raise exception 'BNC_RELEASE_TEST_LATE_FAILURE'; end $$;\ncommit;");
  assert.throws(()=>sql(broken),/BNC_RELEASE_TEST_LATE_FAILURE/);assert.equal(objects(),0);
  assert.equal(sql("select to_regprocedure('public.bnc_analysis_dispatch(uuid,text,jsonb)') is null and to_regprocedure('public.bnc_neighbor_import_dispatch(uuid,text,jsonb)') is null;"),'t');
 });
 check('BATCH04 exact two source migrations apply atomically with every postcondition true',()=>{const out=sql(result.apply);const data=JSON.parse(out.split('\n').filter(x=>x.startsWith('{')).at(-1));assert.equal(Object.keys(data).length,8);assert.ok(Object.values(data).every(v=>v===true),JSON.stringify(data));assert.equal(objects(),7);});
 check('BATCH05 duplicate apply stops without recreating or enabling anything',()=>{assert.throws(()=>sql(result.apply),/BNC_RELEASE_ALREADY_PRESENT/);assert.equal(objects(),7);assert.equal(sql('select live_allowed from public.bnc_runtime;'),'f');assert.equal(sql('select read_allowed from public.bnc_neighbor_import_policy;'),'f');});
 check('BATCH06 verification is read-only and source fingerprints remain stable',()=>{const data=JSON.parse(sql('begin read only;'+result.verify+'commit;'));assert.ok(Object.values(data).every(v=>v===true));assert.deepEqual(prepareBatchRelease(),result);assert.equal((result.apply.match(/^begin;$/gm)||[]).length,1);assert.equal((result.apply.match(/^commit;$/gm)||[]).length,1);});
}finally{
 stopped=execFileSync('docker',['rm','-f',container],{encoding:'utf8',windowsHide:true}).trim()===container;
 writeFileSync(new URL('../docs/evidence/batch-release-20261028.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),checks,passed:checks.length,expected:6,containerStopped:stopped,operatingApplied:false,productionWrites:0,realCredentialsUsed:false,sourceMigrations:result.sources,scope:'Generated deployment SQL composition on isolated PostgreSQL17; no production migration or deployment'},null,2)+'\n');
}
