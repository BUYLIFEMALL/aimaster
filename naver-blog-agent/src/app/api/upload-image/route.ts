import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MEDIA_BUCKET = "ai-image-generations";
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(req: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "이미지 크기는 15MB 이하만 가능합니다." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.type.split("/")[1] || "png";
    const cleanExt = ext.replace("jpeg", "jpg");
    const filename = `naver-blog-agent/${user.id}/attached-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${cleanExt}`;

    const admin = createAdminClient() as any;
    const { error: uploadError } = await admin.storage
      .from(MEDIA_BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Upload Image Storage Error]:", uploadError);
      return NextResponse.json(
        { error: `이미지 저장 실패: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(filename);
    const publicUrl = publicUrlData.publicUrl;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("[Upload Image Error]:", error);
    return NextResponse.json(
      { error: error?.message || "이미지 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
