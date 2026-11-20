// 리믹스 저장 소유 토큰 잠금(lib/remixSaveLock.ts) 국소 모의 — Master msg_a128960629ac 요구 경우.
// 메모리 가짜 DB가 조건부 갱신(CAS)을 흉내 낸다. 네트워크·DB·키 없음.
import test from "node:test";
import assert from "node:assert/strict";
import { acquire, promote, release, finish, runRemixSave, isAcquirable, lockValue, insertingValue, LEGACY_LOCK, STALE_MS } from "../lib/remixSaveLock.ts";

function makeDb(row) {
  const db = { row: { ...row }, log: [], loseNextResponse: false, failNext: false };
  db.cas = async (set, where) => {
    db.log.push({ set, where });
    if (db.failNext) { db.failNext = false; throw new Error("응답 없음(갱신 안 됨)"); }
    const r = db.row;
    let ok = r.id === where.id && r.task_id === where.taskId && r.extend_hop_count === where.hop && r.status === where.status;
    if (ok) {
      if ("eq" in where.errorMessage) ok = r.error_message === where.errorMessage.eq;
      else ok = isAcquirable(r.error_message, r.updated_at, where.errorMessage.acquirable.staleBefore);
    }
    if (ok) Object.assign(r, set);
    if (db.loseNextResponse) { db.loseNextResponse = false; throw new Error("응답 유실(갱신은 됐을 수 있음)"); }
    return ok ? 1 : 0;
  };
  return db;
}
const T0 = new Date("2026-11-20T10:00:00Z");
const at = (ms) => () => new Date(T0.getTime() + ms);
const ROW = { id: "R1", task_id: "T0", extend_hop_count: 0, status: "generating", error_message: null, updated_at: T0.toISOString() };
const ctx = (token, ms = 0, over = {}) => ({ id: "R1", taskId: "T0", hop: 0, token, now: at(ms), ...over });
const counter = (outcome) => { const f = async () => { f.calls++; return outcome; }; f.calls = 0; return f; };

test("정상: 잡기 → 승격 → insert ok → 완료, 연장 허용", async () => {
  const db = makeDb(ROW); const ins = counter("ok");
  const r = await runRemixSave(db.cas, ctx("A"), ins);
  assert.deepEqual([r.acquired, r.promoted, r.insertCalled, r.finished, r.extendAllowed], ["ok", "ok", true, "ok", true]);
  assert.equal(ins.calls, 1);
  assert.equal(db.row.status, "completed");
  assert.equal(db.row.error_message, null);
});

test("승격 UPDATE 응답 유실(실제로는 승격됨) → insert 0·해제 0, 이후 재처리도 0", async () => {
  // 두 번째 갱신(승격)의 응답만 유실시킨다
  const db2 = makeDb(ROW); const ins2 = counter("ok");
  const origCas = db2.cas; let n = 0;
  const cas = async (s, w) => { n++; if (n === 2) { db2.loseNextResponse = true; } return origCas(s, w); };
  const r2 = await runRemixSave(cas, ctx("A"), ins2);
  assert.equal(r2.promoted, "uncertain");
  assert.equal(r2.insertCalled, false);
  assert.equal(r2.released, undefined, "해제 시도 0");
  assert.equal(ins2.calls, 0);
  assert.equal(db2.row.error_message, insertingValue("T0", "A"), "실제로는 승격되어 영속 표시가 남음");
  // 6분 뒤 다른 처리(웹훅 재알림·수동)
  const r3 = await runRemixSave(db2.cas, ctx("B", 6 * 60 * 1000), ins2);
  assert.equal(r3.acquired, "lost");
  assert.equal(ins2.calls, 0, "영속 표시 뒤 재실행 0");
});

test("승격 UPDATE 응답 유실(실제로는 승격 안 됨) → insert 0·해제 0, 5분 뒤 다른 처리가 안전하게 재처리", async () => {
  const db = makeDb(ROW); const ins = counter("ok");
  let n = 0; const cas = async (s, w) => { n++; if (n === 2) { db.failNext = true; } return db.cas(s, w); };
  const r = await runRemixSave(cas, ctx("A"), ins);
  assert.equal(r.promoted, "uncertain");
  assert.equal(ins.calls, 0);
  assert.equal(db.row.error_message, lockValue("A"), "잡기 잠금 그대로(해제 안 함)");
  const early = await runRemixSave(db.cas, ctx("B", 60 * 1000), ins);
  assert.equal(early.acquired, "lost", "만료 전에는 못 잡음");
  const later = await runRemixSave(db.cas, ctx("B", STALE_MS + 1000), ins);
  assert.equal(later.acquired, "ok");
  assert.equal(ins.calls, 1, "아무것도 보내지 않았던 경우라 재처리 1회는 안전");
});

test("옛 요청 지연 → 새 소유자: 옛 토큰의 승격·해제·완료는 모두 0행, 새 소유자 잠금 보존", async () => {
  const db = makeDb(ROW);
  assert.equal(await acquire(db.cas, ctx("A")), "ok");
  assert.equal(await acquire(db.cas, ctx("B", STALE_MS + 1000)), "ok", "5분 뒤 B가 교체");
  assert.equal(await promote(db.cas, ctx("A", STALE_MS + 2000)), "lost");
  assert.equal(await release(db.cas, ctx("A", STALE_MS + 2000)), "lost");
  assert.equal(await finish(db.cas, ctx("A", STALE_MS + 2000), "completed"), "lost");
  assert.equal(db.row.error_message, lockValue("B"));
  assert.equal(db.row.status, "generating");
});

test("새 소유자 진행 중 → 지연된 옛 요청: 새 소유자 영속 표시·완료를 옛 토큰이 바꾸지 못함", async () => {
  const db = makeDb(ROW);
  await acquire(db.cas, ctx("A"));
  await acquire(db.cas, ctx("B", STALE_MS + 1000));
  assert.equal(await promote(db.cas, ctx("B", STALE_MS + 1500)), "ok");
  assert.equal(await finish(db.cas, ctx("A", STALE_MS + 2000), "failed", "x"), "lost");
  assert.equal(await release(db.cas, ctx("A", STALE_MS + 2000)), "lost");
  assert.equal(db.row.error_message, insertingValue("T0", "B"));
  assert.equal(await finish(db.cas, ctx("B", STALE_MS + 3000), "completed"), "ok");
  assert.equal(await finish(db.cas, ctx("A", STALE_MS + 4000), "failed", "x"), "lost", "완료 뒤 늦은 옛 요청도 0행");
  assert.equal(db.row.status, "completed");
});

test("영속 표시 뒤 프로세스 종료(insert 결과 모름) → 언제 다시 와도 재실행 0", async () => {
  const db = makeDb(ROW);
  await acquire(db.cas, ctx("A"));
  await promote(db.cas, ctx("A"));
  // insert를 보낸 뒤 종료 — 이후 쓰기 없음
  const ins = counter("ok");
  for (const ms of [1000, STALE_MS + 1, 24 * 60 * 60 * 1000]) {
    const r = await runRemixSave(db.cas, ctx(`X${ms}`, ms), ins);
    assert.equal(r.acquired, "lost", `${ms}ms 뒤`);
  }
  assert.equal(ins.calls, 0);
});

test("insert 불확실·insert 뒤 예외 → 추가 쓰기 없음·연장 0, 표시 영속", async () => {
  for (const make of [() => counter("uncertain"), () => counter("retry_uncertain"), () => { const f = async () => { f.calls++; throw new Error("x"); }; f.calls = 0; return f; }]) {
    const db = makeDb(ROW); const ins = make();
    const r = await runRemixSave(db.cas, ctx("A"), ins);
    assert.equal(r.insertCalled, true);
    assert.equal(r.finished, undefined, "완료/실패 갱신 없음");
    assert.equal(r.extendAllowed, false);
    assert.equal(db.row.error_message, insertingValue("T0", "A"));
    const again = await runRemixSave(db.cas, ctx("B", STALE_MS + 1), ins);
    assert.equal(again.acquired, "lost");
    assert.equal(ins.calls, 1);
  }
});

test("확정 실패·건너뜀 → failed(다른 문구), 연장 0", async () => {
  for (const [o, msg] of [["error", "곡을 저장하지 못했습니다."], ["retry_failed", "곡을 저장하지 못했습니다."], ["skipped", "Suno가 오디오 URL을 반환하지 않았습니다."]]) {
    const db = makeDb(ROW);
    const r = await runRemixSave(db.cas, ctx("A"), counter(o));
    assert.equal(r.extendAllowed, false);
    assert.equal(db.row.status, "failed");
    assert.equal(db.row.error_message, msg);
  }
});

test("완료 갱신이 실패하면(응답 유실) 연장 0, 표시 유지 시 재실행 0", async () => {
  const db = makeDb(ROW);
  let n = 0; const cas = async (s, w) => { n++; if (n === 3) db.failNext = true; return db.cas(s, w); };
  const ins = counter("ok");
  const r = await runRemixSave(cas, ctx("A"), ins);
  assert.equal(r.finished, "uncertain");
  assert.equal(r.extendAllowed, false);
  const again = await runRemixSave(db.cas, ctx("B", STALE_MS + 1), ins);
  assert.equal(again.acquired, "lost");
  assert.equal(ins.calls, 1);
});

test("다른 작업 번호·다른 hop의 요청은 잡지 못함", async () => {
  const db = makeDb({ ...ROW, task_id: "T1", extend_hop_count: 1 });
  assert.equal(await acquire(db.cas, ctx("A")), "lost", "T0·hop0 요청");
  assert.equal(await acquire(db.cas, ctx("A", 0, { taskId: "T1", hop: 0 })), "lost", "hop 불일치");
  assert.equal(await acquire(db.cas, ctx("A", 0, { taskId: "T1", hop: 1 })), "ok");
});

test("기존 공용 잠금 값(__syncing__)은 5분 지나야 잡힘 — 전환 중 호환", async () => {
  const db = makeDb({ ...ROW, error_message: LEGACY_LOCK });
  assert.equal(await acquire(db.cas, ctx("A", 1000)), "lost");
  assert.equal(await acquire(db.cas, ctx("A", STALE_MS + 1000)), "ok");
});

test("완료·실패 상태는 잡지 못함", async () => {
  for (const status of ["completed", "failed"]) {
    const db = makeDb({ ...ROW, status });
    assert.equal(await acquire(db.cas, ctx("A", STALE_MS * 10)), "lost");
  }
});
