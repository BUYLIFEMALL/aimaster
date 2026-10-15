import { NextRequest, NextResponse } from "next/server";
import { verifyPersonalAccessTokenWithProgramAccess } from "@/lib/personalAccessTokenAuth";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateReviewedBlogDraft } from "@/lib/naverBlogAutoPoster/generate";
import { generateBlogImage } from "@/lib/naverBlogAutoPoster/generateImage";
import { createServiceClient } from "@/lib/supabase/service";

// 데스크톱 앱이 주제를 보내면 서버가 사용자 본인의 OpenAI/Gemini 키(user_api_keys,
// resolveApiKey)로 대신 AI를 호출하고 결과(제목/본문/이미지)만 돌려준다 — 원문 API 키는
// 데스크톱 앱에 절대 내려주지 않는다(CLAUDE.md 멀티테넌시 원칙 3번, "본인 키는 서버에서만
// 사용"). 글은 1차 초안 -> 2차 셀프 리뷰 순서로 만든다(README 참고 사례의 2단계 구조).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "naver-blog-auto-poster";

export async function POST(request: NextRequest) {
  const result = await verifyPersonalAccessTokenWithProgramAccess(request, PROGRAM_SLUG);
  if (!result) {
    return NextResponse.json(
      { error: "유효하지 않은 토큰이거나 이 프로그램 이용 권한이 없습니다." },
      { status: 401 }
    );
  }
  const auth = result.token;

  const body = await request.json().catch(() => ({}));
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const includeImage = Boolean(body.includeImage);
  const imageModel = typeof body.imageModel === "string" ? body.imageModel : "nanobanana-2-2k";
  if (!topic) {
    return NextResponse.json({ error: "주제를 입력해주세요." }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const openaiKey = await resolveApiKey(serviceClient, auth.userId, "openai");
  if (!openaiKey) {
    return NextResponse.json(
      { error: "OpenAI API 키가 없습니다. www.buylife.xyz의 'API 설정' 페이지에서 본인 키를 등록해주세요." },
      { status: 400 }
    );
  }

  let draft;
  try {
    draft = await generateReviewedBlogDraft({ apiKey: openaiKey, topic });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }

  if (!includeImage) {
    return NextResponse.json({ ...draft, image: null });
  }

  const geminiKey = await resolveApiKey(serviceClient, auth.userId, "gemini");
  if (!geminiKey) {
    return NextResponse.json({
      ...draft,
      image: null,
      imageError: "Gemini API 키가 없어 이미지는 생성하지 못했습니다. www.buylife.xyz의 'API 설정'에서 등록해주세요.",
    });
  }

  try {
    const image = await generateBlogImage({ apiKey: geminiKey, topic, model: imageModel });
    return NextResponse.json({ ...draft, image });
  } catch (error) {
    return NextResponse.json({
      ...draft,
      image: null,
      imageError: error instanceof Error ? error.message : String(error),
    });
  }
}
