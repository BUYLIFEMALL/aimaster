// W1 CAS 어댑터(lib/remixSaveLockDb.ts) 미연결 모의 + W5/W6 대역 점검 — Master msg_4c67f242e1aa
import test from "node:test";
import assert from "node:assert/strict";
import { makeRemixCas, acquirableFilter, REMIX_TABLE, CONFIRMED_REJECTIONS, isConfirmedRejection } from "../lib/remixSaveLockDb.ts";
import { acquire, promote, release, finish, runRemixSave, lockValue, insertingValue, isAcquirable } from "../lib/remixSaveLock.ts";
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

test("세 결과 분리 — 0행(lost)·확정 DB 거절(rejected)·응답 미확정(uncertain)", async () => {
  const run = async (r) => promote(makeRemixCas(fakePgClient([r]).client), ctx());
  // 0행: 성공 응답인데 바뀐 행 없음(다른 소유자·조건 불일치)
  assert.equal(await run({ data: [], error: null, status: 200 }), "lost");
  // 확정 거절: 4xx + 코드 있는 오류 + data 없음
  assert.equal(await run({ data: null, error: { code: "42501", message: "permission denied" }, status: 403 }), "rejected");
  assert.equal(await run({ data: null, error: { code: "42703", message: "column x does not exist" }, status: 400 }), "rejected");
  assert.equal(await run({ data: null, error: { code: "PGRST204", message: "x" }, status: 400 }), "rejected");
  // 미확정
  for (const r of [
    { data: null, error: { code: "", message: "TypeError: fetch failed" }, status: 0 },
    { data: null, error: { message: "?" }, status: 500 },
    { data: [{ id: "R1" }], error: null, status: 503 }, // 5xx인데 배열 — 모순
    { data: null, error: { code: "57014", message: "statement timeout" }, status: 503 }, // 5xx는 코드가 있어도 미확정
    { data: null, error: { code: "", message: "Bad Gateway" }, status: 502 },
    { data: [{ id: "R1" }], error: { code: "42501", message: "x" }, status: 200 }, // 2xx인데 오류 — 모순
    { data: [{ id: "R1" }], error: { code: "42501", message: "x" }, status: 403 }, // 4xx인데 data — 모순
    { data: null, error: { code: "", message: "x" }, status: 400 }, // 4xx인데 코드 없음
    { data: [{ id: "R1" }], error: null }, // status 없음
    { data: [{ id: "R1" }], error: null, status: 304 },
    { data: null, error: null, status: 200 },
    { data: "R1", error: null, status: 200 },
    { throw: "network down" },
  ]) assert.equal(await run(r), "uncertain", JSON.stringify(r));
});

test("4xx 거절 범위 제한 — 408·429·출처 불명 4xx는 미확정, DB·검증 형식 코드만 거절(Mac msg_8eb13f97c147)", async () => {
  const run = async (r) => promote(makeRemixCas(fakePgClient([r]).client), ctx());
  for (const r of [
    { data: null, error: { code: "57014", message: "timeout" }, status: 408 }, // 408은 코드 형식이 맞아도 미확정
    { data: null, error: { code: "PGRST000", message: "x" }, status: 408 },
    { data: null, error: { code: "53300", message: "too many connections" }, status: 429 },
    { data: null, error: { code: "rate_limited", message: "Too Many Requests" }, status: 429 },
    { data: null, error: { code: "ECONNRESET", message: "proxy" }, status: 400 }, // 형식 불일치(소문자 아님이지만 5자리 아님)
    { data: null, error: { code: "invalid_request", message: "gateway" }, status: 400 },
    { data: null, error: { code: "4000", message: "x" }, status: 403 }, // 4자리
    { data: null, error: { code: "PGRST20", message: "x" }, status: 400 }, // 숫자 2자리
    { data: null, error: { code: "pgrst204", message: "x" }, status: 400 }, // 소문자
    { data: null, error: { code: 42501, message: "x" }, status: 403 }, // 문자열 아님
    // Mac msg_a14f320108a3 경계 — 형식만 맞는 임의 코드
    { data: null, error: { code: "EDGE1", message: "x" }, status: 400 },
    { data: null, error: { code: "PGRST999", message: "x" }, status: 404 },
    // 「other → 400」에만 기대는 코드·단건 응답 코드는 목록에 없음 → 미확정
    { data: null, error: { code: "23514", message: "check violation" }, status: 400 },
    { data: null, error: { code: "22P02", message: "invalid input" }, status: 400 },
    { data: null, error: { code: "PGRST116", message: "x" }, status: 406 },
    // 목록의 코드라도 문서와 다른 상태면 미확정
    { data: null, error: { code: "42501", message: "x" }, status: 400 },
    { data: null, error: { code: "23505", message: "x" }, status: 400 },
    { data: null, error: { code: "PGRST204", message: "x" }, status: 404 },
    { data: null, error: { code: "42703", message: "x" }, status: 404 },
  ]) assert.equal(await run(r), "uncertain", JSON.stringify(r));
  // 근거 있는 조합만 확정 거절
  for (const [status, code] of [[403, "42501"], [401, "42501"], [409, "23503"], [409, "23505"], [404, "42P01"], [404, "42883"], [400, "PGRST204"], [400, "42703"]]) {
    assert.equal(await run({ data: null, error: { code, message: "x" }, status }), "rejected", `${status}/${code}`);
  }
});

test("허용 목록은 정확히 근거 있는 8조합 — 넓히면 이 시험이 먼저 깨진다", () => {
  assert.deepEqual(CONFIRMED_REJECTIONS.map(([s, c]) => `${s}/${c}`).sort(), ["400/42703", "400/PGRST204", "401/42501", "403/42501", "404/42883", "404/42P01", "409/23503", "409/23505"]);
  assert.equal(isConfirmedRejection(400, "EDGE1"), false);
  assert.equal(isConfirmedRejection(404, "PGRST999"), false);
  assert.equal(isConfirmedRejection(403, "42501"), true);
});

test("불확실하면 잠금 유지·추가 쓰기 0 — 승격 단계 408·429에서 해제·insert 없음", async () => {
  for (const res of [{ data: null, error: { code: "57014", message: "x" }, status: 408 }, { data: null, error: { code: "53300", message: "x" }, status: 429 }]) {
    const { client, calls } = fakePgClient([ONE, res]);
    let inserts = 0;
    const r = await runRemixSave(makeRemixCas(client), ctx(), async () => { inserts++; return "ok"; });
    assert.equal(r.promoted, "uncertain");
    assert.equal(inserts, 0);
    assert.equal(calls.length, 2, "해제 시도 없음 → 잠금 유지");
  }
});

test("승격 단계 — 확정 거절이면 insert 0·해제 시도, 5xx·모순 응답이면 insert 0·해제 0", async () => {
  const flow = async (promoteRes) => {
    const { client, calls } = fakePgClient([ONE, promoteRes, ZERO]);
    let inserts = 0;
    const r = await runRemixSave(makeRemixCas(client), ctx(), async () => { inserts++; return "ok"; });
    return { r, inserts, calls: calls.length };
  };
  const rej = await flow({ data: null, error: { code: "42501", message: "x" }, status: 403 });
  assert.deepEqual([rej.r.promoted, rej.inserts, rej.calls], ["rejected", 0, 3], "거절은 분명히 미적용 → 내 잡기 잠금 해제 시도");
  for (const res of [{ data: [{ id: "R1" }], error: null, status: 503 }, { data: null, error: { code: "", message: "x" }, status: 502 }]) {
    const u = await flow(res);
    assert.deepEqual([u.r.promoted, u.inserts, u.calls], ["uncertain", 0, 2], "미확정 → insert 0·해제 0");
  }
});

test("잡기 단계 — 거절·미확정이면 아무것도 더 하지 않음", async () => {
  for (const res of [{ data: null, error: { code: "42501", message: "x" }, status: 403 }, { data: [{ id: "R1" }], error: null, status: 503 }]) {
    const { client, calls } = fakePgClient([res]);
    let inserts = 0;
    const r = await runRemixSave(makeRemixCas(client), ctx(), async () => { inserts++; return "ok"; });
    assert.ok(["rejected", "uncertain"].includes(r.acquired));
    assert.equal(inserts, 0);
    assert.equal(calls.length, 1);
  }
});

test("메모리 판정(isAcquirable)과 어댑터 필터(acquirableFilter)의 뜻이 같다", () => {
  // 필터를 문자 그대로 해석하는 작은 평가기(우리가 만든 4항목 구조만): like의 \_는 문자 _, *는 아무 문자열
  const likeToRe = (p) => new RegExp("^" + p.replace(/\\_/g, "\u0000").replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/_/g, ".").replace(/\u0000/g, "_") + "$");
  const evalFilter = (msg, updatedAt, stale) => {
    const f = acquirableFilter(stale);
    const notLike = f.match(/and\(error_message\.not\.like\.([^)]+)\)/)[1];
    const rsync = f.match(/and\(error_message\.like\.([^,]+),updated_at\.lt\.([^)]+)\)/);
    const legacy = f.match(/and\(error_message\.eq\.([^,]+),updated_at\.lt\.([^)]+)\)/);
    if (msg === null) return true;
    if (!likeToRe(notLike).test(msg)) return true;
    if (likeToRe(rsync[1]).test(msg) && updatedAt < rsync[2]) return true;
    if (msg === legacy[1] && updatedAt < legacy[2]) return true;
    return false;
  };
  const stale = "2026-11-20T09:55:00.000Z";
  const old = "2026-11-20T09:00:00.000Z", fresh = "2026-11-20T09:59:00.000Z";
  const msgs = [null, "", "이전 실패 문구", "x__y", lockValue("A"), insertingValue("T0", "A"), "__syncing__", "__foo", "__rsyncX", "_rsync__:A", "__RSYNC__:A", "__rins__:T0:A"];
  for (const m of msgs) for (const u of [old, fresh]) {
    assert.equal(isAcquirable(m, u, stale), evalFilter(m, u, stale), `${JSON.stringify(m)} ${u === old ? "만료" : "신규"}`);
  }
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
