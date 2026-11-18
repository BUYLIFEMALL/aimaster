// W01-R1 원본 자산 보관 정리 시험 (2026-11-18, CC-SNS-01). 실제 DB·저장소·삭제·키·AI 호출 없음.
//  A) 정리 실행자(runRetentionCleanup)를 가짜 DB 상태 기계 위에서 돌린다. 가짜는 미적용 SQL 초안의 함수
//     (aif_asset_expire·claim_delete·delete_mark·delete_verify)를 계약 상태 전이표 그대로 흉내 낸 것이다 — 실제 DB 통합 증거가 아니다.
//  B) 요청 처리(handleCleanupRequest)의 인증·모드.
//  C) 실제 라우트 파일(src/app/api/aif/assets/cleanup/route.ts)의 GET — 운영 상수 off.
//  D) SQL 초안 정적 확인(파일 글자만 읽는다. 어떤 DB에도 실행하지 않는다).
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { readFileSync } from "node:fs";

const SRC = new URL("../src/", import.meta.url).href;
const stub = (code) => "data:text/javascript," + encodeURIComponent(code);
const STUBS = {
  "@/lib/supabase/admin": stub("export const createAdminClient = (...a) => globalThis.__aifCleanup.createAdminClient(...a);"),
};
register(stub(`
const SRC = ${JSON.stringify(SRC)}; const STUBS = ${JSON.stringify(STUBS)};
export async function resolve(s, c, n) {
  if (STUBS[s]) return { url: STUBS[s], shortCircuit: true };
  if (s === "next/server") return n("next/server.js", c);
  if (s.startsWith("@/")) return n(SRC + s.slice(2) + ".ts", c);
  try { return await n(s, c); } catch (e) { if (s.startsWith(".") && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; }
}`));

const {
  runRetentionCleanup, handleCleanupRequest, bearerOk, allot,
  CLEANUP_MAX_ITEMS, CLEANUP_MAX_ATTEMPTS, CLEANUP_TIME_BUDGET_MS, CLEANUP_SECRET_MIN_LENGTH,
  CLEANUP_IO_TIMEOUT_MS, CLEANUP_ROUND_DEADLINE_MS,
} = await import("../src/lib/assets/retention.ts");
const { AIF_ASSETS_MODE } = await import("../src/lib/assets/generation.ts");

const DAY = 86_400_000;
const HOUR = 3_600_000;
const BUCKET = "aif-assets";
const hex = (n, len) => n.toString(16).padStart(len, "0");
// 영문자가 섞인 표준 UUID(숫자뿐인 id는 대문자·형식 반례가 빨강이 되지 않는다)
const userId = (n) => `abcdef01-2345-4789-8abc-${hex(n, 12)}`;
const assetId = (n) => `0a0b0c0d-1111-4222-8333-${hex(n, 12)}`;
const objectId = (n) => `99999999-aaaa-4bbb-8ccc-${hex(n, 12)}`;
const U1 = userId(1), U2 = userId(2);

/** 가짜 세계: 자산·삭제 예약·저장소 객체·프로필. rpc는 SQL 초안의 함수를 계약대로 흉내 낸다. */
function world(over = {}) {
  const w = {
    now: 1_800_000_000_000,
    assets: new Map(), deletions: new Map(), objects: new Map(), profiles: new Map(),
    calls: [], removes: [], lists: [], measured: [],
    tokenSeq: 0, exemptLoads: 0,
    exemptFails: false, hook: null, removeMode: "ok", listFail: {}, readyIncludesProtected: false,
    clock: 0, tick: 0,
    ...over,
  };
  w.newToken = () => `fedcba98-7654-4321-8fed-${hex(++w.tokenSeq, 12)}`;
  w.profile = (user, { exempt = false, days = 30 } = {}) => { w.profiles.set(user, { exempt, days }); return w; };
  /** 자산 한 건 + 그 객체. ageDays = 객체가 만들어진 지 며칠 */
  w.asset = (n, user, { state = "ready", ageDays = 40, object = true, bytes = 1000 } = {}) => {
    const id = assetId(n);
    const path = `${user}/generated/${id}.png`;
    const oid = objectId(n);
    w.assets.set(id, { id, user_id: user, state, bucket: BUCKET, path, object_id: ["ready", "expired"].includes(state) ? oid : null, bytes, created_at: w.now - ageDays * DAY });
    if (object) w.objects.set(path, { id: oid, createdAt: w.now - ageDays * DAY });
    return { id, path, user, oid };
  };
  w.deletion = (a, { state, attempts = 0, ageMs = 0, token } = {}) => {
    const t = token ?? w.newToken();
    w.deletions.set(a.id, { asset_id: a.id, user_id: a.user, bucket: BUCKET, path: a.path, state, fencing_token: t, attempts, updated_at: w.now - ageMs });
    return t;
  };

  const fns = {
    aif_asset_expire({ p_asset, p_user, p_token = null }) {
      const a = w.assets.get(p_asset);
      if (!a || a.user_id !== p_user) return "skip";
      if (!["ready", "expired"].includes(a.state)) return "skip";
      const d = w.deletions.get(p_asset);
      let ds = null;
      if (d) {
        if (["deleting", "delete_unknown", "deleted"].includes(d.state)) return "locked";
        ds = d.state;
        if (d.state === "claimed" && (p_token == null || d.fencing_token !== p_token)) {
          if (p_token != null || d.updated_at >= w.now - HOUR) return "busy";
          d.state = "cancelled"; d.updated_at = w.now; ds = "cancelled";
        } else if (["cancelled", "delete_failed"].includes(d.state)) d.updated_at = w.now;
      }
      const prof = w.profiles.get(p_user);
      if (!prof || prof.exempt == null) return "unknown";
      let due;
      if (prof.exempt || prof.days == null) due = false;
      else {
        if (prof.days < 1) return "unknown";
        const o = w.objects.get(a.path);
        if (!o || o.id !== a.object_id || o.createdAt == null) return "unknown";
        due = o.createdAt < w.now - prof.days * DAY;
      }
      if (due) {
        if (a.state === "ready") a.state = "expired";
        if (!d) w.deletions.set(p_asset, { asset_id: p_asset, user_id: p_user, bucket: a.bucket, path: a.path, state: "cancelled", fencing_token: w.newToken(), attempts: 0, updated_at: w.now });
        return "expired";
      }
      if (a.state === "expired") {
        a.state = "ready";
        if (d && ds === "claimed") { d.state = "cancelled"; d.updated_at = w.now; }
        return "restored";
      }
      return "not_due";
    },
    aif_asset_claim_delete({ p_asset, p_user, p_bucket, p_path }) {
      const a = w.assets.get(p_asset);
      if (p_bucket !== BUCKET) throw new Error("ACCESS_DENIED");
      if (a) {
        if (a.user_id !== p_user || a.path !== p_path) throw new Error("ACCESS_DENIED");
        if (["reserved", "ready", "unknown"].includes(a.state)) throw new Error("ASSET_IN_USE");
      }
      const d = w.deletions.get(p_asset);
      const token = w.newToken();
      if (d) {
        if (!["cancelled", "delete_failed"].includes(d.state)) throw new Error("DELETION_BUSY");
        d.state = "claimed"; d.fencing_token = token; d.updated_at = w.now;
      } else w.deletions.set(p_asset, { asset_id: p_asset, user_id: p_user, bucket: p_bucket, path: p_path, state: "claimed", fencing_token: token, attempts: 0, updated_at: w.now });
      return token;
    },
    aif_asset_delete_mark({ p_asset, p_user, p_token, p_state }) {
      const d = w.deletions.get(p_asset);
      if (!d || d.user_id !== p_user || d.fencing_token !== p_token) return false;
      const ok = (d.state === "claimed" && ["deleting", "cancelled"].includes(p_state))
        || (d.state === "deleting" && ["deleted", "delete_failed", "delete_unknown"].includes(p_state))
        || (d.state === "delete_unknown" && p_state === "deleted");
      if (!ok) return false;
      if (p_state === "deleting") d.attempts++;
      d.state = p_state; d.updated_at = w.now;
      return true;
    },
    aif_asset_delete_verify({ p_asset, p_user, p_token }) {
      const d = w.deletions.get(p_asset);
      if (!d || d.user_id !== p_user || d.fencing_token !== p_token) return "denied";
      if (d.state === "deleted") return "deleted";
      if (!["deleting", "delete_unknown"].includes(d.state)) return "denied";
      const o = w.objects.get(d.path);
      if (!o) { d.state = "deleted"; d.updated_at = w.now; return "deleted"; }
      const a = w.assets.get(p_asset);
      d.state = "delete_unknown"; d.updated_at = w.now;
      return a && o.id === a.object_id ? "unknown" : "mismatch";
    },
    member_storage_measure({ uid }) { w.measured.push(uid); return null; },
  };

  w.fns = fns;
  const byUpdated = (states) => [...w.deletions.values()].filter((d) => states.includes(d.state)).sort((x, y) => x.updated_at - y.updated_at);
  const list = (name, rows) => async (limit) => {
    w.lists.push([name, limit]);
    if (w.listFail[name] === "error") return { data: null, error: { message: "boom" } };
    if (w.listFail[name] === "throw") throw new Error("boom");
    if (w.listFail[name] === "shape") return { data: { rows: [] }, error: null };
    return { data: rows().slice(0, limit).map((r) => ({ ...r })), error: null };
  };
  w.deps = {
    loadExemptIds: async () => {
      w.exemptLoads++;
      if (w.exemptFails) throw new Error("자동 삭제 예외 회원 목록을 읽지 못했습니다.");
      return new Set([...w.profiles].filter(([, p]) => p.exempt === true).map(([u]) => u));
    },
    listVerifyPending: list("C", () => byUpdated(["deleting", "delete_unknown"])),
    listDeletePending: list("B", () => byUpdated(["cancelled", "delete_failed", "claimed"])),
    listReady: list("A", () => [...w.assets.values()]
      .filter((a) => a.state === "ready" && (w.readyIncludesProtected || w.profiles.get(a.user_id)?.exempt === false))
      .sort((x, y) => x.created_at - y.created_at)),
    rpc: async (fn, args) => {
      w.calls.push([fn, { ...args }]);
      w.clock += w.tick;
      const o = w.hook ? w.hook(fn, args, w) : undefined;
      if (o !== undefined) { if (o instanceof Error) throw o; return o; }
      try { return { data: fns[fn](args), error: null }; } catch (e) { return { data: null, error: { message: e.message } }; }
    },
    remove: async (paths) => {
      w.removes.push([...paths]);
      const mode = typeof w.removeMode === "function" ? w.removeMode(paths) : w.removeMode;
      if (mode && typeof mode.then === "function") return mode;   // 응답이 오지 않거나 늦게 오는 저장소
      if (mode === "ok") { for (const p of paths) w.objects.delete(p); return { data: paths.map((name) => ({ name })), error: null }; }
      if (mode === "error-deleted") { for (const p of paths) w.objects.delete(p); return { data: null, error: { message: "timeout", status: 504 } }; }
      if (mode === "error-kept") return { data: null, error: { message: "bad request", status: 400 } };
      if (mode === "ok-kept") return { data: [], error: null };                       // 성공 응답인데 지워지지 않음(늦은 처리)
      if (mode === "replaced") { for (const p of paths) w.objects.set(p, { id: objectId(0xabcdef), createdAt: w.now }); return { data: [], error: null }; }
      if (mode === "throw") throw new Error("socket hang up");
      throw new Error("모르는 removeMode");
    },
    now: () => w.clock,
  };
  w.fnNames = () => w.calls.map(([fn]) => fn);
  w.count = (fn) => w.calls.filter(([f]) => f === fn).length;
  return w;
}
const run = (w) => runRetentionCleanup(w.deps);

// ───────────── A) 정리 실행자 ─────────────
test("기간 지난 일반 회원 원본: 만료 → 예약 → 같은 토큰 재확인 → deleting → remove 1회 → 확인 deleted → 측정", async () => {
  const w = world().profile(U1);
  const a = w.asset(1, U1, { ageDays: 31 });
  const r = await run(w);
  assert.equal(r.ok, true);
  assert.deepEqual(w.fnNames(), [
    "aif_asset_expire", "aif_asset_claim_delete", "aif_asset_expire", "aif_asset_delete_mark", "aif_asset_delete_verify", "member_storage_measure",
  ]);
  const [, claim, recheck, mark, verify] = w.calls;
  assert.deepEqual(claim[1], { p_asset: a.id, p_user: U1, p_bucket: BUCKET, p_path: a.path });
  const token = w.deletions.get(a.id).fencing_token;
  assert.equal(recheck[1].p_token, token, "재확인은 방금 받은 토큰으로");
  assert.deepEqual(mark[1], { p_asset: a.id, p_user: U1, p_token: token, p_state: "deleting" });
  assert.equal(verify[1].p_token, token);
  assert.deepEqual(w.removes, [[a.path]], "remove는 그 경로 하나로 정확히 1회");
  assert.equal(w.assets.get(a.id).state, "expired", "자산 행은 expired로 남는다");
  assert.equal(w.deletions.get(a.id).state, "deleted");
  assert.deepEqual(w.measured, [U1]);
  assert.equal(r.counts.deleted, 1);
  assert.equal(r.counts.removeCalls, 1);
});

test("기간이 지나지 않은 원본·정확히 경계인 원본은 건드리지 않는다(코드에 30이 없다 — 정책 값만 따른다)", async () => {
  const w = world().profile(U1, { days: 30 }).profile(U2, { days: 7 });
  const young = w.asset(1, U1, { ageDays: 29 });
  const edge = w.asset(2, U1, { ageDays: 30 });       // 정확히 30일 = 아직 지나지 않음
  const seven = w.asset(3, U2, { ageDays: 8 });       // 정책이 7일인 회원은 8일째에 대상
  const r = await run(w);
  assert.equal(w.assets.get(young.id).state, "ready");
  assert.equal(w.assets.get(edge.id).state, "ready");
  assert.equal(w.deletions.get(seven.id).state, "deleted");
  assert.deepEqual(w.removes, [[seven.path]]);
  assert.equal(r.counts.notDue, 2);
});

test("보호 회원 목록을 읽지 못하면 회차 전체를 시작하지 않는다(목록·판정·삭제 0)", async () => {
  const w = world({ exemptFails: true }).profile(U1);
  w.asset(1, U1);
  const r = await run(w);
  assert.deepEqual({ ok: r.ok, aborted: r.aborted, code: r.code }, { ok: false, aborted: true, code: "EXEMPT_UNAVAILABLE" });
  assert.equal(w.lists.length, 0);
  assert.equal(w.calls.length, 0);
  assert.equal(w.removes.length, 0);
  // 목록 함수가 Set이 아닌 것을 돌려줘도 같다
  const w2 = world().profile(U1); w2.asset(1, U1);
  w2.deps.loadExemptIds = async () => [U1];
  assert.equal((await run(w2)).aborted, true);
  assert.equal(w2.removes.length, 0);
});

test("보호 회원(연장·무기한·관리자 지정)의 원본은 대상이 아니다", async () => {
  const w = world({ readyIncludesProtected: true }).profile(U1, { exempt: true }).profile(U2, { exempt: false, days: null });
  const prot = w.asset(1, U1, { ageDays: 400 });     // 조회 조건이 빠져 목록에 섞여 들어온 보호 회원
  const unlimited = w.asset(2, U2, { ageDays: 400 }); // 보호 표시는 없지만 정책이 무기한
  const r = await run(w);
  assert.equal(w.assets.get(prot.id).state, "ready");
  assert.equal(w.assets.get(unlimited.id).state, "ready");
  assert.equal(w.removes.length, 0);
  assert.equal(r.counts.protectedSkipped, 1, "보호 목록에 있는 회원은 DB 함수도 부르지 않는다");
  assert.equal(w.calls.filter(([, x]) => x.p_user === U1).length, 0);
  assert.equal(r.counts.notDue, 1);
});

test("이미 expired인 자산의 회원이 보호 대상이 되면 ready로 복원하고 지우지 않는다(묶음 B)", async () => {
  const w = world().profile(U1);
  const a = w.asset(1, U1, { state: "expired" });
  w.deletion(a, { state: "cancelled" });
  w.profiles.get(U1).exempt = true;   // 그사이 구독
  const r = await run(w);
  assert.equal(w.assets.get(a.id).state, "ready");
  assert.equal(w.removes.length, 0);
  assert.equal(w.count("aif_asset_claim_delete"), 0);
  assert.equal(r.counts.restored, 1);
});

test("삭제 직전 등급 변경: 예약 뒤 재확인에서 복원되면 예약은 cancelled, remove 0", async () => {
  const w = world().profile(U1);
  const a = w.asset(1, U1);
  w.hook = (fn, args, ww) => { if (fn === "aif_asset_expire" && args.p_token) ww.profiles.get(U1).exempt = true; };
  const r = await run(w);
  assert.equal(w.assets.get(a.id).state, "ready");
  assert.equal(w.deletions.get(a.id).state, "cancelled");
  assert.equal(w.removes.length, 0);
  assert.equal(w.count("aif_asset_delete_mark"), 0, "복원은 DB 함수가 같은 거래에서 취소했다");
  assert.equal(r.counts.restored, 1);
});

test("재확인이 expired가 아니면(판정 불가·호출 오류·모르는 값) 삭제하지 않고 우리 토큰으로 cancelled를 시도한다", async () => {
  for (const reply of [{ data: "unknown", error: null }, { data: null, error: { message: "x" } }, new Error("timeout"), { data: "EXPIRED", error: null }, { data: true, error: null }]) {
    const w = world().profile(U1);
    const a = w.asset(1, U1);
    w.hook = (fn, args) => (fn === "aif_asset_expire" && args.p_token ? reply : undefined);
    const r = await run(w);
    assert.equal(w.removes.length, 0);
    assert.equal(w.deletions.get(a.id).state, "cancelled", "예약됨 → 실패 전이는 없다. 취소는 cancelled");
    assert.equal(w.count("aif_asset_delete_verify"), 0);
    assert.equal(r.counts.undetermined, 1);
  }
});

test("deleting 커밋이 정확히 true가 아니면 remove 0(토큰 교체·오류·응답 모양 이상)", async () => {
  for (const reply of [{ data: false, error: null }, { data: "true", error: null }, { data: 1, error: null }, { data: null, error: { message: "x" } }, { data: true, error: { message: "x" } }, new Error("boom")]) {
    const w = world().profile(U1);
    w.asset(1, U1);
    w.hook = (fn, args) => (fn === "aif_asset_delete_mark" && args.p_state === "deleting" ? reply : undefined);
    const r = await run(w);
    assert.equal(w.removes.length, 0);
    assert.equal(w.count("aif_asset_delete_verify"), 0);
    assert.equal(r.counts.markFailed, 1);
  }
  // 다른 실행이 그사이 예약을 취소하고 새 토큰으로 다시 잡은 경우(CAS 실패) — 우리 토큰은 더 통하지 않는다
  const w = world().profile(U1);
  const a = w.asset(1, U1);
  w.hook = (fn, args, ww) => {
    if (fn === "aif_asset_delete_mark" && args.p_state === "deleting") { const d = ww.deletions.get(a.id); d.fencing_token = ww.newToken(); }
  };
  await run(w);
  assert.equal(w.removes.length, 0);
  assert.equal(w.deletions.get(a.id).state, "claimed", "남의 행 상태를 바꾸지 않는다");
});

test("예약 실패(사용 중·다른 실행이 쥠·오류·UUID 아님)면 삭제 0", async () => {
  for (const reply of [{ data: null, error: { message: "DELETION_BUSY" } }, { data: "not-a-uuid", error: null }, { data: null, error: null }, new Error("boom")]) {
    const w = world().profile(U1);
    w.asset(1, U1);
    w.hook = (fn) => (fn === "aif_asset_claim_delete" ? reply : undefined);
    const r = await run(w);
    assert.equal(w.removes.length, 0);
    assert.equal(w.count("aif_asset_delete_mark"), 0);
    assert.equal(r.counts.claimFailed, 1);
  }
});

test("오래 멈춘 claimed: 1시간이 안 됐으면 busy, 넘었으면 취소 뒤 새 토큰으로 진행하고 옛 토큰은 통하지 않는다", async () => {
  const fresh = world().profile(U1);
  const a1 = fresh.asset(1, U1, { state: "expired" });
  const t1 = fresh.deletion(a1, { state: "claimed", ageMs: HOUR - 1000 });
  const r1 = await run(fresh);
  assert.equal(fresh.removes.length, 0);
  assert.equal(fresh.deletions.get(a1.id).state, "claimed");
  assert.equal(fresh.deletions.get(a1.id).fencing_token, t1);
  assert.equal(r1.counts.busy, 1);

  const stale = world().profile(U1);
  const a2 = stale.asset(1, U1, { state: "expired" });
  const old = stale.deletion(a2, { state: "claimed", ageMs: HOUR + 1000 });
  let oldWorkerEntered = null;
  stale.hook = (fn, args, ww) => {
    // 새 실행이 remove를 보내기 직전(deleting 커밋 시점)에 옛 실행이 깨어나 옛 토큰으로 deleting에 들어가려 한다
    if (fn === "aif_asset_delete_mark" && args.p_state === "deleting" && oldWorkerEntered === null) {
      oldWorkerEntered = ww.fns.aif_asset_delete_mark({ p_asset: a2.id, p_user: U1, p_token: old, p_state: "deleting" });
    }
  };
  const r2 = await run(stale);
  assert.equal(oldWorkerEntered, false, "취소 뒤에는 새 토큰이라 옛 토큰으로 deleting에 들어갈 수 없다(옛 실행은 remove 0)");
  assert.equal(stale.deletions.get(a2.id).attempts, 1, "deleting 진입은 새 실행의 한 번뿐");
  assert.notEqual(stale.deletions.get(a2.id).fencing_token, old);
  assert.deepEqual(stale.removes, [[a2.path]]);
  assert.equal(stale.deletions.get(a2.id).state, "deleted");
  assert.equal(r2.counts.deleted, 1);
});

test("지연 DELETE: remove가 오류·성공 무엇을 답하든 객체가 남아 있으면 delete_unknown — 재삭제 0, 복원 0, 다음 회차는 확인만", async () => {
  for (const mode of ["error-kept", "ok-kept", "throw"]) {
    const w = world({ removeMode: mode === "throw" ? (() => "throw") : mode }).profile(U1);
    const a = w.asset(1, U1);
    const r1 = await run(w);
    assert.equal(w.removes.length, 1);
    assert.equal(w.deletions.get(a.id).state, "delete_unknown", mode);
    assert.equal(w.assets.get(a.id).state, "expired", "ready로 되돌리지 않는다(용량 계산에 계속 남는다)");
    assert.equal(r1.counts.deleteUnknown, 1);
    assert.equal(w.measured.length, 0);

    // 다음 회차: 회원이 보호 대상이 됐어도 복원하지 않고, 다시 지우지도 않는다
    w.profiles.get(U1).exempt = true;
    w.now += DAY; w.calls.length = 0;
    const r2 = await run(w);
    assert.equal(w.removes.length, 1, "자동 재삭제 0");
    assert.deepEqual(w.fnNames(), ["aif_asset_delete_verify"], "확인만");
    assert.equal(w.assets.get(a.id).state, "expired");
    assert.equal(w.deletions.get(a.id).state, "delete_unknown");
    assert.equal(r2.counts.deleteUnknown, 1);

    // 늦게 처리돼 객체가 사라진 뒤의 회차: 그때 deleted
    w.objects.delete(a.path);
    w.now += 30 * DAY; w.calls.length = 0;
    const r3 = await run(w);
    assert.equal(w.removes.length, 1);
    assert.equal(w.deletions.get(a.id).state, "deleted");
    assert.equal(r3.counts.deleted, 1);
    assert.deepEqual(w.measured, [U1]);
  }
});

test("remove가 오류를 답했어도 실제로 지워졌으면 deleted(응답으로 판정하지 않는다)", async () => {
  const w = world({ removeMode: "error-deleted" }).profile(U1);
  const a = w.asset(1, U1);
  const r = await run(w);
  assert.equal(w.deletions.get(a.id).state, "deleted");
  assert.equal(r.counts.deleted, 1);
});

test("같은 경로에 다른 객체가 있으면 mismatch — delete_unknown 유지, 재삭제 0", async () => {
  const w = world({ removeMode: "replaced" }).profile(U1);
  const a = w.asset(1, U1);
  const r1 = await run(w);
  assert.equal(w.deletions.get(a.id).state, "delete_unknown");
  assert.equal(r1.counts.mismatch, 1);
  w.now += DAY;
  const r2 = await run(w);
  assert.equal(w.removes.length, 1);
  assert.equal(r2.counts.mismatch, 1);
  assert.equal(w.deletions.get(a.id).state, "delete_unknown");
});

test("삭제 확인 호출이 실패하면 delete_unknown 표시를 한 번 시도하고, 다음 회차에 확인으로 이어 간다", async () => {
  const w = world().profile(U1);
  const a = w.asset(1, U1);
  let failVerify = true;
  w.hook = (fn) => (fn === "aif_asset_delete_verify" && failVerify ? new Error("timeout") : undefined);
  const r1 = await run(w);
  assert.equal(w.removes.length, 1);
  assert.equal(w.deletions.get(a.id).state, "delete_unknown");
  assert.equal(r1.counts.deleteUnknown, 1);
  assert.equal(r1.counts.deleted, 0, "확인되지 않은 삭제를 deleted로 세지 않는다");
  failVerify = false; w.now += DAY;
  const r2 = await run(w);
  assert.equal(w.removes.length, 1);
  assert.equal(w.deletions.get(a.id).state, "deleted", "객체는 실제로 지워져 있었다");
  assert.equal(r2.counts.deleted, 1);
});

test("확인이 denied(우리 것이 아님)면 아무것도 바꾸지 않고 멈춘다", async () => {
  const w = world().profile(U1);
  const a = w.asset(1, U1);
  w.hook = (fn, args, ww) => {
    if (fn === "aif_asset_delete_verify") ww.deletions.get(a.id).fencing_token = ww.newToken();   // 다른 실행이 가져감
  };
  const r = await run(w);
  assert.equal(r.counts.denied, 1);
  assert.equal(w.deletions.get(a.id).state, "deleting", "남의 행 상태를 바꾸지 않는다");
  assert.equal(w.count("aif_asset_delete_mark"), 1, "deleting 진입 한 번뿐, 뒤처리 표시 시도 없음");
});

test("측정 갱신이 실패해도 삭제 결과는 그대로이고 회차는 끝까지 간다", async () => {
  const w = world().profile(U1).profile(U2);
  const a = w.asset(1, U1); const b = w.asset(2, U2);
  w.hook = (fn, args) => (fn === "member_storage_measure" ? (args.uid === U1 ? { data: null, error: { message: "x" } } : new Error("boom")) : undefined);
  const r = await run(w);
  assert.equal(r.ok, true);
  assert.equal(r.counts.deleted, 2);
  assert.equal(r.counts.measureFailed, 2);
  assert.equal(w.deletions.get(a.id).state, "deleted");
  assert.equal(w.deletions.get(b.id).state, "deleted");
});

test("객체가 없거나 다른 객체·생성 시각 없음·이상한 정책 값·프로필 없음이면 만료시키지 않는다", async () => {
  const w = world().profile(U1).profile(U2, { days: 0 });
  const noObject = w.asset(1, U1, { object: false });
  const other = w.asset(2, U1); w.objects.get(other.path).id = objectId(0xbeef);
  const noTime = w.asset(3, U1); w.objects.get(noTime.path).createdAt = null;
  const badDays = w.asset(4, U2);
  const noProfile = w.asset(5, userId(9));
  w.readyIncludesProtected = true;   // 프로필 없는 회원 행도 목록에 넣어 본다
  const r = await run(w);
  for (const a of [noObject, other, noTime, badDays, noProfile]) assert.equal(w.assets.get(a.id).state, "ready");
  assert.equal(w.removes.length, 0);
  assert.equal(w.deletions.size, 0);
  assert.equal(r.counts.undetermined, 5);
});

test("확정이 늦어도(finalize 지연) 기산은 객체 생성 시각이다 — 자산 행이 방금 만들어졌어도 객체가 오래됐으면 대상", async () => {
  const w = world().profile(U1);
  const a = w.asset(1, U1, { ageDays: 45 });
  w.assets.get(a.id).created_at = w.now;   // 행의 시각은 판정에 쓰이지 않는다
  await run(w);
  assert.equal(w.deletions.get(a.id).state, "deleted");
});

test("잘못된 행(다른 회원 경로·다른 버킷·비표준 id·ready 아님·예약 모양 이상)은 DB 함수도 부르지 않는다", async () => {
  const w = world().profile(U1);
  const good = w.asset(1, U1, { ageDays: 1 });
  const rows = [
    { id: assetId(2), user_id: U1, state: "ready", bucket: BUCKET, path: `${U2}/generated/${assetId(2)}.png` },                 // 경로의 회원이 다름
    { id: assetId(3), user_id: U1, state: "ready", bucket: "other", path: `${U1}/generated/${assetId(3)}.png` },                 // 다른 버킷
    { id: assetId(4).toUpperCase(), user_id: U1, state: "ready", bucket: BUCKET, path: `${U1}/generated/${assetId(4)}.png` },   // 대문자 id
    { id: assetId(5), user_id: U1, state: "ready", bucket: BUCKET, path: `${U1}/generated/${assetId(6)}.png` },                 // 경로의 자산 id가 다름
    { id: assetId(7), user_id: U1, state: "unknown", bucket: BUCKET, path: `${U1}/generated/${assetId(7)}.png` },               // 업로드 불명은 후보가 아니다
    { id: assetId(8), user_id: U1, state: "reserved", bucket: BUCKET, path: `${U1}/generated/${assetId(8)}.png` },
    { id: assetId(9), user_id: U1, state: "ready", bucket: BUCKET, path: `${U1}/generated/../${assetId(9)}.png` },
    null, "x", [],
  ];
  w.deps.listReady = async () => ({ data: [...rows, { id: good.id, user_id: U1, state: "ready", bucket: BUCKET, path: good.path }], error: null });
  w.deps.listDeletePending = async () => ({ data: [
    { asset_id: assetId(20), user_id: U1, bucket: BUCKET, path: `${U1}/generated/${assetId(20)}.png`, state: "deleted", fencing_token: w.newToken(), attempts: 0 },   // 묶음에 맞지 않는 상태
    { asset_id: assetId(21), user_id: U1, bucket: BUCKET, path: `${U1}/generated/${assetId(21)}.png`, state: "cancelled", fencing_token: "nope", attempts: 0 },
    { asset_id: assetId(22), user_id: U1, bucket: BUCKET, path: `${U1}/generated/${assetId(22)}.png`, state: "cancelled", fencing_token: w.newToken(), attempts: -1 },
  ], error: null });
  const r = await run(w);
  assert.equal(r.counts.invalidRows, rows.length + 3);
  assert.deepEqual(w.calls.map(([, x]) => x.p_asset), [good.id], "정상 행 하나만 판정");
  assert.equal(w.removes.length, 0);
});

test(`삭제 진입이 ${CLEANUP_MAX_ATTEMPTS}회에 이른 예약은 더 시도하지 않는다`, async () => {
  const w = world().profile(U1);
  const a = w.asset(1, U1, { state: "expired" });
  w.deletion(a, { state: "delete_failed", attempts: CLEANUP_MAX_ATTEMPTS });
  const b = w.asset(2, U1, { state: "expired" });
  w.deletion(b, { state: "delete_failed", attempts: CLEANUP_MAX_ATTEMPTS - 1 });
  const r = await run(w);
  assert.equal(r.counts.gaveUp, 1);
  assert.deepEqual(w.removes, [[b.path]]);
  assert.equal(w.deletions.get(a.id).state, "delete_failed");
});

test(`한 회차는 최대 ${CLEANUP_MAX_ITEMS}건, 세 묶음에 공정하게 나눈다`, async () => {
  assert.deepEqual(allot([200, 200, 200], 100), [34, 33, 33]);
  assert.deepEqual(allot([5, 200, 200], 100), [5, 48, 47]);
  assert.deepEqual(allot([0, 0, 300], 100), [0, 0, 100]);
  assert.deepEqual(allot([1, 2, 3], 100), [1, 2, 3]);
  assert.deepEqual(allot([10, 10, 10], 0), [0, 0, 0]);

  const w = world().profile(U1);
  for (let i = 1; i <= 150; i++) w.asset(i, U1);                                             // 신규 150
  for (let i = 201; i <= 350; i++) { const a = w.asset(i, U1, { state: "expired" }); w.deletion(a, { state: "delete_unknown", ageMs: i }); }   // 확인 대기 150
  const r = await run(w);
  assert.equal(r.counts.examined, CLEANUP_MAX_ITEMS);
  assert.equal(r.counts.deleteUnknown, 50, "확인 묶음 50");
  assert.equal(r.counts.deleted, 50, "신규 묶음 50");
  assert.equal(w.removes.length, 50);
  assert.deepEqual(w.lists, [["C", 100], ["B", 100], ["A", 100]]);
  // 다음 회차: 확인한 행은 updated_at이 갱신돼 뒤로 가므로 아직 못 본 행부터 본다
  const seen = new Set(w.calls.filter(([fn]) => fn === "aif_asset_delete_verify").map(([, x]) => x.p_asset));
  w.calls.length = 0; w.now += 1000;
  await run(w);
  const second = w.calls.filter(([fn, x]) => fn === "aif_asset_delete_verify" && w.deletions.get(x.p_asset)?.state === "delete_unknown").map(([, x]) => x.p_asset);
  assert.ok(second.length > 0 && second.every((id) => !seen.has(id)), "순환 조회");
});

test("시간 예산을 넘기면 새 항목을 시작하지 않는다(진행 중이던 삭제는 끝까지)", async () => {
  const w = world({ tick: 50_000 }).profile(U1);   // 호출 5번 = 250초: 항목 진입 한도(240초)는 넘고 회차 마감(280초)은 넘지 않는다
  for (let i = 1; i <= 5; i++) w.asset(i, U1);
  const r = await run(w);
  assert.equal(r.stoppedEarly, true);
  assert.equal(r.stopCode, "TIME_BUDGET");
  assert.equal(r.counts.timeouts, 0);
  assert.deepEqual(w.measured, [U1], "마감 전이라 측정까지 마친다");
  assert.equal(r.counts.examined, 1);
  assert.equal(r.counts.deleted, 1, "시작한 한 건은 확인까지 마친다");
  assert.equal([...w.assets.values()].filter((a) => a.state === "ready").length, 4);
});

test("한 묶음의 목록을 읽지 못해도 나머지 묶음은 진행한다", async () => {
  for (const kind of ["error", "throw", "shape"]) {
    const w = world({ listFail: { B: kind } }).profile(U1);
    const a = w.asset(1, U1);
    const r = await run(w);
    assert.equal(r.counts.listFailed, 1);
    assert.equal(w.deletions.get(a.id).state, "deleted");
  }
});

test("결과에는 건수와 코드만 있다 — 경로·회원 id·토큰·오류 원문 0", async () => {
  const w = world({ removeMode: "error-kept" }).profile(U1).profile(U2);
  const a = w.asset(1, U1); w.asset(2, U2, { ageDays: 1 });
  const r = await run(w);
  const text = JSON.stringify(r);
  for (const secret of [U1, U2, a.id, a.path, a.oid, w.deletions.get(a.id).fencing_token, "bad request", "generated"]) assert.ok(!text.includes(secret), secret);
  for (const v of Object.values(r.counts)) assert.equal(typeof v, "number");
});

// ───────────── A-2) 유한 대기: 응답이 오지 않거나 늦게 오는 입출력 ─────────────
// 실제 시계와 짧은 한도(호출당 30ms)를 쓴다. 「오지 않는 응답」은 끝나지 않는 약속, 「늦은 응답」은 한도 뒤에 끝나는 약속으로 흉내 낸다.
const IO = 30;
const LATE = 90;
const never = () => new Promise(() => {});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** 실제 시계 + 짧은 한도로 돌린다 */
function timed(w, limits = {}) {
  w.deps.now = Date.now;
  w.deps.limits = { ioTimeoutMs: IO, roundDeadlineMs: 5000, ...limits };
  return runRetentionCleanup(w.deps);
}
/** 한도 뒤에 실제로 실행되고 응답하는 DB 호출(= 우리가 기다리기를 그만둔 뒤에 커밋되는 경우) */
const lateCommit = (fn) => (f, args, ww) => (f === fn ? new Promise((res) => setTimeout(() => res({ data: ww.fns[f](args), error: null }), LATE)) : undefined);

test("기본 한도: 호출당 상한 < 항목 진입 한도 < 회차 마감 < 라우트 한도 300초", () => {
  assert.ok(CLEANUP_IO_TIMEOUT_MS > 0 && CLEANUP_IO_TIMEOUT_MS < CLEANUP_TIME_BUDGET_MS);
  assert.ok(CLEANUP_TIME_BUDGET_MS < CLEANUP_ROUND_DEADLINE_MS && CLEANUP_ROUND_DEADLINE_MS < 300_000);
});

test("보호 회원 목록 응답이 오지 않으면 유한 시간 안에 회차를 중단한다(목록·판정·삭제 0)", async () => {
  const w = world().profile(U1); w.asset(1, U1);
  w.deps.loadExemptIds = never;
  const t0 = Date.now();
  const r = await timed(w);
  assert.ok(Date.now() - t0 < 1000, "끝없이 기다리지 않는다");
  assert.deepEqual({ ok: r.ok, aborted: r.aborted, code: r.code }, { ok: false, aborted: true, code: "EXEMPT_UNAVAILABLE" });
  assert.equal(r.counts.timeouts, 1);
  assert.equal(w.lists.length + w.calls.length + w.removes.length, 0);
});

test("목록 조회 응답이 오지 않으면 그 뒤로 아무것도 시작하지 않는다", async () => {
  const w = world().profile(U1); const a = w.asset(1, U1);
  w.deps.listVerifyPending = never;
  const r = await timed(w);
  assert.equal(r.ok, true);
  assert.deepEqual([r.stoppedEarly, r.stopCode], [true, "IO_TIMEOUT"]);
  assert.equal(r.counts.timeouts, 1);
  assert.equal(r.counts.examined, 0);
  assert.equal(w.calls.length + w.removes.length, 0);
  assert.equal(w.lists.length, 0, "나머지 목록 조회도 시작하지 않는다");
  assert.equal(r.counts.listFailed, 3, "읽지 못한 묶음 3개");
  assert.equal(w.assets.get(a.id).state, "ready");
});

test("만료 판정 응답이 오지 않으면 그 자산과 뒤 항목 모두 멈춘다(remove 0, 뒤 항목 호출 0)", async () => {
  const w = world().profile(U1); const a = w.asset(1, U1); const b = w.asset(2, U1);
  w.hook = (fn) => (fn === "aif_asset_expire" ? never() : undefined);
  const r = await timed(w);
  assert.deepEqual([r.stopCode, r.counts.timeouts, r.counts.examined], ["IO_TIMEOUT", 1, 1]);
  assert.equal(w.calls.length, 1);
  assert.equal(w.removes.length, 0);
  assert.equal(r.counts.undetermined, 0, "응답 없음을 「판정 불가 응답」으로 세지 않는다");
  assert.equal(w.assets.get(a.id).state, "ready");
  assert.equal(w.assets.get(b.id).state, "ready");
});

test("예약(claim) 응답이 늦으면: 더 진행하지 않는다 — 나중에 커밋돼 claimed로 남아도 remove 0, 다음 회차는 busy", async () => {
  const w = world().profile(U1); const a = w.asset(1, U1); w.asset(2, U1);
  w.hook = lateCommit("aif_asset_claim_delete");
  const r = await timed(w);
  assert.deepEqual([r.stopCode, r.counts.timeouts, r.counts.claimFailed], ["IO_TIMEOUT", 1, 0]);
  assert.deepEqual(w.fnNames(), ["aif_asset_expire", "aif_asset_claim_delete"]);
  assert.equal(w.removes.length, 0);
  const callsAtReturn = w.calls.length;
  await wait(LATE + 60);
  assert.equal(w.deletions.get(a.id).state, "claimed", "DB는 나중에 커밋됐다");
  assert.equal(w.calls.length, callsAtReturn, "늦은 응답이 와도 추가 작업 0");
  assert.equal(w.removes.length, 0);
  // 다음 회차(정상 속도): 방금 잡힌 예약이라 busy — 삭제하지 않는다
  w.hook = null; w.calls.length = 0;
  const r2 = await timed(w);
  assert.equal(w.deletions.get(a.id).state, "claimed");
  assert.ok(r2.counts.busy >= 1);
  assert.ok(!w.removes.some((p) => p[0] === a.path));
});

test("삭제 직전 재확인 응답이 오지 않으면: remove 0, 취소 시도도 0(현재 상태 보존)", async () => {
  const w = world().profile(U1); const a = w.asset(1, U1);
  w.hook = (fn, args) => (fn === "aif_asset_expire" && args.p_token ? never() : undefined);
  const r = await timed(w);
  assert.deepEqual([r.stopCode, r.counts.timeouts], ["IO_TIMEOUT", 1]);
  assert.equal(w.removes.length, 0);
  assert.equal(w.count("aif_asset_delete_mark"), 0);
  assert.equal(r.counts.undetermined, 0, "응답 없음을 판정 불가로 세지 않는다");
  assert.equal(w.deletions.get(a.id).state, "claimed");
  assert.equal(w.assets.get(a.id).state, "expired");
});

test("deleting 커밋 응답이 늦으면: remove 0 — 나중에 커밋돼 deleting으로 남고, 다음 회차는 확인만 한다(재삭제 0)", async () => {
  const w = world().profile(U1); const a = w.asset(1, U1); const b = w.asset(2, U1);
  w.hook = (fn, args, ww) => (fn === "aif_asset_delete_mark" && args.p_state === "deleting" ? lateCommit(fn)(fn, args, ww) : undefined);
  const r = await timed(w);
  assert.deepEqual([r.stopCode, r.counts.timeouts, r.counts.markFailed, r.counts.removeCalls], ["IO_TIMEOUT", 1, 0, 0]);
  assert.equal(w.removes.length, 0);
  assert.equal(w.count("aif_asset_delete_verify"), 0);
  assert.equal(w.assets.get(b.id).state, "ready", "뒤 항목은 시작하지 않았다");
  await wait(LATE + 60);
  assert.equal(w.deletions.get(a.id).state, "deleting", "DB는 나중에 커밋됐다");
  assert.equal(w.removes.length, 0, "늦은 성공 뒤에도 remove를 보내지 않는다");
  // 다음 회차: 확인만. 객체가 남아 있으므로 delete_unknown — 여기서도 remove는 그 자산에 0
  w.hook = null; w.calls.length = 0;
  await timed(w);
  assert.equal(w.deletions.get(a.id).state, "delete_unknown");
  assert.ok(!w.removes.some((p) => p[0] === a.path), "그 자산은 끝까지 remove 0");
  assert.equal(w.assets.get(a.id).state, "expired");
});

test("remove 응답이 오지 않으면: 성공·실패를 단정하지 않고 재삭제 0, 남은 시간으로 확인 한 번, 뒤 항목 중단", async () => {
  const w = world({ removeMode: () => never() }).profile(U1); const a = w.asset(1, U1); const b = w.asset(2, U1);
  const r = await timed(w);
  assert.deepEqual([r.stopCode, r.counts.timeouts, r.counts.removeCalls], ["IO_TIMEOUT", 1, 1]);
  assert.deepEqual(w.removes, [[a.path]], "remove는 한 번뿐");
  assert.equal(w.count("aif_asset_delete_verify"), 1, "확인 한 번");
  assert.equal(w.deletions.get(a.id).state, "delete_unknown", "객체가 남아 있다");
  assert.deepEqual([r.counts.deleted, r.counts.deleteUnknown], [0, 1]);
  assert.equal(w.assets.get(a.id).state, "expired");
  assert.equal(w.assets.get(b.id).state, "ready", "뒤 항목은 시작하지 않았다");
  assert.equal(w.measured.length, 0);
  // 다음 회차: 확인만(재삭제 0)
  w.removeMode = "ok"; w.calls.length = 0; w.removes.length = 0;
  await timed(w);
  assert.ok(!w.removes.some((p) => p[0] === a.path));
  assert.equal(w.deletions.get(a.id).state, "delete_unknown");
});

test("remove가 늦게 성공한 경우: 대기 초과 뒤의 확인은 그때 본 대로만 판정하고, 늦은 응답은 버린다", async () => {
  const w = world().profile(U1); const a = w.asset(1, U1);
  w.removeMode = (paths) => new Promise((res) => setTimeout(() => { for (const p of paths) w.objects.delete(p); res({ data: [], error: null }); }, LATE));
  const r = await timed(w);
  assert.equal(r.counts.deleted, 0, "확인 시점에는 객체가 남아 있었다 — 성공으로 단정하지 않는다");
  assert.equal(w.deletions.get(a.id).state, "delete_unknown");
  const callsAtReturn = w.calls.length;
  await wait(LATE + 60);
  assert.equal(w.calls.length, callsAtReturn, "늦은 성공 응답으로 추가 작업을 하지 않는다");
  assert.equal(w.deletions.get(a.id).state, "delete_unknown", "늦은 응답이 상태를 바꾸지 않는다");
  w.removeMode = "ok"; w.calls.length = 0;
  const r2 = await timed(w);   // 다음 회차의 확인에서 deleted
  assert.equal(r2.counts.deleted, 1);
  assert.deepEqual(w.removes, [[a.path]], "remove는 처음 한 번뿐");
});

test("remove 대기에서 회차 마감이 끝나면: 확인 요청도 새로 보내지 않고 다음 회차로 넘긴다", async () => {
  const w = world({ removeMode: () => never() }).profile(U1); const a = w.asset(1, U1);
  const t0d = Date.now();
  const r = await timed(w, { ioTimeoutMs: 200, roundDeadlineMs: 40 });   // remove를 기다리다 회차 마감에 닿는다
  assert.ok(Date.now() - t0d < 150, "호출당 상한(200ms)이 아니라 회차에 남은 시간(40ms)만 기다린다");
  assert.equal(r.stopCode, "IO_TIMEOUT");
  assert.equal(w.removes.length, 1);
  assert.equal(w.count("aif_asset_delete_verify"), 0, "남은 시간이 없으면 확인 새 요청 0");
  assert.equal(w.deletions.get(a.id).state, "deleting", "상태 보존");
  assert.equal(r.counts.deleteUnknown, 1);
  assert.equal(r.counts.deleted, 0);
  w.removeMode = "ok"; w.calls.length = 0;
  await timed(w);
  assert.deepEqual(w.fnNames(), ["aif_asset_delete_verify"], "다음 회차는 확인만");
  assert.equal(w.removes.length, 1);
  assert.equal(w.deletions.get(a.id).state, "delete_unknown");
});

test("삭제 확인 응답이 오지 않으면: 불명 표시 시도도 하지 않는다(deleting 보존) — 다음 회차가 확인한다", async () => {
  const w = world().profile(U1); const a = w.asset(1, U1); w.asset(2, U1);
  w.hook = (fn) => (fn === "aif_asset_delete_verify" ? never() : undefined);
  const r = await timed(w);
  assert.deepEqual([r.stopCode, r.counts.timeouts, r.counts.deleted, r.counts.deleteUnknown], ["IO_TIMEOUT", 1, 0, 1]);
  assert.deepEqual(w.calls.filter(([fn]) => fn === "aif_asset_delete_mark").map(([, x]) => x.p_state), ["deleting"], "delete_unknown 표시 시도 없음");
  assert.equal(w.deletions.get(a.id).state, "deleting");
  assert.equal(w.removes.length, 1);
  w.hook = null; w.calls.length = 0;
  const r2 = await timed(w);
  assert.equal(w.deletions.get(a.id).state, "deleted", "객체는 실제로 지워져 있었다");
  assert.equal(w.removes.filter((p) => p[0] === a.path).length, 1);
  assert.ok(r2.counts.deleted >= 1);
});

test("확인만 하는 묶음에서 응답이 오지 않으면: 상태 보존, 뒤 항목 중단, 새 삭제 0", async () => {
  const w = world().profile(U1);
  const a = w.asset(1, U1, { state: "expired" }); w.deletion(a, { state: "delete_unknown", ageMs: 10 });
  const b = w.asset(2, U1, { state: "expired" }); w.deletion(b, { state: "deleting", ageMs: 5 });
  w.hook = (fn) => (fn === "aif_asset_delete_verify" ? never() : undefined);
  const r = await timed(w);
  assert.deepEqual([r.stopCode, r.counts.timeouts, r.counts.examined], ["IO_TIMEOUT", 1, 1]);
  assert.equal(w.calls.length, 1);
  assert.equal(w.removes.length, 0);
  assert.equal(w.deletions.get(a.id).state, "delete_unknown");
  assert.equal(w.deletions.get(b.id).state, "deleting");
  assert.equal(r.counts.deleteUnknown, 0, "방금 삭제를 보낸 건이 아니면 불명 건수로 세지 않는다");
});

test("측정 응답이 오지 않아도 삭제 결과는 그대로이고 남은 측정은 시작하지 않는다", async () => {
  const w = world().profile(U1).profile(U2); const a = w.asset(1, U1); const b = w.asset(2, U2);
  w.hook = (fn) => (fn === "member_storage_measure" ? never() : undefined);
  const r = await timed(w);
  assert.equal(r.ok, true);
  assert.deepEqual([r.counts.deleted, r.counts.timeouts, r.counts.measureFailed, r.stopCode], [2, 1, 2, "IO_TIMEOUT"]);
  assert.equal(w.count("member_storage_measure"), 1, "두 번째 측정은 시작하지 않는다");
  assert.equal(w.deletions.get(a.id).state, "deleted");
  assert.equal(w.deletions.get(b.id).state, "deleted");
});

test("대기를 그만둔 뒤 늦게 거절되는 요청은 조용히 버려진다(처리되지 않은 거절 0, 결과는 한 번만)", async () => {
  let unhandled = 0;
  const onUnhandled = () => { unhandled++; };
  process.on("unhandledRejection", onUnhandled);
  try {
    const lateReject = () => new Promise((_, rej) => setTimeout(() => rej(new Error("late failure with secret-ish text")), LATE));
    for (const breakAt of ["exempt", "list", "rpc", "remove", "measure"]) {
      const w = world().profile(U1); w.asset(1, U1);
      if (breakAt === "exempt") w.deps.loadExemptIds = lateReject;
      if (breakAt === "list") w.deps.listReady = lateReject;
      if (breakAt === "rpc") w.hook = (fn) => (fn === "aif_asset_claim_delete" ? lateReject() : undefined);
      if (breakAt === "remove") w.removeMode = () => lateReject();
      if (breakAt === "measure") w.hook = (fn) => (fn === "member_storage_measure" ? lateReject() : undefined);
      const r = await timed(w);
      assert.equal(r.counts.timeouts, 1, breakAt);
      assert.ok(!JSON.stringify(r).includes("late failure"), "오류 원문 0");
    }
    await wait(LATE + 80);
    assert.equal(unhandled, 0);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});

test("한도 안에 오류로 끝나는 호출은 예전과 같다(대기 초과로 세지 않고 회차를 멈추지 않는다)", async () => {
  const w = world().profile(U1); const a = w.asset(1, U1); const b = w.asset(2, U1);
  w.hook = (fn, args) => (fn === "aif_asset_claim_delete" && args.p_asset === a.id ? new Error("boom") : undefined);
  const r = await timed(w);
  assert.deepEqual([r.stopCode, r.counts.timeouts, r.counts.claimFailed, r.counts.deleted], [null, 0, 1, 1]);
  assert.equal(w.deletions.get(b.id).state, "deleted", "뒤 항목은 계속 진행");
});

// ───────────── B) 요청 처리: 인증·모드 ─────────────
const SECRET = "s3cr3t-value-0123456789abcdef";
test("인증: Authorization: Bearer <비밀값> 한 가지만. 비밀값이 없거나 짧으면 모든 요청 거절", () => {
  assert.equal(bearerOk(SECRET, `Bearer ${SECRET}`), true);
  for (const h of [null, undefined, "", SECRET, `bearer ${SECRET}`, `Bearer ${SECRET} `, ` Bearer ${SECRET}`, `Bearer  ${SECRET}`, `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(0, -1)}`, `Basic ${SECRET}`, 123, {}]) {
    assert.equal(bearerOk(SECRET, h), false, String(h));
  }
  const short = "x".repeat(CLEANUP_SECRET_MIN_LENGTH - 1);
  for (const s of [undefined, null, "", " ", short, ` ${SECRET}`, `${SECRET}\n`, 12345678901234567890]) {
    assert.equal(bearerOk(s, `Bearer ${s}`), false, String(s));
  }
  assert.equal(bearerOk("undefined", "Bearer undefined"), false, "문자열 undefined도 짧아서 거절");
});

test("off: 인증 뒤 skipped만 — 의존성을 만들지도 부르지도 않는다. 인증 실패가 먼저다", async () => {
  let made = 0;
  const getDeps = () => { made++; throw new Error("만들어지면 안 됨"); };
  const ok = await handleCleanupRequest({ mode: "off", secret: SECRET, authorization: `Bearer ${SECRET}`, getDeps });
  assert.deepEqual({ status: ok.status, body: ok.body }, { status: 200, body: { ok: true, skipped: true } });
  assert.equal(ok.headers["Cache-Control"], "no-store");
  const no = await handleCleanupRequest({ mode: "shadow", secret: SECRET, authorization: "Bearer wrong", getDeps });
  assert.deepEqual({ status: no.status, body: no.body }, { status: 401, body: { error: "unauthorized" } });
  const noSecret = await handleCleanupRequest({ mode: "shadow", secret: undefined, authorization: "Bearer undefined", getDeps });
  assert.equal(noSecret.status, 401);
  assert.equal(made, 0);
  assert.ok(!JSON.stringify([ok, no, noSecret]).includes(SECRET), "응답에 비밀값 0");
});

test("shadow: 의존성을 만들지 못하면 503, 보호 목록 불명이면 503과 코드, 정상이면 건수", async () => {
  const auth = { mode: "shadow", secret: SECRET, authorization: `Bearer ${SECRET}` };
  for (const getDeps of [undefined, () => { throw new Error("env"); }]) {
    const r = await handleCleanupRequest({ ...auth, getDeps });
    assert.deepEqual({ status: r.status, body: r.body }, { status: 503, body: { ok: false, code: "CLEANUP_UNAVAILABLE" } });
  }
  const bad = world({ exemptFails: true });
  const r1 = await handleCleanupRequest({ ...auth, getDeps: () => bad.deps });
  assert.equal(r1.status, 503);
  assert.equal(r1.body.code, "EXEMPT_UNAVAILABLE");
  const w = world().profile(U1); w.asset(1, U1);
  const r2 = await handleCleanupRequest({ ...auth, getDeps: () => w.deps });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.ok, true);
  assert.equal(r2.body.counts.deleted, 1);
  assert.equal(r2.headers["Cache-Control"], "no-store");
});

// ───────────── C) 실제 라우트 GET (운영 상수 off) ─────────────
test("실제 라우트: 운영 상수는 off — 인증 없으면 401, 인증되면 skipped, 관리자 클라이언트 생성 0. 주소의 ?secret= 은 받지 않는다", async () => {
  assert.equal(AIF_ASSETS_MODE, "off");
  let admin = 0;
  globalThis.__aifCleanup = { createAdminClient: () => { admin++; throw new Error("관리자 클라이언트가 만들어지면 안 됨"); } };
  const before = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = SECRET;
    const { GET, dynamic, fetchCache, maxDuration } = await import("../src/app/api/aif/assets/cleanup/route.ts");
    assert.deepEqual([dynamic, fetchCache, maxDuration], ["force-dynamic", "force-no-store", 300]);
    const call = (url, headers) => GET(new Request(url, { headers }));
    const none = await call("http://local/api/aif/assets/cleanup", {});
    assert.equal(none.status, 401);
    const query = await call(`http://local/api/aif/assets/cleanup?secret=${SECRET}`, {});
    assert.equal(query.status, 401, "쿼리 비밀값 거절");
    const forced = await call("http://local/api/aif/assets/cleanup", { authorization: `Bearer ${SECRET}`, "x-aif-assets-mode": "shadow" });
    assert.equal(forced.status, 200);
    assert.deepEqual(await forced.json(), { ok: true, skipped: true }, "머리글로 켤 수 없다");
    assert.equal(forced.headers.get("cache-control"), "no-store");
    delete process.env.CRON_SECRET;
    const unset = await call("http://local/api/aif/assets/cleanup", { authorization: "Bearer undefined" });
    assert.equal(unset.status, 401, "비밀값 미설정이면 전부 거절");
    assert.equal(admin, 0);
  } finally {
    if (before === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = before;
  }
});

// ───────────── D) SQL 초안 정적 확인(실행 0) ─────────────
test("SQL 초안(미적용) 정적 확인: 만료 상태·용량 가산·전이 제거·기산 조회·서비스 전용 권한", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261118120000_aif_assets_a1.sql", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");   // 주석 제외
  assert.match(code, /state in \('reserved','ready','failed','unknown','missing','expired'\)/);
  assert.match(code, /aif_assets_expired_shape check \(state <> 'expired' or \(expired_at is not null and object_id is not null\)\)/);
  // 용량: expired는 deleted로 확정된 것만 뺀다
  assert.match(code, /or \(a\.state = 'expired' and not exists \(\s*select 1 from public\.aif_asset_deletions d where d\.asset_id = a\.id and d\.state = 'deleted'\)\)/);
  // 삭제 불명에서 「실패(재시도 가능)」로 가는 전이는 없다
  assert.match(code, /v_del\.state = 'delete_unknown' and p_state = 'deleted'\)/);
  assert.doesNotMatch(code, /'delete_unknown' and p_state in/);
  // 기산: 기대 객체(id·bucket·name)에서 읽은 storage.objects.created_at, 정책 기간은 함수 값
  assert.match(code, /select so\.created_at into v_created\s+from storage\.objects so\s+where so\.id = v_asset\.object_id and so\.bucket_id = v_asset\.bucket and so\.name = v_asset\.path;/);
  assert.match(code, /v_due := v_created < now\(\) - make_interval\(days => v_days\);/);
  assert.match(code, /from public\.member_storage_policy\(p_user\) pol;/);
  assert.doesNotMatch(code, /interval '30 days'|days => 30\b/, "기간을 숫자로 적지 않는다");
  assert.doesNotMatch(code, /stored_at \+|expired_at <|interval '1 day'/, "확정 시각·만료 시각·임의 여유로 기간을 재지 않는다");
  // 잠금 순서: 회원 → 자산 (새 함수 둘 다)
  for (const fn of ["aif_asset_expire", "aif_asset_delete_verify"]) {
    const body = code.slice(code.indexOf(`function public.${fn}(`));
    const u = body.indexOf("hashtext('aif_user:'"), a = body.indexOf("hashtext('aif_asset:'");
    assert.ok(u > 0 && a > u, `${fn} 잠금 순서`);
    assert.match(code, new RegExp(`revoke all on function public\\.${fn}\\(uuid, uuid, uuid\\) from public, anon, authenticated;\\s*grant execute on function public\\.${fn}\\(uuid, uuid, uuid\\) to service_role;`));
  }
  assert.equal((code.match(/create or replace function public\./g) ?? []).length, 11);
  assert.doesNotMatch(code, /storage\.buckets|storage_posting_tracked_buckets|cron\.schedule|delete from storage\.objects/, "버킷·추적 등록·예약·직접 삭제 없음");
});
