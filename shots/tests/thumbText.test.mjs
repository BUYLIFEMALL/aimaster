import test from "node:test";
import assert from "node:assert/strict";
import { splitThumbTitle, THUMB_MAX_CHARS } from "../src/lib/thumbText.ts";

test("짧거나 한 낱말이면 한 줄", () => {
  assert.deepEqual(splitThumbTitle("오늘의 꿀팁"), ["오늘의 꿀팁"]);
  assert.deepEqual(splitThumbTitle("가나다라마바사아자차카타파하가나"), ["가나다라마바사아자차카타파하가나"]);
  assert.deepEqual(splitThumbTitle("   "), []);
});

test("길면 두 줄 길이가 비슷하게 나눈다", () => {
  assert.deepEqual(splitThumbTitle("하루 10분 투자로 월급 외 수입 만드는 법"), ["하루 10분 투자로", "월급 외 수입 만드는 법"]);
});

test("최대 글자 수로 자른다", () => {
  const lines = splitThumbTitle("가 ".repeat(40));
  assert.ok(lines.join(" ").length <= THUMB_MAX_CHARS);
});
