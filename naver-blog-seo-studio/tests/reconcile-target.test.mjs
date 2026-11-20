// 2026-11-20 (Master msg_f52899da64c0, P2 msg_c8696e72b04d / Mac msg_316d4de9fcca, P2 2차 msg_98373ca99358 / Mac msg_f134487d977d):
// 「발행 결과만 다시 확인」 확인 대상 제목 — 지금 계정으로 불러온 원고 목록에서만 얻고, 저장된 직전 실행이
// 그 계정 원고의 실행(서버 목록의 auto_publish_run_id)으로 확인될 때만 표시. 계정 교체·해제·늦은 응답·끼워 넣은 기록은 숨김.
// 외부 요청 0(가짜 fetch), 토큰·실행 상태 저장 0.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const autoPublish = readFileSync(new URL("../extension/auto-publish.js", import.meta.url), "utf8");
const sidepanel = readFileSync(new URL("../extension/sidepanel.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../extension/sidepanel.html", import.meta.url), "utf8");
const libraryRoute = readFileSync(new URL("../app/api/extension/drafts/library/route.ts", import.meta.url), "utf8");
const OUTBOX = "seo_publish_outbox_v1";
const KEY = "seoStudioToken";

// sidepanel.js의 실제 함수 본문을 잘라 와 같은 환경에서 실행한다(사이드패널 전체 DOM 없이).
function cut(name) {
  const start = sidepanel.indexOf(name);
  assert.ok(start >= 0, `${name} 없음`);
  const end = sidepanel.indexOf("\n}\n", start);
  return sidepanel.slice(start, end + 2);
}
const panelFunctions = [cut("async function refreshWebDrafts()"), cut("function invalidateWebDraftCache(")].join("\n");

function el() {
  const node = { value: "", hidden: true, children: [], text: "", addEventListener() {}, append(child) { this.children.push(child); }, close() {} };
  Object.defineProperty(node, "textContent", { get() { return this.text; }, set(v) { this.text = v; if (v === "") this.children = []; } });
  return node;
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const settle = async () => { for (let i = 0; i < 5; i++) await tick(); };

function panel({ token = "tokA", saved, worker = false } = {}) {
  // aliveAt: 지금 살아 있는 실행으로 둬서 기존 「끊긴 실행 정리」(recoverInterruptedPublication)가 상태 요청을 보내지 않게 한다(이 시험 대상 아님).
  const store = { [KEY]: token, ...(saved ? { [OUTBOX]: { aliveAt: Date.now(), ...saved } } : {}) };
  const elements = new Map();
  const $ = (id) => { if (!elements.has(id)) elements.set(id, el()); return elements.get(id); };
  const listeners = [];
  const pending = [];
  const sets = [];
  const heldTokens = []; // holdToken이 켜지면 getToken 응답을 시험이 직접 풀어 준다(토큰 확인 지연 재현)
  let holdToken = false;
  let fetchCount = 0;
  const sandbox = vm.createContext({
    IN_WORKER: worker, BASE: "https://test.invalid", seoPublication: null, seoAutoBusy: false,
    document: worker ? undefined : { getElementById: (id) => $(id), createElement: () => el() },
    chrome: { storage: {
      local: { get: async (key) => (key in store ? { [key]: store[key] } : {}), set: async (value) => { sets.push(value); } },
      onChanged: { addListener: (fn) => listeners.push(fn) },
    } },
    fetch: (_url, options) => {
      fetchCount += 1;
      return new Promise((resolve) => pending.push({ auth: options.headers.Authorization, resolve }));
    },
    $, plainText: (value) => value, sleep: async () => {},
    getToken: () => (holdToken ? new Promise((resolve) => heldTokens.push(() => resolve(store[KEY] || ""))) : Promise.resolve(store[KEY] || "")),
    resetActiveWebDraft() {}, clearWebDraftPreview() {}, cancelWebDraftLoad() {}, formatWebDraftLabel: (d) => d.title,
  });
  vm.runInContext(`let webDrafts = []; let webDraftsToken = ""; let webDraftsEpoch = 0; let webDraftsLoadedAt = 0;\n${panelFunctions}\n${autoPublish}`, sandbox);
  const reply = async (index, drafts) => {
    for (let i = 0; i < 20 && !pending[index]; i++) await tick();
    pending[index].resolve({ ok: true, json: async () => ({ drafts }) });
  };
  const replyRaw = async (index, json) => {
    for (let i = 0; i < 20 && !pending[index]; i++) await tick();
    pending[index].resolve({ ok: true, status: 200, json });
  };
  const switchToken = (next) => {
    const old = store[KEY];
    if (next === undefined) delete store[KEY]; else store[KEY] = next;
    if (old !== next) sandbox.invalidateWebDraftCache(); // sidepanel.js 저장소 변경 감지와 같은 조건
  };
  return {
    sandbox, box: $("reconcileTarget"), select: $("webDraftList"), listeners, pending, reply, replyRaw, switchToken, store, sets, heldTokens,
    hold: (on) => { holdToken = on; }, fetches: () => fetchCount,
    drafts: () => JSON.parse(vm.runInContext("JSON.stringify(webDrafts)", sandbox)),
  };
}
const A = [{ id: "a1", title: "A 계정 원고", auto_publish_run_id: "r1" }, { id: "a2", title: "A 둘째", auto_publish_run_id: "r2" }, { id: "a3", title: "A 실행 없음", auto_publish_run_id: null }];
const A2 = [{ id: "a1", title: "A 계정 원고(새 목록)", auto_publish_run_id: "r1" }];
const B = [{ id: "b1", title: "B 계정 원고", auto_publish_run_id: "rb" }];
const shown = (p) => (p.box.hidden ? "(숨김)" : p.box.textContent);
async function load(p, index, drafts) { const loading = p.sandbox.refreshWebDrafts(); await p.reply(index, drafts); await loading; await settle(); }

test("같은 계정 정상: 직전 실행이 그 원고의 실행이면 제목 표시", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  await load(p, 0, A);
  assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고");
  assert.equal(p.fetches(), 1);
});

test("끼워 넣은 기록: 지금 계정 원고 번호라도 실행 번호가 서버 목록과 다르면 숨김", async () => {
  for (const saved of [{ runId: "evil", draftId: "a1" }, { runId: "r1", draftId: "a2" }, { runId: "r1", draftId: "a3" }, { runId: "r1", draftId: "zz" }]) {
    const p = panel({ saved });
    await load(p, 0, A);
    assert.equal(shown(p), "(숨김)", JSON.stringify(saved));
  }
});

test("기록 모양이 이상하면 숨김", () => {
  const { sandbox } = panel();
  for (const saved of [undefined, null, {}, { runId: "r1" }, { draftId: "a1" }, { runId: 1, draftId: "a1" }, { runId: "r1", draftId: ["a1"] }, { runId: "", draftId: "a1" }]) {
    assert.equal(sandbox.reconcileTargetTitle(saved, A), "", JSON.stringify(saved));
  }
  assert.equal(sandbox.reconcileTargetTitle({ runId: "r1", draftId: "a1" }, null), "");
});

test("계정 교체: 이전 계정 목록·제목 즉시 버림, 새 계정 목록에 없으면 숨김", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  await load(p, 0, A);
  p.switchToken("tokB");
  assert.equal(shown(p), "(숨김)");
  assert.equal(p.drafts().length, 0);
  assert.match(p.select.children[0].textContent, /연결이 바뀌었습니다/);
  await p.sandbox.showReconcileTarget();
  assert.equal(shown(p), "(숨김)");
  await load(p, 1, B);
  assert.equal(p.pending[1].auth, "Bearer tokB");
  assert.equal(shown(p), "(숨김)");
});

test("로그아웃(토큰 삭제)·말소된 문맥: 즉시 무효화, 다시 계산해도 숨김", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  await load(p, 0, A);
  p.switchToken(undefined);
  assert.equal(shown(p), "(숨김)");
  await p.sandbox.showReconcileTarget();
  assert.equal(shown(p), "(숨김)");
  assert.equal(p.drafts().length, 0);
  assert.equal(vm.runInContext("webDraftsToken", p.sandbox), "");
});

test("늦은 옛 계정 응답은 적용하지 않는다", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  const oldLoad = p.sandbox.refreshWebDrafts(); await settle();
  p.switchToken("tokB");
  await p.reply(0, A); await oldLoad; await settle();
  assert.equal(p.drafts().length, 0);
  assert.equal(shown(p), "(숨김)");
});

test("토큰 확인 지연 A→B→A: 늦게 끝난 옛 A 조회가 새 A 목록을 덮지 않는다", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  const oldLoad = p.sandbox.refreshWebDrafts(); await settle(); // 1번 요청(A) 전송
  p.hold(true);
  await p.reply(0, A); await settle(); // 1번 응답 도착 → 토큰 확인에서 대기
  p.switchToken("tokB");
  p.switchToken("tokA");
  p.hold(false);
  await load(p, 1, A2); // 새 A 조회 완료
  assert.equal(p.drafts()[0].title, "A 계정 원고(새 목록)");
  for (const release of p.heldTokens) release(); // 옛 조회의 토큰 확인이 이제 「A」로 끝남
  await oldLoad; await settle();
  assert.equal(p.drafts()[0].title, "A 계정 원고(새 목록)", "새 A 목록 유지");
  await p.sandbox.showReconcileTarget();
  assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고(새 목록)");
});

test("같은 계정이라도 앞선 조회의 늦은 응답은 새 결과를 덮지 않는다", async () => {
  const p = panel({ saved: { runId: "r2", draftId: "a2" } });
  const older = p.sandbox.refreshWebDrafts(); await settle();
  const newer = p.sandbox.refreshWebDrafts(); await settle();
  await p.reply(1, A); await newer; await settle();
  await p.reply(0, [{ id: "a2", title: "옛 응답 제목", auto_publish_run_id: "r2" }]); await older; await settle();
  assert.equal(shown(p), "확인 대상(직전 실행): A 둘째");
});

test("목록 토큰이 지금 토큰과 다르면 숨김", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  vm.runInContext(`webDrafts = ${JSON.stringify(A)}; webDraftsToken = "tokOther";`, p.sandbox);
  await p.sandbox.showReconcileTarget();
  assert.equal(shown(p), "(숨김)");
});

test("직전 실행 변경 감지 시 다시 계산", async () => {
  const p = panel({ saved: { runId: "r2", draftId: "a2" } });
  await load(p, 0, A);
  assert.equal(shown(p), "확인 대상(직전 실행): A 둘째");
  p.store[OUTBOX] = { runId: "r1", draftId: "a1" };
  p.listeners[0]({ [OUTBOX]: { newValue: {} } }, "local");
  await settle();
  assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고");
});

test("표시는 저장소에 쓰지 않는다(토큰·실행 기록 추가 저장 0, 실행 상태 유지)", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  const before = JSON.stringify(p.store[OUTBOX]);
  await load(p, 0, A);
  p.switchToken("tokB");
  await p.sandbox.showReconcileTarget();
  assert.equal(p.sets.length, 0);
  assert.equal(JSON.stringify(p.store[OUTBOX]), before);
  assert.equal(vm.runInContext("seoPublication", p.sandbox), null);
});

test("작업기(백그라운드)에서는 화면 코드가 돌지 않는다", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" }, worker: true });
  assert.equal(p.listeners.length, 0);
  await p.sandbox.showReconcileTarget();
  assert.equal(p.box.textContent, "");
});

test("sidepanel.js: 토큰이 실제로 바뀌면(삭제 포함) 무효화, 토큰 확인 뒤 순번·토큰 함께 판정", () => {
  assert.match(sidepanel, /changes\[KEY\] && changes\[KEY\]\.newValue !== changes\[KEY\]\.oldValue\) invalidateWebDraftCache\(\)/);
  assert.match(sidepanel, /const currentToken = await getToken\(\);\s*\n\s*if \(epoch !== webDraftsEpoch \|\| currentToken !== token\) return;/);
});

test("서버 목록: 회원 원고마다 현재 실행 번호를 실행 기록에서 내려 준다", () => {
  assert.match(libraryRoute, /auto_publish_run_id: typeof run\.runId === "string" \? run\.runId : null/);
});

test("화면 구조: 결과 확인 버튼 바로 아래, 포커스를 받지 않는 상태 줄", () => {
  assert.match(html, /<button id="reconcilePublish" class="secondary">발행 결과만 다시 확인<\/button>\s*<div id="reconcileTarget" class="status" hidden><\/div>/);
  const line = html.match(/<div id="reconcileTarget"[^>]*>/)[0];
  assert.ok(!/tabindex|role="alert"|autofocus/.test(line));
});

// ── 3차(Master msg_42ca61066987 / Mac msg_81a964cf26e1): 정상 수명 안내 · 비정상 200 응답 ──
const HINT = "확인 대상: 「전송된 콘텐츠 목록 새로고침」 뒤 표시됩니다.";

test("정상 수명: 목록을 연 뒤 새 실행이 시작되면 제목 대신 새로고침 안내, 새로고침 뒤 제목", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  await load(p, 0, A);
  assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고");
  p.store[OUTBOX] = { runId: "r9", draftId: "a1", aliveAt: Date.now() + 1000 }; // 목록을 받은 뒤 갱신된 새 실행
  p.listeners[0]({ [OUTBOX]: { newValue: {} } }, "local");
  await settle();
  assert.equal(shown(p), HINT);
  assert.equal(p.fetches(), 1, "자동 조회 없음");
  await load(p, 1, [{ id: "a1", title: "A 계정 원고", auto_publish_run_id: "r9" }]);
  assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고");
});

test("목록이 실행보다 새것인데도 실행 번호가 다르면 안내 없이 숨김(끝난 옛 기록)", async () => {
  const p = panel({ saved: { runId: "old", draftId: "a1", aliveAt: Date.now() - 60000 } });
  await load(p, 0, A);
  assert.equal(shown(p), "(숨김)");
});

test("모르는 기록(원고가 지금 계정 목록에 없음)·로그아웃은 안내도 없이 숨김", async () => {
  const p = panel({ saved: { runId: "r9", draftId: "zz", aliveAt: Date.now() + 1000 } });
  await load(p, 0, A);
  assert.equal(shown(p), "(숨김)");
  p.store[OUTBOX] = { runId: "r9", draftId: "a1", aliveAt: Date.now() + 1000 };
  p.switchToken(undefined);
  await p.sandbox.showReconcileTarget();
  assert.equal(shown(p), "(숨김)");
});

test("비정상 200 응답(null·문자열·배열·drafts 없음/객체·JSON 해석 실패)은 목록·제목 현재성을 무효화", async () => {
  const bodies = [async () => null, async () => "text", async () => [], async () => ({}), async () => ({ drafts: null }), async () => ({ drafts: {} }), async () => { throw new Error("bad json"); }];
  for (const [index, json] of bodies.entries()) {
    const p = panel({ saved: { runId: "r1", draftId: "a1" } });
    await load(p, 0, A);
    assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고");
    const bad = p.sandbox.refreshWebDrafts();
    await p.replyRaw(1, json);
    await assert.rejects(bad, /응답 형식이 올바르지 않습니다/, String(index));
    await settle();
    assert.equal(p.drafts().length, 0, String(index));
    assert.equal(vm.runInContext("webDraftsToken", p.sandbox), "", String(index));
    assert.equal(shown(p), "(숨김)", String(index));
    assert.match(p.select.children[0].textContent, /응답 형식이 올바르지 않습니다/, String(index));
    await p.sandbox.showReconcileTarget();
    assert.equal(shown(p), "(숨김)", String(index));
  }
});

test("늦게 도착한 비정상 옛 응답은 최신 정상 화면을 지우지 않는다", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  const older = p.sandbox.refreshWebDrafts(); await settle();
  const newer = p.sandbox.refreshWebDrafts(); await settle();
  await p.reply(1, A); await newer; await settle();
  assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고");
  await p.replyRaw(0, async () => null); await older; await settle();
  assert.equal(shown(p), "확인 대상(직전 실행): A 계정 원고");
  assert.equal(p.drafts().length, 3);
});

test("서버 오류 응답 본문이 null이어도 원래 오류 문구로 실패(형식 오류로 바꾸지 않음)", async () => {
  const p = panel({ saved: { runId: "r1", draftId: "a1" } });
  const loading = p.sandbox.refreshWebDrafts();
  for (let i = 0; i < 20 && !p.pending[0]; i++) await tick();
  p.pending[0].resolve({ ok: false, status: 500, json: async () => null });
  await assert.rejects(loading, /웹 초안 조회 실패 \(500\)/);
});
