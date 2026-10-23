// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image·경량 1K는 gemini-3.1-flash-lite-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import test from "node:test";
import assert from "node:assert/strict";
import {
  chunk, cleanHashtags, cleanKeywords, cleanLyricsOptions, cleanMeta, cleanSuno, cleanTitles,
  clampChars, estimateCost, extractJson, isValidTitle, normalizeTitle, parseTitle,
} from "../src/lib/playlist/validate.ts";
import { GENRES, GENRE_BEST_STRUCTURE, STRUCTURES, THUMB_FONTS, THUMB_STYLES, resolveStructure } from "../src/lib/playlist/types.ts";
import { lyricsPrompt, thumbnailPrompt, titlesPrompt } from "../src/lib/playlist/prompts.ts";

test("extractJson: 코드블록과 앞뒤 설명을 걷어낸다", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('여기 결과입니다 {"a":[1,2]} 끝'), { a: [1, 2] });
  assert.equal(extractJson("JSON 아님"), null);
});

test("제목 형식 검증·보정", () => {
  const ok = "playlist 🌙 새벽 세 시에 듣는 조용한 노래 | Midnight & Chill";
  assert.ok(isValidTitle(ok));
  assert.deepEqual(parseTitle(ok), { emoji: "🌙", sentence: "새벽 세 시에 듣는 조용한 노래", k1: "Midnight", k2: "Chill" });
  assert.equal(normalizeTitle("🌙 비 오는 날 | Rain&Calm"), "playlist 🌙 비 오는 날 | Rain & Calm");
  assert.equal(normalizeTitle("그냥 제목"), null);
  assert.equal(normalizeTitle(42), null);
});

test("cleanTitles: 형식 불량·중복 제거, 최대 10개", () => {
  const raw = Array.from({ length: 14 }, (_, i) => `playlist 🎧 노래 ${i} | Lofi & Study`);
  raw.push("playlist 🎧 노래 0 | Lofi & Study", "형식 아님");
  const out = cleanTitles(raw);
  assert.equal(out.length, 10);
  assert.equal(new Set(out).size, 10);
});

test("Suno 프롬프트: 3개까지, 900자 미만으로 자른다", () => {
  const long = Array.from({ length: 200 }, (_, i) => `descriptor${i}`).join(", ");
  const out = cleanSuno({ variants: [1, 2, 3, 4].map((n) => ({ name: `v${n}`, style: long, note: "n" })) });
  assert.equal(out.length, 3);
  for (const v of out) assert.ok(v.style.length < 900, `길이 ${v.style.length}`);
  assert.deepEqual(cleanSuno({ variants: [{ style: "" }] }), []);
  assert.ok(clampChars("a, b, c", 100) === "a, b, c");
});

test("해시태그: #playlist가 맨 앞, 정확히 5개", () => {
  const out = cleanHashtags(["lofi", "#Chill", "#playlist", "study vibes", "#Rain", "#Extra", "#More"]);
  assert.equal(out[0], "#playlist");
  assert.equal(out.length, 5);
  assert.ok(out.includes("#studyvibes"));
  assert.deepEqual(cleanHashtags([]), ["#playlist"]);
});

test("키워드: 중복 제거, 최대 15개, 문자열 입력 허용", () => {
  const out = cleanKeywords(Array.from({ length: 30 }, (_, i) => `k${i}`));
  assert.equal(out.length, 15);
  assert.deepEqual(cleanKeywords("a, b, A, #c"), ["a", "b", "c"]);
});

test("cleanMeta: 설명이 없으면 null", () => {
  assert.equal(cleanMeta({ description: "", hashtags: [] }), null);
  const m = cleanMeta({ description: "설명", hashtags: ["x"], keywords: ["k"] });
  assert.equal(m.hashtags[0], "#playlist");
});

test("가사 옵션: 범위 보정과 이중 언어 규칙", () => {
  const o = cleanLyricsOptions({ language: "xx", secondLanguage: "ko", songCount: 99, secondRatio: 3, metaphor: 9 });
  assert.equal(o.language, "ko");
  assert.equal(o.secondLanguage, ""); // 주 언어와 같으면 사용 안 함
  assert.equal(o.songCount, 20);
  assert.equal(o.secondRatio, 10);
  assert.equal(o.metaphor, 4);
  assert.equal(cleanLyricsOptions({ language: "en", secondLanguage: "ja" }).secondLanguage, "ja");
  assert.equal(cleanLyricsOptions({ songCount: 0 }).songCount, 1);
});

test("곡 구조: 15종, 자동은 장르 추천을 따른다", () => {
  assert.equal(STRUCTURES.length, 15);
  assert.equal(new Set(STRUCTURES.map((s) => s.id)).size, 15);
  for (const g of GENRES) assert.ok(STRUCTURES.some((s) => s.id === GENRE_BEST_STRUCTURE[g.id]), g.id);
  assert.equal(resolveStructure("auto", "jazz").id, "aaba");
  assert.equal(resolveStructure("auto", "내가 쓴 장르").id, "classic");
  assert.equal(resolveStructure("ballad", "jazz").id, "ballad");
});

test("카탈로그 개수: 장르 23(기본 14+추천 9)·스타일 7·글꼴 14", () => {
  assert.equal(GENRES.length, 23);
  assert.equal(new Set(GENRES.map((g) => g.id)).size, 23);
  for (const id of ["pop", "study", "workout", "meditation"]) assert.ok(GENRES.some((g) => g.id === id), id);
  assert.equal(THUMB_STYLES.length, 7);
  assert.equal(THUMB_FONTS.length, 14);
});

test("chunk / estimateCost", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.ok(Math.abs(estimateCost({ model: "gemini-2.5-flash", inputTokens: 1_000_000, outputTokens: 1_000_000, ms: 1 }) - 2.8) < 1e-9);
  assert.equal(estimateCost({ model: "gemini-3.1-flash-lite-image", inputTokens: 0, outputTokens: 0, ms: 1, images: 2 }), 0.078);
  assert.equal(estimateCost({ model: "unknown", inputTokens: 5, outputTokens: 5, ms: 1 }), 0);
});

test("프롬프트: 당해 연도·형식·한국인 규칙이 들어간다", () => {
  const year = new Date().getFullYear();
  const t = titlesPrompt("lofi", year);
  assert.ok(t.system.includes(`${year}년`));
  assert.ok(t.user.includes("playlist [one Emoji]"));
  const l = lyricsPrompt("kpop", "playlist 🎤 테스트 | A & B", cleanLyricsOptions({ secondLanguage: "en", secondRatio: 40 }), [{ no: 1, title: "곡", concept: "c" }], year);
  assert.ok(l.user.includes("60%") && l.user.includes("40%"));
  assert.ok(l.user.includes("Intro Hook")); // kpop 추천 구조
  const th = thumbnailPrompt("jazz", "제목", "neon", { hasPersona: true, feedback: "더 어둡게", year });
  assert.ok(th.includes("NO text") || th.includes("NO text".toUpperCase()) || /NO text/i.test(th));
  assert.ok(th.includes("Korean"));
  assert.ok(th.includes("더 어둡게"));
});
