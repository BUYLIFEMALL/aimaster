import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// 2026-10-23: 입력·자동 포스팅을 background(서비스 워커)가 실행한다 — 사이드패널을 닫아도 이어지고,
// 진행 상황은 chrome.storage에 남아 사이드패널을 다시 열면 그대로 보인다.
const read = (name) => readFileSync(new URL(`../extension/${name}`, import.meta.url), "utf8");
const PANEL = { id: "ext", url: "chrome-extension://ext/sidepanel.html" };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function loadWorker(initial = {}) {
  let listener;
  const stored = { ...initial };
  const chrome = {
    sidePanel: { setPanelBehavior: () => Promise.resolve() },
    runtime: { id: "ext", getURL: (path) => `chrome-extension://ext/${path}`, getPlatformInfo: async () => ({}), onMessage: { addListener: (fn) => { listener ??= fn; } } },
    storage: { local: { get: async (key) => ({ [key]: stored[key] }), set: async (value) => { Object.assign(stored, JSON.parse(JSON.stringify(value))); } }, onChanged: { addListener() {} } },
    tabs: {}, scripting: {}, debugger: {}, windows: {},
  };
  const context = vm.createContext({ chrome, fetch: async () => ({ ok: true, json: async () => ({}) }), console, setTimeout, clearTimeout, setInterval, clearInterval, URL });
  context.importScripts = (...files) => { for (const file of files) vm.runInContext(read(file), context); };
  vm.runInContext(read("background.js"), context);
  const send = (message, sender = PANEL) => new Promise((resolve) => listener(message, sender, resolve));
  return { context, stored, send, value: (expr) => vm.runInContext(expr, context) };
}
const payload = { draftId: "d1", title: "제목", body: "본문", draft: { id: "d1" }, inputs: { publishCategory: "여행", publishTags: "a, b" } };

test("rejects run requests that do not come from this extension's side panel", async () => {
  const w = loadWorker();
  w.context.fillDraftIntoNaver = async () => assert.fail("must not run");
  for (const sender of [{ id: "ext", url: "https://blog.naver.com/x", tab: { id: 1 } }, { id: "other", url: "chrome-extension://other/sidepanel.html" }]) {
    const result = await w.send({ type: "seoRun", mode: "fill", payload }, sender);
    assert.equal(result.ok, false);
  }
});

test("runs the side panel's input in the worker and leaves the progress in storage", async () => {
  const w = loadWorker();
  let seen;
  w.context.fillDraftIntoNaver = async () => {
    seen = { title: w.value("activeWebDraftTitle"), category: w.value('$("publishCategory").value'), disabled: w.value('$("fill").disabled') };
    w.value('$("generateStatus").textContent = "입력 완료"');
  };
  assert.equal((await w.send({ type: "seoRun", mode: "fill", payload })).ok, true);
  for (let i = 0; i < 20 && w.stored.seo_run_ui_v1?.running !== false; i++) await tick();
  assert.deepEqual({ ...seen }, { title: "제목", category: "여행", disabled: true });
  const ui = w.stored.seo_run_ui_v1;
  assert.equal(ui.running, false);
  assert.equal(ui.props.generateStatus.textContent, "입력 완료");
  assert.equal(ui.props.fill.disabled, false);
  assert.equal(ui.props.keepPanelOpen.hidden, true);
});

test("refuses a second run while one is still going", async () => {
  const w = loadWorker();
  let finish;
  w.context.startAutoPublication = () => new Promise((resolve) => { finish = resolve; });
  assert.equal((await w.send({ type: "seoRun", mode: "auto", payload })).ok, true);
  await tick();
  const second = await w.send({ type: "seoRun", mode: "fill", payload });
  assert.equal(second.ok, false);
  assert.match(second.error, /이미 입력이 진행 중/);
  finish();
});

test("a restarted worker clears a run left marked as running", async () => {
  const w = loadWorker({ seo_run_ui_v1: { running: true, mode: "fill", props: { fill: { disabled: true } }, aliveAt: 1 } });
  for (let i = 0; i < 10 && w.stored.seo_run_ui_v1.running; i++) await tick();
  const ui = w.stored.seo_run_ui_v1;
  assert.equal(ui.running, false);
  assert.equal(ui.props.fill.disabled, false);
  assert.match(ui.props.generateStatus.textContent, /중간에 멈췄습니다/);
});

// 2026-11-02: 허용 목록에 reserve가 빠져 「예약 포스팅 시작」이 「알 수 없는 작업입니다」로 거절됐다(실제 화면에서 발견).
test("accepts the reserve run and starts the publication in reserve mode", async () => {
  const w = loadWorker();
  let reserveArg;
  w.context.startAutoPublication = async (reserve) => { reserveArg = reserve; };
  const result = await w.send({ type: "seoRun", mode: "reserve", payload });
  assert.equal(result.ok, true);
  for (let i = 0; i < 20 && reserveArg === undefined; i++) await tick();
  assert.equal(reserveArg, true);
});

// 2026-11-02: 자동 포스팅·예약·결과 확인의 결과는 자동 포스팅 칸의 결과 칸(autoPublishStatus)에도 모아 보여 준다.
test("collects the auto-publish result for the auto-publish card only", () => {
  const w = loadWorker();
  const text = (state) => w.value(`seoRunResultText(${JSON.stringify(state)})`);
  const props = { generateStatus: { textContent: "예약 완료 · 11월 2일 오후 09:30" }, publishStatus: { textContent: "네이버 예약 목록에서 제목과 예약 시각을 확인하고 서버에 기록했습니다." } };
  assert.equal(text({ mode: "reconcile", running: false, props }), "예약 완료 · 11월 2일 오후 09:30\n네이버 예약 목록에서 제목과 예약 시각을 확인하고 서버에 기록했습니다.");
  assert.equal(text({ mode: "reserve", running: true, props: {} }), "실행을 시작했습니다. 진행 상황을 기다리는 중입니다...");
  assert.equal(text({ mode: "auto", running: false, props: { generateStatus: { textContent: "같은 문구" }, publishStatus: { textContent: "같은 문구" } } }), "같은 문구");
  assert.equal(text({ mode: "fill", running: false, props }), "");
  assert.ok(read("sidepanel.html").includes('id="autoPublishStatus"'));
});
