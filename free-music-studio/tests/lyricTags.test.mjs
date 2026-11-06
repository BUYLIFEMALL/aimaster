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
