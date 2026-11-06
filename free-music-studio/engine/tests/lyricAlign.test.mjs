import test from "node:test";
import assert from "node:assert/strict";
import { lyricAlignmentSupport, lyricTool, toSiteTiming } from "../src/lyricAlign.mjs";
import { normalizeLyrics } from "../src/lyric-timing.mjs";
import { stepArgs } from "../src/pyengines.mjs";

test("지원 범위: 한국어·영어, 10분 이하만", () => {
  const { lines } = normalizeLyrics("[Verse]\n창가에 비가 내리고");
  assert.equal(lyricAlignmentSupport({ lines, duration: 120 }).language.code, "ko");
  assert.equal(lyricAlignmentSupport({ lines, duration: 601 }).supported, false);
  assert.equal(lyricAlignmentSupport({ lines: normalizeLyrics("こんにちは").lines, duration: 60 }).supported, false);
  assert.equal(lyricAlignmentSupport({ lines: normalizeLyrics("hello rain").lines, duration: 60 }).language.code, "en");
});

test("사이트 형식: unmatched·agreed는 확인 필요, 전부 확정이면 automatic", () => {
  const base = { lyricsHash: "a".repeat(64), duration: 30.12345 };
  const r = toSiteTiming({ ...base, cues: [{ lineId: "l1", text: "가", start: 1.23456, end: 3, status: "automatic" }, { lineId: "l2", text: "나", start: null, end: null, status: "unmatched" }] });
  assert.equal(r.status, "review");
  assert.deepEqual(r.cues.map((c) => c.status), ["automatic", "review"]);
  assert.equal(r.cues[0].start, 1.235);
  assert.equal(r.duration, 30.123);
  assert.equal(toSiteTiming({ ...base, cues: [{ lineId: "l1", text: "가", start: 1, end: 2, status: "manual" }] }).status, "automatic");
});

test("설치 묶음: 원본과 같은 판", () => {
  const t = lyricTool("cpu");
  const p = { python: "py", root: "r", src: "s" };
  assert.ok(stepArgs(t.steps[0], p, t.catalog).includes("https://download.pytorch.org/whl/cpu"));
  assert.ok(stepArgs(t.steps[1], p, t.catalog).includes("transformers==5.19.0"));
});
