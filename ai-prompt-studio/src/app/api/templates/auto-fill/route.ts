import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { GoogleGenAI, Type } from "@google/genai";
import { koreaNowRule } from "@/lib/koreaNowRule";

// 2026-10-21 병합 C: 옛 프롬프트 템플릿 앱의 /api/auto-fill에서 옮김(캐시 방지 두 줄 추가).
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
    const { title, description, variables } = (await req.json()) as {
      title: string;
      description?: string;
      variables: string[];
    };

    if (!variables || variables.length === 0) {
      return NextResponse.json({ success: true, values: {} });
    }

    const currentYear = new Date().getFullYear();
    const prompt = `
당신은 최고의 프롬프트 엔지니어입니다. (기준 연도: ${currentYear}년)
${koreaNowRule()}
아래 프롬프트 정보와 변수 목록을 바탕으로, 실제 테스트나 실행에 바로 사용할 수 있는 가장 현실적이고 창의적이며 구체적인 한국어 예시 입력값을 작성해주세요.

프롬프트 정보:
- 제목: ${title || "미지정"}
- 설명: ${description || "없음"}
- 변수 목록: ${variables.join(", ")}

지침:
1. 각 변수(variable)에 꼭 어울리는 풍부하고 실전적인 예시 내용을 만들어주세요.
2. 코드가 필요한 변수(code, requirements 등)는 실제 실행 가능한 깔끔한 코드를 예시로 넣어주세요.
3. 반드시 변수명을 key로 하고, 예시 내용을 value(string)로 하는 JSON 객체로만 응답하세요.
`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const text = response.text || "{}";
    const values = JSON.parse(text);

    return NextResponse.json({ success: true, values });
  } catch (err: any) {
    console.error("[auto-fill] Error:", err);
    return NextResponse.json(
      { error: err.message || "변수 자동 채우기 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
