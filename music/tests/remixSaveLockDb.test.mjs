// W1 CAS 어댑터(lib/remixSaveLockDb.ts) 미연결 모의 + W5/W6 대역 점검 — Master msg_4c67f242e1aa
import test from "node:test";
import assert from "node:assert/strict";
import { makeRemixCas, acquirableFilter, REMIX_TABLE } from "../lib/remixSaveLockDb.ts";
import { acquire, promote, release, finish, runRemixSave, lockValue, insertingValue } from "../lib/remixSaveLock.ts";
import { requestRemixRecordInfo } from "../lib/remixRecordInfo.ts";
import { insertRemixVariantsWithFallback } from "../lib/remixVariantInsert.ts";
import { fakePgClient, fakeRecordInfo, insertRecorder, CALLER_OUTCOMES } from "./helpers/remixDoubles.mjs";

const NOW = new Date("2026-11-20T10:00:00Z");
const ctx = (token = "A") => ({ id: "R1", taskId: "T0", hop: 0, token, now: () => NOW });
const ONE = { data: [{ id: "R1" }], error: null, status: 200 };
const ZERO = { data: [], error: null, status: 200 };

test("조건 — 잡기: 표·갱신 값·id/task_id/hop/status eq·잡기 or 필터·select(id)", async () => {
  const { client, calls } = fakePgClient([ONE]);
  assert.equal(await acquire(makeRemixCas(client), ctx("A")), "ok");
  const c = calls[0];
  assert.equal(c.table, REMIX_TABLE);
  assert.deepEqual(c.update, { error_message: lockValue("A"), updated_at: NOW.toISOString() });
  assert.deepEqual(c.eq, [["id", "R1"], ["task_id", "T0"], ["extend_hop_count", 0], ["status", "generating"]]);
  const stale = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();
  assert.deepEqual(c.or, [acquirableFilter(stale)]);
  assert.equal(c.select, "id");
});

test("잡기 or 필터 문자열 — like의 _를 escape, 영속 표시(__rins__)는 어느 항목에도 걸리지 않음", () => {
  const f = acquirableFilter("2026-11-20T09:55:00.000Z");
  assert.equal(f, "error_message.is.null,and(error_message.not.like.\\_\\_*),and(error_message.like.\\_\\_rsync\\_\\_:*,updated_at.lt.2026-11-20T09:55:00.000Z),and(error_message.eq.__syncing__,updated_at.lt.2026-11-20T09:55:00.000Z)");
  assert.ok(!f.includes("rins"), "영속 표시를 잡는 항목 없음");
});

test("조건 — 승격·해제·완료는 error_message 정확 일치(내 토큰)", async () => {
  const { client, calls } = fakePgClient([ONE, ZERO, ONE]);
  const cas = makeRemixCas(client);
  assert.equal(await promote(cas, ctx("A")), "ok");
  assert.equal(await release(cas, ctx("A")), "lost");
  assert.equal(await finish(cas, ctx("A"), "completed"), "ok");
  assert.deepEqual(calls[0].eq.at(-1), ["error_message", lockValue("A")]);
  assert.deepEqual(calls[0].update.error_message, insertingValue("T0", "A"));
  assert.deepEqual(calls[1].eq.at(-1), ["error_message", lockValue("A")]);
  assert.deepEqual(calls[2].eq.at(-1), ["error_message", insertingValue("T0", "A")]);
  assert.equal(calls[2].update.status, "completed");
  for (const c of calls) assert.deepEqual(c.or, [], "정확 일치 단계에는 or 없음");
});

test("행 수 — 1행 ok, 0행 lost(다른 소유자·조건 불일치), 여러 행은 불확실", async () => {
  assert.equal(await promote(makeRemixCas(fakePgClient([ONE]).client), ctx()), "ok");
  assert.equal(await promote(makeRemixCas(fakePgClient([ZERO]).client), ctx("B")), "lost");
  assert.equal(await promote(makeRemixCas(fakePgClient([{ data: [{ id: "R1" }, { id: "R2" }], error: null, status: 200 }]).client), ctx()), "uncertain");
});

test("오류 — 코드 있는 DB 오류는 적용 안 됨(lost), 코드 없는 오류·status 0·예외·data 없음은 불확실", async () => {
  const run = async (r) => promote(makeRemixCas(fakePgClient([r]).client), ctx());
  assert.equal(await run({ data: null, error: { code: "42501", message: "permission denied" }, status: 403 }), "lost");
  assert.equal(await run({ data: null, error: { code: "42703", message: "column x does not exist" }, status: 400 }), "lost");
  assert.equal(await run({ data: null, error: { code: "", message: "TypeError: fetch failed" }, status: 0 }), "uncertain");
  assert.equal(await run({ data: null, error: { message: "?" }, status: 500 }), "uncertain");
  assert.equal(await run({ throw: "network down" }), "uncertain");
  assert.equal(await run({ data: null, error: null, status: 200 }), "uncertain");
});

test("응답 유실 시 흐름 — 승격 유실이면 insert 0·해제 0(어댑터 경유)", async () => {
  const { client, calls } = fakePgClient([ONE, { data: null, error: { code: "", message: "fetch failed" }, status: 0 }]);
  let inserts = 0;
  const r = await runRemixSave(makeRemixCas(client), ctx(), async () => { inserts++; return "ok"; });
  assert.equal(r.promoted, "uncertain");
  assert.equal(inserts, 0);
  assert.equal(calls.length, 2, "해제 호출 없음");
});

test("다른 소유자 — 내 토큰 조건으로 0행이면 승격 실패 → insert 0, 내 잡기 잠금 해제 시도(그것도 0행)", async () => {
  const { client, calls } = fakePgClient([ONE, ZERO, ZERO]);
  let inserts = 0;
  const r = await runRemixSave(makeRemixCas(client), ctx("A"), async () => { inserts++; return "ok"; });
  assert.deepEqual([r.acquired, r.promoted, r.released], ["ok", "lost", "lost"]);
  assert.equal(inserts, 0);
  assert.deepEqual(calls[2].eq.at(-1), ["error_message", lockValue("A")], "남의 잠금을 지우지 않는 정확 일치");
});

test("대역 점검 — record-info 대역 + insert 기록기로 W5/W6 결과 7종 전달 기대표를 만들 수 있다", async () => {
  const ri = fakeRecordInfo({ status: 200, body: { code: 200, data: { status: "SUCCESS", response: { sunoData: [{ id: "A1", audioUrl: "u1", prompt: "표본 가사 가" }] } } } });
  const res = await requestRemixRecordInfo("T0", "k", ri.deps);
  assert.equal(res.state, "ready");
  assert.equal(ri.calls.length, 1);
  const rec = insertRecorder([{ error: { code: "42703", message: 'column "lyrics" does not exist' } }, { error: null }]);
  const out = await insertRemixVariantsWithFallback(rec.fn, [{ remix_id: "R1", user_id: "U1", suno_audio_id: "A1", audio_url: "p", suno_task_id: "T0", lyrics: "표본 가사 가", lyrics_status: "provided_unverified" }]);
  assert.equal(out.outcome, "ok_without_lyrics_columns");
  assert.deepEqual(rec.calls[1][0].keys, ["audio_url", "remix_id", "suno_audio_id", "user_id"]);
  assert.equal(rec.calls[0][0].lyricsLen, 7, "원문 대신 길이만 기록");
  assert.deepEqual(Object.keys(CALLER_OUTCOMES).sort(), ["error", "ok", "ok_without_lyrics_columns", "retry_failed", "retry_uncertain", "skipped", "uncertain"]);
  for (const v of Object.values(CALLER_OUTCOMES)) assert.equal(v.extendAllowed, v.remixStatus === "completed");
});
