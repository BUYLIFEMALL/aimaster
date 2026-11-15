import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDoc } from "../src/lib/blocks.ts";

// I22 — 본문 글 정렬: 가운데만 저장, 그 밖의 값은 버림(기본 = 왼쪽)
test("text_align은 center만 남고 left·이상한 값은 저장하지 않는다", () => {
  const blk = (text_align) => ({ id: "a", type: "html", visible: true, settings: { html: "<p>안녕</p>" }, style: { text_align } });
  assert.equal(validateDoc({ blocks: [blk("center")] }).value.blocks[0].style.text_align, "center");
  assert.equal(validateDoc({ blocks: [blk("left")] }).value.blocks[0].style, undefined);
  assert.equal(validateDoc({ blocks: [blk("right")] }).value.blocks[0].style, undefined);
});
