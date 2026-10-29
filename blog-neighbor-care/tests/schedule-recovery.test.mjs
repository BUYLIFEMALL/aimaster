import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import {ScheduleRecovery} from '../src/components/analysis/ScheduleRecovery.tsx';
import {createWorkHandler} from '../src/lib/work-api.ts';
test('SR01 only authenticated exact consent/CAS can request recovery, never worker operations or success',async()=>{
 const calls=[],handler=createWorkHandler({authorize:async()=>({allowed:true,userId:'owner'}),execute:async(...args)=>{calls.push(args);return {data:{},error:null};}});
 const send=(operation,payload={})=>handler(new Request('https://fixture.test/api/work',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json'},body:JSON.stringify({operation,payload})}));
 const valid={run_id:randomUUID(),generation:1,settings_revision:3,preference_revision:1,confirmed:true};
 assert.equal((await send('schedule_status')).status,200);assert.equal((await send('resume_schedule',valid)).status,200);assert.deepEqual(calls[1],['owner','resume_schedule',valid]);
 for(const patch of [{confirmed:false},{generation:0},{settings_revision:1.2},{preference_revision:null},{run_id:'bad'},{user_id:'victim'},{enabled:true},{outcome:'success'}])assert.equal((await send('resume_schedule',{...valid,...patch})).status,400);
 assert.equal((await send('begin',valid)).status,403);assert.equal(calls.length,2);
});
test('SR02 recovery status and controls do nothing on initial render',()=>{
 const html=renderToStaticMarkup(React.createElement(ScheduleRecovery));assert.match(html,/반복 실행 기록 조회/);assert.doesNotMatch(html,/type="checkbox"/);assert.doesNotMatch(html,/자동 실행 켜기/);
});
test('SR03 lost recovery response clears consent, never retries and requires a fresh status query',async()=>{
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');const previous=new Map();
 for(const [key,value]of Object.entries({window,self:window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true})){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const original=globalThis.fetch,calls=[];let root,fail=true;
 const run_id=randomUUID(),status={state:'paused',generation:2,run_id,job_id:randomUUID(),job_state:'skipped',next_due_at:null,running_until:null,last_result:'uncertain',settings_revision:4,preference_revision:2,executionEnabled:false,resumable:true,resumed:false,externalActions:0};
 globalThis.fetch=async(_url,options)=>{const input=JSON.parse(options.body);calls.push(input);if(input.operation==='resume_schedule'){if(fail)throw Error('복구 응답 유실');return Response.json({data:{...status,state:'idle',generation:3,run_id:null,resumable:false,resumed:true}});}return Response.json({data:status});};
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
 const click=async b=>React.act(async()=>b.dispatchEvent(new window.Event('click',{bubbles:true})));
 async function consent(){await React.act(async()=>{const i=document.querySelector('input');i.checked=true;i.dispatchEvent(new window.Event('click',{bubbles:true}));});}
 try{
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(ScheduleRecovery)));assert.equal(calls.length,0);
  await click(button('기록 조회'));assert.equal(button('대기 복구').disabled,true);await consent();assert.equal(button('대기 복구').disabled,false);
  await click(button('대기 복구'));assert.match(document.body.textContent,/복구 응답 유실/);assert.equal(document.querySelector('input'),null);assert.deepEqual(calls.map(c=>c.operation),['schedule_status','resume_schedule']);
  fail=false;await click(button('기록 조회'));assert.equal(document.querySelector('input').checked,false);await consent();await click(button('대기 복구'));
  assert.match(document.body.textContent,/반복 대기 기록을 복구했습니다/);assert.match(document.body.textContent,/자동 실행: 꺼짐/);assert.equal(document.querySelector('input'),null);
  assert.deepEqual(calls[1].payload,{run_id,generation:2,settings_revision:4,preference_revision:2,confirmed:true});
 }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
