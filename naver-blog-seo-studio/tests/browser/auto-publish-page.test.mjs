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
