// 카카오 연결 규칙(외부 호출 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkState, isClientSecret, isRestApiKey, kakaoAuthorizeUrl, makeState } from "../src/lib/kakao/oauth.ts";

test("키 모양 검사", () => {
  assert.equal(isRestApiKey("a".repeat(32)), true);
  assert.equal(isRestApiKey("xyz"), false);
  assert.equal(isClientSecret("A1".repeat(10)), true);
  assert.equal(isClientSecret("짧음"), false);
});

test("연결 주소", () => {
  const u = kakaoAuthorizeUrl("k", "s");
  assert.match(u, /client_id=k/);
  assert.match(u, /coupang-ops\.buylife\.xyz%2Fapi%2Fkakao%2Fcallback/);
  assert.match(u, /scope=talk_message/);
});

test("확인값은 쿠키·회원 모두 맞아야 통과", () => {
  const s = makeState("u1", "n".repeat(16));
  assert.equal(checkState(s, s, "u1"), true);
  assert.equal(checkState(s, s, "u2"), false);
  assert.equal(checkState(s, "다른값", "u1"), false);
  assert.equal(checkState(null, s, "u1"), false);
  assert.equal(checkState("u1.짧음", "u1.짧음", "u1"), false);
});
