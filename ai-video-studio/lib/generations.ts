import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findModel, type StudioModel } from "@/lib/providers/catalog";
import type { VideoJob } from "@/lib/video/videoModels";
import { checkVideoJob, submitVideoJob, VideoGenError } from "@/lib/video/videoProviders";
import type { ClientGeneration, ClientOutput, GenerationRow, OutputFile } from "@/lib/generationTypes";

export type { GenerationRow } from "@/lib/generationTypes";

// 흐름(AI 음악 스튜디오 lib/generations.ts와 같은 틀): 접수 → 업체 작업 번호 저장 → 회원 화면이 상태를 물을 때마다 한 단계 진행
// → 완성 영상을 비공개 저장소로 옮김(업체 주소는 금방 만료). 업체 호출은 공용 기준 코드 ai-video-providers가 맡는다(재시도 없음 = 이중 과금 방지).
export const BUCKET = "ai-video-studio";
export const RETENTION_DAYS = 30;
/** 업체가 이 시간 넘게 끝내지 않으면 실패로 정리한다 */
const ASYNC_TIMEOUT_MS = 20 * 60_000;
/** 접수 요청이 이 시간 안에 작업 번호를 남기지 못하면 실패로 본다(Gemini가 한 번에 기다리는 방식으로 바꿔 보내면 최대 270초) */
const START_GRACE_MS = 6 * 60_000;
const MAX_VIDEO_BYTES = 45 * 1024 * 1024;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = SupabaseClient<any, any, any>;

export function modelOf(row: Pick<GenerationRow, "model">): StudioModel | undefined {
  return findModel(row.model);
}

/** 같은 행을 두 요청이 동시에 처리하지 않도록 잠근다(잠금 시간 안에 다시 오는 요청은 건너뜀) */
export async function claimLock(admin: Admin, id: string, ms: number): Promise<boolean> {
  const now = new Date();
  const { data } = await admin
    .from("avs_generations")
    .update({ locked_until: new Date(now.getTime() + ms).toISOString() })
    .eq("id", id)
    .eq("status", "running")
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select("id");
  return (data ?? []).length > 0;
}

async function releaseLock(admin: Admin, id: string) {
  await admin.from("avs_generations").update({ locked_until: null }).eq("id", id).eq("status", "running");
}

export async function markFailed(admin: Admin, id: string, error: string) {
  await admin
    .from("avs_generations")
    .update({ status: "failed", error_message: error.slice(0, 1000), locked_until: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "running");
}

async function complete(admin: Admin, row: GenerationRow, bytes: Buffer) {
  const path = `${row.user_id}/${row.id}/video.mp4`;
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "video/mp4", upsert: true });
  if (error) {
    const tooBig = /exceeded the maximum|too large|413/i.test(error.message);
    throw new Error(tooBig ? "영상이 저장 한도(50MB)를 넘어 갤러리에 저장하지 못했습니다." : `갤러리 저장에 실패했습니다: ${error.message}`);
  }
  const outputs: OutputFile[] = [{ path, contentType: "video/mp4", bytes: bytes.byteLength }];
  await admin
    .from("avs_generations")
    .update({ status: "completed", outputs, error_message: null, locked_until: null, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("status", "running");
}

async function signed(admin: Admin, path: string | null): Promise<string | undefined> {
  if (!path) return undefined;
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? undefined;
}

function errorText(e: unknown): string {
  if (e instanceof VideoGenError) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  return /aborted|timeout|TimeoutError/i.test(msg)
    ? "제한 시간 안에 결과를 받지 못했습니다. 업체 쪽에서는 이미 만들어져 요금이 나갔을 수 있으니, 다시 누르기 전에 해당 플랫폼 사용량을 확인해 주세요."
    : msg;
}

/** 업체에 작업을 접수한다. 업체가 바로 영상을 주면 그 자리에서 저장한다 */
export async function startJob(admin: Admin, row: GenerationRow, apiKey: string) {
  const model = modelOf(row);
  if (!model) return markFailed(admin, row.id, "지원하지 않는 모델입니다.");
  if (!(await claimLock(admin, row.id, START_GRACE_MS))) return;
  try {
    const startUrl = await signed(admin, row.start_image);
    const endUrl = await signed(admin, row.end_image);
    const r = await submitVideoJob({
      key: apiKey,
      model,
      prompt: row.prompt,
      startUrl,
      endUrl,
      seconds: row.duration_s,
      maxBytes: MAX_VIDEO_BYTES,
      aspectRatio: row.aspect_ratio ?? undefined,
      resolution: typeof row.options?.resolution === "string" ? row.options.resolution : undefined,
      audio: row.options?.audio === true,
    });
    if ("bytes" in r) return await complete(admin, row, r.bytes);
    await admin
      .from("avs_generations")
      .update({ provider_task_id: r.job.id, provider_meta: r.job as unknown as Record<string, unknown>, locked_until: null, updated_at: new Date().toISOString() })
      .eq("id", row.id);
  } catch (e) {
    await markFailed(admin, row.id, errorText(e));
  }
}

/** 진행 중인 행 하나를 한 단계 진행시킨다(회원 화면의 상태 확인에서 호출). 결과가 바뀌었으면 true */
export async function advance(admin: Admin, row: GenerationRow, apiKey: string | null): Promise<boolean> {
  if (row.status !== "running") return false;
  const age = Date.now() - new Date(row.created_at).getTime();
  if (!row.provider_task_id) {
    const lockGone = !row.locked_until || new Date(row.locked_until).getTime() < Date.now();
    if (age > START_GRACE_MS && lockGone) {
      await markFailed(admin, row.id, "작업 접수 결과를 받지 못했습니다. 업체 쪽에서는 만들어졌을 수 있으니 사용량을 확인한 뒤 다시 시도해 주세요.");
      return true;
    }
    return false;
  }
  if (age > ASYNC_TIMEOUT_MS) {
    await markFailed(admin, row.id, "20분 안에 완성되지 않아 중단했습니다. 플랫폼 사용 기록을 확인해 주세요.");
    return true;
  }
  if (!apiKey) return false;
  if (!(await claimLock(admin, row.id, 3 * 60_000))) return false;
  try {
    const r = await checkVideoJob({ key: apiKey, job: row.provider_meta as unknown as VideoJob, maxBytes: MAX_VIDEO_BYTES });
    if (r.state === "running") {
      await releaseLock(admin, row.id);
      return false;
    }
    await complete(admin, row, r.bytes);
    return true;
  } catch (e) {
    // 업체가 만들지 못했다고 답했거나 저장에 실패하면 실패로 표시, 그 밖의 일시 오류는 다음 확인 때 다시 시도
    const final = (e instanceof VideoGenError && ["input", "empty", "key", "quota", "model"].includes(e.code)) || /갤러리|저장 한도/.test(errorText(e));
    if (final) await markFailed(admin, row.id, errorText(e));
    else await releaseLock(admin, row.id);
    return final;
  }
}

/** 화면에 넘길 모양 — 저장소 경로를 1시간짜리 서명 주소로 바꾸고 내부 값(잠금·업체 작업 정보)은 뺀다 */
export async function toClient(admin: Admin, rows: GenerationRow[]): Promise<ClientGeneration[]> {
  return Promise.all(
    rows.map(async (r) => {
      const outputs: ClientOutput[] = await Promise.all(
        (r.outputs ?? []).map(async (o) => {
          const { data: play } = await admin.storage.from(BUCKET).createSignedUrl(o.path, 3600);
          // 한글 파일 이름은 서명 주소에서 깨지므로 영문 이름으로 내려받게 한다(docs/ERROR_LESSONS.md 2026-10-22)
          const { data: dl } = await admin.storage.from(BUCKET).createSignedUrl(o.path, 3600, { download: `ai-video-${r.id.slice(0, 8)}.mp4` });
          return { ...o, url: play?.signedUrl ?? null, downloadUrl: dl?.signedUrl ?? null };
        }),
      );
      const { outputs: _o, locked_until: _l, provider_meta: _m, user_id: _u, provider_task_id: _t, start_image, end_image: _e, ...rest } = r;
      void _o; void _l; void _m; void _u; void _t; void _e;
      return {
        ...rest,
        outputs,
        modelName: modelOf(r)?.name ?? r.model,
        expiresAt: new Date(new Date(r.created_at).getTime() + RETENTION_DAYS * 86_400_000).toISOString(),
        startImageUrl: (await signed(admin, start_image)) ?? null,
      };
    }),
  );
}
