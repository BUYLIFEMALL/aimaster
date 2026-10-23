import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** 한국 시간 기준 현재 연·월 지침(계절 착오 방지, docs/ERROR_LESSONS.md 2026-10-14). 서버가 UTC여도 한국 날짜를 쓴다. */
function koreaNowRule(now: Date = new Date()): string {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(now).split("-");
  return `[기준 시점: 한국 시간으로 지금은 ${y}년 ${Number(m)}월입니다. 계절·시기 표현(봄·여름·가을·겨울, 명절, 연말연시 등)은 현재 월에 맞추고, 근거 없이 다른 계절을 쓰지 마세요.]`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    const body = await req.json();
    const { sourceText, title, subtitle, author, mode = "detailed", apiKey: clientKey, model = "gemini-2.5-flash" } = body;

    if (!sourceText || typeof sourceText !== "string" || !sourceText.trim()) {
      return NextResponse.json({ error: "전자책으로 변환할 원본 문서나 텍스트를 입력해주세요." }, { status: 400 });
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

    let modeInstruction = "";
    if (mode === "detailed") {
      modeInstruction = "맥락과 사례까지 충실하게: 원문의 핵심 아이디어를 풍부하게 확장하고 실전 예시와 배경 설명을 살려 알찬 챕터로 구성합니다.";
    } else if (mode === "concise") {
      modeInstruction = "중요한 내용만 간결하게: 군더더기를 걷어내고 핵심 인사이트와 실행 포인트 위주의 브리핑/요약 노트 형태로 챕터를 구성합니다.";
    } else {
      modeInstruction = "낱말은 그대로, 서식만 다시: 원문의 흐름과 논리를 최대한 유지하면서 독자가 읽기 편한 장(Chapter) 구조로 깔끔하게 정리합니다.";
    }

    const prompt = `당신은 출판 전문가이자 베스트셀러 전자책 에디터입니다.
주어진 원문 자료를 분석하여, 독자가 몰입하여 읽을 수 있는 한 권의 완성도 높은 전자책 목차(아웃라인)를 기획해주세요.

[현재 기준 연도]
반드시 현재 연도인 ${currentYear}년을 기준으로 최신 트렌드와 시각을 적용하세요.
${koreaNowRule()}

[정리 방향]
${modeInstruction}

[기존 정보]
- 희망 제목: ${title || "자료 기반 매력적인 제목 생성 필요"}
- 희망 부제: ${subtitle || "제목을 뒷받침하는 강력한 부제 생성 필요"}
- 저자명: ${author || "작성자/저자명 미정"}

[원문 자료 발췌]
${sourceText.slice(0, 15000)}

[출력 요구사항]
반드시 다음 JSON 규격으로만 응답하세요. 백틱(\`\`\`json)으로 감싸지 말고 순수 JSON 문자열만 출력하세요:
{
  "title": "최종 확정 전자책 제목",
  "subtitle": "최종 확정 부제",
  "author": "저자명",
  "suggestedTitles": ["제목 후보 1", "제목 후보 2", "제목 후보 3"],
  "suggestedSubtitles": ["부제 후보 1", "부제 후보 2", "부제 후보 3"],
  "chapters": [
    {
      "title": "1장 제목",
      "summary": "이 장에서 다루는 핵심 내용 요약 (1~2문장)",
      "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]
    }
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

    return NextResponse.json({ success: true, result: parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "목차 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
