import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {parseHTML} from 'linkedom';
import {WorkRecords} from '../src/components/analysis/WorkRecords.tsx';
test('RQ09 displayed acceptance expires and status lookup failure preserves the work list without inventing acceptance',async()=>{
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>'),previous=new Map();
 for(const [key,value]of Object.entries({window,self:window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true})){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const original=globalThis.fetch,calls=[];let root,mode='fresh';
 globalThis.fetch=async(_url,options)=>{
  const {operation}=JSON.parse(options.body);calls.push(operation);
  if(operation==='list')return Response.json({data:[{id:'own-request',kind:'request',state:'succeeded',neighbor_id:'fixture-neighbor',expires_at:'2099-01-01T00:00:00Z'}]});
  if(mode==='failed')throw Error('fixture lookup failed');
  return Response.json({data:{externalActions:0,requests:[{jobId:'own-request',state:'accepted',requestedAt:new Date(Date.now()-86400000).toISOString(),checkedAt:new Date(Date.now()-(mode==='stale'?300001:1000)).toISOString(),cancellationSuggested:false}]}});
 };
 const query=async()=>React.act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('작업 기록 조회')).dispatchEvent(new window.Event('click',{bubbles:true})));
 try{
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(WorkRecords)));assert.equal(calls.length,0);
  await query();assert.match(document.body.textContent,/서로이웃 수락 확인/);assert.deepEqual(calls,['list','request_status']);
  mode='stale';await query();assert.doesNotMatch(document.body.textContent,/서로이웃 수락 확인/);assert.match(document.body.textContent,/현재 수락 여부 미확인/);
  mode='failed';await query();assert.match(document.body.textContent,/fixture-neighbor/);assert.match(document.body.textContent,/신청 상태 기록은 확인하지 못했습니다/);assert.doesNotMatch(document.body.textContent,/서로이웃 수락 확인/);
 }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
