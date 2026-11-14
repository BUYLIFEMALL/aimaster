import { test } from "node:test";
import assert from "node:assert/strict";
import { applyInlineEdits, INLINE_FIELDS } from "../src/lib/builder/inline-edit.ts";
import { newBlock, validateDoc } from "../src/lib/blocks.ts";

// D7-2 유저 화면 위 글자 바로 고치기 — 정해진 블록·칸의 글자만, 결과는 저장 검사를 다시 거친다
const doc = () => {
  const t = newBlock("timesale", "t1");
  t.settings.ends_at = "2026-12-01T00:00:00.000Z"; // 기본값은 끝 시각이 비어 저장 검사를 못 지남
  return { schema_version: 1, blocks: [newBlock("hero", "h1"), newBlock("showcase", "s1"), t, newBlock("html", "x1")] };
};

test("고칠 수 있는 칸: 히어로 문구 4칸, 상품 블록 제목, 타임세일 부제", () => {
  assert.deepEqual(INLINE_FIELDS.hero, ["eyebrow", "title", "accent", "text"]);
  assert.deepEqual(INLINE_FIELDS.timesale, ["title", "subtitle"]);
  assert.ok(INLINE_FIELDS.showcase.includes("title"));
  assert.equal(INLINE_FIELDS.html, undefined); // 글·HTML 블록은 편집기에서만(위험 태그 검사가 필요)
});

test("정해진 칸은 바뀌고, 그 밖의 칸·없는 블록·모르는 칸은 건너뛴다", () => {
  const r = applyInlineEdits(doc(), [
    { blockId: "h1", field: "title", value: "  새 큰 제목  " },
    { blockId: "s1", field: "title", value: "이번 주 추천" },
    { blockId: "s1", field: "limit", value: "99" },
    { blockId: "x1", field: "html", value: "<script>" },
    { blockId: "zz", field: "title", value: "없는 블록" },
  ]);
  assert.equal(r.applied, 2);
  assert.equal(r.skipped, 3);
  const h = r.doc.blocks.find((b) => b.id === "h1").settings;
  assert.equal(h.title, "새 큰 제목");
  assert.equal(r.doc.blocks.find((b) => b.id === "s1").settings.limit, 8);
  assert.equal(validateDoc(r.doc).ok, true);
});

test("글자는 한 줄로(줄바꿈·연속 공백 정리), 설명만 줄바꿈 유지, 원본 문서는 그대로", () => {
  const d = doc();
  const r = applyInlineEdits(d, [
    { blockId: "h1", field: "title", value: "첫줄\n둘째줄   끝" },
    { blockId: "h1", field: "text", value: "설명 한 줄\n둘째 줄" },
  ]);
  const h = r.doc.blocks[0].settings;
  assert.equal(h.title, "첫줄 둘째줄 끝");
  assert.equal(h.text, "설명 한 줄\n둘째 줄");
  assert.notEqual(d.blocks[0].settings.title, h.title);
});

test("이상한 입력은 아무것도 바꾸지 않는다", () => {
  for (const bad of [null, "x", [{ blockId: 1, field: "title", value: "a" }], [{ blockId: "h1", field: "title", value: 3 }]]) {
    const r = applyInlineEdits(doc(), bad);
    assert.equal(r.applied, 0);
  }
  assert.equal(applyInlineEdits(doc(), Array.from({ length: 101 }, () => ({ blockId: "h1", field: "title", value: "a" }))).applied, 0); // 한 번에 100개까지
});
