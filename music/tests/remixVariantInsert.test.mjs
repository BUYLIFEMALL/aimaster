// 리믹스 가사 1차 — 새 변주 저장 구형 스키마 호환(lib/remixVariantInsert.ts) 격리 모의 시험
// PHASE1-COMPAT-MOCK A2. 표본 docs/fixtures/remix-lyrics-compat-mock-20261120.json. 네트워크·DB·키 없음, 가사·행 값 원문 미출력.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  insertRemixVariantsWithFallback,
  isMissingLyricsColumnError,
  parseMissingColumnError,
  stripLyricsColumns,
  REMIX_LYRICS_COLUMNS,
  REMIX_VARIANTS_TABLE,
  KNOWN_ERROR_CODES,
} from "../lib/remixVariantInsert.ts";

const fx = JSON.parse(readFileSync(new URL("../docs/fixtures/remix-lyrics-compat-mock-20261120.json", import.meta.url), "utf8"));
const NEW = new Set(REMIX_LYRICS_COLUMNS);

/** 가짜 insert — 호출마다 행을 깊은 복사로 기록하고, 사례 응답을 순서대로 돌려준다(throw는 응답 없음) */
function fakeInsert(responses) {
  const calls = [];
  let i = 0;
  const fn = async (rows) => {
    calls.push(structuredClone(rows));
    const r = responses[i++];
    if (!r) throw new Error("표본에 없는 추가 호출");
    if (r.throw) throw new Error(r.throw);
    return { error: r.error ?? null, status: r.status, transportLost: r.transportLost };
  };
  return { fn, calls };
}

for (const c of fx.cases) {
  test(`${c.id} ${c.theme}`, async () => {
    const payload = structuredClone(c.payloadOverride ?? fx.basePayload);
    const before = structuredClone(payload);
    const { fn, calls } = fakeInsert(c.responses);
    const res = await insertRemixVariantsWithFallback(fn, payload);

    assert.equal(calls.length, c.expected.insertCalls, "insert 호출 수");
    assert.equal(res.calls, c.expected.insertCalls, "결과의 호출 수");
    assert.equal(res.outcome, c.expected.outcome, "결과 구분");
    assert.ok(calls.length <= fx._rules.maxInsertCalls, "최대 2회");
    assert.deepEqual(payload, before, "넘긴 행을 바꾸지 않음");

    if (calls.length >= 1) assert.deepEqual(calls[0], before, "첫 insert는 넘긴 행 그대로");
    if (calls.length === 2) {
      const [a, b] = calls;
      assert.equal(b.length, a.length, "행 수 같음");
      b.forEach((row, k) => {
        for (const col of NEW) assert.ok(!(col in row), `두 번째 payload에 ${col} 없음`);
        const rest = Object.fromEntries(Object.entries(a[k]).filter(([key]) => !NEW.has(key)));
        assert.deepEqual(row, rest, "나머지 칸·순서 같음");
      });
    }

    // 민감 원문 미출력: 결과 객체에 오류 message·details 원문, 행 값(가사·경로)이 들어가지 않음
    const out = JSON.stringify(res);
    for (const r of c.responses) {
      for (const s of [r.error?.message, r.error?.details]) if (s && s.length > 12) assert.ok(!out.includes(s), "오류 원문 미포함");
    }
    for (const row of fx.basePayload) for (const v of [row.lyrics, row.audio_url]) if (v) assert.ok(!out.includes(v), "행 값 미포함");
    // 결과 라벨은 고정 값만
    if (res.error) {
      assert.ok([...KNOWN_ERROR_CODES, "other", "none"].includes(res.error.code), "코드 라벨");
      assert.ok(res.error.column === null || NEW.has(res.error.column), "칸은 이번 3칸 또는 null");
      assert.ok(res.error.table === null || res.error.table === REMIX_VARIANTS_TABLE, "표는 변주 표 또는 null");
    }
    if (c.expected.errorLabel) assert.deepEqual(res.error, c.expected.errorLabel, "고정 라벨");
    // 원문 조각(밖의 식별자·비정규 코드·SDK 문구)이 결과에 없음
    for (const frag of ["fetch failed", "secret_internal_col", "private_audit_log", "XX999", "duration_seconds", "image_url", "music_track_remixes\"", "Internal Server Error"]) {
      assert.ok(!out.includes(frag), `원문 조각 미포함: ${frag}`);
    }
  });
}

test("형식 판정 — 세 형식만 인정, 칸·표 정확히", () => {
  assert.deepEqual(parseMissingColumnError({ code: "42703", message: 'column "lyrics" of relation "music_track_remix_variants" does not exist' }), { code: "42703", column: "lyrics", table: "music_track_remix_variants" });
  assert.deepEqual(parseMissingColumnError({ code: "42703", message: 'column "lyrics_status" does not exist' }), { code: "42703", column: "lyrics_status", table: null });
  assert.deepEqual(parseMissingColumnError({ code: "42703", message: "column music_track_remix_variants.suno_task_id does not exist" }), { code: "42703", column: "suno_task_id", table: "music_track_remix_variants" });
  assert.deepEqual(parseMissingColumnError({ code: "PGRST204", message: "Could not find the 'lyrics' column of 'music_track_remix_variants' in the schema cache" }), { code: "PGRST204", column: "lyrics", table: "music_track_remix_variants" });
  // 코드와 형식이 엇갈리면 판정 불가
  assert.equal(parseMissingColumnError({ code: "PGRST204", message: 'column "lyrics" does not exist' }), null);
  assert.equal(parseMissingColumnError({ code: "42703", message: "Could not find the 'lyrics' column of 'music_track_remix_variants' in the schema cache" }), null);
  // 앞뒤에 다른 글이 붙으면 불일치
  assert.equal(parseMissingColumnError({ code: "42703", message: 'ERROR: column "lyrics" does not exist (hint)' }), null);
  assert.equal(parseMissingColumnError(null), null);
  assert.equal(parseMissingColumnError({ code: 42703, message: 'column "lyrics" does not exist' })?.column, "lyrics", "숫자 코드도 문자열로 비교");
  assert.equal(isMissingLyricsColumnError({ code: "42703", message: 'column "LYRICS" does not exist' }), false, "대소문자 다른 칸 이름은 다른 칸");
});

test("stripLyricsColumns — 새 3칸만 빼고 원본은 그대로", () => {
  const rows = structuredClone(fx.basePayload);
  const out = stripLyricsColumns(rows);
  assert.deepEqual(rows, fx.basePayload);
  assert.equal(out.length, rows.length);
  for (const r of out) for (const col of NEW) assert.ok(!(col in r));
  assert.deepEqual(Object.keys(out[0]), ["remix_id", "user_id", "suno_audio_id", "audio_url", "image_url", "duration_seconds"]);
});
