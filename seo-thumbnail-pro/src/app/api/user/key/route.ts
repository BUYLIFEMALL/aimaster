import { NextResponse } from "next/server";

// 2026-10-20 v1.12 병합 D: 이 주소는 회원 Gemini 키 원문을 브라우저로 돌려주던 API였다.
// 기능이 「AI 썸네일·SEO 자동화」(thumbnail-master, 키는 서버에서만 사용)로 옮겨졌으므로 더 이상 키를 읽거나 저장하지 않는다.
// 키 등록은 합친 앱의 [API키등록·플랫폼연동]에서 한다(같은 user_api_keys 값을 그대로 씀).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const GONE = {
  error: "이 프로그램은 「AI 썸네일·SEO 자동화」로 합쳐졌습니다. https://thumbnail-master.buylife.xyz/seo 에서 이용해 주세요.",
  moved: "https://thumbnail-master.buylife.xyz/seo",
};

export async function GET() {
  return NextResponse.json(GONE, { status: 410 });
}

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}
