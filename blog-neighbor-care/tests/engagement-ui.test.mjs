import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {parseHTML} from 'linkedom';
import {EngagementRecords} from '../src/components/analysis/EngagementRecords.tsx';
test('EN05 member loads a saved draft, explicitly reviews it, and a lost response clears approval instead of repeating it',async()=>{
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');
 const globals={window,self:window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true},previous=new Map();
 for(const [key,value]of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const original=globalThis.fetch,calls=[];let root,fail=false,state='draft';
 const id='11111111-1111-4111-8111-111111111111',job='22222222-2222-4222-8222-222222222222';
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'/api/work');const v=JSON.parse(options.body);calls.push(v);
  if(v.operation==='engagement_list')return Response.json({data:[{id,neighbor_id:'fixture-neighbor',own_post_id:'123',comment_id:'original-1',return_post_id:null,reply_job_id:job,visit_job_id:null,expires_at:'2026-11-28T00:00:00Z'}]});
  if(v.operation==='engagement_review')return Response.json({data:{id:job,kind:'reply',neighbor_id:'fixture-neighbor',post_id:'123',parent_comment_id:'original-1',body:'saved reviewed sentence',state}});
  assert.equal(v.operation,'approve');assert.deepEqual(v.payload,{id:job});if(fail)throw Error('응답 유실');state='ready';return Response.json({data:{id:job,state}});
 };
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
 const click=async text=>React.act(async()=>button(text).dispatchEvent(new window.Event('click',{bubbles:true})));
 try{
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(EngagementRecords)));
  assert.equal(calls.length,0);await click('대상 조회');assert.equal(button('확인된 답방 글 없음').disabled,true);
  await click('대댓글 초안 불러오기');assert.match(document.body.textContent,/original-1/);assert.match(document.body.textContent,/saved reviewed sentence/);
  await click('이 내용으로 검토 완료');assert.match(document.body.textContent,/실제 등록은 실행하지 않았습니다/);assert.equal(button('이 내용으로 검토 완료'),undefined);
  state='draft';await click('대상 조회');await click('대댓글 초안 불러오기');fail=true;await click('이 내용으로 검토 완료');
  assert.match(document.body.textContent,/응답 유실/);assert.equal(button('이 내용으로 검토 완료'),undefined);assert.equal(calls.filter(v=>v.operation==='approve').length,2);
  assert.ok(calls.every(v=>!['claim','arm','result','capture_incoming_comment'].includes(v.operation)));
 }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,d]of previous){if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}}
});
