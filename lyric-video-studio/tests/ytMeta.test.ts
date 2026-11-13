import { test } from "node:test";
import assert from "node:assert/strict";
import { buildYtMetaPrompt, parseYtMeta, LYRICS_LIMIT } from "../src/lib/ytMeta.ts";

test("프롬프트 — 당해 연도 지침, 세로면 Shorts, 가사는 앞부분만", () => {
  const p = buildYtMetaPrompt({ title: "밤 산책", artist: "하루", lyrics: "가".repeat(5000), portrait: true }, 2026);
  assert.match(p.system, /현재 연도는 2026년/); assert.match(p.system, /#Shorts/);
  assert.match(p.user, /곡 제목: 밤 산책/); assert.match(p.user, /가수: 하루/);
  assert.ok(p.user.length < LYRICS_LIMIT + 100);
  assert.match(buildYtMetaPrompt({ title: "", artist: "", lyrics: "", portrait: false }, 2026).user, /연주곡/);
});

test("응답 해석 — 코드 울타리·앞뒤 말 허용, 제목 3개·해시태그 5개로 정리", () => {
  const m = parseYtMeta('네, 결과입니다.\n```json\n{"titles":["A 가사","B Lyrics","C 가사","D"],"description":" 잔잔한 밤 노래 ","hashtags":["가사","#lyrics","# 밤 산책","#가사","a","b","c"]}\n```')!;
  assert.deepEqual(m.titles, ["A 가사", "B Lyrics", "C 가사"]);
  assert.equal(m.description, "잔잔한 밤 노래");
  assert.deepEqual(m.hashtags, ["#가사", "#lyrics", "#밤산책", "#a", "#b"]);
});

test("응답 해석 — 쓸 수 없으면 null", () => {
  assert.equal(parseYtMeta("죄송합니다"), null);
  assert.equal(parseYtMeta('{"titles":[],"description":"x"}'), null);
  assert.equal(parseYtMeta('{"titles":["a"],"description":""}'), null);
  assert.equal(parseYtMeta("{깨진"), null);
});
