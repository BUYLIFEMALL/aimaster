// R1 격리 후보 시험(전부 모의) — 실행: node --import ./test/register.mjs --test test/r1.test.mjs
// 가) 연결점이 없는 프로그램: 고친 파일이 원본과 같은 결과·같은 DB 호출·같은 응답 모양을 낸다(원본과 나란히 실행해 대조).
// 나) 연결점이 있는 프로그램: 판정표(플랜 §9-5)와 Master 조건.
import test from "node:test";
import assert from "node:assert/strict";

const SCHED = "insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts";
const POSTING = "ai-webtoon-studio/src/lib/instagram/posting.ts";
const ROUTE = "ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts";
const load = (root, file, cfg) => import(new URL(`../${root}${file}?cfg=${cfg}`, import.meta.url).href);

const orig = await load("orig/", SCHED, "none");
const patched = await load("", SCHED, "none");
const policy = await load("", SCHED, "policy");
const origPosting = await load("orig/", POSTING, "none");
const patchedPosting = await load("", POSTING, "none");
const origRoute = await load("orig/", ROUTE, "none");
const patchedRoute = await load("", ROUTE, "none");
const policyRoute = await load("", ROUTE, "policy");

// ── 모의 DB ──
class Q {
  constructor(table) { this.table = table; this.filters = []; this.op = "select"; this.trace = [table]; }
  note(name, ...args) { this.trace.push([name, ...args]); return this; }
  select(cols) { this.returning = true; return this.note("select", cols); }
  eq(k, v) { this.filters.push((r) => r[k] === v); return this.note("eq", k, v); }
  in(k, vs) { this.filters.push((r) => vs.includes(r[k])); return this.note("in", k, [...vs]); }
  not(k, op, v) { const set = String(v).slice(1, -1).split(","); this.filters.push((r) => !set.includes(r[k])); return this.note("not", k, op, v); }
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
    T.dbLog.push(this.trace);
    if (T.dbFail?.(this)) return { data: null, error: { message: "DB 실패" } };
    const rows = (T.tables[this.table] ??= []);
    const hit = () => rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "insert") { rows.push({ ...this.payload }); return { data: [{ ...this.payload }], error: null }; }
    if (this.op === "upsert") {
      const cur = rows.find((r) => r.user_id === this.payload.user_id);
      if (cur) Object.assign(cur, this.payload); else rows.push({ ...this.payload });
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

function reset(init = {}) {
  const service = { from: (t) => new Q(t), storage: { from: () => ({ remove: async () => ({}), getPublicUrl: (p) => ({ data: { publicUrl: "u/" + p } }) }) } };
  globalThis.T = {
    service, tables: { sched: [], user_api_keys: [], posts: [] }, remaining: {}, cronLog: [], cronFail: false, jobExists: true,
    dbLog: [], dbFail: null, published: [], adminCreated: 0,
    policy: { allowed: new Set(), confirmed: new Set(), calls: [], allowedThrows: false, confirmedThrows: false, markThrows: false, listThrows: false },
  };
  for (const r of init.rows ?? []) T.tables.sched.push({ token_hash: `unset-${r.user_id}`, active: false, paused: false, ...r });
  for (const u of init.keys ?? []) T.tables.user_api_keys.push({ user_id: u, provider: "cronjob_org_api_key", api_key: "key-" + u });
  Object.assign(T.remaining, init.remaining ?? {});
  for (const p of init.posts ?? []) T.tables.posts.push({ status: "scheduled", scheduled_at: PAST, image_paths: ["a.png"], caption: "글 " + p.id, error_message: null, ...p });
  if (init.env === undefined) delete process.env.TST_PLATFORM_SCHEDULER; else process.env.TST_PLATFORM_SCHEDULER = init.env;
  return service;
}
const snapshot = () => strip({ tables: globalThis.T.tables, cron: globalThis.T.cronLog, db: globalThis.T.dbLog, published: globalThis.T.published });
async function outcome(fn) { try { return { value: strip((await fn()) ?? null) }; } catch (e) { return { error: e.message }; } }
const PAST = new Date(Date.now() - 60_000).toISOString();

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
test("연결점 없음: 모든 함수가 원본과 같은 결과·DB 호출·cron 호출을 낸다(상태 6 × 키 2 × 남은 일 2 × 스위치 2 × cron 실패 2 × 함수 12)", async () => {
  let compared = 0;
  assert.equal(patched.DEFAULT_SCHEDULER_MODE, orig.DEFAULT_SCHEDULER_MODE);
  assert.equal(patched.DEFAULT_SCHEDULER_MODE, "vercel");
  for (const st of STATES) for (const key of [true, false]) for (const remaining of [0, 2]) for (const env of [undefined, "off"]) for (const cronFail of [false, true]) {
    for (const [opName, op] of Object.entries(OPS)) {
      const run = async (mod) => {
        const s = reset({ rows: structuredClone(st.rows), keys: key ? ["u1"] : [], remaining: { u1: remaining }, env });
        globalThis.T.cronFail = cronFail;
        const out = await outcome(() => op(mod, s));
        return { out, snap: snapshot() };
      };
      const a = await run(orig), b = await run(patched);
      assert.deepEqual(b, a, `${st.name} · 키 ${key} · 남은 일 ${remaining} · 스위치 ${env ?? "기본"} · cron 실패 ${cronFail} · ${opName}`);
      compared += 1;
    }
  }
  assert.equal(compared, 6 * 2 * 2 * 2 * 2 * 12);
});

test("연결점 없음: 상태 응답에 새 칸이 들어가지 않는다(응답 모양 그대로)", async () => {
  for (const st of STATES) {
    const s = reset({ rows: structuredClone(st.rows), keys: ["u1"] });
    assert.deepEqual(Object.keys(await patched.memberSchedulerState(s, "u1")).sort(), ["defaultMode", "hasKey", "mode", "platformAvailable", "scheduled", "state"], st.name);
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
  // 목록 조회가 실패하면 예전처럼 던진다(조용히 넘어가지 않는다)
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

test("연결점 없음: 사이트 예약 실행 경로가 원본과 같은 응답·DB 호출을 낸다(인증 실패 포함)", async () => {
  process.env.CRON_SECRET = "시험값";
  const req = (auth) => ({ headers: { get: () => auth } });
  for (const env of [undefined, "off"]) for (const auth of ["Bearer 시험값", "Bearer 틀림"]) {
    const run = async (mod) => {
      reset({ rows: [{ user_id: "b", mode: "cronjob" }], posts: structuredClone(POSTS), env });
      const res = await mod.GET(req(auth));
      return { res: strip(res), snap: snapshot() };
    };
    const a = await run(origRoute), b = await run(patchedRoute);
    assert.deepEqual(b, a, `스위치 ${env ?? "기본"} · ${auth}`);
    if (auth === "Bearer 틀림") assert.equal(b.res.status, 401);
    else if (!env) assert.deepEqual(b.snap.published.sort(), ["글 p1", "글 p3"]);
  }
});

// ── 나) 연결점 있음 ──
const P = () => globalThis.T.policy;
test("연결점 있음: 기본 방식은 cronjob이고 행이 없으면 관리자·지정 회원도 cronjob이다", async () => {
  assert.equal(policy.DEFAULT_SCHEDULER_MODE, "cronjob");
  const s = reset(); P().allowed.add("admin");
  assert.equal(await policy.memberSchedulerMode(s, "admin"), "cronjob");
  assert.equal(await policy.memberSchedulerMode(s, "member"), "cronjob");
  const st = await policy.memberSchedulerState(s, "admin");
  assert.equal(st.mode, "cronjob"); assert.equal(st.defaultMode, "cronjob"); assert.equal(st.platformAllowed, true); assert.equal(st.platformReselectNeeded, false);
  assert.equal((await policy.memberSchedulerState(s, "member")).platformAllowed, false);
  assert.equal((await policy.memberSchedulerState(s, "member")).platformAvailable, false);
});

test("연결점 있음: 판정표 — 유효 방식(행은 고치지 않는다)", async () => {
  const cases = [
    ["일반 · vercel 행", { allowed: false, confirmed: false }, "vercel", "cronjob"],
    ["일반 · cronjob 행", { allowed: false, confirmed: false }, "cronjob", "cronjob"],
    ["지정 · vercel 행 · 명시 확인됨", { allowed: true, confirmed: true }, "vercel", "vercel"],
    ["지정 · 옛 vercel 행 · 확인 안 됨", { allowed: true, confirmed: false }, "vercel", "cronjob"],
    ["지정 철회 · vercel 행(확인 기록은 남음)", { allowed: false, confirmed: true }, "vercel", "cronjob"],
    ["지정 · cronjob 행", { allowed: true, confirmed: true }, "cronjob", "cronjob"],
  ];
  for (const [name, p, rowMode, want] of cases) {
    const s = reset({ rows: [{ user_id: "u1", mode: rowMode }] });
    if (p.allowed) P().allowed.add("u1"); if (p.confirmed) P().confirmed.add("u1");
    assert.equal(await policy.memberSchedulerMode(s, "u1"), want, name);
    assert.equal((await policy.memberSchedulerState(s, "u1")).mode, want, name + " (상태)");
    assert.equal(globalThis.T.tables.sched[0].mode, rowMode, name + " — 행은 그대로");
    assert.equal(globalThis.T.dbLog.some((t) => t.some((c) => Array.isArray(c) && ["update", "insert", "upsert", "delete"].includes(c[0]))), false, name + " — 쓰기 0");
  }
});

test("연결점 있음: 옛 vercel 행은 「다시 고르기 필요」로 따로 알린다(명시 선택으로 단정하지 않음)", async () => {
  const s = reset({ rows: [{ user_id: "u1", mode: "vercel" }] }); P().allowed.add("u1");
  const st = await policy.memberSchedulerState(s, "u1");
  assert.equal(st.platformReselectNeeded, true); assert.equal(st.mode, "cronjob"); assert.equal(st.platformAllowed, true);
  await policy.setMemberSchedulerMode(s, "u1", "vercel"); // 명시로 다시 고름
  const after = await policy.memberSchedulerState(s, "u1");
  assert.equal(after.mode, "vercel"); assert.equal(after.platformReselectNeeded, false); assert.equal(after.state, "platform");
});

test("연결점 있음: 권한·확인 조회가 실패하면 Vercel을 막는다", async () => {
  for (const flag of ["allowedThrows", "confirmedThrows"]) {
    const s = reset({ rows: [{ user_id: "u1", mode: "vercel" }] }); P().allowed.add("u1"); P().confirmed.add("u1"); P()[flag] = true;
    assert.equal(await policy.memberSchedulerMode(s, "u1"), "cronjob", flag);
    if (flag === "allowedThrows") {
      assert.equal(await policy.memberPlatformAllowed(s, "u1"), false);
      await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "vercel"), /쓸 수 없습니다/);
    }
  }
});

test("연결점 있음: Vercel로 바꾸기 — 일반 회원 거절(행 그대로), 지정 회원 허용 + 명시 기록, 기록 실패면 바꾸지 않음", async () => {
  let s = reset({ rows: [{ user_id: "u1", mode: "cronjob" }] });
  await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "vercel"), /쓸 수 없습니다/);
  assert.equal(globalThis.T.tables.sched[0].mode, "cronjob");
  assert.equal(P().confirmed.has("u1"), false);

  s = reset({ rows: [{ user_id: "u1", mode: "cronjob" }], keys: ["u1"] }); P().allowed.add("u1");
  await policy.setMemberSchedulerMode(s, "u1", "vercel");
  assert.equal(globalThis.T.tables.sched[0].mode, "vercel"); assert.equal(P().confirmed.has("u1"), true);
  assert.deepEqual(globalThis.T.cronLog, [["enable", "key-u1", false]]);

  s = reset({ rows: [{ user_id: "u1", mode: "cronjob" }] }); P().allowed.add("u1"); P().markThrows = true;
  await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "vercel"), /기록 실패/);
  assert.equal(globalThis.T.tables.sched[0].mode, "cronjob");

  // 사이트 스위치가 꺼져 있으면 지정 회원도 못 고른다(예전 안내 그대로)
  s = reset({ rows: [{ user_id: "u1", mode: "cronjob" }], env: "off" }); P().allowed.add("u1");
  await assert.rejects(() => policy.setMemberSchedulerMode(s, "u1", "vercel"), /꺼져 있어/);
  assert.equal(P().confirmed.has("u1"), false);
});

test("연결점 있음: 키 삭제가 Vercel 선택을 만들지 않는다", async () => {
  for (const allowed of [false, true]) {
    const s = reset({ rows: [{ user_id: "u1", mode: "cronjob", active: true, token_hash: "c".repeat(64) }], keys: ["u1"] });
    if (allowed) { P().allowed.add("u1"); P().confirmed.add("u1"); }
    await policy.removeMemberScheduler(s, "u1");
    const row = globalThis.T.tables.sched[0];
    assert.equal(row.mode, "cronjob", `지정 ${allowed}`); assert.equal(row.active, false); assert.equal(row.token_hash, "unset-u1");
  }
  // 명시로 vercel을 쓰던 지정 회원의 행은 그대로 vercel(새로 만들어진 선택이 아님)
  const s = reset({ rows: [{ user_id: "u1", mode: "vercel" }], keys: ["u1"] }); P().allowed.add("u1"); P().confirmed.add("u1");
  await policy.removeMemberScheduler(s, "u1");
  assert.equal(globalThis.T.tables.sched[0].mode, "vercel");
});

test("연결점 있음: 옛 vercel 행 회원이 예약하면 행이 cronjob으로 맞춰진다(회원 실행 주소가 받아 주도록)", async () => {
  const hash = "d".repeat(64);
  const s = reset({ rows: [{ user_id: "u1", mode: "vercel", token_hash: hash }], keys: ["u1"], remaining: { u1: 1 } });
  assert.equal(await policy.memberSchedulerMode(s, "u1"), "cronjob");
  await policy.ensureMemberSchedulerRunning(s, "u1", "key-u1");
  const row = globalThis.T.tables.sched[0];
  assert.equal(row.mode, "cronjob"); assert.equal(row.active, true); assert.equal(row.token_hash, hash);
});

test("연결점 있음: 실행 범위 = 허용 목록 ∩ vercel 행 ∩ 일시정지 아님, 목록·DB 실패면 아무도 처리하지 않는다", async () => {
  const rows = [
    { user_id: "admin", mode: "vercel" }, { user_id: "desig", mode: "vercel" }, { user_id: "paused", mode: "vercel", paused: true },
    { user_id: "cj", mode: "cronjob" }, { user_id: "member", mode: "vercel" },
  ];
  const fill = () => { for (const u of ["admin", "desig", "paused", "cj"]) { P().allowed.add(u); P().confirmed.add(u); } };
  let s = reset({ rows: structuredClone(rows) }); fill();
  let scope = await policy.platformDispatchScope(s);
  assert.deepEqual([...scope.onlyUserIds].sort(), ["admin", "desig"]);
  assert.equal("excludeUserIds" in scope, false);
  assert.equal(await scope.allowUser("admin"), true);
  assert.equal(await scope.allowUser("member"), false);
  assert.equal(await scope.allowUser("없는회원"), false);
  // 목록을 만든 뒤 처리 직전에 바뀐 경우
  P().allowed.delete("desig"); assert.equal(await scope.allowUser("desig"), false, "철회");
  globalThis.T.tables.sched[0].paused = true; assert.equal(await scope.allowUser("admin"), false, "일시정지");
  globalThis.T.tables.sched[0].paused = false; globalThis.T.tables.sched[0].mode = "cronjob"; assert.equal(await scope.allowUser("admin"), false, "방식 변경");
  globalThis.T.tables.sched[0].mode = "vercel"; P().allowedThrows = true; assert.equal(await scope.allowUser("admin"), false, "조회 실패");

  s = reset({ rows: structuredClone(rows) }); fill(); P().listThrows = true;
  scope = await policy.platformDispatchScope(s); assert.deepEqual(scope.onlyUserIds, []); assert.equal(await scope.allowUser("admin"), false);
  s = reset({ rows: structuredClone(rows) }); fill(); globalThis.T.dbFail = () => true;
  scope = await policy.platformDispatchScope(s); assert.deepEqual(scope.onlyUserIds, []);
  s = reset({ rows: structuredClone(rows) }); // 허용 회원 0명
  scope = await policy.platformDispatchScope(s); assert.deepEqual(scope.onlyUserIds, []); assert.equal(globalThis.T.dbLog.length, 0);
});

test("게시 처리: 허용 목록이 비면 DB를 열지 않고 0건, 목록에 없는 회원 글은 조회 대상이 아니다", async () => {
  reset({ posts: structuredClone(POSTS) });
  assert.deepEqual(await patchedPosting.dispatchDuePosts(10, { onlyUserIds: [] }), []);
  assert.equal(globalThis.T.adminCreated, 0); assert.equal(globalThis.T.dbLog.length, 0);
  reset({ posts: structuredClone(POSTS) });
  const out = await patchedPosting.dispatchDuePosts(10, { onlyUserIds: ["a"] });
  assert.deepEqual(out, [{ id: "p1", status: "published" }]);
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

test("연결점 있음: 사이트 예약 실행 경로는 지정 회원이 명시로 고른 글만 올리고 나머지는 대기로 둔다", async () => {
  process.env.CRON_SECRET = "시험값";
  reset({
    rows: [{ user_id: "admin", mode: "vercel" }, { user_id: "old", mode: "vercel" }, { user_id: "member", mode: "vercel" }],
    posts: [{ id: "p1", user_id: "admin" }, { id: "p2", user_id: "old" }, { id: "p3", user_id: "member" }, { id: "p4", user_id: "norow" }],
  });
  P().allowed.add("admin"); P().confirmed.add("admin"); P().allowed.add("old"); // old = 지정됐지만 명시 확인이 없는 옛 행
  const res = await policyRoute.GET({ headers: { get: () => "Bearer 시험값" } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.results, [{ id: "p1", status: "published" }, { id: "p2", status: "skipped" }]);
  assert.deepEqual(globalThis.T.tables.posts.map((p) => p.status), ["published", "scheduled", "scheduled", "scheduled"]);
  assert.deepEqual(globalThis.T.published, ["글 p1"]);
});
