const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let access = { allowed: true, userId: 'owner' }, race = false;
const id = '00000000-0000-4000-8000-000000000001';
const otherId = '00000000-0000-4000-8000-000000000002';
const rows = [
  { id, user_id:'owner', blog_id:'myblog', title:'보존 제목', content:'보존 본문', images:[{url:'https://example.com/a.png'}], tags:['기존'], status:'draft', research_summary:{sources:['기존 자료']} },
  { id:otherId, user_id:'other', blog_id:'myblog', status:'draft', research_summary:null, tags:[] },
];
const accounts = [{id:'a1',user_id:'owner',blog_id:'myblog',default_category:null},{id:'a2',user_id:'other',blog_id:'myblog',default_category:'타인 기본값'}];
const admin = {from(table) {
  const filters = [], excluded = []; let patch;
  const chain = {
    select(){return chain;}, eq(key,value){filters.push([key,value]);return chain;},
    not(key,_operator,value){excluded.push([key, value.match(/[\w]+/g)]);return chain;},
    update(value){patch=value;return chain;},
    maybeSingle: async()=>({data:run()[0]||null,error:null}),
    then(resolve){resolve({data:run(),error:null});},
  };
  function run(){
    if(race && patch && table==='nba_posts'){rows[0].status='publishing';race=false;}
    const hits=(table==='nba_posts'?rows:accounts).filter(row=>filters.every(([key,value])=>row[key]===value) && excluded.every(([key,values])=>!values.includes(row[key])));
    if(patch)hits.forEach(row=>Object.assign(row,patch));
    return hits;
  }
  return chain;
}};
function load(file){
  const module={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const req=name=>name==='next/server'?{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}}:
    name==='@/lib/access'?{checkProgramAccessApi:async()=>access}:
    name==='@/lib/supabase/admin'?{createAdminClient:()=>admin}:
    name==='@/lib/naverPublishing'?load('src/lib/naverPublishing.ts'):require(name);
  new Function('require','module','exports',js)(req,module,module.exports);
  return module.exports;
}
const route=load('src/app/api/posts/[id]/publishing/route.ts');
const context=value=>({params:Promise.resolve({id:value})});
const request=body=>({json:async()=>body});
(async()=>{
  access={allowed:false,status:403,error:'이용 권한 없음'};
  assert.equal((await route.GET({},context(id))).status,403);
  assert.equal((await route.PUT(request({category:null}),context(id))).status,403);
  access={allowed:true,userId:'owner'};
  assert.equal((await route.GET({},context(otherId))).status,404);
  assert.equal((await route.PUT(request({category:null}),context(otherId))).status,404);
  const original=JSON.stringify({title:rows[0].title,content:rows[0].content,images:rows[0].images});
  const category={id:'29',name:'●AI자동화'};
  let result=await route.PUT(request({category,tags:['#AI 툴','AI툴','노트북 비교'],setDefault:true}),context(id));
  assert.equal(result.status,200);
  assert.deepEqual(result.body.tags,['AI툴','노트북비교']);
  assert.equal(JSON.stringify({title:rows[0].title,content:rows[0].content,images:rows[0].images}),original);
  assert.deepEqual(rows[0].research_summary.sources,['기존 자료']);
  assert.equal(accounts[0].default_category,'●AI자동화');
  assert.equal(accounts[1].default_category,'타인 기본값');
  result=await route.GET({},context(id));
  assert.deepEqual(result.body.category,category);
  assert.deepEqual(result.body.tags,['AI툴','노트북비교']);
  const saved=JSON.stringify(rows[0].research_summary);
  rows[0].status='queued';
  assert.equal((await route.PUT(request({category:null}),context(id))).status,409);
  assert.equal(JSON.stringify(rows[0].research_summary),saved);
  rows[0].status='draft';race=true;
  assert.equal((await route.PUT(request({category:null}),context(id))).status,409,'조회 후 큐 전환 경쟁에서도 설정 변경 차단');
  assert.equal(JSON.stringify(rows[0].research_summary),saved);
  assert.equal((await route.PUT(request({category:{id:'bad',name:'카테고리'}}),context(id))).status,400);
  rows[0].status='draft';
  const modeBody={category,tags:['검수'],executionMode:'prepare'};
  result=await route.PUT(request(modeBody),context(id));assert.equal(result.status,200);
  assert.equal((await route.GET({},context(id))).body.executionMode,'prepare');
  assert.deepEqual(rows[0].research_summary.sources,['기존 자료']);
  result=await route.PUT(request({...modeBody,executionMode:'invalid'}),context(id));assert.equal(result.status,400);
  rows[0].status='prepared';result=await route.PUT(request(modeBody),context(id));assert.equal(result.status,200);assert.equal(rows[0].status,'draft','changed settings invalidate prepared status');
  rows[0].status='publishing';result=await route.PUT(request({...modeBody,executionMode:'publish'}),context(id));assert.equal(result.status,409);
  console.log('naver publishing ownership, preservation and race tests passed');
})().catch(err=>{console.error(err);process.exit(1);});
