import { NextResponse, type NextRequest } from "next/server";

// 쓰기 요청은 이 사이트 화면에서 보낸 것만(다른 사이트가 회원 쿠키로 대신 보내는 것 차단)
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

export const noStoreJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
