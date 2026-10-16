// Actual member and production auth. Detail GET/prefetch and all writes are forbidden.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const base=process.env.RE_TEST_BASE||'http://127.0.0.1:3036',live=new URL(base).hostname.endsWith('buylife.xyz'),mode=live?'live':'local';
const env={};for(const line of (await fs.readFile(path.resolve('../.env.local'),'utf8')).split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const url=env.NEXT_PUBLIC_SUPABASE_URL,pub=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()||env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),secret=env.SUPABASE_SECRET_KEY?.trim()||env.SUPABASE_SERVICE_ROLE_KEY?.trim();
assert.equal(new URL(url).hostname,'esgxyikcnnvmlhygjkth.supabase.co');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,secret,options),member=createClient(url,pub,options),email='buylifemall@naver.com';
const {data:link,error:le}=await admin.auth.admin.generateLink({type:'magiclink',email});assert.equal(le,null);
const {data:auth,error:ae}=await member.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token});assert.equal(ae,null);assert.equal(auth.user.email,email);
const {data:profile}=await member.from('profiles').select('is_admin').eq('id',auth.user.id).single();assert.equal(profile?.is_admin,false);
const tables=['real_estate_watch_districts','real_estate_user_matches','real_estate_analyses','real_estate_user_preferences'];
async function counts(){return Promise.all(tables.map(async t=>{const {count,error}=await member.from(t).select('user_id',{count:'exact',head:true}).eq('user_id',auth.user.id);if(error)throw Error('Member count failed '+t);return count;}));}
const before=await counts(),cookies=[];await createServerClient(url,pub,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}}).auth.setSession(auth.session);
const checks=[],errors=[],writes=[],detailBlocks=[];let after=null,context,page;
const ok=name=>{checks.push({name,passed:true});console.log('PASS',name);};
const browser=await chromium.launch({channel:'msedge',headless:false});await fs.mkdir('docs/evidence',{recursive:true});
async function goto(route){const r=await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(r.status(),200,route);await page.locator(route==='/signup'?'body':'main').waitFor();await page.evaluate(()=>scrollTo(0,0));}
async function shot(name){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`docs/evidence/${mode}-${name}.png`,fullPage:true});}
try{
  context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();await page.goto(base+'/dashboard',{waitUntil:'networkidle'});assert.match(page.url(),/\/login\?redirect=/);ok('비로그인 접근 차단·복귀 경로');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 17, 21)');await shot('login-1440');
  await goto('/signup');assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 17, 21)');assert.match(await page.locator('body').innerText(),/AIMaster/);ok('로그인·회원가입 블랙 테마·통합 가입 안내');await context.close();
  context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,domain:new URL(base).hostname,path:'/',secure:live,httpOnly:false,sameSite:'Lax'})));
  await context.route('**/*',route=>{const request=route.request(),p=new URL(request.url()).pathname;
    if(/^\/listings\/[^/]+\/?$/.test(p)){detailBlocks.push(p);return route.abort();}
    if(!['GET','HEAD'].includes(request.method())){writes.push(p);return route.abort();}return route.continue();});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await goto('/');assert.equal(new URL(page.url()).pathname,'/dashboard');
  assert.match(await page.locator('aside').innerText(),/v1\.11/);assert.match(await page.locator('aside').innerText(),/buylifemall@naver\.com/);assert.equal(await page.locator('.mx-kpi').count(),4);ok('일반 회원·v1.11·대시보드 지표4종');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 17, 21)');assert.equal(await page.locator('.mx-card').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(23, 26, 33)');
  const tokens=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return ['--color-gold','--color-dark','--color-dark-50'].map(k=>s.getPropertyValue(k).trim());});assert.deepEqual(tokens,['#2563eb','#0f1115','#171a21']);ok('Tailwind v4 실제 블랙/카드 색·옛 gold/dark 토큰 재연결');await shot('dashboard-1440');
  for(const route of ['/districts','/listings','/settings','/guide']){
    await goto(route);await page.locator('main h1').waitFor();
    if(route==='/districts'){assert.ok(await page.getByRole('button',{name:/강남구/}).count());assert.ok(await page.getByRole('button',{name:/종로구/}).count());if(before[0]>0){assert.match(await page.locator('main').innerText(),/예약 조회/);assert.ok(await page.getByRole('button',{name:'지금 조회하기',exact:true}).count());}await shot('districts-1440');}
    if(route==='/listings')assert.match(await page.locator('main').innerText(),/최근 50건/);
    if(route==='/settings')assert.match(await page.locator('main').innerText(),/OpenAI/);
    if(route==='/guide'){assert.equal(await page.locator('main details').count(),4);const faq=page.locator('main details').first();await faq.locator('summary').click();assert.equal(await faq.evaluate(e=>e.open),true);await faq.locator('summary').click();await shot('guide-1440');}
  }ok('관심 지역·목록·설정·매뉴얼 FAQ·유료/저장 버튼 미실행');
  // Prove the test guard itself blocks an attempted detail fetch before the server.
  assert.equal(await page.evaluate(async()=>{try{await fetch('/listings/test-cost-guard');return false;}catch{return true;}}),true);assert.ok(detailBlocks.includes('/listings/test-cost-guard'));ok('서버 자동 분석을 부르는 상세 GET·prefetch 검사기 차단');
  for(const route of ['/dashboard','/districts','/listings','/settings','/guide']){
    await page.setViewportSize({width:375,height:812});await goto(route);assert.equal(await page.locator('aside').isVisible(),false,route);
    await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();const bar=page.getByRole('button',{name:'메뉴 닫기',exact:true}).locator('..').locator('..');assert.match(await bar.innerText(),/buylifemall@naver\.com/);await page.getByRole('button',{name:'메뉴 닫기',exact:true}).click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow');if(['/dashboard','/guide'].includes(route))await shot(route.slice(1)+'-375');
  }ok('375px 5개 회원 화면·접는 메뉴/계정·가로 넘침 없음');
  await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();const a=page.locator('a[href="/districts"]:visible').first();await a.click();await page.getByRole('heading',{name:'관심 지역 설정',exact:true}).waitFor();await page.getByRole('button',{name:'메뉴 열기',exact:true}).waitFor();ok('휴대폰 메뉴 이동 후 자동 닫힘');
  after=await counts();assert.deepEqual(after,before);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);ok('회원 데이터 수 유지·쓰기/유료 호출·페이지 오류0');
}catch(e){checks.push({name:'FAILED',passed:false,error:e.message});console.error('FAIL',e.message);process.exitCode=1;if(page)await page.screenshot({path:`docs/evidence/${mode}-failure.png`,fullPage:true}).catch(()=>{});}
finally{await fs.writeFile(`docs/evidence/runtime-${mode}.json`,JSON.stringify({base,browser:'Microsoft Edge (visible)',member:email,member_is_admin:false,version:'v1.11',checked_at:new Date().toISOString(),checks,counts_before:before,counts_after:after,writes,detailBlocks,errors,paid_calls:0,actual_detail_visited:false},null,2));await context?.close();await browser.close();}
