// v1.17 「인스타에 올리기」 주소·비율 판단(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { instaPostLink, instaRatioOk } from "../src/lib/instaHandoff.ts";

test("인스타 피드는 1:1만(9:16·3:4는 피드 비율 밖)", () => {
  assert.equal(instaRatioOk("1:1"), true);
  assert.equal(instaRatioOk("9:16"), false);
  assert.equal(instaRatioOk("3:4"), false);
});

test("INSTA 새 글 주소에 이미지·캡션·피드 형식", () => {
  const img = "https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/insta-post-images/u/a.jpg";
  const u = new URL(instaPostLink(img, "오늘도 수고했어요 & 고마워요"));
  assert.equal(u.origin + u.pathname, "https://auto-instagram-posting.buylife.xyz/posts/new");
  assert.equal(u.searchParams.get("imageUrl"), img);
  assert.equal(u.searchParams.get("caption"), "오늘도 수고했어요 & 고마워요");
  assert.equal(u.searchParams.get("postType"), "feed");
});
