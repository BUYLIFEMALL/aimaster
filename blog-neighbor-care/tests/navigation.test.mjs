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
  assert.deepEqual([...sidebar.querySelectorAll('.bnc-flow a')].map(a => a.getAttribute('href')), ['/reader','/studio','/candidates','/neighbors']);
  assert.equal(sidebar.querySelector('.bnc-backlink').getAttribute('href'), 'https://www.buylife.xyz/programs');
  assert.ok(sidebar.querySelector('.nav-download').hasAttribute('download'));
  assert.equal(sidebar.lastElementChild.className, 'bnc-account');
  assert.match(sidebar.querySelector('.bnc-account').textContent, /layout@example.invalid.*로그아웃/);
  const signedOut = parseHTML(renderToStaticMarkup(view(undefined))).document;
  assert.equal(signedOut.querySelector('.bnc-account button'), null);
  assert.match(signedOut.querySelector('.bnc-account').textContent, /회원 로그인/);
});

test('NAV02 mobile menu includes the same account/actions, closes on navigation, and handles logout failure without redirect/retry', async () => {
  const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');
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
    assert.deepEqual(calls.map(c=>[c.url,c.options.method]),[['/api/auth/logout','POST']]);
    assert.match(document.querySelector('.mobile-menu [role=alert]').textContent,/다시 시도/);
    assert.equal(document.querySelector('.mobile-menu .bnc-account button').disabled,false);
    await React.act(async()=>document.querySelector('.mobile-menu a[href="/guide"]').dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true})));
    assert.equal(toggle().getAttribute('aria-expanded'),'false');
    assert.equal(document.querySelector('.mobile-menu'),null);
  }finally{if(root)await React.act(async()=>root.unmount());globalThis.fetch=original;for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
