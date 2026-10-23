import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/imageStorage";
import { readResaveBody, resaveCors } from "@/lib/resaveReceiver";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 미배포 정리(2026-10-22): 이미지 변환 스튜디오 「이미지 스튜디오 갤러리에 다시 저장」 — 변환한 그림 1장을 본인 폴더에 저장하고
// usage_logs에 작업 종류 `image_import`로 남긴다(갤러리는 작업 종류와 상관없이 보여 주고, 관리자 생성 통계 `image_generation`에는 섞이지 않음).
// CORS·본문 읽기·형식 판별은 공용 기준 코드 `resave-receiver` 사본(lib/resaveReceiver.ts, 기준 4컷 — 직접 고치지 않음). AI 호출 없음.
const AI_IMAGE_STUDIO_PROGRAM_ID = "26b9f0b2-b48b-4f9d-b751-ecb88e98e95e";
const MAX_IMPORT_B64 = 3_000_000;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: resaveCors(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  const res = await importPost(request);
  for (const [k, v] of Object.entries(resaveCors(request.headers.get("origin")))) res.headers.set(k, v);
  return res;
}

async function importPost(request: NextRequest): Promise<NextResponse> {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse || !user) {
    const body = errorResponse ? await errorResponse.json().catch(() => ({ error: "로그인이 필요합니다." })) : { error: "로그인이 필요합니다." };
    return NextResponse.json(body, { status: errorResponse?.status ?? 401, headers: NO_STORE });
  }
  const r = readResaveBody(await request.text(), MAX_IMPORT_B64);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status, headers: NO_STORE });

  const admin = createAdminClient();
  const path = `${user.id}/${crypto.randomUUID()}.${r.ext}`;
  const up = await admin.storage.from(BUCKET).upload(path, r.bytes, { contentType: r.mime, upsert: false });
  if (up.error) return NextResponse.json({ error: "그림을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  const { data, error } = await admin.from("usage_logs").insert({
    user_id: user.id,
    program_id: AI_IMAGE_STUDIO_PROGRAM_ID,
    action: "image_import",
    metadata: { provider: "image-convert-studio", model: r.ext.toUpperCase(), prompt: r.label || "변환 스튜디오에서 다시 저장", image_path: path, importedFrom: "image-convert-studio" },
  }).select("id").single();
  if (error || !data) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "기록을 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ id: data.id }, { headers: NO_STORE });
}
