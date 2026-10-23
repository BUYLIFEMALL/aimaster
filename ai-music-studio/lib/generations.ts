import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findModel, type GenerationInput, type InputImage, type MusicModel, type ProviderId } from "@/lib/providers/catalog";
import type { AudioFile, ProviderAdapter } from "@/lib/providers/types";
import { geminiAdapter } from "@/lib/providers/adapters/gemini";
import { elevenlabsAdapter } from "@/lib/providers/adapters/elevenlabs";
import { falAdapter } from "@/lib/providers/adapters/fal";
import { replicateAdapter } from "@/lib/providers/adapters/replicate";
import { sunoAdapter } from "@/lib/providers/adapters/suno";
import type { ClientGeneration, ClientOutput, GenerationRow, OutputFile } from "@/lib/generationTypes";

export type { GenerationRow } from "@/lib/generationTypes";

export const BUCKET = "ai-music-studio";
export const RETENTION_DAYS = 30;
/** 비동기 작업이 이 시간 넘게 끝나지 않으면 실패로 정리한다 */
const ASYNC_TIMEOUT_MS = 20 * 60_000;
/** 요청 안에서 끝나는 공급자를 기다리는 서버 작업의 최대 시간(+여유) — 넘으면 서버가 끊긴 것으로 본다 */
const SYNC_TIMEOUT_MS = 6 * 60_000;

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  gemini: geminiAdapter,
  elevenlabs: elevenlabsAdapter,
  fal: falAdapter,
  replicate: replicateAdapter,
  suno: sunoAdapter,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = SupabaseClient<any, any, any>;

export function modelOf(row: Pick<GenerationRow, "provider" | "model">): MusicModel | undefined {
  return findModel(`${row.provider}:${row.model}`);
}

export function adapterOf(provider: ProviderId): ProviderAdapter {
  return ADAPTERS[provider];
}

export function inputOf(row: GenerationRow): GenerationInput {
  return {
    prompt: row.prompt,
    title: row.title ?? "",
    lyrics: row.lyrics ?? "",
    instrumental: row.instrumental,
    durationS: row.duration_s ?? 120,
    language: String(row.options?.language ?? "auto"),
    format: row.options?.format === "wav" ? "wav" : "mp3",
  };
}

/** 같은 행을 두 요청이 동시에 처리하지 않도록 잠근다(잠금 시간 안에 다시 오는 요청은 건너뜀) */
export async function claimLock(admin: Admin, id: string, ms: number): Promise<boolean> {
  const now = new Date();
  const { data } = await admin
    .from("ams_generations")
    .update({ locked_until: new Date(now.getTime() + ms).toISOString() })
    .eq("id", id)
    .eq("status", "running")
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select("id");
  return (data ?? []).length > 0;
}

async function releaseLock(admin: Admin, id: string) {
  await admin.from("ams_generations").update({ locked_until: null }).eq("id", id).eq("status", "running");
}

export async function markFailed(admin: Admin, id: string, error: string) {
  await admin
    .from("ams_generations")
    .update({ status: "failed", error_message: error.slice(0, 1000), locked_until: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "running");
}

function extFor(contentType: string, url?: string): { ext: string; type: string } {
  const t = contentType.toLowerCase();
  const u = (url ?? "").toLowerCase().split("?")[0];
  if (t.includes("wav") || u.endsWith(".wav")) return { ext: "wav", type: "audio/wav" };
  if (t.includes("flac") || u.endsWith(".flac")) return { ext: "flac", type: "audio/flac" };
  if (t.includes("ogg") || u.endsWith(".ogg")) return { ext: "ogg", type: "audio/ogg" };
  if (t.includes("mp4") || t.includes("aac") || u.endsWith(".m4a")) return { ext: "m4a", type: "audio/mp4" };
  return { ext: "mp3", type: "audio/mpeg" };
}

/** 공급자 음원을 우리 비공개 저장소로 옮긴다(공급자 주소는 금방 만료됨) */
async function persistFiles(admin: Admin, row: GenerationRow, files: AudioFile[]): Promise<OutputFile[]> {
  const out: OutputFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let data = f.data;
    let contentType = f.contentType ?? "";
    if (!data && f.url) {
      const res = await fetch(f.url, { headers: f.fetchHeaders, signal: AbortSignal.timeout(120_000), cache: "no-store" });
      if (!res.ok) throw new Error(`완성된 음원을 받아 오지 못했습니다. (${res.status})`);
      data = new Uint8Array(await res.arrayBuffer());
      contentType = contentType || res.headers.get("content-type") || "";
    }
    if (!data || data.byteLength === 0) continue;
    const { ext, type } = extFor(contentType, f.url);
    const path = `${row.user_id}/${row.id}/${i + 1}.${ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, data, { contentType: type, upsert: true });
    if (error) {
      const tooBig = /exceeded the maximum|too large|413/i.test(error.message);
      throw new Error(tooBig ? "음원이 저장 한도(50MB)를 넘어 보관함에 저장하지 못했습니다." : `보관함 저장에 실패했습니다: ${error.message}`);
    }
    out.push({ path, contentType: type, bytes: data.byteLength, durationS: f.durationS, title: f.title });
  }
  if (!out.length) throw new Error("저장할 음원이 없습니다.");
  return out;
}

async function complete(admin: Admin, row: GenerationRow, files: AudioFile[], lyricsOut?: string, actual?: string) {
  const outputs = await persistFiles(admin, row, files);
  await admin
    .from("ams_generations")
    .update({
      status: "completed",
      outputs,
      lyrics_out: lyricsOut ?? null,
      ...(actual ? { options: { ...(row.options ?? {}), actual } } : {}),
      error_message: null,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "running");
}

/** 요청 안에서 끝나는 공급자(Gemini·ElevenLabs) — 응답을 돌려준 뒤(waitUntil) 기다려 저장한다 */
/** images: v1.06 분위기 이미지(저장하지 않고 이 요청에서만 전달) */
export async function runSynchronous(admin: Admin, row: GenerationRow, apiKey: string, images?: InputImage[]) {
  const model = modelOf(row);
  if (!model) return markFailed(admin, row.id, "지원하지 않는 모델입니다.");
  if (!(await claimLock(admin, row.id, SYNC_TIMEOUT_MS))) return;
  try {
    const r = await adapterOf(row.provider).start(model, { ...inputOf(row), images }, apiKey);
    if (r.kind !== "done") throw new Error("예상하지 못한 응답입니다.");
    await complete(admin, row, r.files, r.lyricsOut, r.actual);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const timeout = /aborted|timeout|TimeoutError/i.test(msg);
    await markFailed(
      admin,
      row.id,
      timeout
        ? "제한 시간 안에 결과를 받지 못했습니다. 플랫폼 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 해당 플랫폼 사용량을 확인해 주세요."
        : msg,
    );
  }
}

/** 대기열 공급자(fal·Replicate·Suno) — 접수만 하고 작업 번호를 저장한다 */
export async function startAsync(admin: Admin, row: GenerationRow, apiKey: string) {
  const model = modelOf(row);
  if (!model) return markFailed(admin, row.id, "지원하지 않는 모델입니다.");
  try {
    const r = await adapterOf(row.provider).start(model, inputOf(row), apiKey);
    if (r.kind === "done") return complete(admin, row, r.files, r.lyricsOut, r.actual);
    await admin
      .from("ams_generations")
      .update({ provider_task_id: r.taskId, provider_meta: r.meta ?? {}, updated_at: new Date().toISOString() })
      .eq("id", row.id);
  } catch (e) {
    await markFailed(admin, row.id, e instanceof Error ? e.message : String(e));
  }
}

/** 진행 중인 행 하나를 한 단계 진행시킨다(회원 화면의 상태 확인에서 호출). 결과가 바뀌었으면 true */
export async function advance(admin: Admin, row: GenerationRow, apiKey: string | null): Promise<boolean> {
  if (row.status !== "running") return false;
  const age = Date.now() - new Date(row.created_at).getTime();
  const adapter = adapterOf(row.provider);
  const model = modelOf(row);

  if (adapter.synchronous) {
    const lockGone = !row.locked_until || new Date(row.locked_until).getTime() < Date.now();
    if (age > SYNC_TIMEOUT_MS && lockGone) {
      await markFailed(admin, row.id, "결과를 받지 못하고 작업이 끝났습니다. 플랫폼 쪽에서는 생성되어 요금이 나갔을 수 있으니 사용량을 확인한 뒤 다시 시도해 주세요.");
      return true;
    }
    return false;
  }

  if (!row.provider_task_id) {
    if (age > 2 * 60_000) {
      await markFailed(admin, row.id, "작업 접수에 실패했습니다. 다시 시도해 주세요.");
      return true;
    }
    return false;
  }
  if (age > ASYNC_TIMEOUT_MS) {
    await markFailed(admin, row.id, "20분 안에 완성되지 않아 중단했습니다. 플랫폼 사용 기록을 확인해 주세요.");
    return true;
  }
  if (!apiKey || !model || !adapter.poll) return false;
  if (!(await claimLock(admin, row.id, 3 * 60_000))) return false;
  try {
    const r = await adapter.poll(model, row.provider_task_id, row.provider_meta ?? {}, apiKey);
    if (r.state === "processing") {
      await releaseLock(admin, row.id);
      return false;
    }
    if (r.state === "failed") {
      await markFailed(admin, row.id, r.error);
      return true;
    }
    await complete(admin, row, r.files, r.lyricsOut, r.actual);
    return true;
  } catch (e) {
    // 상태 조회 자체의 일시 오류는 다음 확인 때 다시 시도한다(저장 실패는 실패로 표시)
    const msg = e instanceof Error ? e.message : String(e);
    if (/보관함|저장 한도|받아 오지 못했습니다/.test(msg)) await markFailed(admin, row.id, msg);
    else await releaseLock(admin, row.id);
    return /보관함|저장 한도|받아 오지 못했습니다/.test(msg);
  }
}

/** 화면에 넘길 모양 — 저장소 경로를 1시간짜리 서명 주소로 바꾸고 내부 값(잠금·공급자 주소)은 뺀다 */
export async function toClient(admin: Admin, rows: GenerationRow[]): Promise<ClientGeneration[]> {
  const paths = rows.flatMap((r) => (r.outputs ?? []).map((o) => o.path));
  const play = new Map<string, string>();
  if (paths.length) {
    const { data } = await admin.storage.from(BUCKET).createSignedUrls(paths, 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) play.set(d.path, d.signedUrl);
  }
  return Promise.all(
    rows.map(async (r) => {
      const outputs: ClientOutput[] = await Promise.all(
        (r.outputs ?? []).map(async (o, i) => {
          const ext = o.path.split(".").pop() ?? "mp3";
          // 한글 파일 이름은 서명 주소에서 깨져 저장되므로 영문 이름으로 내려받게 한다(docs/ERROR_LESSONS.md 2026-10-22)
          const { data } = await admin.storage.from(BUCKET).createSignedUrl(o.path, 3600, { download: `ai-music-${r.id.slice(0, 8)}-${i + 1}.${ext}` });
          return { ...o, url: play.get(o.path) ?? null, downloadUrl: data?.signedUrl ?? null };
        }),
      );
      const { outputs: _o, locked_until: _l, provider_meta: _m, user_id: _u, provider_task_id: _t, ...rest } = r;
      void _o; void _l; void _m; void _u; void _t;
      return {
        ...rest,
        outputs,
        modelName: modelOf(r)?.name ?? r.model,
        expiresAt: new Date(new Date(r.created_at).getTime() + RETENTION_DAYS * 86_400_000).toISOString(),
      };
    }),
  );
}
