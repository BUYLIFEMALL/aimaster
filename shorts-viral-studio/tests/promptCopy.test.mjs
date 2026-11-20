// 프롬프트 「전체 복사」 글 만들기 시험 — 2026-11-20 영상 담당(MOV-SVS-PROMPT-COPY-ALL). 네트워크 없음.
// 실행: node --test tests/promptCopy.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const { formatScenePrompts, PROMPT_COPY_LABEL } = await import("../src/lib/promptCopy.ts");

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

// A2(맥미니 P3) 복사 표시 상태 회귀
const { COPY_IDLE, COPY_ERROR_MESSAGE, COPY_SHOWN_MS, copySucceeded, copyFailed, copyExpired } = await import("../src/lib/promptCopy.ts");

test("실패 뒤 성공하면 복사 오류가 남지 않는다", () => {
  const failed = copyFailed(1);
  assert.deepEqual(failed, { kind: null, error: COPY_ERROR_MESSAGE, seq: 1 });
  const ok = copySucceeded(2, "image");
  assert.deepEqual(ok, { kind: "image", error: null, seq: 2 });
});

test("같은 종류를 연달아 복사하면 앞 타이머가 새 표시를 지우지 않는다", () => {
  let s = copySucceeded(1, "image");
  s = copySucceeded(2, "image"); // 2초 안에 다시 누름
  s = copyExpired(s, 1); // 첫 번째 타이머가 먼저 끝남
  assert.equal(s.kind, "image", "첫 타이머는 두 번째 표시를 지우면 안 됨");
  s = copyExpired(s, 2); // 두 번째 타이머
  assert.equal(s.kind, null);
  assert.equal(COPY_SHOWN_MS, 2000);
});

test("다른 종류로 바꿔 복사해도 앞 타이머는 새 표시를 지우지 않는다", () => {
  let s = copySucceeded(1, "image");
  s = copySucceeded(2, "video");
  s = copyExpired(s, 1);
  assert.equal(s.kind, "video");
});

test("성공 표시가 끝나도 그 뒤 생긴 복사 오류는 지우지 않는다", () => {
  let s = copySucceeded(1, "image");
  s = copyFailed(2);
  s = copyExpired(s, 1);
  assert.equal(s.error, COPY_ERROR_MESSAGE);
  assert.equal(copyExpired(s, 2), s, "오류 상태는 타이머로 바뀌지 않음(다음 성공 때 지워짐)");
});

test("복사 상태에는 생성 오류가 들어가지 않는다(별도 상태)", () => {
  assert.deepEqual(Object.keys(COPY_IDLE).sort(), ["error", "kind", "seq"]);
  assert.deepEqual(COPY_IDLE, { kind: null, error: null, seq: 0 });
});

// A3(맥미니) 결과 교체 뒤 늦게 끝난 복사 무효화 — 양방향(늦은 성공·늦은 실패)
const { createCopyGate, settleCopy } = await import("../src/lib/promptCopy.ts");

test("결과가 바뀐 뒤 늦게 성공한 이전 복사는 새 화면 상태를 바꾸지 않는다", () => {
  const gate = createCopyGate();
  const seq = gate.begin(); // 이전 결과에서 복사 시작
  gate.invalidate(); // 프롬프트 결과 교체/초기화
  const after = settleCopy(COPY_IDLE, gate, seq, { ok: true, kind: "image" });
  assert.equal(after, COPY_IDLE);
  assert.equal(gate.isCurrent(seq), false);
});

test("결과가 바뀐 뒤 늦게 실패한 이전 복사는 새 화면에 오류를 띄우지 않는다", () => {
  const gate = createCopyGate();
  const seq = gate.begin();
  gate.invalidate();
  const after = settleCopy(COPY_IDLE, gate, seq, { ok: false });
  assert.equal(after, COPY_IDLE);
  assert.equal(after.error, null);
});

test("교체 뒤 새로 누른 복사는 정상 반영되고, 이전 복사의 늦은 결과가 그것을 덮지 않는다", () => {
  const gate = createCopyGate();
  const oldSeq = gate.begin();
  gate.invalidate();
  const newSeq = gate.begin();
  let s = settleCopy(COPY_IDLE, gate, newSeq, { ok: true, kind: "video" });
  assert.deepEqual(s, { kind: "video", error: null, seq: newSeq });
  s = settleCopy(s, gate, oldSeq, { ok: false }); // 이전 복사의 늦은 실패
  assert.deepEqual(s, { kind: "video", error: null, seq: newSeq });
  s = settleCopy(s, gate, oldSeq, { ok: true, kind: "image" }); // 이전 복사의 늦은 성공
  assert.equal(s.kind, "video");
});

test("교체가 없으면 최신 요청의 성공·실패는 그대로 반영되고, 다시 누르면 앞 요청은 무효", () => {
  const gate = createCopyGate();
  const a = gate.begin();
  assert.deepEqual(settleCopy(COPY_IDLE, gate, a, { ok: false }), { kind: null, error: COPY_ERROR_MESSAGE, seq: a });
  const b = gate.begin();
  assert.deepEqual(settleCopy(COPY_IDLE, gate, b, { ok: true, kind: "image" }), { kind: "image", error: null, seq: b });
  assert.equal(settleCopy(COPY_IDLE, gate, a, { ok: true, kind: "video" }), COPY_IDLE);
});

test("교체 뒤에는 이전 성공 표시의 타이머도 새 상태를 바꾸지 않는다", () => {
  const gate = createCopyGate();
  const oldSeq = gate.begin();
  const shown = settleCopy(COPY_IDLE, gate, oldSeq, { ok: true, kind: "image" });
  assert.equal(shown.kind, "image");
  gate.invalidate(); // 화면은 COPY_IDLE로 초기화됨
  assert.equal(copyExpired(COPY_IDLE, oldSeq), COPY_IDLE);
});
