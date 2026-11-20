// 리믹스 가사 1차 순수 함수(lib/remixLyrics.ts) — REMIX-LYRICS-PHASE1-PURE A1, 합성 표본 docs/fixtures/remix-lyrics-fixtures-20261120.json
// 가사 원문은 시험 출력에 찍지 않는다(길이·해시만 비교).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  classifyRemixLyrics,
  matchRemixLyricsByAudioId,
  pickRemixLyricText,
  remixInstructionCandidates,
  isInstructionEcho,
  REMIX_LYRICS_MAX,
} from "../lib/remixLyrics.ts";

const fx = JSON.parse(readFileSync(new URL("../docs/fixtures/remix-lyrics-fixtures-20261120.json", import.meta.url), "utf8"));
const hash = (s) => createHash("sha256").update(String(s).normalize("NFC")).digest("hex").slice(0, 16);
const get = (id) => {
  const c = fx.cases.find((x) => x.id === id);
  assert.ok(c, `표본 ${id} 없음`);
  return c;
};
/** 표본 sunoData의 promptRef·promptRepeat를 실제 문자열로 */
const materialize = (items) =>
  items.map((it) => {
    const o = { ...it };
    if (o.promptRef) { o.prompt = o.promptRef.split(".").reduce((a, k) => a[k], fx); delete o.promptRef; }
    if (o.promptRepeat) { o.prompt = o.promptRepeat.char.repeat(o.promptRepeat.count); delete o.promptRepeat; }
    return o;
  });
const ctxOf = (input) => ({
  mode: input.mode,
  instrumental: !!input.instrumental,
  userLyrics: input.userLyrics ?? null,
  lang: input.lang ?? fx.defaults.lang,
  vocalGender: input.vocalGender ?? null,
});
/** 표본 하나를 매칭 함수로 돌려 기대 행과 비교(길이·해시만) */
function runCase(id) {
  const c = get(id);
  const items = materialize(c.input.sunoData);
  const ids = c.expected.map((e) => e.audioId);
  const { rows } = matchRemixLyricsByAudioId(ctxOf(c.input), items, ids);
  c.expected.forEach((e, i) => {
    const r = rows[i];
    assert.equal(r.audioId, e.audioId, `${id} 행 순서`);
    assert.equal(r.status, e.status, `${id} ${e.audioId} 상태`);
    if ("lyricsLen" in e) assert.equal(r.lyrics ? r.lyrics.length : 0, e.lyricsLen, `${id} ${e.audioId} 길이`);
    if ("lyricsLenMin" in e) assert.ok((r.lyrics ?? "").length >= e.lyricsLenMin, `${id} 최소 길이`);
    if ("lyricsHash" in e) assert.equal(r.lyrics ? hash(r.lyrics) : null, e.lyricsHash, `${id} ${e.audioId} 해시`);
    if ("guessedFieldSeen" in e) assert.equal(r.guessedFieldSeen, e.guessedFieldSeen, `${id} 추측 칸 표시`);
    if ("suspectLanguage" in e) assert.equal(r.suspectLanguage, e.suspectLanguage, `${id} 언어 의심`);
  });
  return rows;
}

test("지시문 후보가 실제 요청 코드 문구와 같다(remix.ts·remixSync.ts) — 문구가 바뀌면 이 시험이 먼저 깨진다", () => {
  const actions = readFileSync(new URL("../lib/actions/remix.ts", import.meta.url), "utf8");
  const sync = readFileSync(new URL("../lib/remixSync.ts", import.meta.url), "utf8");
  for (const piece of [
    "Sing this song in ${lang}, in the new style described above, keeping the same emotional theme and story as the original.",
    " Alternate between male and female vocals across different sections (verses and chorus), like a duet.",
  ]) assert.ok(actions.includes(piece), "remix.ts 지시문 문구");
  for (const piece of [
    "Continue this remix naturally into a new section that fits the same style and mood as before, written in ${lang}.",
    " Keep alternating between male and female vocals as a duet.",
  ]) assert.ok(sync.includes(piece), "remixSync.ts 연장 지시문 문구");
  const [solo] = remixInstructionCandidates("한국어", "여성");
  assert.equal(solo, fx.defaults.instructionSolo);
  assert.ok(remixInstructionCandidates("한국어", "혼성").includes(fx.defaults.instructionDuet));
});

test("P0 ID 짝 — 곡마다 자기 가사, 배열 순서가 바뀌어도 같음(PAIR-01·02)", () => {
  const a = runCase("P0-PAIR-01");
  const b = runCase("P0-PAIR-02");
  assert.equal(hash(a[0].lyrics), hash(b[1].lyrics), "A 가사는 순서와 무관");
  assert.notEqual(hash(a[0].lyrics), hash(a[1].lyrics));
});

test("P0 오디오 없는 항목이 있어도 다른 곡으로 밀리지 않음(PAIR-03)", () => runCase("P0-PAIR-03"));

test("P0 가사 칸 자체가 없으면 unknown(empty 아님)·추측 칸 문자열은 가사로 안 씀(ABSENT-01·GUESS-01·02)", () => {
  runCase("P0-ABSENT-01");
  const g1 = runCase("P0-GUESS-01");
  assert.ok(g1.every((r) => r.lyrics === null));
  runCase("P0-GUESS-02");
});

test("P0 지시문 오인 — 그대로·구간 표시·혼성은 empty, 회원 가사+듀엣 줄은 가사(ECHO-01~04)", () => {
  runCase("P0-ECHO-01");
  runCase("P0-ECHO-02");
  runCase("P0-ECHO-03");
  runCase("P0-ECHO-04");
});

test("P1 빈 값·공백 → empty, 가사 없는 종류 → not_applicable(EMPTY-01·NA-01)", () => {
  runCase("P1-EMPTY-01");
  const na = runCase("P1-NA-01");
  assert.equal(na[0].lyrics, null, "반주 추가는 응답에 글이 있어도 저장하지 않음");
});

test("P1 같은 번호가 다른 가사로 두 번 → 어느 것도 고르지 않음(DUP-01, 정정된 기대값)", () => {
  const c = get("P1-DUP-01");
  const { rows, duplicateIds } = matchRemixLyricsByAudioId(ctxOf(c.input), materialize(c.input.sunoData), ["A"]);
  assert.deepEqual(duplicateIds, ["A"]);
  assert.equal(rows.length, c.expected.rowsForA);
  assert.equal(rows[0].status, c.expected.status);
  assert.equal(rows[0].conflict, true);
  assert.equal(rows[0].lyrics, null);
  // 같은 가사로 두 번이면 하나로 인정
  const same = matchRemixLyricsByAudioId(ctxOf(c.input), [{ id: "A", prompt: "표본 가사 가" }, { id: "A", prompt: "표본 가사 가" }], ["A"]);
  assert.equal(same.rows[0].status, "provided_unverified");
  assert.equal(same.rows[0].conflict, false);
});

test("P1 번호 없는 항목은 어떤 곡에도 매칭 안 됨(NOID-01)", () => {
  const c = get("P1-NOID-01");
  const items = materialize(c.input.sunoData);
  const { rows, ignoredWithoutId } = matchRemixLyricsByAudioId(ctxOf(c.input), items, ["A", "B"]);
  assert.equal(ignoredWithoutId, 1);
  assert.ok(rows.every((r) => !r.matched && r.status === "unknown" && r.lyrics === null));
  const own = classifyRemixLyrics(ctxOf(c.input), items[0]);
  assert.equal(own.status, c.expected[0].status);
  assert.equal(hash(own.lyrics), c.expected[0].lyricsHash);
});

test("P2 표기 섞임·5,000자 제한·한국어 리믹스의 영어 가사 의심(CASE-01·LEN-01·SUSPECT-01)", () => {
  runCase("P2-CASE-01");
  const len = runCase("P2-LEN-01");
  assert.equal(len[0].lyrics.length, REMIX_LYRICS_MAX);
  runCase("P2-SUSPECT-01");
});

test("응답에 없는 곡 번호는 unknown, 가사 없는 종류면 not_applicable", () => {
  const vocal = matchRemixLyricsByAudioId({ mode: "add_vocals", instrumental: false, userLyrics: null, lang: "한국어", vocalGender: null }, [], ["Z"]);
  assert.equal(vocal.rows[0].status, "unknown");
  assert.equal(vocal.rows[0].matched, false);
  const inst = matchRemixLyricsByAudioId({ mode: "cover", instrumental: true, userLyrics: null, lang: "한국어", vocalGender: null }, [], ["Z"]);
  assert.equal(inst.rows[0].status, "not_applicable");
});

test("지시문 판정 경계 — 다른 영어 가사·짧은 앞부분은 지시문으로 보지 않음", () => {
  const c = remixInstructionCandidates("한국어", null);
  assert.equal(isInstructionEcho("Sing", c), false);
  assert.equal(isInstructionEcho("Sing me a song tonight", c), false);
  assert.equal(isInstructionEcho("  SING THIS SONG IN 한국어 , in the new style described above  ", c), true);
  assert.equal(isInstructionEcho("[Intro]\nContinue this remix naturally into a new section", c), true);
});

test("P0 회원 원문 우선(PRIO-01~03)", () => {
  const p1 = get("P0-PRIO-01");
  const r1 = pickRemixLyricText(p1.input.remixLyrics, p1.input.variant);
  assert.equal(r1.source, "member");
  assert.equal(hash(r1.text), p1.expected.lyricTextHash);
  assert.equal(r1.notice, p1.expected.notice);

  const p2 = get("P0-PRIO-02");
  const r2 = pickRemixLyricText(p2.input.remixLyrics, p2.input.variant);
  assert.equal(r2.source, "suno_unverified");
  assert.equal(hash(r2.text), p2.expected.lyricTextHash);
  assert.equal(r2.notice, p2.expected.notice);

  const p3 = get("P0-PRIO-03");
  for (const v of p3.input.variants) {
    const r = pickRemixLyricText(p3.input.remixLyrics, { status: v.status, lyrics: null });
    assert.equal(r.text, p3.expected.lyricText);
    assert.equal(r.notice, p3.expected.notice);
  }
  assert.equal(pickRemixLyricText("   ", { status: "provided_unverified", lyrics: "표본 가사 가" }).source, "suno_unverified", "공백뿐인 회원 가사는 없는 것으로");
  assert.equal(pickRemixLyricText(null, { status: "not_applicable", lyrics: null }).notice, null);
});

test("결과 값에 provided(검증됨)는 나오지 않는다 — 실측 전", () => {
  const ctx = { mode: "add_vocals", instrumental: false, userLyrics: null, lang: "한국어", vocalGender: null };
  for (const it of [{ prompt: "표본 가사 가" }, { prompt: "" }, {}, { lyrics: "x" }, { prompt: 3 }]) {
    assert.notEqual(classifyRemixLyrics(ctx, it).status, "provided");
  }
  assert.equal(classifyRemixLyrics(ctx, { prompt: 3 }).status, "unknown", "문자열이 아닌 prompt");
  assert.equal(classifyRemixLyrics(ctx, null).status, "unknown");
});
