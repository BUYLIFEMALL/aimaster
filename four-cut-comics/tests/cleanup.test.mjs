// v1.25 서버 보관함 매일 정리 — 정적 검사(무료)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("정리 작업: 비밀값 확인·회원 폴더만·회원별 만료 정리 함수 사용", () => {
  const cron = read("../src/app/api/cron/cleanup/route.ts");
  assert.match(cron, /process\.env\.CRON_SECRET\?\.trim\(\)/);
  assert.match(cron, /if \(!secret \|\|/);
  assert.match(cron, /!f\.id && UUID\.test\(f\.name\)/);
  assert.match(cron, /purgeExpiredSaved\(userId\)/);
});

test("매일 03시(KST) 예약 등록, 기존 5분 게시 예약은 그대로", () => {
  const v = JSON.parse(read("../vercel.json"));
  assert.ok(v.crons.some((c) => c.path === "/api/cron/cleanup" && c.schedule === "0 18 * * *"));
  assert.ok(v.crons.some((c) => c.path === "/api/instagram/dispatch" && c.schedule === "*/5 * * * *"));
});

test("회원별 정리 함수는 만료 판정(splitExpired) 경로를 재사용", () => {
  const s = read("../src/lib/saved.ts");
  assert.match(s, /export async function purgeExpiredSaved\(userId: string\)/);
  assert.match(s, /\(await liveIndex\(userId\)\)\.length/);
});
