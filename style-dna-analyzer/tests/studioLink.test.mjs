// v1.26 「이미지 스튜디오에서 생성」 주소(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { imageStudioLink, MAX_LINK_PROMPT } from "../src/lib/dna/studioLink.ts";

test("프롬프트를 이미지 스튜디오 2단계 칸 주소로", () => {
  const u = imageStudioLink(" cinematic portrait, soft light & film grain ");
  assert.equal(u, "https://ai-image-studio.buylife.xyz/dashboard?prompt=" + encodeURIComponent("cinematic portrait, soft light & film grain") + "&src=style-dna-analyzer");
  assert.equal(new URL(u).searchParams.get("prompt"), "cinematic portrait, soft light & film grain");
});

test("비었거나 너무 길면 링크를 만들지 않는다", () => {
  assert.equal(imageStudioLink(""), null);
  assert.equal(imageStudioLink(null), null);
  assert.equal(imageStudioLink("a".repeat(MAX_LINK_PROMPT + 1)), null);
  assert.ok(imageStudioLink("a".repeat(MAX_LINK_PROMPT)));
});

test("v1.35 바나나 캔버스로 보내기 링크(600자 이하만)", async () => {
  const { bananaLink, MAX_BANANA_IDEA } = await import("../src/lib/dna/studioLink.ts");
  assert.equal(bananaLink("  cat in space "), "https://banana-canvas.buylife.xyz/studio?idea=cat%20in%20space&src=style-dna-analyzer");
  assert.equal(bananaLink("x".repeat(MAX_BANANA_IDEA)).length > 0, true);
  assert.equal(bananaLink("x".repeat(MAX_BANANA_IDEA + 1)), null);
  assert.equal(bananaLink(""), null);
});
