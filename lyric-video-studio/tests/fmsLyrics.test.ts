import test from "node:test";
import assert from "node:assert/strict";
import { fmsTimedLines } from "../src/lib/fmsLyrics.ts";

test("무료음악 가사 시간: 시각 있는 줄만, 빈 끝은 다음 줄 시작·곡 길이까지", () => {
  const timing = {
    cues: [
      { text: "첫 줄", start: 1, end: 3.5 },
      { text: "시간 없음", start: null, end: null },
      { text: "둘째 줄", start: 4, end: null },
      { text: "  셋째 줄 ", start: 8, end: null },
    ],
  };
  assert.deepEqual(fmsTimedLines(timing, 12), [
    { start: 1, end: 3.5, text: "첫 줄" },
    { start: 4, end: 8, text: "둘째 줄" },
    { start: 8, end: 12, text: "셋째 줄" },
  ]);
  assert.deepEqual(fmsTimedLines({ cues: [{ text: "끝", start: 5, end: 2 }] }, null), [{ start: 5, end: 9, text: "끝" }]);
});

test("무료음악 가사 시간: 시간이 하나도 없으면 null", () => {
  assert.equal(fmsTimedLines(null, 30), null);
  assert.equal(fmsTimedLines({ cues: [{ text: "가", start: null, end: null }] }, 30), null);
});
