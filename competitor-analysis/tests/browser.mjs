import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
const bundle = await build({entryPoints:['tests/browser-entry.tsx'],bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-data-actions',setup(b){
  b.onResolve({filter:/^(next\/(link|navigation)|@\/lib\/(access|supabase\/server|actions\/.*))$/},()=>({path:path.resolve('tests/fixture-adapters.tsx')}));
}}]});
const cssDir='.next/static/css',css=(await Promise.all((await fs.readdir(cssDir)).filter(f=>f.endsWith('.css')).map(f=>fs.readFile(path.join(cssDir,f),'utf8')))).join('\n');
const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/app.js'){res.setHeader('Content-Type','application/javascript');res.end(bundle.outputFiles[0].text);}
  else if(req.url==='/app.css'){res.setHeader('Content-Type','text/css');res.end(css);}
  else{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body><main style="padding:16px;max-width:1200px;margin:auto"><div id="root"></div></main><script>window.fixture={created:0,deleted:0,analyzed:0,reports:0,tracked:0,refresh:0,queries:[],empty:false,compromised:false};</script><script src="/app.js"></script></body></html>');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:false}),context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']}),page=await context.newPage();
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const ok=name=>{checks.push({name,passed:true});console.log('PASS',name);};await fs.mkdir('docs/evidence',{recursive:true});
try{
  await page.goto(`http://localhost:${server.address().port}`,{waitUntil:'networkidle'});
  const keywords=page.locator('#keywords'),analyses=page.locator('#analyses'),detail=page.locator('#detail');
  assert.equal(await keywords.locator('tbody tr').count(),3);
  await keywords.getByRole('button',{name:'구글',exact:true}).click();assert.equal(await keywords.locator('tbody tr').count(),1);
  await keywords.getByRole('button',{name:'전체',exact:true}).click();await keywords.getByLabel('키워드 검색',{exact:true}).fill(' 제주 ');assert.equal(await keywords.locator('tbody tr').count(),1);
  await keywords.getByLabel('키워드 검색',{exact:true}).fill('nothing');await keywords.getByText('조건에 맞는 키워드가 없습니다.',{exact:true}).waitFor();await keywords.getByLabel('키워드 검색',{exact:true}).fill('');ok('키워드 검색·엔진 필터·결과 없음');
  await keywords.getByRole('button',{name:'▦ 카드',exact:true}).click();assert.equal(await keywords.locator('table').count(),0);assert.equal(await keywords.getByRole('button',{name:'삭제',exact:true}).count(),3);await keywords.getByRole('button',{name:'☰ 표',exact:true}).click();ok('키워드 표/카드 전환·작업 버튼 유지');
  await analyses.getByLabel('키워드로 결과 찾기').fill('AUTOMATION');assert.equal(await analyses.locator('tbody tr').count(),1);await analyses.getByRole('button',{name:'▦ 카드',exact:true}).click();assert.equal(await analyses.locator('table').count(),0);await analyses.getByLabel('키워드로 결과 찾기').fill('');assert.equal(await analyses.getByRole('button',{name:'삭제',exact:true}).count(),2);await analyses.getByRole('button',{name:'☰ 표',exact:true}).click();ok('분석 결과 검색·표/카드 전환');
  for(const button of [keywords.getByRole('button',{name:'삭제',exact:true}).first(),analyses.getByRole('button',{name:'삭제',exact:true}).first(),detail.getByTitle('이 분석 결과 삭제',{exact:true})]){
    const dialog=page.waitForEvent('dialog'),click=button.click();const confirm=await dialog;assert.equal(confirm.type(),'confirm');await confirm.dismiss();await click;
  }assert.equal(await page.evaluate(()=>window.fixture.deleted),0);ok('키워드·분석 목록·상세 이력 삭제 취소 시 액션 0');
  await keywords.getByRole('button',{name:'⚡ 지금 분석하기',exact:true}).first().click();await page.getByRole('heading',{name:'🔑 API 키 등록이 필요합니다',exact:true}).waitFor();await page.getByRole('button',{name:'닫기',exact:true}).click();ok('본인 SerpApi 키 필요 안내·닫기(분석 액션 모의)');
  await page.locator('#report-button button').click();await page.getByRole('heading',{name:'🔑 API 키 등록이 필요합니다',exact:true}).waitFor();await page.getByRole('button',{name:'닫기',exact:true}).click();ok('선택 Anthropic 키 필요 안내(생성 액션 모의)');
  assert.match(await detail.innerText(),/오전 08:30/);assert.equal(await detail.locator('table').count(),4);assert.match(await detail.innerText(),/합성 회사/);assert.equal(await detail.getByText('위험 링크',{exact:true}).evaluate(el=>el.tagName),'SPAN');ok('실제 결과 상세 4유형 표·회사 정보·한국 시각·비HTTP 링크 차단');
  await detail.getByRole('button',{name:'📋 리포트 복사',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'합성 경쟁사 분석 리포트 — 비용 없는 검수');ok('리포트 실제 클립보드 복사');
  await detail.getByRole('button',{name:'📋 리포트 복사',exact:true}).waitFor();await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:async()=>{throw new DOMException('Fixture denied','NotAllowedError');}}));await detail.getByRole('button',{name:'📋 리포트 복사',exact:true}).click();await detail.getByRole('status').filter({hasText:'복사하지 못했습니다.'}).waitFor();ok('복사 권한 거절 시 실패·수동 복사 안내');
  const iframe=detail.locator('iframe[title="HTML 리포트"]');assert.equal(await iframe.getAttribute('sandbox'),'');const frame=await iframe.elementHandle().then(el=>el.contentFrame());await frame.getByRole('heading',{name:'격리된 합성 리포트'}).waitFor();assert.equal(await page.evaluate(()=>window.fixture.compromised),false);ok('합성 HTML 리포트 sandbox 스크립트 차단');
  const tracked=page.locator('#competitors');assert.match(await tracked.innerText(),/2회/);await tracked.getByRole('button',{name:'✓ 내 경쟁사',exact:true}).click();await tracked.getByRole('button',{name:'+ 경쟁사로 표시',exact:true}).waitFor();ok('내 경쟁사 노출 횟수·표시 토글(쓰기 모의)');
  const queries=await page.evaluate(()=>window.fixture.queries.filter(q=>q.empty));assert.deepEqual(queries.map(q=>q.table),['competitor_serp_jobs','user_tracked_competitors']);assert.ok(queries.every(q=>q.filters.some(f=>f[1]==='user_id'&&f[2]==='fixture-member')));ok('빈 분석/경쟁사 화면은 후속 조회 생략·회원 한정');
  await page.screenshot({path:'docs/evidence/retention-v108-fixture-desktop.png',fullPage:true});await page.setViewportSize({width:375,height:812});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'375px fixture overflow');assert.ok(await detail.locator('div.overflow-x-auto').evaluateAll(els=>els.some(el=>el.scrollWidth>el.clientWidth)));ok('375px 채워진 결과·표 가로 넘침 없음·표 내부 스크롤');await page.screenshot({path:'docs/evidence/retention-v108-fixture-mobile.png',fullPage:true});
  await page.locator('#keyword-form input[name="keyword"]').fill('비동기 등록 검수');await page.locator('#keyword-form button[type="submit"]').click();await page.waitForFunction(()=>window.fixture.created===1&&window.fixture.refresh>=1);assert.equal(await page.locator('#keyword-form input[name="keyword"]').inputValue(),'');ok('비동기 키워드 등록 후 입력 초기화·새로고침(저장 모의)');
  assert.deepEqual(errors,[]);ok('페이지 오류 없음·실제 API/DB 호출 없음');
}catch(e){checks.push({name:'FAILED',passed:false,error:e.message});console.error('FAIL',e.message);process.exitCode=1;}
finally{await fs.writeFile('docs/evidence/retention-v108-browser-fixtures.json',JSON.stringify({browser:'Microsoft Edge (visible)',mode:'isolated actual components/pages, synthetic data and actions; not production auth/DB validation',checked_at:new Date().toISOString(),checks,errors,paid_calls:0},null,2));await context.close();await browser.close();await new Promise(r=>server.close(r));}
