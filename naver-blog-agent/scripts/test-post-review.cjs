const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../src');
const ID='00000000-0000-4000-8000-000000000001';
function harness() {
  const db={nba_posts:[],nba_accounts:[{id:'account',user_id:'owner',blog_id:'myblog'}],nba_extension_tokens:[{token:'token',user_id:'owner'}]};
  let access=true,failure=null,race=null,seq=1,input=null;
  const writes=[],reads=[];
  function from(table) {
    const filters=[],excludes=[];let patch,op='select',limit=null,order=null;
    const run=()=>{
      reads.push({table,op,filters:[...filters]});
      if(failure===`${table}:${op}`)return {data:null,error:{message:'private failure'}};
      if(race && op==='update' && table==='nba_posts'){const change=race;race=null;change(db.nba_posts[0]);}
      let hits=db[table].filter(row=>filters.every(([k,v])=>row[k]===v)&&excludes.every(([k,values])=>!values.includes(row[k])));
      if(op==='select'){
        if(order)hits=[...hits].sort((a,b)=>String(b[order]).localeCompare(String(a[order])));
        if(limit!==null)hits=hits.slice(0,limit);
      }
      if(op==='insert'){
        const row={id:'00000000-0000-4000-8000-'+String(++seq).padStart(12,'0'),created_at:'2026-10-10',updated_at:'2026-10-10',...patch};db[table].push(row);hits=[row];
      }
      if(op==='update')hits.forEach(row=>Object.assign(row,patch));
      if(op!=='select')writes.push({table,patch,hits:hits.length});
      return {data:structuredClone(hits),error:null};
    };
    const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},not(k,_op,value){excludes.push([k,value.match(/\w+/g)]);return q;},order(k){order=k;return q;},limit(n){limit=n;return q;},update(p){op='update';patch=p;return q;},insert(p){op='insert';patch=p;return q;},
      async maybeSingle(){const r=run();return {...r,data:r.data?.[0] || null};},async single(){const r=run();return r.error?r:r.data.length===1?{data:r.data[0],error:null}:{data:null,error:{message:'zero rows'}};},then(resolve,reject){return Promise.resolve(run()).then(resolve,reject);}};
    return q;
  }
  const admin={from};const cache=new Map();
  const generated={title:'검수 원고',content:'공식 자료 https://example.com/source 가격 10,000원',category:'생활',tags:['생활'],images:[],reviewStatus:'PASS',reviewNote:'본문 검수',stepsLog:[]};
  function load(rel) {
    if(cache.has(rel))return cache.get(rel);
    const filename=path.join(root,rel),module={exports:{}};
    const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const req=id=>{
      if(id==='next/server')return {NextResponse:{json:(body,init)=>({body,status:init?.status || 200,headers:init?.headers})}};
      if(id==='@/lib/supabase/admin')return {createAdminClient:()=>admin};
      if(id==='@/lib/access')return {checkProgramAccessApi:async()=>access?{allowed:true,userId:'owner'}:{allowed:false,error:'로그인 필요',status:401}};
      if(id==='@/lib/apiKeys')return {resolveAvailableAI:async(userId,provider)=>{assert.equal(userId,'owner');return {provider:provider || 'openai',apiKey:'mock-owner-key'};}};
      if(id==='@/lib/ai/pipeline')return {runBlogGenerationPipeline:async args=>{input=args;return generated;}};
      if(id==='@/lib/extensionBridge')return {authenticateExtension:async()=>access?{ok:true,admin,userId:'owner',token:'token'}:{ok:false,status:401,error:'denied'},buildBridgePayload:row=>({title:row.title,executionMode:row.research_summary?.naver_publishing?.execution_mode || 'publish'})};
      if(id.startsWith('@/'))return load(id.slice(2)+'.ts');
      if(id.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(filename),id))+'.ts');
      return require(id);
    };
    new Function('require','module','exports',js)(req,module,module.exports);cache.set(rel,module.exports);return module.exports;
  }
  const review=load('lib/postReview.ts');
  function seed(status='draft',reviewStatus=null) {
    const row={id:ID,user_id:'owner',blog_id:'myblog',title:generated.title,content:generated.content,tags:['생활'],images:[],status,updated_at:'2026-10-10T00:00:00Z'};
    if(reviewStatus)row.research_summary=review.withPostReview({sources:['보존']},{status:reviewStatus,source:'ai',note:'AI 결과',fingerprint:review.reviewFingerprint(row),checkedAt:'original'});
    db.nba_posts.push(row);return row;
  }
  const context={params:Promise.resolve({id:ID})};const request=body=>({url:'https://test/api',json:async()=>body});
  return {db,writes,reads,review,seed,generated,load,context,request,get input(){return input;},deny(){access=false;},fail(value){failure=value;},race(fn){race=fn;}};
}
test('manual review requires auth, owner, explicit confirmation and current fingerprint',async()=>{
  const h=harness(),row=h.seed(),r=h.load('app/api/posts/[id]/review/route.ts');
  assert.equal((await r.POST(h.request({confirmed:false}),h.context)).status,400);
  assert.equal((await r.POST(h.request({confirmed:true,fingerprint:'old'}),h.context)).status,409);
  row.user_id='foreign';assert.equal((await r.GET({},h.context)).status,404);
  assert.equal((await r.POST(h.request({confirmed:true,fingerprint:h.review.reviewFingerprint(row)}),h.context)).status,404);
  h.deny();assert.equal((await r.GET({},h.context)).status,401);assert.equal(h.writes.length,0);
});
test('FAIL WARN UNKNOWN and missing review cannot queue, even with client-forged PASS',async()=>{
  for(const status of [null,'FAIL','WARN','UNKNOWN']){
    const h=harness(),row=h.seed('draft',status),r=h.load('app/api/posts/route.ts');
    const payload={...row,status:'queued',reviewStatus:'PASS',research_summary:{review:{status:'PASS',source:'ai',fingerprint:h.review.reviewFingerprint(row),checkedAt:'forged'}}};
    assert.equal((await r.POST(h.request(payload))).status,422);
    assert.equal((await r.PUT(h.request({id:ID,status:'queued',research_summary:payload.research_summary}))).status,422);
    assert.equal(row.status,'draft');assert.equal(h.writes.length,0);
  }
});
test('explicit manual confirmation permits the exact stored source and keeps AI/source metadata honest',async()=>{
  const h=harness(),row=h.seed('draft','FAIL'),r=h.load('app/api/posts/[id]/review/route.ts');
  const before=h.review.reviewFingerprint(row);
  assert.equal((await r.POST(h.request({confirmed:true,fingerprint:before}),h.context)).status,200);
  assert.equal(row.research_summary.review.source,'manual');assert.equal(row.research_summary.review.status,'CONFIRMED');
  assert.equal(row.research_summary.ai_review.status,'FAIL');assert.equal(h.review.getPostReview(row).aiStatus,'FAIL');
  assert.deepEqual(row.research_summary.sources,['보존']);assert.equal(h.review.reviewFingerprint(row),before);
  const posts=h.load('app/api/posts/route.ts');assert.equal((await posts.PUT(h.request({id:ID,status:'queued'}))).status,200);
  assert.equal(row.status,'queued');
});
test('title body tags blog and images invalidate a passing certificate; object key order does not',async()=>{
  const h=harness(),row=h.seed('draft','PASS');
  for(const [key,value] of [['title','다른 제목'],['content','수정 본문'],['tags',['다른태그']],['blog_id','otherblog'],['images',[{url:'https://example.com/changed.png'}]]]){
    assert.equal(h.review.getPostReview({...row,[key]:value}).state,'STALE');assert.equal(h.review.getPostReview({...row,[key]:value}).allowed,false);
  }
  const a={...row,images:[{url:'https://example.com/image.png',caption:'사진'}]},b={...a,images:[{caption:'사진',url:'https://example.com/image.png'}]};
  assert.equal(h.review.reviewFingerprint(a),h.review.reviewFingerprint(b));
});
test('ready edits invalidate readiness and review; draft saving cannot replace the review certificate',async()=>{
  const h=harness(),row=h.seed('prepared','PASS'),r=h.load('app/api/posts/route.ts');
  assert.equal((await r.PUT(h.request({id:ID,content:'수정 본문'}))).status,200);
  assert.equal(row.status,'draft');assert.equal(h.review.getPostReview(row).state,'STALE');
  assert.equal((await r.POST(h.request({...row,title:'새 제목',research_summary:{review:{status:'PASS'}},status:'draft'}))).status,200);
  assert.equal(row.research_summary.review.source,'ai');assert.equal(h.review.getPostReview(row).allowed,false);
});
test('queued and running sources cannot be overwritten by POST or PUT; unchanged cache saves are safe',async()=>{
  for(const status of ['queued','publishing']){
    const h=harness(),row=h.seed(status,'PASS'),r=h.load('app/api/posts/route.ts');
    assert.equal((await r.POST(h.request({...row,content:'변경 내용',status:'draft'}))).status,409);
    assert.equal((await r.PUT(h.request({id:ID,images:[{url:'https://example.com/new.png'}]}))).status,409);
    assert.equal((await r.POST(h.request({...row,status:'draft'}))).status,200);assert.equal(row.status,status);
    assert.equal(row.content,h.generated.content);
  }
});
test('review confirmation rejects a concurrent edit and DB failure without false success',async()=>{
  const h=harness(),row=h.seed(),r=h.load('app/api/posts/[id]/review/route.ts');
  h.race(current=>{current.content='동시 수정';current.updated_at='new';});
  assert.equal((await r.POST(h.request({confirmed:true,fingerprint:h.review.reviewFingerprint(row)}),h.context)).status,409);
  assert.equal(row.research_summary,undefined);
  h.fail('nba_posts:update');assert.equal((await r.POST(h.request({confirmed:true,fingerprint:h.review.reviewFingerprint(row)}),h.context)).status,503);
});
test('the actual task route rejects unreviewed queued work and claims only a reviewed current snapshot',async()=>{
  const h=harness(),row=h.seed('queued'),r=h.load('app/api/extension/task/route.ts');
  assert.equal((await r.POST(h.request({blogId:'myblog'}))).status,409);assert.equal(row.status,'queued');
  row.research_summary=h.review.withPostReview(null,{status:'PASS',source:'ai',fingerprint:h.review.reviewFingerprint(row),note:'검수',checkedAt:'now'});
  h.race(current=>{current.content='바뀐 본문';current.updated_at='new';});
  assert.equal((await r.POST(h.request({blogId:'myblog'}))).body.task,null);assert.equal(row.status,'queued');
  assert.equal((await r.POST(h.request({blogId:'myblog'}))).status,409);
});
test('generation uses only the owner blog recent titles and persists the real AI verdict',async()=>{
  const h=harness();h.db.nba_posts.push({user_id:'owner',blog_id:'myblog',title:'실제 최근 제목',created_at:'2026-10-09'},{user_id:'foreign',blog_id:'myblog',title:'남의 제목'},{user_id:'owner',blog_id:'other',title:'다른 블로그'});
  const r=h.load('app/api/generate/route.ts');
  const response=await r.POST(h.request({category:'생활',blogId:'myblog',recentTitles:['클라이언트 위조 제목'],engine:{provider:'openai',model:'gpt-6-sol'}}));
  assert.equal(response.status,200);assert.equal(response.body.saved,true);assert.ok(response.body.postId);
  assert.deepEqual(h.input.recentTitles,['실제 최근 제목']);assert.equal(h.input.aiConfig.apiKey,'mock-owner-key');
  const stored=h.db.nba_posts.at(-1);assert.equal(stored.user_id,'owner');assert.equal(h.review.getPostReview(stored).allowed,true);
  assert.equal(stored.research_summary.review.source,'ai');
  h.fail('nba_posts:insert');const failed=await r.POST(h.request({category:'생활',blogId:'myblog'}));
  assert.equal(failed.body.saved,false);assert.equal(failed.body.result.content,h.generated.content);assert.ok(failed.body.saveError);
});
test('generation rejects foreign blogs or title-query errors before AI execution',async()=>{
  const h=harness(),r=h.load('app/api/generate/route.ts');
  for(const imageCount of [0,6,2.5,'5'])assert.equal((await r.POST(h.request({category:'생활',blogId:'myblog',imageCount}))).status,400);
  assert.equal((await r.POST(h.request({category:'생활',blogId:'foreign_blog'}))).status,400);assert.equal(h.input,null);
  h.fail('nba_posts:select');assert.equal((await r.POST(h.request({category:'생활',blogId:'myblog'}))).status,503);assert.equal(h.input,null);
});
test('humanizer preserves URLs as well as numeric facts',()=>{
  const h=harness(),human=h.load('lib/humanizer/index.ts');
  const blocks=human.splitArticle('자료 https://example.com/a 금액 100원');
  assert.equal(human.applyHumanizerEdits(blocks,[{id:'b0',text:'안내 https://other.example/a 금액 100원'}]).article,blocks[0].text);
  assert.equal(human.applyHumanizerEdits(blocks,[{id:'b0',text:'안내 https://example.com/a 금액 101원'}]).article,blocks[0].text);
  assert.equal(human.applyHumanizerEdits(blocks,[{id:'b0',text:'확인한 자료 https://example.com/a 금액 100원'}]).changes.length,1);
});
test('missing selected provider key never silently switches to another registered key',async()=>{
  const filename=path.join(root,'lib/apiKeys.ts'),module={exports:{}},lookups=[];
  const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const req=id=>{
    if(id==='server-only')return {};
    if(id==='@/lib/supabase/admin')return {createAdminClient:()=>({from(){let provider,userId;const q={select(){return q;},eq(key,value){if(key==='provider')provider=value;if(key==='user_id')userId=value;return q;},maybeSingle:async()=>{lookups.push([userId,provider]);return {data:provider==='gemini'?{api_key:'mock-own-gemini'}:null};}};return q;}})};
    throw new Error(id);
  };
  new Function('require','module','exports',js)(req,module,module.exports);
  assert.equal(await module.exports.resolveAvailableAI('owner','openai'),null);assert.deepEqual(lookups,[['owner','openai']]);
  assert.equal((await module.exports.resolveAvailableAI('owner','gemini')).provider,'gemini');
});
