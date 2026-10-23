import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { callGeminiTextServer, getMemberGeminiKey, NO_KEY_MESSAGE } from "@/lib/serverAi";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// 글 생성 대행(v1.27): 브라우저가 프롬프트만 보내고, 서버가 회원 본인 키로 Gemini를 부른다.
export async function POST(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  if (!prompt.trim() || prompt.length > 40_000) {
    return NextResponse.json({ error: "프롬프트가 비었거나 너무 깁니다." }, { status: 400 });
  }

  const apiKey = await getMemberGeminiKey(access.user.id);
  if (!apiKey) return NextResponse.json({ error: NO_KEY_MESSAGE, noKey: true }, { status: 400 });

  try {
    const text = await callGeminiTextServer(apiKey, prompt);
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "글 생성에 실패했습니다." }, { status: 502 });
  }
}
