import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveAvailableAI } from "@/lib/apiKeys";
import { runBlogGenerationPipeline } from "@/lib/ai/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWritingTone, isWritingStyle } from "@/lib/ai/writingStyles";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };
    const body = await req.json();
    const {
      topic,
      category,
      searchKeywords,
      publishPurpose,
      preferredTone,
      writingStyle,
      provider,
      persona,
      targetLength,
    } = body;

    if (!category) {
      return NextResponse.json({ error: "카테고리를 입력해주세요." }, { status: 400 });
    }

    if ((preferredTone !== undefined && !isWritingTone(preferredTone)) ||
        (writingStyle !== undefined && !isWritingStyle(writingStyle))) {
      return NextResponse.json({ error: "지원하는 말끝과 문체를 선택해 주세요." }, { status: 400 });
    }

    const targetProvider = body.engine?.provider || provider;
    // 1. 사용자 AI 키 조회
    const ai = await resolveAvailableAI(user.id, targetProvider);
    if (!ai) {
      return NextResponse.json(
        {
          error: "등록된 AI API 키가 없습니다. [API키등록·플랫폼연동] 메뉴에서 OpenAI, Gemini, 또는 Claude 키를 먼저 등록해주세요.",
          needKey: true,
        },
        { status: 400 }
      );
    }

    // 2. 5단계 AI 글 생성 파이프라인 실행
    const result = await runBlogGenerationPipeline({
      topic,
      category,
      searchKeywords,
      publishPurpose,
      preferredTone,
      writingStyle,
      persona,
      targetLength: typeof targetLength === "number" ? targetLength : undefined,
      aiConfig: {
        provider: ai.provider,
        apiKey: ai.apiKey,
        model: body.engine?.model,
      },
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error?.message || "글 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
