// 실제 Microsoft Edge(보이는 창)에서 Player 컴포넌트의 소리·저장·목록 동작을 검수한다.
// 실행: npm run test:browser  (Playwright + 설치된 Edge 필요)
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";

const artifacts = path.resolve("test-artifacts");
await mkdir(artifacts, { recursive: true });
const tmp = path.join(os.tmpdir(), `mp-test-${Date.now()}`);
await mkdir(tmp, { recursive: true });

function wav(freq, secs) {
  const sr = 22050, n = Math.floor(sr * secs);
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * freq * i) / sr) * 9000), 44 + i * 2);
  return b;
}
function id3Mp3(title, artist, encoding = 3, cover = null) {
  const text = (s) => Buffer.concat([Buffer.from([encoding]), Buffer.isBuffer(s) ? s : Buffer.from(s, "utf8")]);
  const frame = (id, body) => { const h = Buffer.alloc(10); h.write(id, 0); h.writeUInt32BE(body.length, 4); return Buffer.concat([h, body]); };
  const body = Buffer.concat([frame("TIT2", text(title)), frame("TPE1", text(artist)), ...(cover ? [frame("APIC", Buffer.concat([Buffer.from([0]), Buffer.from("image/png"), Buffer.from([0, 3, 0]), cover]))] : [])]);
  const head = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, (body.length >> 21) & 0x7f, (body.length >> 14) & 0x7f, (body.length >> 7) & 0x7f, body.length & 0x7f]);
  return Buffer.concat([head, body, Buffer.alloc(200, 0xff)]);
}
const files = {
  low: path.join(tmp, "Alpha - Low Tone.wav"),
  high: path.join(tmp, "Beta - High Tone.wav"),
  plain: path.join(tmp, "03. Plain Name.wav"),
  txt: path.join(tmp, "readme.txt"),
  tagged: path.join(tmp, "tagged.mp3"),
  legacy: path.join(tmp, "legacy-korean.mp3"),
  extended: path.join(tmp, "cp949-extended.mp3"),
};
await writeFile(files.low, wav(440, 6));
await writeFile(files.high, wav(1000, 6));
await writeFile(files.plain, wav(880, 5));
await writeFile(files.txt, "not audio");
await writeFile(files.tagged, id3Mp3("봄날", "아이유"));
const legacyTitle = Buffer.from([179,187,32,180,171,191,161,32,186,184,191,169]);
const legacyArtist = Buffer.from([199,209,177,219,32,176,161,188,246]);
const cover = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64");
await writeFile(files.legacy, id3Mp3(legacyTitle, legacyArtist, 0, cover));
await writeFile(files.extended, id3Mp3(Buffer.from([140,99,185,230,176,162,199,207]), legacyArtist, 0));

const bundle = await build({
  entryPoints: ["tests/browser-entry.tsx"], bundle: true, write: false, format: "iife", platform: "browser",
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent",
});
const css = await readFile("src/app/globals.css", "utf8");
const server = createServer((req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url.startsWith("/test.js")) { res.setHeader("Content-Type", "application/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url.startsWith("/test.css")) { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else {
    res.setHeader("Content-Type", "text/html;charset=utf-8");
    res.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"><body><div style="padding:24px;max-width:1500px;margin:0 auto"><div id="root"></div></div><script src="/test.js"></script></body></html>');
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ channel: "msedge", headless: false, args: ["--autoplay-policy=no-user-gesture-required"] });
const context = await browser.newContext({ viewport: { width: 1500, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const checks = [];
const ok = (name, extra = {}) => { checks.push({ name, passed: true, ...extra }); console.log("PASS", name); };

const rows = () => page.locator(".mp-row");
const timeText = () => page.locator(".mp-seek span").first().innerText();
const playTitle = () => page.locator(".mp-play").getAttribute("title");
const rms = () => page.evaluate(() => {
  const a = window.__engine?.analyser;
  if (!a) return -1;
  const d = new Uint8Array(a.fftSize);
  a.getByteTimeDomainData(d);
  let s = 0;
  for (const v of d) { const x = (v - 128) / 128; s += x * x; }
  return Math.sqrt(s / d.length);
});
const sampleRms = async () => { const v = []; for (let i = 0; i < 8; i += 1) { v.push(await rms()); await page.waitForTimeout(60); } return Math.max(...v); };
const setRange = (label, value) => page.getByLabel(label).evaluate((el, v) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  set.call(el, String(v));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}, value);

try {
  await page.goto(`${origin}/?user=fixture-a`);
  await page.locator(".mp-empty").first().waitFor();
  ok("빈 재생목록 안내");

  await page.locator("input[type=file]").first().setInputFiles([files.low, files.high, files.plain, files.txt]);
  await rows().nth(2).waitFor({ timeout: 15000 });
  assert.equal(await rows().count(), 3);
  const names = await rows().locator("strong").allInnerTexts();
  assert.deepEqual(names, ["Low Tone", "High Tone", "Plain Name"]);
  const times = await rows().locator(".mp-row-time").allInnerTexts();
  assert.deepEqual(times, ["0:06", "0:06", "0:05"]);
  const artists = await rows().locator("small").allInnerTexts();
  assert.deepEqual(artists.map((s) => s.trim()), ["Alpha", "Beta", "알 수 없는 아티스트"]);
  ok("파일 추가·파일명 해석·길이 읽기·텍스트 파일 제외", { names, times });

  await rows().nth(0).locator(".mp-row-main").click();
  await page.waitForFunction(() => document.querySelector(".mp-seek span")?.textContent !== "0:00", null, { timeout: 8000 });
  assert.match(await playTitle(), /일시정지/);
  const e1 = await sampleRms();
  assert.ok(e1 > 0.02, `소리 에너지 ${e1}`);
  ok("곡 클릭 재생: 시간 진행·분석기 에너지", { time: await timeText(), rms: +e1.toFixed(3) });

  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  assert.match(await playTitle(), /재생/);
  const t1 = await timeText();
  await page.waitForTimeout(700);
  assert.equal(await timeText(), t1);
  ok("Space 일시정지: 시간 정지");

  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  await page.keyboard.press("n");
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".mp-row.current strong").innerText(), "High Tone");
  ok("다음 곡(N)·단축키");

  // 이퀄라이저: 1kHz 톤을 재생 중 1k 대역 +15dB / 프리앰프 −12dB 에 따라 에너지가 달라져야 한다
  await page.getByRole("button", { name: "이퀄라이저" }).click();
  await page.waitForTimeout(400);
  const flat = await sampleRms();
  await setRange("1kHz 대역(dB)", 15);
  await page.waitForTimeout(500);
  const boosted = await sampleRms();
  await setRange("1kHz 대역(dB)", 0);
  await setRange("프리앰프(dB)", -12);
  await page.waitForTimeout(500);
  const cut = await sampleRms();
  assert.ok(boosted > flat * 1.5, `부스트 ${boosted} vs ${flat}`);
  assert.ok(cut < flat * 0.5, `감쇠 ${cut} vs ${flat}`);
  await setRange("프리앰프(dB)", 0);
  await setRange("1kHz 대역(dB)", 6);
  ok("이퀄라이저·프리앰프가 실제 소리에 반영", { flat: +flat.toFixed(3), boosted: +boosted.toFixed(3), cut: +cut.toFixed(3) });

  await page.getByLabel("볼륨").evaluate((el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, "0.4"); el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.keyboard.press("m");
  await page.waitForTimeout(300);
  ok("볼륨·음소거 조작");
  await page.keyboard.press("m");

  await page.waitForTimeout(1200); // 설정 자동 저장 대기
  await page.reload();
  await rows().nth(2).waitFor({ timeout: 15000 });
  assert.equal(await page.locator(".mp-row.current strong").innerText(), "High Tone");
  assert.match(await playTitle(), /재생/); // 일시정지 상태로 복원
  await page.getByRole("button", { name: "이퀄라이저" }).click();
  assert.equal(await page.getByLabel("1kHz 대역(dB)").inputValue(), "6");
  ok("새로고침 후 재생목록·마지막 곡·이퀄라이저 복원");

  await page.getByRole("textbox", { name: "검색" }).fill("plain");
  assert.equal(await rows().count(), 1);
  await page.getByRole("textbox", { name: "검색" }).fill("");
  await page.getByRole("button", { name: /정렬 바꾸기|추가한 순서/ }).click();
  assert.deepEqual(await rows().locator("strong").allInnerTexts(), ["High Tone", "Low Tone", "Plain Name"]);
  ok("검색·정렬(제목 ↑)");

  await rows().filter({ hasText: "Plain Name" }).locator("input[type=checkbox]").check();
  await page.getByRole("button", { name: /1곡 삭제/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
  await page.waitForTimeout(500);
  assert.equal(await rows().count(), 2);
  ok("선택 삭제(앱 내 확인창)");

  await page.getByRole("button", { name: "전체 삭제" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
  await page.waitForTimeout(500);
  assert.equal(await rows().count(), 0);
  await page.locator("input[type=file]").first().setInputFiles([files.low]);
  await rows().nth(0).waitFor({ timeout: 10000 });
  await rows().nth(0).locator(".mp-row-main").click();
  await page.waitForFunction(() => document.querySelector(".mp-seek span")?.textContent !== "0:00", null, { timeout: 8000 });
  const e2 = await sampleRms();
  assert.ok(e2 > 0.02, `비운 뒤 재생 에너지 ${e2}`);
  ok("목록을 모두 비운 뒤 다시 추가해도 소리가 난다(원본 결함 해결)", { rms: +e2.toFixed(3) });

  await page.locator("input[type=file]").first().setInputFiles([files.tagged]);
  await page.waitForTimeout(1500);
  const tagged = await rows().filter({ hasText: "봄날" }).count();
  assert.equal(tagged, 1);
  assert.match(await rows().filter({ hasText: "봄날" }).locator("small").innerText(), /아이유/);
  ok("ID3 태그(제목·아티스트) 읽기");

  // Seed exactly the old Latin-1 metadata, then repair from its already saved Blob.
  await page.getByLabel("곡 정보 인코딩").selectOption("latin1");
  await page.locator("input[type=file]").first().setInputFiles([files.legacy]);
  const broken = new TextDecoder("iso-8859-1").decode(legacyTitle);
  await rows().filter({ hasText: broken }).waitFor({ timeout: 15000 });
  const playbackBefore = await page.evaluate(() => { const a=window.__engine.audio; a.pause();a.currentTime=2;a.dispatchEvent(new Event("timeupdate"));return {src:a.src,time:a.currentTime,paused:a.paused}; });
  const storageSnapshot = () => page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open("music-player-fixture-a"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    try {
      const records = await new Promise((resolve, reject) => { const r = db.transaction("blobs").objectStore("blobs").getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      const tracks = await new Promise((resolve, reject) => { const r = db.transaction("tracks").objectStore("tracks").getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      const hash = async b => b ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await b.arrayBuffer()))).map(v => v.toString(16).padStart(2,"0")).join("") : null;
      return { tracks, blobs: await Promise.all(records.map(async r => ({ id:r.id, audio:await hash(r.blob), cover:await hash(r.cover) }))) };
    } finally { db.close(); }
  });
  const beforeRepair = await storageSnapshot();
  await rows().filter({ hasText: broken }).locator("input[type=checkbox]").check();
  await page.getByLabel("곡 정보 인코딩").selectOption("korean");
  await page.getByRole("button", { name: "선택 1곡 정보 복구", exact: true }).click();
  await rows().filter({ hasText: "내 눈에 보여" }).waitFor();
  assert.match(await rows().filter({ hasText: "내 눈에 보여" }).locator("small").innerText(), /한글 가수/);
  const afterRepair = await storageSnapshot();
  assert.deepEqual(afterRepair.blobs, beforeRepair.blobs);
  assert.deepEqual(await page.evaluate(() => {const a=window.__engine.audio;return {src:a.src,time:a.currentTime,paused:a.paused};}), playbackBefore);
  assert.deepEqual(afterRepair.tracks.map(({name,artist,album,...rest})=>rest), beforeRepair.tracks.map(({name,artist,album,...rest})=>rest));
  assert.equal(afterRepair.tracks.find(t=>t.name==="봄날").artist, "아이유");
  ok("저장된 구형 MP3 정보 복구·원본/커버 해시·ID/순서/길이 보존");

  await page.evaluate(() => { window.__originalPut=IDBObjectStore.prototype.put; IDBObjectStore.prototype.put=function(...args){if(this.name==="tracks")throw new DOMException("fixture failure","QuotaExceededError");return window.__originalPut.apply(this,args);}; });
  await page.getByLabel("곡 정보 인코딩").selectOption("latin1");
  await page.getByRole("button", { name: "선택 1곡 정보 복구", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "기존 정보를 유지" }).waitFor();
  assert.equal(await rows().filter({ hasText: "내 눈에 보여" }).count(), 1);
  await page.evaluate(() => { IDBObjectStore.prototype.put=window.__originalPut;delete window.__originalPut; });
  ok("곡 정보 저장 실패 시 기존 정보 유지·실패 안내");

  await page.getByLabel("곡 정보 인코딩").selectOption("auto");
  await page.locator("input[type=file]").first().setInputFiles([files.extended]);
  await rows().filter({ hasText: "똠방각하" }).waitFor({ timeout:15000 });
  ok("Edge 네이티브 CP949 확장 한글 해석");
  await page.reload();
  await rows().filter({ hasText: "내 눈에 보여" }).waitFor();
  assert.equal(await rows().filter({ hasText: "똠방각하" }).count(),1);
  ok("복구한 정보 새로고침 후 유지");
  await page.getByRole("button", {name:"전체 곡 정보 복구",exact:true}).click();
  await page.getByRole("status").filter({hasText:"0곡의 정보를 복구"}).waitFor();
  assert.equal(await rows().filter({hasText:"Low Tone"}).count(),1);
  ok("전체 정보 재확인 시 태그 없는 곡·정상 정보 유지");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("mp-action",{detail:"focus-search"})));
  assert.equal(await page.getByRole("textbox",{name:"검색"}).evaluate(el=>el===document.activeElement),true);
  ok("좌측 메뉴 검색 액션 연동");

  await page.screenshot({ path: path.join(artifacts, "music-player.png"), fullPage: true });
  // 모바일 폭(390px): 가로 넘침 없이 한 열로 쌓이는지
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `모바일 가로 넘침 ${overflow}px`);
  await page.screenshot({ path: path.join(artifacts, "music-player-mobile.png"), fullPage: true });
  ok("모바일 폭(390px) 가로 넘침 없음", { overflow });
  await page.goto(`${origin}/?user=fixture-b`);
  await page.locator(".mp-empty").first().waitFor();
  assert.equal(await rows().count(),0);
  ok("다른 회원의 재생목록 분리 유지");
  await page.setViewportSize({ width: 1500, height: 900 });
  assert.deepEqual(errors, []);
  ok("페이지 오류 없음");
} catch (e) {
  await page.screenshot({ path: path.join(artifacts, "music-player-fail.png"), fullPage: true }).catch(() => undefined);
  console.error("FAIL", e.message);
  checks.push({ name: "FAILED", passed: false, error: e.message, pageErrors: errors });
  process.exitCode = 1;
} finally {
  await writeFile(path.join(artifacts, "browser-results.json"), JSON.stringify(checks, null, 2));
  await browser.close();
  server.close();
}
