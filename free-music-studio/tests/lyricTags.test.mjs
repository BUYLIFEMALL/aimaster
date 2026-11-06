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
