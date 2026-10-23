// v1.23 AI 동영상 장면 — 원스톱 연결 코드. 업체 호출(제출·상태 확인·영상 받기)은 공용 기준 코드 `ai-video-providers`
// (./videoProviders — 기준 ai-image-studio/lib/video/, 사본 직접 수정 금지)가 하고, 여기서는 오류를 원스톱 형식으로 바꾸고 회원 폴더에 저장한다.
// 영상은 1~5분 걸려 제출 번호를 대본에 저장하고 화면이 몇 초마다 확인한다. 이중 과금 방지: 자동 재시도 없음.
import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "@/lib/ai";
import { UserError } from "@/lib/errors";
import { BUCKET } from "@/lib/media";
import type { VideoJob, VideoModel } from "@/lib/videoModels";
import { checkVideoJob, submitVideoJob, VideoGenError } from "@/lib/videoProviders";

const MAX_VIDEO_BYTES = 30 * 1024 * 1024; // 버킷 파일당 30MB(v1.23)
const MAX_VIDEOS_PER_USER = 100;

export type { VideoJob };
export type SubmitResult = { job: VideoJob } | { path: string };
export type CheckResult = { state: "running" } | { state: "done"; path: string };

/** 공용 오류 → 원스톱 오류(화면이 code=key면 키 등록 안내를 띄움) */
function mapError(e: unknown): never {
  if (e instanceof VideoGenError) {
    if (e.code === "frame") throw new UserError(e.status, e.message);
    const code = e.code === "input" ? "provider" : e.code === "empty" ? "noimage" : e.code;
    throw new AiError(e.status, code, e.message);
  }
  throw e;
}

/** 결과 영상을 회원 폴더(<user_id>/video/)에 저장 */
async function saveVideo(userId: string, bytes: Buffer): Promise<string> {
  const admin = createAdminClient();
  const { data: list } = await admin.storage.from(BUCKET).list(`${userId}/video`, { limit: MAX_VIDEOS_PER_USER + 1 });
  if ((list?.length ?? 0) >= MAX_VIDEOS_PER_USER) throw new UserError(400, `AI 영상은 ${MAX_VIDEOS_PER_USER}개까지 보관할 수 있습니다(30일 뒤 자동 삭제). 쓰지 않는 대본을 정리해 주세요.`);
  const path = `${userId}/video/${randomUUID()}.mp4`;
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "video/mp4", upsert: false });
  if (error) throw new UserError(500, "영상을 저장하지 못했습니다.");
  return path;
}

export async function submitVideo(o: { userId: string; key: string; model: VideoModel; prompt: string; startUrl: string; endUrl?: string; seconds: number }): Promise<SubmitResult> {
  const r = await submitVideoJob({ key: o.key, model: o.model, prompt: o.prompt, startUrl: o.startUrl, endUrl: o.endUrl, seconds: o.seconds, maxBytes: MAX_VIDEO_BYTES }).catch(mapError);
  return "bytes" in r ? { path: await saveVideo(o.userId, r.bytes) } : { job: r.job };
}

export async function checkVideo(o: { userId: string; key: string; job: VideoJob }): Promise<CheckResult> {
  const r = await checkVideoJob({ key: o.key, job: o.job, maxBytes: MAX_VIDEO_BYTES }).catch(mapError);
  return r.state === "running" ? r : { state: "done", path: await saveVideo(o.userId, r.bytes) };
}
