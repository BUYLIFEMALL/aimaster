import test from "node:test";
import assert from "node:assert/strict";
import { buildChapters, buildCsv, formatClock, startTimes, suggestedFileName } from "../lib/songListExport.ts";

const songs = [
  { planningTitle: "비 오는 밤", title: "빗속의 다짐", mode: "vocal", durationSeconds: 181, style: "city pop, \"warm\"" },
  { planningTitle: "비 오는 밤", title: "빗속의 다짐", mode: "vocal", durationSeconds: 3500, style: null },
  { planningTitle: "드라이브", title: "a/b:c", mode: "instrumental", durationSeconds: null, style: "lofi" },
  { planningTitle: "드라이브", title: "마지막 곡", mode: "vocal", durationSeconds: 120, style: null },
];

test("시작 시각: 길이를 모르는 곡 다음부터는 알 수 없음", () => {
  assert.deepEqual(startTimes(songs), [0, 181, 3681, null]);
  assert.equal(formatClock(181), "3:01");
  assert.equal(formatClock(3681), "1:01:21");
});

test("목차: 같은 제목도 각각 줄로, 시각 모르는 곡은 제목만", () => {
  assert.equal(buildChapters(songs), "0:00 빗속의 다짐\n3:01 빗속의 다짐\n1:01:21 a/b:c\n마지막 곡");
});

test("CSV: BOM·따옴표 이스케이프·연주곡 표시·권장 파일명", () => {
  const csv = buildCsv(songs);
  assert.ok(csv.startsWith("﻿순서,기획,곡 제목,버전,길이,영상 안 시작,스타일,권장 파일명\r\n"));
  const lines = csv.slice(1).trim().split("\r\n");
  assert.equal(lines.length, 5);
  assert.equal(lines[1], '1,비 오는 밤,빗속의 다짐,보컬,3:01,0:00,"city pop, ""warm""",01 - 빗속의 다짐.mp3');
  assert.equal(lines[2], "2,비 오는 밤,빗속의 다짐,보컬,58:20,3:01,,02 - 빗속의 다짐.mp3");
  assert.equal(lines[3], "3,드라이브,a/b:c,연주곡,,1:01:21,lofi,03 - a_b_c.mp3");
  assert.equal(lines[4], "4,드라이브,마지막 곡,보컬,2:00,,,04 - 마지막 곡.mp3");
  assert.equal(suggestedFileName(0, "   "), "01 - 제목 없음.mp3");
});
