import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCategoryTree, flattenTree, swapTarget, nextSort, categoryPath, categoryNameError } from "../src/lib/categories.ts";

const rows = [
  { id: "a", parent_id: null, name: "식품", depth: 1, sort: 20, is_visible: true },
  { id: "b", parent_id: null, name: "가전", depth: 1, sort: 10, is_visible: true },
  { id: "c", parent_id: "a", name: "과일", depth: 2, sort: 10, is_visible: false },
  { id: "d", parent_id: "c", name: "사과", depth: 3, sort: 10, is_visible: true },
  { id: "e", parent_id: "a", name: "채소", depth: 2, sort: 20, is_visible: true },
];

test("순서대로 트리 — sort 작은 것이 먼저", () => {
  const tree = buildCategoryTree(rows, true);
  assert.deepEqual(tree.map((n) => n.name), ["가전", "식품"]);
  assert.deepEqual(tree[1].children.map((n) => n.name), ["과일", "채소"]);
});

test("손님 화면 — 숨긴 카테고리와 그 아래는 빠진다", () => {
  const names = flattenTree(buildCategoryTree(rows, false)).map((n) => n.name);
  assert.deepEqual(names, ["가전", "식품", "채소"]);
});

test("운영자 화면 — 상위가 숨겨진 칸은 표시", () => {
  const flat = flattenTree(buildCategoryTree(rows, true));
  assert.equal(flat.find((n) => n.id === "d").hiddenByParent, true);
  assert.equal(flat.find((n) => n.id === "c").hiddenByParent, false);
  assert.equal(flat.find((n) => n.id === "e").hiddenByParent, false);
});

test("순서 바꾸기 상대 — 같은 상위의 형제끼리만", () => {
  assert.equal(swapTarget(rows, "a", "up").b.id, "b");
  assert.equal(swapTarget(rows, "a", "down"), null);
  assert.equal(swapTarget(rows, "c", "down").b.id, "e");
  assert.equal(swapTarget(rows, "d", "up"), null);
});

test("새 순서 값", () => {
  assert.equal(nextSort(rows, null), 30);
  assert.equal(nextSort(rows, "d"), 10);
});

test("경로", () => {
  assert.deepEqual(categoryPath(rows, "d").map((r) => r.name), ["식품", "과일", "사과"]);
});

test("이름 길이", () => {
  assert.equal(categoryNameError("과일"), null);
  assert.notEqual(categoryNameError(" "), null);
  assert.notEqual(categoryNameError("가".repeat(31)), null);
});
