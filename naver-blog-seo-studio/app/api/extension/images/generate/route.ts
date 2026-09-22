import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { resolveApiKey } from "@/lib/apiKeys";
import { createServiceClient } from "@/lib/supabase/service";
import { generateNanoBananaImage } from "@/lib/ai/nanoBanana";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  const input = await request.json().catch(() => null) as { topic?: string; title?: string; keywords?: string; model?: string } | null;
  const topic = input?.topic?.trim() ?? "";
  if (!topic || topic.length > 300) return NextResponse.json({ error: "이미지 주제를 1~300자로 입력해주세요." }, { status: 400 });
  const supabase = createServiceClient();
  const apiKey = await resolveApiKey(supabase, user.userId, "gemini");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "나노바나나 이미지 생성을 위해 Gemini API 키를 먼저 등록해주세요." }, { status: 400 });
  try {
    const image = await generateNanoBananaImage({ apiKey, topic, title: input?.title, keywords: input?.keywords, model: input?.model });
    return NextResponse.json({ image: { dataUrl: `data:${image.mimeType};base64,${image.base64}`, mimeType: image.mimeType, model: image.model } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "이미지 생성에 실패했습니다." }, { status: 502 });
  }
}
