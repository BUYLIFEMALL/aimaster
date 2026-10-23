const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const OWNER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const source=fs.readFileSync(path.join(__dirname,'test-post-review.cjs'),'utf8').split("test('manual review")[0].replaceAll("'owner'",JSON.stringify(OWNER));
const make=new Function('require','__dirname',source+';return harness;')(require,__dirname);
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(count=3,cover=1){
  const h=make(),objects=new Map(),signed=[];
  h.admin.storage={getBucket:async()=>({data:{public:false}}),from:()=>({
    info:async path=>objects.has(path)?{data:{createdAt:objects.get(path)}}:{error:{status:404}},
    createSignedUrl:async(path,seconds)=>{signed.push({path,seconds});return {data:{signedUrl:'https://test/storage/v1/object/sign/'+path+'?token='+signed.length}};}
  })};
  const photos=Array.from({length:count},(_,i)=>({id:id(i+10),storagePath:`${OWNER}/${id(i+20)}.png`,caption:'설명 '+i}));
  photos.forEach((photo,i)=>objects.set(photo.storagePath,new Date(Date.now()-86400000*(i+1)).toISOString()));
  const review={title:'합성 시험 원고',paragraphs:[{text:'직접 확인할 시험 본문',evidence:photos.map(photo=>photo.id)}],confirm:['실제 경험 없음'],observations:photos.map(photo=>({id:photo.id,visible:'합성 사진',uncertain:['방문 확인 불가']})),place:'시험',visitNotes:'합성 자료',photos,coverId:photos[cover%count].id,engine:{provider:'openai',model:'gpt-4o-mini'},warning:h.load('lib/photoReview.ts').PHOTO_REVIEW_WARNING};
  const post=h.load('lib/photoReviewPost.ts').photoReviewPost(review,'시험');
  const payload={id:id(1),save_request_id:crypto.randomUUID(),create:true,blog_id:'myblog',title:post.title,content:post.content,tags:[],images:post.images,photo_review:post.photoReview};
  const route=h.load('app/api/posts/route.ts'),send=(method,body)=>route[method]({url:'https://test/api/posts',json:async()=>body});
  const patch=body=>({id:id(1),save_request_id:crypto.randomUUID(),expected_revision:h.load('lib/postSaveProtocol.ts').postSaveRevision(h.db.nba_posts[0]),...body});
  return {h,objects,signed,review,post,payload,send,patch};
}
test('1–6 photos save/list/edit with original order, cover, evidence, lifetimes and prepare default',async()=>{
  for(let count=1;count<=6;count++){
    const f=fixture(count),{h}=f,result=await f.send('POST',f.payload);assert.equal(result.status,200);
    const row=h.db.nba_posts[0];assert.equal(row.research_summary.naver_publishing.execution_mode,'prepare');
    assert.deepEqual(row.images.map(image=>image.id),f.review.photos.map(photo=>photo.id));
    assert.equal(row.images.find(image=>image.type==='thumbnail').id,f.review.coverId);
    assert.equal(row.created_at,[...f.objects.values()].sort()[0]);
    row.images.forEach(image=>{assert.equal(image.url,undefined);assert.equal(Date.parse(image.expiresAt)-Date.parse(image.createdAt),30*86400000)});
    const listed=(await f.send('GET',{})).body.posts[0];assert.deepEqual(listed.photo_review,f.post.photoReview);
    assert.deepEqual(listed.images,row.images);assert.equal(listed.review.allowed,false);
    const edited=await f.send('PUT',f.patch({content:row.content+'\n수정 문장'}));assert.equal(edited.status,200);
    assert.deepEqual(row.research_summary.photo_review,f.post.photoReview);assert.equal(row.created_at,[...f.objects.values()].sort()[0]);
  }
});
test('private photo paths never become pending paid AI images',()=>{
  const f=fixture(6),rules=f.h.load('lib/draftImages.ts');assert.equal(rules.pendingDraftImages(f.post.images).length,0);
  assert.equal(rules.pendingDraftImages([{type:'body',prompt:'new',caption:'new'},...f.post.images]).length,1);
});
test('foreign/missing/expired photos fail closed before any write',async()=>{
  for(const kind of ['foreign','missing','expired']){
    const f=fixture(1),path=f.review.photos[0].storagePath;
    if(kind==='foreign'){f.payload.images[0].storagePath=path.replace(OWNER,id(999));f.payload.photo_review.photos[0].storagePath=f.payload.images[0].storagePath;}
    if(kind==='missing')f.objects.delete(path);
    if(kind==='expired')f.objects.set(path,new Date(Date.now()-31*86400000).toISOString());
    const result=await f.send('POST',f.payload);assert.equal(result.status,kind==='expired'?410:404);assert.equal(f.h.writes.length,0);
    if(kind==='foreign')assert.equal(f.signed.length,0);
  }
});
test('duplicate paths, missing cover, mismatched evidence/order, signed URL and HTML content are rejected',async()=>{
  for(const mutate of [
    p=>{p.images[0].url='https://test/signed'},p=>{p.images[1].storagePath=p.images[0].storagePath},
    p=>{p.images.forEach(image=>image.type='body')},p=>{p.images.reverse()},
    p=>{p.photo_review.paragraphs[0].evidence=['foreign-id']},p=>{p.content='<p>HTML</p>'},
    p=>{p.content+='\nblob:private'},p=>{p.photo_review.visitNotes='https://test/storage/v1/object/sign/photo'},
    p=>{p.content=p.content.replace(/^\[IMAGE INSERT[^\n]+\n/m,'')},
  ]){const f=fixture();mutate(f.payload);assert.equal((await f.send('POST',f.payload)).status,400);assert.equal(f.h.writes.length,0);}
});
test('lost creation ACK replays exactly once with unchanged original timestamps; changed evidence cannot borrow the receipt',async()=>{
  const f=fixture();assert.equal((await f.send('POST',f.payload)).status,200);const before=JSON.stringify(f.h.db.nba_posts);
  assert.equal((await f.send('POST',f.payload)).body.replayed,true);assert.equal(JSON.stringify(f.h.db.nba_posts),before);assert.equal(f.h.writes.length,1);
  assert.equal((await f.send('POST',{...f.payload,photo_review:{...f.payload.photo_review,visitNotes:'changed'}})).status,409);
});
test('initial provenance is immutable and editing the stored body invalidates the manual review',async()=>{
  const f=fixture();await f.send('POST',f.payload);const row=f.h.db.nba_posts[0],review=f.h.load('app/api/posts/[id]/review/route.ts');
  assert.equal((await review.POST({json:async()=>({confirmed:true,fingerprint:f.h.review.reviewFingerprint(row)})},f.h.context)).status,200);
  assert.equal((await f.send('PUT',f.patch({photo_review:{...f.post.photoReview,visitNotes:'replaced'},title:row.title}))).status,409);
  assert.equal((await f.send('PUT',f.patch({content:row.content+'\n編集'}))).status,200);
  assert.equal(f.h.review.getPostReview(row).state,'STALE');assert.equal((await f.send('PUT',f.patch({status:'queued'}))).status,422);
});
test('fresh private preview signatures leave saved revision/review unchanged and bridge includes every photo once',async()=>{
  const f=fixture(6);await f.send('POST',f.payload);const row=f.h.db.nba_posts[0],review=f.h.load('app/api/posts/[id]/review/route.ts');
  await review.POST({json:async()=>({confirmed:true,fingerprint:f.h.review.reviewFingerprint(row)})},f.h.context);
  const before=JSON.stringify(row),revision=f.h.load('lib/postSaveProtocol.ts').postSaveRevision(row),fp=f.h.review.reviewFingerprint(row);
  const resolved=await f.h.load('lib/privatePhotos.ts').resolvePrivatePostPhotos(f.h.admin,OWNER,row);
  const second=await f.h.load('lib/privatePhotos.ts').resolvePrivatePostPhotos(f.h.admin,OWNER,row);
  assert.notEqual(resolved.images[0].url,second.images[0].url);assert.equal(JSON.stringify(row),before);
  assert.equal(f.h.load('lib/postSaveProtocol.ts').postSaveRevision(row),revision);assert.equal(f.h.review.reviewFingerprint(row),fp);
  // Load the real adapter, bypassing only the test harness's intentional bridge stub.
  let code=fs.readFileSync(path.join(__dirname,'../src/lib/extensionBridge.ts'),'utf8');
  const js=require('typescript').transpileModule(code,{compilerOptions:{module:1,target:7}}).outputText,m={exports:{}};
  new Function('require','module','exports',js)(id=>id==='@/lib/naverPublishing'?f.h.load('lib/naverPublishing.ts'):id==='@/lib/shoppingLinks'?f.h.load('lib/shoppingLinks.ts'):{},m,m.exports);
  const bridge=m.exports.buildBridgePayload(resolved);assert.equal(bridge.executionMode,'prepare');assert.equal(bridge.assets.length,6);assert.equal(bridge.bodyImages.length,5);
  assert.equal(new Set(bridge.assets.map(asset=>asset.url)).size,6);
  assert.equal((await f.send('PUT',f.patch({status:'queued'}))).status,200);
  assert.equal(f.h.review.getPostReview(row).allowed,true);assert.equal(row.images.some(image=>image.url),false);
});

test('private drafts and provenance are excluded from the shared browser cache',()=>{
 const f=fixture(),filter=f.h.load('lib/postCache.ts').cacheablePosts;
 assert.deepEqual(filter([{id:'private',images:f.post.images},{id:'evidence',photo_review:f.review},{id:'legacy',images:[{url:'https://test/general.png'}]}]).map(row=>row.id),['legacy']);
});
