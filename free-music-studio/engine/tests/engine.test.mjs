import test from "node:test";
import assert from "node:assert/strict";
import { chooseDevice } from "../src/device.mjs";
import { bearer, corsHeaders, isAllowedOrigin, newPairCode, sameSecret } from "../src/security.mjs";

test("장치: NVIDIA 윈도우는 고품질(cuda, 언어 모델 켬)", () => {
  const d = chooseDevice({ platform: "win32", arch: "x64", nvidia: true });
  assert.equal(d.device, "cuda");
  assert.equal(d.initLlm, true);
});

test("장치: 그래픽카드 없는 윈도우는 CPU 모드(언어 모델 끔)", () => {
  const d = chooseDevice({ platform: "win32", arch: "x64", nvidia: false });
  assert.equal(d.device, "cpu");
  assert.equal(d.initLlm, false);
});

test("장치: Intel 맥은 미지원, Apple Silicon은 mps", () => {
  assert.equal(chooseDevice({ platform: "darwin", arch: "x64", nvidia: false }).supported, false);
  assert.equal(chooseDevice({ platform: "darwin", arch: "arm64", nvidia: false }).device, "mps");
});

test("보안: 우리 사이트·내 PC 개발 주소만 허용", () => {
  assert.equal(isAllowedOrigin("https://free-music-studio.buylife.xyz"), true);
  assert.equal(isAllowedOrigin("http://localhost:3000"), true);
  assert.equal(isAllowedOrigin("https://evil.example.com"), false);
  assert.equal(isAllowedOrigin("https://free-music-studio.buylife.xyz.evil.com"), false);
  assert.equal(isAllowedOrigin(undefined), false);
  assert.deepEqual(corsHeaders("https://evil.example.com"), {});
});

test("보안: 짝짓기 코드 6자리, 토큰 비교, Bearer 꺼내기", () => {
  assert.match(newPairCode(), /^\d{6}$/);
  assert.equal(sameSecret("abc", "abc"), true);
  assert.equal(sameSecret("abc", "abd"), false);
  assert.equal(sameSecret("abc", "abcd"), false);
  assert.equal(bearer("Bearer tok123"), "tok123");
  assert.equal(bearer("Basic x"), null);
});
