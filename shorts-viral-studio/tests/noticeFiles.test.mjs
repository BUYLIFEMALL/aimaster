// 고지 파일 통과 규칙 시험(MOV-VIDEO-NOTICE-307, 2026-11-20, 기준 방식 f8b31fde9).
// 정확히 /robots.txt·/ai.txt만 통과하고, 로그인·API·다른 경로의 경계는 그대로인지 확인한다. 네트워크 없음.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { isNoticeFile } from "../src/lib/noticeFiles.ts";

test("고지 파일 두 경로만 통과", () => {
  assert.equal(isNoticeFile("/robots.txt"), true);
  assert.equal(isNoticeFile("/ai.txt"), true);
});

test("비슷한 이름·하위 경로·대소문자·다른 화면은 통과하지 않음", () => {
  for (const p of [
    "/", "/home", "/login", "/signup", "/settings", "/api/auth/logout",
    "/robots.txt/", "/robots.txt/x", "/robots.txtx", "/x/robots.txt", "/robots.txt.bak",
    "/ai.txt/", "/ai.txt.map", "/a/ai.txt", "/AI.TXT", "/Robots.txt", "/robots", "/ai",
    "/llms.txt", "/NOTICE", "/.env", "/robots.txt?x=1", "",
  ]) {
    assert.equal(isNoticeFile(p), false, p);
  }
});

test("고지 파일이 실제로 public에 있다(통과시킬 대상)", () => {
  assert.ok(existsSync(new URL("../public/robots.txt", import.meta.url)));
  assert.ok(existsSync(new URL("../public/ai.txt", import.meta.url)));
});

test("미들웨어가 로그인 검사보다 먼저 고지 파일을 통과시키고, 나머지 흐름은 그대로", () => {
  const src = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  const pass = src.indexOf("isNoticeFile(request.nextUrl.pathname)");
  assert.ok(pass > 0, "통과 검사가 있어야 함");
  assert.ok(pass < src.indexOf("createServerClient("), "세션 확인보다 앞");
  assert.ok(pass < src.indexOf('new URL("/login"'), "로그인 이동보다 앞");
  assert.equal(src.split("isNoticeFile(").length - 1, 1, "통과 지점은 한 곳뿐");
  // 기존 경계 유지(이 앱은 "/"와 api/도 로그인 검사 대상 — 바꾸지 않음)
  assert.match(src, /const PUBLIC_PATHS = \["\/login", "\/signup"\];/);
  assert.match(src, /if \(!user && !isPublicPath\) \{/);
  assert.doesNotMatch(src, /pathname !== "\/"/, "\"/\" 예외를 새로 만들지 않음");
  assert.match(src, /redirectUrl\.searchParams\.set\("redirect", pathname \+ search\)/);
  assert.match(src, /matcher: \["\/\(\(\?!_next\/static\|_next\/image\|favicon\.ico\|\.\*/, "matcher는 api/를 빼지 않은 기존 그대로");
});
