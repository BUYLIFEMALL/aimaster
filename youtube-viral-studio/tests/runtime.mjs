// Actual ordinary member, fresh visible Edge. Auto-search is fulfilled in-browser.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const base=process.env.YVS_TEST_BASE||'http://127.0.0.1:3028',live=new URL(base).hostname.endsWith('buylife.xyz'),mode=live?'live':'local';
const env={};for(const line of (await fs.readFile(path.resolve('../.env.local'),'utf8')).split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const url=env.NEXT_PUBLIC_SUPABASE_URL,pub=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()||env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),secret=env.SUPABASE_SECRET_KEY?.trim()||env.SUPABASE_SERVICE_ROLE_KEY?.trim();
assert.equal(new URL(url).hostname,'esgxyikcnnvmlhygjkth.supabase.co');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,secret,options),member=createClient(url,pub,options),email='buylifemall@naver.com';
const {data:link,error:le}=await admin.auth.admin.generateLink({type:'magiclink',email});assert.equal(le,null);
const {data:auth,error:ae}=await member.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token});assert.equal(ae,null);assert.equal(auth.user.email,email);
const {data:profile}=await member.from('profiles').select('is_admin').eq('id',auth.user.id).single();assert.equal(profile?.is_admin,false);
const cookies=[];await createServerClient(url,pub,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}}).auth.setSession(auth.session);
const checks=[],errors=[],blocked=[],mocked=[],responses=[],apiFailures=[];
const ok=name=>{checks.push({name,passed:true});console.log('PASS',name);};
const browser=await chromium.launch({channel:'msedge',headless:false});let context,page;
const pages=['/dashboard','/viral-shorts','/golden-channels','/trending-videos','/source-finder','/favorites','/settings','/guide'];
const automatic=new Set(['/api/youtube/search-shorts','/api/youtube/golden-channels','/api/youtube/trending']);
await fs.mkdir('docs/evidence',{recursive:true});await fs.mkdir('.vercel',{recursive:true});
async function goto(route){const r=await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(r.status(),200,route);await page.locator('main h1').waitFor();}
async function shot(name){await page.screenshot({path:`docs/evidence/v114/${mode}-${name}.png`,fullPage:true});}
try{
 context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();await page.goto(base+'/dashboard',{waitUntil:'networkidle'});assert.match(page.url(),/\/login\?redirect=/);ok('비로그인 차단·로그인 복귀 경로');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 15, 15)');await page.getByRole('button',{name:'회원가입',exact:true}).click();assert.match(await page.locator('body').innerText(),/AIMaster/);await page.getByRole('button',{name:'로그인',exact:true}).click();await shot('login-1440');await page.setViewportSize({width:375,height:812});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('login-375');ok('로그인·가입 탭 다크 1440/375');await context.close();
 context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,domain:new URL(base).hostname,path:'/',secure:live,httpOnly:false,sameSite:'Lax'})));
 await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==new URL(base).origin){blocked.push({method:req.method(),path:u.hostname+u.pathname});return route.abort();}if(req.method()==='POST'&&automatic.has(u.pathname)){mocked.push(u.pathname);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});}if(!['GET','HEAD'].includes(req.method())){blocked.push({method:req.method(),path:u.pathname});return route.abort();}if(u.pathname.startsWith('/api/')&&u.pathname!=='/api/settings/api-keys'&&u.pathname!=='/api/favorites'){blocked.push({method:req.method(),path:u.pathname});return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base+'/api/settings')){responses.push(r.status());if(!r.ok())apiFailures.push(r.status());}});
 await goto('/');assert.equal(new URL(page.url()).pathname,'/dashboard');assert.match(await page.locator('aside').innerText(),/v1\.14/);assert.match(await page.locator('aside').innerText(),/buylifemall@naver\.com/);assert.equal(await page.locator('main a.group').count(),4);assert.equal(await page.locator('main ul li').count(),2);assert.match(await page.locator('main').innerText(),/영상 0 · 채널 0/);assert.equal(mocked.length,0);ok('일반 회원·v1.14·대시보드 기능4/연결2·검색 요청0');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 15, 15)');assert.equal(await page.locator('.yt-card').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(24, 24, 24)');await shot('dashboard-1440');ok('실제 유튜브 다크·카드 색');
 for(const route of pages.slice(1)){
  await goto(route);assert.ok((await page.locator('main h1').innerText()).length>0);
  if(route==='/favorites'){assert.match(await page.locator('main').innerText(),/0/);await page.getByRole('button',{name:/채널/}).first().click();}
  if(route==='/settings'){const body=await page.locator('main').innerText();for(const name of ['YouTube','Gemini','OpenAI'])assert.ok(body.includes(name));assert.equal(await page.locator('main input[type="password"]').count(),3);await shot('settings-1440');}
  if(route==='/guide'){assert.match(await page.locator('main').innerText(),/VPH/);assert.match(await page.locator('main').innerText(),/vsRatio/);for(const d of await page.locator('main details').all()){await d.locator('summary').click();assert.equal(await d.evaluate(e=>e.open),true);}await shot('guide-1440');}
 }ok('8개 회원 화면·설정 키3종·가이드·즐겨찾기 빈 탭');
 assert.deepEqual(mocked,[]);ok('페이지 진입·이동에서 유튜브 자동 검색 요청0');
 for(const route of pages){await page.setViewportSize({width:375,height:812});await goto(route);assert.equal(await page.locator('aside').isVisible(),false);await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();const header=page.locator('header');for(const href of pages)assert.equal(await header.locator(`a[href="${href}"]`).count(),href==='/dashboard'?2:1);assert.match(await header.innerText(),/buylifemall@naver\.com/);assert.equal(await page.getByRole('button',{name:'메뉴 닫기',exact:true}).getAttribute('aria-expanded'),'true');await page.getByRole('button',{name:'메뉴 닫기',exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' horizontal overflow');if(['/dashboard','/settings','/guide','/viral-shorts'].includes(route))await shot(route.slice(1)+'-375');}ok('375px 8개 화면·메뉴8항목/계정·가로 넘침 없음');
 await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();await page.locator('header a[href="/favorites"]').click();await page.getByRole('heading',{name:'즐겨찾기 보관함',exact:true}).waitFor();await page.getByRole('button',{name:'메뉴 열기',exact:true}).waitFor();ok('모바일 메뉴 이동 후 자동 닫힘');
 assert.ok(responses.length>0);assert.deepEqual(apiFailures,[]);assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);ok('실제 회원 키 상태 GET200·외부 API/쓰기·페이지 오류0');
}catch(e){checks.push({name:'FAILED',passed:false,error:e.message});console.error(e.stack);process.exitCode=1;await page?.screenshot({path:`.vercel/${mode}-failure.png`,fullPage:true}).catch(()=>{});}
finally{await fs.writeFile(`docs/evidence/v114/runtime-${mode}.json`,JSON.stringify({base,browser:'Microsoft Edge visible',member:email,is_admin:false,version:'v1.14',checked_at:new Date().toISOString(),checks,errors,blocked,mocked_auto_search:mocked,settings_get_statuses:responses,external_api_calls:0,paid_calls:0,settings_writes:0,limitations:'Real search/AI not executed; no automatic YouTube search requests expected or observed.'},null,2));await context?.close();await browser.close();}
