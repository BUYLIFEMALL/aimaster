const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../src');
function loader(stubs={}){const cache=new Map();function load(rel){if(cache.has(rel))return cache.get(rel);const module={exports:{}};cache.set(rel,module.exports);const js=ts.transpileModule(fs.readFileSync(path.join(root,rel),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',js)(id=>{if(id in stubs)return stubs[id];if(id==='server-only')return {};if(id.startsWith('@/'))return load(id.slice(2)+'.ts');if(id.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(path.join(root,rel)),id))+'.ts');return require(id);},module,module.exports);cache.set(rel,module.exports);return module.exports;}return load;}
const OWNER='owner',ID='00000000-0000-4000-8000-000000000011';
const base={id:ID,method:'rss',source_input:'https://example.com/feed',source_text:'합성 시험 자료의 원문입니다. 실제 방문이나 서비스를 뜻하지 않습니다.',title:'시험 자료',content:'합성 요약',category:'생활',keywords:[],status:'ready',created_at:new Date().toISOString()};
test('public 192.0.66.x is accepted while private, reserved and mixed DNS remain blocked',async()=>{
  let addresses=[{address:'192.0.66.108'}];
  const collector=loader({'node:dns/promises':{lookup:async()=>addresses}})('lib/collector.ts');
  assert.equal((await collector.assertPublicHttpUrl('https://www.nasa.gov/feed/')).hostname,'www.nasa.gov');
  for(const address of ['192.0.0.1','192.0.2.1','10.0.0.1','127.0.0.1','192.168.0.1','169.254.169.254','172.16.0.1','100.64.0.1','198.18.0.1','::1','fc00::1']){
    addresses=[{address}];await assert.rejects(collector.assertPublicHttpUrl('https://example.com/feed'));
  }
  addresses=[{address:'192.0.66.108'},{address:'127.0.0.1'}];await assert.rejects(collector.assertPublicHttpUrl('https://example.com/feed'));
  addresses=[{address:'192.0.66.108'}];
  const previous=global.fetch;let calls=0;
  try {global.fetch=async()=>{calls++;return {status:302,headers:{get:()=> 'http://127.0.0.1/private'}}};await assert.rejects(collector.fetchPublicHtml('https://www.nasa.gov/feed/'));assert.equal(calls,1);}finally{global.fetch=previous;}
});
test('RSS/Atom keep canonical source links and body, strip markup and reject title-only/HTML',()=>{
  const read=loader()('lib/rss.ts').readFeed;
  const rss='<rss><channel><item><title>시험</title><link>https://example.com/one</link><description><![CDATA[<p>'+base.source_text+'</p><script>bad()</script>]]></description></item></channel></rss>';
  assert.deepEqual(read(rss,'https://example.com/feed'),[{title:'시험',url:'https://example.com/one',text:base.source_text}]);
  const atom='<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>시험</title><link rel="alternate" href="/two"/><summary>'+base.source_text+'</summary></entry></feed>';
  assert.equal(read(atom,'https://example.com/feed')[0].url,'https://example.com/two');
  assert.throws(()=>read('<html>not a feed</html>','https://example.com/feed'));
  assert.throws(()=>read('<rss><channel><item><title>제목만</title><link>https://example.com</link></item></channel></rss>','https://example.com/feed'));
  assert.throws(()=>read(rss.replace('https://example.com/one','javascript:alert(1)'),'https://example.com/feed'));
});
test('source lifetime is fixed at 30 days; invalid/foreign/future/expired sources fail closed',()=>{
  const rules=loader()('lib/sourceBundle.ts'),now=Date.now(),source=rules.sourceBundle(ID,OWNER,base,['javascript:x','https://example.com/a','https://example.com/a'],now);
  assert.equal(rules.validSource(source,OWNER,now),true);assert.equal(Date.parse(source.expiresAt)-Date.parse(source.collectedAt),30*86400000);
  assert.deepEqual(source.urls,['https://example.com/a']);assert.equal(rules.validSource(source,'foreign',now),false);
  assert.equal(rules.validSource(source,OWNER,now+30*86400000),false);assert.equal(rules.validSource(source,OWNER,now-1),false);
  assert.equal(rules.validSource({...source,expiresAt:new Date(now+31*86400000).toISOString()},OWNER,now),false);
});
function database(row){const reads=[];return {reads,from(table){const filters=[];const query={select(){return query},eq(key,value){filters.push([key,value]);return query},async maybeSingle(){reads.push({table,filters});return {data:row && filters.every(([key,value])=>row[key]===value)?structuredClone(row):null,error:null}}};return query}};}
test('server loads own original material, refuses foreign/missing source before use',async()=>{
  const load=loader(),rules=load('lib/sourceBundle.ts'),source=rules.sourceBundle(ID,OWNER,base,['https://example.com/article']);
  const row={id:ID,user_id:OWNER,created_at:source.collectedAt,expires_at:source.expiresAt,updated_at:'2026-10-21T00:00:00Z',candidate:{...base,source}},db=database(row),service=load('lib/collectedMaterials.ts');
  const result=await service.loadCollected(db,OWNER,ID);assert.match(result.material,/합성 요약/);assert.match(result.material,/합성 시험 자료/);assert.deepEqual(result.bundle,source);
  await assert.rejects(service.loadCollected(db,'foreign',ID),error=>error.status===410);assert.ok(db.reads.every(read=>read.filters.some(([key])=>key==='user_id')));
  await assert.rejects(service.loadCollected(db,OWNER,'bad'),error=>error.status===400);
  row.candidate.content='변경한 요약'.repeat(1000);assert.match((await service.loadCollected(db,OWNER,ID)).material,/합성 시험 자료/);
});
test('collector edit API denies unauthenticated requests and immutable fields; always binds server owner',async()=>{
  let allowed=false,rpcCall=null;
  const admin={rpc:async(name,args)=>{rpcCall={name,args};return {error:{code:'P0001',message:'source_conflict'}}}};
  const load=loader({'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}},'@/lib/access':{checkProgramAccessApi:async()=>allowed?{allowed:true,userId:OWNER}:{allowed:false,status:401,error:'denied'}},'@/lib/supabase/admin':{createAdminClient:()=>admin}});
  const route=load('app/api/collector/materials/route.ts'),req=body=>({json:async()=>body}),fields={title:'수정 제목',content:'수정 요약',category:'생활',status:'used',is_archived:true};
  assert.equal((await route.PATCH(req({}))).status,401);assert.equal(rpcCall,null);allowed=true;
  assert.equal((await route.PATCH(req({changes:[{id:ID,revision:new Date().toISOString(),fields:{...fields,source:{text:'forged'}}}]}))).status,400);assert.equal(rpcCall,null);
  assert.equal((await route.PATCH(req({changes:[{id:ID,revision:new Date().toISOString(),fields}]}))).status,409);
  assert.equal(rpcCall.args.p_owner,OWNER);assert.deepEqual(rpcCall.args.p_changes[0].fields,fields);
});
test('collection returns ACK only after every candidate was saved, errors do not become success',async()=>{
  const load=loader(),service=load('lib/collectedMaterials.ts');let inserted;
  const admin={from(table){assert.equal(table,'nba_collected_materials');return {insert(rows){inserted=rows;return {select:async()=>({data:rows.map(row=>({...row,updated_at:row.created_at})),error:null})}}}}};
  const result=await service.saveCollected(admin,OWNER,[base]);assert.equal(result.length,1);assert.equal(inserted[0].user_id,OWNER);assert.equal(result[0].source.id,result[0].id);assert.equal(result[0].revision,result[0].created_at);
  await assert.rejects(service.saveCollected({from:()=>({insert:()=>({select:async()=>({data:null,error:{}})})})},OWNER,[base]),error=>error.status===503);
});
test('edit/reopen keeps immutable source even after candidate deletion; replacement/expiry denied',async()=>{
  const load=loader(),rules=load('lib/sourceBundle.ts'),source=rules.sourceBundle(ID,OWNER,base,[]),service=load('lib/collectedMaterials.ts');
  const current={research_summary:{source_bundle:source}},db=database(null);
  assert.deepEqual(await service.validateSourcePost(db,OWNER,{content:'수정'},current),source);assert.equal(db.reads.length,0);
  await assert.rejects(service.validateSourcePost(db,OWNER,{source_id:'different'},current),error=>error.status===409);
  await assert.rejects(service.validateSourcePost(db,'foreign',{},current),error=>error.status===410);
  await assert.rejects(service.validateSourcePost(db,OWNER,{source_id:ID},{research_summary:{}}),error=>error.status===409);
});
test('new source posts preserve original created_at, save receipt, revision, server listing and no browser cache',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'test-post-review.cjs'),'utf8').split("test('manual review")[0];const make=new Function('require','__dirname',source+';return harness;')(require,__dirname),h=make();
  const bundle=h.load('lib/sourceBundle.ts').sourceBundle(ID,OWNER,base,['https://example.com/source'],Date.now()-86400000*5);
  h.db.nba_collected_materials=[{id:ID,user_id:OWNER,created_at:bundle.collectedAt,expires_at:bundle.expiresAt,updated_at:bundle.collectedAt,candidate:{...base,source:bundle}}];
  const route=h.load('app/api/posts/route.ts'),payload={id:ID,save_request_id:require('crypto').randomUUID(),create:true,title:'합성 원고',content:'원문 대조 시험',images:[],tags:[],source_id:ID};
  const request={json:async()=>structuredClone(payload)};
  const result=await route.POST(request);assert.equal(result.status,200);const row=h.db.nba_posts[0];assert.equal(row.created_at,bundle.collectedAt);assert.deepEqual(row.research_summary.source_bundle,bundle);
  assert.equal((await route.POST(request)).body.replayed,true);
  assert.deepEqual((await route.GET({url:'https://test/api/posts'})).body.posts[0].source_bundle,bundle);
  const update=await route.PUT(h.request({id:ID,content:'다시 편집',source_id:ID}));assert.equal(update.status,200);assert.equal(row.created_at,bundle.collectedAt);
  assert.deepEqual(row.research_summary.source_bundle,bundle);assert.equal(h.load('lib/postCache.ts').cacheablePosts([update.body.post]).length,0);
  h.db.nba_posts[0].research_summary.source_bundle={...bundle,ownerId:'foreign'};
  assert.equal((await route.GET({url:'https://test/api/posts'})).body.posts.length,0);
});
test('generate uses server material, ignoring forged client sourceMaterial when an own ID is supplied',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'test-post-review.cjs'),'utf8').split("test('manual review")[0];const h=new Function('require','__dirname',source+';return harness;')(require,__dirname)();
  const bundle=h.load('lib/sourceBundle.ts').sourceBundle(ID,OWNER,base,['https://example.com/source'],Date.now()-86400000);
  h.db.nba_collected_materials=[{id:ID,user_id:OWNER,created_at:bundle.collectedAt,expires_at:bundle.expiresAt,candidate:{...base,source:bundle}}];
  const route=h.load('app/api/generate/route.ts'),response=await route.POST(h.request({category:'생활',blogId:'myblog',source_id:ID,sourceMaterial:'INJECTED OTHER SOURCE'}));
  assert.equal(response.status,200);assert.match(h.input.sourceMaterial,/합성 시험 자료/);assert.doesNotMatch(h.input.sourceMaterial,/INJECTED/);assert.equal(response.body.post.created_at,bundle.collectedAt);assert.deepEqual(response.body.post.source_bundle,bundle);
  h.db.nba_collected_materials[0].user_id='foreign';const denied=await route.POST(h.request({category:'생활',blogId:'myblog',source_id:ID}));assert.equal(denied.status,410);assert.equal(h.db.nba_posts.length,1);
});
