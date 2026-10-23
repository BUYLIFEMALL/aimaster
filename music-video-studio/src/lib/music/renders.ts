import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_RENDERS, RENDER_BUCKET, checkRenderSize, cleanTitle, daysLeft, renderPath } from "./renderArchive";

// v1.22 완성본 보관(mvs_renders). 기준: ai-video-studio lib/edit/edits.ts(avs_edits) — 같은 틀을 이 프로그램 전용으로 옮김(서로 호출하지 않음).
// 회원 본인 행만 다룬다(user_id 조건). 파일은 브라우저가 서명 업로드 주소로 {user}/renders/{id}.mp4에 바로 올리고,
// 업로드가 끝나면 done으로 파일이 실제 있는지 확인한 뒤 uploaded=true. 30일 자동 정리는 /api/cron/cleanup.
export class RenderError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Row = { id: string; title: string; song_title: string | null; output_path: string; output_bytes: number; duration_s: number | null; width: number | null; height: number | null; created_at: string };

/** 보관 시작 — 행을 만들고 서명 업로드 주소를 준다 */
export async function startRender(userId: string, input: { title?: unknown; songTitle?: unknown; bytes?: unknown; seconds?: unknown; width?: unknown; height?: unknown }) {
  const problem = checkRenderSize(input.bytes);
  if (problem) throw new RenderError(400, problem);
  const admin = createAdminClient();
  // 끝내지 못한 업로드(하루 지난 것)는 개수에서 빼고 정리
  const stale = new Date(Date.now() - 86_400_000).toISOString();
  const { data: old } = await admin.from("mvs_renders").select("id, output_path").eq("user_id", userId).eq("uploaded", false).lt("created_at", stale);
  if (old?.length) {
    await admin.storage.from(RENDER_BUCKET).remove(old.map((r) => r.output_path as string));
    await admin.from("mvs_renders").delete().in("id", old.map((r) => r.id as string)).eq("user_id", userId);
  }
  const { count } = await admin.from("mvs_renders").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= MAX_RENDERS) throw new RenderError(409, `보관함이 가득 찼습니다(최대 ${MAX_RENDERS}개). 보관한 완성본을 지운 뒤 다시 저장해 주세요.`);

  const id = randomUUID();
  const path = renderPath(userId, id);
  const num = (v: unknown, max: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(max, Math.round(n)) : null; };
  const seconds = Number(input.seconds);
  const { error } = await admin.from("mvs_renders").insert({
    id, user_id: userId,
    title: cleanTitle(input.title),
    song_title: typeof input.songTitle === "string" && input.songTitle.trim() ? cleanTitle(input.songTitle) : null,
    output_path: path,
    output_bytes: Math.round(Number(input.bytes)),
    duration_s: Number.isFinite(seconds) && seconds > 0 ? Math.round(Math.min(600, seconds) * 100) / 100 : null,
    width: num(input.width, 4096), height: num(input.height, 4096),
  });
  if (error) throw new RenderError(500, "보관을 시작하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  const { data, error: e2 } = await admin.storage.from(RENDER_BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (e2 || !data) {
    await admin.from("mvs_renders").delete().eq("id", id).eq("user_id", userId);
    throw new RenderError(500, "업로드 주소를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  return { id, path, token: data.token, bucket: RENDER_BUCKET };
}

/** 업로드 끝 — 파일이 실제로 있으면 확정, 없으면 행을 지운다 */
export async function finishRender(userId: string, id: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("mvs_renders").select("output_path").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) throw new RenderError(404, "보관 기록을 찾지 못했습니다. 다시 저장해 주세요.");
  const path = data.output_path as string;
  const dir = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data: files } = await admin.storage.from(RENDER_BUCKET).list(dir, { search: name, limit: 1 });
  if (!files?.some((f) => f.name === name)) {
    await admin.from("mvs_renders").delete().eq("id", id).eq("user_id", userId);
    throw new RenderError(409, "업로드된 파일을 찾지 못했습니다. 네트워크를 확인한 뒤 다시 저장해 주세요.");
  }
  const { error } = await admin.from("mvs_renders").update({ uploaded: true }).eq("id", id).eq("user_id", userId);
  if (error) throw new RenderError(500, "보관을 마치지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
}

/** 내 보관 목록 — 1시간 재생·내려받기 주소, 남은 보관일 */
export async function listRenders(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("mvs_renders")
    .select("id, title, song_title, output_path, output_bytes, duration_s, width, height, created_at")
    .eq("user_id", userId).eq("uploaded", true).order("created_at", { ascending: false }).limit(MAX_RENDERS);
  if (error) throw new RenderError(500, "보관한 완성본을 불러오지 못했습니다.");
  return Promise.all(((data ?? []) as Row[]).map(async (r) => {
    const { data: play } = await admin.storage.from(RENDER_BUCKET).createSignedUrl(r.output_path, 3600);
    const file = `${r.title.replace(/[^A-Za-z0-9가-힣_-]+/g, "-").slice(0, 40) || "music-video"}-${r.id.slice(0, 6)}.mp4`;
    const { data: dl } = await admin.storage.from(RENDER_BUCKET).createSignedUrl(r.output_path, 3600, { download: file });
    return {
      id: r.id, title: r.title, songTitle: r.song_title, mb: Math.round(r.output_bytes / 104857.6) / 10,
      seconds: r.duration_s, width: r.width, height: r.height, createdAt: r.created_at, daysLeft: daysLeft(r.created_at),
      url: play?.signedUrl ?? null, downloadUrl: dl?.signedUrl ?? null,
    };
  }));
}

/** 보관한 완성본 지우기(파일 먼저, 그다음 행) */
export async function deleteRender(userId: string, id: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("mvs_renders").select("output_path").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) throw new RenderError(404, "보관한 완성본을 찾지 못했습니다. 이미 지워졌을 수 있습니다.");
  const { error: e1 } = await admin.storage.from(RENDER_BUCKET).remove([data.output_path as string]);
  if (e1) throw new RenderError(500, "파일을 지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  await admin.from("mvs_renders").delete().eq("id", id).eq("user_id", userId);
}
