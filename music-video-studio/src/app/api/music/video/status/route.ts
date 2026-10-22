import { NextResponse } from "next/server";
import { authorize, requireGeminiKey, rec, errorJson } from "@/lib/apiGuard";
import type { VideoJob } from "@/lib/video/videoModels";
import { checkVideoJob, VideoGenError } from "@/lib/video/videoProviders";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 150;

/**
 * 영상 생성 진행 상태를 확인한다(회원 본인 키로 조회만 하므로 비용이 없다).
 * 진행 중이면 { state: "running" }, 끝났으면 MP4를 그대로 응답한다(서버에 저장하지 않음).
 */
export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const j = rec(rec(await request.json()).job);
    // 이 프로그램은 회원 Gemini 키만 쓰므로 Gemini 작업만 받는다(작업 번호 형식은 checkVideoJob이 다시 검사)
    if (j.provider !== "gemini" || typeof j.id !== "string" || typeof j.model !== "string") return errorJson("영상 작업 정보가 올바르지 않습니다. 다시 만들어주세요.", 400);
    const job: VideoJob = { provider: "gemini", model: j.model, id: j.id, withEnd: j.withEnd === true, startedAt: typeof j.startedAt === "string" ? j.startedAt : "" };
    const key = await requireGeminiKey(gate.auth.user.id);
    if (!key.ok) return key.response;

    const result = await checkVideoJob({ key: key.apiKey, job });
    if (result.state === "running") return NextResponse.json({ state: "running" });
    return new Response(new Uint8Array(result.bytes), { headers: { "Content-Type": "video/mp4", "Cache-Control": "private, no-store" } });
  } catch (err) {
    if (err instanceof VideoGenError) return NextResponse.json({ state: "failed", message: err.message }, { status: err.code === "input" ? 200 : err.status });
    console.error("video status error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("영상 상태를 확인하지 못했습니다. 잠시 뒤 다시 시도해주세요.", 500);
  }
}
