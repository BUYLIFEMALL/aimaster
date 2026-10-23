import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { detectAudioType, analyzeSpeech, analyzeMusic } from "@/lib/gemini";
import { deleteGeminiFile, isAllowedFileRef, waitUntilActive } from "@/lib/geminiFiles";
import { AnalysisMode } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300; // 긴 녹음 분석 대비

// 오디오 분석: 파일은 /api/upload/start·chunk로 회원 본인 Gemini 파일 저장소에 먼저 올리고,
// 여기서는 그 파일 주소(fileUri)로 분석한다(Vercel 본문 한도 4.5MB 회피). 분석 뒤 파일은 지운다.
export async function POST(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // 1. 회원 본인 Gemini API 키 확인 (Rule 00 최상위 규칙 준수)
  const apiKey = await getUserGeminiApiKey(access.user.id);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "회원 본인의 Google Gemini API 키가 등록되어 있지 않습니다. 좌측 메뉴의 [API키등록·플랫폼연동]에서 본인 키를 등록해주세요.",
        needKey: true,
      },
      { status: 400 }
    );
  }

  let fileName = "";
  try {
    // 2. 올린 파일 정보 확인
    const body = (await req.json()) as {
      fileName?: string;
      fileUri?: string;
      mimeType?: string;
      mode?: AnalysisMode;
      context?: string;
      specialRequest?: string;
    };
    fileName = typeof body.fileName === "string" ? body.fileName : "";
    const fileUri = typeof body.fileUri === "string" ? body.fileUri : "";
    const mimeType = typeof body.mimeType === "string" && body.mimeType.startsWith("audio/") ? body.mimeType : "audio/mp3";
    const mode: AnalysisMode = body.mode === "speech" || body.mode === "music" ? body.mode : "auto";
    const context = typeof body.context === "string" ? body.context.slice(0, 2000) : "";
    const specialRequest = typeof body.specialRequest === "string" ? body.specialRequest.slice(0, 2000) : "";

    if (!isAllowedFileRef(fileName, fileUri)) {
      fileName = "";
      return NextResponse.json({ error: "오디오 파일이 전달되지 않았습니다. 파일을 다시 올려주세요." }, { status: 400 });
    }

    // 3. Google이 파일 처리를 끝낼 때까지 대기
    await waitUntilActive(apiKey, fileName);

    // 4. 모드 판별 및 분석 분기
    let targetMode: "speech" | "music" = "speech";
    if (mode === "auto") {
      try {
        targetMode = await detectAudioType(apiKey, fileUri, mimeType);
      } catch (err) {
        console.warn("Auto detect failed, fallback to speech:", err);
        targetMode = "speech";
      }
    } else {
      targetMode = mode;
    }

    // 5. 정밀 분석 실행
    if (targetMode === "speech") {
      const speechData = await analyzeSpeech(apiKey, fileUri, mimeType, context, specialRequest);
      return NextResponse.json({
        success: true,
        mode: "speech",
        data: speechData,
      });
    } else {
      const musicData = await analyzeMusic(apiKey, fileUri, mimeType, context, specialRequest);
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
  } finally {
    if (fileName) await deleteGeminiFile(apiKey, fileName);
  }
}
