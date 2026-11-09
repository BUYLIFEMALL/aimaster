import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/imageStorage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 「내 PC(무료)」로 그린 그림을 갤러리에 저장(2026-11-09 주인님 「진행해」 — D-3 후속).
// 그림은 회원 PC 엔진이 그린 PNG를 브라우저가 보내 준다. 본인 폴더에 저장하고 usage_logs 작업 종류 `image_local`로 남긴다
// (갤러리는 작업 종류와 상관없이 보여 주고, 관리자 생성 통계 `image_generation`에는 섞이지 않음). AI 호출·요금 없음.
const AI_IMAGE_STUDIO_PROGRAM_ID = "26b9f0b2-b48b-4f9d-b751-ecb88e98e95e";
const MAX_B64 = 4_000_000; // Vercel 요청 본문 4.5MB 안
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse || !user) {
    const body = errorResponse ? await errorResponse.json().catch(() => ({ error: "로그인이 필요합니다." })) : { error: "로그인이 필요합니다." };
    return NextResponse.json(body, { status: errorResponse?.status ?? 401, headers: NO_STORE });
  }
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const base64 = typeof b?.base64 === "string" ? b.base64 : "";
  if (!base64 || base64.length > MAX_B64 || !/^[A-Za-z0-9+/]+=*$/.test(base64)) {
    return NextResponse.json({ error: "그림이 비었거나 너무 큽니다." }, { status: 400, headers: NO_STORE });
  }
  const bytes = Buffer.from(base64, "base64");
  // PNG 머리(89 50 4E 47)만 받는다
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    return NextResponse.json({ error: "PNG 그림만 저장할 수 있습니다." }, { status: 400, headers: NO_STORE });
  }
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  const admin = createAdminClient();
  const path = `${user.id}/${crypto.randomUUID()}.png`;
  const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "image/png", upsert: false });
  if (up.error) return NextResponse.json({ error: "그림을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  const { data, error } = await admin
    .from("usage_logs")
    .insert({
      user_id: user.id,
      program_id: AI_IMAGE_STUDIO_PROGRAM_ID,
      action: "image_local",
      metadata: {
        provider: "local-pc",
        model: str(b?.model, 80) || "내 PC",
        prompt: str(b?.prompt, 2000),
        image_path: path,
        ...(num(b?.seconds) != null ? { seconds: num(b?.seconds) } : {}),
        ...(num(b?.vramPeakGb) != null ? { vramPeakGb: num(b?.vramPeakGb) } : {}),
      },
    })
    .select("id")
    .single();
  if (error || !data) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "기록을 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ id: data.id }, { headers: NO_STORE });
}
