import { NextResponse } from "next/server";
import { authorize, requireGeminiKey, rec, errorJson } from "@/lib/apiGuard";
import { buildVideoPrompt } from "@/lib/music/prompts";
import { isVeoModel, isVideoLength } from "@/lib/music/veo";
import { ART_STYLES, ASPECT_RATIOS, type ArtStyleId, type AspectRatioId } from "@/lib/music/presets";
import { findVideoModel } from "@/lib/video/videoModels";
import { submitVideoJob, VideoGenError } from "@/lib/video/videoProviders";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 공용 코드는 Gemini가 백그라운드 실행을 거절하면 한 번에 기다리는 방식(최대 270초)으로 다시 보낸다
export const maxDuration = 300;

/** data:image/jpeg;base64,... 형식만 허용하고 크기를 제한한다. */
function cleanDataUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const m = /^data:image\/(?:jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(v);
  return m && m[1].length <= 3_000_000 ? v : undefined;
}

/**
 * 장면 영상 생성을 시작한다(회원 본인 Gemini 키, 유료 호출 1건 · 자동 재시도 없음).
 * 보통은 작업 정보(job)만 돌려주고 진행은 status로 확인한다. 업체가 바로 영상을 주면 MP4를 그대로 응답한다.
 */
export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const body = rec(await request.json());
    const scenePrompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 900) : "";
    if (!scenePrompt) return errorJson("장면 묘사가 비어 있습니다.", 400);
    if (!isVeoModel(body.model)) return errorJson("지원하지 않는 영상 모델입니다. 화면을 새로고침한 뒤 다시 시도해주세요.", 400);
    if (!isVideoLength(body.length)) return errorJson("영상 길이는 4·6·8초 중에서 고를 수 있습니다.", 400);
    const model = findVideoModel(body.model);
    if (!model || model.provider !== "gemini") return errorJson("지원하지 않는 영상 모델입니다.", 400);
    const artStyle = (ART_STYLES.some((s) => s.value === body.artStyle) ? body.artStyle : "cinematic") as ArtStyleId;
    const ratio = (ASPECT_RATIOS.some((r) => r.value === body.ratio) ? body.ratio : "16:9") as AspectRatioId;
    const image = cleanDataUrl(body.image);
    if (body.image && !image) return errorJson("장면 이미지 형식이 올바르지 않습니다.", 400);
    // 심리스 루프: 끝 화면을 시작 이미지와 같게 지정한다(이미지가 있을 때만)
    const loop = body.loop === true && !!image;
    const key = await requireGeminiKey(gate.auth.user.id);
    if (!key.ok) return key.response;

    const result = await submitVideoJob({
      key: key.apiKey,
      model,
      prompt: buildVideoPrompt({ prompt: scenePrompt }, artStyle, loop),
      startUrl: image,
      endUrl: loop ? image : undefined,
      seconds: body.length,
      aspectRatio: ratio,
    });
    if ("bytes" in result) return new Response(new Uint8Array(result.bytes), { headers: { "Content-Type": "video/mp4", "Cache-Control": "private, no-store" } });
    return NextResponse.json({ job: result.job });
  } catch (err) {
    if (err instanceof VideoGenError) return errorJson(err.message, err.status);
    console.error("video start error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("영상 생성을 시작하는 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요.", 500);
  }
}
