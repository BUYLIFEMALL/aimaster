const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { pageStep, createAdapter } = require('../extension/tistory-publication.js');
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: false }); });
after(async () => { await browser?.close(); });
const title = '자동 발행 합성 검수';
const settings = { visibility: 'private', comment: 'allow', timing: 'now' };
const markup = `<input id="post-title-inp" value="${title}"><div id="editor"><h2>소제목</h2><p>본인 합성 원고입니다.</p><a href="https://example.com/">출처</a></div>
<textarea id="editor-tistory"></textarea><div class="editor_layer" role="dialog"><label for="private">비공개</label><input id="private" type="radio" name="basicSet" checked><label for="public">공개</label><input id="public" type="radio" name="basicSet"><button class="btn_date on">현재</button><button class="mce-btn-type1 select_btn">댓글 허용</button><button id="publish-btn" onclick="window.finalClicks=(window.finalClicks||0)+1">발행</button></div>
<script>document.querySelector('#editor-tistory').value=document.querySelector('#editor').innerHTML;window.tinymce={activeEditor:{getBody:()=>document.querySelector('#editor')}};</script>`;
async function pageWith(body, url = 'https://myblog.tistory.com/manage/newpost') {
  const page = await browser.newPage();
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html lang="ko"><body>${body}</body></html>` }));
  await page.goto(url); await page.addScriptTag({ content: `window.pageStep=${pageStep.toString()}` }); return page;
}
const step = (page, command, args = {}) => page.evaluate(({ command, args }) => window.pageStep(command, { blogName: 'myblog', runId: 'run-1', publish: { visibility: 'private', comment: 'allow', timing: 'now' }, ...args }), { command, args });
test('actual page command requires snapshot, selected privacy and immediate timing, then clicks once', async () => {
  const page = await pageWith(markup); const { snapshot } = await step(page, 'snapshot');
  assert.equal((await step(page, 'check', { snapshot })).ok, true);
  assert.equal((await step(page, 'final', { snapshot, publish: { ...settings, visibility: 'public' } })).ok, false);
  assert.equal((await step(page, 'final', { snapshot })).clicked, true);
  assert.equal((await step(page, 'final', { snapshot })).ok, false);
  assert.equal(await page.evaluate(() => window.finalClicks), 1); await page.close();
});
test('a changed body or semantic link/heading structure after validation prevents final click', async () => {
  for (const mutation of [() => document.querySelector('#editor p').textContent += ' 수정', () => document.querySelector('#editor a').href = 'https://example.com/changed', () => { const h = document.querySelector('#editor h2'); const p = document.createElement('p'); p.textContent = h.textContent; h.replaceWith(p); }]) {
    const page = await pageWith(markup); const { snapshot } = await step(page, 'snapshot'); await page.evaluate(mutation);
    assert.equal((await step(page, 'final', { snapshot })).ok, false); assert.equal(await page.evaluate(() => window.finalClicks || 0), 0); await page.close();
  }
});
test('only same-blog actual viewer URL and title count as published', async () => {
  for (const [url, text, expected] of [['https://myblog.tistory.com/123',title,true],['https://myblog.tistory.com/entry/test',title,true],['https://other.tistory.com/123',title,false],['https://myblog.tistory.com/manage/posts',title,false],['https://myblog.tistory.com/123','이전 글',false]]) {
    const page = await pageWith(`<h1>${text}</h1>`,url); assert.equal((await step(page,'published',{title})).ok,expected); await page.close();
  }
});
test('save-response watcher follows only this editor POST result and does not infer a URL from an old list row',async()=>{
  const listeners=[];let current='https://myblog.tistory.com/manage/posts';let body='{"success":true,"entryUrl":"https://custom.example/123"}';
  const state={tabId:77,blogName:'myblog'};const commands=[];
  const chrome={debugger:{onEvent:{addListener:fn=>listeners.push(fn),removeListener:fn=>listeners.splice(listeners.indexOf(fn),1)},detach:async()=>{},sendCommand:async(_target,command)=>{commands.push(command);return {body};}},tabs:{get:async()=>({url:current}),update:async(_id,props)=>{current=props.url;}},scripting:{executeScript:async args=>[{result:args.args[0]==='published'?{ok:true,url:'https://myblog.tistory.com/123'}:{ok:true,clicked:true}}]}};
  const adapter=createAdapter({chrome,state,TaskError:Error,sleep:async()=>{},attachDebugger:async()=>{}});
  await adapter.watchPublication();await adapter.finalPublication({},settings,'run',true);
  listeners[0]({tabId:77},'Network.requestWillBeSent',{requestId:'save',request:{url:'https://myblog.tistory.com/manage/post.json',method:'POST'}});
  listeners[0]({tabId:77},'Network.responseReceived',{requestId:'save',response:{status:200}});
  listeners[0]({tabId:77},'Network.loadingFinished',{requestId:'save'});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(await adapter.publicationResult(title),'https://myblog.tistory.com/123');assert.equal(current,'https://myblog.tistory.com/manage/post/123');
  await adapter.stopPublicationWatch();assert.equal(listeners.length,0);assert.ok(commands.includes('Network.getResponseBody'));
});

test('visible body with a missing or altered save source cannot reach final click',async()=>{
 const page=await pageWith(markup);const {snapshot}=await step(page,'snapshot');
 await page.evaluate(()=>document.querySelector('#editor-tistory').value='<p>누락된 저장 원본</p>');
 assert.equal((await step(page,'final',{snapshot})).ok,false);assert.equal(await page.evaluate(()=>window.finalClicks||0),0);await page.close();
});

test('read-only own-manager receipt handles a custom domain without extra host permission',async()=>{
 const page=await pageWith(`<input id="post-title-inp" value="${title}">`,'https://myblog.tistory.com/manage/post/123');
 assert.equal((await step(page,'published',{title,postId:'123'})).url,'https://myblog.tistory.com/123');
 assert.equal((await step(page,'published',{title,postId:'124'})).ok,false);
 assert.equal((await step(page,'final')).ok,false);await page.close();
});

test('live private save dialog without date buttons supports now only and keeps public guarded',async()=>{
 const page=await pageWith(markup.replace('<button class="btn_date on">현재</button>','').replace('>발행</button>','>비공개 저장</button>'));
 const {snapshot}=await step(page,'snapshot');
 assert.equal((await step(page,'final',{snapshot,publish:{...settings,timing:'reserve'}})).ok,false);
 assert.equal((await step(page,'final',{snapshot})).clicked,true);
 assert.equal(await page.evaluate(()=>window.finalClicks),1);await page.close();
 const publicPage=await pageWith(markup.replace('<button class="btn_date on">현재</button>',''));
 await publicPage.evaluate(()=>{document.querySelector('#private').checked=false;document.querySelector('#public').checked=true;});
 const next=await step(publicPage,'snapshot');
 assert.equal((await step(publicPage,'final',{snapshot:next.snapshot,publish:{...settings,visibility:'public'}})).ok,false);await publicPage.close();
});
