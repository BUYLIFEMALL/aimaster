// 2026-11-20 (Master msg_f52899da64c0): 「발행 결과만 다시 확인」 확인 대상 제목 표시.
// 이미 가진 값(같은 실행의 제목, 이미 불러온 본인 원고 목록)만 쓰고, 없으면 줄을 숨긴다. 외부 요청 0.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../extension/auto-publish.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../extension/sidepanel.html", import.meta.url), "utf8");
const OUTBOX = "seo_publish_outbox_v1";

function panel({ saved, current = null, drafts = [], worker = false } = {}) {
  const box = { textContent: "old", hidden: true };
  const listeners = [];
  let fetches = 0;
  const sandbox = vm.createContext({
    IN_WORKER: worker, seoPublication: current, webDrafts: drafts, seoAutoBusy: false,
    document: worker ? undefined : { getElementById: (id) => (id === "reconcileTarget" ? box : null) },
    chrome: { storage: {
      local: { get: async (key) => (key === OUTBOX && saved ? { [OUTBOX]: saved } : {}), set: async () => {} },
      onChanged: { addListener: (fn) => listeners.push(fn) },
    } },
    fetch: async () => { fetches += 1; throw new Error("외부 요청 금지"); },
    $: () => ({ value: "", textContent: "", addEventListener() {} }), plainText: (value) => value, sleep: async () => {},
  });
  vm.runInContext(source, sandbox);
  return { sandbox, box, listeners, fetches: () => fetches };
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const DRAFTS = [{ id: "d1", title: "첫째 원고" }, { id: "d2", title: "둘째 원고" }];

test("저장된 직전 실행이 없으면 빈 값 — 지금 화면 유지", () => {
  const { sandbox } = panel();
  assert.equal(sandbox.reconcileTargetTitle(undefined, null, DRAFTS), "");
  assert.equal(sandbox.reconcileTargetTitle({ draftId: "d1" }, null, DRAFTS), "", "runId 없는 값은 실행 단위가 아님");
});

test("같은 실행의 진행 중 제목을 먼저 쓴다", () => {
  const { sandbox } = panel();
  assert.equal(sandbox.reconcileTargetTitle({ runId: "r1", draftId: "d1" }, { runId: "r1", title: "실행 중 제목" }, DRAFTS), "실행 중 제목");
  assert.equal(sandbox.reconcileTargetTitle({ runId: "r1", draftId: "d1" }, { runId: "r9", title: "다른 실행" }, DRAFTS), "첫째 원고", "다른 실행의 제목은 쓰지 않음");
});

test("이미 불러온 본인 원고 목록에서 같은 draftId만 쓴다", () => {
  const { sandbox } = panel();
  assert.equal(sandbox.reconcileTargetTitle({ runId: "r1", draftId: "d2" }, null, DRAFTS), "둘째 원고");
  assert.equal(sandbox.reconcileTargetTitle({ runId: "r1", draftId: "d3" }, null, DRAFTS), "", "목록에 없으면 표시 안 함(다른 원고로 대체 0)");
  assert.equal(sandbox.reconcileTargetTitle({ runId: "r1", draftId: "d1" }, null, null), "");
});

test("화면 줄: 있으면 보이고, 없으면 숨김 — 외부 요청 0", async () => {
  const shown = panel({ saved: { runId: "r1", draftId: "d1" }, drafts: DRAFTS });
  await settle();
  assert.equal(shown.box.hidden, false);
  assert.equal(shown.box.textContent, "확인 대상(직전 실행): 첫째 원고");
  const hidden = panel({ saved: { runId: "r1", draftId: "dX" }, drafts: DRAFTS });
  await settle();
  assert.equal(hidden.box.hidden, true);
  assert.equal(hidden.box.textContent, "");
  assert.equal(shown.fetches() + hidden.fetches(), 0);
});

test("직전 실행이 바뀌면 다시 표시한다", async () => {
  const s = panel({ saved: { runId: "r1", draftId: "d2" }, drafts: DRAFTS });
  assert.equal(s.listeners.length, 1);
  s.listeners[0]({ [OUTBOX]: { newValue: {} } }, "local");
  await settle();
  assert.equal(s.box.textContent, "확인 대상(직전 실행): 둘째 원고");
  s.listeners[0]({ other: { newValue: 1 } }, "local");
  s.listeners[0]({ [OUTBOX]: { newValue: {} } }, "sync");
});

test("백그라운드(작업기)에서는 화면 코드가 돌지 않는다", async () => {
  const s = panel({ saved: { runId: "r1", draftId: "d1" }, drafts: DRAFTS, worker: true });
  await settle();
  assert.equal(s.listeners.length, 0);
  await s.sandbox.showReconcileTarget();
  assert.equal(s.box.textContent, "old", "작업기에서는 손대지 않음");
});

test("화면 구조: 결과 확인 버튼 바로 아래, 포커스를 받지 않는 상태 줄", () => {
  assert.match(html, /<button id="reconcilePublish" class="secondary">발행 결과만 다시 확인<\/button>\s*<div id="reconcileTarget" class="status" hidden><\/div>/);
  const line = html.match(/<div id="reconcileTarget"[^>]*>/)[0];
  assert.ok(!/tabindex|role="alert"|autofocus/.test(line));
});
