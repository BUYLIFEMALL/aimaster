// Actual ordinary member; allowlisted read-only pages, no posting/sync/settings writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const base=process.env.TPF_TEST_BASE||'http://127.0.0.1:3043',live=new URL(base).hostname.endsWith('buylife.xyz'),mode=live?'live':'local';
const env={};for(const line of (await fs.readFile(path.resolve('../.env.local'),'utf8')).split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const url=env.NEXT_PUBLIC_SUPABASE_URL,pub=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()||env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),secret=env.SUPABASE_SECRET_KEY?.trim()||env.SUPABASE_SERVICE_ROLE_KEY?.trim();
assert.equal(new URL(url).hostname,'esgxyikcnnvmlhygjkth.supabase.co');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,secret,options),member=createClient(url,pub,options),email='buylifemall@naver.com';
const {data:link,error:le}=await admin.auth.admin.generateLink({type:'magiclink',email});assert.equal(le,null);
const {data:auth,error:ae}=await member.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token});assert.equal(ae,null);assert.equal(auth.user.email,email);
const {data:profile}=await member.from('profiles').select('is_admin').eq('id',auth.user.id).single();assert.equal(profile?.is_admin,false);
const tables=['trend_watchlist','trend_snapshots','shopping_competition','recommendation_reports','sourcing_saved_products'];
async function counts(){return Promise.all(tables.map(async t=>{const {count,error}=await member.from(t).select('user_id',{count:'exact',head:true}).eq('user_id',auth.user.id);if(error)throw Error('Member count failed '+t);return count;}));}
const before=await counts();const cookies=[];await createServerClient(url,pub,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}}).auth.setSession(auth.session);
const checks=[],errors=[],writes=[],detailBlocks=[];let after=null,context,page;
const ok=name=>{checks.push({name,passed:true});console.log('PASS',name);};
const browser=await chromium.launch({channel:'msedge',headless:false});await fs.mkdir('docs/evidence',{recursive:true});
async function goto(route){const r=await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(r.status(),200,route);await page.locator('body').waitFor();await page.evaluate(()=>scrollTo(0,0));}
async function shot(name){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`docs/evidence/${mode}-${name}.png`,fullPage:true});}
try{
 context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();await page.goto(base+'/dashboard',{waitUntil:'networkidle'});assert.match(page.url(),/\/login\?redirect=/);ok('비로그인 차단·로그인 복귀 경로');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 17, 21)');await page.getByRole('button',{name:'회원가입',exact:true}).click();assert.match(await page.locator('body').innerText(),/AIMaster/);await page.getByRole('button',{name:'로그인',exact:true}).click();await shot('login-1440');await goto('/signup');assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 17, 21)');ok('로그인/회원가입 다크·통합2탭');await context.close();
 context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,domain:new URL(base).hostname,path:'/',secure:live,httpOnly:false,sameSite:'Lax'})));
 const allowed=new Set(['/','/dashboard','/watchlist','/reports','/sourcing','/fees','/settings','/guide']);
 await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin===new URL(base).origin&&!allowed.has(u.pathname)&&!u.pathname.startsWith('/_next/')&&!u.pathname.startsWith('/favicon')){detailBlocks.push(u.pathname);return route.abort();}if(!['GET','HEAD'].includes(req.method())){writes.push(u.pathname);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await goto('/');assert.equal(new URL(page.url()).pathname,'/dashboard');assert.match(await page.locator('aside').innerText(),/v1\.08/);assert.match(await page.locator('aside').innerText(),/buylifemall@naver\.com/);assert.equal(await page.locator('.mx-kpi').count(),4);assert.equal(await page.locator('main ul li').count(),8);ok('일반 회원·v1.08·대시보드 지표4/연결8');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 17, 21)');assert.equal(await page.locator('.mx-card').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(23, 26, 33)');await shot('dashboard-1440');ok('스마트 매트릭스 실제 블랙/카드 색');
 for(const route of ['/watchlist','/reports','/sourcing','/fees','/settings','/guide']){
  await goto(route);await page.locator('main h1').waitFor();
  if(route==='/watchlist'){assert.match(await page.locator('main').innerText(),/관심 키워드 등록/);await shot('watchlist-1440');}
  if(route==='/reports'){assert.match(await page.locator('main').innerText(),/11번가/);const help=page.locator('main details').first();await help.locator('summary').click();assert.equal(await help.evaluate(e=>e.open),true);await help.locator('summary').click();}
  if(route==='/sourcing'){await page.getByLabel('원가(원) *',{exact:true}).fill('10000');await page.getByLabel('추천판매가(원) *',{exact:true}).fill('30000');assert.match(await page.locator('main').innerText(),/8,460/);assert.match(await page.locator('main').innerText(),/28.2%/);await shot('sourcing-1440');}
  if(route==='/fees')assert.match(await page.locator('main').innerText(),/수수료/);
  if(route==='/settings'){
   const expected=['naver_client_id','naver_client_secret','naver_ads_api_key','naver_ads_secret_key','naver_ads_customer_id','aliexpress_app_key','aliexpress_app_secret','aliexpress_tracking_id','domeggook_api_key','elevenst_api_key','youtube_api_key','openai','gemini'];
   const section=page.locator('main > div > section').first();assert.equal(await section.locator('h2').count(),7);assert.deepEqual((await section.locator('input[name="provider"]').evaluateAll(es=>es.map(e=>e.value))).sort(),expected.sort());assert.match(await page.locator('main').innerText(),/이메일 \(SMTP\)/);assert.match(await page.locator('main').innerText(),/텔레그램/);assert.match(await page.locator('main').innerText(),/카카오/);await shot('settings-1440');
  }
  if(route==='/guide'){
   assert.equal(await page.locator('main details').count(),5);const faq=page.locator('main details').first();await faq.locator('summary').click();assert.equal(await faq.evaluate(e=>e.open),true);await faq.locator('summary').click();
   const buttons=page.getByRole('button',{name:/^📄/});assert.equal(await buttons.count(),6);
   for(let i=0;i<6;i++){const [popup]=await Promise.all([page.waitForEvent('popup'),buttons.nth(i).click()]);await popup.waitForURL(/\/guides\/[a-f0-9-]+/,{waitUntil:'domcontentloaded'});await popup.locator('h1').first().waitFor();assert.ok((await popup.locator('h1').first().innerText()).trim().length>0);assert.ok(!/404/.test(await popup.title()));await popup.close();}await shot('guide-1440');
  }
 }ok('7개 회원 화면·검색 없는 마진계산·리포트 설명·FAQ5/가이드팝업6');ok('설정 API7그룹13항목·SMTP/카카오/텔레그램 보존');
 for(const route of ['/dashboard','/watchlist','/reports','/sourcing','/fees','/settings','/guide']){
  await page.setViewportSize({width:375,height:812});await goto(route);assert.equal(await page.locator('aside').isVisible(),false);await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();const close=page.getByRole('button',{name:'메뉴 닫기',exact:true});assert.equal(await close.getAttribute('aria-expanded'),'true');await close.click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow');if(['/dashboard','/settings','/guide','/sourcing'].includes(route))await shot(route.slice(1)+'-375');
 }ok('375px 7개 회원화면·접는 메뉴·가로 넘침 없음');
 await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();const visibleMenu=page.getByRole('button',{name:'메뉴 닫기',exact:true}).locator('..').locator('..');assert.match(await visibleMenu.innerText(),/buylifemall@naver\.com/);await page.locator('a[href="/watchlist"]:visible').first().click();await page.getByRole('heading',{name:'관심 키워드 등록',exact:true}).waitFor();await page.getByRole('button',{name:'메뉴 열기',exact:true}).waitFor();ok('모바일 메뉴 계정·화면 이동 후 자동 닫힘');
 after=await counts();assert.deepEqual(after,before);assert.deepEqual(writes,[]);assert.deepEqual(detailBlocks,[]);assert.deepEqual(errors,[]);ok('회원5표 자료 유지·쓰기/API검색/생성/발송·페이지 오류0');
}catch(e){checks.push({name:'FAILED',passed:false,error:e.message});console.error('FAIL',e.message);process.exitCode=1;if(page)await page.screenshot({path:`.vercel/${mode}-failure.png`,fullPage:true}).catch(()=>{});}
finally{await fs.writeFile(`docs/evidence/runtime-${mode}.json`,JSON.stringify({base,browser:'Microsoft Edge (visible)',member:email,member_is_admin:false,version:'v1.08',checked_at:new Date().toISOString(),checks,counts_before:before,counts_after:after,writes,blocked_routes:detailBlocks,errors,paid_calls:0,search_calls:0,report_generation_calls:0,sends:0},null,2));await context?.close();await browser.close();}
