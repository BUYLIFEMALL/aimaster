// 2026-11-20 (Master msg_f52899da64c0, P2 보완 msg_c8696e72b04d / Mac msg_316d4de9fcca):
// 「발행 결과만 다시 확인」 확인 대상 제목 — 지금 계정으로 불러온 목록에서, 실행 번호·원고 번호가 모두 맞을 때만 표시.
// 계정이 바뀌거나 해제되면 목록·제목을 즉시 버리고, 늦게 도착한 옛 계정 응답은 적용하지 않는다. 외부 요청 0(가짜 fetch).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const autoPublish = readFileSync(new URL("../extension/auto-publish.js", import.meta.url), "utf8");
const sidepanel = readFileSync(new URL("../extension/sidepanel.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../extension/sidepanel.html", import.meta.url), "utf8");
const OUTBOX = "seo_publish_outbox_v1";
const KEY = "seoStudioToken";

// sidepanel.js의 실제 함수 본문을 잘라 와 같은 환경에서 실행한다(사이드패널 전체 DOM 없이).
function cut(name) {
  const start = sidepanel.indexOf(name);
  assert.ok(start >= 0, `${name} 없음`);
  const end = sidepanel.indexOf("\n}\n", start);
  return sidepanel.slice(start, end + 2);
}
const panelFunctions = [cut("async function refreshWebDrafts()"), cut("function invalidateWebDraftCache()")].join("\n");

function el() {
  const node = { value: "", hidden: true, children: [], text: "", addEventListener() {}, append(child) { this.children.push(child); }, close() {} };
  Object.defineProperty(node, "textContent", { get() { return this.text; }, set(v) { this.text = v; if (v === "") this.children = []; } });
  return node;
}

function panel({ token = "tokA", saved, worker = false } = {}) {
  // aliveAt: 지금 살아 있는 실행으로 둬서 기존 「끊긴 실행 정리」(recoverInterruptedPublication)가 상태 요청을 보내지 않게 한다(이 시험 대상 아님).
  const store = { [KEY]: token, ...(saved ? { [OUTBOX]: { aliveAt: Date.now(), ...saved } } : {}) };
  const elements = new Map();
  const $ = (id) => { if (!elements.has(id)) elements.set(id, el()); return elements.get(id); };
  const listeners = [];
  const pending = [];
  let fetchCount = 0;
  const sandbox = vm.createContext({
    IN_WORKER: worker, BASE: "https://test.invalid", seoPublication: null, seoAutoBusy: false,
    document: worker ? undefined : { getElementById: (id) => $(id), createElement: () => el() },
    chrome: { storage: {
      local: { get: async (key) => (key in store ? { [key]: store[key] } : {}), set: async () => {} },
      onChanged: { addListener: (fn) => listeners.push(fn) },
    } },
    // 가짜 서버: 요청마다 응답을 직접 풀어 줄 수 있게 보관(늦은 응답 재현용). 외부 요청은 하지 않는다.
    fetch: (_url, options) => {
      fetchCount += 1;
      return new Promise((resolve) => pending.push({ auth: options.headers.Authorization, resolve }));
    },
    $, plainText: (value) => value, sleep: async () => {},
    getToken: async () => store[KEY] || "",
    resetActiveWebDraft() {}, clearWebDraftPreview() {}, cancelWebDraftLoad() {}, formatWebDraftLabel: (d) => d.title,
  });
  vm.runInContext(`let webDrafts = []; let webDraftsToken = ""; let webDraftsEpoch = 0;\n${panelFunctions}\n${autoPublish}`, sandbox);
  const reply = async (index, drafts) => { for (let i = 0; i < 20 && !pending[index]; i++) await new Promise((r) => setTimeout(r, 0)); pending[index].resolve({ ok: true, json: async () => ({ drafts }) }); };
  const switchToken = (next) => {
    const old = store[KEY];
    if (next === undefined) delete store[KEY]; else store[KEY] = next;
    // sidepanel.js 저장소 변경 감지와 같은 조건으로 무효화(값이 실제로 바뀐 경우)
    if (old !== next) sandbox.invalidateWebDraftCache();
  };
  return { sandbox, box: $("reconcileTarget"), select: $("webDraftList"), listeners, pending, reply, switchToken, store, fetches: () => fetchCount, $ };
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const A = [{ id: "a1", title: "A 계정 원고" }, { id: "a2", title: "A 둘째" }];
const B = [{ id: "b1", title: "B 계정 원고" }];
const shown = (p) => (p.box.hidden ? "(숨김)" : p.box.textContent);

test("같은 계정 정상: 직전 실행 원고 제목 표시", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  const loading = p.sandbox.refreshWebDrafts();
  await p.reply(0, A); await loading; await settle();
  assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고");
  assert.equal(p.fetches(), 1);
});

test("계정 교체: 이전 계정 목록·제목을 즉시 버리고, 새 계정 목록에 없으면 숨김", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  const first = p.sandbox.refreshWebDrafts(); await p.reply(0, A); await first; await settle();
  assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고");
  p.switchToken("tokB");
  assert.equal(shown(p), "(숨김)", "교체 즉시 숨김");
  assert.equal(vm.runInContext("webDrafts.length", p.sandbox), 0);
  assert.equal(vm.runInContext("webDraftsToken", p.sandbox), "");
  assert.match(p.select.children[0].textContent, /연결이 바뀌었습니다/);
  await p.sandbox.showReconcileTarget();
  assert.equal(shown(p), "(숨김)", "다시 불러오기 전에는 표시 안 함");
  const second = p.sandbox.refreshWebDrafts(); await p.reply(1, B); await second; await settle();
  assert.equal(p.pending[1].auth, "Bearer tokB");
  assert.equal(shown(p), "(숨김)", "A 계정 실행(a1)은 B 목록에 없으므로 숨김");
});

test("연결 해제: 목록·제목 즉시 무효화", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  const first = p.sandbox.refreshWebDrafts(); await p.reply(0, A); await first; await settle();
  p.switchToken(undefined);
  assert.equal(shown(p), "(숨김)");
  await p.sandbox.showReconcileTarget();
  assert.equal(shown(p), "(숨김)");
  assert.equal(vm.runInContext("webDrafts.length", p.sandbox), 0);
});

test("늦은 옛 계정 응답은 적용하지 않는다", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  const oldLoad = p.sandbox.refreshWebDrafts(); // A 토큰으로 요청, 아직 응답 전
  await settle();
  p.switchToken("tokB");
  await p.reply(0, A); await oldLoad; await settle(); // A 응답이 계정 교체 뒤 도착
  assert.equal(vm.runInContext("webDrafts.length", p.sandbox), 0, "옛 응답 버림");
  assert.equal(vm.runInContext("webDraftsToken", p.sandbox), "");
  assert.equal(shown(p), "(숨김)");
});

test("같은 계정이라도 앞선 조회의 늦은 응답은 새 조회 결과를 덮지 않는다", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a2" } });
  const older = p.sandbox.refreshWebDrafts(); await settle();
  const newer = p.sandbox.refreshWebDrafts(); await settle();
  await p.reply(1, A); await newer; await settle();
  await p.reply(0, [{ id: "a2", title: "옛 응답 제목" }]); await older; await settle();
  assert.equal(shown(p), "확인 대상(직전 실행): A 둘째");
});

test("같은 runId·다른 draftId는 표시하지 않는다(뒤섞인 원고 번호)", () => {
  const { sandbox } = panel();
  assert.equal(sandbox.reconcileTargetTitle({ runId: "r1", draftId: "a1" }, { runId: "r1", draftId: "a2", title: "섞인 제목" }, A), "A 계정 원고", "진행 중 제목은 draftId도 맞아야 사용");
  assert.equal(sandbox.reconcileTargetTitle({ runId: "r1", draftId: "a1" }, { runId: "r1", draftId: "a1", title: "실행 중 제목" }, A), "실행 중 제목");
  assert.equal(sandbox.reconcileTargetTitle({ runId: "r1", draftId: "zz" }, { runId: "r1", draftId: "zz", title: "목록 밖" }, A), "", "지금 계정 목록에 없으면 진행 중 제목도 안 씀");
  assert.equal(sandbox.reconcileTargetTitle({ runId: "r1" }, null, A), "", "draftId 없음");
  assert.equal(sandbox.reconcileTargetTitle({ draftId: "a1" }, null, A), "", "runId 없음");
  assert.equal(sandbox.reconcileTargetTitle(undefined, null, A), "");
});

test("목록 토큰이 지금 토큰과 다르면 숨김", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  vm.runInContext(`webDrafts = ${JSON.stringify(A)}; webDraftsToken = "tokOther";`, p.sandbox);
  await p.sandbox.showReconcileTarget();
  assert.equal(shown(p), "(숨김)");
});

test("직전 실행 변경 감지 시 다시 계산", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a2" } });
  const load = p.sandbox.refreshWebDrafts(); await p.reply(0, A); await load; await settle();
  assert.equal(p.listeners.length, 1);
  p.store[OUTBOX] = { runId: "r2", draftId: "a1" };
  p.listeners[0]({ [OUTBOX]: { newValue: {} } }, "local");
  await settle();
  assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고");
});

test("작업기(백그라운드)에서는 화면 코드가 돌지 않는다", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" }, worker: true });
  assert.equal(p.listeners.length, 0);
  await p.sandbox.showReconcileTarget();
  assert.equal(p.box.textContent, "");
});

test("sidepanel.js: 토큰이 실제로 바뀌면(삭제 포함) 무효화를 호출", () => {
  assert.match(sidepanel, /changes\[KEY\] && changes\[KEY\]\.newValue !== changes\[KEY\]\.oldValue\) invalidateWebDraftCache\(\)/);
});

test("화면 구조: 결과 확인 버튼 바로 아래, 포커스를 받지 않는 상태 줄", () => {
  assert.match(html, /<button id="reconcilePublish" class="secondary">발행 결과만 다시 확인<\/button>\s*<div id="reconcileTarget" class="status" hidden><\/div>/);
  const line = html.match(/<div id="reconcileTarget"[^>]*>/)[0];
  assert.ok(!/tabindex|role="alert"|autofocus/.test(line));
});
