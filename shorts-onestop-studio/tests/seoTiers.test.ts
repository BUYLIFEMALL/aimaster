import test from "node:test";
import assert from "node:assert/strict";
import { keepTiers, readTiers } from "../src/lib/seoTiers.ts";

test("V7 해시태그 3단 — 단계 순서대로 목록을 만들고 겹치는 태그는 한 번만, # 붙이고 띄어쓰기 없앰", () => {
  const r = readTiers({ popular: ["#shorts", "캠핑"], mid: ["#캠핑초보", "#shorts"], niche: ["#가을캠핑 실수"] })!;
  assert.deepEqual(r.hashtags, ["#shorts", "#캠핑", "#캠핑초보", "#가을캠핑실수"]);
  assert.deepEqual(r.tiers, { popular: ["#shorts", "#캠핑"], mid: ["#캠핑초보"], niche: ["#가을캠핑실수"] });
});

test("3단이 없거나 비어 있으면 null(예전 hashtags로 돌아감)", () => {
  assert.equal(readTiers(undefined), null);
  assert.equal(readTiers("x"), null);
  assert.equal(readTiers({ popular: [], mid: [], niche: [] }), null);
});

test("단계당 4개, 전체 10개까지만", () => {
  const many = (p: string) => Array.from({ length: 6 }, (_, i) => `#${p}${i}`);
  const r = readTiers({ popular: many("a"), mid: many("b"), niche: many("c") })!;
  assert.equal(r.tiers.popular.length, 4);
  assert.equal(r.hashtags.length, 10);
  assert.equal(r.tiers.niche.length, 2);
});

test("해시태그 칸을 고치면 빠진 태그는 단계에서도 빠지고, 모두 빠지면 3단 표시를 없앤다", () => {
  const tiers = { popular: ["#a", "#b"], mid: ["#c"], niche: ["#d"] };
  assert.deepEqual(keepTiers(tiers, ["#a", "#d", "#new"]), { popular: ["#a"], mid: [], niche: ["#d"] });
  assert.equal(keepTiers(tiers, ["#new"]), undefined);
  assert.equal(keepTiers(undefined, ["#a"]), undefined);
});
