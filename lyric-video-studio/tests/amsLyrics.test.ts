import { test } from "node:test";
import assert from "node:assert/strict";
import { amsTimedLines } from "../src/lib/amsLyrics.ts";

test("Lyria 시간 가사(2026-10-23 실제 응답 모양)를 줄 시간표로", () => {
  const raw = "[0.0:3.7] 창밖으로 적시는 빗소리\n[3.8:7.4] 오늘따라 네 생각이 깊어져\n[7.5:11.2] 식어버린 커피 컵을 만지다";
  assert.deepEqual(amsTimedLines(raw), [
    { start: 0, end: 3.7, text: "창밖으로 적시는 빗소리" },
    { start: 3.8, end: 7.4, text: "오늘따라 네 생각이 깊어져" },
    { start: 7.5, end: 11.2, text: "식어버린 커피 컵을 만지다" },
  ]);
});

test("줄 앞 구간 표시는 빼고, 시간이 거꾸로인 줄은 건너뛴다", () => {
  assert.deepEqual(amsTimedLines("[10:12] [Chorus] 후렴\n[5:4] 잘못"), [{ start: 10, end: 12, text: "후렴" }]);
});

test("시간 표시가 없거나 적으면 null(가사 글로 넣게)", () => {
  assert.equal(amsTimedLines("[Verse]\n그냥 가사\n둘째 줄"), null);
  assert.equal(amsTimedLines(""), null);
  assert.equal(amsTimedLines(null), null);
});
