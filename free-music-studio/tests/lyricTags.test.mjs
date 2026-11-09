import test from "node:test";
import assert from "node:assert/strict";
import { LYRIC_GENRES, LYRIC_MOODS, MAX_MOODS, toggleMood } from "../src/lib/lyricTags.ts";
import { PRESETS } from "../src/lib/presets.ts";

test("장르 버튼 = 노래용 프리셋 분류(모든 장르에 프리셋이 있다)", () => {
  assert.ok(LYRIC_GENRES.length >= 5);
  for (const g of LYRIC_GENRES) assert.ok(PRESETS.some((p) => p.mode === "vocal" && p.category === g), g);
});

test("분위기: 켜고 끄기, 최대 3개, 합친 글자는 서버 한도(60자) 안", () => {
  let s = [];
  for (const m of LYRIC_MOODS) s = toggleMood(s, m);
  assert.equal(s.length, MAX_MOODS);
  assert.deepEqual(toggleMood(s, s[0]), s.slice(1));
  const longest = [...LYRIC_MOODS].sort((a, b) => b.length - a.length).slice(0, MAX_MOODS).join(", ");
  assert.ok(longest.length <= 60);
});

import { MOOD_GROUPS, TEMPOS, VOCALS, lyricMoodPayload, moodConflict, toggleMany } from "../src/lib/lyricTags.ts";

test("분위기 5묶음·이름 겹침 없음, 모든 항목에 영어 태그", () => {
  const all = MOOD_GROUPS.flatMap((g) => g.moods);
  assert.equal(MOOD_GROUPS.length, 5);
  assert.equal(new Set(all.map((m) => m.ko)).size, all.length);
  for (const t of [...all, ...TEMPOS, ...VOCALS]) assert.match(t.en, /^[a-z][a-z -]+$/);
});

test("반대 분위기(밝은+슬픈, 잔잔한+강렬한)는 경고, 같은 쪽은 조용", () => {
  assert.match(moodConflict(["신나는", "우울한"]), /밝고 신나는.*슬프고 그리운|슬프고 그리운.*밝고 신나는/);
  assert.match(moodConflict(["잔잔한", "웅장한"]), /따뜻하고 잔잔한/);
  assert.equal(moodConflict(["따뜻한", "그리운", "다정한"]), "");
});

test("보낼 값: 한국어 분위기(60자 안) + 영어 태그(분위기·빠르기·목소리)", () => {
  const p = lyricMoodPayload({ moods: ["따뜻한", "그리운"], tempo: "느린", vocals: ["여성 보컬", "숨소리 섞인"] });
  assert.equal(p.mood, "따뜻한, 그리운");
  assert.equal(p.tags, "warm, nostalgic, slow tempo, female vocal, breathy vocal");
  assert.deepEqual(toggleMany(["a", "b"], "c", 2), ["a", "b"]);
});

import { GENRE_GROUPS, INSTRUMENTAL_GENRE_GROUPS, INSTRUMENTAL_GENRES, genreLabel, instrumentalGenreHint, subGenresOf } from "../src/lib/lyricTags.ts";

test("연주곡 장르: 대분류 = 연주곡 프리셋 분류와 똑같고, 대분류마다 세부 5개 이상, 이름 겹침 없음, 영어 태그", () => {
  const cats = [...new Set(PRESETS.filter((x) => x.mode === "instrumental").map((p) => p.category))];
  assert.deepEqual([...INSTRUMENTAL_GENRES].sort(), cats.sort());
  const all = INSTRUMENTAL_GENRE_GROUPS.flatMap((g) => g.subs);
  assert.equal(new Set(all.map((s) => s.ko)).size, all.length);
  for (const g of INSTRUMENTAL_GENRE_GROUPS) assert.ok(g.subs.length >= 5, g.ko);
  for (const s of all) assert.match(s.en, /^[a-z0-9][a-z0-9 &'-]+$/, s.ko);
});

test("연주곡 장르 보낼 값: 같은 대분류 이름이라도 세부는 연주곡표에서 찾고, 기획 글에는 영어 태그를 붙인다", () => {
  assert.equal(subGenresOf("재즈·블루스", true)[0].ko, "재즈 피아노 트리오");
  assert.equal(genreLabel("재즈·블루스", "스윙", true), "재즈·블루스");
  assert.equal(instrumentalGenreHint("재즈·블루스", "보사노바 연주"), "재즈·블루스 · 보사노바 연주 (bossa nova instrumental)");
  assert.equal(instrumentalGenreHint("앰비언트·휴식", ""), "앰비언트·휴식");
  assert.equal(instrumentalGenreHint("K-POP", "아이돌 댄스"), "");
  for (const g of INSTRUMENTAL_GENRE_GROUPS) for (const s of g.subs) assert.ok(instrumentalGenreHint(g.ko, s.ko).length <= 80);
});

test("세부 장르: 대분류마다 3개 이상, 이름 겹침 없음, 영어 태그, 노래 프리셋 분류는 모두 대분류에 있다", () => {
  assert.ok(GENRE_GROUPS.length >= 12);
  const all = GENRE_GROUPS.flatMap((g) => g.subs);
  assert.equal(new Set(all.map((s) => s.ko)).size, all.length);
  for (const g of GENRE_GROUPS) assert.ok(g.subs.length >= 3, g.ko);
  for (const s of all) assert.match(s.en, /^[a-z0-9][a-z0-9 &'-]+$/, s.ko);
  for (const p of PRESETS.filter((x) => x.mode === "vocal")) assert.ok(LYRIC_GENRES.includes(p.category), p.category);
});

test("세부 장르 보낼 값: 장르 글은 「대분류 · 세부」(60자 안), 영어 태그 맨 앞, 다른 대분류의 세부는 무시", () => {
  assert.equal(genreLabel("K-POP", "아이돌 댄스"), "K-POP · 아이돌 댄스");
  assert.equal(genreLabel("K-POP", "보사노바"), "K-POP");
  assert.equal(subGenresOf("없는장르").length, 0);
  assert.equal(lyricMoodPayload({ moods: ["신나는"], tempo: "", vocals: [], genre: "K-POP", sub: "아이돌 댄스" }).tags, "k-pop idol dance, energetic");
  assert.equal(lyricMoodPayload({ moods: [], tempo: "", vocals: [], genre: "발라드", sub: "아이돌 댄스" }).tags, "");
  for (const g of GENRE_GROUPS) for (const s of g.subs) assert.ok(genreLabel(g.ko, s.ko).length <= 60);
});
