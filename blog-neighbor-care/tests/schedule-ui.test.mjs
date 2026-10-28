import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {parseHTML} from 'linkedom';
import {SchedulePreferences} from '../src/components/analysis/SchedulePreferences.tsx';
test('SU01 preference UI loads on demand, saves only a revision-bound preference and never enables execution',async()=>{
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');const globals={window,self:window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true},previous=new Map();
 for(const [key,value]of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const original=globalThis.fetch;let root,conflict=false;const calls=[];
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/work');const input=JSON.parse(options.body);calls.push(input);if(conflict)return Response.json({error:'다른 화면에서 반복 설정이 바뀌었습니다.'},{status:409});return Response.json({data:{interval_minutes:60,start_minute:540,end_minute:1320,revision:input.operation==='save_schedule'?2:1,executionAvailable:false,externalActions:0}});};
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
 try{
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(SchedulePreferences)));assert.equal(calls.length,0);
  await React.act(async()=>button('저장된 반복 설정 조회').dispatchEvent(new window.Event('click',{bubbles:true})));
  assert.equal(document.querySelectorAll('option').length,25);assert.match(document.body.textContent,/실제 예약된 실행이 아닙니다/);
  await React.act(async()=>button('반복 설정만 저장').dispatchEvent(new window.Event('click',{bubbles:true})));
  assert.deepEqual(calls.map(c=>c.operation),['schedule','save_schedule']);assert.deepEqual(calls[1].payload,{interval_minutes:60,start_minute:540,end_minute:1320,expected_revision:1});assert.match(document.body.textContent,/자동 실행은 시작하지 않았습니다/);
  conflict=true;await React.act(async()=>button('반복 설정만 저장').dispatchEvent(new window.Event('click',{bubbles:true})));assert.match(document.body.textContent,/다른 화면에서/);assert.equal(button('반복 설정만 저장'),undefined);assert.equal(calls.length,3);
 }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
