// Real ordinary-member Next.js UI/API flow. No AI calls, key changes or member data writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
const base=process.env.WS_TEST_BASE||'http://localhost:3034';
const local=new URL(base).hostname==='localhost',mode=local?'local':'live';
const env={};for(const line of (await fs.readFile(path.resolve('../.env.local'),'utf8')).split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const url=env.NEXT_PUBLIC_SUPABASE_URL,pub=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY,opt={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY,opt),member=createClient(url,pub,opt);
const {data:link,error:le}=await admin.auth.admin.generateLink({type:'magiclink',email:'buylifemall@naver.com'});if(le)throw Error('Test member sign-in unavailable');
const {data:auth,error:ae}=await member.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token});if(ae)throw Error('Test member auth failed');
assert.equal(auth.user.email,'buylifemall@naver.com');
const {data:profile}=await member.from('profiles').select('is_admin').eq('id',auth.user.id).single();assert.equal(profile.is_admin,false);
const cookies=[];await createServerClient(url,pub,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}}).auth.setSession(auth.session);
const browser=await chromium.launch({channel:'msedge',headless:false});
const checks=[],errors=[],aiRequests=[],previewDiagnostics=[];let context;
const ok=name=>{checks.push({name,passed:true});console.log('PASS',name)};
await fs.mkdir('docs/evidence',{recursive:true});
try{
  context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const anon=[['POST','/api/crawl'],['GET','/api/proxy?url=https://example.com'],['GET','/api/proxy-image?url=https://example.com'],['GET','/api/user/key']];
  await Promise.all(anon.map(async([method,route])=>{const r=await context.request.fetch(base+route,{method,data:method==='POST'?{url:'https://example.com'}:undefined});assert.equal(r.status(),401,route);}));
  ok('비로그인 crawl/proxy/proxy-image/key 4개 API 401');
  await context.close();context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,domain:local?'localhost':'.buylife.xyz',path:'/',secure:!local,httpOnly:false,sameSite:'Lax'})));
  const internal=['http://127.0.0.1','http://[::ffff:7f00:1]','http://[fe90::1]','http://169.254.169.254'];
  await Promise.all(internal.map(async target=>{
    const results=await Promise.all([context.request.post(base+'/api/crawl',{data:{url:target}}),context.request.get(base+'/api/proxy?url='+encodeURIComponent(target)),context.request.get(base+'/api/proxy-image?url='+encodeURIComponent(target))]);
    for(const r of results)assert.equal(r.status(),400,target);
  }));ok('일반 회원 내부/IPv6 변형/metadata 주소 12개 요청 400');
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/refused.*(frame|display)|x-frame-options/i.test(m.text()))previewDiagnostics.push(m.text().slice(0,350))});
  page.on('response',r=>{if(new URL(r.url()).pathname==='/api/proxy'&&r.request().resourceType()==='document')previewDiagnostics.push('iframe HTTP '+r.status())});
  await page.route('https://generativelanguage.googleapis.com/**',route=>{aiRequests.push('blocked paid AI request');return route.abort();});
  const first=await page.goto(base,{waitUntil:'networkidle'});assert.equal(first.status(),200);
  await page.getByLabel('수집할 웹사이트 주소').waitFor();
  assert.match(await page.locator('aside').innerText(),/v1\.12/);assert.match(await page.locator('aside').innerText(),/buylifemall@naver\.com/);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 17, 21)');
  assert.equal(await page.locator('.mx-card').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(23, 26, 33)');
  ok('일반 회원·v1.12·Tailwind v4 @theme 실제 색상');
  await page.getByLabel('수집할 웹사이트 주소').fill('https://www.buylife.xyz/programs');
  const response=page.waitForResponse(r=>r.url()===base+'/api/crawl'&&r.request().method()==='POST');
  await page.getByRole('button',{name:'⚡ 크롤링 시작',exact:true}).click();const crawl=await response;assert.equal(crawl.status(),200);const data=await crawl.json();assert.ok(data.links.length>0);assert.ok(data.structure.h1.length>0);await page.getByRole('tab',{name:/^개요/}).waitFor();
  assert.equal(await page.locator('.mx-kpi').count(),4);ok('실제 공개 AIMaster 페이지 크롤링·헤딩/링크·KPI 4개');
  const image=await context.request.get(base+'/api/proxy-image?url='+encodeURIComponent(data.images[0].src));assert.equal(image.status(),200);assert.match(image.headers()['content-type'],/^image\//);assert.equal(image.headers()['content-security-policy'],"default-src 'none'; sandbox");assert.ok((await image.body()).length>0);
  assert.equal((await context.request.get(base+'/api/proxy-image?url=https://example.com')).status(),415);ok('실제 이미지 프록시·SVG 포함 격리 헤더·HTML 응답 415');
  for(const label of ['개요','AI 분석','구조','글목록','표','링크','이미지']){
    const tab=page.getByRole('tab',{name:new RegExp('^'+label)});await tab.click();assert.equal(await tab.getAttribute('aria-selected'),'true');
  }ok('7개 탭 실제 전환·AI 미실행');
  await page.getByRole('tab',{name:/^링크/}).click();await page.getByRole('textbox',{name:'🔎 링크 텍스트·주소 검색',exact:true}).fill('NO_SUCH_LINK_FIXTURE_2026');
  assert.equal(await page.locator('main tbody tr').count(),0);await page.getByRole('textbox',{name:'🔎 링크 텍스트·주소 검색',exact:true}).fill('');
  ok('실제 링크 검색·초기화');
  await page.screenshot({path:`docs/evidence/${mode}-desktop.png`});
  const proxy=await context.request.get(base+'/api/proxy?url=https://example.com');assert.equal(proxy.status(),200);assert.match(proxy.headers()['content-security-policy'],/sandbox allow-scripts/);const preview=await proxy.text();
  await page.getByLabel('수집할 웹사이트 주소').fill('https://example.com');
  await page.getByRole('button',{name:'시각적 섹터 선택',exact:true}).click();
  const iframe=page.locator('iframe[title="웹사이트 시각적 미리보기"]');assert.equal(await iframe.getAttribute('sandbox'),'allow-scripts');
  const frame=await iframe.elementHandle().then(el=>el.contentFrame());await frame.waitForURL('**/api/proxy?**');await frame.locator('body').waitFor();await frame.waitForFunction(()=>Boolean(document.title));assert.equal(await frame.title(),preview.match(/<title>(.*?)<\/title>/i)?.[1]);
  assert.equal(await frame.evaluate(()=>{try{localStorage.getItem('website_scraper_settings_v1');return false}catch{return true}}),true);
  await page.evaluate(()=>window.postMessage({type:'AIS_SECTOR_SELECTED',tagName:'FAKE',html:'FORGED-PARENT',text:'FORGED-PARENT'},'*'));await page.waitForTimeout(100);assert.ok(!(await page.locator('body').innerText()).includes('FORGED-PARENT'));
  ok('실제 proxy CSP·iframe 격리·저장소 접근 차단·부모 위조 메시지 무시');
  await frame.evaluate(()=>{document.body.innerHTML='<article id="container"><span id="leaf">Alpha fixture</span><a id="nav" href="https://example.com/next">Go next</a></article>';});
  await frame.locator('#leaf').click();await page.locator('pre').filter({hasText:'id="leaf"'}).waitFor();
  await frame.locator('#leaf').click({modifiers:['Shift']});await page.locator('pre').filter({hasText:'id="container"'}).waitFor();
  await page.route('**/api/proxy?**',route=>new URL(route.request().url()).searchParams.get('url')==='https://example.com/next'?route.fulfill({status:200,contentType:'text/html',headers:{'content-security-policy':'sandbox allow-scripts'},body:preview}):route.continue());
  await page.route('**/api/crawl',route=>route.request().postDataJSON()?.url==='https://example.com/next'?route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...data,metadata:{...data.metadata,url:'https://example.com/next'}})}):route.continue());
  await frame.locator('#nav').click({modifiers:['Control']});await page.waitForFunction(()=>document.querySelector('iframe')?.getAttribute('src')?.includes(encodeURIComponent('https://example.com/next')));
  ok('실제 선택 스크립트 클릭/Shift 부모/Ctrl 이동(iframe DOM만 합성, 이동 응답 모의)');
  await page.locator('button[aria-label="닫기"]').click();
  await page.getByRole('button',{name:'⚡ 크롤링 시작',exact:true}).waitFor();
  await page.setViewportSize({width:375,height:812});await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();await page.getByRole('button',{name:'메뉴 닫기',exact:true}).waitFor();await page.getByRole('button',{name:'메뉴 닫기',exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  ok('375px 본문 가로 넘침 없음·모바일 서랍 열기/닫기');await page.screenshot({path:`docs/evidence/${mode}-mobile.png`});
  await page.getByRole('button',{name:'시각적 섹터 선택',exact:true}).click();await page.locator('iframe').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('button[aria-label="닫기"]').click();ok('375px 섹터 모달 세로 배치·가로 넘침 없음');
  await page.goto(base+'/guide',{waitUntil:'networkidle'});assert.match(await page.locator('main').innerText(),/Shift/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`docs/evidence/${mode}-guide-mobile.png`,fullPage:true});ok('실제 /guide·375px 매뉴얼');
  // Rich list/table search + download use a synthetic crawl response, never user DB writes.
  const fixture={metadata:{title:'검수 데이터',description:'합성 검수',charset:'utf-8',statusCode:200,url:'https://example.com/'},structure:{h1:[{text:'검수 제목'}],h2:[{text:'소제목'}],h3:[]},stats:{payloadSizeKb:1,linksCount:2,imagesCount:0,tablesCount:1,listItemsCount:2,charset:'utf-8'},links:[{text:'검수 Alpha',href:'https://example.com/a'},{text:'검수 Beta',href:'https://example.com/b'}],images:[],tables:[{headers:['이름','값'],rows:[['가나다','1'],['라마바','2']]}],listItems:[{title:'검수 글 Alpha',text:'첫 글',link:'https://example.com/a'},{title:'검수 글 Beta',text:'둘째 글',link:'https://example.com/b'}],rawLength:100,cleanedHtml:'<h1>검수</h1>'};
  await page.route('**/api/crawl',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));await page.goto(base,{waitUntil:'networkidle'});await page.getByLabel('수집할 웹사이트 주소').fill('https://example.com');await page.getByRole('button',{name:'⚡ 크롤링 시작',exact:true}).click();await page.getByRole('tab',{name:/^글목록/}).click();await page.getByRole('textbox',{name:'🔎 글목록 검색',exact:true}).fill('Alpha');assert.ok((await page.locator('main').innerText()).includes('검수 글 Alpha'));assert.ok(!(await page.locator('main').innerText()).includes('검수 글 Beta'));
  await page.getByRole('tab',{name:/^표/}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:/CSV/}).first().click();const file=await download;assert.match(file.suggestedFilename(),/\.csv$/);assert.match(await fs.readFile(await file.path(),'utf8'),/가나다/);ok('합성 데이터 글목록 검색·표 CSV 실제 다운로드');
  let saved=0;await page.route('**/api/user/key',route=>route.request().method()==='POST'?(saved++,route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'})):route.continue());await page.goto(base+'/?settings=1',{waitUntil:'networkidle'});await page.getByRole('button',{name:'설정 저장',exact:true}).waitFor();await page.getByRole('button',{name:'설정 저장',exact:true}).click();await page.getByRole('button',{name:'설정 저장',exact:true}).waitFor({state:'hidden'});ok('설정 저장·로컬 반영(키 POST 모의, 실제 키 변경 없음)');
  assert.deepEqual(aiRequests,[]);assert.deepEqual(errors,[]);ok('유료 AI 요청·메인 페이지 오류 없음');
}catch(e){checks.push({name:'FAILED',passed:false,error:String(e.message).replace(/(?:AIza[\w-]+|sb_(?:secret|publishable)_[\w-]+)/g,'[redacted]')});console.error('FAIL',checks.at(-1).error);process.exitCode=1;}
finally{await fs.writeFile(`docs/evidence/runtime-${mode}.json`,JSON.stringify({base,browser:'Microsoft Edge (visible)',member:'buylifemall@naver.com',member_is_admin:false,checked_at:new Date().toISOString(),checks,errors:errors.map(e=>e.replace(/AIza[\w-]+/g,'[redacted]')),paid_ai_calls:0},null,2));await context?.close();await browser.close();}
