import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserGeminiApiKey, saveUserGeminiApiKey } from "@/lib/apiKeys";
import { GoogleGenAI } from "@google/genai";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const key = await getUserGeminiApiKey(user.id);
  if (!key) {
    return NextResponse.json({ hasKey: false, maskedKey: null });
  }

  const masked = key.length > 8 ? `${key.slice(0, 4)}••••${key.slice(-4)}` : "••••••••";
  return NextResponse.json({
    hasKey: true,
    maskedKey: masked,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json({ error: "API 키를 입력해주세요." }, { status: 400 });
    }

    const trimmed = apiKey.trim();

    // 키 유효성 테스트 (gemini-2.5-flash ping)
    try {
      const ai = new GoogleGenAI({ apiKey: trimmed });
      const resp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hello, reply with OK.",
      });
      if (!resp.text) throw new Error("응답이 비어있습니다.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "API 키 검증 실패";
      return NextResponse.json(
        { error: `유효하지 않은 Google Gemini API 키입니다. (${msg})` },
        { status: 400 }
      );
    }

    const saved = await saveUserGeminiApiKey(user.id, trimmed);
    if (!saved.success) {
      return NextResponse.json({ error: "API 키 저장에 실패했습니다." }, { status: 500 });
    }

    const masked = trimmed.length > 8 ? `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}` : "••••••••";
    return NextResponse.json({
      success: true,
      hasKey: true,
      maskedKey: masked,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
