import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { GoogleGenAI } from "@google/genai";
import { koreaNowRule } from "@/lib/koreaNowRule";
import { createAdminClient } from "@/lib/supabase/admin";
import { compatibleCredentials } from "@/lib/compatibleChat/keyStore";
import { compatibleChat } from "@/lib/compatibleChat/transport";
import { CompatibleChatError } from "@/lib/compatibleChat/config";

// 2026-10-21 병합 C: 옛 프롬프트 템플릿 앱의 /api/execute-prompt에서 옮김(캐시 방지 두 줄 추가).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { promptText, systemInstruction, provider, model } = await req.json();
    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json({ error: "실행할 프롬프트 내용이 없습니다." }, { status: 400 });
    }

    if (systemInstruction !== undefined && typeof systemInstruction !== "string") return NextResponse.json({ error: "역할 지침은 글로 입력해 주세요." }, { status: 400 });
    const currentYear = new Date().getFullYear();
    const baseInstruction = systemInstruction
      ? `${systemInstruction}\n(현재 기준 연도: ${currentYear}년)\n${koreaNowRule()}`
      : `당신은 최고 수준의 AI 어시스턴트입니다. 사용자의 요청에 친절하고 전문적으로 한국어로 답변하세요. (기준 연도: ${currentYear}년) ${koreaNowRule()}`;

    if (provider !== undefined && provider !== "gemini") {
      if (promptText.length > 40_000 || (systemInstruction?.length ?? 0) > 10_000) return NextResponse.json({ error: "실행할 내용을 조금 줄여 주세요." }, { status: 400 });
      const credentials = await compatibleCredentials(createAdminClient(), auth.user.id, provider, model);
      const result = await compatibleChat({ ...credentials, messages: [{ role: "system", content: baseInstruction }, { role: "user", content: promptText }], temperature: 0.7, signal: req.signal });
      return NextResponse.json({ success: true, text: result.text, provider: credentials.provider, model: result.model });
    }
    if (model !== undefined && model !== "gemini-2.5-flash") return NextResponse.json({ error: "지원하는 Gemini 실행 모델을 선택해 주세요." }, { status: 400 });
    // 기존 Gemini 실행은 본인 Gemini 키만 사용한다. 새 공급자를 골랐을 때는 이 키를 요구하지 않는다.
    const apiKey = await getUserGeminiApiKey(auth.user.id);
    if (!apiKey) return NextResponse.json({ error: "본인의 Google Gemini API 키가 없습니다. API키등록·플랫폼연동에서 등록해 주세요.", needApiKey: true }, { status: 400 });
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
    if (err instanceof CompatibleChatError) return NextResponse.json({ error: err.message, needApiKey: err.needApiKey }, { status: err.status });
    console.error("[execute-prompt] Error:", err);
    let errorMessage = err.message || "AI 응답 생성 중 오류가 발생했습니다.";
    if (errorMessage.includes("API_KEY_INVALID") || err.status === 400 || err.status === 403) {
      errorMessage = "등록된 Gemini API 키가 유효하지 않거나 만료되었습니다. API 키를 다시 확인해주세요.";
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
