import test from "node:test";
import assert from "node:assert/strict";
import { DANCE_FAMILIES, dancePresetsFor, danceBpm, danceTag, isDanceCategory } from "../src/lib/dancePresets.ts";
import { PRESETS } from "../src/lib/presets.ts";
import { INSTRUMENTAL_GENRES, LYRIC_GENRES } from "../src/lib/lyricTags.ts";
import { LIMITS } from "../src/lib/songs.ts";

test("댄스·월드 프리셋(D-8): 모드마다 200개, id 겹침 없음, 계열 11개 모두 한국어 이름, 스타일은 한도 안", () => {
  for (const mode of ["vocal", "instrumental"]) {
    const list = dancePresetsFor(mode);
    assert.equal(list.length, 200);
    assert.equal(new Set(list.map((p) => p.id)).size, 200);
    assert.ok(list.every((p) => p.mode === mode && isDanceCategory(p.category)));
    assert.equal(new Set(list.map((p) => p.category)).size, Object.keys(DANCE_FAMILIES).length);
    for (const p of list) {
      assert.ok(p.prompt.length > 0 && p.prompt.length <= LIMITS.style, p.id);
      assert.match(p.prompt, /\d+ BPM$/, p.id);
      assert.match(p.prompt, /^[\x20-\x7E]+$/, p.id); // 영어 태그만
    }
  }
  assert.ok(dancePresetsFor("instrumental").every((p) => p.prompt.startsWith("Instrumental ")));
  assert.ok(dancePresetsFor("vocal").every((p) => p.prompt.includes("lead vocals")));
  // 일반 프리셋과 id가 겹치지 않음
  const ids = new Set(PRESETS.map((p) => p.id));
  assert.ok(dancePresetsFor("vocal").every((p) => !ids.has(p.id)));
});

test("댄스·월드 분류는 장르 칩(노래·연주곡) 이름과 겹치지 않는다 — 여러 버전·장르 칩에 섞이지 않게", () => {
  for (const c of new Set(dancePresetsFor("vocal").map((p) => p.category))) {
    assert.ok(!LYRIC_GENRES.includes(c) && !INSTRUMENTAL_GENRES.includes(c), c);
  }
});

test("대표 BPM은 범위 가운데, 영어 이름은 악센트를 빼고 소문자 태그로", () => {
  assert.equal(danceBpm([120, 128]), 124);
  assert.equal(danceBpm([]), 120);
  assert.equal(danceTag("Reggaetón Romántico"), "reggaeton romantico");
  assert.equal(danceTag("Coupé-Décalé"), "coupe-decale");
});

test("시대별 한국 가요 8개(D-8): 노래 장르 대분류 안, 가수 이름 없이", () => {
  const era = PRESETS.filter((p) => p.id.startsWith("era-"));
  assert.equal(era.length, 8);
  for (const p of era) {
    assert.ok(LYRIC_GENRES.includes(p.category), p.id);
    assert.equal(p.mode, "vocal");
    assert.doesNotMatch(p.prompt, /bts|iu|exo|newjeans|twice|bigbang|아이유|이문세|김완선|들국화/i, p.id);
  }
});
