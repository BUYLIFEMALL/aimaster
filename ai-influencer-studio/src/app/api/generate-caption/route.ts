import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { generateInstagramCaption } from "@/lib/gemini";
import type { InfluencerConfig } from "@/types/influencer";

export const maxDuration = 30;

export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const apiKey = await getUserGeminiApiKey(auth.user.id);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Google Gemini API 키가 등록되어 있지 않습니다.",
        needApiKey: true,
      },
      { status: 400 }
    );
  }

  try {
    const { config, refinementRequest }: { config: InfluencerConfig; refinementRequest?: string } =
      await req.json();

    const captions = await generateInstagramCaption(apiKey, config, refinementRequest);

    return NextResponse.json({ success: true, captions });
  } catch (err: any) {
    console.error("Generate Caption API Error:", err);
    return NextResponse.json(
      { error: err.message || "캡션 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
