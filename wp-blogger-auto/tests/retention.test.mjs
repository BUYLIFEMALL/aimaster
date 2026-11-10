import { test } from "node:test";
import assert from "node:assert/strict";
import { imageExpiresAt, retentionPatch, checkScheduleWithinRetention } from "../src/lib/publishFlow.ts";
import { syncScheduled } from "../src/lib/syncScheduled.ts";

const NOW = Date.parse("2026-11-11T03:00:00Z");
const DAY = 864e5;

test("RT01 발행 이미지 보관 끝 = 발행일 + 1년(365일)", () => {
  const pub = "2026-11-11T03:00:00.000Z";
  assert.equal(imageExpiresAt(pub), "2027-11-11T03:00:00.000Z");
  const exp = Date.parse(imageExpiresAt(pub));
  assert.ok(Date.parse(pub) + 364 * DAY < exp, "364일째는 아직 보관");
  assert.ok(Date.parse(pub) + 366 * DAY > exp, "366일째는 지울 대상");
});

test("RT02 보관 칸 묶음 — 구글 블로그 실제 발행만 1년, 나머지는 해제", () => {
  assert.deepEqual(retentionPatch("blogger", "published", 2, "2026-11-11T00:00:00.000Z"), { keep_images: true, image_expires_at: "2027-11-11T00:00:00.000Z" });
  for (const [pf, st, n, at] of [["blogger", "scheduled", 2, null], ["blogger", "draft", 2, null], ["blogger", "published", 0, "2026-11-11T00:00:00.000Z"], ["wordpress", "published", 3, "2026-11-11T00:00:00.000Z"], ["blogger", "published", 2, null]]) {
    assert.deepEqual(retentionPatch(pf, st, n, at), { keep_images: false, image_expires_at: null }, `${pf}/${st}/${n}`);
  }
});

test("RT03 예약 상한 = 원고 보관 만료 하루 전(경계 포함)", () => {
  const exp = new Date(NOW + 30 * DAY).toISOString();
  assert.doesNotThrow(() => checkScheduleWithinRetention(new Date(NOW + 29 * DAY).toISOString(), exp));
  assert.throws(() => checkScheduleWithinRetention(new Date(NOW + 29 * DAY + 60_000).toISOString(), exp), (e) => e.code === "schedule_too_late");
  assert.doesNotThrow(() => checkScheduleWithinRetention(new Date(NOW + 300 * DAY).toISOString(), null), "만료 없는 원고(발행 기록 등)는 제한 없음");
});

// 예약 확인용 가짜 DB(읽기 조건 무시 — 넘겨준 행만, 업데이트 기록)
function fakeSyncAdmin(rows) {
  const updates = [];
  return {
    updates,
    from() {
      let op = "select", values = null; const f = [];
      const q = {
        select() { return q; }, eq(k, v) { f.push([k, v]); return q; }, not() { return q; }, lt() { return q; }, order() { return q; }, limit() { return q; },
        update(v) { op = "update"; values = v; return q; },
        then(res, rej) {
          if (op === "update") { updates.push({ values, where: Object.fromEntries(f) }); return Promise.resolve({ data: null, error: null }).then(res, rej); }
          return Promise.resolve({ data: rows, error: null }).then(res, rej);
        },
      };
      return q;
    },
  };
}

test("RT04 예약 확인 — 실제 공개된 구글 블로그 글만 「발행됨」 + 그 시각부터 1년, 아직이면 그대로, 오류는 격리", async () => {
  const done = { status: "done", path: "u/p/a.jpg" };
  const rows = [
    { id: "a", user_id: "u1", platform: "blogger", remote_id: "1", scheduled_at: "2026-11-10T00:00:00.000Z", images: [done] },
    { id: "b", user_id: "u2", platform: "blogger", remote_id: "2", scheduled_at: "2026-11-10T00:00:00.000Z", images: [done] },
    { id: "c", user_id: "u3", platform: "wordpress", remote_id: "3", scheduled_at: "2026-11-10T00:00:00.000Z", images: [done] },
    { id: "d", user_id: "u4", platform: "blogger", remote_id: "4", scheduled_at: "2026-11-10T00:00:00.000Z", images: [done] },
  ];
  const admin = fakeSyncAdmin(rows);
  const read = async (_a, row) => {
    if (row.id === "a") return { status: "published", remoteId: "1", url: "https://b/1", scheduledAt: null, publishedAt: "2026-11-10T00:00:05.000Z" };
    if (row.id === "b") return { status: "scheduled", remoteId: "2", url: null, scheduledAt: "x" };
    if (row.id === "c") return { status: "published", remoteId: "3", url: "https://w/3", scheduledAt: null, publishedAt: null };
    throw new Error("token expired");
  };
  const out = await syncScheduled(admin, { now: NOW, read });
  assert.deepEqual(out, { checked: 4, confirmed: 2, pending: 1, failed: 1 });
  const a = admin.updates.find((u) => u.where.id === "a");
  assert.equal(a.values.status, "published"); assert.equal(a.values.keep_images, true); assert.equal(a.values.image_expires_at, "2027-11-10T00:00:05.000Z");
  assert.equal(a.where.status, "scheduled"); assert.equal(a.where.user_id, "u1");
  const c = admin.updates.find((u) => u.where.id === "c");
  assert.equal(c.values.status, "published"); assert.equal(c.values.keep_images, false, "워드프레스는 사이트에 복사돼 보관 안 함");
  assert.equal(admin.updates.length, 2, "아직 예약·오류 글은 바꾸지 않음");
});
