// v1.26 「이미지 스튜디오에서 생성」 주소(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { imageStudioLink, MAX_LINK_PROMPT } from "../src/lib/dna/studioLink.ts";

test("프롬프트를 이미지 스튜디오 2단계 칸 주소로", () => {
  const u = imageStudioLink(" cinematic portrait, soft light & film grain ");
  assert.equal(u, "https://ai-image-studio.buylife.xyz/dashboard?prompt=" + encodeURIComponent("cinematic portrait, soft light & film grain"));
  assert.equal(new URL(u).searchParams.get("prompt"), "cinematic portrait, soft light & film grain");
});

test("비었거나 너무 길면 링크를 만들지 않는다", () => {
  assert.equal(imageStudioLink(""), null);
  assert.equal(imageStudioLink(null), null);
  assert.equal(imageStudioLink("a".repeat(MAX_LINK_PROMPT + 1)), null);
  assert.ok(imageStudioLink("a".repeat(MAX_LINK_PROMPT)));
});
