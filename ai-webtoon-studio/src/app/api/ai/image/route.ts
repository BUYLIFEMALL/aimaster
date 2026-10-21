import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { generateGeminiImage } from "@/lib/geminiImage";
import { getMemberGeminiKey, NO_KEY_MESSAGE } from "@/lib/serverAi";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 150;

// 이미지 생성 대행(v1.27): 예전 브라우저 호출과 같은 모델·화질(1K)·시간 제한(120초)·재시도 없음(이중 과금 방지).
// 결과는 data URL로 돌려준다(1K라 응답 한도 4.5MB 안). 실패하면 브라우저가 기존처럼 무료 대체 그림으로 넘어간다.
export async function POST(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  const aspectRatio = body?.aspectRatio === "4:3" ? "4:3" : "3:4";
  if (!prompt.trim() || prompt.length > 8_000) {
    return NextResponse.json({ error: "프롬프트가 비었거나 너무 깁니다." }, { status: 400 });
  }

  const apiKey = await getMemberGeminiKey(access.user.id);
  if (!apiKey) return NextResponse.json({ error: NO_KEY_MESSAGE, noKey: true }, { status: 400 });

  try {
    const image = await generateGeminiImage({
      apiKey,
      modelName: "gemini-nano-banana-2.1",
      prompt,
      aspectRatio,
      imageSize: "1K",
      timeoutMs: 120_000,
      retries: 0,
    });
    return NextResponse.json({ dataUrl: `data:${image.mimeType || "image/png"};base64,${image.base64}` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "이미지 생성에 실패했습니다." }, { status: 502 });
  }
}
