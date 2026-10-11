import { NextResponse } from "next/server";
import { authorize, requireOwnKey } from "@/lib/cardnews/apiGuard";
import { generateBackground } from "@/lib/ai/image";
import { optimizeBackground } from "@/lib/ai/imageOptimize";
import { findImageModel } from "@/lib/ai/imageModels";
import { buildImagePrompt } from "@/lib/ai/imagePrompts";
import { COMPOSITIONS, MOODS, PLACEMENTS, RATIOS, THEME_COLORS, VISUAL_STYLES } from "@/lib/cardnews/presets";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const oneOf = <T extends string>(v: unknown, list: { value: T }[], fb: T): T => (list.some((o) => o.value === v) ? (v as T) : fb);

/** 페이지 1장의 배경 이미지를 만든다(회원 본인 Gemini 키, 유료 호출 1건). 결과는 이 회원 폴더에만 저장한다. */
export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const userId = gate.auth.user.id;

    const body = rec(await request.json());
    const plan = rec(body.plan);
    const style = rec(body.style);
    const imageModel = typeof body.imageModel === "string" ? body.imageModel : "";
    if (!findImageModel(imageModel)) return NextResponse.json({ error: "지원하지 않는 이미지 모델입니다." }, { status: 400 });

    const pageCount = Math.min(10, Math.max(1, Math.round(Number(body.pageCount) || 8)));
    const pageIndex = Math.min(pageCount - 1, Math.max(0, Math.round(Number(body.pageIndex) || 0)));
    const ratio = oneOf(plan.ratio, RATIOS, "4:5");

    const key = await requireOwnKey(userId, "gemini", "Google Gemini");
    if (!key.ok) return key.response;

    const prompt = buildImagePrompt({
      category: typeof plan.category === "string" ? plan.category : "",
      topic: typeof plan.topic === "string" ? plan.topic : "",
      headline: typeof body.headline === "string" ? body.headline : "",
      visualStyle: oneOf(style.visualStyle, VISUAL_STYLES, "photo"),
      composition: oneOf(style.composition, COMPOSITIONS, "background"),
      themeColor: oneOf(style.themeColor, THEME_COLORS, "auto"),
      mood: oneOf(style.mood, MOODS, "info"),
      placement: oneOf(style.placement, PLACEMENTS, "center"),
      ratio,
      pageIndex,
      pageCount,
      extra: typeof body.extra === "string" ? body.extra : undefined,
    });

    const image = await generateBackground({ apiKey: key.apiKey, imageModel, prompt, ratio });

    // 큰 PNG를 WebP로 줄여 저장한다(저장 용량·불러오기 시간 절약).
    const optimized = await optimizeBackground(image.bytes, image.mime);
    const path = `${userId}/${crypto.randomUUID()}.${optimized.ext}`;
    const admin = createAdminClient();
    const { error } = await admin.storage.from("cardnews-images").upload(path, optimized.bytes, { contentType: optimized.mime, upsert: false });
    if (error) {
      console.error("cardnews image upload error:", error.message.slice(0, 200));
      return NextResponse.json({ error: "이미지를 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
    }
    const { data } = admin.storage.from("cardnews-images").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    // generateBackground 의 오류 문구는 키가 들어가지 않는 한국어 안내문이다.
    return NextResponse.json({ error: message && message.length < 200 ? message : "배경 이미지 생성 중 오류가 발생했습니다." }, { status: 502 });
  }
}
