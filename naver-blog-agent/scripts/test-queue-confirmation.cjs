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
    selectedBlogId:'myblog',window:{},localStorage:{getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value)},setError:value=>errors.push(value),setCurrentPostId:value=>ids.push(value),setSavedPostCount(){},resolveSaveStatus:(_previous,current)=>current}};
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
