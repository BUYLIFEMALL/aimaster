import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;

interface UploadedFile {
  storagePath: string;
  name: string;
  size: number;
}

// 파일 바이트는 브라우저가 Supabase Storage(videotogif-uploads)에 직접 올리고, 이
// 라우트는 그 저장 경로만 전달받는다 — Vercel Functions의 요청 본문 100MB 제한을
// 우회하기 위한 구조(결과물을 워커가 Storage에 직접 업로드하는 것과 대칭).
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null);
  const files = Array.isArray(body?.files) ? (body.files as UploadedFile[]) : [];
  const fps = Number(body?.fps ?? 40);
  const width = Number(body?.width ?? 560);

  if (!files.length) return NextResponse.json({ error: "변환할 파일을 선택해주세요." }, { status: 400 });
  if (files.length > 20) return NextResponse.json({ error: "한 번에 최대 20개까지 등록할 수 있습니다." }, { status: 400 });
  // storagePath는 반드시 "{내 user_id}/"로 시작해야 한다 — 다른 사용자가 올린 파일의
  // 경로를 넣어서 몰래 변환시키는 것을 막는다(Storage RLS가 이미 본인 폴더만 허용하지만,
  // 이 API 레벨에서도 한 번 더 검증).
  const ownPrefix = `${access.user.id}/`;
  if (files.some((file) => !file.storagePath?.startsWith(ownPrefix))) {
    return NextResponse.json({ error: "잘못된 업로드 경로입니다." }, { status: 400 });
  }
  if (files.some((file) => !file.size || file.size <= 0 || file.size > MAX_FILE_BYTES)) return NextResponse.json({ error: "파일당 최대 200MB까지 업로드할 수 있습니다." }, { status: 413 });
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) return NextResponse.json({ error: "한 번에 최대 1GiB까지 업로드할 수 있습니다." }, { status: 413 });
  if (![40, 50].includes(fps) || width < 160 || width > 800) return NextResponse.json({ error: "변환 옵션이 올바르지 않습니다." }, { status: 400 });

  // The production worker endpoint is intentionally server-to-server. The browser never receives its secret.
  const workerUrl = process.env.VIDEOTOGIF_WORKER_URL;
  if (!workerUrl || !process.env.VIDEOTOGIF_WORKER_SECRET) return NextResponse.json({ error: "변환 서버가 아직 연결되지 않았습니다." }, { status: 503 });

  try {
    const response = await fetch(`${workerUrl.replace(/\/$/, "")}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.VIDEOTOGIF_WORKER_SECRET}` },
      body: JSON.stringify({ userId: access.user.id, fps, width, files }),
      signal: AbortSignal.timeout(60 * 1000),
    });
    const responseBody = await response.json().catch(() => ({ error: "변환 서버 응답을 읽을 수 없습니다." }));
    return NextResponse.json(responseBody, { status: response.status });
  } catch (error) {
    console.error("VideoToGIF worker request failed", error);
    return NextResponse.json({ error: "변환 서버에 연결할 수 없습니다." }, { status: 503 });
  }
}
