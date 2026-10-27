import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import { parseCandidateJson, readCandidateJson, readCandidateText, mergeCandidatePosts, MAX_CANDIDATE_FILE_BYTES } from '../src/lib/analysis/candidateFiles.ts';
import { CandidateFileImport, CandidateBodyFile } from '../src/components/analysis/CandidateFileImport.tsx';
import { generation } from '../src/lib/analysis/contracts.ts';
const post=(n=1,blog='neighbor')=>({url:`https://blog.naver.com/${blog}/${n}`,title:`글 제목 ${n}`,body:`사용 권한을 확인한 실제 본문입니다. 글 ${n}`,rightsConfirmed:true});
const json=(posts=[post()])=>JSON.stringify({posts});
test('CF01 imports actual body, normalizes URL/newlines and never trusts file consent',()=>{
 const values=parseCandidateJson('\uFEFF'+json([{...post(),url:'https://m.blog.naver.com/NEIGHBOR/1',body:'  첫 문단\r\n두 번째 문단  '}]));assert.equal(values[0].url,'https://blog.naver.com/neighbor/1');assert.equal(values[0].body,'첫 문단\n두 번째 문단');assert.equal(values[0].rightsConfirmed,false);
});
test('CF02 rejects malformed/unknown fields, non-Naver/list/credential URLs, duplicates and forged metadata',()=>{
 for(const text of ['[]','{}','{','{"posts":[]}',JSON.stringify({posts:[post()],userId:'other'}),json([{...post(),score:100}]),json([{...post(),url:'https://evil.test/1'}]),json([{...post(),url:'https://x:y@blog.naver.com/neighbor/1'}]),json([{...post(),url:'https://blog.naver.com/neighbor'}]),json([post(),post()])])assert.throws(()=>parseCandidateJson(text));
});
test('CF03 bounded file/body/count/group limits fail before any apply',()=>{
 assert.throws(()=>parseCandidateJson(' '.repeat(MAX_CANDIDATE_FILE_BYTES+1)));
 assert.throws(()=>parseCandidateJson(json([{...post(),body:'a'.repeat(6001)}])));
 assert.throws(()=>parseCandidateJson(json(Array.from({length:6},(_,i)=>post(i+1)))));
 assert.throws(()=>parseCandidateJson(json(Array.from({length:21},(_,i)=>post(i+1,`b${i}`)))));
 assert.throws(()=>parseCandidateJson(json(Array.from({length:11},(_,i)=>({...post(i+1,`b${i}`),body:'a'.repeat(6000)})))));
});
test('CF04 text files remain text; invalid UTF-8/binary/extension and empty content are rejected',async()=>{
 assert.equal(await readCandidateText(new File(['<img src=x onerror=alert(1)>\n본문'], 'my-body.txt')),'<img src=x onerror=alert(1)>\n본문');
 assert.equal(await readCandidateText(new File(['# 제목\n\n실제 본문'], 'body.MD')),'# 제목\n\n실제 본문');
 for(const file of [new File([new Uint8Array([0xff,0xfe,0x00])],'bad.txt'),new File(['body\u0000data'],'bad.txt'),new File([''],'empty.txt'),new File(['body'],'body.html')])await assert.rejects(readCandidateText(file));
 await assert.rejects(readCandidateJson(new File([json()],'not-json.exe')));
 assert.equal((await readCandidateJson(new File([json()],'posts.json')))[0].rightsConfirmed,false);
});
test('CF05 append/replace is atomic, preserves existing consent and never overwrites conflicting body',()=>{
 const existing=[post(1)],original=JSON.stringify(existing);const incoming=parseCandidateJson(json([post(1),post(2),post(3)]));const merged=mergeCandidatePosts(existing,incoming,'append');assert.equal(merged.posts.length,3);assert.equal(merged.skipped,1);assert.equal(merged.posts[0].rightsConfirmed,true);assert.equal(merged.posts[1].rightsConfirmed,false);assert.equal(JSON.stringify(existing),original);
 assert.throws(()=>mergeCandidatePosts(existing,[{...post(),body:'다른 본문'}],'append'));assert.equal(JSON.stringify(existing),original);
 const replaced=mergeCandidatePosts(existing,[post(4)],'replace');assert.equal(replaced.posts.length,1);assert.equal(replaced.posts[0].url,post(4).url);assert.equal(replaced.posts[0].rightsConfirmed,false);assert.equal(JSON.stringify(existing),original);
});
test('CF06 search title/URL rows can receive actual file body without transferring consent',()=>{
 const existing=[{...post(),body:'',rightsConfirmed:false},{url:'',title:'',body:'',rightsConfirmed:false}];const merged=mergeCandidatePosts(existing,[post()],'append');assert.equal(merged.posts.length,1);assert.equal(merged.posts[0].body,post().body);assert.equal(merged.posts[0].rightsConfirmed,false);assert.equal(existing[0].body,'');
 assert.throws(()=>mergeCandidatePosts([{...post(),title:'다른 제목',body:''}],[post()],'append'));
});
test('CF07 aggregate groups/size remain bounded after merging individually valid batches',()=>{
 const existing=Array.from({length:5},(_,i)=>post(i+1));assert.throws(()=>mergeCandidatePosts(existing,[post(6)],'append'));assert.equal(existing.length,5);
 const many=Array.from({length:20},(_,i)=>post(i+1,`b${i}`));assert.throws(()=>mergeCandidatePosts(many,[post(21,'other')],'append'));
});
test('CF08 imported content cannot be evaluated until the member grants per-post and external AI consent',()=>{
 const posts=parseCandidateJson(json([post(1),post(2),post(3)]));const payload={id:'c0ffee00-1111-4111-8111-000000000001',profileId:'c0ffee00-1111-4111-8111-000000000002',profileRevision:1,provider:'openai',model:'gpt-4.1',externalAiConfirmed:true,rightsConfirmed:true,posts};assert.throws(()=>generation('candidates',payload));const granted={...payload,posts:posts.map(p=>({...p,rightsConfirmed:true}))};assert.equal(generation('candidates',granted).input.posts.length,3);assert.throws(()=>generation('candidates',{...granted,externalAiConfirmed:false}));
});
test('CF09 file UI has explicit preview/apply; SSR or loading controls make no network calls',()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected network');};
 try { const html=renderToStaticMarkup(React.createElement(CandidateFileImport,{posts:[],disabled:false,onApply(){throw Error('unexpected apply');}}));const {document}=parseHTML(html);assert.equal(document.querySelector('input[type=file]').getAttribute('accept'),'.json,application/json');assert.match(html,/파일 선택만으로 서버나 AI에 전송하지 않습니다/);const textHtml=renderToStaticMarkup(React.createElement(CandidateBodyFile,{contextKey:'post1',disabled:true,onApply(){}}));assert.match(textHtml,/disabled/);assert.equal(calls,0); }finally{globalThis.fetch=original;}
});
test('CF10 blank template cannot accidentally submit example text as a real candidate',()=>{
 const raw=readFileSync(new URL('../public/downloads/candidate-posts-template.json',import.meta.url),'utf8');assert.equal(JSON.parse(raw).posts.length,3);assert.throws(()=>parseCandidateJson(raw));
});
test('CF11 React file selection previews first; confirmation applies three posts with consent cleared',async()=>{
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');
 const globals={window,document,HTMLElement:window.HTMLElement,Event:window.Event,IS_REACT_ACT_ENVIRONMENT:true};const previous=new Map();
 for(const [key,value]of Object.entries(globals)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 let root,applied=null;
 try{
   const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
   await React.act(async()=>root.render(React.createElement(CandidateFileImport,{posts:[],disabled:false,onApply:value=>{applied=value;}})));
   const input=document.querySelector('input[type=file]');Object.defineProperty(input,'files',{value:[new File([json([post(1),post(2),post(3)])],'three-posts.json')],configurable:true});
   await React.act(async()=>{input.dispatchEvent(new window.Event('change',{bubbles:true}));await new Promise(resolve=>setImmediate(resolve));});
   assert.match(document.body.textContent,/three-posts.json/);assert.equal(applied,null);
   const apply=[...document.querySelectorAll('button')].find(button=>button.textContent.includes('확인한 본문을 입력에 반영'));assert.equal(apply.disabled,true);
   const check=document.querySelector('input[type=checkbox]');check.checked=true;
   await React.act(async()=>check.dispatchEvent(new window.Event('click',{bubbles:true})));
   assert.equal(apply.disabled,false);
   await React.act(async()=>apply.dispatchEvent(new window.Event('click',{bubbles:true})));
   assert.equal(applied.length,3);assert.equal(applied.every(post=>post.rightsConfirmed===false),true);
 }finally{if(root)await React.act(async()=>root.unmount());for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
