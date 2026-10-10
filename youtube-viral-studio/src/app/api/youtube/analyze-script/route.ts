import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getUserApiKey } from "@/lib/apiKeys";
import { fetchVideoTranscript } from "@/lib/youtube/transcript";
import { analyzeShortsScript } from "@/lib/ai/scriptAnalyzer";

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { videoId, title, description } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: "영상 ID가 필요합니다." }, { status: 400 });
    }

    // 회원 본인의 AI API 키 조회
    const geminiKey = await getUserApiKey(user.id, "gemini");
    const openaiKey = await getUserApiKey(user.id, "openai");

    if (!geminiKey && !openaiKey) {
      return NextResponse.json(
        {
          error:
            "쇼츠 AI 대본 분석을 실행하려면 본인의 Google Gemini 또는 OpenAI API 키가 필요합니다. [설정 > YouTube API 키] 메뉴에서 AI 키를 등록해주세요.",
          needAiKey: true,
        },
        { status: 400 }
      );
    }

    // 1. 자막 추출 시도
    const transcriptResult = await fetchVideoTranscript(videoId);

    // 2. AI 3단 구조 분석 수행
    const analysis = await analyzeShortsScript({
      videoId,
      title: title || "쇼츠 영상",
      description: description || "",
      transcript: transcriptResult.transcript,
      geminiKey,
      openaiKey,
    });

    return NextResponse.json({
      success: true,
      analysis,
      hasSubtitles: transcriptResult.hasSubtitles,
    });
  } catch (err: any) {
    console.error("analyze-script error:", err);
    return NextResponse.json(
      { error: err.message || "쇼츠 대본 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
