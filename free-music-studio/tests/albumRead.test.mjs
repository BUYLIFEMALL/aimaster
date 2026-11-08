import test from "node:test";
import assert from "node:assert/strict";
import { albumReadRules, parseAlbumImage, parseAlbumRead, songFromAlbumHref } from "../src/lib/albumRead.ts";
import { LYRIC_GENRES, LYRIC_MOODS } from "../src/lib/lyricTags.ts";

const ok = (o) => JSON.stringify({ title: "", theme: "", genre: "", moods: [], tempo: "", vocals: [], style_prompt: "", ...o });

test("앨범 2단계(v1.36): 화면 선택지 안의 값만 남긴다", () => {
  const r = parseAlbumRead(
    ok({
      title: "  밤의   기차 ",
      theme: "비 오는 밤 기차 창가",
      genre: LYRIC_GENRES[0],
      moods: [LYRIC_MOODS[0], "없는분위기", LYRIC_MOODS[0], LYRIC_MOODS[1], LYRIC_MOODS[2], LYRIC_MOODS[3]],
      tempo: "느린",
      vocals: ["여성 보컬", "로봇 목소리", "가성", "합창"],
      style_prompt: "lofi, rainy night, 80 BPM",
    })
  );
  assert.equal(r.title, "밤의 기차");
  assert.equal(r.genre, LYRIC_GENRES[0]);
  assert.deepEqual(r.moods, [LYRIC_MOODS[0], LYRIC_MOODS[1], LYRIC_MOODS[2]]);
  assert.equal(r.tempo, "느린");
  assert.deepEqual(r.vocals, ["여성 보컬", "가성"]);
});

test("모르는 장르·빠르기는 비우고, 주제·스타일이 모두 없으면 오류", () => {
  const r = parseAlbumRead("```json\n" + ok({ theme: "바다", genre: "없는장르", tempo: "엄청 빠른" }) + "\n```");
  assert.equal(r.genre, "");
  assert.equal(r.tempo, "");
  assert.throws(() => parseAlbumRead(ok({ title: "제목만" })), /읽지 못했습니다/);
  assert.throws(() => parseAlbumRead("not json"), /읽지 못했습니다/);
});

test("글자 한도: 제목 80·주제 300·스타일 400", () => {
  const r = parseAlbumRead(ok({ title: "가".repeat(100), theme: "나".repeat(500), style_prompt: "x".repeat(600) }));
  assert.equal(r.title.length, 80);
  assert.equal(r.theme.length, 300);
  assert.equal(r.style_prompt.length, 400);
});

test("보내는 그림 검사: 형식·base64·크기", () => {
  assert.equal(parseAlbumImage("QUJD", "image/jpeg").ok, true);
  assert.equal(parseAlbumImage("QUJD", "image/gif").ok, false);
  assert.equal(parseAlbumImage("<script>", "image/png").ok, false);
  assert.equal(parseAlbumImage("A".repeat(1_500_001), "image/png").ok, false);
  assert.equal(parseAlbumImage(null, "image/png").ok, false);
});

test("지시문에 선택지와 올해가 들어가고, 곡 만들기 주소에 앨범 번호·이름", () => {
  const rules = albumReadRules(2026);
  assert.match(rules, /2026/);
  assert.ok(rules.includes(JSON.stringify(LYRIC_GENRES)));
  const href = songFromAlbumHref("3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab", "가을 기차");
  assert.equal(href, "/songs?album=3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab&name=%EA%B0%80%EC%9D%84+%EA%B8%B0%EC%B0%A8");
});
