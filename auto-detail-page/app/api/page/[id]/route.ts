import { NextResponse } from "next/server";

// v1.21(2026-10-21, 이커머스 병합 E2): 상세페이지 자동화(shop-detail-page)의 HTML 내보내기로 합쳐져 닫는다(410).
export async function GET() {
  return NextResponse.json(
    {
      error: "상세페이지 자동생성기 v1은 「상세페이지 자동화」로 합쳐졌습니다. https://shop-detail-page.buylife.xyz 상품 화면의 「HTML 상세페이지로 내보내기」를 이용해 주세요.",
      movedTo: "https://shop-detail-page.buylife.xyz",
    },
    { status: 410 },
  );
}
