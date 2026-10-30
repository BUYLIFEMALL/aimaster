import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {parseHTML} from 'linkedom';
import {MessageStudio} from '../src/components/analysis/MessageStudio.tsx';
test('MSG05 saved result shows pinned target and requires explicit review before draft adoption; opening never generates',async()=>{
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');
 const globals={window,self:window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true},previous=new Map();
 for(const [key,value]of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const original=globalThis.fetch,calls=[];let root;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/messages');const v=JSON.parse(options.body);calls.push(v);
  if(v.operation==='list')return Response.json({data:{profiles:[],accounts:[],candidates:[],replies:[],materials:[],jobs:[{id:'fixture',kind:'reply',state:'succeeded'}]}});
  if(v.operation==='get')return Response.json({data:{id:'fixture',kind:'reply',state:'succeeded',neighborId:'neighbor',postId:'123',parentCommentId:'parent-456',result:{text:'확인한 원댓글에 대한 구체적인 답변을 충분히 검토한 다음 완성된 문장으로 초안에 저장합니다.',summary:'요약',emotion:'차분함',aiLikeScore:3,details:[{sourceId:'source',quote:'원문 인용'}]}}});
  assert.equal(v.operation,'adopt');assert.equal(v.payload.confirmed,true);return Response.json({data:{draftJobId:'draft',state:'draft'}});
 };
 const button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(t));const click=t=>React.act(async()=>button(t).dispatchEvent(new window.Event('click',{bubbles:true})));
 try{const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(MessageStudio)));
  assert.equal(calls.length,0);await click('생성 기록 조회');await click('결과 확인');assert.match(document.body.textContent,/neighbor.*123.*parent-456/);assert.equal(button('확인한 문장을').disabled,true);
  const boxes=[...document.querySelectorAll('input[type=checkbox]')];boxes.at(-1).checked=true;await React.act(async()=>boxes.at(-1).dispatchEvent(new window.Event('click',{bubbles:true})));await click('확인한 문장을');assert.equal(calls.filter(c=>c.operation==='adopt').length,1);assert.match(document.body.textContent,/초안으로 저장했습니다/);assert.equal(calls.filter(c=>c.operation==='generate').length,0);
 }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,d]of previous){if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}}
});
