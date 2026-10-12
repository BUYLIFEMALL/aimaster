import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    const body = await req.json();
    const {
      bookTitle,
      chapterIndex = 1,
      chapterTitle,
      chapterSummary,
      keyPoints = [],
      sourceContext = "",
      mode = "detailed",
      apiKey: clientKey,
      model = "gemini-2.5-flash",
    } = body;

    if (!chapterTitle) {
      return NextResponse.json({ error: "작성할 챕터 제목이 필요합니다." }, { status: 400 });
    }

    // 최상위 불변 규칙: 회원 본인의 API 키 조회
    let finalApiKey = clientKey?.trim();
    if (!finalApiKey && user) {
      const adminSupabase = createAdminClient();
      const { data } = await adminSupabase
        .from("user_api_keys")
        .select("api_key")
        .eq("user_id", user.id)
        .eq("provider", "gemini")
        .maybeSingle();
      if (data?.api_key) {
        finalApiKey = data.api_key;
      }
    }

    if (!finalApiKey) {
      return NextResponse.json(
        { error: "Google Gemini API 키가 필요합니다. 설정에서 회원님의 API 키를 등록해주세요." },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();

    let styleGuide = "";
    if (mode === "detailed") {
      styleGuide = "충실하고 깊이 있는 해설: 소제목(###) 3~4개로 나누어 실전 예시, 구체적 실행 지침, 흥미로운 비유와 맥락을 풍부하게 담아 1,500자 이상의 알찬 분량으로 집필하세요.";
    } else if (mode === "concise") {
      styleGuide = "간결하고 명쾌한 정리: 군더더기 서술을 배제하고 핵심 요약, 불릿 포인트, 실행 매뉴얼 중심의 브리핑 스타일로 800~1,200자 분량으로 집필하세요.";
    } else {
      styleGuide = "원문의 표현과 논리적 맥락을 살리되, 독자가 읽기 편한 매끄러운 단락과 가독성 높은 마크다운 서식으로 재정리하세요.";
    }

    const prompt = `당신은 출판 전문가이자 베스트셀러 작가입니다.
전자책 『${bookTitle || "디지털 북"}』의 제${chapterIndex}장 본문을 집필해주세요.

[현재 기준 연도]
반드시 현재 연도인 ${currentYear}년을 기준으로 최신 트렌드와 정보를 반영하세요.

[챕터 정보]
- 챕터명: ${chapterTitle}
- 챕터 기획 의도/요약: ${chapterSummary || "기획 의도에 맞게 풍부하게 작성"}
- 포함할 핵심 키워드/포인트: ${keyPoints.join(", ")}

[원문 참고 자료 발췌]
${sourceContext.slice(0, 10000)}

[집필 가이드]
${styleGuide}
- 본문은 자연스러운 한국어 줄글과 마크다운(소제목 ###, 강조 **, 인용문 > 등)을 적절히 혼합하여 가독성을 높이세요.
- 챕터 말미에 독자가 책을 덮고 기억해야 할 [핵심 인사이트 3가지]와 스스로 답을 찾아보는 [생각하고 실천하기 질문 2~3가지]를 함께 작성하세요.

[출력 요구사항]
반드시 다음 JSON 형식으로만 응답하세요:
{
  "title": "${chapterTitle}",
  "summary": "이 챕터의 핵심 요약 (1~2문장)",
  "content": "### 소제목 1\\n본문 내용...\\n\\n### 소제목 2\\n본문 내용...",
  "takeaways": [
    "핵심 인사이트 1",
    "핵심 인사이트 2",
    "핵심 인사이트 3"
  ],
  "questions": [
    "실천 및 점검 질문 1",
    "실천 및 점검 질문 2"
  ]
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${finalApiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Gemini API 호출 실패 (${response.status}): ${errText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      return NextResponse.json({ error: "AI로부터 응답을 받지 못했습니다." }, { status: 500 });
    }

    const cleanedJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);

    return NextResponse.json({ success: true, chapter: parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "챕터 집필 중 오류가 발생했습니다." }, { status: 500 });
  }
}
