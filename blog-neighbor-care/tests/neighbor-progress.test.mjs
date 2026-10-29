import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeighborImporter} from '../extension/neighbor-importer.mjs';
import {createReaderController} from '../extension/background.mjs';
import {inspectNeighborVisibility} from '../extension/neighbor-extractor.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const url='https://admin.blog.naver.com/BuddyListManage.naver?blogId=owner';
function fixture({focused=true,popup=false,failProgress=false,previousState='capturing'}={}){
 const session={},events=[],calls=[],state={focused,popup,reads:0,visible:false};
 const who={deviceId:'own-device',blogId:'owner'},tab={id:7,windowId:2,url,active:true,status:'complete'};
 const snapshot={format:'naver-visible-neighbors-v1',url,listScope:'all',page:1,totalPages:1,totalCount:1,rows:[{blogId:'private-neighbor',relation:'mutual'}],nextUrl:null};
 const browser={storage:{session:{get:async key=>({[key]:session[key]}),set:async value=>Object.assign(session,value)}},tabs:{query:async()=>[tab]},windows:{get:async()=>({focused:state.focused})},scripting:{executeScript:async({func})=>{if(func===inspectNeighborVisibility)return [{result:{url,visible:state.visible}}];state.reads++;return [{result:{ok:true,snapshot}}];}}};
 const post=async(op)=>{calls.push(op);if(op==='status')return {id:'old-run',state:previousState,capturedCount:1,totalCount:1,totalPages:1,lastPage:1};if(op==='reserve')return {nonce:'a'.repeat(64),validUntil:new Date(100000).toISOString()};if(op==='page')return {id:'own-run',state:'ready',capturedCount:1,totalCount:1,totalPages:1,lastPage:1};return {id:'own-run',state:'capturing',lastPage:0};};
 const report=async value=>{events.push(value);if(failProgress)throw Error('status storage unavailable');};
 const read=createNeighborImporter(browser,post,async()=>who,()=>0,async()=>{},report,async windowId=>windowId===2&&state.popup);
 return {read,state,events,calls,session,tab,browser};
}
test('NP01 focused own extension popup can validate focus when its parent window reports unfocused',async()=>{
 const f=fixture({focused:false,popup:true});assert.equal((await f.read({type:'neighbors_read',ownerConfirmed:true})).state,'ready');assert.equal(f.state.reads,1);
});
test('NP02 no focused window/popup or verified visible selected tab stops before list capture',async()=>{
 const f=fixture({focused:false});await assert.rejects(f.read({type:'neighbors_read',ownerConfirmed:true}),/읽기/);assert.equal(f.state.reads,0);assert.equal(f.events.at(-1)?.stage,'failed');assert.equal(f.events.at(-1)?.capturedCount,0);
});
test('NP03 stages report server-confirmed counts and temporary receipt without leaking list rows or nonce',async()=>{
 const f=fixture();await f.read({type:'neighbors_read',ownerConfirmed:true});
 for(const stage of ['checking','starting','reserving','reading','sending','ready'])assert.ok(f.events.some(e=>e.stage===stage),stage);
 assert.equal(f.events.find(e=>e.stage==='sending').capturedCount,0);assert.equal(f.events.at(-1).capturedCount,1);assert.equal(f.events.at(-1).state,'complete');
 assert.doesNotMatch(JSON.stringify(f.events),/private-neighbor|"(?:nonce|rows|token)"/);assert.equal(f.calls.includes('confirm'),false);
});
test('NP04 a failed progress display cannot retry or prevent a successful receipt',async()=>{
 const f=fixture({failProgress:true});assert.equal((await f.read({type:'neighbors_read',ownerConfirmed:true})).state,'ready');assert.equal(f.calls.filter(c=>c==='page').length,1);
});
test('NP05 a focused popup cannot authorize reading a changed tab',async()=>{
 const f=fixture({focused:false,popup:true});let queries=0;f.browser.tabs.query=async()=>[{...f.tab,id:++queries===1?7:8}];await assert.rejects(f.read({type:'neighbors_read',ownerConfirmed:true}),/활성 탭/);assert.equal(f.state.reads,0);
});
test('NP06 a minimized parent window is not authorized by a popup reply',async()=>{
 const f=fixture({focused:false,popup:true});f.browser.windows.get=async()=>({focused:false,state:'minimized'});await assert.rejects(f.read({type:'neighbors_read',ownerConfirmed:true}),/최소화/);assert.equal(f.state.reads,0);
});
function popup(){
 const {document}=parseHTML(fs.readFileSync(new URL('../extension/popup.html',import.meta.url),'utf8'));
 const state={focused:true,visible:true},listeners=[];document.hasFocus=()=>state.focused;Object.defineProperty(document,'visibilityState',{get:()=>state.visible?'visible':'hidden'});
 const chrome={runtime:{id:'fixture',getURL:p=>`chrome-extension://fixture/${p}`,getManifest:()=>({version_name:'v1.02'}),sendMessage:async()=>({ok:true,data:{connected:true,deviceId:'own-device',blogId:'owner'}}),onMessage:{addListener:f=>listeners.push(f)}},windows:{getCurrent:async()=>({id:2})}};
 const context=vm.createContext({document,chrome,console});vm.runInContext(fs.readFileSync(new URL('../extension/popup.mjs',import.meta.url),'utf8'),context);
 return {document,state,listeners,chrome,render:p=>vm.runInContext(`renderNeighborProgress(${JSON.stringify(p)})`,context)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('NP07 popup distinguishes running, received-but-unsaved, confirmed and stopped states',async()=>{
 const f=popup();await tick();
 f.render({stage:'sending',state:'running',capturedCount:0,totalCount:43,totalPages:1,lastPage:0,message:'서버 전송 중'});
 assert.match(f.document.getElementById('status-heading').textContent,/진행 중/);assert.match(f.document.getElementById('neighborCounts').textContent,/받은 0 \/ 43명/);assert.equal(f.document.getElementById('neighborRead').disabled,true);
 f.render({stage:'ready',state:'complete',capturedCount:43,totalCount:43,totalPages:1,lastPage:1});
 assert.match(f.document.getElementById('status-heading').textContent,/수신 완료.*저장 전/);assert.equal(f.document.getElementById('neighborFinish').hidden,false);assert.match(f.document.getElementById('neighborCounts').textContent,/43 \/ 43명/);
 f.render({stage:'confirmed',state:'complete',capturedCount:43,totalCount:43});assert.match(f.document.getElementById('status-heading').textContent,/저장 완료/);
 f.render({stage:'failed',state:'stopped',capturedCount:0,message:'활성 상태 확인 실패'});assert.match(f.document.getElementById('message').textContent,/활성 상태/);assert.equal(f.document.getElementById('neighborFinish').hidden,true);assert.equal(f.document.getElementById('neighborRead').disabled,false);
});
test('NP08 only a trusted background focus probe receives current popup visibility and matching window',async()=>{
 const f=popup();await tick();const listener=f.listeners[0],sender={id:'fixture',url:'chrome-extension://fixture/background.mjs'};
 const probe=windowId=>new Promise(resolve=>listener({type:'neighbor_focus_probe',windowId},sender,resolve));
 assert.equal((await probe(2)).focused,true);assert.equal((await probe(3)).focused,false);f.state.focused=false;assert.equal((await probe(2)).focused,false);f.state.focused=true;f.state.visible=false;assert.equal((await probe(2)).focused,false);
 let replied=false;assert.equal(listener({type:'neighbor_focus_probe',windowId:2},{...sender,tab:{id:7}},()=>{replied=true;}),false);assert.equal(replied,false);
});
test('NP09 progress from another device or a content script cannot replace the current popup result',async()=>{
 const f=popup();await tick();const listener=f.listeners[0],sender={id:'fixture',url:'chrome-extension://fixture/background.mjs'};
 const message={type:'neighbor_progress',progress:{deviceId:'own-device',stage:'ready',state:'complete',capturedCount:43,totalCount:43}};
 listener({...message,progress:{...message.progress,deviceId:'other'}},sender,()=>{});assert.doesNotMatch(f.document.getElementById('status-heading').textContent,/수신 완료/);
 listener(message,{...sender,tab:{id:7}},()=>{});assert.doesNotMatch(f.document.getElementById('status-heading').textContent,/수신 완료/);
 listener(message,sender,()=>{});assert.match(f.document.getElementById('status-heading').textContent,/수신 완료/);
});
function controller({device='own-device',storedDevice=device,focusWindow=2,receiptState='expired',statusFails=false}={}){
 const local={token:'a'.repeat(64)},session={neighborProgress:{deviceId:storedDevice,stage:'reading',state:'running',capturedCount:1,totalCount:2}},events=[],calls=[];
 const storage=data=>({setAccessLevel:async()=>{},get:async key=>({[key]:data[key]}),set:async values=>Object.assign(data,values),remove:async key=>{delete data[key];}});
 const browser={runtime:{id:'fixture',getURL:p=>`chrome-extension://fixture/${p}`,sendMessage:async value=>{events.push(value);return value.type==='neighbor_focus_probe'?{windowId:focusWindow,focused:true}:undefined;}},storage:{local:storage(local),session:storage(session)},tabs:{query:async()=>[{id:7,windowId:2,url,active:true}]},windows:{get:async()=>({focused:false})},scripting:{executeScript:async()=>[{result:{ok:true,snapshot:{format:'naver-visible-neighbors-v1',url,listScope:'all',page:1,totalPages:1,totalCount:1,rows:[{blogId:'private-neighbor',relation:'mutual'}],nextUrl:null}}}]}};
 const fetcher=async(_url,request)=>{const {operation,payload}=JSON.parse(request.body);calls.push(operation);if(operation==='whoami')return Response.json({data:{deviceId:device,blogId:'owner'}});if(operation==='status'){if(statusFails)return Response.json({error:'unavailable'},{status:503});return Response.json({data:{id:payload.id,state:receiptState,capturedCount:43,totalCount:43,lastPage:1,totalPages:1}});}if(operation==='reserve')return Response.json({data:{validUntil:new Date(Date.now()+60000).toISOString()},nonce:'b'.repeat(64)});if(operation==='page')return Response.json({data:{id:payload.id,state:'ready',capturedCount:1,totalCount:1,lastPage:1,totalPages:1}});return Response.json({data:{id:payload.id,state:'capturing',lastPage:0}});};
 return {handle:createReaderController(browser,fetcher),sender:{id:'fixture',url:'chrome-extension://fixture/popup.html'},session,events,calls};
}
test('NP10 worker restart restores unfinished progress as needing verification, never falsely running',async()=>{
 const f=controller(),r=await f.handle({type:'status'},f.sender);assert.equal(r.neighborProgress.stage,'paused');assert.equal(r.neighborProgress.capturedCount,1);
 const other=controller({storedDevice:'other'});assert.equal((await other.handle({type:'status'},other.sender)).neighborProgress,undefined);
});
test('NP11 controller validates the popup window and persists only receipt progress',async()=>{
 const f=controller();delete f.session.neighborProgress;const result=await f.handle({type:'neighbors_read',ownerConfirmed:true},f.sender);assert.equal(result.state,'ready');assert.equal(f.session.neighborProgress.stage,'ready');assert.equal(f.session.neighborProgress.focusCheck.ownPopupFocused,true);assert.doesNotMatch(JSON.stringify(f.session.neighborProgress),/private-neighbor|"(?:nonce|rows|token)"/);
 const wrong=controller({focusWindow:3});await assert.rejects(wrong.handle({type:'neighbors_read',ownerConfirmed:true},wrong.sender),/화면에 보이는지/);assert.equal(wrong.calls.includes('reserve'),false);
});
test('NP12 a completed in-flight page is not overwritten by the stop-button response',async()=>{
 const f=popup();await tick();f.render({stage:'reading',state:'running',capturedCount:0});
 f.chrome.runtime.sendMessage=async()=>{f.listeners[0]({type:'neighbor_progress',progress:{deviceId:'own-device',stage:'ready',state:'complete',capturedCount:1,totalCount:1,lastPage:1,totalPages:1}},{id:'fixture',url:'chrome-extension://fixture/background.mjs'},()=>{});return {ok:true,data:{stopped:true}};};
 f.document.getElementById('neighborStop').dispatchEvent(new f.document.defaultView.Event('click'));await tick();assert.match(f.document.getElementById('status-heading').textContent,/수신 완료/);
});
test('NP13 an interrupted second page preserves the acknowledged first-page count',async()=>{
 const f=fixture(),events=[];f.browser.scripting.executeScript=async()=>[{result:{ok:true,snapshot:{format:'naver-visible-neighbors-v1',url,listScope:'all',page:1,totalPages:2,totalCount:2,rows:[{blogId:'first-private',relation:'mutual'}],nextUrl:url+'&currentPage=2'}}}];
 const post=async op=>{if(op==='reserve')return {nonce:'a'.repeat(64),validUntil:new Date(100000).toISOString()};if(op==='page'){f.state.focused=false;return {id:'run',state:'capturing',capturedCount:1,totalCount:2,totalPages:2,lastPage:1};}return {id:'run',state:'capturing',lastPage:0};};
 const read=createNeighborImporter(f.browser,post,async()=>({deviceId:'own-device',blogId:'owner'}),()=>0,async()=>{},async p=>events.push(p));
 await assert.rejects(read({type:'neighbors_read',ownerConfirmed:true}),/화면에 보이는지/);assert.equal(events.at(-1).stage,'failed');assert.equal(events.at(-1).capturedCount,1);assert.equal(events.at(-1).lastPage,1);assert.doesNotMatch(JSON.stringify(events),/first-private/);
});

test('NP14 reopening the popup refreshes expired ready receipts instead of blocking a fresh read',async()=>{
 const f=controller();f.session.neighborImport={id:'old-run',deviceId:'own-device'};f.session.neighborProgress={deviceId:'own-device',stage:'ready',state:'complete',capturedCount:43};
 const result=await f.handle({type:'status'},f.sender);assert.equal(result.neighborProgress.stage,'paused');assert.equal(result.neighborProgress.state,'stopped');assert.equal(result.neighborProgress.capturedCount,43);assert.match(result.neighborProgress.message,/기한/);assert.equal(f.calls.includes('start'),false);assert.equal(f.calls.includes('confirm'),false);
 const ui=popup();await tick();ui.render(result.neighborProgress);assert.equal(ui.document.getElementById('neighborRead').disabled,false);assert.equal(ui.document.getElementById('neighborFinish').hidden,true);
});
test('NP15 reopening the popup reflects web confirmation rather than stale unsaved receipt',async()=>{
 const f=controller({receiptState:'confirmed'});f.session.neighborImport={id:'saved-run',deviceId:'own-device'};f.session.neighborProgress={deviceId:'own-device',stage:'ready',state:'complete'};
 assert.equal((await f.handle({type:'status'},f.sender)).neighborProgress.stage,'confirmed');assert.equal(f.calls.includes('confirm'),false);
});
test('NP16 failed receipt refresh never presents cached ready as current or exposes another device',async()=>{
 const f=controller({statusFails:true});f.session.neighborImport={id:'old-run',deviceId:'own-device'};f.session.neighborProgress={deviceId:'own-device',stage:'ready',state:'complete',capturedCount:43};
 const r=await f.handle({type:'status'},f.sender);assert.equal(r.neighborProgress.stage,'paused');assert.match(r.neighborProgress.message,/확인하지 못/);assert.equal(f.calls.includes('start'),false);
 const other=controller();other.session.neighborImport={id:'other-run',deviceId:'other'};await other.handle({type:'status'},other.sender);assert.equal(other.calls.includes('status'),false);
});
test('NP17 own neighbor-page status prioritizes the consent and read controls without capturing or sending a list',async()=>{
 const f=controller(),result=await f.handle({type:'status'},f.sender);assert.equal(result.pageKind,'neighbors');assert.equal(f.calls.includes('start'),false);assert.equal(f.calls.includes('reserve'),false);
 const ui=popup();await tick();ui.chrome.runtime.sendMessage=async()=>({ok:true,data:{connected:true,deviceId:'own-device',blogId:'owner',pageKind:'neighbors'}});
 ui.document.getElementById('receipt').dispatchEvent(new ui.document.defaultView.Event('click'));await tick();
 // Run the real initialization with a neighbor-page response in a separate VM.
 const {document}=parseHTML(fs.readFileSync(new URL('../extension/popup.html',import.meta.url),'utf8'));
 const chrome={...ui.chrome,runtime:{...ui.chrome.runtime,onMessage:{addListener:()=>{}}}};
 vm.runInContext(fs.readFileSync(new URL('../extension/popup.mjs',import.meta.url),'utf8'),vm.createContext({document,chrome,console}));await tick();
 const status=document.querySelector('.status-card');assert.equal(status.nextElementSibling.id,'neighborSection');
 assert.ok(document.getElementById('neighborSection').innerHTML.indexOf('id="neighborRead"')<document.getElementById('neighborSection').innerHTML.indexOf('<p>'));
});
test('NP18 loss of keyboard focus does not stop an explicitly visible selected own tab',async()=>{
 const f=fixture({focused:false,popup:false});f.state.visible=true;assert.equal((await f.read({type:'neighbors_read',ownerConfirmed:true})).state,'ready');assert.equal(f.state.reads,1);assert.equal(f.events.at(-1).focusCheck.visibleSelectedTab,true);assert.equal(f.calls.includes('confirm'),false);
});
test('NP19 visibility fallback cannot authorize a different tab, URL or minimized window',async()=>{
 for(const change of [f=>{let n=0;f.browser.tabs.query=async()=>[{...f.tab,id:++n===1?7:8}];},f=>{f.browser.scripting.executeScript=async()=>[{result:{visible:true,url:'https://other.invalid'}}];},f=>{f.browser.windows.get=async()=>({focused:false,state:'minimized'});}]){
  const f=fixture({focused:false});f.state.visible=true;change(f);await assert.rejects(f.read({type:'neighbors_read',ownerConfirmed:true}));assert.equal(f.state.reads,0);assert.equal(f.calls.includes('page'),false);
 }
});
test('NP20 serialized visibility probe requires a visible non-hidden exact URL and exposes no list content',()=>{
 for(const [visibilityState,hidden,expected]of [['visible',false,true],['hidden',true,false],['visible',true,false],[undefined,false,false]]){
  const r=vm.runInNewContext(`(${inspectNeighborVisibility.toString()})(${JSON.stringify(url)})`,{location:{href:url},document:{visibilityState,hidden}});assert.equal(r.visible,expected);assert.deepEqual(Object.keys(r).sort(),['url','visible']);
 }
});

test('NP21 a confirmed import remains a receipt unless a new read is explicitly requested',async()=>{
 const f=fixture({previousState:'confirmed'});f.session.neighborImport={id:'old-run',deviceId:'own-device'};
 assert.equal((await f.read({type:'neighbors_read',ownerConfirmed:true})).state,'confirmed');assert.equal(f.state.reads,0);assert.equal(f.calls.includes('start'),false);
 assert.equal((await f.read({type:'neighbors_read',ownerConfirmed:true,restartConfirmed:true})).state,'ready');
 assert.equal(f.calls.filter(c=>c==='start').length,1);assert.equal(f.calls.filter(c=>c==='reserve').length,1);assert.equal(f.state.reads,1);assert.notEqual(f.session.neighborImport.id,'old-run');assert.equal(f.calls.includes('confirm'),false);
});

test('NP22 a stale restart request cannot replace ready, capturing or unknown server state',async()=>{
 for(const state of ['ready','capturing','expired','cancelled']){
  const f=fixture({previousState:state});f.session.neighborImport={id:'old-run',deviceId:'own-device'};
  await assert.rejects(f.read({type:'neighbors_read',ownerConfirmed:true,restartConfirmed:true}),/다시 확인/);assert.equal(f.calls.includes('start'),false);assert.equal(f.calls.includes('reserve'),false);assert.equal(f.state.reads,0);assert.equal(f.session.neighborImport.id,'old-run');
 }
 const f=fixture({previousState:'confirmed'});f.session.neighborImport={id:'old-run',deviceId:'own-device'};
 await assert.rejects(f.read({type:'neighbors_read',ownerConfirmed:false,restartConfirmed:true}),/동의/);assert.equal(f.calls.length,0);
});

test('NP23 confirmed popup clears old consent and offers an explicit fresh read; ready still stays locked',async()=>{
 const f=popup();await tick();const consent=f.document.getElementById('neighborConfirm'),button=f.document.getElementById('neighborRead');consent.checked=true;
 f.render({stage:'confirmed',state:'complete',capturedCount:43,totalCount:43});
 assert.equal(consent.checked,false);assert.equal(button.disabled,false);assert.match(button.textContent,/다시 읽기/);
 const messages=[];f.chrome.runtime.sendMessage=async message=>{messages.push(message);return {ok:true,data:{state:'ready',capturedCount:43,totalCount:43,totalPages:1,lastPage:1}};};
 button.click();await tick();assert.equal(messages.length,0);assert.match(f.document.getElementById('message').textContent,/동의/);
 consent.checked=true;button.click();await tick();assert.equal(messages.length,1);assert.equal(messages[0].type,'neighbors_read');assert.equal(messages[0].ownerConfirmed,true);assert.equal(messages[0].restartConfirmed,true);assert.equal(button.disabled,true);
});
