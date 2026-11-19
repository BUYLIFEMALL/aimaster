// R1 격리 후보 시험 2판(전부 모의) — 실행: node --import ./test/register.mjs --test test/r1.test.mjs
// 가) 연결점이 없는 프로그램: 고친 파일이 원본과 같은 결과·같은 DB 호출·같은 응답 모양을 낸다(원본과 나란히 실행해 대조).
// 나) 연결점이 있는 프로그램: 관리자 허용과 회원의 명시 선택(실행 방식 행의 칸)이 둘 다 있을 때만 Vercel이 유효하다.
// 다) 실패·경합: 저장 실패, 방식 바꾸기·키 삭제·예약 시작이 겹칠 때 허위 선택과 옛 작업 재활성화가 없다.
import test from "node:test";
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";

const SCHED = "insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts";
const POSTING = "ai-webtoon-studio/src/lib/instagram/posting.ts";
const ROUTE = "ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts";
const load = (root, file, cfg) => import(new URL(`../${root}${file}?cfg=${cfg}`, import.meta.url).href);

const orig = await load("orig/", SCHED, "none");
const patched = await load("", SCHED, "none");
const policy = await load("", SCHED, "policy");
const nocol = await load("", SCHED, "nocol");
const casOnly = await load("", SCHED, "cas"); // 비교용: 판 번호 없이 방식·선택 값만 비교
const origPosting = await load("orig/", POSTING, "none");
const patchedPosting = await load("", POSTING, "none");
const origRoute = await load("orig/", ROUTE, "none");
const patchedRoute = await load("", ROUTE, "none");
const policyRoute = await load("", ROUTE, "policy");
const COL = "platform_chosen_at";

// ── 모의 DB ──
class Q {
  constructor(table) { this.table = table; this.filters = []; this.op = "select"; this.trace = [table]; }
  note(name, ...args) { this.trace.push([name, ...args]); return this; }
  select(cols) { this.returning = true; return this.note("select", cols); }
  eq(k, v) { this.filters.push((r) => r[k] === v); return this.note("eq", k, v); }
  is(k, v) { this.filters.push((r) => (r[k] ?? null) === v); return this.note("is", k, v); }
  in(k, vs) { this.filters.push((r) => vs.includes(r[k])); return this.note("in", k, [...vs]); }
  not(k, op, v) {
    if (op === "is") this.filters.push((r) => r[k] != null);
    else { const set = String(v).slice(1, -1).split(","); this.filters.push((r) => !set.includes(r[k])); }
    return this.note("not", k, op, v);
  }
  or(expr) { this.filters.push((r) => r.mode === "cronjob" || r.paused === true); return this.note("or", expr); }
  lte(k, v) { this.filters.push((r) => r[k] <= v); return this.note("lte", k); }
  lt(k, v) { this.filters.push((r) => r[k] < v); return this.note("lt", k); }
  order(k) { return this.note("order", k); }
  limit(n) { this.max = n; return this.note("limit", n); }
  insert(o) { this.op = "insert"; this.payload = o; return this.note("insert", strip(o)); }
  update(o) { this.op = "update"; this.payload = o; return this.note("update", strip(o)); }
  upsert(o) { this.op = "upsert"; this.payload = o; return this.note("upsert", strip(o)); }
  delete() { this.op = "delete"; return this.note("delete"); }
  maybeSingle() { return this.run().then((r) => ({ data: r.data?.[0] ?? null, error: r.error })); }
  single() { return this.maybeSingle(); }
  then(a, b) { return this.run().then(a, b); }
  async run() {
    const T = globalThis.T;
    if (T.gate) await T.gate();
    T.dbLog.push(this.trace);
    const forced = T.dbFail?.(this);
    if (forced) return forced === true ? { data: null, error: { message: "DB 실패" } } : forced;
    const rows = (T.tables[this.table] ??= []);
    const hit = () => rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "insert") {
      if (this.table === "sched" && rows.some((r) => r.user_id === this.payload.user_id)) return { data: null, error: { message: "중복 행" } };
      rows.push(this.table === "sched" ? { mode_rev: 0, ...this.payload } : { ...this.payload }); return { data: [{ ...this.payload }], error: null };
    }
    if (this.op === "upsert") {
      const cur = rows.find((r) => r.user_id === this.payload.user_id);
      if (cur) Object.assign(cur, this.payload); else rows.push(this.table === "sched" ? { mode_rev: 0, ...this.payload } : { ...this.payload });
      return { data: [], error: null };
    }
    if (this.op === "update") { const h = hit(); h.forEach((r) => Object.assign(r, this.payload)); return { data: this.returning ? h.map((r) => ({ ...r })) : null, error: null }; }
    if (this.op === "delete") { const h = hit(); T.tables[this.table] = rows.filter((r) => !h.includes(r)); return { data: null, error: null }; }
    const h = hit().map((r) => ({ ...r }));
    return { data: this.max ? h.slice(0, this.max) : h, error: null };
  }
}
const ISO = /\d{4}-\d{2}-\d{2}T[\d:.]+Z/g;
const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === "updated_at" || k === "published_at" || k === "scheduled_at" ? undefined : v)).replace(ISO, "<시각>").replace(/"[0-9a-f]{64}"/g, '"<해시>"'));
const PAST = new Date(Date.now() - 60_000).toISOString();

function reset(init = {}) {
  const service = { from: (t) => new Q(t), storage: { from: () => ({ remove: async () => ({}), getPublicUrl: (p) => ({ data: { publicUrl: "u/" + p } }) }) } };
  globalThis.T = {
    service, tables: { sched: [], user_api_keys: [], posts: [] }, remaining: {}, cronLog: [], cronFail: false, cronFailOn: false,
    job: { exists: true, enabled: false, ...(init.job ?? {}) }, gate: null,
    dbLog: [], dbFail: null, published: [], adminCreated: 0,
    policy: { allowed: new Set(init.allowed ?? []), allowedThrows: false, listThrows: false },
  };
  for (const r of init.rows ?? []) T.tables.sched.push({ token_hash: `unset-${r.user_id}`, active: false, paused: false, mode_rev: 0, ...r });
  for (const u of init.keys ?? []) T.tables.user_api_keys.push({ user_id: u, provider: "cronjob_org_api_key", api_key: "key-" + u });
  Object.assign(T.remaining, init.remaining ?? {});
  for (const p of init.posts ?? []) T.tables.posts.push({ status: "scheduled", scheduled_at: PAST, image_paths: ["a.png"], caption: "글 " + p.id, error_message: null, ...p });
  if (init.env === undefined) delete process.env.TST_PLATFORM_SCHEDULER; else process.env.TST_PLATFORM_SCHEDULER = init.env;
  return service;
}
const snapshot = () => strip({ tables: globalThis.T.tables, cron: globalThis.T.cronLog, db: globalThis.T.dbLog, published: globalThis.T.published });
async function outcome(fn) { try { return { value: strip((await fn()) ?? null) }; } catch (e) { return { error: e.message }; } }
const row0 = () => globalThis.T.tables.sched[0];
const wrote = () => globalThis.T.dbLog.some((t) => t.some((c) => Array.isArray(c) && ["update", "insert", "upsert", "delete"].includes(c[0])));
const P = () => globalThis.T.policy;
const chosen = (mode = "vercel") => ({ mode, [COL]: "2026-11-19T00:00:00.000Z" });

// ── 가) 연결점 없음: 원본과 대조 ──
const STATES = [
  { name: "행 없음", rows: [] },
  { name: "vercel 행", rows: [{ user_id: "u1", mode: "vercel" }] },
  { name: "cronjob 행(켜짐·토큰 있음)", rows: [{ user_id: "u1", mode: "cronjob", active: true, token_hash: "a".repeat(64) }] },
  { name: "cronjob 행(자리표시 토큰)", rows: [{ user_id: "u1", mode: "cronjob" }] },
  { name: "일시정지 vercel 행", rows: [{ user_id: "u1", mode: "vercel", paused: true }] },
  { name: "일시정지 cronjob 행", rows: [{ user_id: "u1", mode: "cronjob", paused: true, token_hash: "b".repeat(64) }] },
];
const OPS = {
  memberSchedulerMode: (m, s) => m.memberSchedulerMode(s, "u1"),
  memberSchedulerState: (m, s) => m.memberSchedulerState(s, "u1"),
  "setMode(vercel)": (m, s) => m.setMemberSchedulerMode(s, "u1", "vercel"),
  "setMode(cronjob)": (m, s) => m.setMemberSchedulerMode(s, "u1", "cronjob"),
  removeMemberScheduler: (m, s) => m.removeMemberScheduler(s, "u1"),
  "removeMemberScheduler(keepMode)": (m, s) => m.removeMemberScheduler(s, "u1", { keepMode: true }),
  pause: (m, s) => m.pauseMemberScheduler(s, "u1"),
  resume: (m, s) => m.resumeMemberScheduler(s, "u1"),
  ensureRunning: (m, s) => m.ensureMemberSchedulerRunning(s, "u1", "key-u1"),
  stopIfIdle: (m, s) => m.stopMemberSchedulerIfIdle(s, "u1"),
  skipPaused: (m, s) => m.skipPausedMember(s, "u1"),
  membersExcluded: (m, s) => m.membersExcludedFromPlatform(s),
};
test("연결점 없음: 모든 함수가 원본과 같은 결과·DB 호출·cron 호출을 낸다(상태 6 × 키 2 × 남은 일 2 × 스위치 2 × cron 실패 2 × 작업 유무 2 × 함수 12)", async () => {
  const quiet = console.error; console.error = () => {};
  let compared = 0;
  try {
    assert.equal(patched.DEFAULT_SCHEDULER_MODE, orig.DEFAULT_SCHEDULER_MODE);
    assert.equal(patched.DEFAULT_SCHEDULER_MODE, "vercel");
    for (const st of STATES) for (const key of [true, false]) for (const remaining of [0, 2]) for (const env of [undefined, "off"]) for (const cronFail of [false, true]) for (const exists of [true, false]) {
      for (const [opName, op] of Object.entries(OPS)) {
        const run = async (mod) => {
          const s = reset({ rows: structuredClone(st.rows), keys: key ? ["u1"] : [], remaining: { u1: remaining }, env, job: { exists } });
          globalThis.T.cronFail = cronFail;
          const out = await outcome(() => op(mod, s));
          return { out, snap: snapshot() };
        };
        const a = await run(orig), b = await run(patched);
        assert.deepEqual(b, a, `${st.name} · 키 ${key} · 남은 일 ${remaining} · 스위치 ${env ?? "기본"} · cron 실패 ${cronFail} · 작업 ${exists} · ${opName}`);
        compared += 1;
      }
    }
  } finally { console.error = quiet; }
  assert.equal(compared, 6 * 2 * 2 * 2 * 2 * 2 * 12);
});

test("연결점 없음: 상태 응답에 새 칸이 들어가지 않고, 행 조회 칸 글자도 예전 그대로다", async () => {
  for (const st of STATES) {
    const s = reset({ rows: structuredClone(st.rows), keys: ["u1"] });
    assert.deepEqual(Object.keys(await patched.memberSchedulerState(s, "u1")).sort(), ["defaultMode", "hasKey", "mode", "platformAvailable", "scheduled", "state"], st.name);
    assert.equal(JSON.stringify(globalThis.T.dbLog).includes(COL), false);
    assert.equal(globalThis.T.dbLog.some((t) => t[0] === "sched" && t[1][0] === "select" && t[1][1] === "user_id, mode, active, paused"), true);
  }
  assert.equal(await patched.memberPlatformAllowed(reset(), "u1"), true);
});

test("연결점 없음: 실행 범위는 예전 제외 목록 그대로이고 DB 조회도 한 번·같은 모양이다", async () => {
  const rows = [{ user_id: "a", mode: "vercel" }, { user_id: "b", mode: "cronjob" }, { user_id: "c", mode: "vercel", paused: true }];
  let s = reset({ rows: structuredClone(rows) });
  const want = await orig.membersExcludedFromPlatform(s); const wantDb = snapshot().db;
  s = reset({ rows: structuredClone(rows) });
  assert.deepEqual(await patched.platformDispatchScope(s), { excludeUserIds: want });
  assert.deepEqual(snapshot().db, wantDb);
  assert.deepEqual(want.sort(), ["b", "c"]);
  s = reset(); globalThis.T.dbFail = () => true;
  await assert.rejects(() => patched.platformDispatchScope(s), /목록을 읽지 못했습니다/);
});

const POSTS = [{ id: "p1", user_id: "a" }, { id: "p2", user_id: "b" }, { id: "p3", user_id: "c" }];
test("연결점 없음: 게시 처리(dispatchDuePosts)가 원본과 같은 결과·DB 호출·게시를 낸다", async () => {
  for (const options of [{}, { excludeUserIds: ["b"] }, { userId: "c" }, { excludeUserIds: ["a", "b"], failWithMessage: "꺼짐" }]) {
    const run = async (mod) => { reset({ posts: structuredClone(POSTS) }); const out = await outcome(() => mod.dispatchDuePosts(10, options)); return { out, snap: snapshot(), admin: globalThis.T.adminCreated }; };
    assert.deepEqual(await run(patchedPosting), await run(origPosting), JSON.stringify(options));
  }
});

test("연결점 없음: 사이트 예약 실행 경로가 원본과 같은 응답(키 포함)·DB 호출을 낸다 — 스위치 off면 예전처럼 실패 처리", async () => {
  process.env.CRON_SECRET = "시험값";
  const req = (auth) => ({ headers: { get: () => auth } });
  for (const env of [undefined, "off"]) for (const auth of ["Bearer 시험값", "Bearer 틀림"]) {
    const run = async (mod) => {
      reset({ rows: [{ user_id: "b", mode: "cronjob" }], posts: structuredClone(POSTS), env });
      const res = await mod.GET(req(auth));
      return { res: strip(res), keys: Object.keys(res.body).sort(), snap: snapshot() };
    };
    const a = await run(origRoute), b = await run(patchedRoute);
    assert.deepEqual(b, a, `스위치 ${env ?? "기본"} · ${auth}`);
    if (auth === "Bearer 틀림") { assert.equal(b.res.status, 401); continue; }
    assert.deepEqual(b.keys, ["cleaned", "processed", "results"]);
    if (!env) assert.deepEqual(b.snap.published.sort(), ["글 p1", "글 p3"]);
    else assert.deepEqual(b.snap.tables.posts.map((p) => p.status), ["failed", "scheduled", "failed"]);
  }
});

// ── 나) 연결점 있음 ──
test("연결점 있음: 기본 방식은 cronjob이고 행이 없으면 관리자·지정 회원도 cronjob이다", async () => {
  assert.equal(policy.DEFAULT_SCHEDULER_MODE, "cronjob");
  const s = reset({ allowed: ["admin"] });
  assert.equal(await policy.memberSchedulerMode(s, "admin"), "cronjob");
  assert.equal(await policy.memberSchedulerMode(s, "member"), "cronjob");
  const st = await policy.memberSchedulerState(s, "admin");
  assert.equal(st.mode, "cronjob"); assert.equal(st.defaultMode, "cronjob"); assert.equal(st.platformAllowed, true); assert.equal(st.platformReselectNeeded, false);
  const m = await policy.memberSchedulerState(s, "member");
  assert.equal(m.platformAllowed, false); assert.equal(m.platformAvailable, false);
});

test("연결점 있음: 판정표 — 관리자 허용과 회원의 명시 선택이 둘 다 있어야 vercel(행은 고치지 않는다)", async () => {
  const cases = [
    ["일반 · vercel 행", false, { mode: "vercel" }, "cronjob"],
    ["일반 · vercel 행 · 선택 기록만 있음", false, chosen(), "cronjob"],
    ["일반 · cronjob 행", false, { mode: "cronjob" }, "cronjob"],
    ["지정 · vercel 행 · 명시 선택 있음", true, chosen(), "vercel"],
    ["지정 · 옛 vercel 행 · 선택 기록 없음", true, { mode: "vercel" }, "cronjob"],
    ["지정 · 옛 vercel 행 · 선택 칸 null", true, { mode: "vercel", [COL]: null }, "cronjob"],
    ["지정 철회 · vercel 행 · 선택 기록 남음", false, chosen(), "cronjob"],
    ["지정 · cronjob 행 · 선택 기록이 남아 있어도", true, chosen("cronjob"), "cronjob"],
  ];
  for (const [name, allowed, r, want] of cases) {
    const s = reset({ rows: [{ user_id: "u1", ...r }], allowed: allowed ? ["u1"] : [] });
    const before = structuredClone(row0());
    assert.equal(await policy.memberSchedulerMode(s, "u1"), want, name);
    assert.equal((await policy.memberSchedulerState(s, "u1")).mode, want, name + " (상태)");
    assert.deepEqual(row0(), before, name + " — 행은 그대로");
    assert.equal(wrote(), false, name + " — 쓰기 0");
  }
});

test("연결점 있음: 옛 vercel 행은 「다시 고르기 필요」로 알리고, 다시 고르면 방식과 선택이 한 번의 갱신으로 적힌다", async () => {
  const s = reset({ rows: [{ user_id: "u1", mode: "vercel" }], allowed: ["u1"], keys: ["u1"] });
  const st = await policy.memberSchedulerState(s, "u1");
  assert.equal(st.platformReselectNeeded, true); assert.equal(st.mode, "cronjob"); assert.equal(st.platformAllowed, true);
  globalThis.T.dbLog.length = 0;
  await policy.setMemberSchedulerMode(s, "u1", "vercel");
  const writes = globalThis.T.dbLog.filter((t) => t.some((c) => Array.isArray(c) && c[0] === "update"));
  assert.equal(writes.length, 1, "갱신은 한 번");
  const payload = writes[0].find((c) => c[0] === "update")[1];
  assert.equal(payload.mode, "vercel"); assert.equal(COL in payload, true); assert.equal(payload.active, false);
  assert.equal(row0().mode, "vercel"); assert.notEqual(row0()[COL], null);
  const after = await policy.memberSchedulerState(s, "u1");
  assert.equal(after.mode, "vercel"); assert.equal(after.platformReselectNeeded, false); assert.equal(after.state, "platform");
  // 순서: 저장이 먼저, 작업 끄기가 나중
  assert.deepEqual(globalThis.T.cronLog, [["enable", "key-u1", false]]);
});

test("연결점 있음: 권한 조회가 실패하면 Vercel을 막는다", async () => {
  const s = reset({ rows: [{ user_id: "u1", ...chosen() }], allowed: ["u1"] }); P().allowedThrows = true;
  assert.equal(await policy.memberSchedulerMode(s, "u1"), "cronjob");
  assert.equal(await policy.memberPlatformAllowed(s, "u1"), false);
  await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "vercel"), /쓸 수 없습니다/);
  const st = await policy.memberSchedulerState(s, "u1");
  assert.equal(st.mode, "cronjob"); assert.equal(st.platformAllowed, false);
});

test("연결점 있음: 선택 칸 이름이 빠진 연결점은 누구에게도 Vercel을 열지 않는다", async () => {
  let s = reset({ rows: [{ user_id: "u1", ...chosen() }], allowed: ["u1"] });
  assert.equal(nocol.DEFAULT_SCHEDULER_MODE, "cronjob");
  assert.equal(await nocol.memberSchedulerMode(s, "u1"), "cronjob");
  await assert.rejects(() => nocol.setMemberSchedulerMode(s, "u1", "vercel"), /쓸 수 없습니다/);
  assert.equal(wrote(), false);
  const scope = await nocol.platformDispatchScope(s);
  assert.deepEqual(scope.onlyUserIds, []); assert.equal(await scope.allowUser("u1"), false);
  s = reset({ rows: [{ user_id: "u1", ...chosen() }], allowed: ["u1"] });
  assert.equal((await nocol.memberSchedulerState(s, "u1")).mode, "cronjob");
});

test("연결점 있음: Vercel로 바꾸기 — 일반 회원 거절(쓰기 0), 사이트 스위치 off면 지정 회원도 거절(쓰기는 행 만들기뿐)", async () => {
  let s = reset({ rows: [{ user_id: "u1", mode: "cronjob" }] });
  await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "vercel"), /쓸 수 없습니다/);
  assert.equal(row0().mode, "cronjob"); assert.equal(row0()[COL] ?? null, null); assert.equal(wrote(), false);
  s = reset({ rows: [{ user_id: "u1", mode: "cronjob" }], env: "off", allowed: ["u1"] });
  await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "vercel"), /꺼져 있어/);
  assert.equal(row0().mode, "cronjob"); assert.equal(row0()[COL] ?? null, null);
});

test("연결점 있음: cronjob으로 바꾸거나 예약을 시작하면 선택 기록이 같은 갱신으로 지워진다", async () => {
  let s = reset({ rows: [{ user_id: "u1", ...chosen() }], allowed: ["u1"], keys: ["u1"] });
  await policy.setMemberSchedulerMode(s, "u1", "cronjob");
  assert.equal(row0().mode, "cronjob"); assert.equal(row0()[COL], null);
  // 예약 시작(작업이 이미 있음): 행이 옛 vercel이어도 cronjob으로 맞추고 선택 기록을 지운다
  const hash = "d".repeat(64);
  s = reset({ rows: [{ user_id: "u1", ...chosen(), token_hash: hash }], keys: ["u1"], remaining: { u1: 1 } });
  assert.equal(await policy.memberSchedulerMode(s, "u1"), "cronjob", "지정이 아니라 유효 방식은 cronjob");
  await policy.ensureMemberSchedulerRunning(s, "u1", "key-u1");
  assert.equal(row0().mode, "cronjob"); assert.equal(row0()[COL], null); assert.equal(row0().active, true); assert.equal(row0().token_hash, hash);
  assert.equal(globalThis.T.job.enabled, true);
  // 예약 시작(작업이 없음 → 새로 만듦)
  s = reset({ rows: [{ user_id: "u1", ...chosen() }], keys: ["u1"], remaining: { u1: 1 }, job: { exists: false } });
  await policy.ensureMemberSchedulerRunning(s, "u1", "key-u1");
  assert.equal(row0().mode, "cronjob"); assert.equal(row0()[COL], null); assert.equal(globalThis.T.job.enabled, true);
});

test("연결점 있음: 키 삭제는 방식을 쓰지 않는다 — Vercel 선택이 생기지 않고, 있던 명시 선택도 그대로다", async () => {
  for (const allowed of [false, true]) {
    const s = reset({ rows: [{ user_id: "u1", mode: "cronjob", active: true, token_hash: "c".repeat(64) }], keys: ["u1"], allowed: allowed ? ["u1"] : [] });
    await policy.removeMemberScheduler(s, "u1");
    assert.equal(row0().mode, "cronjob", `지정 ${allowed}`); assert.equal(row0()[COL] ?? null, null); assert.equal(row0().active, false); assert.equal(row0().token_hash, "unset-u1");
    const payload = globalThis.T.dbLog.find((t) => t.some((c) => c[0] === "update")).find((c) => c[0] === "update")[1];
    assert.equal("mode" in payload, false, "갱신에 방식이 들어가지 않는다");
    assert.equal(globalThis.T.job.exists, false);
  }
  const s = reset({ rows: [{ user_id: "u1", ...chosen() }], keys: ["u1"], allowed: ["u1"] });
  const choice = row0()[COL];
  await policy.removeMemberScheduler(s, "u1");
  assert.equal(row0().mode, "vercel"); assert.equal(row0()[COL], choice);
});

test("연결점 있음: 실행 범위 = 허용 ∩ vercel 행 ∩ 명시 선택 ∩ 일시정지 아님. 목록·DB 실패나 사이트 스위치 off면 아무도 처리하지 않는다", async () => {
  const rows = [
    { user_id: "admin", ...chosen() }, { user_id: "desig", ...chosen() }, { user_id: "old", mode: "vercel" },
    { user_id: "paused", ...chosen(), paused: true }, { user_id: "cj", mode: "cronjob" }, { user_id: "member", ...chosen() },
    { user_id: "cjstale", ...chosen("cronjob") }, // 선택 기록이 남아 있어도 행이 cronjob이면 대상이 아니다
  ];
  const allowed = ["admin", "desig", "old", "paused", "cj", "cjstale"];
  let s = reset({ rows: structuredClone(rows), allowed });
  let scope = await policy.platformDispatchScope(s);
  assert.deepEqual([...scope.onlyUserIds].sort(), ["admin", "desig"]);
  assert.equal("excludeUserIds" in scope, false);
  assert.equal(await scope.allowUser("admin"), true);
  for (const u of ["old", "paused", "cj", "cjstale", "member", "없는회원"]) assert.equal(await scope.allowUser(u), false, u);
  // 목록을 만든 뒤 처리 직전에 바뀐 경우
  P().allowed.delete("desig"); assert.equal(await scope.allowUser("desig"), false, "철회");
  row0().paused = true; assert.equal(await scope.allowUser("admin"), false, "일시정지");
  row0().paused = false; row0().mode = "cronjob"; assert.equal(await scope.allowUser("admin"), false, "방식 변경");
  row0().mode = "vercel"; row0()[COL] = null; assert.equal(await scope.allowUser("admin"), false, "선택 기록 지워짐");
  row0()[COL] = "2026-11-19T00:00:00.000Z"; P().allowedThrows = true; assert.equal(await scope.allowUser("admin"), false, "권한 조회 실패");
  P().allowedThrows = false; process.env.TST_PLATFORM_SCHEDULER = "off"; assert.equal(await scope.allowUser("admin"), false, "사이트 스위치 off");
  delete process.env.TST_PLATFORM_SCHEDULER; assert.equal(await scope.allowUser("admin"), true, "원래대로면 참");
  globalThis.T.dbFail = () => true; assert.equal(await scope.allowUser("admin"), false, "행 조회 실패");

  s = reset({ rows: structuredClone(rows), allowed }); P().listThrows = true;
  scope = await policy.platformDispatchScope(s); assert.deepEqual(scope.onlyUserIds, []); assert.equal(await scope.allowUser("admin"), false);
  s = reset({ rows: structuredClone(rows), allowed }); globalThis.T.dbFail = () => true;
  scope = await policy.platformDispatchScope(s); assert.deepEqual(scope.onlyUserIds, []);
  s = reset({ rows: structuredClone(rows) });
  scope = await policy.platformDispatchScope(s); assert.deepEqual(scope.onlyUserIds, []); assert.equal(globalThis.T.dbLog.length, 0);
  s = reset({ rows: structuredClone(rows), allowed, env: "off" });
  scope = await policy.platformDispatchScope(s); assert.deepEqual(scope.onlyUserIds, []); assert.equal(globalThis.T.dbLog.length, 0);
});

test("게시 처리: 허용 목록이 비면 DB를 열지 않고 0건, 목록에 없는 회원 글은 조회 대상이 아니다", async () => {
  reset({ posts: structuredClone(POSTS) });
  assert.deepEqual(await patchedPosting.dispatchDuePosts(10, { onlyUserIds: [], failWithMessage: "꺼짐" }), []);
  assert.equal(globalThis.T.adminCreated, 0); assert.equal(globalThis.T.dbLog.length, 0);
  reset({ posts: structuredClone(POSTS) });
  assert.deepEqual(await patchedPosting.dispatchDuePosts(10, { onlyUserIds: ["a"] }), [{ id: "p1", status: "published" }]);
  assert.deepEqual(globalThis.T.tables.posts.map((p) => p.status), ["published", "scheduled", "scheduled"]);
});

test("게시 처리: 처리 직전 재확인이 거짓·실패면 그 글을 잡지 않는다(대기 상태·사진·기록 그대로)", async () => {
  for (const allowUser of [async (u) => u !== "a", async (u) => { if (u === "a") throw new Error("조회 실패"); return true; }]) {
    reset({ posts: structuredClone(POSTS) });
    const before = structuredClone(globalThis.T.tables.posts[0]);
    const out = await patchedPosting.dispatchDuePosts(10, { onlyUserIds: ["a", "b"], allowUser });
    assert.deepEqual(out, [{ id: "p1", status: "skipped" }, { id: "p2", status: "published" }]);
    assert.deepEqual(globalThis.T.tables.posts[0], before);
    assert.deepEqual(globalThis.T.published, ["글 p2"]);
    assert.equal(globalThis.T.dbLog.some((t) => t.some((c) => Array.isArray(c) && c[0] === "eq" && c[2] === "p1")), false, "p1에 대한 쓰기·잠금 0");
  }
});

const call = (mod) => mod.GET({ headers: { get: () => "Bearer 시험값" } });
test("연결점 있음: 사이트 예약 실행 경로 — 지정 + 명시 선택 글만 올린다. 건너뛴 글은 처리 수에서 빼고 따로 센다", async () => {
  process.env.CRON_SECRET = "시험값";
  reset({
    rows: [{ user_id: "admin", ...chosen() }, { user_id: "late", ...chosen() }, { user_id: "old", mode: "vercel" }, { user_id: "member", ...chosen() }],
    posts: [{ id: "p1", user_id: "admin" }, { id: "p2", user_id: "late" }, { id: "p3", user_id: "old" }, { id: "p4", user_id: "member" }, { id: "p5", user_id: "norow" }],
    allowed: ["admin", "late", "old"],
  });
  // late: 목록에는 들었지만 글을 잡기 직전에 지정이 철회된 회원
  const realAllowed = P().allowed; let asked = 0;
  P().allowed = { has: (u) => (u === "late" ? (asked += 1) && false : realAllowed.has(u)), [Symbol.iterator]: () => realAllowed[Symbol.iterator]() };
  const res = await call(policyRoute);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.results, [{ id: "p1", status: "published" }]);
  assert.equal(res.body.processed, 1); assert.equal(res.body.skipped, 1); assert.equal(asked > 0, true);
  assert.deepEqual(globalThis.T.tables.posts.map((p) => p.status), ["published", "scheduled", "scheduled", "scheduled", "scheduled"]);
  assert.deepEqual(globalThis.T.published, ["글 p1"]);
});

test("연결점 있음: 사이트 스위치가 꺼져 있으면 대기 글을 실패로 바꾸지 않고 그대로 둔다", async () => {
  process.env.CRON_SECRET = "시험값";
  reset({ rows: [{ user_id: "admin", ...chosen() }], posts: [{ id: "p1", user_id: "admin" }, { id: "p2", user_id: "member" }], allowed: ["admin"], env: "off" });
  const before = structuredClone(globalThis.T.tables.posts);
  const res = await call(policyRoute);
  assert.equal(res.status, 200); assert.deepEqual(res.body.results, []); assert.equal(res.body.processed, 0); assert.equal(res.body.skipped, 0);
  assert.deepEqual(globalThis.T.tables.posts, before);
  assert.deepEqual(globalThis.T.published, []);
  // 다시 켜면 이어서 올린다
  delete process.env.TST_PLATFORM_SCHEDULER;
  assert.deepEqual((await call(policyRoute)).body.results, [{ id: "p1", status: "published" }]);
});

// ── 다) 실패·경합 ──
test("실패: Vercel로 바꾸는 저장이 실패하거나 확인되지 않으면 성공으로 돌려주지 않고, 행·cron 작업을 건드리지 않는다", async () => {
  const start = { user_id: "u1", mode: "cronjob", active: true, token_hash: "e".repeat(64) };
  for (const [name, forced] of [["DB 오류", true], ["갱신된 행 0", { data: [], error: null }], ["응답 없음", { data: null, error: null }]]) {
    const s = reset({ rows: [structuredClone(start)], allowed: ["u1"], keys: ["u1"], job: { enabled: true } });
    globalThis.T.dbFail = (q) => (q.op === "update" ? forced : null);
    await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "vercel"), /저장하지 못했습니다/, name);
    assert.equal(row0().mode, "cronjob", name); assert.equal(row0()[COL] ?? null, null, name); assert.equal(row0().active, true, name);
    assert.deepEqual(globalThis.T.cronLog, [], name + " — cron 호출 0");
    assert.equal(globalThis.T.job.enabled, true, name + " — 돌던 작업 그대로");
    globalThis.T.dbFail = null;
    assert.equal(await policy.memberSchedulerMode(s, "u1"), "cronjob", name);
  }
});

test("실패: cronjob으로 바꾸다 작업 켜기에 실패하면 예전 행(방식 + 선택 기록)으로 되돌린다 — 선택 기록을 새로 만들지 않는다", async () => {
  // 명시로 Vercel을 쓰던 지정 회원 → 되돌린 뒤에도 그 선택 그대로
  let s = reset({ rows: [{ user_id: "u1", ...chosen() }], allowed: ["u1"], keys: ["u1"], remaining: { u1: 1 } });
  const choice = row0()[COL]; globalThis.T.cronFailOn = true;
  await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "cronjob"), /cron 실패/);
  assert.equal(row0().mode, "vercel"); assert.equal(row0()[COL], choice); assert.equal(row0().active, false);
  assert.equal(globalThis.T.job.enabled, false);
  // 옛 vercel 행(선택 기록 없음) → 되돌려도 선택 기록은 없다(유효 방식은 계속 cronjob)
  s = reset({ rows: [{ user_id: "u1", mode: "vercel" }], allowed: ["u1"], keys: ["u1"], remaining: { u1: 1 } }); globalThis.T.cronFailOn = true;
  await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "cronjob"), /cron 실패/);
  assert.equal(row0().mode, "vercel"); assert.equal(row0()[COL] ?? null, null);
  assert.equal(await policy.memberSchedulerMode(s, "u1"), "cronjob");
});

test("실패: cronjob 선택이 작업 켜기에 실패하는 바로 그때 회원이 Vercel을 직접 골랐으면, 되돌리기가 그 선택을 덮지 않는다", async () => {
  const s = reset({ rows: [{ user_id: "u1", mode: "cronjob", token_hash: "9".repeat(64) }], allowed: ["u1"], keys: ["u1"], remaining: { u1: 1 } });
  globalThis.T.cronFailOn = true;
  // 작업을 켜려는 순간(곧 실패한다) 다른 요청이 방식과 선택을 한 번에 적어 넣은 상황
  globalThis.T.onCron = (entry) => { if (entry[0] === "enable" && entry[2] === true) Object.assign(row0(), chosen(), { mode_rev: row0().mode_rev + 1 }); };
  await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "cronjob"), /cron 실패/);
  assert.equal(row0().mode, "vercel"); assert.notEqual(row0()[COL] ?? null, null);
  assert.equal(await policy.memberSchedulerMode(s, "u1"), "vercel");
});

// 순서 섞기: DB·cron 호출마다 멈췄다가, 씨앗으로 정한 순서대로 하나씩 풀어 준다
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
async function interleave(seed, tasks) {
  const T = globalThis.T, pending = [], next = rng(seed);
  T.gate = () => new Promise((r) => pending.push(r));
  let done = false;
  const all = Promise.all(tasks.map((t) => t().then(() => ({ ok: true }), (e) => ({ ok: false, error: e.message })))).then((r) => { done = true; return r; });
  while (!done) { await new Promise((r) => setImmediate(r)); if (pending.length) pending.splice(Math.floor(next() * pending.length), 1)[0](); }
  T.gate = null;
  return all;
}
const SEEDS = 300;
const STARTS = [
  ["cronjob 실행 중", { rows: [{ user_id: "u1", mode: "cronjob", active: true, token_hash: "f".repeat(64) }], job: { exists: true, enabled: true } }],
  ["명시 vercel", { rows: [{ user_id: "u1", ...chosen(), token_hash: "f".repeat(64) }], job: { exists: true, enabled: false } }],
  ["옛 vercel(선택 기록 없음)", { rows: [{ user_id: "u1", mode: "vercel", token_hash: "f".repeat(64) }], job: { exists: true, enabled: false } }],
  ["행 없음·작업 없음", { rows: [], job: { exists: false, enabled: false } }],
];
const setV = (s) => () => policy.setMemberSchedulerMode(s, "u1", "vercel");
const setC = (s) => () => policy.setMemberSchedulerMode(s, "u1", "cronjob");
const ensure = (s) => () => policy.ensureMemberSchedulerRunning(s, "u1", "key-u1");
const remove = (s) => () => policy.removeMemberScheduler(s, "u1");
const PAIRS = [["Vercel 선택 ↔ cronjob 선택", setV, setC], ["Vercel 선택 ↔ 예약 시작", setV, ensure], ["Vercel 선택 ↔ 키 삭제", setV, remove], ["cronjob 선택 ↔ 키 삭제", setC, remove], ["Vercel 선택 ↔ Vercel 선택", setV, setV]];

test("경합: 방식 바꾸기·예약 시작·키 삭제가 어떤 순서로 겹쳐도 허위 선택과 옛 작업 재활성화가 없다(짝 5 × 시작 4 × 순서 300)", async () => {
  let runs = 0; const endings = new Set();
  for (const [pairName, A, B] of PAIRS) for (const [startName, start] of STARTS) for (let seed = 1; seed <= SEEDS; seed += 1) {
    const s = reset({ ...structuredClone(start), allowed: ["u1"], keys: ["u1"], remaining: { u1: 1 } });
    const hadChoice = start.rows[0]?.[COL] != null;
    const [a, b] = await interleave(seed, [A(s), B(s)]);
    const row = row0() ?? null, job = globalThis.T.job, where = `${pairName} · ${startName} · 씨앗 ${seed}`;
    const effectiveVercel = row?.mode === "vercel" && row?.[COL] != null;
    // 1. 켜진 cron 작업은 cronjob 행에서만 — Vercel 행인데 옛 회원 작업이 도는 상태가 없다
    if (job.enabled) assert.equal(row?.mode, "cronjob", where + " — 작업이 켜졌는데 행이 cronjob이 아님");
    // 2. 선택 기록은 vercel 행에만 남는다(cronjob 행에 선택이 남아 다음에 저절로 살아나는 일이 없다)
    if (row?.[COL] != null) assert.equal(row.mode, "vercel", where + " — cronjob 행에 선택 기록이 남음");
    // 3. 유효한 Vercel은 처음부터 있었거나, 성공한 Vercel 선택이 있었을 때만 — 실패한 선택이 선택으로 남지 않는다
    const vercelSucceeded = (A === setV && a.ok) || (B === setV && b.ok);
    if (effectiveVercel) assert.equal(hadChoice || vercelSucceeded, true, where + " — 근거 없는 Vercel 선택");
    // 4. 모든 요청이 실패했으면 유효 방식이 Vercel로 새로 바뀌지 않는다
    if (!a.ok && !b.ok && !hadChoice) assert.equal(effectiveVercel, false, where);
    endings.add(`${row?.mode}/${row?.[COL] != null ? "선택" : "없음"}/작업 ${job.enabled ? "켜짐" : "꺼짐"}`);
    runs += 1;
  }
  assert.equal(runs, PAIRS.length * STARTS.length * SEEDS);
  assert.equal(endings.size > 1, true, "순서가 실제로 섞여 여러 끝 상태가 나왔다");
});

test("경합: cronjob 선택이 작업 켜기에 실패하는 동안 Vercel을 골라도 허위 선택이 생기지 않고, 켜진 작업은 cronjob 행에만 있다(시작 4 × 순서 300)", async () => {
  let runs = 0, keptExplicit = 0;
  for (const [startName, start] of STARTS) for (let seed = 1; seed <= SEEDS; seed += 1) {
    const s = reset({ ...structuredClone(start), allowed: ["u1"], keys: ["u1"], remaining: { u1: 1 } });
    globalThis.T.cronFailOn = true;
    const hadChoice = start.rows[0]?.[COL] != null;
    const [v, c] = await interleave(seed, [setV(s), setC(s)]);
    const row = row0(), where = `${startName} · 씨앗 ${seed}`;
    if (globalThis.T.job.enabled) { assert.equal(row.mode, "cronjob", where + " — 작업이 켜졌는데 행이 cronjob이 아님"); assert.equal(start.job.enabled, true, where + " — 켜기에 실패했는데 새로 켜짐"); }
    if (row[COL] != null) { assert.equal(row.mode, "vercel", where); assert.equal(hadChoice || v.ok, true, where + " — 근거 없는 Vercel 선택"); }
    if (row.mode === "vercel" && row[COL] != null && v.ok) keptExplicit += 1;
    runs += 1;
  }
  assert.equal(runs, STARTS.length * SEEDS);
  assert.equal(keptExplicit > 0, true, "회원이 고른 Vercel이 실패한 되돌리기에 덮이지 않은 순서가 있다");
});

// ── 라) 두 방식 비교: 판 번호(권장 구성) ↔ 같은 행 값 비교(비교용 구성) ──
const als = new AsyncLocalStorage();
// 정해 둔 차례대로 풀어 주는 실행기: plan = [[요청 이름, 멈출 조건]] — 조건이 참이 되거나 그 요청이 끝나면 다음 줄로 간다
async function scripted(tasks, plan) {
  const T = globalThis.T, pending = [], done = {}, results = {};
  T.gate = () => new Promise((r) => pending.push({ tag: als.getStore(), r }));
  for (const [tag, fn] of Object.entries(tasks)) als.run(tag, () => fn().then(() => { results[tag] = { ok: true }; }, (e) => { results[tag] = { ok: false, error: e.message }; }).finally(() => { done[tag] = true; }));
  const tick = () => new Promise((r) => setImmediate(r));
  for (const [tag, stop] of plan) {
    while (!done[tag] && !stop()) { await tick(); const i = pending.findIndex((p) => p.tag === tag); if (i >= 0 && !stop()) pending.splice(i, 1)[0].r(); }
  }
  T.gate = null;
  while (!Object.keys(tasks).every((t) => done[t])) { while (pending.length) pending.shift().r(); await tick(); }
  return results;
}
const MAC_START = { rows: [{ user_id: "u1", ...chosen(), token_hash: "f".repeat(64) }], job: { exists: true, enabled: false } };
// Mac 독립 검수의 순서(.ai/results/AI-INFLUENCER-R1-20261119-CX-QA-01.md): A가 cronjob을 고르고 작업 켜기에 실패 → 되돌리기 직전에 멈춤
// → B가 같은 cronjob을 고르고 켜기에 성공 → A가 다시 움직여 되돌리기를 시도
async function macOrder(mod) {
  const s = reset({ ...structuredClone(MAC_START), allowed: ["u1"], keys: ["u1"], remaining: { u1: 1 } });
  let aFailed = false;
  globalThis.T.onCron = (entry) => { if (als.getStore() === "A" && entry[0] === "enable" && entry[2] === true) { aFailed = true; throw new Error("cron 실패"); } };
  const run = () => mod.setMemberSchedulerMode(s, "u1", "cronjob");
  const results = await scripted({ A: run, B: run }, [["A", () => aFailed], ["B", () => false], ["A", () => false]]);
  return { results, row: structuredClone(row0()), job: { ...globalThis.T.job } };
}

test("Mac 반례(판 번호 구성): 멈춰 있던 되돌리기가 다른 요청의 성공한 cronjob 선택을 예전 Vercel로 되돌리지 않는다 — 행·작업이 함께 맞는다", async () => {
  const { results, row, job } = await macOrder(policy);
  assert.equal(results.A.ok, false); assert.match(results.A.error, /cron 실패/);
  assert.equal(results.B.ok, true);
  assert.equal(row.mode, "cronjob"); assert.equal(row[COL], null); assert.equal(row.active, true);
  assert.equal(job.enabled, true, "B가 켠 작업이 켜져 있고 행도 cronjob");
});

test("Mac 반례(값 비교 구성): 같은 행 값 비교만으로는 이 순서를 막지 못한다 — 행은 예전 Vercel로 돌아가고 작업은 켜진 채 남는다(비교 기록)", async () => {
  const { results, row, job } = await macOrder(casOnly);
  assert.equal(results.B.ok, true);
  assert.equal(row.mode, "vercel", "B가 성공했는데 A의 되돌리기가 B의 쓰기를 자기 것으로 보고 덮었다");
  assert.notEqual(row[COL], null);
  assert.equal(job.enabled, true, "외부 작업은 켜진 채 — 행과 어긋난다");
});

// 차례 실행과 같은 결과인가: 겹쳐 돈 결과(끝 상태 + 각 요청의 성공 여부)가, 「충돌로 물러난 요청을 뺀 나머지」를 어떤 차례로 하나씩 돌린 결과와 같아야 한다
const ABORTED = /그사이 실행 방식이 바뀌었습니다|실행 방식을 저장하지 못했습니다/;
const NAMED = {
  setV: (mod) => (s) => () => mod.setMemberSchedulerMode(s, "u1", "vercel"),
  setC: (mod) => (s) => () => mod.setMemberSchedulerMode(s, "u1", "cronjob"),
  ensure: (mod) => (s) => () => mod.ensureMemberSchedulerRunning(s, "u1", "key-u1"),
  remove: (mod) => (s) => () => mod.removeMemberScheduler(s, "u1"),
};
const ORACLE_PAIRS = [["setV", "setC"], ["setV", "ensure"], ["setC", "ensure"], ["setC", "setC"], ["setV", "setV"], ["setV", "remove"], ["setC", "remove"]];
const sig = () => { const r = row0(); return JSON.stringify({ mode: r?.mode ?? null, chosen: r ? r[COL] != null : false, active: r?.active ?? false, job: globalThis.T.job.enabled }); };
async function settle(fn) { try { await fn(); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } }
async function serialOutcomes(mod, start, names, cronFailOn) {
  const outs = new Set();
  const orders = names.length === 2 ? [[0, 1], [1, 0]] : [names.map((_, i) => i)];
  for (const order of orders) {
    const s = reset({ ...structuredClone(start), allowed: ["u1"], keys: ["u1"], remaining: { u1: 1 } }); globalThis.T.cronFailOn = cronFailOn;
    const res = [];
    for (const i of order) res[i] = (await settle(NAMED[names[i]](mod)(s))).ok;
    outs.add(JSON.stringify({ res, sig: sig() }));
  }
  return outs;
}
async function countAnomalies(mod, seeds) {
  let runs = 0, leftover = 0; const bad = [];
  for (const cronFailOn of [false, true]) for (const [n1, n2] of ORACLE_PAIRS) for (const [startName, start] of STARTS) for (let seed = 1; seed <= seeds; seed += 1) {
    const s = reset({ ...structuredClone(start), allowed: ["u1"], keys: ["u1"], remaining: { u1: 1 } }); globalThis.T.cronFailOn = cronFailOn;
    const got = await interleave(seed, [NAMED[n1](mod)(s), NAMED[n2](mod)(s)]);
    const finalSig = sig();
    const names = [n1, n2], keep = got.map((g) => g.ok || !ABORTED.test(g.error));
    const kept = names.filter((_, i) => keep[i]), res = got.map((g) => g.ok).filter((_, i) => keep[i]);
    const allowed = await serialOutcomes(mod, start, kept, cronFailOn);
    runs += 1;
    if (!start.job.exists && globalThis.T.job.exists && !globalThis.T.job.enabled) leftover += 1;
    if (!allowed.has(JSON.stringify({ res, sig: finalSig }))) bad.push(`${n1}↔${n2} · ${startName} · 켜기 실패 ${cronFailOn} · 씨앗 ${seed} → ${JSON.stringify(got.map((g) => (g.ok ? "성공" : g.error)))} ${finalSig}`);
  }
  const kinds = new Map();
  for (const line of bad) { const k = line.replace(/ · 씨앗 \d+/, "").replace(/ · (cronjob 실행 중|명시 vercel|옛 vercel\(선택 기록 없음\)|행 없음·작업 없음)/, ""); kinds.set(k, (kinds.get(k) ?? 0) + 1); }
  const vercelPairBad = bad.filter((line) => line.startsWith("setV↔"));
  return { runs, bad, leftover, vercelPairBad, kinds: [...kinds].map(([k, n]) => `${n}회 ${k}`) };
}

test("차례 실행과 같은 결과(판 번호 구성): Vercel 선택이 낀 요청 겹침은 어떤 순서에서도 차례 실행의 결과와 같다 — 나머지 겹침은 횟수 기록(짝 7 × 시작 4 × 켜기 실패 2 × 순서 150)", async (t) => {
  const { runs, bad, leftover, kinds, vercelPairBad } = await countAnomalies(policy, 150);
  t.diagnostic(`판 번호 구성: ${runs}회 중 차례 실행과 다른 결과 ${bad.length}회 · 꺼진 채 남은 새 작업 ${leftover}회`);
  for (const line of kinds.slice(0, 12)) t.diagnostic("[판 번호] " + line);
  assert.equal(runs, 7 * 4 * 2 * 150);
  t.diagnostic(`판 번호 구성: Vercel 선택이 낀 짝(4종)에서 어긋난 결과 ${vercelPairBad.length}회 · cron-job.org 쪽 요청끼리(3종) ${bad.length - vercelPairBad.length}회`);
  assert.deepEqual(vercelPairBad.slice(0, 5), [], "Vercel 선택이 낀 짝은 어떤 순서에서도 차례 실행과 같아야 한다");
});

test("차례 실행과 같은 결과(값 비교 구성, 비교 기록): 같은 조건에서 어긋나는 횟수를 센다", async (t) => {
  const { runs, bad, leftover, kinds } = await countAnomalies(casOnly, 150);
  t.diagnostic(`값 비교 구성: ${runs}회 중 차례 실행과 다른 결과 ${bad.length}회 · 꺼진 채 남은 새 작업 ${leftover}회`);
  assert.equal(bad.length > 0, true, "값 비교만으로는 어긋나는 순서가 남는다(판 번호 구성과의 차이)");
  for (const line of kinds.slice(0, 12)) t.diagnostic("[값 비교] " + line);
  assert.equal(runs, 7 * 4 * 2 * 150);
});

// ── 마) 예약 시작의 세 갈림 ──
test("예약 시작: 회원이 직접 골라 유효한 Vercel이면 회원 cron 작업을 건드리지 않고 물러난다", async () => {
  const s = reset({ rows: [{ user_id: "u1", ...chosen(), token_hash: "a".repeat(64) }], allowed: ["u1"], keys: ["u1"], remaining: { u1: 1 }, job: { exists: true, enabled: false } });
  const before = structuredClone(row0());
  assert.deepEqual(await policy.ensureMemberSchedulerRunning(s, "u1", "key-u1"), { paused: false, superseded: true });
  assert.deepEqual(globalThis.T.cronLog, [], "cron 호출 0");
  assert.deepEqual(row0(), before); assert.equal(globalThis.T.job.enabled, false);
});

test("예약 시작: 다른 cronjob 쪽 요청과 겹쳐 행을 쓰지 못했을 때, 그 요청이 켠 작업을 끄지 않는다", async () => {
  const s = reset({ rows: [{ user_id: "u1", mode: "cronjob", token_hash: "a".repeat(64) }], keys: ["u1"], remaining: { u1: 1 }, job: { exists: true, enabled: false } });
  // 갱신이 번번이 「0행」으로 끝나는 상황(다른 요청이 계속 먼저 쓴다) — 행은 계속 cronjob
  globalThis.T.dbFail = (q) => (q.op === "update" ? { data: [], error: null } : null);
  const out = await policy.ensureMemberSchedulerRunning(s, "u1", "key-u1");
  assert.deepEqual(out, { paused: false }, "Vercel에 밀린 것이 아니므로 superseded가 아니다");
  assert.deepEqual(globalThis.T.cronLog, [["enable", "key-u1", true]], "켜기만 하고 끄지 않는다");
  assert.equal(globalThis.T.job.enabled, true);
});

test("예약 시작: 토큰을 저장하기 전에 회원의 Vercel이 유효해지면 새 cron 작업을 만들지 않는다", async () => {
  const s = reset({ rows: [{ user_id: "u1", ...chosen() }], keys: ["u1"], remaining: { u1: 1 }, job: { exists: false, enabled: false } });
  // 처음 볼 때는 지정이 아니었고(그래서 진행), 토큰을 쓰려는 순간에는 관리자가 지정을 마친 상황
  let asked = 0;
  P().allowed = { has: () => (asked += 1) > 1, [Symbol.iterator]: function* () { yield "u1"; } };
  const before = structuredClone(row0());
  assert.deepEqual(await policy.ensureMemberSchedulerRunning(s, "u1", "key-u1"), { paused: false, superseded: true });
  assert.equal(globalThis.T.cronLog.some((c) => c[0] === "upsert"), false, "작업을 만들지 않는다");
  assert.equal(globalThis.T.job.exists, false);
  assert.deepEqual(row0(), before, "행(토큰·방식·선택)도 그대로");
});
