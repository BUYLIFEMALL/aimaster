import { test } from "node:test";
import assert from "node:assert/strict";
import { countLyricLines, fitLyrics, maxLyricLines } from "../lib/lyricsLength.ts";

const make = (tag, n) => [`[${tag}]`, ...Array.from({ length: n }, (_, i) => `${tag} 줄 ${i + 1}`)].join("\n");

test("곡 길이별 상한", () => {
  assert.equal(maxLyricLines(30), 10);
  assert.equal(maxLyricLines(120), 22);
  assert.equal(maxLyricLines(240), 34);
});

test("상한 이하면 그대로", () => {
  const s = `${make("Verse", 4)}\n\n${make("Chorus", 4)}`;
  assert.equal(fitLyrics(s, 10), s);
});

test("넘치면 구간 단위로 앞에서부터 담는다 (2026-10-23 실사례: 30초 곡 27줄)", () => {
  const s = [make("Verse", 4), make("Chorus", 4), make("Verse 2", 4), make("Pre-Chorus", 2), make("Chorus", 4), make("Bridge", 4), make("Outro", 5)].join("\n\n");
  assert.equal(countLyricLines(s), 27);
  const out = fitLyrics(s, 10);
  assert.equal(countLyricLines(out), 8);
  assert.match(out, /^\[Verse\]/);
  assert.match(out, /\[Chorus\]/);
  assert.doesNotMatch(out, /Verse 2/);
});

test("첫 구간이 상한보다 길면 그 안에서 줄 단위로 자른다", () => {
  const out = fitLyrics(make("Verse", 15), 10);
  assert.equal(countLyricLines(out), 10);
  assert.match(out, /^\[Verse\]/);
});

test("구간 표시가 없는 가사도 줄 단위로 자른다", () => {
  const s = Array.from({ length: 20 }, (_, i) => `줄 ${i}`).join("\n");
  assert.equal(countLyricLines(fitLyrics(s, 10)), 10);
});
