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
