import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { resolveAvailableAI } from "@/lib/apiKeys";
import { runBlogGenerationPipeline } from "@/lib/ai/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const {
      topic,
      category,
      searchKeywords,
      publishPurpose,
      preferredTone,
      provider,
      persona,
      targetLength,
    } = body;

    if (!category) {
      return NextResponse.json({ error: "카테고리를 입력해주세요." }, { status: 400 });
    }

    // 1. 사용자 AI 키 조회
    const ai = await resolveAvailableAI(user.id, provider);
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
      persona,
      targetLength: typeof targetLength === "number" ? targetLength : undefined,
      aiConfig: {
        provider: ai.provider,
        apiKey: ai.apiKey,
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
