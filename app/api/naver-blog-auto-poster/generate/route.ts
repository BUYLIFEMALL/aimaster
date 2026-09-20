import { NextRequest, NextResponse } from "next/server";
import { verifyPersonalAccessToken } from "@/lib/personalAccessTokenAuth";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateBlogDraft } from "@/lib/naverBlogAutoPoster/generate";
import { createServiceClient } from "@/lib/supabase/service";

// 데스크톱 앱이 주제를 보내면 서버가 사용자 본인의 OpenAI 키(user_api_keys, resolveApiKey)로
// 대신 AI를 호출하고 결과(제목/본문)만 돌려준다 — 원문 API 키는 데스크톱 앱에 절대 내려주지
// 않는다(CLAUDE.md 멀티테넌시 원칙 3번, "본인 키는 서버에서만 사용").
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "naver-blog-auto-poster";

export async function POST(request: NextRequest) {
  const auth = await verifyPersonalAccessToken(request, PROGRAM_SLUG);
  if (!auth) {
    return NextResponse.json({ error: "유효하지 않거나 폐기된 토큰입니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (!topic) {
    return NextResponse.json({ error: "주제를 입력해주세요." }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const apiKey = await resolveApiKey(serviceClient, auth.userId, "openai");
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API 키가 없습니다. www.buylife.xyz의 'API 설정' 페이지에서 본인 키를 등록해주세요." },
      { status: 400 }
    );
  }

  try {
    const draft = await generateBlogDraft({ apiKey, topic });
    return NextResponse.json(draft);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
