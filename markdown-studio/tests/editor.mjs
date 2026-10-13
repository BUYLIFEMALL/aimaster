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
const textOf = loc => loc.evaluate(el => Array.from(el.querySelectorAll(".cm-line")).map(l => l.textContent).join("\n"));
const record = (name,extra={}) => checks.push({ name, passed:true, ...extra });
const editor = page.getByRole("textbox", { name: "마크다운 원문" });
const tool = name => page.getByRole("button", { name, exact: true });
const lines = async () => (await textOf(editor)).split("\n");
async function fresh(text = "") {
  await editor.click(); await page.keyboard.press("Control+A"); await page.keyboard.press("Delete");
  if (text) await page.keyboard.type(text);
}
try {
  await page.goto(`${origin}/editor`); await tool("새 문서").waitFor();
  await tool("새 문서").click(); await page.getByRole("textbox", { name: "새 항목 이름" }).fill("편집기 시험.md"); await tool("만들기").click();
  await editor.waitFor();

  // 1) 한글 입력 · 제목 토글
  await fresh("안녕하세요");
  assert.equal((await textOf(editor)), "안녕하세요");
  await page.keyboard.press("Control+A"); await tool("제목 2").click();
  assert.equal(await textOf(editor), "## 안녕하세요");
  await page.locator(".markdown-content h2").waitFor();
  await page.keyboard.press("Control+A"); await tool("제목 2").click();
  assert.equal(await textOf(editor), "안녕하세요"); record("heading toggle and Korean typing");

  // 2) 굵게 단축키 · 실행 취소/다시 실행
  await fresh("굵게 만들기"); await page.keyboard.press("Control+A"); await page.keyboard.press("Control+B");
  assert.equal(await textOf(editor), "**굵게 만들기**");
  await page.keyboard.press("Control+Z"); assert.equal(await textOf(editor), "굵게 만들기");
  await tool("다시 실행").click(); assert.equal(await textOf(editor), "**굵게 만들기**");
  await page.keyboard.press("Control+I");
  await tool("실행 취소").click();
  assert.equal(await textOf(editor), "**굵게 만들기**"); record("Ctrl+B, Ctrl+I, undo and redo");

  // 3) 목록 Enter: 숫자 증가, 빈 항목 종료, 알파벳, 체크박스
  await fresh("1. 가"); await page.keyboard.press("Enter"); await page.keyboard.type("나"); await page.keyboard.press("Enter");
  assert.deepEqual(await lines(), ["1. 가", "2. 나", "3. "]);
  await page.keyboard.press("Enter"); assert.deepEqual(await lines(), ["1. 가", "2. 나", ""]);
  await fresh("a. 하나"); await page.keyboard.press("Enter"); await page.keyboard.type("둘");
  assert.deepEqual(await lines(), ["a. 하나", "b. 둘"]);
  await page.locator(".markdown-content ol[type=a] li").first().waitFor();
  assert.equal(await page.locator(".markdown-content ol[type=a] li").count(), 2);
  await fresh("- [ ] 할 일"); await page.keyboard.press("Enter");
  assert.deepEqual(await lines(), ["- [ ] 할 일", "- [ ] "]); record("list continuation: numbers, alphabet, checklist, empty-item exit");

  // 4) 목록 3종 + 체크리스트 버튼, 들여쓰기·내어쓰기·Tab, 인용
  await fresh("가"); await page.keyboard.press("Shift+Enter"); await page.keyboard.type("나"); await page.keyboard.press("Control+A");
  for (const [name, expected] of [["글머리 기호 목록", "- 가\n- 나"], ["숫자 목록", "1. 가\n2. 나"], ["알파벳 목록", "a. 가\nb. 나"], ["체크리스트", "- [ ] 가\n- [ ] 나"]]) {
    await tool(name).click(); assert.equal(await textOf(editor), expected, name);
  }
  await fresh("줄"); await page.keyboard.press("Tab"); assert.equal(await textOf(editor), "  줄");
  await page.keyboard.press("Shift+Tab"); assert.equal(await textOf(editor), "줄");
  await page.keyboard.press("Control+A"); await tool("인용").click(); assert.equal(await textOf(editor), "> 줄");
  await tool("인용").click(); assert.equal(await textOf(editor), "줄"); record("list buttons, indent/outdent/Tab, quote toggle");

  // 5) Esc 다음 Tab: 편집기 벗어나기
  await editor.click(); await page.keyboard.press("Escape"); await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => !!document.activeElement?.closest(".cm-content")), false); record("Esc then Tab leaves the editor");

  // 6) 링크 · 이미지 (위험 주소 차단)
  await fresh("보기"); await page.keyboard.press("Control+A"); await page.keyboard.press("Control+K");
  const linkInput = page.getByRole("textbox", { name: "링크 주소" }); await linkInput.waitFor();
  await linkInput.fill("javascript:alert(1)"); await tool("넣기").click();
  await page.getByText("주소를 확인해 주세요", { exact: false }).waitFor(); assert.equal(await textOf(editor), "보기");
  await linkInput.fill("https://example.com"); await tool("넣기").click();
  assert.equal(await textOf(editor), "[보기](https://example.com)");
  const a = page.locator(".markdown-content a"); await a.waitFor();
  assert.equal(await a.getAttribute("rel"), "noopener noreferrer"); assert.equal(await a.getAttribute("target"), "_blank");
  await fresh(""); await tool("이미지").click(); await page.getByRole("textbox", { name: "이미지 주소" }).fill("https://example.com/a.png"); await tool("넣기").click();
  assert.match(await textOf(editor), /!\[이미지 설명\]\(https:\/\/example\.com\/a\.png\)/); record("link/image dialogs block unsafe URLs and harden preview links");

  // 7) 코드 블록 언어 · 구분선 · 특수기호 32개
  await fresh(""); await tool("코드 블록").click(); await page.getByRole("combobox", { name: "코드 언어" }).selectOption("python"); await tool("코드 블록 넣기").click();
  assert.deepEqual(await lines(), ["```python", "", "```"]);
  await fresh("본문"); await tool("구분선").click(); assert.match(await textOf(editor), /^본문\n\n---/);
  await fresh(""); await tool("특수 기호").click();
  assert.equal(await page.locator(".tool-panel.symbols button[aria-label^='기호 ']").count(), 32);
  await page.getByRole("button", { name: "기호 ★" }).click(); assert.equal(await textOf(editor), "★"); record("code language, rule, 32 symbols");

  // 8) 표: 삽입 · 행/열 추가 · 삭제 · 정렬
  await fresh(""); await tool("표 삽입").click(); await tool("표 넣기").click();
  const tableLines = async () => (await lines()).filter(l => l.includes("|"));
  assert.equal((await tableLines()).length, 4);
  await tool("표 행 추가").click(); assert.equal((await tableLines()).length, 5);
  await tool("표 열 추가").click(); assert.equal((await tableLines())[0].split("|").length, 6);
  await tool("열 오른쪽 정렬").click(); assert.match((await tableLines())[1], /---:/);
  await tool("표 열 삭제").click(); assert.equal((await tableLines())[0].split("|").length, 5);
  await fresh("표 밖 문장"); await tool("표 행 추가").click(); await page.getByText("표 안에 커서를 두고", { exact: false }).waitFor(); record("table insert/add/delete/align");

  // 9) 찾기: 정규식 기호 `[`가 오류 없이 동작 · 한글 패널
  await fresh("배열[1] 과 배열[2]"); await page.keyboard.press("Control+F");
  const finder = page.locator(".cm-search input[name=search]"); await finder.waitFor(); await finder.click(); await page.keyboard.type("[");
  assert.ok(await page.locator(".cm-searchMatch").count() >= 2);
  assert.ok(await page.locator(".cm-search").getByText("모두 선택").count() >= 1);
  await page.locator(".cm-search input[name=replace]").click(); await page.keyboard.type("<"); await page.locator(".cm-search button[name=replaceAll]").click();
  assert.equal(await textOf(editor), "배열<1] 과 배열<2]"); await page.keyboard.press("Escape"); record("find/replace with literal [ and Korean panel");

  // 10) 한글 조합(IME) 입력
  await fresh(""); await editor.click();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.imeSetComposition", { text: "ㅎ", selectionStart: 1, selectionEnd: 1 });
  await cdp.send("Input.imeSetComposition", { text: "하", selectionStart: 1, selectionEnd: 1 });
  await cdp.send("Input.imeSetComposition", { text: "한", selectionStart: 1, selectionEnd: 1 });
  await cdp.send("Input.insertText", { text: "한" });
  await page.keyboard.type("글");
  assert.equal(await textOf(editor), "한글"); record("Korean IME composition via Chrome DevTools Protocol");

  // 11) 미리보기 보조: HTML 소스 · 목차 · 글자 수 · 복사
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  await fresh("# 제목"); await page.keyboard.press("Shift+Enter"); await page.keyboard.type("## 소제목"); await page.keyboard.press("Shift+Enter"); await page.keyboard.type("본문");
  const expectedDoc = await textOf(editor);
  await tool("HTML 소스").click();
  assert.match(await page.locator(".html-source").innerText(), /<h1>제목<\/h1>/); await tool("미리보기 보기").click();
  await tool("목차").click(); assert.equal(await page.locator(".toc button").count(), 2);
  assert.match(await page.locator(".pane-stat").innerText(), /\d+자 · \d+단어/);
  await tool("원문 복사").click(); await page.getByText("마크다운 원문을 복사했습니다", { exact: false }).waitFor();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"), expectedDoc); record("html source, toc, counts, clipboard copy");

  // 12) 자동 저장 · 새로고침 복원 후에도 편집기 사용 가능
  await fresh("저장될 문장"); await page.getByRole("status").filter({ hasText: "저장 완료" }).waitFor();
  await page.reload(); await editor.waitFor(); assert.equal(await textOf(editor), "저장될 문장"); record("autosave survives reload with new editor");

  await page.screenshot({ path: path.join(artifacts, "editor-desktop.png"), fullPage: true });
  // 13) 모바일 폭 390px
  await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); await editor.waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `가로 넘침 ${overflow}px`);
  assert.equal(await page.locator(".editor-toolbar").evaluate(el => el.scrollWidth > el.clientWidth), true);
  assert.ok((await page.locator(".tool-button").first().boundingBox()).height >= 40);
  await page.screenshot({ path: path.join(artifacts, "editor-mobile.png"), fullPage: true }); record("390px mobile: no horizontal overflow, scrollable toolbar, 40px touch targets");

  assert.deepEqual(errors, []);
  await writeFile(path.join(artifacts, "editor-results.json"), JSON.stringify({ fixture: true, realMemberLoginVerified: false, checks, pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, artifacts, realMemberLoginVerified: false }));
} catch (e) {
  await page.screenshot({ path: path.join(artifacts, "editor-failure.png"), fullPage: true });
  console.error(String(e).slice(0, 1500)); process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
