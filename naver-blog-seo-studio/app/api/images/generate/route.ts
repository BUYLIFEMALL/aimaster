import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createClient } from "@/lib/supabase/server";
import { generateNanoBananaImage } from "@/lib/ai/nanoBanana";
import { getUserGeminiImageModel } from "@/lib/ai/geminiModels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const input = await request.json().catch(() => null) as { topic?: string; title?: string; keywords?: string; model?: string } | null;
  const topic = input?.topic?.trim() ?? "";
  if (!topic || topic.length > 300) return NextResponse.json({ error: "이미지 주제를 1~300자로 입력해주세요." }, { status: 400 });
  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, access.user.id, "gemini");
  if (!apiKey) return NextResponse.json({ code: "API_KEY_REQUIRED", error: "나노바나나 이미지 생성을 위해 Gemini API 키를 먼저 등록해주세요." }, { status: 400 });
  try {
    const image = await generateNanoBananaImage({ apiKey, topic, title: input?.title, keywords: input?.keywords, model: input?.model ?? getUserGeminiImageModel(access.user.user_metadata) });
    return NextResponse.json({ image: { dataUrl: `data:${image.mimeType};base64,${image.base64}`, mimeType: image.mimeType, model: image.model } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "이미지 생성에 실패했습니다." }, { status: 502 });
  }
}
