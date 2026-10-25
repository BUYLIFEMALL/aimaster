// 카카오 바로 연결(2026-10-25, v1.17) — 인증 주소·확인값·키 모양 시험
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkState, isClientSecret, isRestApiKey, kakaoAuthorizeUrl, KAKAO_REDIRECT_URI, makeState } from "../lib/kakaoOAuth.ts";

const UID = "11111111-2222-3333-4444-555555555555";
const NONCE = "abcdef0123456789abcdef0123456789";

test("인증 주소: 회원 본인 REST 키·돌아올 주소·나에게 보내기 권한·state", () => {
  const url = new URL(kakaoAuthorizeUrl("0123456789abcdef0123456789abcdef", makeState(UID, NONCE)));
  assert.equal(url.origin + url.pathname, "https://kauth.kakao.com/oauth/authorize");
  assert.equal(url.searchParams.get("client_id"), "0123456789abcdef0123456789abcdef");
  assert.equal(url.searchParams.get("redirect_uri"), KAKAO_REDIRECT_URI);
  assert.equal(url.searchParams.get("scope"), "talk_message");
  assert.equal(url.searchParams.get("state"), `${UID}.${NONCE}`);
});

test("state 대조: 쿠키·로그인 회원이 모두 맞을 때만 통과", () => {
  const st = makeState(UID, NONCE);
  assert.equal(checkState(st, st, UID), true);
  assert.equal(checkState(st, undefined, UID), false); // 쿠키 없음
  assert.equal(checkState(st, makeState(UID, NONCE.replace("a", "b")), UID), false); // 다른 확인값
  assert.equal(checkState(st, st, "99999999-0000-0000-0000-000000000000"), false); // 다른 회원
  assert.equal(checkState(makeState(UID, "short"), makeState(UID, "short"), UID), false); // 너무 짧은 확인값
});

test("키 모양: REST API 키 32자 16진, Client Secret 영문·숫자", () => {
  assert.equal(isRestApiKey("0123456789abcdef0123456789ABCDEF"), true);
  assert.equal(isRestApiKey("javascript-key-not-rest"), false);
  assert.equal(isClientSecret("q0KzerAbCdEfGhIjKlMn"), true);
  assert.equal(isClientSecret("짧음"), false);
});
