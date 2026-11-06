import test from "node:test";
import assert from "node:assert/strict";
import { appendIds, moveTo, sameOrder, sortByTitle, withoutIds } from "../src/lib/trackOrder.ts";

test("순서: 자리 옮기기, 범위 밖은 맨 앞·맨 끝", () => {
  assert.deepEqual(moveTo(["a", "b", "c", "d"], "a", 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveTo(["a", "b", "c"], "c", 0), ["c", "a", "b"]);
  assert.deepEqual(moveTo(["a", "b", "c"], "a", 99), ["b", "c", "a"]);
  assert.deepEqual(moveTo(["a", "b", "c"], "b", -5), ["b", "a", "c"]);
});

test("순서: 제목 가나다순·숫자 크기순, 거꾸로", () => {
  const items = [
    { id: "1", title: "노래 10" },
    { id: "2", title: "노래 2" },
    { id: "3", title: "가을" },
  ];
  assert.deepEqual(sortByTitle(items, "asc"), ["3", "2", "1"]);
  assert.deepEqual(sortByTitle(items, "desc"), ["1", "2", "3"]);
});

test("순서: 빼기·덧붙이기(중복 없이), 같은 순서 비교", () => {
  assert.deepEqual(withoutIds(["a", "b", "c"], ["b"]), ["a", "c"]);
  assert.deepEqual(appendIds(["a", "b"], ["b", "c", "c", "d"]), ["a", "b", "c", "d"]);
  assert.equal(sameOrder(["a", "b"], ["a", "b"]), true);
  assert.equal(sameOrder(["a", "b"], ["b", "a"]), false);
});
