// v1.24 바나나에서 배경 만들기 링크 — 무료 시험
import test from "node:test";
import assert from "node:assert/strict";
import { bananaBackgroundLink, quoteBackgroundIdea, MAX_BANANA_IDEA } from "../src/lib/studio/bananaLink.ts";

test("글귀 → 바나나 아이디어 주소", () => {
  assert.equal(quoteBackgroundIdea("오늘도\n  수고했어요 "), "글자 없이, 이 글귀의 분위기를 담은 감성 배경 이미지: 오늘도 수고했어요");
  const url = bananaBackgroundLink("오늘도 수고했어요");
  assert.ok(url.startsWith("https://banana-canvas.buylife.xyz/studio?idea="));
  assert.equal(new URL(url).searchParams.get("idea"), quoteBackgroundIdea("오늘도 수고했어요"));
  assert.equal(new URL(url).searchParams.get("src"), "emotion-writer");
  assert.equal(bananaBackgroundLink("가".repeat(MAX_BANANA_IDEA)), null);
  assert.equal(bananaBackgroundLink(""), null);
});
