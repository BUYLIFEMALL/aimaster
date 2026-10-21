import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLyrics, parseTime, stampLine, timeline, lineAt, toSrt, shiftAll, clearFrom } from "../src/lib/lyrics.ts";

test("시간 표기 여러 형식", () => {
  assert.equal(parseTime("00:00:01,500"), 1.5);
  assert.equal(parseTime("00:01.000"), 1);
  assert.equal(parseTime("1:02:03.45"), 3723.45);
  assert.equal(parseTime("2:03"), 123);
  assert.ok(Number.isNaN(parseTime("abc")));
});

test("표준 srt", () => {
  const r = parseLyrics("1\n00:00:01,000 --> 00:00:03,000\n첫 줄\n\n2\n00:00:03,500 --> 00:00:06,000\n둘째 줄\n셋째 줄\n", "a.srt");
  assert.equal(r.source, "srt"); assert.equal(r.lines.length, 2);
  assert.equal(r.lines[1].text, "둘째 줄\n셋째 줄"); assert.equal(r.lines[1].end, 6);
});

test("형식이 틀린 srt(번호 없음·화살표 공백 없음·CRLF·BOM·앞 빈 줄·태그)", () => {
  const tag = String.raw`{\an8}`;
  const raw = "﻿\r\n\r\n00:00:01,000-->00:00:02,000\r\n<i>하나</i>\r\n\r\n3\r\n00:02.5 --> 00:04.0\r\n" + tag + "둘\r\n\r\n잘못된 블록\r\n";
  const r = parseLyrics(raw, "x.srt");
  assert.deepEqual(r.lines.map((l) => l.text), ["하나", "둘"]);
  assert.equal(r.lines[1].start, 2.5); assert.equal(r.skipped, 1);
});

test("lrc 여러 시간표·끝은 다음 줄 시작", () => {
  const r = parseLyrics("[ti:노래]\n[00:10.00]A\n[00:05.50][00:20.00]후렴\n[00:30.00]\n", "a.lrc");
  assert.equal(r.source, "lrc");
  assert.deepEqual(r.lines.map((l) => [l.start, l.text]), [[5.5, "후렴"], [10, "A"], [20, "후렴"]]);
  assert.equal(r.lines[0].end, 10); assert.equal(r.lines[2].end, 30);
});

test("붙여넣기 + 탭 싱크", () => {
  let { lines } = parseLyrics("가\n\n나\n다");
  assert.equal(lines.length, 3); assert.equal(lines[0].start, -1);
  lines = stampLine(lines, 0, 1); lines = stampLine(lines, 1, 3.2); lines = stampLine(lines, 2, 5);
  assert.equal(lines[0].end, 3.2); assert.equal(lines[1].end, 5); assert.ok(lines[2].end > 5);
  const tl = timeline(lines, 7);
  assert.equal(tl[2].end, 7);
  assert.deepEqual(lineAt(tl, 0.5), { index: -1, gap: true });
  assert.deepEqual(lineAt(tl, 3.3), { index: 1, gap: false });
  lines = clearFrom(lines, 1); assert.equal(lines[1].start, -1); assert.equal(lines[2].start, -1);
});

test("시간 밀기·srt 내보내기 왕복", () => {
  const r = parseLyrics("[00:01.00]가\n[00:03.00]나\n");
  const moved = shiftAll(r.lines, 0.5);
  const back = parseLyrics(toSrt(moved), "b.srt");
  assert.deepEqual(back.lines.map((l) => [l.start, l.end, l.text]), [[1.5, 3.5, "가"], [3.5, 7.5, "나"]]);
});
