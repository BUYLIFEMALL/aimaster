import test from "node:test";
import assert from "node:assert/strict";
import { REF_MARK as MARK, refBlockHeader, refBlocks, removeRefBlock } from "../src/lib/refBlocks.ts";
import { REF_MARK, referenceBlocks } from "../src/lib/reference.ts";

test("머리말 표시가 베끼기 검사 기준(reference.ts)과 같다", () => {
  assert.equal(MARK, REF_MARK);
});

test("새 머리말: 출처가 한 번만, 베끼기 검사 블록으로 그대로 인식", () => {
  const ref = `${refBlockHeader("INSTA 포스팅 자동화")}\n안녕하세요 대사입니다`;
  assert.equal(ref.includes("에서 넘겨받은"), false);
  assert.equal(referenceBlocks(ref), "안녕하세요 대사입니다");
  assert.deepEqual(refBlocks(ref), [{ source: "INSTA 포스팅 자동화", chars: 11, start: 0 }]);
});

test("예전 머리말(v1.29~v1.34)도 출처를 읽는다", () => {
  const ref = [
    "[레퍼런스 쇼츠 대본 — 「INSTA 포스팅 자동화에서 넘겨받은 레퍼런스 쇼츠」에서 실제로 말한 내용, 그대로 베끼지 말고 구성·후킹만 참고]\n가나",
    "[레퍼런스 쇼츠 대본 — 「넘겨받은 레퍼런스 쇼츠」에서 실제로 말한 내용, 그대로 베끼지 말고 구성·후킹만 참고]\n다라마",
    "[레퍼런스 쇼츠 대본 — 「a.mp4」에서 실제로 말한 내용, 그대로 베끼지 말고 구성·후킹만 참고]\n바",
  ].join("\n\n");
  assert.deepEqual(refBlocks(ref).map((b) => b.source), ["INSTA 포스팅 자동화", "", "a.mp4"]);
});

test("빼기: 그 블록만 지우고 회원 메모·다른 블록은 그대로", () => {
  const memo = "내 메모 첫 줄\n둘째 줄";
  const ref = [memo, `${refBlockHeader("A")}\n대사A`, `${refBlockHeader("B")}\n대사B`].join("\n\n");
  assert.equal(removeRefBlock(ref, 0), [memo, `${refBlockHeader("B")}\n대사B`].join("\n\n"));
  assert.equal(removeRefBlock(ref, 1), [memo, `${refBlockHeader("A")}\n대사A`].join("\n\n"));
  assert.equal(removeRefBlock(`${refBlockHeader("A")}\n대사A`, 0), "");
  assert.deepEqual(refBlocks(memo), []);
});

// ── v1.36 띠 → 칸 안 위치, 긴 이름 줄이기 ──
import { shortSource } from "../src/lib/refBlocks.ts";
test("블록 시작 위치: 머리말 첫 글자를 가리킨다", () => {
  const ref = ["메모", `${refBlockHeader("A")}\n대사A`, `${refBlockHeader("B")}\n대사B`].join("\n\n");
  for (const b of refBlocks(ref)) assert.equal(ref.slice(b.start, b.start + 11), "[레퍼런스 쇼츠 대본");
  assert.deepEqual(refBlocks(ref).map((b) => b.source), ["A", "B"]);
});
test("긴 출처 이름은 20자에서 줄임", () => {
  assert.equal(shortSource("짧은 이름"), "짧은 이름");
  assert.equal(shortSource("가".repeat(25)), `${"가".repeat(20)}…`);
});
