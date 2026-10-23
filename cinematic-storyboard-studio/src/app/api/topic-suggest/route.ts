import { NextRequest, NextResponse } from "next/server";
import { decodeImage, requireAccessAndKey } from "@/lib/routeGuard";
import { generateText } from "@/lib/gemini";
import { buildTopicPrompt } from "@/lib/storyboard/prompts";
import { LIMITS } from "@/lib/storyboard/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** POST — 업로드한 이미지와 사용자가 적은 키워드로 로그라인(주제) 한 문장을 제안한다 */
export async function POST(req: NextRequest) {
  const a = await requireAccessAndKey();
  if (a.error) return a.error;
  const body = await req.json().catch(() => null);
  const img = decodeImage(body?.image, LIMITS.maxImageBytes);
  if (!img) return NextResponse.json({ error: "이미지를 읽지 못했습니다." }, { status: 400 });
  const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, LIMITS.topic) : "";
  const result = await generateText(a.apiKey, [
    { inlineData: { mimeType: typeof body?.mime === "string" && body.mime.startsWith("image/") ? body.mime : "image/jpeg", data: img.toString("base64") } },
    { text: buildTopicPrompt({ topic, lang: body?.lang === "en" ? "en" : "ko" }) },
  ]);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ topic: result.data.replace(/^["'“]|["'”]$/g, "").slice(0, LIMITS.topic) });
}
