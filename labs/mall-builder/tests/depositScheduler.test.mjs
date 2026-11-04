// 실행: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { bearerToken, expireUrl, hashRunToken, hoursLabel, newRunToken, parseDepositHours } from "../src/lib/depositScheduler.ts";

test("입금 기한 입력: 비우면 끔, 1~168만", () => {
  assert.deepEqual(parseDepositHours(""), { ok: true, value: null });
  assert.deepEqual(parseDepositHours(" 24 "), { ok: true, value: 24 });
  assert.deepEqual(parseDepositHours("168"), { ok: true, value: 168 });
  for (const bad of ["0", "169", "-1", "1.5", "abc", "24시간"]) assert.equal(parseDepositHours(bad).ok, false, bad);
});

test("토큰은 매번 다르고 해시는 64자 16진수(DB 함수 형식과 같음)", () => {
  const a = newRunToken();
  const b = newRunToken();
  assert.notEqual(a, b);
  assert.ok(a.startsWith("mbd_") && a.length > 40);
  assert.match(hashRunToken(a), /^[0-9a-f]{64}$/);
  assert.equal(hashRunToken(a), hashRunToken(a));
});

test("머리글 토큰: 형식이 맞을 때만", () => {
  const t = newRunToken();
  assert.equal(bearerToken(`Bearer ${t}`), t);
  assert.equal(bearerToken(null), null);
  assert.equal(bearerToken(""), null);
  assert.equal(bearerToken(t), null);
  assert.equal(bearerToken("Bearer abc"), null);
  assert.equal(bearerToken(`Bearer ${t} extra`), null);
});

test("실행 주소는 몰마다 하나", () => {
  assert.equal(expireUrl("https://dev-mall-builder.vercel.app/", "aimaster-b2b"), "https://dev-mall-builder.vercel.app/api/cron/deposit-expire?store=aimaster-b2b");
});

test("기한 표시", () => {
  assert.equal(hoursLabel(24), "1일(24시간)");
  assert.equal(hoursLabel(36), "36시간");
});
