// apply-source-notice.mjs 「로그인 미들웨어가 고지 파일을 막음」 정적 추정 시험(2026-11-20 NOTICE-MW-CHECK).
// 실행: node --test scripts/apply-source-notice.test.mjs  (저장소 파일 읽기만, 쓰기·네트워크 없음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyMiddleware, middlewareNoticeProblem, noticeProblems } from "./apply-source-notice.mjs";

// 같은 뼈대 앱의 실제 모양(공개 경로 밖이면 /login 으로) — 고지 통과 처리 없음
const SKELETON = (matcher) => `
import { NextResponse, type NextRequest } from "next/server";
const PUBLIC_PATHS = ["/login", "/signup"];
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (!user && !isPublicPath && pathname !== "/") {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }
  return NextResponse.next();
}
export const config = { ${matcher} };
`;
const IMG_ONLY = 'matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]';

test("진짜 양성 — 이미지만 빼는 matcher + 거부 기본 로그인 이동 → blocks", () => {
  const r = classifyMiddleware(SKELETON(IMG_ONLY));
  assert.equal(r.verdict, "blocks", r.reason);
});

test("matcher 가 없으면 모든 경로에 돌므로 blocks", () => {
  assert.equal(classifyMiddleware(SKELETON("runtime: 'nodejs'")).verdict, "blocks");
});

test("고지 통과 처리(isNoticeFile 호출 또는 \"/robots.txt\" 글자)가 코드에 있으면 ok", () => {
  const fixed = SKELETON(IMG_ONLY).replace("export async function proxy(request: NextRequest) {", 'export async function proxy(request: NextRequest) {\n  if (isNoticeFile(request.nextUrl.pathname)) return NextResponse.next();');
  assert.equal(classifyMiddleware(fixed).verdict, "ok");
  const literal = SKELETON(IMG_ONLY).replace("const PUBLIC_PATHS", 'if (pathname === "/robots.txt") return NextResponse.next();\nconst PUBLIC_PATHS');
  assert.equal(classifyMiddleware(literal).verdict, "ok");
});

test("공개 예외 — matcher 가 .txt 를 빼면 ok", () => {
  const txt = 'matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|txt)$).*)"]';
  assert.equal(classifyMiddleware(SKELETON(txt)).verdict, "ok");
});

test("공개 예외 — 허용 기본(로그인 필요 경로 목록만 막는 mbti·tarot 방식)은 ok", () => {
  const allow = `
const AUTH_REQUIRED_PATHS = ["/dashboard"];
export async function middleware(request) {
  const isAuthRequired = AUTH_REQUIRED_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!user && isAuthRequired) { const loginUrl = new URL("/login", request.url); return NextResponse.redirect(loginUrl); }
}
export const config = { matcher: ["/((?!_next/static).*)"] };`;
  assert.equal(classifyMiddleware(allow).verdict, "ok");
});

test("여러 matcher — 하나라도 고지 경로를 잡으면 blocks, 모두 빼면 ok", () => {
  const multiCatch = 'matcher: ["/dashboard/:path*", "/((?!_next/static|.*\\\\.png$).*)"]';
  assert.equal(classifyMiddleware(SKELETON(multiCatch)).verdict, "blocks");
  const multiSafe = 'matcher: ["/dashboard/(.*)", "/settings/(.*)"]';
  assert.equal(classifyMiddleware(SKELETON(multiSafe)).verdict, "ok");
});

test("해석 불가 — matcher 가 변수이거나 정규식이 깨지면 unknown(경고 문구는 「판정 불가」)", () => {
  assert.equal(classifyMiddleware(SKELETON("matcher: MATCHERS")).verdict, "unknown");
  assert.equal(classifyMiddleware(SKELETON('matcher: ["/home", SOME_VAR]')).verdict, "unknown");
  assert.equal(classifyMiddleware(SKELETON('matcher: ["/((?!_next"]')).verdict, "unknown");
});

test("단어가 주석에만 있으면 없는 것으로 본다 — 통과 처리 주석은 무시(blocks), 로그인 이동 주석은 무시(ok)", () => {
  const commentOnlyExempt = SKELETON(IMG_ONLY).replace("const PUBLIC_PATHS", '// TODO: isNoticeFile(pathname) 로 "/robots.txt" 통과시키기\n/* if (isNoticeFile(p)) return; */\nconst PUBLIC_PATHS');
  assert.equal(classifyMiddleware(commentOnlyExempt).verdict, "blocks");
  const commentOnlyRedirect = `
const PUBLIC_PATHS = ["/x"];
export function middleware(request) {
  // if (!isPublicPath) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static).*)"] };`;
  assert.equal(classifyMiddleware(commentOnlyRedirect).verdict, "ok");
});

test("주소 글자 안의 // 는 주석으로 오인하지 않음", () => {
  const withUrl = SKELETON(IMG_ONLY).replace("const PUBLIC_PATHS", 'const SITE = "https://www.buylife.xyz";\nconst PUBLIC_PATHS');
  assert.equal(classifyMiddleware(withUrl).verdict, "blocks");
});

test("저장소 실제 폴더 — 고친 앱은 경고 없음, 경고 문구는 「정적 추정」으로 시작하고 막지 않음(문자열만 돌려줌)", () => {
  for (const f of ["seller-label-docs", "shop-order-report", "smartstore-register", "coupang-ops", "elevenst-register", "esm-register"]) {
    assert.equal(middlewareNoticeProblem(f), null, f);
  }
  const all = noticeProblems("seller-label-docs");
  assert.ok(Array.isArray(all));
  assert.ok(!all.some((p) => p.includes("미들웨어")));
  // 경고가 나오는 폴더가 있으면 모두 「[정적 추정」으로 시작(확정처럼 보이지 않게)
  for (const f of ["ai-doc-chatbot", "ai-mastering-studio", "style-dna-analyzer", "persona-style-studio"]) {
    const p = middlewareNoticeProblem(f);
    if (p) assert.match(p, /^\[정적 추정/, f);
  }
});
