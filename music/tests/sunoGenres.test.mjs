import test from "node:test";
import assert from "node:assert/strict";
import { SUNO_GENRES, GENRE_FAMILIES, SUNO_GENRE_OPTIONS } from "../lib/sunoGenres.ts";

test("Suno 공식 장르 225개 — 슬러그·이름 중복 없음, 대분류·BPM·글자 수 정상", () => {
  assert.equal(SUNO_GENRES.length, 225);
  assert.equal(new Set(SUNO_GENRES.map((g) => g.slug)).size, 225);
  assert.equal(new Set(SUNO_GENRES.map((g) => g.name.toLowerCase())).size, 225);
  const fams = new Set(GENRE_FAMILIES.map((f) => f.id));
  for (const g of SUNO_GENRES) {
    assert.ok(fams.has(g.family), g.slug);
    assert.ok(g.bpm >= 40 && g.bpm <= 220, g.slug);
    assert.ok(g.ko && g.mood && g.instruments, g.slug);
    // style 한 줄(장르·분위기·악기·BPM)이 V6 style 한도 1000자 안
    assert.ok(`${g.name}, ${g.mood}, ${g.instruments}, ${g.bpm} BPM`.length < 1000, g.slug);
  }
  assert.equal(SUNO_GENRE_OPTIONS.length, 225);
});
