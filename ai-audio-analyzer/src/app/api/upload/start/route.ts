import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { MAX_FILE_BYTES, startResumableUpload } from "@/lib/geminiFiles";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 브라우저가 Google 올림 주소로 직접 올리려면 세션을 시작할 때 이 사이트 주소(Origin)를 Google에 알려야 한다.
function isAllowedOrigin(origin: string): boolean {
  return (
    origin === "https://audio.buylife.xyz" ||
    /^https:\/\/ai-audio-analyzer(-[a-z0-9-]+)?\.vercel\.app$/.test(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin)
  );
}

// 큰 오디오 올리기: 회원 본인 키로 Gemini 이어 올리기를 시작하고 올림 주소(키 없음)를 돌려준다. 파일은 브라우저가 그 주소로 직접 올린다.
export async function POST(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const apiKey = await getUserGeminiApiKey(access.user.id);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "회원 본인의 Google Gemini API 키가 등록되어 있지 않습니다. 좌측 메뉴의 [API키등록·플랫폼연동]에서 본인 키를 등록해주세요.",
        needKey: true,
      },
      { status: 400 },
    );
  }

  try {
    const body = (await req.json()) as { fileName?: unknown; mimeType?: unknown; size?: unknown };
    const size = Number(body.size);
    const mimeType = typeof body.mimeType === "string" && body.mimeType.startsWith("audio/") ? body.mimeType : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "audio";
    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "파일 크기를 확인할 수 없습니다." }, { status: 400 });
    }
    if (size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "오디오 파일은 100MB 이하만 분석할 수 있습니다." }, { status: 400 });
    }
    if (!mimeType) {
      return NextResponse.json({ error: "오디오 파일(mp3, wav, m4a, flac, ogg 등)만 지원됩니다." }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? "";
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json({ error: "허용되지 않은 접속 주소입니다." }, { status: 403 });
    }
    const uploadUrl = await startResumableUpload(apiKey, { displayName: fileName, mimeType, size, origin });
    return NextResponse.json({ uploadUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "파일 올리기를 시작하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
