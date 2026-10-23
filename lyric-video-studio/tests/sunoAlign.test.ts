import { test } from "node:test";
import assert from "node:assert/strict";
import { linesFromAlignedWords, plainSunoLyrics } from "../src/lib/sunoAlign.ts";

// 실제 응답과 같은 모양(단어 안 줄바꿈·구간 표시)의 만든 예시
const words = [
  { word: "[Verse 1]\n첫 ", startS: 10, endS: 10.4 },
  { word: "줄이에요\n", startS: 10.5, endS: 12 },
  { word: "둘째 ", startS: 12.2, endS: 12.6 },
  { word: "줄\n\n[Chorus]\n", startS: 12.7, endS: 14 },
  { word: "후렴 ", startS: 20, endS: 20.5 },
  { word: "끝\n\n", startS: 20.6, endS: 22 },
];

test("Suno 단어 시각을 줄 시간표로 묶는다", () => {
  const lines = linesFromAlignedWords(words);
  assert.deepEqual(lines.map((l) => [l.text, l.start, l.end]), [["첫 줄이에요", 10, 12], ["둘째 줄", 12.2, 14], ["후렴 끝", 20, 22]]);
  assert.equal(new Set(lines.map((l) => l.id)).size, 3);
});

test("잘못된 단어는 건너뛰고 구간 표시만 있는 줄은 버린다", () => {
  const lines = linesFromAlignedWords([{ word: "[Intro]\n", startS: 0, endS: 1 }, { word: "가", startS: NaN, endS: 2 }, { word: "나\n", startS: 3, endS: 3 }]);
  assert.deepEqual(lines.map((l) => [l.text, l.start, l.end]), [["나", 3, 3.2]]);
  assert.deepEqual(linesFromAlignedWords([]), []);
});

test("시간 가사가 없을 때 가사 글에서 구간 표시를 뺀다", () => {
  assert.equal(plainSunoLyrics("[Verse 1]\n첫 줄\n\n[Chorus]\n후렴 [x2]\n"), "첫 줄\n후렴");
});
