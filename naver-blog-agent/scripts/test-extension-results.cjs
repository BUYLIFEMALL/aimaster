// Execute the real TypeScript route with a DB that can fail, return zero rows,
// cancel a task during update or lose a response after committing. No live writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const filename = path.join(__dirname,'../src/app/api/extension/finish/route.ts');
const source = process.argv[2]
  ? require('node:child_process').execFileSync('git',['show',process.argv[2]+':naver-blog-agent/src/app/api/extension/finish/route.ts'],{encoding:'utf8'})
  : fs.readFileSync(filename,'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function loadPublishing(){
 const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/naverPublishing.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('module','exports',js)(m,m.exports);return m.exports;
}
const initial = {id:'task',user_id:'owner',status:'publishing',title:'보존 제목',content:'보존 본문',images:[{url:'original'}],post_url:null,error_message:null,published_at:null};
function harness(options={}) {
  const row=structuredClone({...initial,...options.row}), writes=[];
  let access={allowed:true}, failure=options.failure;
  const admin={from(table){
    const filters=[];let patch;
    const chain={select(){return chain;},eq(key,value){filters.push([key,value]);return chain;},update(value){patch=value;return chain;},
      async maybeSingle(){
        if(table==='nba_extension_tokens')return {data:options.invalidToken?null:{user_id:'owner'},error:options.tokenError?{message:'private db detail'}:null};
        if(failure==='throw')throw new Error('private db detail');
        if(patch && failure==='update')return {data:null,error:{message:'private db detail'}};
        if(!patch && failure==='read')return {data:null,error:{message:'private db detail'}};
        if(patch && options.cancelDuringUpdate)row.status='draft';
        const hit=!options.missing && filters.every(([key,value])=>row[key]===value);
        if(patch && hit){writes.push(structuredClone(patch));Object.assign(row,patch);}
        return {data:hit?structuredClone(row):null,error:null};
      },
      // The previous implementation awaited the update without selecting its result.
      then(resolve,reject){return chain.maybeSingle().then(resolve,reject);},
    };return chain;
  }};
  const module={exports:{}};
  const requireMock=name=>name==='next/server'?{NextResponse:{json:(body,init)=>({body,status:init?.status||200,headers:init?.headers||{}})}}
    :name==='@/lib/supabase/admin'?{createAdminClient:()=>admin}
    :name==='@/lib/naverPublishing'?loadPublishing():name==='@/lib/access'?{evaluateProgramAccessForUser:async()=>access}:require(name);
  new Function('require','module','exports',compiled)(requireMock,module,module.exports);
  const send=(body={taskId:'task',success:true,postUrl:'https://blog.naver.com/myblog/123'},token='token')=>module.exports.POST({
    headers:{get:()=>token?`Bearer ${token}`:null},json:async()=>{if(body==='invalid-json')throw new Error('bad json');return body;},
  });
  return {row,writes,send,access:value=>access=value,recover:()=>failure=undefined};
}
function rejected(response,status){assert.equal(response.status,status);assert.notEqual(response.body.success,true);assert.equal(response.headers['Cache-Control'],'no-store');}
function acknowledged(response,status='published'){
  assert.equal(response.status,200);assert.equal(response.body.success,true);assert.equal(response.body.persisted,true);
  assert.equal(response.body.taskId,'task');assert.equal(response.body.status,status);assert.equal(response.headers['Cache-Control'],'no-store');
}
test('unauthenticated and invalid extension tokens cannot write',async()=>{
  const h=harness();rejected(await h.send(undefined,''),401);assert.equal(h.writes.length,0);
  const invalid=harness({invalidToken:true});rejected(await invalid.send(),401);assert.equal(invalid.writes.length,0);
});
test('current program entitlement is checked before writes',async()=>{
  const h=harness();h.access({allowed:false,status:403,error:'이용 권한 없음'});rejected(await h.send(),403);assert.equal(h.writes.length,0);
});
test('token DB failure is retryable without private error disclosure',async()=>{
  const h=harness({tokenError:true});const r=await h.send();rejected(r,503);assert.doesNotMatch(JSON.stringify(r.body),/private db detail/);assert.equal(h.writes.length,0);
});
test('malformed results cannot become a publication success',async()=>{
  for(const body of [null,'invalid-json',{}, {taskId:'task',success:'false'}, {taskId:42,success:true}, {taskId:' ',success:true}, {taskId:'task',success:true,postUrl:{}}, {taskId:'task',success:false,error:[]}]){
    const h=harness();rejected(await h.send(body),400);assert.equal(h.writes.length,0);
  }
});
test('Supabase returned update error is not acknowledged; same result succeeds after recovery',async()=>{
  const h=harness({failure:'update'});const before=JSON.stringify(h.row);rejected(await h.send(),503);
  assert.equal(JSON.stringify(h.row),before);h.recover();acknowledged(await h.send());assert.equal(h.writes.length,1);
});
test('DB exceptions are retryable and private details are not returned',async()=>{
  const h=harness({failure:'throw'});const r=await h.send();rejected(r,503);assert.doesNotMatch(JSON.stringify(r.body),/private db detail/);
});
test('missing and foreign member rows never receive success or changes',async()=>{
  for(const options of [{missing:true},{row:{user_id:'other'}}]){const h=harness(options);const before=JSON.stringify(h.row);rejected(await h.send(),404);assert.equal(JSON.stringify(h.row),before);assert.equal(h.writes.length,0);}
});
test('cancelled/queued drafts and cancellation race cannot be overwritten',async()=>{
  for(const options of [{row:{status:'draft'}},{row:{status:'queued'}},{cancelDuringUpdate:true}]){
    const h=harness(options);rejected(await h.send(),409);assert.equal(h.writes.length,0);assert.equal(h.row.content,initial.content);
  }
});
test('read failure after zero affected rows remains retryable',async()=>{
  const h=harness({failure:'read',row:{status:'draft'}});rejected(await h.send(),503);assert.equal(h.writes.length,0);
});
test('confirmed publication updates only result fields, retaining source and images',async()=>{
  const h=harness();acknowledged(await h.send());assert.equal(h.row.status,'published');assert.ok(h.row.published_at);
  assert.equal(h.row.content,initial.content);assert.equal(h.row.title,initial.title);assert.deepEqual(h.row.images,initial.images);
});
test('lost response retries preserve original publication time and perform one write',async()=>{
  const h=harness();acknowledged(await h.send());h.row.published_at='2026-10-10T00:00:00.000Z';h.row.updated_at='2026-10-10T00:00:00.000Z';
  const committed=JSON.stringify(h.row);acknowledged(await h.send());assert.equal(JSON.stringify(h.row),committed);assert.equal(h.writes.length,1);
});
test('reservation confirmation may have no post URL and is idempotent',async()=>{
  const h=harness();const body={taskId:'task',success:true,postUrl:null};acknowledged(await h.send(body));acknowledged(await h.send(body));assert.equal(h.writes.length,1);
});
test('same failed outcome is acknowledged without rewriting; contradictory success is rejected',async()=>{
  const h=harness();const body={taskId:'task',success:false,error:'[EDITOR_INTERRUPTED] 확인 필요'};
  acknowledged(await h.send(body),'failed');const committed=JSON.stringify(h.row);acknowledged(await h.send(body),'failed');assert.equal(JSON.stringify(h.row),committed);
  rejected(await h.send(),409);assert.equal(h.writes.length,1);
});
test('late failure or changed URL never replaces a confirmed publication',async()=>{
  const h=harness();acknowledged(await h.send());const committed=JSON.stringify(h.row);
  rejected(await h.send({taskId:'task',success:false,error:'late failure'}),409);
  rejected(await h.send({taskId:'task',success:true,postUrl:'https://blog.naver.com/myblog/456'}),409);
  assert.equal(JSON.stringify(h.row),committed);assert.equal(h.writes.length,1);
});

test('prepared outcome is separate, idempotent, and cannot become published',async()=>{
 const h=harness({row:{blog_id:'myblog',research_summary:{naver_publishing:{blog_id:'myblog',execution_mode:'prepare'}}}});
 const body={taskId:'task',success:false,prepared:true};acknowledged(await h.send(body),'prepared');
 assert.equal(h.row.published_at,null);assert.equal(h.row.post_url,null);acknowledged(await h.send(body),'prepared');
 rejected(await h.send(),409);assert.equal(h.writes.length,1);
});
test('prepared reports require saved prepare mode and cannot include publication claims',async()=>{
 rejected(await harness().send({taskId:'task',success:false,prepared:true}),409);
 rejected(await harness().send({taskId:'task',success:true,prepared:true}),400);
});
