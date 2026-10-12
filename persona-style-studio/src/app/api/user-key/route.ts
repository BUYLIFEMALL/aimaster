import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey, saveUserGeminiApiKey, maskApiKey } from "@/lib/apiKeys";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const key = await getUserGeminiApiKey(auth.user.id);
  return NextResponse.json({
    hasKey: !!key,
    maskedKey: key ? maskApiKey(key) : null,
  });
}

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "올바른 API 키를 입력해주세요." }, { status: 400 });
    }

    const res = await saveUserGeminiApiKey(auth.user.id, apiKey);
    if (!res.success) {
      return NextResponse.json({ error: res.error || "키 저장 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true, maskedKey: maskApiKey(apiKey) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "처리 중 오류 발생" }, { status: 500 });
  }
}
