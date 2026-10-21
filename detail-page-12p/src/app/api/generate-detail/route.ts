import { NextResponse } from "next/server";

export async function POST() {
  // v1.10(2026-10-21, 이커머스 병합 E1): 상세페이지 자동화(shop-detail-page)로 합쳐져 생성 기능을 닫는다(410).
  return NextResponse.json(
    {
      error: "AI 12단 상세페이지는 「상세페이지 자동화」로 합쳐졌습니다. https://shop-detail-page.buylife.xyz 에서 쿠팡 12단·스마트스토어 9단으로 만들어 주세요.",
      movedTo: "https://shop-detail-page.buylife.xyz",
    },
    { status: 410 },
  );
}
