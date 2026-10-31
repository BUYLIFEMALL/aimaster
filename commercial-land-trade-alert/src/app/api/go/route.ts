import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 카톡 「결과 보기」 넘겨주기(2026-10-25): 카카오 메시지 링크는 회원 카카오 앱에 등록한 도메인만 열리므로,
// 회원은 이 프로그램 도메인 하나만 등록하고 여기서 네이버 부동산 매물 화면으로 넘긴다. 아무 주소로나 넘기지 않게 네이버 부동산만 허용.
const ALLOWED = new Set(["new.land.naver.com", "fin.land.naver.com", "m.land.naver.com"]);

export function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("u") ?? "";
  try {
    const target = new URL(raw);
    if (target.protocol === "https:" && ALLOWED.has(target.hostname)) return NextResponse.redirect(target.toString(), 302);
  } catch {
    // 잘못된 주소는 아래 대시보드로
  }
  return NextResponse.redirect(new URL("/dashboard", request.url), 302);
}
