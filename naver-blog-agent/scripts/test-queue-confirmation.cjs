const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function handler(file,name,environment) {
  const ast=ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let arrow;function visit(node){if(ts.isVariableDeclaration(node) && node.name.getText(ast)===name)arrow=node.initializer;ts.forEachChild(node,visit);}visit(ast);assert.ok(arrow,name);
  const code=ts.transpileModule('const actual='+arrow.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  return new Function(...Object.keys(environment),code+';return actual;')(...Object.values(environment));
}
const queue='src/app/(dashboard)/queue/page.tsx',main='src/app/(dashboard)/page.tsx';
function environment(fetch) {
  const saved=[],alerts=[],errors=[],ids=[],cache=new Map();
  const posts=[{id:'a',status:'draft'},{id:'b',status:'draft'}];
  return {saved,alerts,errors,ids,cache,env:{fetch,posts,checkedIds:['a','b'],publishVisibility:'private',visibilityLabel:'비공개',confirm:()=>true,alert:value=>alerts.push(value),savePosts:rows=>saved.push(rows),setIsBulkUpdating(){},setCheckedIds(){},
    sourceEpoch:{current:1},postIdRef:{current:null},selectedBlogId:'myblog',window:{},localStorage:{getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value)},setError:value=>errors.push(value),setCurrentPostId:value=>ids.push(value),setSavedPostCount(){},resolveSaveStatus:(_previous,current)=>current}};
}
test('single dispatch rejection never changes local status or reports registration success',async()=>{
  const h=environment(async()=>({ok:false,json:async()=>({error:'최종 원고 검수 필요'})}));
  await handler(queue,'handlePublishNow',h.env)('a');
  assert.equal(h.saved.length,0);assert.deepEqual(h.alerts,['최종 원고 검수 필요']);
});
test('bulk dispatch reports partial success and updates only accepted rows',async()=>{
  const h=environment(async(_url,init)=>{const id=JSON.parse(init.body).id;return {ok:id==='a',json:async()=>id==='a'?{post:{id:'a',status:'queued'}}:{error:'검수 필요'}};});
  await handler(queue,'handleBulkPublishNow',h.env)();
  assert.deepEqual(h.saved[0].map(row=>row.status),['queued','draft']);assert.match(h.alerts[0],/등록 1건 \/ 실패 1건/);
});
test('generation-page rejected queue save writes no false queued cache',async()=>{
  const h=environment(async()=>({ok:false,json:async()=>({error:'검수 후 변경'})}));
  const saved=await handler(main,'savePostToStorage',h.env)('a',{title:'제목',content:'본문',category:'생활',tags:[],images:[]},[],'queued');
  assert.equal(saved,false);assert.equal(h.cache.size,0);assert.deepEqual(h.errors,['검수 후 변경']);
});
test('generation-page confirmed save uses server ID and status; offline draft stays local',async()=>{
  const h=environment(async()=>({ok:true,json:async()=>({post:{id:'server-id',status:'draft'}})}));
  const payload={title:'제목',content:'본문',category:'생활',tags:[],images:[]};
  assert.equal(await handler(main,'savePostToStorage',h.env)('temporary',payload,[],'draft'),true);
  assert.deepEqual(h.ids,['server-id']);assert.equal(JSON.parse(h.cache.get('nba_saved_posts'))[0].id,'server-id');
  const offline=environment(async()=>{throw new Error('네트워크 오류');});
  assert.equal(await handler(main,'savePostToStorage',offline.env)('temporary',payload,[],'draft'),false);
  assert.equal(JSON.parse(offline.cache.get('nba_saved_posts'))[0].status,'draft');
});

function imageRules(){
  const module={exports:{}},js=ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/draftImages.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('module','exports',js)(module,module.exports);return module.exports;
}
const rules=imageRules(),UUID='00000000-0000-4000-8000-000000000001';
function imageEnvironment(fetch){
  const h=environment(fetch),persisted=[],notices=[],shown=[];
  Object.assign(h.env,rules,{result:{title:'title',content:'본문',images:rules.buildImagePlan('title','category',[{title:'first'},{title:'second'}],5)},currentPostId:UUID,imageBusy:{current:null},imagesRef:{current:[]},imageSettings:{model:'mock-model',ratio:'1:1'},setImageGenerating(){},setSingleGeneratingIndex(){},setNeedKey(){},setImagesEdited(){},setGeneratedImages:images=>shown.push(images),setImageSaveNotice:notice=>notices.push(notice),persistImages:async(id,images)=>{persisted.push({id,images:structuredClone(images)});return true;}});
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
  const h=imageEnvironment(async(_url,init)=>{sent=JSON.parse(init.body);return {ok:true,json:async()=>({post:{...sent,id:UUID}})};});
  assert.equal(await handler(main,'savePostToStorage',h.env)(UUID,{title:'title',content:'body',tags:[],images:h.env.result.images},[]),true);
  assert.deepEqual(sent.images,[]);
});
test('five-cut batch saves each success under the supplied new draft ID and preserves partial progress',async()=>{
  let calls=0;
  const h=imageEnvironment(async()=>{calls++;return {ok:calls!==3,json:async()=>calls===3?{error:'mock failure'}:{url:'https://example.com/'+calls}};});
  await handler(main,'generateImagesFor',h.env)(h.env.result,'new-server-id',1);
  assert.equal(calls,5);assert.equal(h.persisted.length,4);assert.ok(h.persisted.every(item=>item.id==='new-server-id'));
  assert.equal(h.env.imagesRef.current.length,4);assert.match(h.errors.at(-1),/1장 생성에 실패/);
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
  assert.deepEqual(sent,{id:UUID,images:[]});assert.equal(h.cache.size,0);assert.match(h.notices.at(-1),/이미지 저장 실패/);
});
test('generation automatically starts images with the returned server ID instead of the previous render ID',async()=>{
  const result={title:'new',content:'body',tags:[],category:'category',images:rules.buildImagePlan('new','category',[],3)};
  const h=imageEnvironment(async()=>({ok:true,json:async()=>({saved:true,postId:UUID,result})})),starts=[];
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
