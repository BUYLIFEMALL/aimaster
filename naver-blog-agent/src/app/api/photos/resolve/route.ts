import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrivatePhotoError, signPrivatePhotos } from "@/lib/privatePhotos";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return reply({ error: access.error }, access.status);
    const body = await req.json().catch(() => null);
    const photos = await signPrivatePhotos(createAdminClient(), access.userId!, body?.paths);
    return reply({ photos });
  } catch (error) {
    return reply({ error: error instanceof PrivatePhotoError ? error.message : "사진을 확인하지 못했습니다." }, error instanceof PrivatePhotoError ? error.status : 503);
  }
}
