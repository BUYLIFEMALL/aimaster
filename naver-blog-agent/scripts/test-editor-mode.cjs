const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../src');
function extract(file,names){const source=fs.readFileSync(path.join(root,file),'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),found={};
  function walk(node){if((ts.isVariableDeclaration(node)||ts.isFunctionDeclaration(node))&&node.name&&names.includes(node.name.text))found[node.name.text]=ts.isVariableDeclaration(node)?'const '+node.getText(ast)+';':node.getText(ast);ts.forEachChild(node,walk)}walk(ast);
  return names.map(name=>{assert.ok(found[name],'real source declaration '+name);return ts.transpileModule(found[name],{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText}).join('\n');}
function modeHarness(dirty=true,privateMode=false){const file='components/BlogSmartEditorModal.tsx';const source=extract(file,['convertTextToEditorHtml','switchToCode','switchToVisual','handleVisualChange']);
  return new Function('initialDirty','privateMode',`let editorMode=privateMode?'code':'visual',codeContent='original text\\n[IMAGE INSERT - body]',htmlContent='<h1>edited</h1><p><a href="https://example.com">link</a></p><img src="https://example.com/a.png" alt="caption"><img src="https://example.com/b.png" alt="second">';
    const privatePhotos=privateMode,generatedImages=[],visualChanged={current:initialDirty};
    const setEditorMode=v=>editorMode=v,setCodeContent=v=>codeContent=v,setHtmlContent=v=>htmlContent=v;
    ${source}
    return {toCode:switchToCode,toVisual:switchToVisual,read:()=>({editorMode,codeContent,htmlContent}),editCode:v=>{codeContent=v},editVisual:handleVisualChange};`)(dirty,privateMode);}
test('visual edits survive code switch with headings, links, caption and image order intact',()=>{
  const h=modeHarness();const original=h.read().htmlContent;h.toCode();assert.equal(h.read().codeContent,original);assert.equal(h.read().editorMode,'code');
  h.toVisual();assert.equal(h.read().htmlContent,original);h.toCode();assert.equal(h.read().codeContent,original);
});
test('switching modes without visual edits preserves original text and image markers',()=>{
  const h=modeHarness(false),original=h.read().codeContent;h.toCode();assert.equal(h.read().codeContent,original);h.toVisual();h.toCode();assert.equal(h.read().codeContent,original);
});
test('later code and visual edits always continue the latest member buffer',()=>{
  const h=modeHarness();h.toCode();h.editCode('<h2>code edit</h2><p>body</p>');h.toVisual();assert.match(h.read().htmlContent,/code edit/);
  h.editVisual('<h2>latest visual</h2><img src="https://example.com/second.png">');h.toCode();assert.match(h.read().codeContent,/latest visual/);assert.doesNotMatch(h.read().codeContent,/code edit/);
});
function generationHarness(withImages,saved=true){
  const source=extract('app/(dashboard)/page.tsx',['executeGeneration']),events=[],errors=[];
  const noop=()=>{},postId='00000000-0000-4000-8000-000000000001',result={title:'fixture',content:'synthetic',category:'생활',tags:[],images:[{type:'thumbnail',prompt:'synthetic',caption:'fixture'}]};
  const context={imageBusy:{current:null},preferencesLoaded:true,sourceEpoch:{current:0},postIdRef:{current:null},imagesRef:{current:[]},setImagesEdited:noop,setImageSaveNotice:noop,setLoading:noop,setError:e=>{if(e)errors.push(e)},setNeedKey:noop,setResult:noop,setGeneratedImages:noop,
    selectedBlogId:'myblog',imageSettings:{count:1},cleanCurrentYear:v=>v||'',writingStyle:'default',articleFormat:'standard',selectedViral:null,shoppingLinksInput:'',targetCharCount:1000,engine:{provider:'openai',model:'gpt-4o-mini'},
    fetch:async(url,options)=>{events.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({success:true,result,postId,post:{id:postId,save_revision:'revision'},saved})}},
    crypto:{randomUUID:()=>postId},postSaveRef:{current:null},PostSaveClient:class{},setSaveRevision:noop,setCurrentPostId:noop,savePostToStorage:async()=>{events.push({fallbackSave:true});return saved},
    localStorage:{getItem:()=> '[]',setItem:()=>events.push({cacheAck:true})},mergeSavedPosts:(_a,b)=>b,cacheablePosts:v=>v,setSavedPostCount:noop,setViralCandidates:noop,setSelectedViral:noop,setTimeout:noop,
    generateImagesFor:async()=>events.push({imageGeneration:true}),autoGenerateImages:withImages};
  const run=new Function(...Object.keys(context),source+';return executeGeneration;')(...Object.values(context));return {events,errors,run:()=>run({overrideCategory:'생활',overrideTopic:'synthetic',overrideTone:'해요체'})};
}
test('text-only run still generates/saves the draft but sends no image generation request',async()=>{
  const h=generationHarness(false);await h.run();assert.deepEqual(h.errors,[]);assert.equal(h.events.filter(e=>e.url==='/api/generate').length,1);assert.ok(h.events.some(e=>e.cacheAck));assert.equal(h.events.filter(e=>e.imageGeneration).length,0);
});
test('default image-enabled run retains the existing post-save image path',async()=>{
  const h=generationHarness(true);await h.run();assert.deepEqual(h.errors,[]);assert.equal(h.events.filter(e=>e.imageGeneration).length,1);assert.ok(h.events.findIndex(e=>e.cacheAck)<h.events.findIndex(e=>e.imageGeneration));
});
test('unconfirmed draft save never starts images even when the option is on',async()=>{
  const h=generationHarness(true,false);await h.run();assert.deepEqual(h.errors,[]);assert.ok(h.events.some(e=>e.fallbackSave));assert.equal(h.events.filter(e=>e.imageGeneration).length,0);
});

test('private photo drafts retain code-only editing and original markers',()=>{const h=modeHarness(false,true),before=h.read();h.toVisual();assert.equal(h.read().editorMode,'code');assert.equal(h.read().codeContent,before.codeContent);});
