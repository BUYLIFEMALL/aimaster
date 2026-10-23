const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=process.argv[2]
  ? require('node:child_process').execFileSync('git',['show',process.argv[2]+':naver-blog-agent/extension/editor.js'],{encoding:'utf8'})
  : fs.readFileSync(path.join(__dirname,'../extension/editor.js'),'utf8');
// Run the real editor command. A minimal screen lets us distinguish a library
// panel from a real alert without typing or publishing in a member's browser.
async function focus(popups=[],library=false,args={},replaceOnWait=false){
  const clicks=[];
  const title={id:'title',tagName:'P',isContentEditable:true,getClientRects:()=>[{}],
    getBoundingClientRect:()=>({left:0,top:0,width:100,height:20}),querySelectorAll:()=>[],
    scrollIntoView(){},matches:()=>false,closest:()=>null,querySelector:()=>null,focus(){document.activeElement=title;},
    dispatchEvent:event=>{clicks.push(event.type);return true;}};
  const document={activeElement:null,body:{innerText:''},getElementById:()=>title,
    createRange:()=>({selectNodeContents(){},collapse(){}}),
    querySelectorAll:selector=>selector.includes('.se-title-text')?[title]
      :selector==='.se-popup-container'?popups
      :selector==='.se-popup-container,[role="dialog"][aria-modal="true"]'?[...popups,...(library?[{getClientRects:()=>[{}]}]:[])]
      :selector.includes('[role="dialog"]')&&library?[{getClientRects:()=>[{}]}]:[]};
  title.ownerDocument=document;
  const sandbox={document,window:{},console,URL,Promise,setTimeout:fn=>{if(replaceOnWait)sandbox.__nbaExecutionRun="new-run";fn();},
    chrome:{runtime:{sendMessage:async()=>{if(replaceOnWait)sandbox.__nbaExecutionRun='new-run';return {ok:true};}}},
    getComputedStyle:el=>({visibility:el.hidden?'hidden':'visible'}),
    getSelection:()=>({removeAllRanges(){},addRange(){}}),MouseEvent:class{constructor(type){this.type=type;}}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return {result:await sandbox.editorCommand('preflightTitle',args),clicks};
}
function popup({title='',message='',hidden=false,rects=[{}]}={}){
  return {hidden,getClientRects:()=>rects,querySelector:selector=>{
    if(selector.includes(', '))return title||message?{textContent:title||message}:null;
    if(selector==='.se-popup-title')return title?{textContent:title}:null;
    if(selector==='.se-popup-alert-text')return message?{textContent:message}:null;
    return null;
  }};
}
test('image library role=dialog allows focus instead of blocking the next input',async()=>{
  const {result,clicks}=await focus([],true);assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(clicks,['mousedown','mouseup','click']);
});
test('a visible resume popup still blocks before any selection event',async()=>{
  const {result,clicks}=await focus([popup({title:'작성 중인 글이 있습니다.'})]);assert.equal(result.ok,false);assert.match(result.error,/팝업이 열려 있습니다.*작성 중인 글이 있습니다/);assert.deepEqual(clicks,[]);
});
test('an alert containing only a message blocks and includes its diagnostic label',async()=>{
  const {result,clicks}=await focus([popup({message:'계속 작성할까요?'})]);assert.equal(result.ok,false);assert.match(result.error,/계속 작성할까요/);assert.deepEqual(clicks,[]);
});
test('hidden and unlabeled containers do not block a fresh empty editor',async()=>{
  for(const options of [{title:'숨겨짐',hidden:true},{title:'숨겨짐',rects:[]},{}]){
    const {result}=await focus([popup(options)]);assert.equal(result.ok,true,JSON.stringify(result));
  }
});

test('an injected command whose lease expired stops before any DOM selection',async()=>{
  const {result,clicks}=await focus([],false,{runId:'old-run',executionUntil:Date.now()-1});
  assert.equal(result.ok,false);assert.match(result.error,/실행 연결이 만료/);assert.deepEqual(clicks,[]);
});
test('a delayed injected operation cannot continue after a newer run takes the same frame',async()=>{
  const {result}=await focus([],false,{runId:'old-run',executionUntil:Date.now()+180000},true);
  assert.equal(result.ok,false);assert.match(result.error,/새 실행으로 바뀌어/);
});

async function hiddenImageAi({count=1,disconnect=false,expire=false}={}){
  let now=1000, waits=0, pageTimers=0, clicks=0;
  const images=Array.from({length:count},(_,i)=>{
    let selected=false,openedAt=null;
    const toggle={classList:{contains:()=>selected},click(){selected=true;clicks++;}};
    return {id:'image-'+i,scrollIntoView(){},querySelector(selector){
      if(selector==='img')return {click(){openedAt=waits;}};
      // Model the toolbar appearing asynchronously, after two waits.
      return openedAt!==null && waits-openedAt>=2?toggle:null;
    }};
  });
  const title={getClientRects:()=>[{}]};
  const document={body:{innerText:''},getElementById:id=>images.find(image=>image.id===id),
    querySelectorAll:selector=>selector.includes('.se-title-text')?[title]:selector.startsWith('.se-component.se-image')?images:[]};
  const sandbox={document,window:{},console,URL,Promise,Date:{now:()=>now},
    getComputedStyle:()=>({visibility:'visible'}),
    setTimeout(fn){pageTimers++;waits++;now+=60000;fn();},
    chrome:{runtime:{sendMessage:async message=>{
      if(disconnect)throw new Error('Extension context invalidated.');
      waits++;now+=expire?180000:message.delayMs;
      return {ok:true};
    }}}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  const result=await sandbox.editorCommand('imageAi',{runId:'current',executionUntil:166000});
  return {result,clicks,pageTimers,now};
}
test('hidden-page minute timer batching does not expire the one-image AI check',async()=>{
  const r=await hiddenImageAi();assert.equal(r.result.ok,true,JSON.stringify(r.result));
  assert.equal(r.clicks,1);assert.equal(r.pageTimers,0);assert.ok(r.now<166000);
});
test('five hidden images finish AI marking without chained page timers',async()=>{
  const r=await hiddenImageAi({count:5});assert.equal(r.result.ok,true,JSON.stringify(r.result));
  assert.equal(r.clicks,5);assert.equal(r.pageTimers,0);
});
test('worker disconnect stops before AI marking and never falls back to page timers',async()=>{
  const r=await hiddenImageAi({disconnect:true});assert.equal(r.result.ok,false);
  assert.match(r.result.error,/context invalidated/);assert.equal(r.clicks,0);assert.equal(r.pageTimers,0);
});
test('a lease that expires during a worker wait still stops before AI marking',async()=>{
  const r=await hiddenImageAi({expire:true});assert.equal(r.result.ok,false);
  assert.match(r.result.error,/실행 연결이 만료/);assert.equal(r.clicks,0);assert.equal(r.pageTimers,0);
});
