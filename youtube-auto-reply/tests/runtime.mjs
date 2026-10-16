// Actual ordinary member; allowlisted read-only pages, no posting/sync/settings writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const base=process.env.YT_TEST_BASE||'http://127.0.0.1:3048',live=new URL(base).hostname.endsWith('buylife.xyz'),mode=live?'live':'local';
const env={};for(const line of (await fs.readFile(path.resolve('../.env.local'),'utf8')).split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const url=env.NEXT_PUBLIC_SUPABASE_URL,pub=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()||env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),secret=env.SUPABASE_SECRET_KEY?.trim()||env.SUPABASE_SERVICE_ROLE_KEY?.trim();
assert.equal(new URL(url).hostname,'esgxyikcnnvmlhygjkth.supabase.co');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,secret,options),member=createClient(url,pub,options),email='buylifemall@naver.com';
const {data:link,error:le}=await admin.auth.admin.generateLink({type:'magiclink',email});assert.equal(le,null);
const {data:auth,error:ae}=await member.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token});assert.equal(ae,null);assert.equal(auth.user.email,email);
const {data:profile}=await member.from('profiles').select('is_admin').eq('id',auth.user.id).single();assert.equal(profile?.is_admin,false);
const tables=['ytreply_accounts','ytreply_videos','ytreply_comments','ytreply_settings'];
async function counts(){return Promise.all(tables.map(async t=>{const {count,error}=await member.from(t).select('user_id',{count:'exact',head:true}).eq('user_id',auth.user.id);if(error)throw Error('Member count failed '+t);return count;}));}
const before=await counts();assert.equal(before[0],0,'Settings GET is safe only for an unconnected test member');const cookies=[];await createServerClient(url,pub,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}}).auth.setSession(auth.session);
const checks=[],errors=[],writes=[],detailBlocks=[];let after=null,context,page;
const ok=name=>{checks.push({name,passed:true});console.log('PASS',name);};
const browser=await chromium.launch({channel:'msedge',headless:false});await fs.mkdir('docs/evidence',{recursive:true});
async function goto(route){const r=await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(r.status(),200,route);await page.locator('body').waitFor();await page.evaluate(()=>scrollTo(0,0));}
async function shot(name){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`docs/evidence/${mode}-${name}.png`,fullPage:true});}
try{
  context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();
  await page.goto(base+'/dashboard',{waitUntil:'networkidle'});assert.match(page.url(),/\/login\?redirect=/);ok('비로그인 보호 화면·로그인 복귀 경로');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 15, 15)');
  await page.getByRole('button',{name:'회원가입',exact:true}).click();assert.match(await page.locator('body').innerText(),/AIMaster/);await page.getByRole('button',{name:'로그인',exact:true}).click();await shot('login-1440');
  await goto('/signup');assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 15, 15)');ok('로그인/가입 다크·2탭·통합 가입 안내');await context.close();
  context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,domain:new URL(base).hostname,path:'/',secure:live,httpOnly:false,sameSite:'Lax'})));
  const allowed=new Set(['/','/dashboard','/videos','/comments','/history','/settings','/guide']);
  await context.route('**/*',route=>{const request=route.request(),u=new URL(request.url());
    if(u.origin===new URL(base).origin&&!allowed.has(u.pathname)&&!u.pathname.startsWith('/_next/')&&!u.pathname.startsWith('/favicon')){detailBlocks.push(u.pathname);return route.abort();}
    if(!['GET','HEAD'].includes(request.method())){writes.push(u.pathname);return route.abort();}return route.continue();});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await goto('/');assert.equal(new URL(page.url()).pathname,'/dashboard');
  assert.match(await page.locator('aside').innerText(),/v1\.09/);assert.match(await page.locator('aside').innerText(),/buylifemall@naver\.com/);assert.equal(await page.locator('main .grid.lg\\:grid-cols-4 > div').count(),4);ok('일반 회원·v1.09·첫 대시보드·지표4종');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(15, 15, 15)');assert.equal(await page.locator('.yt-card').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(24, 24, 24)');
  assert.equal(await page.locator('.yt-btn-red').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 0, 0)');
  assert.equal(await page.locator('aside a[href="/dashboard"] span.bg-yt-red').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 0, 0)');ok('실제 다크·카드·유튜브 레드·활성 메뉴 막대');await shot('dashboard-1440');
  for(const route of ['/videos','/comments','/history','/settings','/guide']){
    await goto(route);await page.locator('main h1').waitFor();
    if(route==='/videos'){assert.match(await page.locator('main').innerText(),/동기화한 영상이 없습니다/);assert.ok(await page.getByRole('button',{name:/동기화/}).count());}
    if(route==='/comments'){assert.match(await page.locator('main').innerText(),/검토 대기 중인 댓글이 없습니다/);assert.ok(await page.getByRole('button',{name:/새 댓글 확인/}).count());}
    if(route==='/history')assert.match(await page.locator('main').innerText(),/게시된 답글이 없습니다/);
    if(route==='/settings'){assert.match(await page.locator('main').innerText(),/Google OAuth Client ID/);assert.ok((await page.locator('code').filter({hasText:'/api/youtube/callback'}).count())>=1);await shot('settings-1440');}
    if(route==='/guide'){
      assert.equal(await page.locator('main details').count(),5);const faq=page.locator('main details').first();await faq.locator('summary').click();assert.equal(await faq.evaluate(e=>e.open),true);await faq.locator('summary').click();
      const guideButtons=page.getByRole('button',{name:/^📄/});assert.equal(await guideButtons.count(),5);
      for(let i=0;i<5;i++){const [popup]=await Promise.all([page.waitForEvent('popup'),guideButtons.nth(i).click()]);await popup.waitForURL(/\/guides\/[a-f0-9-]+/,{waitUntil:'domcontentloaded'});assert.match(popup.url(),/\/guides\/[a-f0-9-]+/);assert.equal(await popup.locator('body').count(),1);await popup.close();}await shot('guide-1440');
    }
  }ok('영상·댓글·이력 빈 상태·설정 콜백 안내·매뉴얼 FAQ5/연결 안내5팝업');
  for(const route of ['/dashboard','/videos','/comments','/history','/settings','/guide']){
    await page.setViewportSize({width:375,height:812});await goto(route);assert.equal(await page.locator('aside').isVisible(),false,route);
    const button=page.getByRole('button',{name:'메뉴 열기',exact:true});assert.equal(await button.getAttribute('aria-expanded'),'false');await button.click();assert.equal(await button.getAttribute('aria-expanded'),'true');assert.match(await page.locator('header').innerText(),/buylifemall@naver\.com/);await button.click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow');if(['/dashboard','/guide','/settings'].includes(route))await shot(route.slice(1)+'-375');
  }ok('375px 회원6화면·접는 메뉴/계정·가로 넘침 없음');
  await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();await page.locator('header a[href="/videos"]').click();await page.getByRole('heading',{name:/영상 관리/}).waitFor();assert.equal(await page.getByRole('button',{name:'메뉴 열기',exact:true}).getAttribute('aria-expanded'),'false');ok('휴대폰 메뉴 이동 후 자동 닫힘');
  after=await counts();assert.deepEqual(after,before);assert.deepEqual(writes,[]);assert.deepEqual(detailBlocks,[]);assert.deepEqual(errors,[]);ok('회원 자료 유지·쓰기/유료/게시/영상동기화·페이지 오류0');
}catch(e){checks.push({name:'FAILED',passed:false,error:e.message});console.error('FAIL',e.message);process.exitCode=1;if(page)await page.screenshot({path:`.vercel/${mode}-failure.png`,fullPage:true}).catch(()=>{});}
finally{await fs.writeFile(`docs/evidence/runtime-${mode}.json`,JSON.stringify({base,browser:'Microsoft Edge (visible)',member:email,member_is_admin:false,version:'v1.09',checked_at:new Date().toISOString(),checks,counts_before:before,counts_after:after,writes,blocked_routes:detailBlocks,errors,paid_calls:0,posting_calls:0,youtube_sync_calls:0,settings_member_unconnected:before[0]===0},null,2));await context?.close();await browser.close();}
