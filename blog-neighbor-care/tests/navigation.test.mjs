import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';
import { ProgramNavigation } from '../src/components/ProgramNavigation.tsx';

const view = (email) => React.createElement(PathnameContext.Provider, { value: '/neighbors/detail' },
  React.createElement(ProgramNavigation, { email }, React.createElement('p', null, '작업 본문')));

test('NAV01 nested routes select the proper workflow, account is verified-only and utilities follow the flow', () => {
  const { document } = parseHTML(renderToStaticMarkup(view('layout@example.invalid')));
  const sidebar = document.querySelector('.desktop-sidebar');
  assert.equal(sidebar.querySelector('[aria-current=page]').getAttribute('href'), '/neighbors');
  // v1.16 메뉴 4개: 오늘의 소통 · 이웃 · 내 블로그 · 설정(옛 /reader·/candidates는 새 화면으로 연결)
  assert.deepEqual([...sidebar.querySelectorAll('.bnc-flow a')].map(a => a.getAttribute('href')), ['/today','/neighbors','/studio','/settings']);
  assert.match(sidebar.querySelector('a[href="/settings"]').textContent, /API키등록·플랫폼연동/);
  assert.equal(sidebar.querySelector('.bnc-dashboard'), null);
  assert.equal(sidebar.querySelector('.bnc-backlink').getAttribute('href'), 'https://www.buylife.xyz/programs');
  assert.ok(sidebar.querySelector('.nav-download').hasAttribute('download'));
  assert.equal(sidebar.lastElementChild.className, 'bnc-account');
  assert.match(sidebar.querySelector('.bnc-account').textContent, /layout@example.invalid.*로그아웃/);
  const signedOut = parseHTML(renderToStaticMarkup(view(undefined))).document;
  assert.equal(signedOut.querySelector('.bnc-account button'), null);
  assert.match(signedOut.querySelector('.bnc-account').textContent, /회원 로그인/);
});

test('NAV02 mobile menu includes the same account/actions, closes on navigation, and handles logout failure without redirect/retry', async () => {
  const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');Object.defineProperty(window,'location',{value:new URL('https://blog-neighbor-care.buylife.xyz/'),configurable:true});window.postMessage=()=>{};
  const globals={window,self:window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true},previous=new Map();
  for(const [key,value]of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
  const original=globalThis.fetch;let root;const calls=[];
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({error:'fixture failure'},{status:503});};
  try{
    const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
    await React.act(async()=>root.render(view('layout@example.invalid')));
    const toggle=()=>document.querySelector('.mobile-header button');
    await React.act(async()=>toggle().dispatchEvent(new window.Event('click',{bubbles:true})));
    assert.equal(toggle().getAttribute('aria-expanded'),'true');
    assert.equal(document.querySelectorAll('.mobile-menu .bnc-flow a').length,4);
    assert.match(document.querySelector('.mobile-menu .bnc-account').textContent,/layout@example.invalid/);
    await React.act(async()=>document.querySelector('.mobile-menu .bnc-account button').dispatchEvent(new window.Event('click',{bubbles:true})));
    assert.deepEqual(calls.filter(c=>c.url!=='/api/extension/version').map(c=>[c.url,c.options.method]),[['/api/auth/logout','POST']]);
    assert.match(document.querySelector('.mobile-menu [role=alert]').textContent,/다시 시도/);
    assert.equal(document.querySelector('.mobile-menu .bnc-account button').disabled,false);
    await React.act(async()=>document.querySelector('.mobile-menu a[href="/guide"]').dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true})));
    assert.equal(toggle().getAttribute('aria-expanded'),'false');
    assert.equal(document.querySelector('.mobile-menu'),null);
  }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});

test('NAV-FOLD panels fold under their title, open remembered ones, and keep untitled panels open',async()=>{
 const {parseHTML}=await import('linkedom');const {enhancePanels}=await import('../src/components/FoldablePanels.tsx');
 const {document}=parseHTML('<div id="r"><section class="panel" id="a"><h2>첫째</h2><p id="x">내용</p></section><section class="panel" id="b"><div class="section-head"><h2>둘째</h2></div></section><section class="panel" id="c"><p>제목 없음</p></section></div>');
 const toggled=[];enhancePanels(document.getElementById('r'),title=>title==='둘째',(title,open)=>toggled.push([title,open]));
 const a=document.getElementById('a'),b=document.getElementById('b'),c=document.getElementById('c');
 assert.equal(a.classList.contains('bnc-folded'),true);assert.equal(b.classList.contains('bnc-folded'),false);assert.equal(c.classList.contains('bnc-fold'),false);
 a.querySelector('h2').dispatchEvent(new document.defaultView.Event('click',{bubbles:true}));
 assert.equal(a.classList.contains('bnc-folded'),false);assert.deepEqual(toggled,[['첫째',true]]);
 enhancePanels(document.getElementById('r'),()=>false,()=>{});assert.equal(a.classList.contains('bnc-folded'),false);
});
