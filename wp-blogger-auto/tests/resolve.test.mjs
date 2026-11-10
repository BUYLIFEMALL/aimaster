import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveUncertain, canResolve } from "../src/lib/resolveUncertain.ts";

const NOW = Date.parse("2026-11-11T03:00:00Z");
function fakeAdmin(row) {
  const rows = [{ id: "p1", user_id: "user-a", updated_at: new Date(NOW - 60_000).toISOString(), remote_id: null, ...row }];
  return {
    rows,
    from() {
      const f = []; let op = "select", values = null;
      const q = { select() { return q; }, eq(k, v) { f.push([k, v]); return q; }, update(v) { op = "update"; values = v; return q; },
        maybeSingle() { return finish(true); }, then(res, rej) { return finish(false).then(res, rej); } };
      async function finish(single) {
        const hit = rows.filter((r) => f.every(([k, v]) => r[k] === v));
        if (op === "update") { hit.forEach((r) => Object.assign(r, values)); return { data: hit.map((h) => ({ id: h.id })), error: null }; }
        return { data: single ? hit[0] ?? null : hit, error: null };
      }
      return q;
    },
  };
}

test("RS01 올라갔어요 → 발행됨(주소 기록, 다시 보내기 막힘)", async () => {
  const a = fakeAdmin({ status: "uncertain" });
  assert.equal(await resolveUncertain(a, "user-a", "p1", { outcome: "sent", url: "https://myblog.co.kr/x" }, NOW), "published");
  assert.equal(a.rows[0].remote_url, "https://myblog.co.kr/x"); assert.equal(a.rows[0].remote_id, "manual");
});

test("RS02 안 올라갔어요 → 실패(다시 보낼 수 있음)", async () => {
  const a = fakeAdmin({ status: "uncertain" });
  assert.equal(await resolveUncertain(a, "user-a", "p1", { outcome: "not_sent" }, NOW), "failed");
  assert.equal(a.rows[0].remote_id, null); assert.equal(a.rows[0].status, "failed");
});

test("RS03 정리할 수 없는 상태·남의 원고·잘못된 주소는 막음, 멈춘 발행 중은 10분 뒤부터", async () => {
  await assert.rejects(() => resolveUncertain(fakeAdmin({ status: "ready" }), "user-a", "p1", { outcome: "sent" }, NOW), (e) => e.code === "not_uncertain");
  await assert.rejects(() => resolveUncertain(fakeAdmin({ status: "uncertain" }), "user-b", "p1", { outcome: "sent" }, NOW), (e) => e.code === "not_found");
  await assert.rejects(() => resolveUncertain(fakeAdmin({ status: "uncertain" }), "user-a", "p1", { outcome: "sent", url: "javascript:alert(1)" }, NOW), /주소 형식/);
  await assert.rejects(() => resolveUncertain(fakeAdmin({ status: "uncertain" }), "user-a", "p1", { outcome: "maybe" }, NOW), /결과를 골라/);
  assert.equal(canResolve("publishing", new Date(NOW - 60_000).toISOString(), NOW), false);
  assert.equal(canResolve("publishing", new Date(NOW - 11 * 60_000).toISOString(), NOW), true);
  const stale = fakeAdmin({ status: "publishing", updated_at: new Date(NOW - 11 * 60_000).toISOString() });
  assert.equal(await resolveUncertain(stale, "user-a", "p1", { outcome: "not_sent" }, NOW), "failed");
});
