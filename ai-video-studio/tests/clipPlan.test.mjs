import test from "node:test";
import assert from "node:assert/strict";
import { buildPieces, cleanSegments, encodeWav, findSilences, fixPick, parsePicks, piecesSeconds, splitCaption, toEdl, toSrt } from "../lib/clip/clipPlan.ts";

// 2026-11-06 사전 검증 영상(2분 6초)의 실제 문장 경계 일부
const SEGS = [
  { start: 0, end: 8.0, text: "안녕하세요. 오늘은 접이식 휴대용 선풍기 이야기를 해보려고 합니다." },
  { start: 10.7, end: 16.2, text: "음, 그러니까 먼저 상자부터 보면요." },
  { start: 17.4, end: 21.9, text: "설명서 한 장이랑 충전선이 들어 있습니다." },
  { start: 25.7, end: 34.9, text: "그런데 이 선풍기의 진짜 장점은 무게입니다." },
  { start: 37.0, end: 41.4, text: "여름에 출퇴근할 때 꺼내 쓰기 딱 좋았습니다." },
  { start: 86.8, end: 96.4, text: "아쉬운 점도 솔직하게 말씀드릴게요." },
  { start: 97.4, end: 100.8, text: "목에 거는 줄은 따로 사야 합니다." },
  { start: 103.8, end: 109.4, text: "정리하면 충분히 추천할 만합니다." },
];

test("끝부분 없는 말(무음 안의 0.1초 문장)은 버리고, 무음에 걸친 경계는 무음 가장자리로", () => {
  const silences = [[115.2, 118.4], [125.5, 127]];
  const segs = cleanSegments([
    { start: 111.2, end: 116.0, text: " 오늘 영상은  여기까지입니다. " },
    { start: 126.4, end: 126.5, text: "고맙습니다." },
    { start: 120, end: 121, text: "   " },
  ], silences);
  assert.deepEqual(segs, [{ start: 111.2, end: 115.2, text: "오늘 영상은 여기까지입니다." }]);
});

test("AI 구간이 15초보다 짧으면 다음 문장을 붙여 맞춘다(사전 검증의 14.0초 사례)", () => {
  const p = fixPick({ first: 5, last: 6, score: 72, title: "단점", reason: "" }, SEGS);
  assert.deepEqual([p.first, p.last], [5, 7]);
  assert.ok(SEGS[p.last].end - SEGS[p.first].start >= 15);
});

test("45초를 넘으면 뒤에서 빼고, 범위 밖 번호·뒤바뀐 번호도 고친다", () => {
  const long = fixPick({ first: 0, last: 7, score: 50, title: "", reason: "" }, SEGS);
  assert.ok(SEGS[long.last].end - SEGS[long.first].start <= 45);
  const odd = fixPick({ first: 99, last: -3, score: 150, title: "", reason: "" }, SEGS);
  assert.ok(odd.first <= odd.last);
  assert.equal(odd.score, 100);
});

test("AI 응답: 점수 순·중복 제거·최대 3개, 깨진 값은 건너뜀", () => {
  const picks = parsePicks({ clips: [
    { first: 3, last: 4, score: 85, title: "장점", reason: "a" },
    { first: 3, last: 4, score: 60, title: "중복", reason: "b" },
    null,
    { first: 5, last: 7, score: 90, title: "단점", reason: "c" },
  ] }, SEGS);
  assert.deepEqual(picks.map((p) => p.title), ["단점", "장점"]);
  assert.deepEqual(parsePicks("bad", SEGS), []);
});

test("무음 줄이기: 1.2초 넘는 문장 사이는 0.3초만 남긴다", () => {
  const on = buildPieces(SEGS, 3, 4, true); // 34.9 → 37.0 사이 2.1초 무음
  const off = buildPieces(SEGS, 3, 4, false);
  assert.ok(piecesSeconds(on) < piecesSeconds(off) - 1.5);
  assert.equal(on[0].end, 35.05);
  assert.equal(on[1].start, 36.85);
  // 끄면 원본 그대로 이어짐
  assert.equal(off[0].end, off[1].start);
});

test("긴 문장 자막은 띄어쓰기 기준으로 나누고, 조각 시간은 이어진다", () => {
  const long = { start: 0, end: 10, text: "가나다라 마바사아 자차카타 파하가나 다라마바 사아자차 카타파하 가나다라 마바사아 자차카타" };
  const pieces = buildPieces([long], 0, 0, true);
  assert.ok(pieces.length >= 2);
  for (const p of pieces) assert.ok(p.caption.length <= 36);
  for (let i = 1; i < pieces.length; i++) assert.equal(pieces[i].start, pieces[i - 1].end);
  assert.deepEqual(splitCaption("짧은 문장"), ["짧은 문장"]);
});

test("SRT는 완성 영상 기준 시각(조각을 이어 붙인 시각)", () => {
  const srt = toSrt([{ start: 10, end: 12.5, caption: "첫째" }, { start: 20, end: 21, caption: "둘째" }]);
  assert.equal(srt, "1\n00:00:00,000 --> 00:00:02,500\n첫째\n\n2\n00:00:02,500 --> 00:00:03,500\n둘째\n");
});

test("컷 목록(EDL): 원본 시각·이어 붙인 시각·파일 이름", () => {
  const edl = toEdl([{ name: "talk.mp4", start: 22, end: 41 }, { name: "talk.mp4", start: 55.5, end: 70 }], "선풍기 쇼츠");
  const lines = edl.split("\n");
  assert.equal(lines[0], "TITLE: 선풍기 쇼츠");
  assert.equal(lines[3], "001  AX       AA/V  C        00:00:22:00 00:00:41:00 00:00:00:00 00:00:19:00");
  assert.equal(lines[4], "* FROM CLIP NAME: talk.mp4");
  assert.equal(lines[6], "002  AX       AA/V  C        00:00:55:15 00:01:10:00 00:00:19:00 00:00:33:15");
});

test("무음 찾기: 소리 1초 · 무음 2초 · 소리 1초", () => {
  const rate = 1000;
  const s = new Float32Array(4000);
  for (let i = 0; i < 1000; i++) s[i] = Math.sin(i) * 0.5;
  for (let i = 3000; i < 4000; i++) s[i] = Math.sin(i) * 0.5;
  assert.deepEqual(findSilences(s, rate), [[1, 3]]);
});

test("WAV 머리글(16비트 모노)", () => {
  const w = encodeWav(new Float32Array([0, 1, -1]), 16000);
  assert.equal(new TextDecoder().decode(w.slice(0, 4)), "RIFF");
  assert.equal(w.length, 44 + 6);
  assert.equal(new DataView(w.buffer).getInt16(46, true), 0x7fff);
});
