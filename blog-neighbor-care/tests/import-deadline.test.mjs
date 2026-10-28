import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {parseHTML} from 'linkedom';
import {NeighborImportPanel} from '../src/components/analysis/NeighborImportPanel.tsx';
test('ID01 an open ready preview shows the exact deadline and disables confirmation when it elapses without renewing or resending',async()=>{
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');const globals={window,self:window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true},previous=new Map();
 for(const [key,value]of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const original=globalThis.fetch;let root;const calls=[];
 globalThis.fetch=async(_url,options)=>{const {operation}=JSON.parse(options.body);calls.push(operation);
  if(operation==='directory')return Response.json({data:{total:0,records:[]}});
  if(operation==='runs')return Response.json({data:[{id:'own-run',state:'ready',captured_count:1,total_count:1,last_page:1,total_pages:1}]});
  assert.equal(operation,'get');return Response.json({data:{id:'own-run',state:'ready',validUntil:new Date(Date.now()+300).toISOString(),capturedCount:1,totalCount:1,lastPage:1,totalPages:1,rows:[{blogId:'neighbor',relation:'mutual'}]}});
 };
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
 try{
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(NeighborImportPanel,{accountId:'own-account'})));
  await React.act(async()=>button('가져온 목록·진행 상태 조회').dispatchEvent(new window.Event('click',{bubbles:true})));
  await React.act(async()=>button('표시된 전 페이지 받음').dispatchEvent(new window.Event('click',{bubbles:true})));
  assert.match(document.body.textContent,/확인·반영 기한:/);assert.ok(button('확인한 이웃 목록 반영'));
  await React.act(async()=>new Promise(resolve=>setTimeout(resolve,350)));
  assert.equal(button('확인한 이웃 목록 반영'),undefined);assert.match(document.body.textContent,/확인 기한이 지났거나/);assert.deepEqual(calls,['directory','runs','get']);
 }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
