import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { GoogleGenAI } from "@google/genai";
import { koreaNowRule } from "@/lib/koreaNowRule";

// 2026-10-21 병합 C: 옛 프롬프트 템플릿 앱의 /api/suggest-field에서 옮김(캐시 방지 두 줄 추가).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const apiKey = await getUserGeminiApiKey(auth.user.id);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "본인의 Gemini API 키가 필요합니다. 좌측 메뉴에서 API 키를 등록해주세요.",
        needApiKey: true,
      },
      { status: 400 }
    );
  }

  try {
    const { field, title, description, content, category } = (await req.json()) as {
      field: "title" | "description" | "content";
      title?: string;
      description?: string;
      content?: string;
      category?: string;
    };

    const currentYear = new Date().getFullYear();
    const context = `
현재 작성 중인 프롬프트 정보 (기준 연도: ${currentYear}년):
${koreaNowRule()}
- 제목: ${title || "미작성"}
- 설명: ${description || "미작성"}
- 내용: ${content || "미작성"}
- 카테고리: ${category || "전체"}
`;

    let instruction = "";
    if (field === "title") {
      instruction = `${context}
위 정보를 바탕으로 이 프롬프트 템플릿에 어울리는 짧고 직관적인 '제목'을 1개만 추천해주세요. 따옴표나 부가 설명 없이 오직 한 줄의 제목 텍스트만 출력하세요.`;
    } else if (field === "description") {
      instruction = `${context}
위 정보를 바탕으로 이 프롬프트 템플릿의 용도와 특징을 설명하는 한 문장의 '설명'을 작성해주세요. 부가 설명 없이 설명 텍스트만 출력하세요.`;
    } else if (field === "content") {
      instruction = `${context}
위 제목과 설명을 바탕으로 실제 LLM(ChatGPT, Claude 등)에게 명령할 구체적이고 완성도 높은 '프롬프트 템플릿 본문'을 작성해주세요.
- 사용자가 상황에 따라 값을 입력해야 하는 부분은 반드시 {{변수명}} 형태(예: {{topic}}, {{tone}}, {{audience}}, {{language}} 등)로 작성하세요.
- 마크다운 코드 블록 없이 순수 프롬프트 템플릿 텍스트로만 출력하세요.`;
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: instruction,
      config: { temperature: 0.7 },
    });

    const text = response.text?.replace(/^```(markdown|text)?\n|```$/g, "").trim() || "";
    return NextResponse.json({ success: true, text });
  } catch (err: any) {
    console.error("[suggest-field] Error:", err);
    return NextResponse.json(
      { error: err.message || "AI 제안 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
