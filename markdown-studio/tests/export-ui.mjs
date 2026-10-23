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
  } else if (req.url.startsWith("/fonts/")) { readFile(path.join("public", decodeURIComponent(req.url))).then(buf => { res.setHeader("Content-Type","font/ttf"); res.end(buf); }, () => { res.statusCode = 404; res.end(); });
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
import JSZip from "jszip";
const fixtureDir = path.join(artifacts, "fixture-import");
const outDir = path.join(artifacts, "exports"); await mkdir(outDir, { recursive: true });
await mkdir(path.join(fixtureDir, "회의록", "하위"), { recursive: true });
await writeFile(path.join(fixtureDir, "회의록", "개요.md"), "# 회의 개요\n\n**한글 본문**과 똠방각하 쀍 뷁.\n\n| 항목 | 값 |\n| :--- | ---: |\n| 가 | 1 |\n\na. 알파벳 하나\nb. 알파벳 둘\n\n![그림](https://example.com/a.png)\n");
await writeFile(path.join(fixtureDir, "회의록", "하위", "상세.md"), "## 상세 <b>&</b>\n\n- [x] 완료 항목\n- [ ] 남은 항목\n\n```js\nconst x = 1;\n```\n\n<script>window.pwned=1</script>\n");
await writeFile(path.join(fixtureDir, "회의록", "그림.png"), Buffer.from([137, 80, 78, 71]));
await writeFile(path.join(fixtureDir, "euckr.txt"), Buffer.from([0xb0, 0xa1, 0xb3, 0xaa, 0xb4, 0xd9, 0x0a]));

const tool = name => page.getByRole("button", { name, exact: true });
async function pdfPages(file) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(file)), useSystemFonts: false, verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) pages.push((await (await doc.getPage(i)).getTextContent()).items.map(x => x.str).join(" "));
  return pages;
}
async function exportAs({ scope, format, mode, file, set }) {
  await page.goto(`${origin}/export`); await page.getByRole("combobox", { name: "내보낼 대상" }).waitFor();
  await page.getByRole("combobox", { name: "내보낼 대상" }).selectOption(scope);
  await page.getByLabel(format, { exact: false }).first().check();
  if (mode) await page.getByLabel(mode, { exact: false }).first().check();
  if (set) await set();
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 120000 }), tool("내보내기").click()]);
  const target = path.join(outDir, file); await download.saveAs(target);
  await page.getByRole("status", { name: "내보내기 결과" }).waitFor({ timeout: 30000 });
  return { target, name: download.suggestedFilename() };
}
try {
  // 1) 폴더 가져오기: 문서 2개, 지원하지 않는 형식은 건너뜀
  await page.goto(`${origin}/prepare`); await page.locator('input[aria-label="가져올 폴더 선택"]').waitFor({ state: "attached" });
  await page.locator('input[aria-label="가져올 폴더 선택"]').setInputFiles(path.join(fixtureDir, "회의록"));
  const result = page.getByRole("status", { name: "가져오기 결과" }); await result.waitFor();
  assert.match(await result.innerText(), /2개 문서를 가져왔습니다/); assert.match(await result.innerText(), /그림\.png/);
  record("folder import keeps structure and skips unsupported files");

  // 2) 파일 가져오기: EUC-KR .txt 안내, 같은 이름 다시 가져오면 (2)
  await page.locator('input[aria-label="가져올 파일 선택"]').setInputFiles([path.join(fixtureDir, "euckr.txt"), path.join(fixtureDir, "회의록", "개요.md")]);
  await page.getByText("2개 문서를 가져왔습니다").waitFor();
  assert.match(await result.innerText(), /EUC-KR/);
  await page.locator('input[aria-label="가져올 파일 선택"]').setInputFiles(path.join(fixtureDir, "회의록", "개요.md"));
  await page.getByText("1개 문서를 가져왔습니다").waitFor(); assert.match(await result.innerText(), /이름을 바꿨습니다/);
  await page.goto(`${origin}/library`);
  for (const name of ["euckr.md 열기", "개요 (2).md 열기"]) await page.getByRole("button", { name, exact: true }).waitFor();
  record("file import: EUC-KR text and duplicate-name handling");

  // 3) 잘못된 .json은 문서 보관함 복원 안내
  await page.goto(`${origin}/prepare`);
  await writeFile(path.join(fixtureDir, "x.json"), "{}");
  await page.locator('input[aria-label="가져올 파일 선택"]').setInputFiles(path.join(fixtureDir, "x.json"));
  await page.getByText("백업 파일은 '4. 문서 보관함'에서 복원하세요").waitFor(); record("json file is redirected to restore");

  // 4) 내보내기: 폴더 → PDF 한 문서로 합치기 (한글 글자 추출·쪽 수·글꼴 로드)
  const pdf = await exportAs({ scope: { label: "회의록" }, format: "PDF", mode: "한 문서로 합치기", file: "merged.pdf" });
  assert.match(pdf.name, /^회의록\.pdf$/);
  const pages = await pdfPages(pdf.target); const text = pages.join(" ");
  for (const w of ["회의 개요", "똠방각하", "쀍", "알파벳 둘", "[이미지: 그림]", "상세", "완료 항목", "const x"]) assert.ok(text.includes(w), `PDF에 없음: ${w}`);
  assert.ok(!text.includes("pwned"), "script 내용은 PDF에 없음");
  assert.ok(pages.length >= 2, "파일마다 새 쪽"); record("PDF merged export has Korean selectable text and per-file pages");

  // 5) 용지 옵션: Letter 가로 PDF
  const letter = await exportAs({ scope: { label: "회의록/개요.md" }, format: "PDF", file: "letter.pdf", set: async () => { await page.getByRole("combobox", { name: "용지" }).selectOption("LETTER"); await page.getByRole("combobox", { name: "방향" }).selectOption("landscape"); } });
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const ldoc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(letter.target)), verbosity: 0 }).promise;
  const vp = (await ldoc.getPage(1)).getViewport({ scale: 1 }); assert.deepEqual([Math.round(vp.width), Math.round(vp.height)], [792, 612]); record("PDF page size and orientation options");

  // 6) DOCX
  const docx = await exportAs({ scope: { label: "회의록/개요.md" }, format: "Word", file: "single.docx" });
  assert.equal(docx.name, "개요.docx");
  const zip = await JSZip.loadAsync(await readFile(docx.target)); const xml = await zip.file("word/document.xml").async("string");
  assert.ok(xml.includes("<w:tbl>") && xml.includes("회의 개요") && xml.includes("똠방각하") && !xml.includes("altChunk")); assert.match(await zip.file("word/numbering.xml").async("string"), /lowerLetter/);
  record("DOCX standard OOXML with table, Korean text and alphabet list");

  // 7) HTML 합치기: CSP·스크립트 없음·제목 이스케이프
  const html = await exportAs({ scope: { label: "회의록" }, format: "HTML", mode: "한 문서로 합치기", file: "merged.html" });
  const h = await readFile(html.target, "utf8");
  assert.ok(h.includes("Content-Security-Policy") && !/<script/i.test(h) && h.includes("<section>") && h.includes("상세"));
  assert.ok(!h.includes("pwned") && !/onerror=/i.test(h)); record("HTML export is sanitized with CSP and sections");

  // 8) ZIP: 폴더 구조 유지, 형식별
  const zmd = await exportAs({ scope: "all", format: "마크다운", mode: "ZIP으로 묶기", file: "all-md.zip" });
  const zipMd = await JSZip.loadAsync(await readFile(zmd.target)); const names = Object.keys(zipMd.files).filter(n => !zipMd.files[n].dir).sort();
  assert.deepEqual(names, ["euckr.md", "개요 (2).md", "개요.md", "회의록/개요.md", "회의록/하위/상세.md"].sort());
  const zpdf = await exportAs({ scope: { label: "회의록" }, format: "PDF", mode: "ZIP으로 묶기", file: "folder-pdf.zip" });
  const zipPdf = await JSZip.loadAsync(await readFile(zpdf.target)); const pdfNames = Object.keys(zipPdf.files).filter(n => !zipPdf.files[n].dir);
  assert.deepEqual(pdfNames.sort(), ["회의록/개요.pdf", "회의록/하위/상세.pdf"].sort()); record("ZIP export keeps folder structure for md and pdf");

  // 9) 백업 → 복원 (새 폴더, 덮어쓰기 없음) · 잘못된 파일 거절
  await page.goto(`${origin}/library`); await tool("전체 백업 내려받기 (.json)").waitFor();
  const [bdl] = await Promise.all([page.waitForEvent("download"), tool("전체 백업 내려받기 (.json)").click()]);
  const bfile = path.join(outDir, "backup.json"); await bdl.saveAs(bfile);
  const backup = JSON.parse(await readFile(bfile, "utf8")); assert.equal(backup.format, "aimaster-markdown-studio-backup"); const count = backup.nodes.length; assert.ok(count >= 6);
  assert.ok(!JSON.stringify(backup).includes("fixture-a"), "회원 식별자 없음");
  page.once("dialog", d => d.accept());
  await page.locator('input[aria-label="복원할 백업 파일 선택"]').setInputFiles(bfile);
  await page.getByText(`${count}개 항목을 '복원`, { exact: false }).waitFor();
  await page.getByRole("button", { name: /^복원 \d{8} \d{4} 펼치기 또는 접기$/ }).waitFor();
  await writeFile(path.join(outDir, "bad.json"), JSON.stringify({ format: "aimaster-markdown-studio-backup", version: 1, nodes: [{ id: "x", kind: "folder", parentId: "y", name: "x" }, { id: "y", kind: "folder", parentId: "x", name: "y" }] }));
  await page.locator('input[aria-label="복원할 백업 파일 선택"]').setInputFiles(path.join(outDir, "bad.json"));
  await page.getByRole("alert").filter({ hasText: "순환" }).waitFor();
  assert.equal(await page.locator(".tree-row").filter({ hasText: /^복원 \d{8}/ }).count(), 1, "잘못된 파일은 아무것도 만들지 않음"); record("backup download, restore into new folder, invalid backup rejected");

  // 10) 새로고침 후에도 가져온 문서 유지, 모바일 폭
  await page.reload(); await page.getByRole("button", { name: "euckr.md 열기", exact: true }).first().waitFor();
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${origin}/export`); await page.getByRole("combobox", { name: "내보낼 대상" }).waitFor();
  assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  await page.screenshot({ path: path.join(artifacts, "export-mobile.png"), fullPage: true }); record("imported documents persist; 390px export page has no horizontal overflow");

  assert.deepEqual(errors, []);
  await writeFile(path.join(artifacts, "export-ui-results.json"), JSON.stringify({ fixture: true, realMemberLoginVerified: false, checks, pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, artifacts, realMemberLoginVerified: false }));
} catch (e) {
  await page.screenshot({ path: path.join(artifacts, "export-ui-failure.png"), fullPage: true });
  console.error(String(e).slice(0, 1500)); process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
