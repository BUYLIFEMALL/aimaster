import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// 2026-10-23: 확장 「바로 연결」 — 우리 사이트에서 온 올바른 코드만 서버 확인 뒤 저장하고, 요청 시 탭을 닫는다.
function loadBackground({ fetchOk = true } = {}) {
  let listener;
  const stored = {};
  const removed = [];
  const fetchCalls = [];
  const chrome = {
    sidePanel: { setPanelBehavior: () => Promise.resolve() },
    runtime: { onMessage: { addListener: (fn) => { if (!listener) listener = fn; } } },
    storage: { local: { set: async (value) => Object.assign(stored, value) } },
    tabs: { remove: async (id) => { removed.push(id); } },
    scripting: {},
  };
  const fetch = async (url, init) => { fetchCalls.push({ url, auth: init?.headers?.Authorization }); return { ok: fetchOk, status: fetchOk ? 200 : 401, json: async () => (fetchOk ? { email: "member@example.com" } : { error: "토큰 거절" }) }; };
  const context = { chrome, fetch, console, importScripts: () => {}, setTimeout: (fn) => fn(), aioCategoryCommand: () => {} };
  vm.runInNewContext(readFileSync(new URL("../extension/background.js", import.meta.url), "utf8"), context);
  const send = (message, url) => new Promise((resolve) => { const keep = listener(message, { url, tab: { id: 7 } }, resolve); if (keep === false) {} });
  return { send, stored, removed, fetchCalls };
}
const goodToken = `pat_${"a".repeat(64)}`;

test("rejects connect from other sites", async () => {
  const bg = loadBackground();
  const result = await bg.send({ type: "connect", token: goodToken }, "https://evil.example/");
  assert.equal(result.ok, false);
  assert.equal(bg.fetchCalls.length, 0);
  assert.deepEqual(bg.stored, {});
});

test("rejects malformed tokens without calling the server", async () => {
  const bg = loadBackground();
  const result = await bg.send({ type: "connect", token: "pat_123" }, "https://naver-blog-seo-studio.buylife.xyz/extension-connect");
  assert.equal(result.ok, false);
  assert.equal(bg.fetchCalls.length, 0);
});

test("does not store a token the server rejects", async () => {
  const bg = loadBackground({ fetchOk: false });
  const result = await bg.send({ type: "connect", token: goodToken }, "https://naver-blog-seo-studio.buylife.xyz/settings");
  assert.equal(result.ok, false);
  assert.deepEqual(bg.stored, {});
});

test("stores a verified token and closes the extension-opened tab", async () => {
  const bg = loadBackground();
  const result = await bg.send({ type: "connect", token: goodToken, closeTab: true }, "https://naver-blog-seo-studio.buylife.xyz/extension-connect?from=extension");
  assert.equal(result.ok, true);
  assert.equal(result.email, "member@example.com");
  assert.equal(bg.stored.seoStudioToken, goodToken);
  assert.equal(bg.fetchCalls[0].auth, `Bearer ${goodToken}`);
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(bg.removed, [7]);
});

test("keeps the web settings tab open when closeTab is not requested", async () => {
  const bg = loadBackground();
  await bg.send({ type: "connect", token: goodToken }, "https://naver-blog-seo-studio.buylife.xyz/settings");
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(bg.removed, []);
});
