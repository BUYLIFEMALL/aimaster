import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createNeighborHandler} from '../src/lib/neighbors/api.ts';
import {neighborStore} from '../src/lib/neighbors/store.ts';
import {NeighborRecords} from '../src/components/analysis/NeighborRecords.tsx';
import {parseHTML} from 'linkedom';
const accountId='c0ffee00-1111-4111-8111-000000000001', otherId='c0ffee00-1111-4111-8111-000000000002';
const account={id:accountId,blogId:'myblog'}, now=Date.parse('2026-10-27T00:00:00Z');
const row=(i=1)=>({neighbor_id:`n${String(i).padStart(3,'0')}`,state:'mutual',verified_at:'2026-10-26T23:59:59Z'});
const req=(input={operation:'list',accountId},headers={})=>new Request('https://example.test/api/neighbors',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json',...headers},body:typeof input==='string'?input:JSON.stringify(input)});
function fixture(extra={}){
 const calls=[];const store={accounts:async user=>{calls.push(['accounts',user]);return [account];},account:async(user,id)=>{calls.push(['account',user,id]);return id===accountId?account:null;},rows:async(user,id,cursor)=>{calls.push(['rows',user,id,cursor]);return [row()];},...extra.store};
 return {calls,handle:createNeighborHandler(extra.member|| (async()=>({allowed:true,userId:'owner'})),store,()=>now)};
}
test('NB01 unauthenticated/denied accesses no store, keys, AI or Naver',async()=>{
 for(const status of [401,403]){const f=fixture({member:async()=>({allowed:false,status,error:'blocked'})});assert.equal((await f.handle(req())).status,status);assert.equal(f.calls.length,0);}
});
test('NB02 own records include freshness/provenance and no auto-engagement authorization',async()=>{
 const f=fixture(),r=await f.handle(req());assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);const {data}=await r.json();
 assert.equal(data.records[0].relationship.state,'mutual');assert.equal(data.naverListImported,false);assert.equal(data.canAutoEngage,false);assert.equal(data.scope,'stored-records-only');assert.equal(data.externalActions,0);
 assert.ok(f.calls.every(call=>call[1]==='owner'));assert.deepEqual(f.calls.filter(call=>call[0]==='rows')[0],['rows','owner',accountId,null]);
});
test('NB03 foreign/disconnected account fails before reading records',async()=>{
 const f=fixture();assert.equal((await f.handle(req({operation:'list',accountId:otherId}))).status,404);assert.ok(f.calls.every(c=>c[0]!=='rows'));
});
test('NB04 strict operation/origin/content/size prevents worker and identity injection',async()=>{
 const f=fixture();for(const [request,status]of [[req({operation:'observe',accountId}),400],[req({operation:'list',accountId,userId:'victim'}),400],[req({operation:'list',accountId,cursor:'../other'}),400],[req('{'),400],[req({operation:'accounts',accountId}),400],[req({}, {origin:'https://evil.example'}),403],[req({}, {'content-type':'text/plain'}),415],[req('x'.repeat(4097)),413]])assert.equal((await f.handle(request)).status,status);
 assert.equal(f.calls.length,0);assert.equal((await f.handle(new Request('https://example.test/api/neighbors'))).status,405);
});
test('NB05 keyset pagination returns 50 rows and cursor without implying complete Naver inventory',async()=>{
 let cursor;const f=fixture({store:{rows:async(user,id,c)=>{cursor=c;return Array.from({length:51},(_,i)=>row(i+1));}}});
 const {data}=await(await f.handle(req({operation:'list',accountId,cursor:'n000'}))).json();assert.equal(cursor,'n000');assert.equal(data.records.length,50);assert.equal(data.nextCursor,'n050');assert.equal(data.naverListImported,false);
});
test('NB06 member or connection changes during lookup discard records',async()=>{
 let reads=0;const switched=fixture({member:async()=>({allowed:true,userId:++reads>1?'other':'owner'})});assert.equal((await switched.handle(req())).status,403);
 let accountReads=0;const removed=fixture({store:{account:async()=>++accountReads===1?account:null}});assert.equal((await removed.handle(req())).status,409);
});
test('NB07 missing records stay unknown; stale mutual does not become a current relationship',async()=>{
 const f=fixture({store:{rows:async()=>[{...row(),verified_at:'2026-10-26T00:00:00Z'}]}});const {data}=await(await f.handle(req())).json();assert.equal(data.records[0].relationship.state,'unknown');assert.equal(data.records[0].relationship.recordedState,'mutual');
 const empty=fixture({store:{rows:async()=>[]}});const j=await(await empty.handle(req())).json();assert.deepEqual(j.data.records,[]);assert.equal(j.data.naverListImported,false);
});
test('NB08 accounts are member scoped and account secrets/store exceptions are never returned',async()=>{
 const f=fixture();const {data}=await(await f.handle(req({operation:'accounts'}))).json();assert.deepEqual(data.accounts,[account]);assert.equal(f.calls[0][1],'owner');
 const failed=fixture({store:{rows:async()=>{throw Error('service_role_secret');}}});const r=await failed.handle(req());assert.equal(r.status,503);assert.equal((await r.text()).includes('service_role_secret'),false);
});
test('NB09 actual store queries bind owner/account and use a bounded ordered cursor without tokens',async()=>{
 const seen=[];const client={from(table){const q={table,filters:[]};seen.push(q);const chain={select(fields){q.fields=fields;return chain;},eq(k,v){q.filters.push([k,v]);return chain;},gt(k,v){q.filters.push(['gt',k,v]);return chain;},order(k){q.order=k;return chain;},limit(v){q.limit=v;return chain;},maybeSingle(){return Promise.resolve({data:{id:accountId,external_id:'myblog'},error:null});},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve);}};return chain;}};
 const store=neighborStore(client);await store.accounts('owner');await store.account('owner',accountId);await store.rows('owner',accountId,'n001');
 for(const q of seen){assert.ok(q.filters.some(([k,v])=>k==='user_id'&&v==='owner'));assert.equal(q.fields.includes('token'),false);}
 const records=seen.at(-1);assert.equal(records.limit,51);assert.equal(records.order,'neighbor_id');assert.ok(records.filters.some(x=>x[0]==='account_id'&&x[1]===accountId));assert.ok(records.filters.some(x=>x[0]==='gt'&&x[2]==='n001'));
});
test('NB10 UI distinguishes stored rows from importing Naver neighbors and performs no call during SSR',()=>{
 const html=renderToStaticMarkup(React.createElement(NeighborRecords));assert.match(html,/가져온 이웃 목록과 서버 관계 기록을 구분합니다/);assert.match(html,/AI 분석이나 네이버 접속을 실행하지 않습니다/);assert.match(html,/관계 기록 조회/);
});
test('NB11 changing actor account in mounted UI discards delayed previous account rows',async()=>{
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');
 const globals={window,self:window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true};const previous=new Map();
 for(const [key,value]of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const original=globalThis.fetch;let root,release,reads=0;const pending=new Promise(resolve=>release=resolve);
 const relation={state:'unknown',recordedState:null,observedAt:null,freshness:'missing',source:'none',canAutoEngage:false};
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/neighbors');const body=JSON.parse(options.body);if(body.operation==='accounts')return Response.json({data:{accounts:[account,{id:otherId,blogId:'my-second-blog'}]}});reads++;if(body.accountId===accountId)return pending;return Response.json({data:{account:{id:otherId,blogId:'my-second-blog'},records:[{blogId:'second-account-neighbor',relationship:relation}],nextCursor:null}});};
 try{
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  await React.act(async()=>root.render(React.createElement(NeighborRecords)));
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('관계 기록 조회')).dispatchEvent(new window.Event('click',{bubbles:true})));
  assert.equal(reads,1);
  const select=document.querySelector('select');Object.defineProperty(select,'value',{value:otherId,configurable:true,writable:true});
  await React.act(async()=>select.dispatchEvent(new window.Event('change',{bubbles:true})));
  await React.act(async()=>{release(Response.json({data:{account,records:[{blogId:'old-account-private-record',relationship:relation}],nextCursor:null}}));await new Promise(resolve=>setImmediate(resolve));});
  assert.equal(document.body.textContent.includes('old-account-private-record'),false);
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('관계 기록 조회')).dispatchEvent(new window.Event('click',{bubbles:true})));
  assert.match(document.body.textContent,/second-account-neighbor/);assert.equal(reads,2);
 }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
