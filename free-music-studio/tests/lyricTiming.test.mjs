import test from "node:test";
import assert from "node:assert/strict";
import {
  automaticDisplayEnds,
  checkCues,
  decodeLyricFile,
  hashLyrics,
  lyricLines,
  lyricTimingState,
  parseLrc,
  parseLyricTiming,
  parseLyricTimingFile,
  planLyricTimingImport,
  remapLyricTiming,
  srtToLrc,
  toLrc,
  toSrt,
} from "../src/lib/lyricTiming.ts";

test("부르는 줄: [구간]은 빼고 (괄호)는 괄호만 벗김", () => {
  assert.deepEqual(
    lyricLines("[Verse]\n가을 바람이\n(오~ 오~)\n\n[Chorus]\n노래해"),
    [
      { lineId: "line-1", text: "가을 바람이" },
      { lineId: "line-2", text: "오~ 오~" },
      { lineId: "line-3", text: "노래해" },
    ]
  );
});

test("LRC 읽기: offset, 반복 시각, 빈 줄은 앞 줄 끝, 같은 시각 두 줄은 오류", () => {
  const e = parseLrc("[ti:곡]\n[offset:+500]\n[00:01.50]첫 줄\n[00:03.00]\n[00:05.00][00:09.00]후렴\n");
  assert.deepEqual(e, [
    { start: 1, end: 2.5, text: "첫 줄" },
    { start: 4.5, end: null, text: "후렴" },
    { start: 8.5, end: null, text: "후렴" },
  ]);
  assert.throws(() => parseLrc("[00:01.00]가\n[00:01.00]나"), /두 줄/);
  assert.throws(() => parseLrc("가사만"), /찾지 못했습니다/);
});

test("SRT → LRC: 번호·꾸밈 태그 빼고, 사이가 비면 끝 표시", () => {
  const lrc = srtToLrc("1\n00:00:01,000 --> 00:00:02,000\n<i>첫</i> 줄\n\n2\n00:00:04,000 --> 00:00:05,000\n둘째");
  assert.equal(lrc, "[00:01.000]첫 줄\n[00:02.000]\n[00:04.000]둘째\n[00:05.000]\n");
});

test("파일 글자: UTF-8·EUC-KR, VTT 파일도 읽음", () => {
  assert.equal(decodeLyricFile(new TextEncoder().encode("가사")), "가사");
  assert.equal(decodeLyricFile(new Uint8Array([0xb0, 0xa1])), "가"); // EUC-KR 「가」
  const vtt = new TextEncoder().encode("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n♪ 노래 ♪\n");
  assert.deepEqual(parseLyricTimingFile("a.vtt", vtt), [{ start: 1, end: 2, text: "노래" }]);
  assert.throws(() => parseLyricTimingFile("a.txt", vtt), /LRC·SRT·VTT/);
});

test("곡에 맞추기: 가사가 같으면 그대로, 다르면 파일 가사로, 곡 길이 넘으면 오류", () => {
  const entries = [{ start: 1, end: null, text: "가을 바람이" }, { start: 4, end: null, text: "노래해" }];
  const same = planLyricTimingImport(entries, "[Verse]\n가을 바람이\n노래해", 10);
  assert.equal(same.matches, true);
  assert.deepEqual(same.cues.map((c) => [c.start, c.end, c.status]), [[1, 4, "manual"], [4, 10, "manual"]]);
  const diff = planLyricTimingImport(entries, "다른 가사", 10);
  assert.equal(diff.matches, false);
  assert.equal(diff.lyrics, "가을 바람이\n노래해");
  assert.throws(() => planLyricTimingImport(entries, "x", 3), /곡 길이/);
});

test("상태·검사·내보내기·저장 모양", async () => {
  const lyrics = "가을\n노래";
  const hash = await hashLyrics(lyrics);
  assert.match(hash, /^[0-9a-f]{64}$/);
  const cues = automaticDisplayEnds([{ lineId: "line-1", text: "가을", start: 1, end: null, status: "manual" }, { lineId: "line-2", text: "노래", start: null, end: null, status: "review" }], 10);
  const timing = { lyricsHash: hash, duration: 10, status: "review", cues };
  assert.deepEqual(lyricTimingState(timing, lyrics, hash), { state: "review", review: 1 });
  assert.deepEqual(lyricTimingState(timing, lyrics, "x".repeat(64)), { state: null, review: 0 });
  assert.equal(checkCues(cues, lyricLines(lyrics), 10), null);
  assert.match(checkCues([{ ...cues[0], start: 5 }, { ...cues[1], start: 3 }], lyricLines(lyrics), 10) ?? "", /늦어야/);
  assert.equal(toLrc(cues, { title: "곡" }), "[ti:곡]\n[00:01.000]가을\n[00:10.000]\n");
  assert.equal(toSrt(cues), "1\n00:00:01,000 --> 00:00:10,000\n가을\n");
  assert.deepEqual(parseLyricTiming(timing)?.cues.length, 2);
  assert.equal(parseLyricTiming({ ...timing, lyricsHash: "abc" }), null);
});

test("가사 고친 뒤: 그대로인 줄은 시간 유지, 고친 줄은 확인 필요, 새 줄은 시작 없음, 지운 줄은 빠짐(원본 remapLyricTiming)", () => {
  const H = "a".repeat(64);
  const old = {
    lyricsHash: "b".repeat(64),
    duration: 60,
    status: "manual",
    cues: automaticDisplayEnds(
      [
        { lineId: "line-1", text: "가을 바람이", start: 1, end: null, status: "manual" },
        { lineId: "line-2", text: "불어오면", start: 5, end: null, status: "manual" },
        { lineId: "line-3", text: "노래해", start: 9, end: null, status: "automatic" },
        { lineId: "line-4", text: "지울 줄", start: 13, end: null, status: "manual" },
      ],
      60
    ),
  };
  const r = remapLyricTiming(old, "가을 바람이\n불어오는 밤\n새로 넣은 줄입니다 여기\n노래해", H);
  assert.deepEqual([r.kept, r.changed, r.added, r.removed], [2, 1, 1, 1]);
  const c = r.timing.cues;
  assert.equal(r.timing.lyricsHash, H);
  assert.equal(r.timing.status, "review");
  assert.deepEqual(c.map((x) => [x.text, x.start, x.status]), [
    ["가을 바람이", 1, "manual"],
    ["불어오는 밤", 5, "review"],
    ["새로 넣은 줄입니다 여기", null, "review"],
    ["노래해", 9, "automatic"],
  ]);
  assert.equal(remapLyricTiming(old, "완전히 다른 가사", H).timing, null);
});
