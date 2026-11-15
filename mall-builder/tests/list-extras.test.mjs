import { test } from "node:test";
import assert from "node:assert/strict";
import { listFor, readList, validateList, MAX_PINNED } from "../src/lib/builder/pages.ts";

// I16 — 카테고리 목록 위·아래 자유 글 + 맨 위 고정 상품
const CAT = "11111111-2222-4333-8444-555555555555";
const P = (n) => `${String(n).padStart(8, "0")}-2222-4333-8444-555555555555`;

test("위·아래 글은 위험한 태그를 지우고, 빈 글·없는 고정 상품은 저장하지 않는다", () => {
  const v = validateList({ overrides: [{ category_id: CAT, top_html: "<p>안내</p><script>alert(1)</script>", bottom_html: "   ", pinned: [] }] });
  assert.equal(v.ok, true);
  const o = v.value.overrides[0];
  assert.ok(o.top_html.includes("<p>안내</p>"));
  assert.ok(!o.top_html.includes("script"));
  assert.equal("bottom_html" in o, false);
  assert.equal("pinned" in o, false);
});

test("고정 상품: 겹치면 하나로, 8개 넘거나 번호가 이상하면 거절", () => {
  assert.deepEqual(validateList({ overrides: [{ category_id: CAT, pinned: [P(1), P(1), P(2)] }] }).value.overrides[0].pinned, [P(1), P(2)]);
  assert.equal(validateList({ overrides: [{ category_id: CAT, pinned: Array.from({ length: MAX_PINNED + 1 }, (_, i) => P(i)) }] }).ok, false);
  assert.equal(validateList({ overrides: [{ category_id: CAT, pinned: ["x"] }] }).ok, false);
  assert.equal(validateList({ overrides: [{ category_id: CAT, top_html: "가".repeat(5001) }] }).ok, false);
});

test("읽기: 틀린 고정 상품만 건너뛰고, listFor가 그 카테고리 값만 돌려준다", () => {
  const list = readList({ overrides: [{ category_id: CAT, pinned: ["x", P(3)], top_html: "<b>위</b>" }] });
  const v = listFor(list, CAT);
  assert.deepEqual(v.pinned, [P(3)]);
  assert.ok(v.top_html.includes("<b>위</b>"));
  assert.equal(v.bottom_html, "");
  assert.deepEqual(listFor(list, P(9)).pinned, []);
});
