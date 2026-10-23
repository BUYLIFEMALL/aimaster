// v1.10 — 동시 렌더 덮어쓰기 방지(D-02-01)·30일 자동 삭제 정적 검사(무료)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const render = read("../src/app/api/projects/[id]/render/route.ts");
const cron = read("../src/app/api/cron/cleanup/route.ts");
const vercel = JSON.parse(read("../vercel.json"));
const del = read("../src/app/api/projects/[id]/route.ts");

test("렌더는 유료 생성 전에 선점하고, 선점 값이 그대로일 때만 저장한다", () => {
  const claimAt = render.indexOf("claimProject(");
  const genAt = render.indexOf("generateImage(");
  assert.ok(claimAt > 0 && genAt > claimAt, "claimProject가 generateImage보다 먼저");
  assert.match(render, /status: 409/);
  assert.match(render, /\.eq\("updated_at", claimed\)/);
  assert.match(render, /newMasterPath\(/);
  assert.doesNotMatch(render, /paths\.master\(/);
});

test("30일 정리: 비밀값 확인·생성일 기준·폴더째 삭제, 매일 예약 등록", () => {
  assert.match(cron, /process\.env\.CRON_SECRET\?\.trim\(\)/);
  assert.match(cron, /if \(!secret \|\|/);
  assert.match(cron, /30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(cron, /\.lt\("created_at", cutoff\)/);
  assert.match(cron, /removeProjectFolder\(/);
  assert.ok(vercel.crons?.some((c) => c.path === "/api/cron/cleanup"));
});

test("프로젝트 삭제도 폴더째 비운다(이름이 바뀐 마스터 파일까지)", () => {
  assert.match(del, /removeProjectFolder\(a\.user\.id, id\)/);
});
