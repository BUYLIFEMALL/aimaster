import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const artifacts = path.resolve("test-artifacts"); await mkdir(artifacts,{ recursive:true });
const bundle = await build({ entryPoints:["tests/browser-entry.tsx"], bundle:true, write:false, format:"iife", platform:"browser", jsx:"automatic", define:{ "process.env.NODE_ENV":'"development"' }, tsconfig:"tsconfig.json" });
const css = await postcss([tailwind()]).process(await readFile("src/app/globals.css","utf8"),{ from:path.resolve("src/app/globals.css") });
let forcedStatus = 200;
const server = createServer((req,res) => {
  res.setHeader("Cache-Control","no-store");
  if (req.url.startsWith("/api/session")) {
    res.setHeader("Content-Type","application/json"); res.statusCode = forcedStatus;
    const member = /fixture-member=([^;]+)/.exec(req.headers.cookie || "")?.[1] || "fixture-a";
    res.end(JSON.stringify(forcedStatus === 200 ? { userId:member } : { error:"시험용 서버 연결 실패" }));
  } else if (req.url === "/test.js") { res.setHeader("Content-Type","application/javascript");res.end(bundle.outputFiles[0].text); }
  else if (req.url === "/test.css") { res.setHeader("Content-Type","text/css");res.end(css.css); }
  else { res.setHeader("Content-Type","text/html;charset=utf-8");res.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Markdown component fixture</title><link rel="stylesheet" href="/test.css"><div id="root"></div><script src="/test.js"></script></html>'); }
});
await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel:"chrome",headless:false });
const context = await browser.newContext({ viewport:{ width:1600,height:950 },acceptDownloads:true });
await context.addCookies([{ name:"fixture-member",value:"fixture-a",url:origin }]);
const page = await context.newPage(); const errors=[]; page.on("pageerror", e => errors.push(e.message));
const checks=[];
const record = (name,extra={}) => checks.push({ name, passed:true, ...extra });
try {
  await page.goto(`${origin}/editor`); await page.getByRole("button",{name:"새 폴더",exact:true}).waitFor();
  await page.getByRole("button",{name:"새 폴더",exact:true}).click();
  await page.getByRole("textbox",{name:"새 항목 이름"}).fill("문서 폴더"); await page.getByRole("button",{name:"만들기",exact:true}).click();
  await page.getByRole("button",{name:"문서 폴더 펼치기 또는 접기"}).waitFor();
  await page.getByRole("button",{name:"새 문서",exact:true}).click(); await page.getByRole("textbox",{name:"새 항목 이름"}).fill("배열[1].md");
  await page.getByRole("combobox",{name:"새 항목 폴더"}).selectOption({label:"문서 폴더"}); await page.getByRole("button",{name:"만들기",exact:true}).click();
  const source=page.getByRole("textbox",{name:"마크다운 원문"}); await source.waitFor();
  const original='# 한글 문서\n\n**중요한 내용**\n\n- [x] 완료한 작업\n- [ ] 남은 작업\n\n| 왼쪽 | 오른쪽 |\n| :--- | ---: |\n| 가 | 나 |\n\n<script>window.fixtureXss=1</script><img src="bad" onerror="window.fixtureXss=2">';
  await source.fill(original); await page.getByRole("button",{name:"저장",exact:true}).click();
  await page.getByRole("status").filter({hasText:"저장 완료"}).waitFor();
  assert.equal(await page.locator(".markdown-content h1").innerText(),"한글 문서");
  assert.equal(await page.locator(".markdown-content th").nth(1).evaluate(el=>getComputedStyle(el).textAlign),"right");
  assert.equal(await page.evaluate(()=>window.fixtureXss),undefined);
  assert.equal(await page.locator('.markdown-content .task-marker[aria-label="완료"]').count(),1);
  assert.equal(await page.locator('.markdown-content .task-marker[aria-label="미완료"]').count(),1);
  record("folder creation, document creation, save, GFM alignment and HTML sanitization");
  await page.getByRole("textbox",{name:"문서 검색"}).fill("[");
  assert.equal(await page.getByRole("button",{name:"배열[1].md 열기",exact:true}).count(),1);
  await page.getByRole("textbox",{name:"문서 검색"}).fill(""); record("literal special-character search");
  await page.reload(); await source.waitFor(); assert.equal(await source.inputValue(),original); record("active document and body persist across reload");
  const downloadPromise=page.waitForEvent("download"); await page.getByRole("button",{name:"원문 저장",exact:true}).click();
  const download=await downloadPromise; await download.saveAs(path.join(artifacts,"original.md"));
  assert.equal(await readFile(path.join(artifacts,"original.md"),"utf8"),original); record("download preserves the exact unsanitized Markdown source");
  await page.screenshot({path:path.join(artifacts,"desktop.png"),fullPage:true});

  const peer=await context.newPage(); peer.on("pageerror",e=>errors.push(e.message)); await peer.goto(`${origin}/editor`);
  await peer.getByRole("textbox",{name:"마크다운 원문"}).waitFor();
  // Keep the second tab's snapshot stale. Real IndexedDB transactions still detect
  // the revision conflict even without BroadcastChannel notifications.
  await peer.evaluate(()=>{ window.__fixtureOldSnapshot=true; });
  await source.fill("# 다른 탭의 새 원고"); await page.getByRole("button",{name:"저장",exact:true}).click();
  await peer.getByRole("textbox",{name:"마크다운 원문"}).fill("# 이 탭의 미저장 원고");
  await peer.getByRole("button",{name:"저장",exact:true}).click();
  await peer.getByRole("alert").filter({hasText:"다른 탭에서 수정"}).first().waitFor();
  assert.equal(await peer.getByRole("textbox",{name:"마크다운 원문"}).inputValue(),"# 이 탭의 미저장 원고");
  record("stale concurrent edit is blocked and the losing draft remains available"); await peer.close();
  await source.fill("# 저장 실패에서도 남는 원고"); forcedStatus=503;
  await page.getByRole("button",{name:"저장",exact:true}).click(); await page.getByRole("alert").filter({hasText:"시험용 서버 연결 실패"}).first().waitFor();
  assert.equal(await source.inputValue(),"# 저장 실패에서도 남는 원고"); record("server connection failure retains unsaved draft and never displays save success");
  forcedStatus=200; await page.getByRole("button",{name:"저장 다시 시도"}).click(); await page.getByRole("status").filter({hasText:"저장 완료"}).waitFor();

  await page.setViewportSize({width:390,height:844}); await page.getByRole("tab",{name:"미리보기",exact:true}).click();
  assert.equal(await page.locator(".source-pane").isVisible(),false);
  assert.equal(await page.locator(".preview-pane").isVisible(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole("button",{name:"메뉴 열기"}).click();
  const spacing=await page.locator(".mobile-menu").evaluate(el=>{const nav=el.querySelector("nav").getBoundingClientRect(); const account=el.querySelector(".sidebar-account").getBoundingClientRect();return account.top-nav.bottom;});
  assert.ok(spacing>=8&&spacing<=16); await page.screenshot({path:path.join(artifacts,"mobile.png"),fullPage:true});
  record("390px mobile tabs, no horizontal overflow and account menu spacing",{ accountGap:spacing });
  await page.getByRole("button",{name:"메뉴 닫기"}).click();
  await page.setViewportSize({width:1600,height:950}); await page.goto(`${origin}/library`);
  await page.getByRole("button",{name:"현재 문서 이력 보기"}).click(); await page.getByRole("button",{name:"이 본문 복원"}).first().waitFor(); assert.ok(await page.getByRole("button",{name:"이 본문 복원"}).count()>=3);
  record("revision history is accessible in the library");
  page.on("dialog",dialog=>dialog.accept()); await page.getByRole("button",{name:"문서 폴더 휴지통으로 이동"}).click();
  await page.getByRole("button",{name:"복원",exact:true}).waitFor(); await page.getByRole("button",{name:"복원",exact:true}).click();
  await page.getByRole("button",{name:"배열[1].md 열기",exact:true}).waitFor(); record("folder trash and restore through real UI");
  await context.addCookies([{name:"fixture-member",value:"fixture-b",url:origin}]); await page.goto(`${origin}/library`);
  await page.getByText("아직 문서가 없습니다. 새 문서부터 시작하세요.",{exact:true}).waitFor(); record("switching member scope opens an empty separate library");
  forcedStatus=401; await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await page.getByRole("heading",{name:"로그인 확인이 필요합니다"}).waitFor(); assert.equal(await page.locator(".tree-row").count(),0);
  record("session denial clears workspace content");
  assert.deepEqual(errors,[]);
  await writeFile(path.join(artifacts,"browser-results.json"),JSON.stringify({ fixture:true,realMemberLoginVerified:false,checks,pageErrors:errors },null,2));
  console.log(JSON.stringify({ passed:checks.length,artifacts,realMemberLoginVerified:false }));
} catch(e) {
  await page.screenshot({path:path.join(artifacts,"failure.png"),fullPage:true});
  console.error(await page.locator("body").innerText()); throw e;
} finally { await browser.close();await new Promise(resolve=>server.close(resolve)); }
