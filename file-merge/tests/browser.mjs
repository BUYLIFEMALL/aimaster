// Real member + visible Edge + actual Worker/file downloads. No auth or file logic mocks.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const base = process.env.FM_TEST_BASE || 'http://127.0.0.1:3032';
const mode = new URL(base).hostname.endsWith('buylife.xyz') ? 'live' : 'local';
const evidence = 'docs/evidence';
const downloads = `.vercel/test-downloads/${mode}`;
await fs.mkdir(evidence, { recursive:true }); await fs.mkdir(downloads, { recursive:true });
const env = {};
for (const line of (await fs.readFile(path.resolve('../.env.local'),'utf8')).split(/\r?\n/)) {
  const m=line.match(/^([A-Z_]+)=(.*)$/); if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');
}
const url=env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname,'esgxyikcnnvmlhygjkth.supabase.co');
const pub=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()||env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const secret=env.SUPABASE_SECRET_KEY?.trim()||env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const authOptions={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,secret,authOptions),member=createClient(url,pub,authOptions);
const email='buylifemall@naver.com';
const {data:link,error:linkError}=await admin.auth.admin.generateLink({type:'magiclink',email});
assert.equal(linkError,null,'member sign-in link');
const {data:auth,error:authError}=await member.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token});
assert.equal(authError,null);assert.equal(auth.user.email,email);
const {data:profile}=await member.from('profiles').select('is_admin').eq('id',auth.user.id).single();
assert.equal(profile?.is_admin,false);
const cookies=[];
await createServerClient(url,pub,{cookies:{getAll:()=>[],setAll:values=>cookies.push(...values)}}).auth.setSession(auth.session);

async function sample(reversed=false){
  const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('매출');
  ws.addRow(reversed?['지역','이름','금액']:['이름','금액','지역']);
  for(const row of reversed?[['대구','다',3000]]:[['가',1000,'서울'],['나',2000,'부산']]) ws.addRow(row);
  ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
  ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1E3A8A'}};
  ws.getColumn(reversed?3:2).width=22;
  ws.getCell(reversed?'C2':'B2').numFmt='#,##0원';
  if(reversed)ws.getCell('B2').font={italic:true,color:{argb:'FFFF0000'}};
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const a=await sample(),b=await sample(true);
const checks=[],errors=[],mutations=[],workers=[],failedResponses=[];
const ok=name=>{checks.push({name,passed:true});console.log('PASS',name);};
let context,page;
const browser=await chromium.launch({channel:'msedge',headless:false});
async function goto(route){
  const r=await page.goto(base+route,{waitUntil:'networkidle'});assert.equal(r.status(),200,route);
  await page.locator('main h1').waitFor();
  await page.evaluate(()=>window.scrollTo(0,0));
}
async function save(button,name){
  const pending=page.waitForEvent('download');await button.click();const download=await pending;
  assert.equal(await download.failure(),null);const target=path.resolve(downloads,name);await download.saveAs(target);return fs.readFile(target);
}
try{
  context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});page=await context.newPage();
  await page.goto(base+'/dashboard',{waitUntil:'networkidle'});assert.match(page.url(),/\/login/);ok('비로그인 작업 화면 차단');await context.close();
  context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,domain:new URL(base).hostname,path:'/',secure:mode==='live',httpOnly:false,sameSite:'Lax'})));
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('worker',w=>workers.push(new URL(w.url(),base).pathname));
  page.on('response',r=>{if(r.status()>=400)failedResponses.push({path:new URL(r.url()).pathname,status:r.status()});});
  await page.route('**/*',route=>{
    if(!['GET','HEAD'].includes(route.request().method())){mutations.push({method:route.request().method(),path:new URL(route.request().url()).pathname});return route.abort();}
    return route.continue();
  });
  await goto('/');assert.equal(new URL(page.url()).pathname,'/dashboard');
  assert.match(await page.locator('.desktop-sidebar').innerText(),/v1\.07/);assert.match(await page.locator('.desktop-sidebar').innerText(),/buylifemall@naver\.com/);
  assert.equal(await page.locator('.mx-kpi').count(),4);assert.equal(await page.locator('.mx-tools a').count(),4);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(246, 247, 249)');
  assert.equal(await page.locator('.card').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
  ok('일반 회원·v1.07·대시보드 기본 진입·지표/도구 4종·라이트 토큰');
  const contrast=await page.evaluate(()=>{
    const s=getComputedStyle(document.documentElement),color=k=>k==='#ffffff'?k:s.getPropertyValue(k).trim();
    const lum=hex=>{if(hex.length===4)hex='#'+hex.slice(1).split('').map(x=>x+x).join('');const v=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
    return [['--mx-text','--mx-surface'],['--mx-muted','--mx-raised'],['--mx-primary','#ffffff'],['--mx-accent','--mx-surface'],['--mx-blue-fg','--mx-blue-bg'],['--mx-amber-fg','--mx-amber-bg'],['--mx-green-fg','--mx-green-bg'],['--mx-danger','--mx-red-bg']].map(([a,b])=>{const x=lum(color(a)),y=lum(color(b));return {a,b,ratio:(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};});
  });assert.ok(contrast.every(x=>x.ratio>=4.5),JSON.stringify(contrast));ok('실제 적용 라이트 토큰 글자/배경 8쌍 대비 4.5:1 이상');
  await page.screenshot({path:`${evidence}/${mode}-dashboard-1440.png`,fullPage:true});
  const routes=['/dashboard','/excel-merge','/excel-split','/text-merge','/text-split','/guide'];
  for(const route of routes){
    await goto(route);assert.equal(await page.locator('.mx-hero').count(),1,route);
    assert.ok(await page.locator('.desktop-sidebar').isVisible());
    if(route==='/guide'){assert.equal(await page.locator('.gd-pipeline li').count(),4);assert.ok(await page.locator('.gd-avatar').isVisible());await page.screenshot({path:`${evidence}/${mode}-guide-1440.png`,fullPage:true});}
  }ok('1440px 6개 화면·단계 히어로·매뉴얼 캐릭터/4단계 흐름');

  await goto('/excel-merge');
  await page.locator('input[type=file]').setInputFiles([{name:'샘플_A.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:a},{name:'샘플_B.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:b}]);
  await page.waitForFunction(()=>document.querySelectorAll('.fm-files>li').length===2&&document.querySelectorAll('.fm-table tbody tr').length===3);
  assert.match(await page.locator('.fm-table').innerText(),/다[\s\S]*3,?000[\s\S]*대구/);
  await page.getByLabel(/원본 서식 유지/).check();
  const merged=await save(page.getByRole('button',{name:'합쳐서 저장',exact:true}),'merged-styled.xlsx');
  const book=new ExcelJS.Workbook();await book.xlsx.load(merged);const ws=book.worksheets[0];
  assert.deepEqual(ws.getRow(1).values.slice(1),['원본 파일','원본 시트','이름','금액','지역']);
  assert.equal(ws.rowCount,4);assert.deepEqual([ws.getCell('C4').value,ws.getCell('D4').value,ws.getCell('E4').value],['다',3000,'대구']);
  assert.equal(ws.getCell('C1').font.bold,true);assert.equal(ws.getCell('C1').fill.fgColor.argb,'FF1E3A8A');assert.equal(ws.getCell('C4').font.italic,true);assert.equal(ws.getCell('C4').font.color.argb,'FFFF0000');assert.equal(ws.getCell('D2').numFmt,'#,##0원');assert.equal(ws.getColumn(4).width,22);
  assert.ok(workers.length>0,'real file Worker must run');ok('실제 엑셀 2개 업로드→Worker→머리글 정렬→다운로드 값/행/서식 검증');
  await page.screenshot({path:`${evidence}/${mode}-excel-merge-1440.png`,fullPage:true});
  await page.setViewportSize({width:375,height:812});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'filled merge mobile overflow');
  assert.ok(await page.locator('.fm-table-wrap').evaluate(el=>el.scrollWidth>el.clientWidth));
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`${evidence}/${mode}-excel-merge-375.png`,fullPage:true});ok('375px 실제 결과 표·옵션 가로 넘침 없음·표 내부 스크롤');
  await page.setViewportSize({width:1440,height:1000});

  await goto('/excel-split');await page.locator('input[type=file]').setInputFiles({name:'합친_샘플.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:merged});
  await page.getByLabel(/나눌 열/).selectOption({label:'지역'});
  await page.waitForFunction(()=>document.querySelectorAll('.fm-outs li').length===3);
  await page.getByLabel(/원본 서식 유지/).check();
  const zip=await JSZip.loadAsync(await save(page.getByRole('button',{name:'나눠서 ZIP으로 저장',exact:true}),'split-excel.zip'));
  const entries=Object.values(zip.files).filter(x=>!x.dir);assert.equal(entries.length,3);
  const regions=[];for(const entry of entries){const split=new ExcelJS.Workbook();await split.xlsx.load(await entry.async('nodebuffer'));const s=split.worksheets[0];assert.equal(s.rowCount,2);assert.equal(s.getCell('C1').font.bold,true);regions.push(s.getCell('E2').value);}
  assert.deepEqual(regions.sort(),['대구','부산','서울']);ok('엑셀 열 값별 나누기·실제 ZIP 3파일·머리글/서식 유지');

  await goto('/text-merge');
  const first='첫 번째 문장입니다. 두 번째 문장입니다. 줄바꿈도 보관합니다.\n'.repeat(8);
  await page.locator('input[type=file]').setInputFiles([{name:'utf8.txt',mimeType:'text/plain',buffer:Buffer.from(first)},{name:'ansi.txt',mimeType:'text/plain',buffer:Buffer.from([0xc7,0xd1,0xb1,0xdb,0x20,0x41,0x4e,0x53,0x49])}]);
  await page.waitForFunction(()=>document.querySelectorAll('.fm-files>li').length===2);
  await page.getByRole('button',{name:'구분선(---)',exact:true}).click();assert.equal(await page.getByRole('button',{name:'구분선(---)',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByLabel('각 내용 앞에 [파일명] 줄 넣기',{exact:true}).check();
  const textBytes=await save(page.getByRole('button',{name:'합쳐서 저장',exact:true}),'merged-text.txt');
  const text=textBytes.toString('utf8').replace(/^\uFEFF/,'');assert.match(text,/\[utf8\.txt\]/);assert.match(text,/\[ansi\.txt\][\s\S]*한글 ANSI/);assert.match(text,/---/);assert.ok(text.includes(first));ok('텍스트 UTF-8/CP949 합치기·칩 눌림·파일명 머리말·실제 TXT 저장');

  await goto('/text-split');await page.locator('input[type=file]').setInputFiles({name:'합친_샘플.txt',mimeType:'text/plain',buffer:textBytes});
  await page.getByLabel('조각당 최대 글자 수',{exact:true}).fill('80');
  await page.waitForFunction(()=>document.querySelectorAll('.fm-pieces li').length>1);
  const tz=await JSZip.loadAsync(await save(page.getByRole('button',{name:'나눠서 ZIP으로 저장',exact:true}),'split-text.zip'));
  const pieces=await Promise.all(Object.values(tz.files).filter(x=>!x.dir).sort((a,b)=>a.name.localeCompare(b.name)).map(x=>x.async('string')));
  assert.ok(pieces.length>1);assert.ok(pieces.every(x=>x.length<=80));assert.equal(pieces.join(''),text);ok('텍스트 글자 수 나누기·실제 ZIP·80자 한도·원문 보존');

  for(const route of routes){
    await page.setViewportSize({width:375,height:812});await goto(route);
    assert.equal(await page.locator('.desktop-sidebar').isVisible(),false,route);await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();
    assert.equal(await page.locator('.mobile-menu nav a').count(),6,route);assert.match(await page.locator('.mobile-menu').innerText(),/buylifemall@naver\.com/);
    await page.getByRole('button',{name:'메뉴 닫기',exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow');
    if(route==='/dashboard'||route==='/guide')await page.screenshot({path:`${evidence}/${mode}-${route.slice(1)}-375.png`,fullPage:true});
  }ok('375px 6개 화면·접는 메뉴/계정·가로 넘침 없음');
  await page.getByRole('button',{name:'메뉴 열기',exact:true}).click();await page.locator('.mobile-menu a[href="/excel-merge"]').click();await page.locator('.fm-drop').waitFor();assert.equal(await page.locator('.mobile-menu').count(),0);ok('휴대폰 메뉴 이동 후 닫힘·다시 파일 작업 진입');
  assert.deepEqual(mutations,[]);assert.deepEqual(errors,[]);assert.deepEqual(failedResponses,[]);ok('파일 전송/서버 쓰기·유료 API·브라우저 오류·실패 HTTP 없음');
}catch(e){checks.push({name:'FAILED',passed:false,error:e.message});console.error('FAIL',e.message);process.exitCode=1;if(page)await page.screenshot({path:`${evidence}/${mode}-failure.png`,fullPage:true}).catch(()=>{});}
finally{
  await fs.writeFile(`${evidence}/${mode}-browser-v107.json`,JSON.stringify({base,version:'v1.07',browser:'Microsoft Edge (visible)',member:email,member_is_admin:false,checked_at:new Date().toISOString(),checks,errors,mutations,failedResponses,workers,paid_calls:0,files:'synthetic fixtures only; native download files reread with ExcelJS/JSZip',production_auth_mocked:false},null,2));
  await context?.close();await browser.close();
}
