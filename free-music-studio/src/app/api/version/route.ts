// 지금 배포된 사이트 판 — 열려 있던 탭이 예전 판인지 알아보는 용도(2026-11-04 마스터PC 탭이 v1.13에 머물러 「모델 저장 공간」이 안 보였음).
// 버전 글자만 돌려주므로 로그인 검사가 필요 없다.
import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export function GET() {
  return NextResponse.json({ version: APP_VERSION }, { headers: { "Cache-Control": "no-store" } });
}
