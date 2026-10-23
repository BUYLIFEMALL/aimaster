import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/media";
import { UserError } from "@/lib/errors";

// v1.38 AI 음악 스튜디오(ai-music-studio)에서 회원 본인이 만든 곡을 배경음악으로 고른다(가사영상 v1.10·플레이리스트 v1.27과 같은 규칙).
// 공용 DB ams_generations를 읽기만 하고 회원 user_id로 거른다. 원본 저장소 ai-music-studio는 비공개라 미리 듣기는 1시간 서명 주소.
// 고른 곡은 이 프로그램 저장소 <user_id>/ams/로 복사해 기존 배경음악({path,name,volume})과 똑같이 쓴다 — AI 생성물이라 30일 정리 대상.
// 외부 AI 호출 없음.
const AMS_BUCKET = "ai-music-studio";
export const AMS_APP_URL = "https://ai-music-studio.buylife.xyz";
const MAX_BYTES = 15 * 1024 * 1024; // Lyria WAV 30초 ≈ 12MB까지 받는다(버킷 한도 30MB)

type Output = { path?: string; title?: string; durationS?: number; bytes?: number; contentType?: string };
type Row = { id: string; title: string | null; prompt: string; model: string; instrumental: boolean; created_at: string; outputs: Output[] | null };

export interface AmsPick { ref: string; title: string; model: string; durationS: number | null; mb: number | null; instrumental: boolean; createdAt: string; previewUrl: string | null; tooBig: boolean }

/** 내 완성곡(최근 40개 생성 기록의 곡들) — 미리 듣기 주소 포함 */
export async function listAmsSongs(userId: string): Promise<AmsPick[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ams_generations")
    .select("id, title, prompt, model, instrumental, created_at, outputs")
    .eq("user_id", userId).eq("status", "completed")
    .order("created_at", { ascending: false }).limit(40);
  if (error) throw new Error(error.message);
  const items: { row: Row; o: Output; index: number }[] = [];
  for (const row of (data ?? []) as Row[]) {
    (row.outputs ?? []).forEach((o, index) => { if (o?.path?.startsWith(`${userId}/`)) items.push({ row, o, index }); });
  }
  if (!items.length) return [];
  const { data: signed } = await admin.storage.from(AMS_BUCKET).createSignedUrls(items.map((x) => x.o.path as string), 60 * 60);
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return items.map(({ row, o, index }) => {
    const base = (o.title || row.title || row.prompt.slice(0, 40) || "AI 음악").slice(0, 80);
    return {
      ref: `${row.id}:${index}`,
      title: (row.outputs ?? []).length > 1 ? `${base} (${index + 1})` : base,
      model: row.model,
      durationS: typeof o.durationS === "number" ? Math.round(o.durationS) : null,
      mb: typeof o.bytes === "number" ? Math.round(o.bytes / 104857.6) / 10 : null,
      instrumental: row.instrumental,
      createdAt: row.created_at,
      previewUrl: urls.get(o.path as string) ?? null,
      tooBig: typeof o.bytes === "number" && o.bytes > MAX_BYTES,
    };
  });
}

/** ref("<생성 번호>:<곡 순서>")의 곡을 이 프로그램 저장소로 복사해 배경음악 경로를 돌려준다 */
export async function importAmsSong(userId: string, ref: string): Promise<{ path: string; name: string }> {
  const m = /^([0-9a-f-]{36}):(\d{1,2})$/i.exec(ref);
  if (!m) throw new UserError(400, "곡을 다시 골라 주세요.");
  const admin = createAdminClient();
  const { data } = await admin
    .from("ams_generations")
    .select("id, title, prompt, status, outputs")
    .eq("id", m[1]).eq("user_id", userId).maybeSingle();
  const row = data as (Row & { status: string }) | null;
  if (!row || row.status !== "completed") throw new UserError(404, "곡을 찾지 못했습니다. AI 음악 스튜디오에서 내가 만든 완성곡만 고를 수 있습니다.");
  const o = (row.outputs ?? [])[Number(m[2])];
  if (!o?.path || !o.path.startsWith(`${userId}/`)) throw new UserError(410, "이 곡의 음악 파일을 찾지 못했습니다. 보관 기간(30일)이 지나 지워졌을 수 있습니다.");
  if (typeof o.bytes === "number" && o.bytes > MAX_BYTES) throw new UserError(400, "이 곡은 15MB가 넘어 배경음악으로 쓸 수 없습니다. AI 음악 스튜디오에서 MP3로 만든 곡을 골라 주세요.");

  const { data: file, error } = await admin.storage.from(AMS_BUCKET).download(o.path);
  if (error || !file) throw new UserError(410, "이 곡의 음악 파일을 찾지 못했습니다. 보관 기간(30일)이 지나 지워졌을 수 있습니다.");
  if (file.size > MAX_BYTES) throw new UserError(400, "이 곡은 15MB가 넘어 배경음악으로 쓸 수 없습니다. AI 음악 스튜디오에서 MP3로 만든 곡을 골라 주세요.");
  const wav = (o.contentType ?? file.type).includes("wav");
  const contentType = wav ? "audio/wav" : "audio/mpeg";
  const path = `${userId}/ams/${randomUUID()}.${wav ? "wav" : "mp3"}`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType, upsert: false });
  if (upErr) throw new Error(upErr.message);
  const base = (o.title || row.title || row.prompt.slice(0, 40) || "AI 음악").slice(0, 60);
  const name = `${(row.outputs ?? []).length > 1 ? `${base} (${Number(m[2]) + 1})` : base} (AI 음악 스튜디오)`;
  return { path, name };
}
