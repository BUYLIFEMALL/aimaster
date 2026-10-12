import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { autoSearchProductInfo } from "@/lib/detailEngine";

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed || !auth.user) {
    return NextResponse.json({ error: auth.error || "로그인이 필요합니다." }, { status: auth.status || 401 });
  }

  // 최상위 절대 규칙: 본인 API 키 사용
  const userApiKey = await getUserGeminiApiKey(auth.user.id);
  if (!userApiKey) {
    return NextResponse.json(
      {
        error: "본인의 Gemini API 키가 등록되지 않았습니다. 좌측 메뉴의 '🔑 API키등록·플랫폼연동'에서 본인 API 키를 먼저 등록해주세요.",
        needApiKey: true,
      },
      { status: 400 }
    );
  }

  try {
    const { productName } = await req.json();
    if (!productName || !productName.trim()) {
      return NextResponse.json({ error: "제품명을 입력해주세요." }, { status: 400 });
    }

    const result = await autoSearchProductInfo(userApiKey, productName.trim());
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("[auto-search] Error:", err);
    return NextResponse.json(
      { error: err.message || "스펙 자동검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
