// 영상 합치기 배경음악 「내 자료함」 — 곡 변환·출처 저장 형식 시험(네트워크 없음). 2026-11-11
import test from "node:test";
import assert from "node:assert/strict";
import { toLibrarySongs, isLibraryRef } from "../lib/edit/librarySongs.ts";
import { sanitizeSaved } from "../lib/edit/timeline.ts";

const asset = (o) => ({ sourceRef: "ams_generations:2450ad09-aa88-407e-8956-4b6400c32f01:0", sourceSlug: "ai-music-studio", title: "곡", durationS: 120, playUrl: "https://x.supabase.co/storage/v1/object/sign/a", localOnly: false, external: false, ...o });

test("자료함 곡 → 화면용: 출처 이름·무료음악은 주소 없음·Suno 임시 표시", () => {
  const s = toLibrarySongs([
    asset({}),
    asset({ sourceRef: "music_track_variants:0a302c07-3721-4b67-a0a3-42b0b58da83c:0", sourceSlug: "music-automation", external: true }),
    asset({ sourceRef: "free_music_tracks:095fd659-b192-4159-8a12-ad2a7002e994:0", sourceSlug: "free-music-studio", localOnly: true, playUrl: null }),
    asset({ sourceRef: "bad ref" }),
  ]);
  assert.equal(s.length, 3);
  assert.deepEqual(s.map((x) => x.source), ["AI 음악 스튜디오", "Suno 음악 자동화", "무료음악"]);
  assert.equal(s[1].external, true);
  assert.equal(s[2].url, null);
  assert.equal(s[2].localOnly, true);
});

test("sourceRef 모양 검사", () => {
  assert.ok(isLibraryRef("ams_generations:2450ad09-aa88-407e-8956-4b6400c32f01:0"));
  assert.ok(!isLibraryRef("x"));
  assert.ok(!isLibraryRef("ams_generations:../../etc:0"));
  assert.ok(!isLibraryRef(123));
});

test("저장 형식: library 곡 보존 · 옛 ams 곡 그대로 · 이상한 값은 local", () => {
  const base = { clips: [], aspect: "9:16", quality: "720", transition: "cut" };
  const lib = sanitizeSaved({ ...base, music: { name: "a", source: { kind: "library", ref: "music_track_variants:0a302c07-3721-4b67-a0a3-42b0b58da83c:0" } } });
  assert.deepEqual(lib?.music?.source, { kind: "library", ref: "music_track_variants:0a302c07-3721-4b67-a0a3-42b0b58da83c:0" });
  const ams = sanitizeSaved({ ...base, music: { name: "b", source: { kind: "ams", ref: "2450ad09-aa88-407e-8956-4b6400c32f01:1" } } });
  assert.deepEqual(ams?.music?.source, { kind: "ams", ref: "2450ad09-aa88-407e-8956-4b6400c32f01:1" });
  const bad = sanitizeSaved({ ...base, music: { name: "c", source: { kind: "library", ref: "../x" } } });
  assert.deepEqual(bad?.music?.source, { kind: "local" });
});
