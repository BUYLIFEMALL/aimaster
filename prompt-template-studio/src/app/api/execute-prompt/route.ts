import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { GoogleGenAI } from "@google/genai";
import { koreaNowRule } from "@/lib/koreaNowRule";

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed || !auth.user) {
    return NextResponse.json({ error: auth.error || "로그인이 필요합니다." }, { status: auth.status || 401 });
  }

  // 최상위 절대 규칙: 회원 본인 Gemini API 키 연동
  const apiKey = await getUserGeminiApiKey(auth.user.id);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "본인의 Google Gemini API 키가 등록되지 않았습니다. 좌측 메뉴의 '🔑 API키등록·플랫폼연동'에서 본인 API 키를 먼저 등록해주세요.",
        needApiKey: true,
      },
      { status: 400 }
    );
  }

  try {
    const { promptText, systemInstruction } = await req.json();
    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json({ error: "실행할 프롬프트 내용이 없습니다." }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const baseInstruction = systemInstruction
      ? `${systemInstruction}\n(현재 기준 연도: ${currentYear}년)\n${koreaNowRule()}`
      : `당신은 최고 수준의 AI 어시스턴트입니다. 사용자의 요청에 친절하고 전문적으로 한국어로 답변하세요. (기준 연도: ${currentYear}년) ${koreaNowRule()}`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        systemInstruction: baseInstruction,
        temperature: 0.7,
      },
    });

    const resultText = response.text || "생성된 내용이 없습니다.";
    return NextResponse.json({ success: true, text: resultText });
  } catch (err: any) {
    console.error("[execute-prompt] Error:", err);
    let errorMessage = err.message || "AI 응답 생성 중 오류가 발생했습니다.";
    if (errorMessage.includes("API_KEY_INVALID") || err.status === 400 || err.status === 403) {
      errorMessage = "등록된 Gemini API 키가 유효하지 않거나 만료되었습니다. API 키를 다시 확인해주세요.";
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
