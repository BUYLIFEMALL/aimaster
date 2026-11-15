import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDoc } from "../src/lib/blocks.ts";

// I8 — 블록 제목 색·크기: 올바른 값만 저장, 기본(보통·테마 색)은 저장하지 않음
const doc = (style) => validateDoc({ blocks: [{ id: "a", type: "notice", visible: true, settings: { title: "공지", count: 5 }, style }] });

test("제목 색은 #rrggbb만(소문자로), 크기는 sm·lg만 남는다", () => {
  assert.deepEqual(doc({ title_color: "#AA3300", title_size: "lg" }).value.blocks[0].style, { title_color: "#aa3300", title_size: "lg" });
  assert.equal(doc({ title_color: "red", title_size: "" }).value.blocks[0].style, undefined);
  assert.equal(doc({ title_color: "#123", title_size: "xl" }).value.blocks[0].style, undefined);
});
