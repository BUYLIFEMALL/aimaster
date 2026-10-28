import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import {WorkRecords} from '../src/components/analysis/WorkRecords.tsx';
test('WR01 records screen is read-on-demand and never offers a fresh external action',()=>{
 const html=renderToStaticMarkup(React.createElement(WorkRecords));assert.match(html,/작업 기록 조회/);assert.match(html,/새로 실행하지 않습니다/);assert.doesNotMatch(html,/실행하기|다시 실행|자동 실행 켜기/);
});
test('WR02 armed cancellation displays uncertainty, prevents a second action and never retries on a lost response',async()=>{
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');const globals={window,self:window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true},previous=new Map();
 for(const [key,value]of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const original=globalThis.fetch;let root,state='armed',fail=false;const calls=[];
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/work');const input=JSON.parse(options.body);calls.push(input);if(input.operation==='cancel'){if(fail)throw Error('응답 유실');state='uncertain';return Response.json({data:{id:'own-work',state,cancelled:false,resultCheckRequired:true}});}return Response.json({data:[{id:'own-work',kind:'comment',state,neighbor_id:'neighbor',expires_at:'2026-11-28T00:00:00Z',body:'not-for-display'}]});};
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
 try{
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(WorkRecords)));assert.equal(calls.length,0);
  await React.act(async()=>button('작업 기록 조회').dispatchEvent(new window.Event('click',{bubbles:true})));
  await React.act(async()=>button('중단 요청').dispatchEvent(new window.Event('click',{bubbles:true})));
  assert.match(document.body.textContent,/결과 확인이 필요/);assert.equal(button('중단 요청'),undefined);assert.doesNotMatch(document.body.textContent,/not-for-display/);assert.deepEqual(calls.map(c=>c.operation),['list','cancel','list']);
  state='armed';await React.act(async()=>button('작업 기록 조회').dispatchEvent(new window.Event('click',{bubbles:true})));fail=true;
  await React.act(async()=>button('중단 요청').dispatchEvent(new window.Event('click',{bubbles:true})));assert.match(document.body.textContent,/응답 유실/);assert.equal(calls.filter(c=>c.operation==='cancel').length,2);
 }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
