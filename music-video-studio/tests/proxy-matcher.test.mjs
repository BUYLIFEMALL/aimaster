// 고지 파일 경로 307 수정(2026-11-20) — proxy matcher가 /robots.txt·/ai.txt 두 경로만 로그인 검사에서 빼는지
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
const literal = src.match(/matcher:\s*\[[^"]*"((?:[^"\\]|\\.)+)"/)[1];
const raw = JSON.parse(`"${literal}"`); // TS 문자열 표기(\\.)를 그대로 해석
const re = new RegExp(`^${raw}$`);
const guarded = (p) => re.test(p);

test("고지 두 경로는 로그인 검사 밖(정적 파일 그대로)", () => {
  assert.equal(guarded("/robots.txt"), false);
  assert.equal(guarded("/ai.txt"), false);
});

test("비슷한 다른 경로는 그대로 로그인 검사 안", () => {
  for (const p of ["/robots.txt.bak", "/robots.txtx", "/ai.txt/x", "/ai.txt.html", "/xai.txt", "/notice/ai.txt", "/AI.TXT", "/robotsXtxt"]) assert.equal(guarded(p), true, p);
});

test("기존 경계 회귀 — 화면·로그인 경로는 검사, API·정적 자원은 기존처럼 제외", () => {
  for (const p of ["/", "/login", "/signup", "/studio", "/music", "/video", "/settings"]) assert.equal(guarded(p), true, p);
  for (const p of ["/api/suno/tracks", "/_next/static/chunk.js", "/_next/image", "/favicon.ico", "/logo.png", "/a/b.webp"]) assert.equal(guarded(p), false, p);
});

test("로그인 공개 경로 목록은 바뀌지 않음", () => {
  assert.match(src, /const PUBLIC_PATHS = \["\/login", "\/signup"\];/);
});
