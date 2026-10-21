import test from "node:test";
import assert from "node:assert/strict";
import { linesFromAlignedWords } from "../lib/sunoAlign.ts";
import { toLrc, toSrt } from "../lib/lyricsFormat.ts";

// 2026-10-21 실제 응답 모양(가사영상 세션 확인): 단어 안에 줄바꿈과 [구간] 표시가 섞여 온다.
const words = [
  { word: "[Verse 1]\n비 ", startS: 10.5, endS: 10.9 },
  { word: "오는 ", startS: 10.9, endS: 11.3 },
  { word: "밤\n", startS: 11.3, endS: 12.0 },
  { word: "[Chorus]\n빗속의 ", startS: 61.25, endS: 61.8 },
  { word: "다짐\n", startS: 61.8, endS: 63.04 },
];

test("aligned words become timed lines without section tags", () => {
  const lines = linesFromAlignedWords(words);
  assert.deepEqual(lines.map((l) => [l.start, l.end, l.text]), [[10.5, 12.0, "비 오는 밤"], [61.25, 63.04, "빗속의 다짐"]]);
});

test("LRC and SRT formats", () => {
  const lines = linesFromAlignedWords(words);
  assert.equal(toLrc(lines, "빗속의 다짐"), "[ti:빗속의 다짐]\n[00:10.50]비 오는 밤\n[01:01.25]빗속의 다짐\n");
  assert.equal(toSrt(lines), "1\n00:00:10,500 --> 00:00:12,000\n비 오는 밤\n\n2\n00:01:01,250 --> 00:01:03,040\n빗속의 다짐\n");
});
