const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const shared=fs.readFileSync(path.join(__dirname,'test-post-review.cjs'),'utf8').split("test('manual review")[0];
const harness=new Function('require','__dirname',shared+';return harness;')(require,__dirname)();
const {PostSaveClient,mergeSavedPosts}=harness.load('lib/postSaveClient.ts');
function handler(file,name,environment) {
  const ast=ts.createSourceFile(file,(process.env.NBA_QUEUE_BASELINE&&file==='src/app/(dashboard)/queue/page.tsx')?require('node:child_process').execFileSync('git',['show',process.env.NBA_QUEUE_BASELINE+':naver-blog-agent/'+file],{encoding:'utf8'}):fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let arrow;function visit(node){if(ts.isVariableDeclaration(node) && node.name.getText(ast)===name)arrow=node.initializer;ts.forEachChild(node,visit);}visit(ast);assert.ok(arrow,name);
  const code=ts.transpileModule('const actual='+arrow.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  return new Function(...Object.keys(environment),code+';return actual;')(...Object.values(environment));
}
const queue='src/app/(dashboard)/queue/page.tsx',main='src/app/(dashboard)/page.tsx';
function environment(fetch) {
  const saved=[],alerts=[],errors=[],ids=[],cache=new Map();
  const posts=[{id:'a',status:'draft',save_revision:'a-base'},{id:'b',status:'draft',save_revision:'b-base'}];
  const savers=new Map();
  const writePost=async(post,fields)=>{if(!savers.has(post.id))savers.set(post.id,new PostSaveClient(post,false,fetch));return savers.get(post.id).save(fields);};
  const mergePosts=(rows,removed=[])=>saved.push(mergeSavedPosts(posts,rows,removed));
  return {saved,alerts,errors,ids,cache,env:{useCallback:fn=>fn,listEpoch:{current:0},fetch,posts,writePost,mergePosts,PostSaveClient:class extends PostSaveClient{constructor(post,create=false){super(post,create,fetch);}},mergeSavedPosts,postSaveRef:{current:null},checkedIds:['a','b'],publishVisibility:'private',visibilityLabel:'비공개',confirm:()=>true,alert:value=>alerts.push(value),savePosts:rows=>saved.push(rows),setIsBulkUpdating(){},setCheckedIds(){},
    sourceEpoch:{current:1},postIdRef:{current:null},selectedBlogId:'myblog',window:{},localStorage:{getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value)},setError:value=>errors.push(value),setCurrentPostId:value=>ids.push(value),setSavedPostCount(){},setSaveRevision(){},resolveSaveStatus:(_previous,current)=>current}};
}
test('single dispatch rejection never changes local status or reports registration success',async()=>{
  const h=environment(async()=>({ok:false,json:async()=>({error:'최종 원고 검수 필요'})}));
  await handler(queue,'handlePublishNow',h.env)('a');
  assert.equal(h.saved.length,0);assert.deepEqual(h.alerts,['최종 원고 검수 필요']);
});
test('bulk dispatch reports partial success and updates only accepted rows',async()=>{
  const h=environment(async(_url,init)=>{const id=JSON.parse(init.body).id;return {ok:id==='a',json:async()=>id==='a'?{success:true,post:{id:'a',status:'queued',save_revision:'a-saved'}}:{error:'검수 필요'}};});
  await handler(queue,'handleBulkPublishNow',h.env)();
  assert.deepEqual(h.saved[0].map(row=>row.status),['queued','draft']);assert.match(h.alerts[0],/등록 1건 \/ 실패 1건/);
});
test('generation-page rejected queue save writes no false queued cache',async()=>{
  const h=environment(async()=>({ok:false,json:async()=>({error:'검수 후 변경'})}));
  const saved=await handler(main,'savePostToStorage',h.env)('a',{title:'제목',content:'본문',category:'생활',tags:[],images:[]},[],'queued');
  assert.equal(saved,false);assert.equal(h.cache.size,0);assert.deepEqual(h.errors,['검수 후 변경']);
});
test('generation-page confirmed save retains its UUID and status; offline drafts have a separate cache',async()=>{
  const h=environment(async()=>({ok:true,json:async()=>({success:true,post:{id:UUID,status:'draft',save_revision:'saved'}})}));
  const payload={title:'제목',content:'본문',category:'생활',tags:[],images:[]};
  assert.equal(await handler(main,'savePostToStorage',h.env)(UUID,payload,[],'draft'),true);
  assert.deepEqual(h.ids,[UUID]);assert.equal(JSON.parse(h.cache.get('nba_saved_posts'))[0].id,UUID);
  const offline=environment(async()=>{throw new Error('네트워크 오류');});
  assert.equal(await handler(main,'savePostToStorage',offline.env)(UUID,payload,[],'draft'),false);
  assert.equal(offline.cache.has('nba_saved_posts'),false);assert.equal(JSON.parse(offline.cache.get('nba_unsaved_post_'+UUID)).status,'draft');
});

function imageRules(){
  const module={exports:{}},js=ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/draftImages.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('module','exports',js)(module,module.exports);return module.exports;
}
const rules=imageRules(),UUID='00000000-0000-4000-8000-000000000001';
function imageEnvironment(fetch){
  const h=environment(fetch),persisted=[],notices=[],shown=[];
  h.env.postSaveRef.current=new PostSaveClient({id:UUID,save_revision:'image-base'},false,fetch);
  Object.assign(h.env,rules,{result:{title:'title',content:'본문',images:rules.buildImagePlan('title','category',[{title:'first'},{title:'second'}],5)},currentPostId:UUID,imageBusy:{current:null},imagesRef:{current:[]},imageSettings:{model:'mock-model',ratio:'1:1'},setImageGenerating(){},setSingleGeneratingIndex(){},setNeedKey(){},setImagesEdited(){},setGeneratedImages:images=>shown.push(images),setImageSaveNotice:notice=>notices.push(notice),persistImages:async(id,images)=>{persisted.push({id,images:structuredClone(images)});return true;}});
  h.env.setResult=update=>{h.env.result=typeof update==='function'?update(h.env.result):update;};
  return {...h,persisted,notices,shown};
}
test('selected 1-5 image plans are distinct, with exact body slots and unchanged facts/source lines',()=>{
  const original='[SECTION - first]\n가격 100원 https://example.com/source\n\n[IMAGE INSERT - old]\n[SECTION - second]\n기존 본문';
  for(const count of [1,2,3,4,5]){
    const plan=rules.buildImagePlan('title','category',[{title:'first'},{title:'second'}],count);
    assert.equal(plan.length,count);assert.equal(new Set(plan.map(image=>image.prompt)).size,count);
    assert.ok(plan.every(image=>image.prompt.includes('Korean (East Asian)')));
    const article=rules.placePlannedImages(original,plan);
    assert.equal((article.match(/\[IMAGE INSERT/g)||[]).length,count-1);
    assert.equal(article.split('\n').filter(line=>!line.startsWith('[IMAGE INSERT')).join('\n'),original.split('\n').filter(line=>!line.startsWith('[IMAGE INSERT')).join('\n'));
  }
});
test('missing cover never shifts body slots; regenerating a cut replaces it without duplicates',()=>{
  const plans=rules.buildImagePlan('title','category',[],3),first={...plans[1],url:'https://example.com/one'},second={...plans[2],url:'https://example.com/two'};
  assert.equal(rules.bodyImageAt([first,second],0),first);assert.equal(rules.bodyImageAt([first,second],1),second);
  const merged=rules.mergeDraftImage([second,first],{...first,url:'https://example.com/new'},plans);
  assert.deepEqual(merged.map(image=>image.url),['https://example.com/new','https://example.com/two']);
  assert.deepEqual(rules.draftImageList([],plans,true),[]);
  const article='<p>본문 100원</p><img src="https://example.com/one"><img src="https://example.com/two">';
  assert.equal(rules.removeImageFromArticle(article,first.url),'<p>본문 100원</p><img src="https://example.com/two">');
});
test('last-image deletion remains empty when saving instead of resurrecting planned prompts',async()=>{
  let sent;
  const h=imageEnvironment(async(_url,init)=>{sent=JSON.parse(init.body);return {ok:true,json:async()=>({success:true,post:{...sent,id:UUID,save_revision:'saved'}})};});
  assert.equal(await handler(main,'savePostToStorage',h.env)(UUID,{title:'title',content:'body',tags:[],images:h.env.result.images},[]),true);
  assert.deepEqual(sent.images,[]);
});
test('five-cut batch saves each success under the supplied new draft ID and preserves partial progress',async()=>{
  let calls=0;
  const h=imageEnvironment(async()=>{calls++;return {ok:calls!==3,json:async()=>calls===3?{error:'mock failure'}:{url:'https://example.com/'+calls}};});
  await handler(main,'generateImagesFor',h.env)(h.env.result,UUID,1);
  assert.equal(calls,5);assert.equal(h.persisted.length,4);assert.ok(h.persisted.every(item=>item.id===UUID));
  assert.equal(h.env.imagesRef.current.length,5);assert.equal(h.env.imagesRef.current.filter(image=>image.url).length,4);assert.match(h.errors.at(-1),/1장 생성에 실패/);
});
test('partial image save retains all five plans so a refreshed draft can retry only the missing cut',async()=>{
  let calls=0;
  const h=imageEnvironment(async()=>{calls++;return {ok:calls!==3,json:async()=>calls===3?{error:'provider quota'}:{url:'https://example.com/'+calls}};});
  h.env.setResult=update=>{h.env.result=typeof update==='function'?update(h.env.result):update;};
  await handler(main,'generateImagesFor',h.env)(h.env.result,UUID,1);
  const saved=h.persisted.at(-1).images;
  assert.equal(saved.length,5);assert.equal(saved.filter(image=>image.url).length,4);
  const restored=imageEnvironment(async()=>({ok:true,json:async()=>({url:'https://example.com/recovered'})}));
  restored.env.result.images=saved;restored.env.imagesRef.current=structuredClone(saved);
  restored.env.setResult=update=>{restored.env.result=typeof update==='function'?update(restored.env.result):update;};
  await handler(main,'generateImagesFor',restored.env)(restored.env.result,UUID,1);
  assert.equal(restored.persisted.length,1);assert.equal(restored.persisted[0].images.length,5);
  assert.equal(restored.persisted[0].images.filter(image=>image.url).length,5);
  assert.deepEqual(restored.persisted[0].images.map(image=>image.caption),saved.map(image=>image.caption));
});
test('unconfirmed or conflicted image saves block another paid request until saving or reopening',async()=>{
  let calls=0;const h=imageEnvironment(async()=>{calls++;return {ok:true,json:async()=>({url:'https://example.com/unwanted'})};});
  h.env.postSaveRef.current.pending={};
  await handler(main,'generateImagesFor',h.env)(h.env.result,UUID,1);
  await handler(main,'handleGenerateSingleImage',h.env)(0,h.env.result.images[0]);
  assert.equal(calls,0);assert.equal(h.persisted.length,0);
  h.env.postSaveRef.current.pending=null;h.env.postSaveRef.current.conflict=true;
  await handler(main,'handleGenerateSingleImage',h.env)(0,h.env.result.images[0]);assert.equal(calls,0);
});
test('deleting a completed cut removes its plan but preserves pending cuts through saving and reload',async()=>{
  const h=imageEnvironment(async()=>{throw Error('must not generate');});
  const plans=h.env.result.images;
  h.env.imagesRef.current=plans.map((image,index)=>index===3?{...image,url:'https://example.com/body-3'}:image);
  await handler(main,'handleRemoveGeneratedImage',h.env)(0);
  assert.equal(h.persisted[0].images.length,4);assert.ok(h.persisted[0].images.every(image=>image.caption!==plans[3].caption));
  assert.deepEqual(h.env.result.images,h.persisted[0].images);assert.equal(h.shown.at(-1).length,0);
});
test('image batch stops at a rejected save before another paid request and leaves all plans in memory',async()=>{
  let calls=0;const h=imageEnvironment(async()=>{calls++;return {ok:true,json:async()=>({url:'https://example.com/first'})};});
  h.env.persistImages=async()=>false;
  await handler(main,'generateImagesFor',h.env)(h.env.result,UUID,1);
  assert.equal(calls,1);assert.equal(h.env.imagesRef.current.length,5);assert.equal(h.shown.at(-1).length,1);
});
test('1-5 cuts survive real save/list/load callbacks and keep extension asset count and order',async()=>{
  for(const count of [1,2,3,4,5]){
    const db=new Function('require','__dirname',shared+';return harness;')(require,__dirname)();
    const row=db.seed(),route=db.load('app/api/posts/route.ts'),plan=rules.buildImagePlan('title','category',[{title:'first'},{title:'second'}],count);
    row.images=plan;row.content=rules.placePlannedImages('[SECTION - first]\n本文 one\n\n[SECTION - second]\n本文 two\n\nend',plan);
    let imageCalls=0;
    const transport=async(url,init)=>{
      if(url==='/api/generate-image'){imageCalls++;return {ok:true,json:async()=>({url:'https://example.com/cut-'+imageCalls})};}
      const response=await route[init.method]({json:async()=>JSON.parse(init.body)});
      return {ok:response.status===200,status:response.status,json:async()=>response.body};
    };
    const h=imageEnvironment(transport);h.env.result.images=plan;h.env.imagesRef.current=plan;
    h.env.postSaveRef.current=new PostSaveClient(db.load('lib/postSaveProtocol.ts').savedPost(row),false,transport);
    h.env.persistImages=handler(main,'persistImages',h.env);
    await handler(main,'generateImagesFor',h.env)(h.env.result,UUID,1);
    assert.equal(imageCalls,count);assert.equal(row.images.length,count);assert.equal(row.images.filter(image=>image.url).length,count);
    assert.deepEqual(db.writes.filter(write=>write.table==='nba_posts').map(write=>write.patch.images.length),Array(count).fill(count));
    const listed=(await route.GET({url:'https://test/api/posts'})).body.posts[0];
    Object.assign(h.env,{setLoading(){},setSelectedBlogId(){},setIsHistoryModalOpen(){},setTimeout(){}});
    handler(main,'handleLoadSavedPost',h.env)(listed);
    assert.equal(h.shown.at(-1).length,count);assert.deepEqual(h.env.imagesRef.current,row.images);
    const payload=db.load('lib/extensionBridge.ts').buildBridgePayload(row);
    assert.equal(payload.assets.length,count);assert.equal(payload.bodyImages.length,count-1);
    assert.deepEqual(payload.assets.map(asset=>asset.url),row.images.map(image=>image.url));
  }
});
test('late image response after switching drafts cannot write or continue paid generation',async()=>{
  let resolve,calls=0;
  const h=imageEnvironment(()=>{calls++;return new Promise(r=>{resolve=r;});});
  const run=handler(main,'generateImagesFor',h.env)(h.env.result,UUID,1);
  h.env.sourceEpoch.current=2;
  resolve({ok:true,json:async()=>({url:'https://example.com/old'})});await run;
  assert.equal(calls,1);assert.equal(h.persisted.length,0);assert.equal(h.shown.length,0);
});
test('single generation replaces the same cut and deleting it immediately persists an empty list',async()=>{
  const h=imageEnvironment(async()=>({ok:true,json:async()=>({url:'https://example.com/new'})}));
  const item=h.env.result.images[1];h.env.imagesRef.current=[{...item,url:'https://example.com/old'}];
  await handler(main,'handleGenerateSingleImage',h.env)(1,item);
  assert.equal(h.env.imagesRef.current.length,1);assert.equal(h.persisted[0].images[0].url,'https://example.com/new');
  await handler(main,'handleRemoveGeneratedImage',h.env)(0);
  assert.deepEqual(h.persisted[1].images,[]);
});
test('image persistence sends only ID/images and reports rejected ACK without false saved cache',async()=>{
  let sent;
  const h=imageEnvironment(async(_url,init)=>{sent=JSON.parse(init.body);return {ok:false,json:async()=>({error:'입력 중 변경 거절'})};});
  assert.equal(await handler(main,'persistImages',h.env)(UUID,[],1),false);
  assert.equal(sent.id,UUID);assert.deepEqual(sent.images,[]);assert.ok(sent.save_request_id);assert.equal(sent.expected_revision,'image-base');assert.equal(Object.keys(sent).filter(key=>!['id','images','save_request_id','expected_revision'].includes(key)).length,0);assert.equal(h.cache.size,0);assert.match(h.notices.at(-1),/이미지 저장 실패/);
});
test('generation automatically starts images with the returned server ID instead of the previous render ID',async()=>{
  const result={title:'new',content:'body',tags:[],category:'category',images:rules.buildImagePlan('new','category',[],3)};
  const h=imageEnvironment(async()=>({ok:true,json:async()=>({saved:true,postId:UUID,post:{id:UUID,save_revision:'generated'},result})})),starts=[];
  Object.assign(h.env,{preferencesLoaded:true,setLoading(){},setResult(){},setPreferencesNotice(){},setSavedPostCount(){},cleanCurrentYear:value=>value || '',writingStyle:'default',targetCharCount:2000,engine:{provider:'openai'},selectedViral:null,document:{},setTimeout(){},generateImagesFor:async(...args)=>starts.push(args),savePostToStorage:async()=>{throw Error('duplicate save');}});
  h.env.currentPostId='old-server-id';h.env.postIdRef.current='old-server-id';
  await handler(main,'executeGeneration',h.env)({overrideCategory:'category'});
  assert.equal(starts.length,1);assert.equal(starts[0][1],UUID);
});
test('rejected editor save preserves the queue row and editor buffer; modal closes only after successful ACK',async()=>{
  const h=environment(async()=>({ok:false,json:async()=>({error:'대기 중 원고 수정 불가'})}));
  let closes=0;Object.assign(h.env,{editingPost:{id:UUID},setEditingPost:()=>closes++});
  assert.equal(await handler(queue,'handleSaveEditor',h.env)({title:'edit',content:'body',tags:[]}),false);
  assert.equal(h.saved.length,0);assert.equal(closes,0);
  const modal='src/components/BlogSmartEditorModal.tsx';
  const base={saving:false,title:'edit',editorMode:'code',codeContent:'body',htmlContent:'',excerpt:'',tags:[],category:'category',setSaving(){},onClose:()=>closes++,alert(){}};
  await handler(modal,'handleSave',{...base,onSave:async()=>false})();assert.equal(closes,0);
  await handler(modal,'handleSave',{...base,onSave:async()=>true})();assert.equal(closes,1);
});

test('running post delete rejection keeps local row; bulk deletion updates only accepted IDs',async()=>{
  const h=environment(async()=>({ok:false,json:async()=>({error:'입력 중 삭제 불가'})}));
  Object.assign(h.env,{viewingDetailPost:null,setViewingDetailPost(){}});
  await handler(queue,'handleDelete',h.env)('a');assert.equal(h.saved.length,0);assert.match(h.alerts[0],/입력 중/);
  const bulk=environment(async url=>({ok:url.includes('id=a'),json:async()=>url.includes('id=a')?{success:true}:{error:'입력 중'}}));
  Object.assign(bulk.env,{viewingDetailPost:null,setViewingDetailPost(){}});
  await handler(queue,'handleBulkDelete',bulk.env)();assert.deepEqual(bulk.saved[0].map(post=>post.id),['b']);assert.match(bulk.alerts[0],/삭제 1건 \/ 실패 1건/);
});
test('server empty queue never resurrects old cached tasks during refresh',async()=>{
  const h=environment(async()=>({ok:true,json:async()=>({posts:[]})}));let shown;
  h.cache.set('nba_saved_posts',JSON.stringify([{id:'stale',status:'publishing'}]));
  Object.assign(h.env,{setIsLoading(){},setPosts:posts=>shown=posts});
  await handler(queue,'fetchPosts',h.env)();assert.deepEqual(shown,[]);assert.deepEqual(JSON.parse(h.cache.get('nba_saved_posts')),[]);
});

test('late list response cannot replace a newer member save ACK',async()=>{
  let resolve,shown=0;
  const h=environment(()=>new Promise(done=>resolve=done));
  Object.assign(h.env,{setIsLoading(){},setPosts:()=>shown++});
  const fetchList=handler(queue,'fetchPosts',h.env);const pending=fetchList(true);
  h.env.listEpoch.current++;resolve({ok:true,json:async()=>({posts:[{id:'a',status:'draft'}]})});
  await pending;assert.equal(shown,0);assert.equal(h.cache.size,0);
});


function effect(file,marker,environment){
  const ast=ts.createSourceFile(file,(process.env.NBA_QUEUE_BASELINE&&file==='src/app/(dashboard)/queue/page.tsx')?require('node:child_process').execFileSync('git',['show',process.env.NBA_QUEUE_BASELINE+':naver-blog-agent/'+file],{encoding:'utf8'}):fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let callback;function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes(marker))callback=node.arguments[0];ts.forEachChild(node,visit);}visit(ast);assert.ok(callback,marker);
  const code=ts.transpileModule('const actual='+callback.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  return new Function(...Object.keys(environment),code+';return actual;')(...Object.values(environment));
}
test('an older open queue editor cannot borrow the newer saver revision from another action',async()=>{
  const shared=new Function('require','__dirname',fs.readFileSync(path.join(__dirname,'test-post-review.cjs'),'utf8').split("test('manual review")[0]+';return harness;')(require,__dirname)();
  const row=shared.seed(),route=shared.load('app/api/posts/route.ts'),{savedPost}=shared.load('lib/postSaveProtocol.ts');
  const transport=async(_url,init)=>{const response=await route[init.method]({json:async()=>JSON.parse(init.body)});return {ok:response.status===200,status:response.status,json:async()=>response.body};};
  const env={savers:{current:new Map()},PostSaveClient:class extends PostSaveClient{constructor(post){super(post,false,transport);}}};
  const write=handler(queue,'writePost',env),old=savedPost(structuredClone(row));
  await write(old,{tags:['new tags']});const before=JSON.stringify(row);
  await assert.rejects(()=>write(old,{content:'stale modal'}),/변경/);assert.equal(JSON.stringify(row),before);
});
test('open editor buffer survives parent refresh and reinitializes only after close and reopen',()=>{
  const initialized={current:false},values=[];
  const env={initialized,isOpen:true,initialTitle:'first',initialExcerpt:'excerpt',initialTags:['tag'],initialCategory:'category',initialContent:'first body',generatedImages:[],convertTextToEditorHtml:value=>value};
  for(const name of ['setTitle','setExcerpt','setTags','setCategory','setCodeContent','setHtmlContent'])env[name]=value=>values.push([name,value]);
  const file='src/components/BlogSmartEditorModal.tsx';effect(file,'initialized.current',env)();assert.equal(values.length,6);
  env.initialContent='refreshed body';effect(file,'initialized.current',env)();assert.equal(values.length,6);
  env.isOpen=false;effect(file,'initialized.current',env)();env.isOpen=true;effect(file,'initialized.current',env)();assert.deepEqual(values.at(-1),['setHtmlContent','refreshed body']);
});
test('settings follow a clean same-page save but preserve dirty settings after the source changes',()=>{
  const previousRevision={current:'old'},errors=[],reloads=[];
  const env={previousRevision,saveRevision:'new',saver:{current:{revision:'old'}},dirty:true,pendingTag:false,busy:null,setError:value=>errors.push(value),setReload:update=>reloads.push(update(0))};
  const file='src/components/NaverPublishSettings.tsx';effect(file,'previousRevision.current',env)();assert.equal(errors.length,1);assert.equal(reloads.length,0);
  env.dirty=false;env.saveRevision='newer';effect(file,'previousRevision.current',env)();assert.deepEqual(reloads,[1]);
  env.saver.current.revision='own-ack';env.saveRevision='own-ack';env.busy='save';effect(file,'previousRevision.current',env)();assert.equal(errors.length,1);assert.equal(reloads.length,1);
});

test('unconfirmed generation fallback save does not start paid images',async()=>{
  const result={title:'new',content:'body',tags:[],category:'category',images:rules.buildImagePlan('new','category',[],3)};
  const h=imageEnvironment(async()=>({ok:true,json:async()=>({saved:false,result})})),starts=[];
  Object.assign(h.env,{preferencesLoaded:true,setLoading(){},setResult(){},setPreferencesNotice(){},setSavedPostCount(){},cleanCurrentYear:value=>value||'',writingStyle:'default',targetCharCount:2000,engine:{provider:'openai'},selectedViral:null,document:{},setTimeout(){},generateImagesFor:async(...args)=>starts.push(args),savePostToStorage:async()=>false});
  await handler(main,'executeGeneration',h.env)({overrideCategory:'category'});assert.equal(starts.length,0);
});

function queueWriter(lose=0){
  const h=new Function('require','__dirname',shared+';return harness;')(require,__dirname)(),row=h.seed(),route=h.load('app/api/posts/route.ts');let losses=lose;
  const transport=async(_url,init)=>{const response=await route[init.method]({json:async()=>JSON.parse(init.body)});if(response.status===200&&losses-->0)throw Error('lost response');return {ok:response.status===200,status:response.status,json:async()=>response.body};};
  let opened;const env={savers:{current:new Map()},PostSaveClient:class extends PostSaveClient{constructor(post){super(post,false,transport);}},setEditingPost:post=>opened=post};
  return {h,row,env,write:handler(queue,'writePost',env),get opened(){return opened;},public:()=>h.load('lib/postSaveProtocol.ts').savedPost(structuredClone(row))};
}
test('known conflict clears uncertainty; reopening the latest queue row permits a safe new save',async()=>{
  const q=queueWriter(),old=q.public();q.row.title='another tab';
  await assert.rejects(()=>q.write(old,{content:'old buffer'}),/변경/);assert.equal(q.env.savers.current.get(UUID).pending,null);
  const latest=q.public();handler(queue,'openEditor',q.env)(latest);assert.equal(q.opened.save_revision,latest.save_revision);
  assert.equal((await q.write(latest,{content:'compared new buffer'})).content,'compared new buffer');
});
test('a fresh queue read after lost ACK confirms the exact pending write before new edits',async()=>{
  const q=queueWriter(1),old=q.public();await assert.rejects(()=>q.write(old,{content:'first buffer'}),/lost response/);
  const latest=q.public();assert.equal((await q.write(latest,{content:'new buffer'})).content,'new buffer');assert.equal(q.h.writes.filter(w=>w.hits===1).length,2);
});
test('reopening an unchanged editable revision after metadata CAS conflict resets only the explicit editor',async()=>{
  const q=queueWriter(),old=q.public();q.h.race(row=>row.updated_at='2026-10-11T02:00:00Z');
  await assert.rejects(()=>q.write(old,{content:'buffer'}),/변경/);assert.equal(q.public().save_revision,old.save_revision);
  await assert.rejects(()=>q.write(old,{content:'buffer'}),/변경/);
  handler(queue,'openEditor',q.env)(q.public());assert.equal((await q.write(q.opened,{content:'buffer'})).content,'buffer');
});
