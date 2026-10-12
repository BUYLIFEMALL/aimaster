import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { detectAudioType, analyzeSpeech, analyzeMusic } from "@/lib/gemini";
import { AnalysisMode } from "@/lib/types";

export const maxDuration = 60; // 60 seconds timeout for long audio analysis

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 1. 회원 본인 Gemini API 키 확인 (Rule 00 최상위 규칙 준수)
    const apiKey = await getUserGeminiApiKey(user.id);
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "회원 본인의 Google Gemini API 키가 등록되어 있지 않습니다. 좌측 메뉴의 [API키등록·플랫폼연동]에서 본인 키를 등록해주세요.",
          needKey: true,
        },
        { status: 400 }
      );
    }

    // 2. FormData 파싱
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as AnalysisMode) || "auto";
    const context = (formData.get("context") as string) || "";
    const specialRequest = (formData.get("specialRequest") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "오디오 파일이 전달되지 않았습니다." }, { status: 400 });
    }

    // 3. 파일 바이너리를 Base64로 인코딩
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "audio/mp3";

    // 4. 모드 판별 및 분석 분기
    let targetMode: "speech" | "music" = "speech";
    if (mode === "auto") {
      try {
        targetMode = await detectAudioType(apiKey, base64Data, mimeType);
      } catch (err) {
        console.warn("Auto detect failed, fallback to speech:", err);
        targetMode = "speech";
      }
    } else {
      targetMode = mode;
    }

    // 5. 정밀 분석 실행
    if (targetMode === "speech") {
      const speechData = await analyzeSpeech(apiKey, base64Data, mimeType, context, specialRequest);
      return NextResponse.json({
        success: true,
        mode: "speech",
        data: speechData,
      });
    } else {
      const musicData = await analyzeMusic(apiKey, base64Data, mimeType, context, specialRequest);
      return NextResponse.json({
        success: true,
        mode: "music",
        data: musicData,
      });
    }
  } catch (err: unknown) {
    console.error("Audio analysis API error:", err);
    const message = err instanceof Error ? err.message : "오디오 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
