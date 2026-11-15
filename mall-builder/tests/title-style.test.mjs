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

// E10 — 블록 제목 글꼴: 등록된 글꼴 id만 남고, 쓴 글꼴만 불러올 주소가 나온다
import { TITLE_FONTS, titleFontHref } from "../src/lib/blocks.ts";
test("제목 글꼴은 등록된 id만 저장, 기본(빈 값)은 저장하지 않음", () => {
  assert.deepEqual(doc({ title_font: "serif" }).value.blocks[0].style, { title_font: "serif" });
  assert.equal(doc({ title_font: "" }).value.blocks[0].style, undefined);
  assert.equal(doc({ title_font: "Comic Sans" }).value.blocks[0].style, undefined);
});
test("글꼴마다 무료 구글 글꼴 주소 하나, 모르는 id는 null", () => {
  for (const id of Object.keys(TITLE_FONTS)) {
    const href = titleFontHref(id);
    assert.match(href, /^https:\/\/fonts\.googleapis\.com\/css2\?family=[A-Za-z+]+(:wght@\d+)?&display=swap$/);
  }
  assert.equal(titleFontHref("nope"), null);
  assert.equal(titleFontHref(undefined), null);
});
