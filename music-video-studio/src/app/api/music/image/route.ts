import { NextResponse } from "next/server";
import { authorize, requireGeminiKey, rec, errorJson } from "@/lib/apiGuard";
import { generateSceneImage } from "@/lib/ai/gemini";
import { buildImagePrompt } from "@/lib/music/prompts";
import { ART_STYLES, ASPECT_RATIOS, type ArtStyleId, type AspectRatioId } from "@/lib/music/presets";
import type { VeoImage } from "@/lib/music/veo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

const MAX_REF_BASE64 = 1_400_000;

function cleanRefs(v: unknown): VeoImage[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 3)
    .map((r) => rec(r))
    .filter((r) => (r.mimeType === "image/jpeg" || r.mimeType === "image/png") && typeof r.data === "string" && r.data.length < MAX_REF_BASE64 && /^[A-Za-z0-9+/=]+$/.test(r.data))
    .map((r) => ({ mimeType: r.mimeType as string, data: r.data as string }));
}

/** 장면 키프레임 이미지 1장(회원 본인 Gemini 키, 유료 호출 1건). */
export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const body = rec(await request.json());
    const scenePrompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 900) : "";
    if (!scenePrompt) return errorJson("장면 묘사가 비어 있습니다.", 400);
    const artStyle = (ART_STYLES.some((s) => s.value === body.artStyle) ? body.artStyle : "cinematic") as ArtStyleId;
    const ratio = (ASPECT_RATIOS.some((r) => r.value === body.ratio) ? body.ratio : "16:9") as AspectRatioId;
    const references = cleanRefs(body.references);
    const key = await requireGeminiKey(gate.auth.user.id);
    if (!key.ok) return key.response;

    const prompt = buildImagePrompt({ prompt: scenePrompt }, artStyle, ratio, references.length > 0);
    const image = await generateSceneImage({ apiKey: key.apiKey, prompt, ratio, references });
    return NextResponse.json({ image: `data:${image.mimeType};base64,${image.data}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    return errorJson(message && message.length < 200 ? message : "이미지 생성 중 오류가 발생했습니다.");
  }
}
