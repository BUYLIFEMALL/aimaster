import { NextResponse } from "next/server";
import { authorize, requireGeminiKey, rec, errorJson } from "@/lib/apiGuard";
import { geminiErrorMessage } from "@/lib/ai/gemini";
import { buildVideoPrompt } from "@/lib/music/prompts";
import { buildVeoRequest, isVeoModel, isVideoLength, parseOperationStart, type VeoImage } from "@/lib/music/veo";
import { ART_STYLES, ASPECT_RATIOS, type ArtStyleId, type AspectRatioId } from "@/lib/music/presets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** data:image/jpeg;base64,... 형식만 허용하고 크기를 제한한다. */
function parseDataUrl(v: unknown): VeoImage | undefined {
  if (typeof v !== "string") return undefined;
  const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(v);
  if (!m || m[2].length > 3_000_000) return undefined;
  return { mimeType: m[1], data: m[2] };
}

/** Veo 영상 생성을 시작한다(회원 본인 Gemini 키, 유료 호출 1건). 작업 이름만 돌려주고 진행은 status로 확인한다. */
export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const body = rec(await request.json());
    const scenePrompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 900) : "";
    if (!scenePrompt) return errorJson("장면 묘사가 비어 있습니다.", 400);
    if (!isVeoModel(body.model)) return errorJson("지원하지 않는 영상 모델입니다.", 400);
    if (!isVideoLength(body.length)) return errorJson("영상 길이는 4·6·8초 중에서 고를 수 있습니다.", 400);
    const artStyle = (ART_STYLES.some((s) => s.value === body.artStyle) ? body.artStyle : "cinematic") as ArtStyleId;
    const ratio = (ASPECT_RATIOS.some((r) => r.value === body.ratio) ? body.ratio : "16:9") as AspectRatioId;
    const loop = body.loop === true;
    const image = parseDataUrl(body.image);
    if (body.image && !image) return errorJson("장면 이미지 형식이 올바르지 않습니다.", 400);
    const key = await requireGeminiKey(gate.auth.user.id);
    if (!key.ok) return key.response;

    const req = buildVeoRequest({ model: body.model, prompt: buildVideoPrompt({ prompt: scenePrompt }, artStyle, loop && !!image), ratio, length: body.length, loop, image });
    const response = await fetch(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key.apiKey },
      body: JSON.stringify(req.body),
      cache: "no-store",
      signal: AbortSignal.timeout(50_000),
    });
    if (!response.ok) return errorJson(geminiErrorMessage(response.status, "영상 생성"), response.status === 429 ? 429 : 502);
    const operation = parseOperationStart(await response.json().catch(() => null));
    if (!operation) return errorJson("영상 생성 작업을 시작하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
    return NextResponse.json({ operation });
  } catch (err) {
    console.error("video start error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("영상 생성을 시작하는 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요.", 500);
  }
}
