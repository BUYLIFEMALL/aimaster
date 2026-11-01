import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {parseHTML} from 'linkedom';
import {FeedMonitor} from '../src/components/analysis/FeedMonitor.tsx';
const monitor=(o={})=>({id:'11111111-1111-4111-8111-111111111111',revision:1,state:'active',last_reason:'started',feed_count:3,ai_count:0,reserved_micros:0,budget_micros:0,lease_until:null,expires_at:'2099-01-01T00:00:00Z',background:true,ai_enabled:false,feed_failures:0,last_feed_at:null,...o});
const catalog=(m,o={})=>({data:{monitor:m,awaitingBody:0},scheduler:{jobId:7,active:true,paused:false},hasCronKey:true,directory:[{account_id:'a',external_id:'own',neighbor_id:'alpha'}],choices:{profiles:[],accounts:[{id:'a',external_id:'own'}]},quotes:[],feedReady:true,serverFeedEnabled:true,aiReady:false,...o});
async function mount(respond,fn){
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');
 let visibility='visible';Object.defineProperty(document,'visibilityState',{get:()=>visibility,configurable:true});
 const globals={window,self:window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true},previous=new Map();
 for(const [key,value]of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const original=globalThis.fetch,calls=[];let root;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/neighbors/monitor');const v=JSON.parse(options.body);calls.push(v);return Response.json(respond(v));};
 const button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(t));
 const click=t=>React.act(async()=>{button(t).dispatchEvent(new window.Event('click',{bubbles:true}));await new Promise(r=>setTimeout(r,0));});
 const ops=()=>calls.map(c=>c.operation);
 try{const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(FeedMonitor)));
  await fn({document,window,button,click,calls,ops,hide:async()=>{visibility='hidden';await React.act(async()=>{document.dispatchEvent(new window.Event('visibilitychange'));await new Promise(r=>setTimeout(r,0));});}});
 }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,d]of previous){if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}}
}
test('MUI01 opening and loading the screen make no read, AI or cron call',async()=>{
 await mount(()=>catalog(null,{hasCronKey:false,scheduler:{jobId:null,active:false,paused:false}}),async({click,ops,document})=>{
  assert.deepEqual(ops(),[]);await click('선택 항목');assert.deepEqual(ops(),['catalog']);
  assert.match(document.body.textContent,/cron-job\.org 무료 가입/);
  assert.equal(document.querySelector('input[type=password]').value,'');
 });
});
test('MUI02 a saved key is never shown back; the background option needs a registered key',async()=>{
 await mount(v=>v.operation==='cron_key_save'?{data:{saved:true},hasCronKey:true}:catalog(null,{hasCronKey:false,scheduler:{jobId:null,active:false,paused:false}}),async({click,document,window,calls})=>{
  await click('선택 항목');
  const background=[...document.querySelectorAll('input[type=checkbox]')].find(i=>i.parentElement.textContent.includes('탭을 닫거나'));assert.equal(background.disabled,true);
  const input=document.querySelector('input[type=password]'),props=input[Object.keys(input).find(k=>k.startsWith('__reactProps'))];
  await React.act(async()=>props.onChange({target:{value:'member-own-cron-key'}}));
  await click('키 저장');assert.equal(calls.at(-1).operation,'cron_key_save');assert.doesNotMatch(document.body.textContent,/member-own-cron-key/);
 });
});
test('MUI03 reopening an active background session does not restart anything until asked; pause goes through the server',async()=>{
 await mount(v=>v.operation==='scheduler_pause'?{data:{paused:true},scheduler:{jobId:7,active:false,paused:true}}:catalog(monitor()),async({click,ops,document,button})=>{
  await click('선택 항목');assert.deepEqual(ops(),['catalog']);assert.match(document.body.textContent,/상시 감시: 켜짐/);
  assert.equal(button('이 탭에서 이어서'),undefined); // Feed-only background: nothing for the tab to do.
  await click('일시정지');assert.equal(ops().at(-1),'scheduler_pause');assert.match(document.body.textContent,/상시 감시: 일시정지됨/);assert.ok(button('재개'));
 });
});
test('MUI04 hiding the tab stops only the local AI loop of a background session and never stops the server session',async()=>{
 await mount(v=>v.operation==='tick'?{data:{monitor:monitor({ai_enabled:true}),awaitingBody:0}}:catalog(monitor({ai_enabled:true})),async({click,ops,hide,document})=>{
  await click('선택 항목');await click('이 탭에서 이어서');assert.equal(ops().at(-1),'tick');
  await hide();assert.ok(!ops().includes('stop'));assert.match(document.body.textContent,/새 글 확인은 탭과 상관없이 이어집니다/);
 });
});
test('MUI05 hiding the tab stops the server session when background checking is off',async()=>{
 await mount(v=>v.operation==='tick'?{data:{monitor:monitor({background:false}),awaitingBody:0}}:v.operation==='stop'?{data:{stopped:true}}:catalog(monitor({background:false})),async({click,ops,hide})=>{
  await click('선택 항목');await click('이 탭에서 이어서');await hide();assert.equal(ops().at(-1),'stop');
 });
});
test('MUI07 by default the screen asks for no cron-job.org key and starts on this PC through the extension',async()=>{
 await mount(v=>v.operation==='start'?{data:{sessionId:'11111111-1111-4111-8111-111111111111'}}:catalog(null,{serverFeedEnabled:false,hasCronKey:false,scheduler:{jobId:null,active:false,paused:false}}),async({click,document,window,calls})=>{
  await click('선택 항목');assert.doesNotMatch(document.body.textContent,/cron-job/);assert.equal(document.querySelector('input[type=password]'),null);assert.match(document.body.textContent,/이 PC의 확장이 읽으므로/);
  const fire=async(el,value)=>{const props=el[Object.keys(el).find(k=>k.startsWith('__reactProps'))];await React.act(async()=>props.onChange({target:value}));};
  await fire(document.querySelector('select'),{value:'a'});
  const boxes=()=>[...document.querySelectorAll('input[type=checkbox]')];
  await fire(boxes().find(i=>i.parentElement.textContent.includes('alpha')),{checked:true});
  await fire(boxes().find(i=>i.parentElement.textContent.includes('공개 RSS')),{checked:true});
  await click('선택한 범위로');const start=calls.find(c=>c.operation==='start');assert.equal(start.payload.runner,'extension');assert.equal(start.payload.background,true);
 });
});
test('MUI08 an extension session shows its own status line, and hiding the tab never stops it',async()=>{
 await mount(()=>catalog(monitor({runner:'extension',runner_seen_at:'2026-11-01T00:00:00Z'}),{serverFeedEnabled:false,scheduler:{jobId:null,active:false,paused:false}}),async({click,document,hide,ops,button})=>{
  await click('선택 항목');assert.match(document.body.textContent,/새 글 확인: 이 PC의 확장/);assert.doesNotMatch(document.body.textContent,/상시 감시: /);assert.equal(button('이 탭에서 이어서'),undefined);await hide();assert.ok(!ops().includes('stop'));
 });
});
test('MUI06 a tick failure stops the local loop without retrying',async()=>{
 const tick={count:0};
 await mount(v=>{if(v.operation==='tick'){tick.count++;throw Error('network lost');}return catalog(monitor({background:false}));},async({click,document,button})=>{
  await click('선택 항목');await click('이 탭에서 이어서');assert.equal(tick.count,1);assert.match(document.body.textContent,/자동 재요청하지 않습니다/);assert.ok(button('이 탭에서 이어서'));
 });
});
