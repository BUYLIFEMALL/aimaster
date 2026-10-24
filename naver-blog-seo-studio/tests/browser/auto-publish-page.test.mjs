import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", headless: false }); });
after(async () => { await browser?.close(); });
const source = readFileSync(new URL("../../extension/auto-publish-page.js", import.meta.url), "utf8");
async function pageWith(body, url = "https://blog.naver.com/my_blog/postwrite") {
  const page = await browser.newPage();
  await page.route("**/*", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: `<html lang="ko"><body>${body}</body></html>` }));
  await page.goto(url); await page.addScriptTag({ content: source });
  return page;
}
const editor = (title = "", body = "") => `<div class="se-documentTitle"><div class="se-title-text" contenteditable="true">${title}</div></div><div class="se-section-text"><p class="se-text-paragraph">${body}</p></div>`;
const command = (page, action, args = {}) => page.evaluate(({ action, args }) => window.seoAutoPublishPage(action, { blogId: "my_blog", ...args }), { action, args });
test("only an empty editor belonging to the chosen blog is accepted", async () => {
  for (const [markup, url, expected] of [[editor(), undefined, true], [editor("기존 원고", ""), undefined, false], [editor(), "https://blog.naver.com/another/postwrite", false]]) {
    const page = await pageWith(markup, url);
    assert.equal((await command(page, "empty")).ok, expected); await page.close();
  }
});
test("whole text order, extra text and image count are checked", async () => {
  const page = await pageWith(editor("시험", "첫 문단") + '<p class="se-text-paragraph">둘째 문단</p><div class="se-component se-image"><img></div>');
  assert.equal((await command(page, "verify", { title: "시험", body: "첫 문단 둘째 문단", imageCount: 1 })).ok, true);
  for (const patch of [{ body: "둘째 문단 첫 문단" }, { body: "첫 문단" }, { imageCount: 0 }, { title: "다른 제목" }]) assert.equal((await command(page, "verify", { title: "시험", body: "첫 문단 둘째 문단", imageCount: 1, ...patch })).ok, false);
  await page.close();
});
test("selected visibility is required and final click occurs at most once", async () => {
  const page = await pageWith(editor("시험", "본문") + '<label for="private">비공개</label><input id="private" type="radio" name="v"><label for="public">전체공개</label><input id="public" type="radio" name="v" checked><button data-testid="seOnePublishBtn" onclick="window.finalClicks=(window.finalClicks||0)+1">발행</button>');
  assert.equal((await command(page, "final", { title: "시험", body: "본문", imageCount: 0, visibility: "private", runId: "run1" })).ok, false);
  assert.equal((await command(page, "settings", { visibility: "private" })).ok, true);
  assert.equal((await command(page, "final", { title: "시험", body: "본문", imageCount: 0, visibility: "private", runId: "run1" })).clicked, true);
  assert.equal((await command(page, "final", { title: "시험", body: "본문", imageCount: 0, visibility: "private", runId: "run1" })).ok, false);
  assert.equal(await page.evaluate(() => window.finalClicks), 1); await page.close();
});
test("posted URL and exact viewer title must agree; editor is never a result", async () => {
  for (const [markup, url, expected] of [
    ['<div class="se-title-text">시험</div>', "https://blog.naver.com/my_blog/224123456789", true],
    ['<div class="se-title-text">이전 글</div>', "https://blog.naver.com/my_blog/224123456789", false],
    ['<div class="se-title-text">시험</div>', "https://blog.naver.com/another/224123456789", false],
    [editor("시험", "본문"), "https://blog.naver.com/my_blog/postwrite", false],
  ]) {
    const page = await pageWith(markup, url); assert.equal((await command(page, "published", { title: "시험" })).complete, expected); await page.close();
  }
});
test("content changed in editor after settings cannot reach the final click", async () => {
  const page = await pageWith(editor("시험", "설정 도중 바뀐 본문") + '<label for="private">비공개</label><input id="private" type="radio" checked><button data-testid="seOnePublishBtn" onclick="window.finalClicks=1">발행</button>');
  const result = await command(page, "final", { title: "시험", body: "검수했던 본문", imageCount: 0, visibility: "private", runId: "run1" });
  assert.equal(result.ok, false);
  assert.equal(await page.evaluate(() => window.finalClicks || 0), 0);
  await page.close();
});

test("Naver empty zero-width caret is accepted; visible restore dialog blocks it", async () => {
  const page = await pageWith(editor('<span class="se-placeholder">제목</span>\u200b', '\u200b'));
  assert.equal((await command(page, "empty")).ok, true);
  await page.evaluate(() => { const dialog = document.createElement('div'); dialog.className = 'se-popup'; dialog.textContent = '작성 중인 글이 있습니다. 이어서 작성하시겠습니까?'; document.body.append(dialog); });
  assert.equal((await command(page, "empty")).ok, false);
  await page.close();
});

test("real Naver detached input editor is recognized with title plus toolbar/container", async () => {
  const markup = '<div class="se-container"><div class="se-toolbar"></div>' + editor().replace(' contenteditable="true"', '') + '</div><div contenteditable="true"></div>';
  const page = await pageWith(markup);
  assert.equal((await command(page, "empty")).ok, true);
  await page.close();
  const viewer = await pageWith('<div class="se-title-text">시험</div>', 'https://blog.naver.com/my_blog/224123456789');
  assert.equal((await command(viewer, 'empty')).ok, false);
  assert.equal((await command(viewer, 'published', { title: '시험' })).complete, true);
  await viewer.close();
});

// 2026-10-24 예약 포스팅: 예약 시각을 넣고 반영을 확인해야만 최종 버튼을 누르고, 즉시 실행은 예약이 켜져 있으면 멈춘다.
const reserveSettings = `<label for="private">비공개</label><input id="private" type="radio" name="v"><label for="now">현재</label><input id="now" type="radio" name="w" checked><label for="reserve">예약</label><input id="reserve" type="radio" name="w">
  <input class="input_date" type="date"><select class="hour">${Array.from({ length: 24 }, (_, h) => `<option value="${String(h).padStart(2, "0")}">${h}</option>`).join("")}</select><select class="minute">${["00", "10", "20", "30", "40", "50"].map(m => `<option value="${m}">${m}</option>`).join("")}</select>
  <button data-testid="seOnePublishBtn" onclick="window.finalClicks=(window.finalClicks||0)+1">발행</button>`;
test("reserve: settings fills date/hour/minute and final requires the reservation; immediate run refuses a reservation", async () => {
  const at = new Date(Math.ceil((Date.now() + 90 * 60000) / 600000) * 600000);
  const page = await pageWith(editor("시험", "본문") + reserveSettings);
  const args = { title: "시험", body: "본문", imageCount: 0, visibility: "private", runId: "run1", scheduledAt: at.toISOString() };
  assert.equal((await command(page, "settings", args)).ok, true);
  const filled = await page.evaluate(() => ({ date: document.querySelector(".input_date").value, hour: document.querySelector(".hour").value, minute: document.querySelector(".minute").value, reserve: document.getElementById("reserve").checked }));
  const pad = n => String(n).padStart(2, "0");
  assert.deepEqual(filled, { date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`, hour: pad(at.getHours()), minute: pad(at.getMinutes()), reserve: true });
  assert.equal((await command(page, "final", { ...args, scheduledAt: "" })).ok, false); // 즉시 실행인데 예약이 켜져 있으면 누르지 않음
  assert.equal((await command(page, "final", args)).clicked, true);
  assert.equal(await page.evaluate(() => window.finalClicks), 1); await page.close();
});
test("reserve: the reservation list must hold exactly one post with the same title and time", async () => {
  const at = new Date(Math.ceil((Date.now() + 90 * 60000) / 600000) * 600000);
  const pad = n => String(n).padStart(2, "0");
  const stamp = `${at.getFullYear()}. ${at.getMonth() + 1}. ${at.getDate()} ${at.getHours()}:${pad(at.getMinutes())}`;
  const row = (title, when) => `<button data-click-area="tpb*t.schedulelist"><strong>${title}</strong><span class="date">${when}</span></button>`;
  for (const [rows, expected] of [[row("시험", stamp), true], [row("다른 글", stamp), false], [row("시험", stamp) + row("시험", stamp), false], ["", false]]) {
    const page = await pageWith(editor() + rows);
    assert.equal((await command(page, "reserved", { title: "시험", scheduledAt: at.toISOString() })).complete, expected); await page.close();
  }
});
