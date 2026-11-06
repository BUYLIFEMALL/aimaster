import test from "node:test";
import assert from "node:assert/strict";
import { BANNED_LIMIT, cleanBannedWords, findBannedWords, isInstrumentalLyrics, parseBannedInput, parsePlan, planChunks, targetLengthText } from "../src/lib/lyricRules.ts";

test("기획 나누기: 20곡씩, 최대 40곡", () => {
  assert.deepEqual(planChunks(7), [7]);
  assert.deepEqual(planChunks(20), [20]);
  assert.deepEqual(planChunks(30), [20, 10]);
  assert.deepEqual(planChunks(40), [20, 20]);
  assert.deepEqual(planChunks(99), [20, 20]);
  assert.deepEqual(planChunks(0), [1]);
});

test("기획 검사: 앞 묶음에서 쓴 제목과 겹치면 거절", () => {
  const raw = JSON.stringify({ tracks: [{ title: "새벽 피아노", style: "instrumental, piano" }] });
  assert.equal(parsePlan(raw, 1, [], ["다른 곡"])[0].title, "새벽 피아노");
  assert.throws(() => parsePlan(raw, 1, [], ["새벽 피아노"]), /겹칩니다/);
});
import { LIMITS } from "../src/lib/songs.ts";

test("금지어: 쉼표·줄바꿈으로 나누고 빈 칸·중복(대소문자) 빼기", () => {
  assert.deepEqual(parseBannedInput(" 사랑, 눈물\nLove,love ,, "), ["사랑", "눈물", "Love"]);
  assert.equal(cleanBannedWords(Array.from({ length: 50 }, (_, i) => `w${i}`)).length, BANNED_LIMIT);
  assert.deepEqual(cleanBannedWords("not array"), []);
});

test("금지어: 조사가 붙어도 잡고 구간 표기는 보지 않는다", () => {
  assert.deepEqual(findBannedWords("[Verse]\n불빛이 흔들려", ["불빛"]), ["불빛"]);
  assert.deepEqual(findBannedWords("[Chorus]\n노래해", ["chorus"]), []);
  assert.deepEqual(findBannedWords("LOVE song", ["love"]), ["love"]);
});

test("연주곡 표기와 목표 길이 설명", () => {
  assert.ok(isInstrumentalLyrics(" [instrumental] "));
  assert.ok(!isInstrumentalLyrics("[Verse]\n가사"));
  assert.match(targetLengthText(180), /3 minutes \(180 s\)/);
});

const plan = (tracks) => JSON.stringify({ tracks });
const t = (title, style = "instrumental, lo-fi piano, 80 BPM") => ({ title, style, art: "rainy window, warm light" });

test("연주곡 기획: 곡 수·제목 겹침·금지어·스타일 길이 검사", () => {
  assert.equal(parsePlan(plan([t("비 오는 창가"), t("새벽 산책")]), 2).length, 2);
  assert.throws(() => parsePlan(plan([t("하나")]), 2), /2곡/);
  assert.throws(() => parsePlan(plan([t("같은 제목"), t("같은 제목")]), 2), /겹칩니다/);
  assert.throws(() => parsePlan(plan([t("불빛이 머문 밤")]), 1, ["불빛"]), /금지어/);
  assert.throws(() => parsePlan(plan([t("길다", "x".repeat(LIMITS.style + 1))]), 1), /스타일/);
  assert.throws(() => parsePlan("not json", 1), /읽지 못했습니다/);
  assert.equal(parsePlan("```json\n" + plan([t("코드 블록")]) + "\n```", 1)[0].title, "코드 블록");
});
