// 고지 파일 통과 규칙 시험(CRAWLER-NOTICE-REDIRECT-AUDIT, 2026-11-20).
// 정확히 /robots.txt·/ai.txt만 통과하고, 로그인·API·다른 경로의 경계는 그대로인지 확인한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isNoticeFile } from "../src/lib/noticeFiles.ts";

test("고지 파일 두 경로만 통과", () => {
  assert.equal(isNoticeFile("/robots.txt"), true);
  assert.equal(isNoticeFile("/ai.txt"), true);
});

test("비슷한 이름·하위 경로·대소문자·다른 화면은 통과하지 않음", () => {
  for (const p of [
    "/", "/home", "/login", "/settings", "/api/auth/logout",
    "/robots.txt/", "/robots.txt/x", "/robots.txtx", "/x/robots.txt", "/robots.txt.bak",
    "/ai.txt/", "/ai.txt.map", "/a/ai.txt", "/AI.TXT", "/Robots.txt", "/robots", "/ai",
    "/llms.txt", "/NOTICE", "/.env",
  ]) {
    assert.equal(isNoticeFile(p), false, p);
  }
});

test("미들웨어가 로그인 검사보다 먼저 고지 파일을 통과시키고, 나머지 흐름은 그대로", () => {
  const src = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  const pass = src.indexOf("isNoticeFile(request.nextUrl.pathname)");
  assert.ok(pass > 0, "통과 검사가 있어야 함");
  assert.ok(pass < src.indexOf("createServerClient("), "세션 확인보다 앞");
  assert.ok(pass < src.indexOf('new URL("/login"'), "로그인 이동보다 앞");
  // 기존 경계 유지: 공개 경로 목록·로그인 이동·matcher 의 api/ 제외는 그대로
  assert.match(src, /const PUBLIC_PATHS = \["\/login", "\/signup"\];/);
  assert.match(src, /if \(!user && !isPublicPath && pathname !== "\/"\)/);
  assert.match(src, /matcher: \[\s*"\/\(\(\?!_next\/static\|_next\/image\|favicon\.ico\|api\//);
});
