// v1.11 옷장·룩 30일 보관(D-57-01)과 Pro 글 모델 정식 교체 확인(무료)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isExpired, keepFirstSavedAt, RETENTION_MS } from "../src/lib/look/retention.ts";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 22);

test("30일 이내는 유지, 30일이 지나면 만료", () => {
  assert.equal(RETENTION_MS, 30 * DAY);
  assert.equal(isExpired(now - 29 * DAY, now), false);
  assert.equal(isExpired(now - 30 * DAY, now), false);
  assert.equal(isExpired(now - 30 * DAY - 1, now), true);
});

test("시각이 없거나 잘못된 옛 자료는 만료로 보지 않는다", () => {
  assert.equal(isExpired(undefined, now), false);
  assert.equal(isExpired(Number.NaN, now), false);
});

test("고쳐 저장해도 처음 저장 시각을 유지한다", () => {
  assert.equal(keepFirstSavedAt(now - 10 * DAY, now), now - 10 * DAY);
  assert.equal(keepFirstSavedAt(undefined, now), now);
});

test("저장소 코드가 만료 판정·처음 시각 유지를 쓴다", () => {
  const s = readFileSync(new URL("../src/lib/look/storage.ts", import.meta.url), "utf8");
  assert.match(s, /isExpired\(r\.addedAt\)/);
  assert.match(s, /isExpired\(l\.createdAt\)/);
  assert.match(s, /keepFirstSavedAt\(prev\?\.addedAt\)/);
  assert.doesNotMatch(s, /addedAt: Date\.now\(\)/);
});

test("Pro 글 모델에 미리보기 모델이 없다", () => {
  const g = readFileSync(new URL("../src/lib/gemini.ts", import.meta.url), "utf8");
  const models = g.slice(g.indexOf("export const MODELS"), g.indexOf("};", g.indexOf("export const MODELS")))
    .split(/\r?\n/).filter((l) => !l.trim().startsWith("//")).join(" ");
  assert.doesNotMatch(models, /preview/);
  assert.match(models, /pro: \{ text: "gemini-3\.8-flash"/);
});
