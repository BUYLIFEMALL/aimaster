import test from "node:test";
import assert from "node:assert/strict";
import { filterTracks, isInstrumental, sortTracks } from "../src/lib/trackFilters.ts";

const rows = [
  { id: "a", title: "노래 10", lyrics: "[Verse]\n가을", kind: "text2music", duration_sec: 180, created_at: "2026-11-01T00:00:00Z" },
  { id: "b", title: "노래 2", lyrics: "[Instrumental]\n", kind: "text2music", duration_sec: 240, created_at: "2026-11-03T00:00:00Z" },
  { id: "c", title: "가을 · Cover", lyrics: "가을", kind: "cover", duration_sec: 120, created_at: "2026-11-02T00:00:00Z" },
];

test("필터: 연주곡은 가사가 비었거나 태그만, 보컬·커버·그림 없음", () => {
  assert.equal(isInstrumental({ lyrics: "  [Intro] [Outro] " }), true);
  assert.equal(isInstrumental({ lyrics: "[Verse] 한 줄" }), false);
  const ids = (l) => l.map((t) => t.id);
  assert.deepEqual(ids(filterTracks(rows, "instrumental", () => true)), ["b"]);
  assert.deepEqual(ids(filterTracks(rows, "vocal", () => true)), ["a", "c"]);
  assert.deepEqual(ids(filterTracks(rows, "cover", () => true)), ["c"]);
  assert.deepEqual(ids(filterTracks(rows, "noArt", (id) => id === "a")), ["b", "c"]);
  assert.equal(filterTracks(rows, "all", () => true), rows);
});

test("필터: 가사 시간 없음(연주곡 제외)·LRC 확인 필요", () => {
  const timed = [
    { ...rows[0], lyric_timing: { cues: [{ start: 1, status: "manual" }] } },
    { ...rows[2], lyric_timing: { cues: [{ start: null, status: "review" }] } },
    rows[1],
  ];
  assert.deepEqual(filterTracks(timed, "noTiming", () => true).map((t) => t.id), ["c"]);
  assert.deepEqual(filterTracks(timed, "timingReview", () => true).map((t) => t.id), ["c"]);
});

test("정렬: 최신·오래된·제목(숫자 크기)·길이, manual은 그대로", () => {
  const ids = (s) => sortTracks(rows, s).map((t) => t.id);
  assert.deepEqual(ids("newest"), ["b", "c", "a"]);
  assert.deepEqual(ids("oldest"), ["a", "c", "b"]);
  assert.deepEqual(ids("title"), ["c", "b", "a"]);
  assert.deepEqual(ids("longest"), ["b", "a", "c"]);
  assert.deepEqual(ids("shortest"), ["c", "a", "b"]);
  assert.equal(sortTracks(rows, "manual"), rows);
});
