import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { searchActivity, relationshipEvidence } from '../src/lib/search/evidence.ts';
import { loadRelationshipRecords } from '../src/lib/search/relationships.ts';
import { CandidateEvidence, relationshipLabel } from '../src/components/analysis/CandidateEvidence.tsx';
import { CandidateSearch } from '../src/components/analysis/CandidateSearch.tsx';
import { parseHTML } from 'linkedom';
const now = Date.parse('2026-10-26T15:00:00Z'); // Oct 27 KST exactly.
const post = (id, postdate, blog='neighbor') => ({ link:`https://blog.naver.com/${blog}/${id}`, postdate });
const row = (state='mutual', verified_at=new Date(now-1000).toISOString()) => ({ neighbor_id:'neighbor',state,verified_at });

test('EV01 KST calendar window counts unique observed posts only, never total activity/inactivity',()=>{
 const items=[post(1,'20260927'),post(2,'20260928'),post(3,'20261027'),post(3,'20261027'),post(4,'20261028'),post(5,'20260230'),post(6,'20261027','other')];
 const before=JSON.stringify(items), result=searchActivity(items,'neighbor',now);
 assert.equal(result.windowStartDate,'2026-09-28');assert.equal(result.asOfDate,'2026-10-27');assert.equal(result.observedPostCount,3);assert.equal(result.observedRecent30DayCount,2);
 assert.equal(result.latestObservedPostDate,'2026-10-27');assert.equal(result.fullCoverage,false);assert.equal(result.inactivityConfirmed,false);assert.equal(result.activityScore,null);assert.equal(JSON.stringify(items),before);
 assert.equal(searchActivity([],'neighbor',now).inactivityConfirmed,false);
});
test('EV02 canonical URL duplicates with conflicting dates do not fabricate activity',()=>{
 const items=[post(1,'20261026'),{...post(1,'20261027'),link:'https://m.blog.naver.com/PostView.naver?blogId=neighbor&logNo=1'},post(1,'20261026'),{...post(2,'20261027'),link:'https://evil.example/neighbor/2'}];
 assert.equal(searchActivity(items,'neighbor',now).observedPostCount,0);
 assert.equal(searchActivity([post(1,'20240229')],'neighbor',now).observedPostCount,1);
});
test('EV03 missing relation is unknown; pending and removed never become mutual or non-neighbor',()=>{
 assert.equal(relationshipEvidence([],'neighbor',now).state,'unknown');
 for(const state of ['unknown','pending','mutual','removed']){const e=relationshipEvidence([row(state)],'neighbor',now);assert.equal(e.state,state);assert.equal(e.freshness,'fresh');assert.equal(e.canAutoEngage,false);}
 assert.equal(relationshipEvidence([row()],'other',now).state,'unknown');
});
test('EV04 stale/future/invalid/duplicate relationship records cannot authorize engagement',()=>{
 const stale=relationshipEvidence([row('mutual',new Date(now-300000).toISOString())],'neighbor',now);assert.equal(stale.state,'unknown');assert.equal(stale.recordedState,'mutual');assert.equal(stale.freshness,'stale');
 for(const rows of [[row('one_way')],[row('mutual','garbage')],[row('mutual',new Date(now+1).toISOString())],[row(),row()]]){const e=relationshipEvidence(rows,'neighbor',now);assert.equal(e.state,'unknown');assert.equal(e.freshness,'invalid');assert.equal(e.canAutoEngage,false);}
});
function db({accounts=[{id:'own-account'}],rows=[row()],revoke=false,errorTable}={}){
 const seen=[];let accountReads=0;
 return {seen,from(table){const filters=[];const query={select(fields){seen.push({table,fields,filters});return query;},eq(k,v){filters.push([k,v]);return query;},in(k,v){filters.push([k,v]);return query;},limit(n){filters.push(['limit',n]);return query;},then(resolve){if(table==='member_platform_accounts')accountReads++;return Promise.resolve({data:table==='member_platform_accounts'?(revoke&&accountReads>1?[]:accounts):rows,error:table===errorTable?{message:'secret'}:null}).then(resolve);}};return query;}};
}
test('EV05 service-role lookup scopes account and relation to member + exact actor, rechecks connection',async()=>{
 const client=db();assert.equal((await loadRelationshipRecords(client,'owner','myblog',['neighbor'])).length,1);
 assert.deepEqual(client.seen.map(q=>q.table),['member_platform_accounts','bnc_neighbors','member_platform_accounts']);
 for(const q of client.seen)assert.ok(q.filters.some(([k,v])=>k==='user_id'&&v==='owner'));
 const account=client.seen[0];assert.ok(account.filters.some(([k,v])=>k==='external_id'&&v==='myblog'));assert.ok(account.filters.some(([k,v])=>k==='needs_reconnect'&&v===false));
 const relation=client.seen[1];assert.ok(relation.filters.some(([k,v])=>k==='account_id'&&v==='own-account'));assert.ok(relation.filters.some(([k,v])=>k==='neighbor_id'&&v[0]==='neighbor'));
 assert.equal(JSON.stringify(client.seen).includes('access_token'),false);
});
test('EV06 disconnected/ambiguous account yields no relations; revoke during lookup discards records',async()=>{
 for(const accounts of [[],[{id:'a'},{id:'b'}]]){const client=db({accounts});assert.deepEqual(await loadRelationshipRecords(client,'owner','myblog',['neighbor']),[]);assert.equal(client.seen.length,1);}
 assert.deepEqual(await loadRelationshipRecords(db({revoke:true}),'owner','myblog',['neighbor']),[]);
 for(const errorTable of ['member_platform_accounts','bnc_neighbors'])await assert.rejects(loadRelationshipRecords(db({errorTable}),'owner','myblog',['neighbor']),e=>!e.message.includes('secret'));
});
test('EV07 empty/bounded scopes do not query arbitrary accounts or targets',async()=>{
 const client=db();assert.deepEqual(await loadRelationshipRecords(client,'owner','myblog',[]),[]);assert.equal(client.seen.length,0);
 await assert.rejects(loadRelationshipRecords(client,'owner','../other',['neighbor']));await assert.rejects(loadRelationshipRecords(client,'owner','myblog',Array(21).fill('neighbor')));assert.equal(client.seen.length,0);
});
test('EV08 UI labels retain uncertainty and expire even if server freshness says fresh',()=>{
 const e=relationshipEvidence([row()],'neighbor',now);assert.match(relationshipLabel(e,now),/서버 기록: 서로이웃/);assert.match(relationshipLabel(e,now+300000),/미확인/);
 const html=renderToStaticMarkup(React.createElement(CandidateEvidence,{activity:searchActivity([post(1,'20261027')],'neighbor',now),relationship:e}));
 assert.match(html,/최소 1개/);assert.match(html,/전체 활동량·휴면 여부를 판정하지 않습니다/);assert.match(html,/종합 점수 보류/);assert.doesNotMatch(html,/<button|<a /);
});
test('EV09 changing profile discards a delayed old search response in the mounted UI',async()=>{
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');
 const globals={window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true};const previous=new Map();
 for(const [key,value]of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const savedFetch=globalThis.fetch;let release,root,searchCalls=0;
 const pending=new Promise(resolve=>release=resolve);
 globalThis.fetch=async(url)=>{if(url==='/api/analysis')return Response.json({data:{reviewedProfile:{profile:{keywords:['캠핑']}}}});searchCalls++;return pending;};
 try{
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  const render=profileId=>root.render(React.createElement(CandidateSearch,{profileId,disabled:false,onPick:()=>true}));
  await React.act(async()=>render('profile-a'));
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='캠핑').dispatchEvent(new window.Event('click',{bubbles:true})));
  const check=document.querySelector('input[type=checkbox]');check.checked=true;
  await React.act(async()=>check.dispatchEvent(new window.Event('click',{bubbles:true})));
  await React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('후보 글 검색')).dispatchEvent(new window.Event('click',{bubbles:true})));
  assert.equal(searchCalls,1);
  await React.act(async()=>render('profile-b'));
  await React.act(async()=>{release(Response.json({data:{candidates:[{blogId:'wrong-profile-result',title:'OLD RESULT'}],fetchedCount:1}}));await new Promise(resolve=>setImmediate(resolve));});
  assert.equal(document.body.textContent.includes('OLD RESULT'),false);assert.equal(document.body.textContent.includes('wrong-profile-result'),false);assert.equal(searchCalls,1);
 }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=savedFetch;for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
