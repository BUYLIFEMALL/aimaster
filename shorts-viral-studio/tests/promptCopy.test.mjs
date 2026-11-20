// 프롬프트 「전체 복사」 글 만들기·복사 표시 상태 시험 — 2026-11-20 영상 담당(MOV-SVS-PROMPT-COPY-ALL A1~A4). 네트워크 없음.
// 실행: node --test tests/promptCopy.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const {
  formatScenePrompts, PROMPT_COPY_LABEL,
  COPY_IDLE, COPY_ERROR_MESSAGE, COPY_SHOWN_MS,
  copySucceeded, copyFailed, copyExpired, createCopyGate, settleCopy, visibleCopy,
} = await import("../src/lib/promptCopy.ts");

const P = [
  { sceneNumber: 2, sceneSummary: "둘", imagePrompt: "image two", videoPrompt: "video two" },
  { sceneNumber: 1, sceneSummary: "하나", imagePrompt: "  image one  ", videoPrompt: "" },
  { sceneNumber: 3, sceneSummary: "셋", imagePrompt: "", videoPrompt: "video three" },
];

test("씬 번호 순서로 한 종류만 모으고 빈 프롬프트는 건너뛴다", () => {
  assert.equal(formatScenePrompts(P, "image"), "[SCENE 1]\nimage one\n\n[SCENE 2]\nimage two");
  assert.equal(formatScenePrompts(P, "video"), "[SCENE 2]\nvideo two\n\n[SCENE 3]\nvideo three");
});

test("원본 배열 순서를 바꾸지 않는다", () => {
  formatScenePrompts(P, "image");
  assert.deepEqual(P.map((p) => p.sceneNumber), [2, 1, 3]);
});

test("모을 것이 없으면 빈 문자열(버튼 숨김 기준)", () => {
  assert.equal(formatScenePrompts([], "image"), "");
  assert.equal(formatScenePrompts(null, "video"), "");
  assert.equal(formatScenePrompts([{ sceneNumber: 1, sceneSummary: "", imagePrompt: " ", videoPrompt: "" }], "image"), "");
});

test("버튼 이름은 두 종류가 서로 다르다", () => {
  assert.notEqual(PROMPT_COPY_LABEL.image, PROMPT_COPY_LABEL.video);
  assert.match(PROMPT_COPY_LABEL.image, /이미지/);
  assert.match(PROMPT_COPY_LABEL.video, /영상/);
});

// ── 복사 표시 상태 ─────────────────────────────────────────────────────────────
// 프롬프트 결과는 객체 참조로 구분한다(화면의 data.promptsResult). A = 이전 결과, B = 새로 만든 결과.
const A = { bgmPrompt: null, prompts: P };
const B = { bgmPrompt: null, prompts: P }; // 내용이 같아도 다른 결과

// A2: 같은 결과 안에서의 동작(보존 대상)
test("A2 실패 뒤 성공하면 복사 오류가 남지 않는다", () => {
  assert.deepEqual(copyFailed(1, A), { kind: null, error: COPY_ERROR_MESSAGE, seq: 1, target: A });
  assert.deepEqual(copySucceeded(2, "image", A), { kind: "image", error: null, seq: 2, target: A });
});

test("A2 같은 종류를 연달아 복사하면 앞 타이머가 새 표시를 지우지 않는다", () => {
  let s = copySucceeded(1, "image", A);
  s = copySucceeded(2, "image", A); // 2초 안에 다시 누름
  s = copyExpired(s, 1); // 첫 번째 타이머가 먼저 끝남
  assert.equal(visibleCopy(s, A).kind, "image", "첫 타이머는 두 번째 표시를 지우면 안 됨");
  s = copyExpired(s, 2);
  assert.equal(visibleCopy(s, A).kind, null);
  assert.equal(COPY_SHOWN_MS, 2000);
});

test("A2 다른 종류로 바꿔 복사해도 앞 타이머는 새 표시를 지우지 않는다", () => {
  let s = copySucceeded(1, "image", A);
  s = copySucceeded(2, "video", A);
  assert.equal(copyExpired(s, 1).kind, "video");
});

test("A2 성공 표시가 끝나도 그 뒤 생긴 복사 오류는 지우지 않는다", () => {
  let s = copySucceeded(1, "image", A);
  s = copyFailed(2, A);
  s = copyExpired(s, 1);
  assert.equal(visibleCopy(s, A).error, COPY_ERROR_MESSAGE);
  assert.equal(copyExpired(s, 2), s, "오류 상태는 타이머로 바뀌지 않음(다음 성공 때 지워짐)");
});

test("A2 복사 상태에는 생성 오류가 들어가지 않는다(별도 상태)", () => {
  assert.deepEqual(Object.keys(COPY_IDLE).sort(), ["error", "kind", "seq", "target"]);
  assert.deepEqual(COPY_IDLE, { kind: null, error: null, seq: 0, target: null });
});

test("A2 다시 누르면 앞 요청의 늦은 결과는 반영하지 않는다", () => {
  const gate = createCopyGate();
  const a = gate.begin();
  const b = gate.begin();
  const s = settleCopy(COPY_IDLE, gate, b, { ok: true, kind: "image" }, A);
  assert.equal(settleCopy(s, gate, a, { ok: false }, A), s);
  assert.equal(settleCopy(s, gate, a, { ok: true, kind: "video" }, A), s);
});

// A4: 같은 결과의 일반 재렌더에서는 그대로 보인다(보존)
test("A4 같은 결과로 다시 렌더해도 성공·오류 표시는 유지된다", () => {
  const ok = copySucceeded(1, "image", A);
  assert.equal(visibleCopy(ok, A), ok);
  assert.equal(visibleCopy(ok, A), ok, "여러 번 렌더해도 같은 상태");
  const bad = copyFailed(2, A);
  assert.equal(visibleCopy(bad, A).error, COPY_ERROR_MESSAGE);
});

// A4: 결과 교체 — 복사가 「교체 전에」 끝난 경우. 효과(effect) 없이 교체 직후 첫 렌더부터 숨겨져야 한다
test("A4 교체 전에 성공한 복사는 새 결과의 첫 렌더에서 보이지 않는다", () => {
  const gate = createCopyGate();
  const seq = gate.begin();
  const state = settleCopy(COPY_IDLE, gate, seq, { ok: true, kind: "image" }, A); // A 화면에서 성공
  assert.equal(visibleCopy(state, A).kind, "image");
  // 결과가 B로 바뀐 바로 그 렌더: 상태(state)는 아직 그대로지만 화면에는 숨겨진다
  assert.equal(visibleCopy(state, B), COPY_IDLE);
});

test("A4 교체 전에 실패한 복사의 오류는 새 결과의 첫 렌더에서 보이지 않는다", () => {
  const gate = createCopyGate();
  const seq = gate.begin();
  const state = settleCopy(COPY_IDLE, gate, seq, { ok: false }, A);
  assert.equal(visibleCopy(state, A).error, COPY_ERROR_MESSAGE);
  assert.equal(visibleCopy(state, B), COPY_IDLE);
  assert.equal(visibleCopy(state, B).error, null);
});

// A4: 결과 교체 — 복사가 「교체 뒤에」 늦게 끝난 경우(A3의 양방향)
test("A4 교체 뒤 늦게 성공한 이전 복사는 새 결과 화면에 보이지 않는다", () => {
  const gate = createCopyGate();
  const seq = gate.begin(); // A 화면에서 누름(대상 A)
  // …결과가 B로 바뀜… 그 뒤 클립보드가 늦게 성공
  const state = settleCopy(COPY_IDLE, gate, seq, { ok: true, kind: "image" }, A);
  assert.equal(visibleCopy(state, B), COPY_IDLE);
});

test("A4 교체 뒤 늦게 실패한 이전 복사는 새 결과 화면에 오류를 띄우지 않는다", () => {
  const gate = createCopyGate();
  const seq = gate.begin();
  const state = settleCopy(COPY_IDLE, gate, seq, { ok: false }, A);
  assert.equal(visibleCopy(state, B), COPY_IDLE);
});

test("A4 새 결과에서 새로 누른 복사는 보이고, 이전 복사의 늦은 성공·실패가 그것을 덮지 않는다", () => {
  const gate = createCopyGate();
  const oldSeq = gate.begin(); // 대상 A, 아직 안 끝남
  const newSeq = gate.begin(); // B 화면에서 새로 누름
  let s = settleCopy(COPY_IDLE, gate, newSeq, { ok: true, kind: "video" }, B);
  assert.deepEqual(visibleCopy(s, B), { kind: "video", error: null, seq: newSeq, target: B });
  s = settleCopy(s, gate, oldSeq, { ok: false }, A);
  assert.equal(visibleCopy(s, B).kind, "video");
  s = settleCopy(s, gate, oldSeq, { ok: true, kind: "image" }, A);
  assert.equal(visibleCopy(s, B).kind, "video");
  assert.equal(visibleCopy(s, B).error, null);
});

test("A4 이전 결과의 성공 표시 타이머가 끝나도 새 결과 화면은 그대로다", () => {
  const old = copySucceeded(1, "image", A);
  assert.equal(visibleCopy(copyExpired(old, 1), B), COPY_IDLE);
  const fresh = copySucceeded(2, "video", B);
  assert.equal(copyExpired(fresh, 1), fresh, "이전 순번 타이머는 새 표시를 지우지 않음");
});

test("A4 결과가 없으면(null) 아무 상태도 보이지 않는다", () => {
  assert.equal(visibleCopy(copySucceeded(1, "image", A), null), COPY_IDLE);
  assert.equal(visibleCopy(COPY_IDLE, null), COPY_IDLE);
});
