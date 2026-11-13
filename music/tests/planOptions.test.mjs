import test from "node:test";
import assert from "node:assert/strict";
import { parsePlanOptions, sameTags, lyricsDirectives, EMPTY_PLAN_OPTIONS } from "../lib/planOptions.ts";

test("세부 설정 정리 — 목록 밖 칩·개수 초과·긴 글·잘못된 길이는 버림", () => {
  const o = parsePlanOptions({
    genre: ["Pop", "K-pop", "J-pop", "Hip-hop", "없는장르", "Pop"],
    tempo: ["x"],
    hook: "  우리 둘이   함께라면 ",
    avoid: "가".repeat(500),
    length: "huge",
  });
  assert.deepEqual(o.genre, ["Pop", "K-pop", "J-pop"]);
  assert.deepEqual(o.tempo, []);
  assert.equal(o.hook, "우리 둘이 함께라면");
  assert.equal(o.avoid.length, 200);
  assert.equal(o.length, "normal");
  assert.deepEqual(parsePlanOptions(null), EMPTY_PLAN_OPTIONS);
});

test("칩 비교는 순서 무관, 가사 지시문은 채운 칸만", () => {
  const a = parsePlanOptions({ genre: ["Pop", "K-pop"] });
  const b = parsePlanOptions({ genre: ["K-pop", "Pop"], hook: "다른 글은 비교 안 함" });
  assert.equal(sameTags(a, b), true);
  assert.equal(sameTags(a, parsePlanOptions({ genre: ["Pop"] })), false);
  const d = lyricsDirectives(parsePlanOptions({ hook: "함께라면", length: "short" }));
  assert.match(d, /2분대/);
  assert.match(d, /"함께라면"/);
  assert.doesNotMatch(d, /쓰지 말/);
});
