import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrivatePhotoError, uploadPrivatePhoto } from "@/lib/privatePhotos";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return reply({ error: access.error }, access.status);
    let form: FormData;
    try { form = await req.formData(); } catch { return reply({ error: "사진 업로드 형식을 확인해 주세요." }, 400); }
    const file = form.get("file");
    if (!(file instanceof File)) return reply({ error: "업로드할 사진을 선택해 주세요." }, 400);
    const photo = await uploadPrivatePhoto(createAdminClient(), access.userId!, file);
    return reply({ success: true, photo });
  } catch (error) {
    return reply({ error: error instanceof PrivatePhotoError ? error.message : "사진을 저장하지 못했습니다." }, error instanceof PrivatePhotoError ? error.status : 503);
  }
}
