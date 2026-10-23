import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi, logProgramUsage } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { deleteSceneVideo, MAX_SCENE_VIDEO_BYTES, saveSceneVideo } from "@/lib/video/sceneVideo";
import { findVideoModel, motionPrompt, PROVIDER_NAME, type VideoJob } from "@/lib/video/videoModels";
import { isFrameUrl } from "@/lib/video/videoParse";
import { checkVideoJob, submitVideoJob, VideoGenError } from "@/lib/video/videoProviders";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// v1.32 장면 AI 영상(회원 본인 키): action=submit → 작업 번호(또는 바로 완성), check → 진행 중/완성(저장 후 공개 주소), delete → 장면 영상 지우기.
// 업체 호출은 공용 기준 코드 `ai-video-*`(src/lib/video/ 사본, 기준 ai-image-studio/lib/video/ — 직접 수정 금지).
// 시작·끝 사진은 화면이 보낸 주소가 아니라 서버가 DB에서 본인 장면·다음 장면의 선택 이미지를 읽어 쓴다.
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin"); if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}
const err = (status: number, error: string, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return err(403, "허용되지 않은 요청입니다.");
  const access = await checkProgramAccessApi();
  if (!access.allowed) return err(access.status, access.error);
  const userId = access.user.id;
  const body = (await req.json().catch(() => null)) as { action?: string; videoId?: string; segmentId?: string; model?: string; seconds?: number; linkNext?: boolean; job?: VideoJob } | null;
  const supabase = await createClient();
  const { data: seg } = body?.videoId && body.segmentId
    ? await supabase.from("shorts_video_segments").select("id, video_id, segment_index, image_url, image_prompt").eq("user_id", userId).eq("video_id", body.videoId).eq("id", body.segmentId).maybeSingle()
    : { data: null };
  if (!seg) return err(404, "장면을 찾을 수 없습니다.");

  try {
    if (body?.action === "delete") { await deleteSceneVideo(userId, seg.video_id, seg.id); return NextResponse.json({ ok: true }); }

    const model = findVideoModel(body?.action === "check" ? body.job?.model : body?.model);
    if (!model) return err(400, "영상 모델을 골라 주세요.");
    const key = await resolveApiKey(supabase, userId, model.provider);
    if (!key) return err(400, `${model.name}은(는) 본인 ${PROVIDER_NAME[model.provider]} 키가 필요합니다. 설정 페이지에서 등록해 주세요.`, { needKey: true });

    if (body?.action === "check") {
      const job = body.job!;
      if (job.provider !== model.provider) return err(400, "영상 작업 정보가 올바르지 않습니다. 다시 만들어 주세요.");
      const r = await checkVideoJob({ key, job, maxBytes: MAX_SCENE_VIDEO_BYTES });
      if (r.state === "running") return NextResponse.json({ state: "running" });
      const url = await saveSceneVideo(userId, seg.video_id, seg.id, r.bytes);
      await logProgramUsage({ userId, action: "video_scene", metadata: { provider: model.provider, model: model.id, seconds: job.seconds ?? 5, withEnd: job.withEnd } });
      return NextResponse.json({ state: "done", url });
    }

    // submit
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid").hostname;
    if (!isFrameUrl(seg.image_url, host)) return err(400, "먼저 이 장면 이미지를 만들고 선택해 주세요. 그 이미지가 영상의 첫 화면이 됩니다.");
    const seconds = Number(body?.seconds ?? 5);
    if (!model.durations.includes(seconds)) return err(400, `${model.name}은(는) ${model.durations.join("·")}초 영상만 만들 수 있습니다.`);
    let endUrl: string | undefined;
    if (body?.linkNext && model.endFrame) {
      const { data: next } = await supabase.from("shorts_video_segments").select("image_url").eq("user_id", userId).eq("video_id", seg.video_id).eq("segment_index", seg.segment_index + 1).maybeSingle();
      if (isFrameUrl(next?.image_url, host)) endUrl = next!.image_url!;
    }
    const r = await submitVideoJob({ key, model, prompt: motionPrompt(seg.image_prompt ?? "", !!endUrl), startUrl: seg.image_url, endUrl, seconds, maxBytes: MAX_SCENE_VIDEO_BYTES });
    if ("bytes" in r) {
      const url = await saveSceneVideo(userId, seg.video_id, seg.id, r.bytes);
      await logProgramUsage({ userId, action: "video_scene", metadata: { provider: model.provider, model: model.id, seconds, withEnd: !!endUrl } });
      return NextResponse.json({ state: "done", url });
    }
    return NextResponse.json({ state: "running", job: r.job });
  } catch (e) {
    if (e instanceof VideoGenError) return err(e.status, e.message, { code: e.code, needKey: e.code === "key" });
    console.error("[shots video/scene]", e instanceof Error ? e.message : "unknown");
    return err(500, e instanceof Error && e.message.includes("저장") ? e.message : "영상 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
