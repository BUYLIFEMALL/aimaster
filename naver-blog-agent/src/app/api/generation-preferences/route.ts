import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import {
  findImageModel,
  isKnownEngine,
  isKnownRatio,
  type EngineProvider,
  type ImageRatio,
} from "@/lib/ai/contentModels";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MIN_IMAGE_COUNT = 1;
const MAX_IMAGE_COUNT = 5;

function serializePreference(row: any) {
  return {
    textProvider: row.text_provider,
    textModel: row.text_model,
    imageModel: row.image_model,
    imageRatio: row.image_ratio,
    imageCount: row.image_count,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

    const admin = createAdminClient() as any;
    const { data, error } = await admin
      .from("nba_generation_preferences")
      .select("text_provider, text_model, image_model, image_ratio, image_count, updated_at")
      .eq("user_id", access.userId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ preferences: data ? serializePreference(data) : null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "기본 모델 설정을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await request.json();
    const textProvider = String(body.textProvider || "");
    const textModel = String(body.textModel || "");
    const imageModel = String(body.imageModel || "");
    const imageRatio = String(body.imageRatio || "");
    const imageCount = Number(body.imageCount);

    if (!isKnownEngine(textProvider, textModel)) {
      return NextResponse.json({ error: "지원하지 않는 글 생성 모델입니다." }, { status: 400 });
    }
    const image = findImageModel(imageModel);
    if (!image || !isKnownRatio(imageRatio) || !Number.isInteger(imageCount) || imageCount < MIN_IMAGE_COUNT || imageCount > MAX_IMAGE_COUNT) {
      return NextResponse.json({ error: "이미지 생성 모델 설정값을 확인해 주세요." }, { status: 400 });
    }

    const admin = createAdminClient() as any;
    const { data, error } = await admin
      .from("nba_generation_preferences")
      .upsert(
        {
          user_id: access.userId,
          text_provider: textProvider as EngineProvider,
          text_model: textModel,
          image_model: imageModel,
          image_ratio: imageRatio as ImageRatio,
          image_count: imageCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("text_provider, text_model, image_model, image_ratio, image_count, updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, preferences: serializePreference(data) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "기본 모델 설정을 저장하지 못했습니다." }, { status: 500 });
  }
}
