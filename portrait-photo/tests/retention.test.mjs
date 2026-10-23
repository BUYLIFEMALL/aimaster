// v1.31 서버 보관함 30일 상한·매일 정리(무료 시험)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RETENTION_DAYS, createdCutoff, effectiveExpiry, expiresAtFor, normalizeRetention } from "../src/lib/retention.ts";

const now = new Date("2026-10-22T00:00:00Z");

test("선택지는 7·30일, 0·90·이상한 값은 30일", () => {
  assert.deepEqual([...RETENTION_DAYS], [7, 30]);
  assert.equal(normalizeRetention(7), 7);
  for (const v of [0, 90, 5, "30", undefined]) assert.equal(normalizeRetention(v), 30);
});

test("만료일은 30일을 넘지 않는다", () => {
  assert.equal(expiresAtFor(7, now), "2026-10-29T00:00:00.000Z");
  assert.equal(expiresAtFor(0, now), "2026-11-21T00:00:00.000Z");
  assert.equal(expiresAtFor(90, now), "2026-11-21T00:00:00.000Z");
});

test("옛 무기한·90일 사진도 만든 날 + 30일", () => {
  assert.equal(effectiveExpiry("2026-10-01T00:00:00Z", null), "2026-10-31T00:00:00.000Z");
  assert.equal(effectiveExpiry("2026-10-01T00:00:00Z", "2026-12-30T00:00:00Z"), "2026-10-31T00:00:00.000Z");
  assert.equal(effectiveExpiry("2026-10-01T00:00:00Z", "2026-10-08T00:00:00Z"), "2026-10-08T00:00:00.000Z");
  assert.equal(createdCutoff(now), "2026-09-22T00:00:00.000Z");
});

test("정리 작업: 비밀값 확인·만료 조건·매일 예약", () => {
  const cron = readFileSync(new URL("../src/app/api/cron/cleanup/route.ts", import.meta.url), "utf8");
  const saved = readFileSync(new URL("../src/lib/saved.ts", import.meta.url), "utf8");
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(cron, /if \(!secret \|\|/);
  assert.match(cron, /\.or\(expiredFilter\(\)\)/);
  assert.match(saved, /expires_at\.lt\.\$\{now\.toISOString\(\)\},created_at\.lt\.\$\{createdCutoff\(now\)\}/);
  assert.ok(vercel.crons?.some((c) => c.path === "/api/cron/cleanup"));
});
