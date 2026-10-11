const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),crypto=require('node:crypto');
// Share the existing database harness without registering its unrelated tests.
let prefix=fs.readFileSync(path.join(__dirname,'test-post-review.cjs'),'utf8').split("test('manual review")[0];
if(process.env.NBA_SAVE_BASELINE){
  prefix=prefix.replace("fs.readFileSync(filename,'utf8')", "rel==='app/api/posts/route.ts'?require('node:child_process').execFileSync('git',['show',process.env.NBA_SAVE_BASELINE+':naver-blog-agent/src/'+rel],{encoding:'utf8'}):fs.readFileSync(filename,'utf8')");
}
const make=new Function('require','__dirname',prefix+';return harness;')(require,__dirname);
const ID='00000000-0000-4000-8000-000000000001';
const raw=body=>({url:'https://test/api',json:async()=>body});
const body=(h,row,patch)=>({id:row.id,expected_revision:h.load('lib/postSaveProtocol.ts').postSaveRevision(row),save_request_id:crypto.randomUUID(),...patch});
const create=(patch={})=>({id:ID,create:true,save_request_id:crypto.randomUUID(),blog_id:'myblog',title:'2026 검수',content:'원문',images:[],tags:[],...patch});
function api(h,lose=0){let calls=0;const route=h.load('app/api/posts/route.ts');return async(_url,init)=>{calls++;const r=await route[init.method](raw(JSON.parse(init.body)));if(calls<=lose&&r.status===200)throw new Error('lost response');return {ok:r.status===200,status:r.status,json:async()=>r.body};};}

test('sequential stale browser content and image writes cannot overwrite the first accepted save',async()=>{
  const h=make(),row=h.seed(),route=h.load('app/api/posts/route.ts');
  const a=body(h,row,{content:'첫 탭 저장'}),b=body(h,row,{images:[{url:'https://example.com/stale'}]});
  assert.equal((await route.PUT(raw(a))).status,200);const before=JSON.stringify(row);
  assert.equal((await route.PUT(raw(b))).status,409);assert.equal(JSON.stringify(row),before);
});
test('stale full POST updates cannot bypass client version checking',async()=>{
  const h=make(),row=h.seed(),route=h.load('app/api/posts/route.ts');
  const stale=body(h,row,{...row,title:'옛 탭 제목'});
  assert.equal((await route.PUT(raw(body(h,row,{title:'최신 제목'})))).status,200);
  assert.equal((await route.POST(raw(stale))).status,409);assert.equal(row.title,'최신 제목');
});
test('a lost creation response retries the same UUID and receipt with one insert and original timestamps',async()=>{
  const h=make(),{PostSaveClient}=h.load('lib/postSaveClient.ts');
  const client=new PostSaveClient({id:ID},true,api(h,1));
  const fields={title:'2026 원고',content:'원문',images:[],tags:[]};
  await assert.rejects(()=>client.save(fields),/lost response/);const before=JSON.stringify(h.db.nba_posts);
  const saved=await client.save(fields);assert.equal(saved.id,ID);assert.equal(JSON.stringify(h.db.nba_posts),before);
  assert.equal(h.writes.length,1);assert.equal(client.pending,null);
});
test('editing after a lost response confirms the pending save before applying the new buffer',async()=>{
  const h=make(),{PostSaveClient}=h.load('lib/postSaveClient.ts'),client=new PostSaveClient({id:ID},true,api(h,1));
  await assert.rejects(()=>client.save({title:'제목',content:'첫 저장'}));
  await client.save({title:'제목',content:'그 후 편집'});assert.equal(h.db.nba_posts.length,1);assert.equal(h.db.nba_posts[0].content,'그 후 편집');assert.equal(h.writes.length,2);
});
test('same request ID with changed body is rejected and creates no copy',async()=>{
  const h=make(),route=h.load('app/api/posts/route.ts'),payload=create();
  assert.equal((await route.POST(raw(payload))).status,200);
  assert.equal((await route.POST(raw({...payload,content:'변조'}))).status,409);assert.equal(h.db.nba_posts.length,1);assert.equal(h.writes.length,1);
});
test('missing save protocol, foreign update and foreign UUID collision never overwrite another owner',async()=>{
  const h=make(),row=h.seed(),route=h.load('app/api/posts/route.ts');
  assert.equal((await route.PUT(raw({id:ID,content:'old web'}))).status,409);
  row.user_id='foreign';const before=JSON.stringify(row);
  assert.equal((await route.PUT(raw(body(h,row,{content:'stolen'})))).status,404);
  assert.equal((await route.POST(raw(create()))).status,409);assert.equal(JSON.stringify(row),before);assert.equal(h.db.nba_posts.length,1);
  h.deny();assert.equal((await route.POST(raw(create()))).status,401);assert.equal(h.writes.length,0);
});
test('database errors and a concurrent CAS loss are not false save acknowledgments',async()=>{
  const h=make(),row=h.seed(),route=h.load('app/api/posts/route.ts');
  h.fail('nba_posts:update');assert.equal((await route.PUT(raw(body(h,row,{content:'fail'})))).status,503);
  h.fail(null);h.race(current=>{current.updated_at='2026-10-11T00:00:00Z';current.content='concurrent';});
  assert.equal((await route.PUT(raw(body(h,row,{content:'stale'})))).status,409);assert.equal(row.content,'concurrent');
});
test('failed ACK validation keeps the exact pending request and rejects an unrelated ID',async()=>{
  const h=make(),{PostSaveClient}=h.load('lib/postSaveClient.ts');let first;
  const client=new PostSaveClient({id:ID},true,async(_url,init)=>{first=JSON.parse(init.body);return {ok:true,status:200,json:async()=>({success:true,post:{id:'foreign',save_revision:'wrong'}})};});
  await assert.rejects(()=>client.save({title:'보존',content:'보존'}));assert.deepEqual(client.pending.body,first);
});
test('a conflict stays blocked instead of silently adopting the latest row and overwriting it',async()=>{
  const h=make(),row=h.seed(),{PostSaveClient}=h.load('lib/postSaveClient.ts'),{savedPost}=h.load('lib/postSaveProtocol.ts');
  const client=new PostSaveClient(savedPost(row),false,api(h));row.content='다른 탭 최신';
  await assert.rejects(()=>client.save({content:'옛 편집'}));await assert.rejects(()=>client.save({content:'강제 재시도'}));assert.equal(row.content,'다른 탭 최신');assert.equal(h.writes.length,0);
});
test('manual review changes do not invalidate an unchanged editable snapshot; saves retain the certificate',async()=>{
  const h=make(),row=h.seed('draft','PASS'),route=h.load('app/api/posts/route.ts');
  const request=body(h,row,{category_name:'새 분류'}),review=h.load('app/api/posts/[id]/review/route.ts');
  assert.equal((await review.POST(raw({confirmed:true,fingerprint:h.review.reviewFingerprint(row)}),h.context)).status,200);
  assert.equal((await route.PUT(raw(request))).status,200);assert.equal(row.research_summary.review.status,'CONFIRMED');
});
test('ABA edits and same-millisecond saves get distinct revision receipts',async()=>{
  const h=make(),row=h.seed(),route=h.load('app/api/posts/route.ts'),stale=body(h,row,{content:'stale'}),original=row.content;
  await route.PUT(raw(body(h,row,{content:'B'})));await route.PUT(raw(body(h,row,{content:original})));
  assert.equal((await route.PUT(raw(stale))).status,409);
});
test('stale settings cannot replace another tab tags or publishing configuration',async()=>{
  const h=make(),row=h.seed(),settings=h.load('app/api/posts/[id]/publishing/route.ts'),posts=h.load('app/api/posts/route.ts');
  const stale=body(h,row,{category:null,tags:['옛 태그'],executionMode:'prepare'});
  await posts.PUT(raw(body(h,row,{tags:['최신 태그']})));
  assert.equal((await settings.PUT(raw(stale),h.context)).status,409);assert.deepEqual(row.tags,['최신 태그']);
});
test('lost settings acknowledgment replays without rewriting the draft timestamp',async()=>{
  const h=make(),row=h.seed(),settings=h.load('app/api/posts/[id]/publishing/route.ts'),payload=body(h,row,{category:null,tags:['태그'],executionMode:'prepare'});
  assert.equal((await settings.PUT(raw(payload),h.context)).status,200);const before=JSON.stringify(row);
  assert.equal((await settings.PUT(raw(payload),h.context)).body.replayed,true);assert.equal(JSON.stringify(row),before);
});
test('late list acknowledgments preserve newer rows and independent concurrent saves',()=>{
  const h=make(),{mergeSavedPosts}=h.load('lib/postSaveClient.ts');
  const current=[{id:'a',content:'최신',updated_at:'2026-10-11T01:00:02Z'},{id:'b',content:'다른 탭',updated_at:'2026-10-11T01:00:01Z'}];
  const next=mergeSavedPosts(current,[{id:'a',content:'옛 ACK',updated_at:'2026-10-11T01:00:00Z'}]);assert.deepEqual(next,current);
  assert.equal(mergeSavedPosts(next,[{id:'c',content:'신규'}]).find(post=>post.id==='b').content,'다른 탭');
});


test('pending requests keep nested input immutable and serialize concurrent save attempts',async()=>{
  const h=make(),{PostSaveClient}=h.load('lib/postSaveClient.ts');let release,calls=0;
  const transport=api(h);const client=new PostSaveClient({id:ID},true,async(...args)=>{calls++;if(calls===1){await new Promise(resolve=>release=resolve);await transport(...args);throw Error('lost response');}return transport(...args);});
  const fields={title:'보존',content:'보존',images:[{url:'https://example.com/original'}]};
  const first=client.save(fields);fields.images[0].url='https://example.com/mutated';
  await assert.rejects(()=>client.save(fields),/저장 중/);release();await assert.rejects(()=>first,/lost response/);
  assert.equal(client.pending.body.images[0].url,'https://example.com/original');
  await client.save(fields);assert.equal(h.db.nba_posts.length,1);assert.equal(h.db.nba_posts[0].images[0].url,'https://example.com/mutated');assert.equal(h.writes.length,2);
});

test('simultaneous identical creations and updates acknowledge one write via the same receipt',async()=>{
  const h=make(),route=h.load('app/api/posts/route.ts'),payload=create();
  const created=await Promise.all([route.POST(raw(payload)),route.POST(raw(payload))]);assert.deepEqual(created.map(r=>r.status),[200,200]);assert.equal(h.db.nba_posts.length,1);assert.equal(h.writes.length,1);
  const update=body(h,h.db.nba_posts[0],{content:'next'}),updated=await Promise.all([route.PUT(raw(update)),route.PUT(raw(update))]);assert.deepEqual(updated.map(r=>r.status),[200,200]);assert.equal(h.writes.filter(w=>w.hits===1).length,2);assert.equal(h.db.nba_posts[0].content,'next');
});
test('superseded receipt cannot replay an older lost response over a later save',async()=>{
  const h=make(),row=h.seed(),route=h.load('app/api/posts/route.ts'),first=body(h,row,{content:'first'});
  await route.PUT(raw(first));await route.PUT(raw(body(h,row,{content:'latest'})));const before=JSON.stringify(row);
  assert.equal((await route.PUT(raw(first))).status,409);assert.equal(JSON.stringify(row),before);
});
test('simultaneous identical settings saves acknowledge the one accepted receipt',async()=>{
  const h=make(),row=h.seed(),settings=h.load('app/api/posts/[id]/publishing/route.ts'),payload=body(h,row,{category:null,tags:['tag'],executionMode:'prepare'});
  const results=await Promise.all([settings.PUT(raw(payload),h.context),settings.PUT(raw(payload),h.context)]);assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal(h.writes.filter(w=>w.hits===1).length,1);
});
