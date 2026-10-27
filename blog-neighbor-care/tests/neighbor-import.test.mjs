import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createNeighborImportHandler,normalizeNeighborSnapshot} from '../src/lib/neighbors/importApi.ts';
import {parseNeighborPage,inspectVisibleNeighbors,advanceVisibleNeighborPage} from '../extension/neighbor-extractor.mjs';
import {createNeighborImporter} from '../extension/neighbor-importer.mjs';
import {NeighborImportPanel} from '../src/components/analysis/NeighborImportPanel.tsx';
const id='11111111-1111-4111-8111-111111111111',device='22222222-2222-4222-8222-222222222222',account='33333333-3333-4333-8333-333333333333';
const url=page=>`https://admin.blog.naver.com/ManageMyBuddy.naver?blogId=owner&page=${page}`;
const snapshot=(page=1)=>({format:'naver-visible-neighbors-v1',url:url(page),listScope:'all',page,totalPages:2,totalCount:2,rows:[{blogId:`neighbor-${page}`,relation:page===1?'mutual':'one_way'}],nextUrl:page===1?url(2):null});
function api(extension=false,extra={}){const calls=[];const deps={member:async()=>({allowed:true,userId:'owner'}),user:async()=>({allowed:true,userId:'owner'}),device:async()=>({userId:'owner',deviceId:device}),rpc:async(user,op,p)=>{calls.push({user,op,p});return {data:{id,state:'capturing'},error:null};},...extra};const handler=createNeighborImportHandler(deps,extension);return {calls,handler,send:(operation,payload,headers={})=>handler(new Request('https://test.example/api/neighbors/import/'+(extension?'extension':'member'),{method:'POST',headers:{'content-type':'application/json',...(extension?{authorization:`Bearer ${'a'.repeat(64)}`}:{origin:'https://test.example'}),...headers},body:JSON.stringify({operation,payload})}))};}
test('NI01 member auth/CSRF/JSON/size deny before import access',async()=>{
 const f=api(false,{member:async()=>({allowed:false,status:401,error:'login'})});assert.equal((await f.send('directory',{account_id:account})).status,401);assert.equal(f.calls.length,0);
 const g=api();for(const [headers,status]of [[{origin:'https://evil.example'},403],[{'content-type':'text/plain'},415]])assert.equal((await g.send('runs',{account_id:account},headers)).status,status);assert.equal(g.calls.length,0);
 assert.equal((await g.send('runs',{account_id:account,huge:'x'.repeat(65536)})).status,413);
});
test('NI02 member cannot inject worker pages, identity, source state or silently confirm',async()=>{
 const f=api();for(const [op,p]of [['reserve',{id,page:1}],['page',{id,snapshot:snapshot()}],['confirm',{id,confirmed:false}],['directory',{account_id:account,userId:'victim'}],['configure',{account_id:account,ids:['neighbor'],new_posts:true,return_visits:true,confirmed:false}]])assert.equal((await f.send(op,p)).status,400);assert.equal(f.calls.length,0);
});
test('NI03 same member ownership bound server-side for confirm and target preferences',async()=>{
 const f=api();assert.equal((await f.send('confirm',{id,confirmed:true})).status,200);assert.equal(f.calls[0].user,'owner');assert.deepEqual(f.calls[0].p,{id});
 assert.equal((await f.send('configure',{account_id:account,all:true,expected_total:42,new_posts:false,return_visits:false,confirmed:true})).status,200);
 for(const patch of [{ids:['neighbor']},{expected_total:-1}])assert.equal((await f.send('configure',{account_id:account,all:true,expected_total:42,new_posts:true,return_visits:true,confirmed:true,...patch})).status,400);
});
test('NI04 extension bearer capability required; website cannot capture or confirm',async()=>{
 const f=api(true);assert.equal((await f.send('start',{id,ownerConfirmed:true},{authorization:''})).status,401);assert.equal((await f.send('start',{id,ownerConfirmed:true},{origin:'https://test.example'})).status,403);
 assert.equal((await f.send('confirm',{id,confirmed:true})).status,400);assert.equal(f.calls.length,0);
});
test('NI05 nonce is generated on server, hash only to RPC; membership rechecked before returning it',async()=>{
 const f=api(true);const response=await f.send('reserve',{id,page:1});assert.equal(response.status,200);const body=await response.json();assert.match(body.nonce,/^[a-f0-9]{64}$/);assert.notEqual(body.nonce,f.calls[0].p.nonce_hash);assert.equal(f.calls[0].p.device_id,device);
 let n=0;const g=api(true,{user:async()=>++n===1?{allowed:true,userId:'owner'}:{allowed:false,status:403,error:'stopped'}});const r=await g.send('reserve',{id,page:1});assert.equal(r.status,403);assert.equal((await r.text()).includes('nonce'),false);
});
test('NI06 snapshots accept minimal visible records only, never forged provenance/prefs/partial scopes',()=>{
 const good=snapshot();assert.equal(normalizeNeighborSnapshot(good).rows[0].relation,'mutual');
 for(const patch of [{listScope:'mutual-only'},{rows:[{blogId:'neighbor',relation:'pending'}]},{rows:[{blogId:'neighbor',relation:'mutual',verified:true}]},{rows:[{blogId:'owner',relation:'mutual'}]},{totalPages:101},{nextUrl:'https://evil.example'},{url:url(2)}])assert.throws(()=>normalizeNeighborSnapshot({...good,...patch}));
 assert.equal(parseNeighborPage('https://admin.blog.naver.com/ManageMyBuddy.naver?blogId=owner&page=1&groupId=3'),null);
});
test('NI07 disabled platform-read gate is distinct from login error and never leaks server details',async()=>{
 const f=api(true,{rpc:async()=>({data:null,error:{message:'BNC_IMPORT_READ_DISABLED private details'}})});const r=await f.send('start',{id,ownerConfirmed:true});assert.equal(r.status,409);const b=await r.json();assert.match(b.error,/허용 수단/);assert.equal(JSON.stringify(b).includes('private details'),false);
});
function html({relation='서로이웃',all=true,owner='owner',total=1,pages='1 / 1 페이지'}={}){return `<html><body><a href="https://blog.naver.com/${owner}">내 블로그</a><h1>내가 추가한 이웃</h1><button role="tab" aria-selected="true">${all?'전체':'서로이웃'}</button><p>전체 ${total}명</p><table><thead><tr><th>블로그</th><th>관계</th></tr></thead><tbody>${total?`<tr><td><a href="https://blog.naver.com/neighbor">이름</a></td><td>${relation}</td></tr>`:'<tr><td colspan="2">이웃이 없습니다</td></tr>'}</tbody></table><p>${pages}</p></body></html>`;}
function inspect(text=html(),locationUrl=url(1),hidden=false){const {document}=parseHTML(text);document.querySelectorAll('*').forEach(e=>e.getClientRects=()=>hidden?[]:[{}]);return vm.runInNewContext(`(${inspectVisibleNeighbors.toString()})('owner')`,{document,location:{href:locationUrl},URL});}
test('NI08 serialized DOM extractor recognizes explicit ordinary/mutual cells, not add-neighbor buttons',()=>{
 assert.equal(inspect().snapshot.rows[0].relation,'mutual');assert.equal(inspect(html({relation:'일반 이웃'})).snapshot.rows[0].relation,'one_way');
 assert.equal(inspect(html({relation:'이웃추가'})).ok,false);assert.equal(inspect(html({relation:'신청중'})).ok,false);
});
test('NI09 wrong account/filter/hidden table/unsupported route or missing pagination stops extraction',()=>{
 for(const r of [inspect(html({owner:'other'})),inspect(html({all:false})),inspect(html(),url(1),true),inspect(html(),'https://blog.naver.com/owner'),inspect(html({pages:''})),inspect(html()+html())])assert.equal(r.ok,false);
});
test('NI10 explicit zero directory is different from a missing or unrendered list',()=>{
 const r=inspect(html({total:0}));assert.equal(r.ok,true);assert.equal(r.snapshot.totalCount,0);assert.equal(r.snapshot.rows.length,0);
 assert.equal(inspect('<body>내가 추가한 이웃</body>').ok,false);
});
function engine(){const session={},calls=[],state={tab:{id:7,windowId:1,active:true,url:url(1),status:'complete'},focused:true,identity:{deviceId:device,blogId:'owner'},reads:0};
 const browser={storage:{session:{get:async k=>({[k]:session[k]}),set:async o=>Object.assign(session,o)}},windows:{get:async()=>({focused:state.focused})},tabs:{query:async()=>[state.tab],get:async()=>state.tab,update:async(_id,{url:next})=>{state.tab={...state.tab,url:next,status:'complete'};}},scripting:{executeScript:async()=>{state.reads++;state.during?.();return [{result:{ok:true,snapshot:snapshot(parseNeighborPage(state.tab.url).page)}}];}}};
 const post=async(op,p)=>{calls.push({op,p});if(state.fail===op)throw Error('blocked');if(op==='reserve')return {nonce:'b'.repeat(64),validUntil:new Date(100000).toISOString()};if(op==='page')return {id,state:p.snapshot.page===2?'ready':'capturing',capturedCount:p.snapshot.page,totalCount:2};return {id,state:'capturing',lastPage:0};};
 return {state,session,calls,browser,handle:createNeighborImporter(browser,post,async()=>state.identity,()=>0,async()=>{})};}
test('NI11 visible sequential import uploads only minimal staged pages and never confirms or engages',async()=>{
 const f=engine();const r=await f.handle({type:'neighbors_read',ownerConfirmed:true});assert.equal(r.state,'ready');assert.equal(f.state.reads,2);assert.equal(f.calls.filter(c=>c.op==='page').length,2);assert.equal(f.calls.some(c=>['confirm','observe','claim'].includes(c.op)),false);assert.equal(JSON.stringify(f.session).includes('neighbor-1'),false);
});
test('NI12 no consent, wrong actor or platform-denied start never reads the DOM',async()=>{
 for(const edit of [f=>{},f=>f.state.identity.blogId='other',f=>f.state.fail='start']){const f=engine();edit(f);await assert.rejects(f.handle({type:'neighbors_read',ownerConfirmed:f.state.fail||f.state.identity.blogId==='other'?true:false}));assert.equal(f.state.reads,0);}
});
test('NI13 user switches tab/window or device during extraction: captured IDs never upload',async()=>{
 for(const edit of [f=>{f.state.tab={...f.state.tab,id:8};},f=>{f.state.focused=false;},f=>{f.state.identity={...f.state.identity,deviceId:'other'};}]){const f=engine();f.state.during=()=>edit(f);await assert.rejects(f.handle({type:'neighbors_read',ownerConfirmed:true}));assert.equal(f.calls.some(c=>c.op==='page'),false);}
});
test('NI14 stop is immediate before the next DOM capture and never masquerades as server cancellation',async()=>{
 const f=engine();const stop=await f.handle({type:'neighbors_stop'});assert.equal(stop.serverCancelled,false);
 f.state.during=()=>{f.handle({type:'neighbors_stop'});};await assert.rejects(f.handle({type:'neighbors_read',ownerConfirmed:true}));assert.equal(f.state.reads,1);assert.equal(f.calls.some(c=>c.op==='page'),false);
});
test('NI15 UI makes confirmation, coverage, target defaults and no external execution explicit',()=>{
 const text=renderToStaticMarkup(React.createElement(NeighborImportPanel,{accountId:account}));assert.match(text,/허용 수단/);assert.match(text,/자동 소통 실행은 꺼져 있습니다/);assert.match(text,/가져온 목록·진행 상태 조회/);
});
function actualShape({count=43,filter='이웃전체',query='블로그명, 별명 검색',badRelation=false}={}){
 const rows=Array.from({length:count},(_,i)=>`<tr><td><input type="checkbox"></td><td>일반</td><td>${badRelation?'일반':i<17?'서로이웃':'이웃'}</td><td><a href="https://blog.naver.com/synthetic-${i}">합성 이름</a></td><td>ON</td><td>날짜</td><td>날짜</td></tr>`).join('');
 return `<html><body><h1>환경설정 &gt; 내가 추가한 이웃</h1><input type="text" placeholder="블로그명, 별명 검색" value="${query}"><p>정렬된 이웃 ${count} 명</p><table><caption>이웃관리 목록</caption><thead><tr><td><input type="checkbox"></td><th><input value="dummy"><span>그룹전체</span></th><th>${filter}</th><th>이웃</th><th>새글소식전체</th><th>최근 글</th><th>이웃추가일</th></tr></thead><tbody>${rows}</tbody></table><div>1</div></body></html>`;
}
const actualUrl='https://admin.blog.naver.com/BuddyListManage.naver?blogId=owner';
test('NI16 observed Naver table shape: checkbox column, group ordinary is NOT relationship, explicit 43 rows',()=>{
 const r=inspect(actualShape(),actualUrl);assert.equal(r.ok,true);assert.equal(r.snapshot.rows.length,43);assert.equal(r.snapshot.totalPages,1);
 assert.equal(r.snapshot.rows.filter(r=>r.relation==='mutual').length,17);assert.equal(r.snapshot.rows.filter(r=>r.relation==='one_way').length,26);
 assert.equal(normalizeNeighborSnapshot(r.snapshot).blogId,'owner');assert.equal(normalizeNeighborSnapshot(r.snapshot).totalCount,43);
});
test('NI17 observed management frame rejects active filters/search or ambiguous relation; empty group never decides state',()=>{
 for(const config of [{filter:'서로이웃'},{query:'찾는 사람'},{badRelation:true}])assert.equal(inspect(actualShape(config),actualUrl).ok,false);
 assert.equal(inspect(actualShape(),actualUrl+'&groupId=all').ok,false);
 const partial=actualShape().replace('정렬된 이웃 43 명','정렬된 이웃 100 명');assert.equal(inspect(partial,actualUrl).ok,false);
});
test('NI18 shell requires own statistics link; child route/canonical actor are server bound',()=>{
 const context=inspect('<body><a href="https://admin.blog.naver.com/owner/stat/today">내 블로그 통계</a></body>','https://admin.blog.naver.com/owner');assert.equal(context.ok,true);assert.equal(context.context.blogId,'owner');
 assert.equal(inspect('<body><a href="https://admin.blog.naver.com/other/stat/today">내 블로그 통계</a></body>','https://admin.blog.naver.com/owner').ok,false);
 assert.equal(parseNeighborPage('https://admin.blog.naver.com/owner').kind,'shell');
 assert.throws(()=>normalizeNeighborSnapshot({...snapshot(),url:'https://admin.blog.naver.com/owner'}));
});
test('NI19 shell + list frames together stage a single declared-complete page; missing parent proof prevents upload',async()=>{
 for(const proof of [true,false]){
  const f=engine();f.state.tab.url='https://admin.blog.naver.com/owner';
  f.browser.scripting.executeScript=async()=>[
   ...(proof?[{result:inspect('<body><a href="https://admin.blog.naver.com/owner/stat/today">내 블로그 통계</a></body>','https://admin.blog.naver.com/owner')}]:[]),
   {result:inspect(actualShape(),actualUrl)}];
  // Engine fixture responds ready for its second page; a one-page source uses an explicit ready receipt.
  const calls=[];const handle=createNeighborImporter(f.browser,async(op,p)=>{calls.push(op);if(op==='reserve')return {nonce:'b'.repeat(64),validUntil:new Date(100000).toISOString()};if(op==='page')return {id,state:'ready',capturedCount:43};return {id,state:'capturing',lastPage:0};},async()=>f.state.identity,()=>0);
  if(proof)assert.equal((await handle({type:'neighbors_read',ownerConfirmed:true})).capturedCount,43);
  else{await assert.rejects(handle({type:'neighbors_read',ownerConfirmed:true}));assert.equal(calls.includes('page'),false);}
 }
});
test('NI20 iframe pagination clicks only exact safe next-page anchors, never forms or script URLs',()=>{
 const current=actualUrl+'&currentPage=1',next=actualUrl+'&currentPage=2';
 const run=(href,label='2')=>{const {document}=parseHTML(`<body><a href="${href}">${label}</a><button>삭제</button></body>`);let clicked=0;document.querySelector('a').getClientRects=()=>[{}];document.querySelector('a').click=()=>clicked++;const result=vm.runInNewContext(`(${advanceVisibleNeighborPage.toString()})('owner',${JSON.stringify(current)},${JSON.stringify(next)})`,{document,location:{href:current},URL});return {result,clicked};};
 assert.equal(run(next).clicked,1);for(const href of ['javascript:deleteBuddy()','https://evil.example/?currentPage=2',actualUrl+'&currentPage=3'])assert.equal(run(href).clicked,0);
});
