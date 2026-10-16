// Actual member session against the real Next.js app. Visible Edge; no mocked auth.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
const base=process.env.MP_TEST_BASE || "https://music-player.buylife.xyz";
const local=base.startsWith("http://localhost:");
const mode=local?"local":"live";
const env={};
for(const line of (await fs.readFile(path.resolve("../.env.local"),"utf8")).split(/\r?\n/)){
  const m=line.match(/^([A-Z_]+)=(.*)$/);if(!m)continue;const v=m[2].trim();env[m[1]]=v.startsWith('"')?JSON.parse(v):v.replace(/^'|'$/g,"");
}
const url=env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()||env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const secret=env.SUPABASE_SECRET_KEY?.trim()||env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if(new URL(url).hostname!=="esgxyikcnnvmlhygjkth.supabase.co")throw Error("Unexpected platform DB");
const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const member=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:link,error:linkError}=await admin.auth.admin.generateLink({type:"magiclink",email:"buylifemall@naver.com"});
if(linkError)throw Error("Test member link unavailable");
const {data:auth,error:authError}=await member.auth.verifyOtp({type:"magiclink",token_hash:link.properties.hashed_token});
if(authError||auth.user?.email!=="buylifemall@naver.com")throw Error("Member sign-in failed");
const {data:profile,error:profileError}=await admin.from("profiles").select("is_admin").eq("id",auth.user.id).single();
if(profileError||profile?.is_admin!==false)throw Error("Must test an ordinary member");
const cookies=[];
await createServerClient(url,publicKey,{cookies:{getAll:()=>[],setAll:values=>cookies.push(...values)}}).auth.setSession(auth.session);
const artifact="test-artifacts";await fs.mkdir(artifact,{recursive:true});
const checks=[],errors=[],mutations=[];
const ok=(name)=>{checks.push({name,passed:true});console.log("PASS",name)};
const browser=await chromium.launch({channel:"msedge",headless:false});
let context;
function wav(){const sr=22050,n=sr*5,b=Buffer.alloc(44+n*2);b.write("RIFF");b.writeUInt32LE(36+n*2,4);b.write("WAVE",8);b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*440*2*Math.PI/sr)*4000),44+i*2);return b;}
const rawTitle=Buffer.from([179,187,32,180,171,191,161,32,186,184,191,169]);
function tagged(){const frame=(id,data)=>{const h=Buffer.alloc(10);h.write(id);h.writeUInt32BE(data.length,4);return Buffer.concat([h,data]);};const b=Buffer.concat([frame("TIT2",Buffer.concat([Buffer.from([0]),rawTitle])),frame("TPE1",Buffer.from([0,199,209,177,219,32,176,161,188,246]))]);const n=b.length;return Buffer.concat([Buffer.from([73,68,51,3,0,0,(n>>21)&127,(n>>14)&127,(n>>7)&127,n&127]),b,Buffer.alloc(200,255)]);}
try{
  context=await browser.newContext({viewport:{width:1440,height:900}});
  let page=await context.newPage();await page.goto(base+"/player",{waitUntil:"domcontentloaded"});assert.match(page.url(),/\/login/);ok("비로그인 접근 차단");
  await context.close();context=await browser.newContext({viewport:{width:1440,height:900}});
  const host=new URL(base).hostname;
  await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,domain:local?host:".buylife.xyz",path:"/",secure:!local,httpOnly:false,sameSite:"Lax"})));
  page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
  page.on("request",r=>{if(r.method()==="POST")mutations.push(new URL(r.url()).pathname)});
  const response=await page.goto(base+"/player",{waitUntil:"networkidle"});assert.equal(response.status(),200);await page.locator(".mp-empty").first().waitFor();
  assert.match(await page.locator(".desktop-sidebar").innerText(),/v1\.05/);ok("일반 회원 접근·v1.05 표시");
  await page.locator('.desktop-sidebar a[href="/player#toggle-eq"]').click();await page.locator(".mp-eq").waitFor();ok("좌측 이퀄라이저 메뉴");
  await page.locator('.desktop-sidebar a[href="/player#focus-search"]').click();assert.equal(await page.getByLabel("검색",{exact:true}).evaluate(el=>el===document.activeElement),true);ok("좌측 재생목록 검색 메뉴");
  await page.getByLabel("곡 정보 인코딩").selectOption("latin1");
  const [chooser]=await Promise.all([page.waitForEvent("filechooser"),page.locator('.desktop-sidebar a[href="/player#add-file"]').click()]);
  await chooser.setFiles([{name:"Recovery Tone.wav",mimeType:"audio/wav",buffer:wav()},{name:"legacy-fixture.mp3",mimeType:"audio/mpeg",buffer:tagged()}]);
  const broken=new TextDecoder("iso-8859-1").decode(rawTitle);
  const row=page.locator(".mp-row").filter({hasText:broken});await row.waitFor({timeout:15000});ok("좌측 음악 추가 메뉴·로컬 파일 등록");
  await row.locator("input[type=checkbox]").check();await page.getByLabel("곡 정보 인코딩").selectOption("korean");await page.getByRole("button",{name:"선택 1곡 정보 복구",exact:true}).click();
  await page.locator(".mp-row").filter({hasText:"내 눈에 보여"}).waitFor();assert.match(await page.locator(".mp-row").filter({hasText:"내 눈에 보여"}).locator("small").innerText(),/한글 가수/);ok("기존 저장 한글 태그 복구");
  await page.getByTitle("음소거 (M)",{exact:true}).click();await page.locator(".mp-row").filter({hasText:"Recovery Tone"}).locator(".mp-row-main").click();
  await page.waitForFunction(()=>document.querySelector(".mp-seek span")?.textContent!=="0:00");await page.getByTitle("일시정지 (Space)",{exact:true}).click();ok("운영 경로 오디오 시간 진행·정지");
  await page.reload({waitUntil:"networkidle"});await page.locator(".mp-row").filter({hasText:"내 눈에 보여"}).waitFor();assert.equal(await page.locator(".mp-row").count(),2);ok("새로고침 후 복구 정보·재생목록 유지");
  await page.screenshot({path:`${artifact}/${mode}-player-desktop.png`,fullPage:false});
  await page.setViewportSize({width:375,height:812});assert.equal(await page.locator(".desktop-sidebar").isVisible(),false);await page.getByRole("button",{name:"메뉴 열기",exact:true}).click();await page.locator('.mobile-menu a[href="/player#focus-search"]').click();assert.equal(await page.getByLabel("검색",{exact:true}).evaluate(el=>el===document.activeElement),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));ok("375px 모바일 메뉴·검색·가로 넘침 없음");
  await page.screenshot({path:`${artifact}/${mode}-player-mobile.png`,fullPage:false});
  await page.goto(base+"/guide",{waitUntil:"networkidle"});await page.getByText("🇰🇷 구형 MP3의 한글 곡명·가수명이 깨져요.",{exact:true}).click();assert.match(await page.locator("body").innerText(),/선택 곡 정보 복구/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));ok("복구 매뉴얼·모바일 가이드");
  assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);ok("페이지 오류·파일 전송 요청 없음");
}catch(e){checks.push({name:"FAILED",passed:false,error:e.message.replace(/sb_(?:secret|publishable)_[\w-]+/g,"[redacted]")});console.error("FAIL",checks.at(-1).error);process.exitCode=1;}
finally{await fs.writeFile(`${artifact}/runtime-${mode}-results.json`,JSON.stringify({base,browser:"Microsoft Edge",member:"buylifemall@naver.com",member_is_admin:false,checked_at:new Date().toISOString(),checks},null,2));await context?.close();await browser.close();}
