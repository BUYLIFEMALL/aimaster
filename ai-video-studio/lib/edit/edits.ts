import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/generations";
import { sanitizeSaved, type SavedProject } from "@/lib/edit/timeline";

// 영상 합치기 편집 저장(avs_edits). 파일은 브라우저가 서명 업로드 주소로 회원 폴더 {user}/edits/{id}/에 바로 올린다(Vercel 본문 4.5MB 제한 회피).
// 회원 본인 행만 다룬다(user_id 조건). 30일 자동 정리는 /api/cron/cleanup.
const AMS_BUCKET = "ai-music-studio";
export const MAX_OUTPUT_BYTES = 50 * 1024 * 1024; // 버킷 한도와 같음

type Admin = ReturnType<typeof createAdminClient>;
export interface EditRow { id: string; user_id: string; title: string; project: SavedProject; voice_paths: string[]; output_path: string | null; output_bytes: number | null; duration_s: number | null; created_at: string; updated_at: string }

export class EditError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const safeId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || "clip";

export interface PendingVoice { clipId: string; duration: number; starts: number[] | null; mime: string }

/** 편집 저장(새로 만들거나 고침) → 올릴 파일들의 서명 업로드 주소 */
export async function saveEdit(userId: string, input: { id?: unknown; title?: unknown; project?: unknown; pendingVoices?: unknown; video?: unknown }) {
  const admin = createAdminClient();
  const prefix = `${userId}/`;
  const project = sanitizeSaved(input.project, prefix);
  if (!project) throw new EditError(400, "편집 내용이 올바르지 않습니다. 화면을 새로고침한 뒤 다시 저장해 주세요.");
  const title = (typeof input.title === "string" ? input.title.trim() : "").slice(0, 80) || "제목 없는 편집";

  let id = typeof input.id === "string" && /^[0-9a-f-]{36}$/i.test(input.id) ? input.id : "";
  let old: Pick<EditRow, "voice_paths" | "output_path"> | null = null;
  if (id) {
    const { data } = await admin.from("avs_edits").select("voice_paths, output_path").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!data) throw new EditError(404, "저장된 편집을 찾지 못했습니다. 새로 저장해 주세요.");
    old = data as Pick<EditRow, "voice_paths" | "output_path">;
  } else {
    id = randomUUID();
  }
  const dir = `${userId}/edits/${id}`;

  // 새로 만든 내레이션 음성 → 저장 경로를 정해 구성에 넣는다
  const uploads: { key: string; path: string; token: string }[] = [];
  const pending = Array.isArray(input.pendingVoices) ? (input.pendingVoices as PendingVoice[]).slice(0, 20) : [];
  for (const pv of pending) {
    const clip = project.clips.find((c) => c.id === pv?.clipId);
    if (!clip) continue;
    const mime = pv.mime === "audio/wav" ? "audio/wav" : "audio/mpeg";
    const path = `${dir}/voice-${safeId(clip.id)}-${Date.now().toString(36)}.${mime === "audio/wav" ? "wav" : "mp3"}`;
    clip.voice = { path, mime, duration: Math.min(600, Math.max(0, Number(pv.duration) || 0)), starts: Array.isArray(pv.starts) ? pv.starts.filter((x) => typeof x === "number").slice(0, 400) : null };
    uploads.push({ key: `voice:${clip.id}`, path, token: "" });
  }
  // 완성본 갤러리 저장
  let outputPath = old?.output_path ?? null;
  let outputBytes: number | null = null;
  let duration: number | null = null;
  const video = input.video as { bytes?: unknown; seconds?: unknown } | undefined;
  if (video && typeof video === "object") {
    const bytes = Number(video.bytes);
    if (!Number.isFinite(bytes) || bytes <= 0) throw new EditError(400, "완성 영상 정보가 올바르지 않습니다.");
    if (bytes > MAX_OUTPUT_BYTES) throw new EditError(400, "완성 영상이 50MB를 넘어 갤러리에 저장할 수 없습니다. 720p로 만들거나 길이를 줄인 뒤 다시 저장해 주세요. 내려받기는 그대로 됩니다.");
    outputPath = `${dir}/video.mp4`;
    outputBytes = Math.round(bytes);
    duration = Math.round(Math.min(600, Math.max(0, Number(video.seconds) || 0)) * 100) / 100;
    uploads.push({ key: "video", path: outputPath, token: "" });
  }

  for (const u of uploads) {
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(u.path, { upsert: true });
    if (error || !data) throw new EditError(500, "업로드 주소를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    u.token = data.token;
  }

  const voicePaths = project.clips.map((c) => c.voice?.path).filter((p): p is string => !!p);
  const row = { title, project, voice_paths: voicePaths, updated_at: new Date().toISOString(), ...(video ? { output_path: outputPath, output_bytes: outputBytes, duration_s: duration } : {}) };
  if (old) {
    const { error } = await admin.from("avs_edits").update(row).eq("id", id).eq("user_id", userId);
    if (error) throw new EditError(500, "편집을 저장하지 못했습니다.");
    const unused = (old.voice_paths ?? []).filter((p) => !voicePaths.includes(p));
    if (unused.length) await admin.storage.from(BUCKET).remove(unused);
  } else {
    const { error } = await admin.from("avs_edits").insert({ id, user_id: userId, ...row });
    if (error) throw new EditError(500, "편집을 저장하지 못했습니다.");
  }
  return { id, title, uploads, project };
}

/** 내 편집 목록(갤러리 「편집본」·불러오기 목록) */
export async function listEdits(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("avs_edits")
    .select("id, title, project, output_path, output_bytes, duration_s, created_at, updated_at")
    .eq("user_id", userId).order("updated_at", { ascending: false }).limit(40);
  if (error) throw new EditError(500, "편집 목록을 불러오지 못했습니다.");
  const rows = (data ?? []) as Omit<EditRow, "user_id" | "voice_paths">[];
  return Promise.all(rows.map(async (r) => {
    let url: string | null = null; let downloadUrl: string | null = null;
    if (r.output_path) {
      const { data: play } = await admin.storage.from(BUCKET).createSignedUrl(r.output_path, 3600);
      const { data: dl } = await admin.storage.from(BUCKET).createSignedUrl(r.output_path, 3600, { download: `ai-video-edit-${r.id.slice(0, 8)}.mp4` });
      url = play?.signedUrl ?? null; downloadUrl = dl?.signedUrl ?? null;
    }
    return {
      id: r.id, title: r.title, clips: r.project?.clips?.length ?? 0, aspect: r.project?.aspect ?? "9:16",
      outputBytes: r.output_bytes, durationS: r.duration_s, url, downloadUrl,
      createdAt: r.created_at, updatedAt: r.updated_at,
      expiresAt: new Date(new Date(r.created_at).getTime() + 30 * 86_400_000).toISOString(),
    };
  }));
}

async function signed(admin: Admin, bucket: string, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** 편집 하나 불러오기 — 갤러리 영상·AI 음악 스튜디오 곡·음성의 1시간 서명 주소(모두 회원 본인 것만) */
export async function loadEdit(userId: string, id: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("avs_edits").select("id, title, project").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) throw new EditError(404, "저장된 편집을 찾지 못했습니다. 30일이 지나 정리됐을 수 있습니다.");
  const project = sanitizeSaved((data as { project: unknown }).project, `${userId}/`);
  if (!project) throw new EditError(500, "저장된 편집을 읽지 못했습니다.");

  const genIds = project.clips.flatMap((c) => (c.source.kind === "gallery" ? [c.source.id] : []));
  const genUrl = new Map<string, string | null>();
  if (genIds.length) {
    const { data: gens } = await admin.from("avs_generations").select("id, outputs, status").eq("user_id", userId).in("id", genIds);
    for (const g of (gens ?? []) as { id: string; outputs: { path: string }[]; status: string }[]) {
      genUrl.set(g.id, g.status === "completed" ? await signed(admin, BUCKET, g.outputs?.[0]?.path) : null);
    }
  }
  const clips: Record<string, string | null> = {};
  const voices: Record<string, string | null> = {};
  for (const c of project.clips) {
    clips[c.id] = c.source.kind === "gallery" ? genUrl.get(c.source.id) ?? null : null;
    voices[c.id] = c.voice ? await signed(admin, BUCKET, c.voice.path) : null;
  }
  let music: string | null = null;
  if (project.music?.source.kind === "ams") {
    const [genId, idx] = project.music.source.ref.split(":");
    const { data: song } = await admin.from("ams_generations").select("outputs, status").eq("id", genId).eq("user_id", userId).maybeSingle();
    const path = (song as { outputs?: { path?: string }[]; status?: string } | null)?.outputs?.[Number(idx)]?.path;
    if (song && (song as { status: string }).status === "completed" && path?.startsWith(`${userId}/`)) music = await signed(admin, AMS_BUCKET, path);
  }
  return { id: data.id as string, title: data.title as string, project, urls: { clips, voices, music } };
}

/** 편집 삭제(파일 먼저, 행 나중) */
export async function deleteEdit(userId: string, id: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("avs_edits").select("voice_paths, output_path").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) throw new EditError(404, "이미 지워졌거나 찾을 수 없는 편집입니다.");
  const r = data as Pick<EditRow, "voice_paths" | "output_path">;
  const paths = [...(r.voice_paths ?? []), r.output_path].filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from(BUCKET).remove(paths);
  const { error } = await admin.from("avs_edits").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new EditError(500, "편집을 지우지 못했습니다.");
}
