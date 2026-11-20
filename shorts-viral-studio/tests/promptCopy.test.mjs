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
