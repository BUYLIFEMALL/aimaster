// 실행: node --test lib/shopInbox.test.ts
// MOV-20261116-02: QA-02 P1(같은 「준비됨」으로 여러 번 전송, 정리 뒤 대기 중 전송) 회귀 시험.
// 실제 창 대신 모의 window·받는 창으로 openShopInbox의 전송 횟수와 정리를 확인한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// shopInbox.ts는 앱 빌드 방식대로 확장자 없이 불러오므로(./gifHandoff), 시험에서만 .ts를 붙여 찾는다.
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (specifier.startsWith("./") && !specifier.endsWith(".ts")) return next(`${specifier}.ts`, context);
      throw err;
    }
  },
});

const { GIF_RECEIVER_ORIGIN, MSG_FILE, MSG_READY } = await import("./gifHandoff.ts");
const { openShopInbox } = await import("./shopInbox.ts");

type Listener = (e: { source: unknown; origin: string; data: unknown }) => unknown;

/** 모의 환경: 받는 창(win)·window 이벤트·타이머. 타이머는 실제로 돌리지 않는다. */
function setup(opts: { popupBlocked?: boolean } = {}) {
  const sent: { msg: unknown; origin: string }[] = [];
  const win = {
    closed: false,
    postMessage(msg: unknown, origin: string) { sent.push({ msg, origin }); },
  };
  const listeners = new Set<Listener>();
  const notes: string[] = [];
  let opened = 0;
  (globalThis as Record<string, unknown>).window = {
    open() { opened += 1; return opts.popupBlocked ? null : win; },
    addEventListener(type: string, fn: Listener) { if (type === "message") listeners.add(fn); },
    removeEventListener(type: string, fn: Listener) { if (type === "message") listeners.delete(fn); },
    setTimeout() { return 1; },
    clearTimeout() {},
    setInterval() { return 2; },
    clearInterval() {},
  };
  const ready = (over: Partial<{ source: unknown; origin: string; data: unknown }> = {}) =>
    Promise.all([...listeners].map((fn) => fn({ source: win, origin: GIF_RECEIVER_ORIGIN, data: { type: MSG_READY }, ...over })));
  return { win, sent, listeners, notes, note: (t: string) => notes.push(t), ready, opened: () => opened };
}

const gif = () => new Blob([new Uint8Array(5)], { type: "image/gif" });
const flush = () => new Promise((r) => setTimeout(r, 0));

/** 직접 풀어 주는 getBlob — 「파일 준비 중」 상태를 만들 때 쓴다. */
function deferredBlob() {
  let resolve!: (b: Blob) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<Blob>((res, rej) => { resolve = res; reject = rej; });
  return { getBlob: () => promise, resolve, reject };
}

test("정상: 준비됨 1번 → 파일 1건을 정확한 주소로 보내고 대기를 정리한다", async () => {
  const t = setup();
  openShopInbox(async () => gif(), "clip.mp4", t.note);
  await t.ready();
  assert.equal(t.sent.length, 1);
  assert.equal(t.sent[0].origin, GIF_RECEIVER_ORIGIN);
  const msg = t.sent[0].msg as { type: string; name: string; file: Blob };
  assert.equal(msg.type, MSG_FILE);
  assert.equal(msg.name, "clip.gif");
  assert.equal(t.listeners.size, 0);
  assert.match(t.notes.at(-1) ?? "", /보냈습니다/);
});

test("QA-02 재현: 같은 준비됨 2개가 동시에 와도 1번만 보낸다", async () => {
  const t = setup();
  openShopInbox(async () => gif(), "clip.mp4", t.note);
  await Promise.all([t.ready(), t.ready()]);
  assert.equal(t.sent.length, 1);
});

test("QA-02 재현: 보낸 뒤 받는 창이 다시 준비됨을 보내도 자동으로 다시 보내지 않는다", async () => {
  const t = setup();
  openShopInbox(async () => gif(), "clip.mp4", t.note);
  await t.ready();
  await t.ready();
  await t.ready();
  assert.equal(t.sent.length, 1);
});

test("파일 준비 중에 준비됨이 여러 번 와도 준비가 끝나면 1번만 보낸다", async () => {
  const t = setup();
  const d = deferredBlob();
  openShopInbox(d.getBlob, "clip.mp4", t.note);
  const a = t.ready();
  const b = t.ready();
  d.resolve(gif());
  await Promise.all([a, b]);
  assert.equal(t.sent.length, 1);
});

test("파일 준비 중에 정리(cleanup)하면 준비가 끝나도 보내지 않는다", async () => {
  const t = setup();
  const d = deferredBlob();
  const cleanup = openShopInbox(d.getBlob, "clip.mp4", t.note);
  const pending = t.ready();
  cleanup();
  d.resolve(gif());
  await pending;
  await flush();
  assert.equal(t.sent.length, 0);
  assert.equal(t.listeners.size, 0);
});

test("다시 보내기: 이전 호출을 정리하고 새로 열면 새 호출 것만 1번 보낸다", async () => {
  const t = setup();
  const old = deferredBlob();
  const cleanupOld = openShopInbox(old.getBlob, "old.mp4", t.note);
  const oldPending = t.ready(); // 이전 호출이 파일을 기다리는 중
  cleanupOld(); // 사용자가 버튼을 다시 누름 → 호출부가 이전 대기를 정리
  openShopInbox(async () => gif(), "new.mp4", t.note);
  old.resolve(gif()); // 이전 파일이 늦게 준비됨
  await oldPending;
  await t.ready();
  await flush();
  assert.equal(t.sent.length, 1);
  assert.equal((t.sent[0].msg as { name: string }).name, "new.gif");
  assert.equal(t.opened(), 2);
});

test("getBlob이 Promise 거절이면 보내지 않고 안내한 뒤 정리한다", async () => {
  const t = setup();
  openShopInbox(() => Promise.reject(new Error("인코딩 실패")), "clip.mp4", t.note);
  await t.ready();
  await flush();
  assert.equal(t.sent.length, 0);
  assert.equal(t.listeners.size, 0);
  assert.match(t.notes.at(-1) ?? "", /준비하지 못했습니다/);
});

test("getBlob이 바로 throw해도 호출부로 오류가 새지 않고 안내·정리한다", async () => {
  const t = setup();
  assert.doesNotThrow(() => openShopInbox(() => { throw new Error("결과 없음"); }, "clip.mp4", t.note));
  await t.ready();
  await flush();
  assert.equal(t.sent.length, 0);
  assert.equal(t.listeners.size, 0);
  assert.match(t.notes.at(-1) ?? "", /준비하지 못했습니다/);
});

test("10MB 초과 파일은 보내지 않고 크기 안내 후 정리한다", async () => {
  const t = setup();
  openShopInbox(async () => new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/webp" }), "a.webp", t.note);
  await t.ready();
  assert.equal(t.sent.length, 0);
  assert.equal(t.listeners.size, 0);
  assert.match(t.notes.at(-1) ?? "", /10MB 이하/);
});

test("다른 주소·다른 창의 준비됨은 무시하고 전송권도 쓰지 않는다", async () => {
  const t = setup();
  openShopInbox(async () => gif(), "clip.mp4", t.note);
  await t.ready({ origin: "https://evil.example" });
  await t.ready({ source: {} });
  assert.equal(t.sent.length, 0);
  assert.equal(t.listeners.size, 1);
  await t.ready(); // 늦게 로그인한 뒤 온 진짜 준비됨
  assert.equal(t.sent.length, 1);
});

test("팝업이 막히면 대기를 걸지 않고 허용 안내만 한다", () => {
  const t = setup({ popupBlocked: true });
  openShopInbox(async () => gif(), "clip.mp4", t.note);
  assert.equal(t.listeners.size, 0);
  assert.match(t.notes.at(-1) ?? "", /팝업 허용/);
});
