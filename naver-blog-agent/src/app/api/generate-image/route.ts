import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { findImageModel, isKnownRatio, IMAGE_KEY_LABEL, type ImageRatio } from "@/lib/ai/contentModels";
import { generateImageBytes } from "@/lib/ai/imageGenerator";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MEDIA_BUCKET = "ai-image-generations";

export async function POST(req: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const user = { id: access.userId };
    const body = await req.json();
    const { prompt, imageModel, ratio = "1:1", caption = "", type = "body" } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "이미지 프롬프트를 입력해주세요." }, { status: 400 });
    }

    const modelInfo = findImageModel(imageModel || "nanobanana-2-2k");
    if (!modelInfo) {
      return NextResponse.json({ error: "지원하지 않는 이미지 모델입니다." }, { status: 400 });
    }

    const cleanRatio: ImageRatio = isKnownRatio(ratio) ? ratio : "1:1";

    // 1. 회원 본인의 해당 키 조회 (BYOK 원칙)
    const apiKey = await resolveApiKey(user.id, modelInfo.keyProvider);
    if (!apiKey) {
      const providerLabel = IMAGE_KEY_LABEL[modelInfo.keyProvider] || modelInfo.keyProvider;
      return NextResponse.json(
        {
          error: `${providerLabel} API 키가 등록되지 않았습니다. [API키등록·플랫폼연동] 메뉴에서 ${providerLabel} 키를 먼저 등록해주세요.`,
          needKey: true,
          keyProvider: modelInfo.keyProvider,
        },
        { status: 400 }
      );
    }

    // 2. 이미지 생성 호출
    const generated = await generateImageBytes({
      model: modelInfo.value,
      ratio: cleanRatio,
      prompt,
      apiKey,
    });

    // 3. Supabase Storage 업로드
    const ext = generated.mime.includes("jpeg") ? "jpg" : generated.mime.includes("webp") ? "webp" : "png";
    const path = `naver-blog-agent/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const admin = createAdminClient() as any;

    const { error: uploadError } = await admin.storage
      .from(MEDIA_BUCKET)
      .upload(path, generated.bytes, {
        contentType: generated.mime,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`이미지 저장에 실패했습니다: ${uploadError.message}`);
    }

    const { data: publicUrlData } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    const publicUrl = publicUrlData.publicUrl;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type,
      caption,
      prompt,
      size: generated.bytes.length,
      model: modelInfo.value,
      platform: modelInfo.platform,
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error?.message || "이미지 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
