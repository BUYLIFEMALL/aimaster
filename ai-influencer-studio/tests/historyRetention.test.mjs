// W01b(2026-11-18, CC-SNS-01) — 작업 히스토리 자동 정리의 보관 예외 시험.
// 실제 GET/POST/DELETE 처리 로직(src/lib/historyStore.ts)을 가짜 DB·저장소로 돌린다. 예외 판정은 실제 loadRetentionExemptIdsStrict를 쓴다.
import test from "node:test";
import assert from "node:assert/strict";
import { getHistory, postHistory, deleteHistory, MAX_ITEMS, RETENTION_MS } from "../src/lib/historyStore.ts";
import { loadRetentionExemptIdsStrict } from "../src/lib/retentionExempt.ts";

const NOW = Date.UTC(2026, 10, 18, 3, 0);
const DAY = 24 * 60 * 60 * 1000;
const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const C = "abcdef01-2345-4789-8abc-def012345678"; // 영문자가 있는 회원 — 대문자 표기 반례용
const JPEG = "data:image/jpeg;base64," + Buffer.from("fake-jpeg").toString("base64");

/** 가짜 Supabase 서비스 클라이언트 — 이 시험이 쓰는 체인만 흉내. profilesMode로 예외 조회 실패를 만든다. */
function fakeAdmin({ history = [], profiles = [], profilesMode = "ok" } = {}) {
  const db = { aif_history: history.map((r) => ({ ...r })), profiles };
  const objects = new Set(db.aif_history.map((r) => r.image_path));
  const log = { removedPaths: [], deletedIds: [] };

  function query(table) {
    const st = { op: "select", filters: [], order: null, range: null, single: false, payload: null };
    const api = {
      select() { if (st.op !== "insert") st.op = "select"; return api; },
      eq(c, v) { st.filters.push((r) => r[c] === v); return api; },
      in(c, vs) { st.filters.push((r) => vs.includes(r[c])); return api; },
      order(c, o) { st.order = { c, asc: o?.ascending !== false }; return api; },
      range(a, b) { st.range = [a, b]; return api; },
      single() { st.single = true; return api; },
      delete() { st.op = "delete"; return api; },
      insert(p) { st.op = "insert"; st.payload = p; return api; },
      then(res, rej) { return run().then(res, rej); },
    };
    async function run() {
      if (table === "profiles") {
        if (profilesMode === "error") return { data: null, error: { message: "boom" } };
        if (profilesMode === "throw") throw new Error("network");
        if (profilesMode === "null") return { data: null, error: null };
        if (profilesMode === "weird") return { data: { id: A }, error: null };
        if (profilesMode === "badrow") return { data: [{ nope: 1 }], error: null };
        const bad = {
          blank: [{ id: "   ", retention_exempt: true }],
          empty: [{ id: "", retention_exempt: true }],
          notuuid: [{ id: "abc", retention_exempt: true }],
          number: [{ id: 123, retention_exempt: true }],
          nullrow: [null],
          nested: [[{ id: B, retention_exempt: true }]],
          flagstring: [{ id: B, retention_exempt: "true" }],
          flagfalse: [{ id: B, retention_exempt: false }],
          flagmissing: [{ id: B }],
          upper: [{ id: C.toUpperCase(), retention_exempt: true }],
          trailnl: [{ id: A + String.fromCharCode(10), retention_exempt: true }],
          crlf: [{ id: A + String.fromCharCode(13, 10), retention_exempt: true }],
          lead: [{ id: " " + A, retention_exempt: true }],
          long: [{ id: A + "0", retention_exempt: true }],
        }[profilesMode];
        if (bad) return { data: bad, error: null };
      }
      const rows = db[table];
      if (st.op === "insert") {
        const row = { ...st.payload, created_at: new Date(NOW).toISOString() };
        rows.push(row);
        return { data: st.single ? { created_at: row.created_at } : [row], error: null };
      }
      let out = rows.filter((r) => st.filters.every((f) => f(r)));
      if (st.op === "delete") {
        db[table] = rows.filter((r) => !out.includes(r));
        log.deletedIds.push(...out.map((r) => r.id));
        return { data: null, error: null };
      }
      if (st.order) out = [...out].sort((x, y) => (x[st.order.c] < y[st.order.c] ? 1 : -1) * (st.order.asc ? -1 : 1));
      if (st.range) out = out.slice(st.range[0], st.range[1] + 1);
      return { data: out, error: null };
    }
    return api;
  }
  const storage = {
    from() {
      return {
        async remove(paths) { paths.forEach((p) => objects.delete(p)); log.removedPaths.push(...paths); return { data: paths, error: null }; },
        async upload(path) { objects.add(path); return { data: { path }, error: null }; },
        async createSignedUrls(paths) { return { data: paths.map((p) => ({ path: p, signedUrl: "https://signed/" + p })), error: null }; },
        async createSignedUrl(p) { return { data: { signedUrl: "https://signed/" + p }, error: null }; },
      };
    },
  };
  const admin = { from: query, storage };
  return { admin, db, objects, log, loadExemptIds: () => loadRetentionExemptIdsStrict(admin) };
}

/** userId 회원의 행 n개(최신순 i=0이 가장 최근). oldFrom 이후 번호는 31일 전으로 만든다. */
function rows(userId, n, oldFrom = Infinity) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${userId.slice(0, 1)}-${String(i).padStart(2, "0")}`,
    user_id: userId,
    image_path: `${userId}/history/${i}.jpg`,
    captions: [], config: {}, summary: "",
    created_at: new Date(NOW - (i >= oldFrom ? 31 * DAY : i * 60_000)).toISOString(),
  }));
}

test("일반 회원 GET: 30일 지난 것·30개 넘는 것을 지운다(기존 동작 유지)", async () => {
  const f = fakeAdmin({ history: rows(A, 35, 32) }); // 0~31 최근, 32~34 31일 전
  const r = await getHistory({ admin: f.admin, userId: A, loadExemptIds: f.loadExemptIds, now: NOW });
  assert.equal(r.status, 200);
  assert.equal(r.body.items.length, MAX_ITEMS);
  assert.equal(f.db.aif_history.length, MAX_ITEMS);
  assert.equal(f.log.removedPaths.length, 5);
});

for (const [label, profile] of [
  ["유료 연장(retention_exempt, 수동 아님)", { id: A, retention_exempt: true, retention_exempt_manual: false }],
  ["관리자·시험(retention_exempt_manual)", { id: A, retention_exempt: true, retention_exempt_manual: true }],
]) {
  test(`예외 회원 GET — ${label}: 자동 삭제 0, 목록 응답만 30개`, async () => {
    const f = fakeAdmin({ history: rows(A, 35, 32), profiles: [profile] });
    const r = await getHistory({ admin: f.admin, userId: A, loadExemptIds: f.loadExemptIds, now: NOW });
    assert.equal(r.status, 200);
    assert.equal(r.body.items.length, MAX_ITEMS);
    assert.equal(f.db.aif_history.length, 35, "30개 초과·30일 지난 행이 남아야 함");
    assert.equal(f.log.removedPaths.length, 0);
    assert.equal(f.objects.size, 35);
  });
}

for (const mode of ["error", "throw", "null", "weird", "badrow", "blank", "empty", "notuuid", "number", "nullrow", "nested", "flagstring", "flagfalse", "flagmissing", "upper", "trailnl", "crlf", "lead", "long"]) {
  test(`예외 조회 실패(${mode}) GET: 자동 삭제하지 않음(fail-closed)`, async () => {
    const f = fakeAdmin({ history: rows(A, 35, 32), profilesMode: mode });
    const r = await getHistory({ admin: f.admin, userId: A, loadExemptIds: f.loadExemptIds, now: NOW });
    assert.equal(r.status, 200);
    assert.equal(r.body.items.length, MAX_ITEMS);
    assert.equal(f.db.aif_history.length, 35);
    assert.equal(f.log.removedPaths.length, 0);
  });
}

test("본인 id의 대문자 표기만 예외 목록에 있으면(비표준 UUID) GET·POST 자동 삭제 0", async () => {
  const g = fakeAdmin({ history: rows(C, 35, 32), profilesMode: "upper" });
  const r = await getHistory({ admin: g.admin, userId: C, loadExemptIds: g.loadExemptIds, now: NOW });
  assert.equal(r.status, 200);
  assert.equal(r.body.items.length, MAX_ITEMS);
  assert.equal(g.log.removedPaths.length, 0);
  const f = fakeAdmin({ history: rows(C, MAX_ITEMS), profilesMode: "upper" });
  const w = await postHistory({ admin: f.admin, userId: C, loadExemptIds: f.loadExemptIds }, { image: JPEG }, () => "new-1");
  assert.equal(w.status, 200);
  assert.equal(f.db.aif_history.length, MAX_ITEMS + 1);
  assert.equal(f.log.removedPaths.length, 0);
});

test("정상 소문자 표준 UUID 예외 회원은 그대로 예외(영문자 포함 id)", async () => {
  const f = fakeAdmin({ history: rows(C, 35, 32), profiles: [{ id: C, retention_exempt: true }] });
  await getHistory({ admin: f.admin, userId: C, loadExemptIds: f.loadExemptIds, now: NOW });
  assert.equal(f.log.removedPaths.length, 0);
  assert.equal(f.db.aif_history.length, 35);
});

test("회원 경계: A의 정리가 B의 행·파일을 건드리지 않음", async () => {
  const f = fakeAdmin({ history: [...rows(A, 33, 31), ...rows(B, 33, 0)] });
  await getHistory({ admin: f.admin, userId: A, loadExemptIds: f.loadExemptIds, now: NOW });
  assert.equal(f.db.aif_history.filter((r) => r.user_id === B).length, 33);
  assert.ok(f.log.removedPaths.every((p) => p.startsWith(A + "/")));
});

test("일반 회원 POST: 저장 뒤 30개 초과분을 지운다(기존 동작 유지)", async () => {
  const f = fakeAdmin({ history: rows(A, MAX_ITEMS) });
  const r = await postHistory({ admin: f.admin, userId: A, loadExemptIds: f.loadExemptIds }, { image: JPEG, captions: ["c"] }, () => "new-1");
  assert.equal(r.status, 200);
  assert.equal(r.body.item.id, "new-1");
  assert.equal(f.db.aif_history.length, MAX_ITEMS);
  assert.ok(f.db.aif_history.some((x) => x.id === "new-1"));
});

test("예외 회원 POST: 저장하고 30개 초과분도 지우지 않음", async () => {
  const f = fakeAdmin({ history: rows(A, MAX_ITEMS), profiles: [{ id: A, retention_exempt: true }] });
  const r = await postHistory({ admin: f.admin, userId: A, loadExemptIds: f.loadExemptIds }, { image: JPEG }, () => "new-1");
  assert.equal(r.status, 200);
  assert.equal(f.db.aif_history.length, MAX_ITEMS + 1);
  assert.equal(f.log.removedPaths.length, 0);
});

for (const mode of ["blank", "notuuid", "flagstring", "upper", "trailnl"]) {
  test(`이상한 예외 응답(${mode}) POST: 저장은 확정, 초과분 정리 0`, async () => {
    const f = fakeAdmin({ history: rows(A, MAX_ITEMS), profilesMode: mode });
    const r = await postHistory({ admin: f.admin, userId: A, loadExemptIds: f.loadExemptIds }, { image: JPEG }, () => "new-1");
    assert.equal(r.status, 200);
    assert.equal(f.db.aif_history.length, MAX_ITEMS + 1);
    assert.equal(f.log.removedPaths.length, 0);
  });
}

test("예외 조회 실패 POST: 저장은 확정, 초과분 정리만 건너뜀(모호한 상태 없음)", async () => {
  const f = fakeAdmin({ history: rows(A, MAX_ITEMS), profilesMode: "throw" });
  const r = await postHistory({ admin: f.admin, userId: A, loadExemptIds: f.loadExemptIds }, { image: JPEG }, () => "new-1");
  assert.equal(r.status, 200);
  assert.equal(f.db.aif_history.length, MAX_ITEMS + 1);
  assert.ok(f.objects.has(`${A}/history/new-1.jpg`));
  assert.equal(f.log.removedPaths.length, 0);
});

test("POST 잘못된 이미지: 쓰기 전에 400", async () => {
  const f = fakeAdmin({});
  const r = await postHistory({ admin: f.admin, userId: A, loadExemptIds: f.loadExemptIds }, { image: "data:image/png;base64,AAA" });
  assert.equal(r.status, 400);
  assert.equal(f.objects.size, 0);
});

test("DELETE 회귀: 한 건·전체는 본인 것만, 예외 회원도 수동 삭제는 그대로", async () => {
  const f = fakeAdmin({ history: [...rows(A, 3), ...rows(B, 2)], profiles: [{ id: A, retention_exempt: true }] });
  assert.equal((await deleteHistory({ admin: f.admin, userId: A }, { id: null, all: false })).status, 400);
  const one = await deleteHistory({ admin: f.admin, userId: A }, { id: "1-00", all: false });
  assert.deepEqual(one.body, { ok: true, removed: 1 });
  const other = await deleteHistory({ admin: f.admin, userId: A }, { id: "2-00", all: false });
  assert.deepEqual(other.body, { ok: true, removed: 0 }, "다른 회원 id는 지우지 않음");
  const all = await deleteHistory({ admin: f.admin, userId: A }, { id: null, all: true });
  assert.deepEqual(all.body, { ok: true, removed: 2 });
  assert.equal(f.db.aif_history.filter((r) => r.user_id === B).length, 2);
});

test("RETENTION_MS는 30일 그대로", () => {
  assert.equal(RETENTION_MS, 30 * DAY);
});
