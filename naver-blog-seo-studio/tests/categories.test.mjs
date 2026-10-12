import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeCategories, categoryName, DEFAULT_CATEGORIES } from "../lib/categories.ts";
import { readNaverCategory, readNaverCategoryList, reconcileNaverCategory } from "../lib/naverCategory.ts";

test("카테고리: 형식 검사·중복 제거·순서 다시 매기기", () => {
  const out = sanitizeCategories([{ id: "a", name: " 육아 " }, { id: "a", name: "중복" }, { id: "", name: "빈id" }, { id: "b", name: "" }, { id: "c", name: "여행" }, "x", null]);
  assert.deepEqual(out.map((c) => [c.id, c.name, c.sort_order]), [["a", "육아", 1], ["c", "여행", 2]]);
  assert.deepEqual(sanitizeCategories("나쁜값"), []);
  assert.equal(categoryName(out, "c"), "여행");
  assert.equal(categoryName(out, "없음"), null);
  assert.equal(DEFAULT_CATEGORIES.length, 6);
});

test("네이버 카테고리: 번호·이름 형식과 목록 대조", () => {
  assert.deepEqual(readNaverCategory({ id: "12", name: " 경제 이야기 " }), { id: "12", name: "경제 이야기" });
  assert.equal(readNaverCategory({ id: "abc", name: "x" }), null);
  assert.equal(readNaverCategory({ id: "5", name: "" }), null);
  const list = readNaverCategoryList([{ id: "1", name: "a" }, { id: "1", name: "중복" }, { id: "x", name: "나쁨" }, { id: "2", name: "b" }]);
  assert.deepEqual(list.map((c) => c.id), ["1", "2"]);
  assert.deepEqual(reconcileNaverCategory({ id: "1", name: "옛 이름" }, list), { id: "1", name: "a" });
  assert.equal(reconcileNaverCategory({ id: "9", name: "삭제됨" }, list), null);
});
