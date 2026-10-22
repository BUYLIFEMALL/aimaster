// v1.12 바나나 캔버스로 보내기 — 무료 시험
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bananaLink, MAX_BANANA_IDEA } from "../src/lib/rpa/bananaLink.ts";

test("이미지 프롬프트 → 바나나 아이디어 주소(600자 이하만)", () => {
  assert.equal(bananaLink(" a cat in space "), "https://banana-canvas.buylife.xyz/studio?idea=a%20cat%20in%20space");
  assert.ok(bananaLink("x".repeat(MAX_BANANA_IDEA)));
  assert.equal(bananaLink("x".repeat(MAX_BANANA_IDEA + 1)), null);
  assert.equal(bananaLink(""), null);
});

test("이미지 결과에만 편집 칸 프롬프트로 연결", () => {
  const src = readFileSync(new URL("../src/components/studio/Analyzer.tsx", import.meta.url), "utf8");
  assert.match(src, /bananaLink\(promptEdit\)!/);
});
