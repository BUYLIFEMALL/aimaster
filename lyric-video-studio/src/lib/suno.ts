import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserError } from "@/lib/errors";
import { linesFromAlignedWords, type SunoWord, type TimedLine } from "@/lib/sunoAlign";

// v1.05 음악(SUNO) 자동화(music/, slug music-automation)에서 회원 본인이 만든 곡을 가져온다.
// 공용 DB의 music_tracks·music_track_variants를 읽기만 하고(쓰기 없음), 모든 조회를 회원 user_id로 거른다.
// 저장소 music-audio는 비공개라(2026-10-21 music v1.20) 음악·커버는 1시간짜리 서명 주소로만 넘긴다.
// 시간 가사는 회원 본인 Suno 키(user_api_keys provider "suno")로만 받는다 — 운영자·다른 회원 키로 폴백하지 않는다.
const SUNO_BASE = "https://api.sunoapi.org";
const BUCKET = "music-audio";
const VIEW_TTL_SECONDS = 60 * 60;
export const MUSIC_APP_URL = "https://music-automation.buylife.xyz";
const VARIANTS = "music_track_variants!music_track_variants_track_id_fkey"; // 관계가 2개라(연장 원곡) 이름을 지정해야 한다

export interface SunoVariant { id: string; duration: number | null; hasCover: boolean; canTime: boolean }
export interface SunoTrack { id: string; title: string; createdAt: string; variants: SunoVariant[] }

function storagePath(url: string | null): string | null {
  if (!url) return null;
  const prefix = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length).split("?")[0]) || null;
}

async function signed(url: string | null): Promise<string | null> {
  const path = storagePath(url);
  if (!path) return url && /^https:\/\//.test(url) ? url : null; // 저장소 밖 주소(옛 Suno 주소 등)는 그대로
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrl(path, VIEW_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

/** 회원 본인의 완성된 보컬 곡(최근 30곡) */
export async function listSunoTracks(userId: string): Promise<SunoTrack[]> {
  const { data, error } = await createAdminClient()
    .from("music_tracks")
    .select(`id, title, created_at, task_id, ${VARIANTS}(id, suno_audio_id, duration_seconds, image_url, created_at)`)
    .eq("user_id", userId).eq("status", "completed").eq("mode", "vocal")
    .order("created_at", { ascending: false }).limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => {
    const vs = ((t as Record<string, unknown>)[VARIANTS.split("!")[0]] ?? (t as Record<string, unknown>).music_track_variants ?? []) as { id: string; suno_audio_id: string | null; duration_seconds: number | null; image_url: string | null; created_at: string }[];
    return {
      id: t.id as string, title: (t.title as string) || "제목 없음", createdAt: t.created_at as string,
      variants: [...vs].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((v) => ({ id: v.id, duration: v.duration_seconds, hasCover: !!v.image_url, canTime: !!(t.task_id && v.suno_audio_id) })),
    };
  }).filter((t) => t.variants.length > 0);
}

type VariantRow = { id: string; suno_audio_id: string | null; audio_url: string; image_url: string | null; music_tracks: { title: string; prompt_text: string; task_id: string | null; mode: string } | null };

async function ownVariant(userId: string, variantId: string): Promise<VariantRow> {
  const { data, error } = await createAdminClient()
    .from("music_track_variants")
    .select("id, suno_audio_id, audio_url, image_url, music_tracks!music_track_variants_track_id_fkey(title, prompt_text, task_id, mode)")
    .eq("id", variantId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new UserError(404, "곡을 찾지 못했습니다. 음악(SUNO) 자동화에서 내가 만든 곡만 가져올 수 있습니다.");
  return data as unknown as VariantRow;
}

/** 변주 하나의 음악·커버 서명 주소와 가사 글 */
export async function getSunoVariant(userId: string, variantId: string) {
  const v = await ownVariant(userId, variantId);
  const audioUrl = await signed(v.audio_url);
  if (!audioUrl) throw new UserError(410, "이 곡의 음악 파일을 찾지 못했습니다. 보관 기간이 지나 지워졌을 수 있습니다.");
  return {
    id: v.id, title: v.music_tracks?.title ?? "", lyrics: v.music_tracks?.prompt_text ?? "",
    audioUrl, coverUrl: await signed(v.image_url), canTime: !!(v.music_tracks?.task_id && v.suno_audio_id),
  };
}

/** 회원 본인 Suno 키로 시간 가사를 받아 줄 시간표로 바꾼다 */
export async function fetchSunoTimedLines(userId: string, variantId: string): Promise<TimedLine[]> {
  const v = await ownVariant(userId, variantId);
  const taskId = v.music_tracks?.task_id, audioId = v.suno_audio_id;
  if (!taskId || !audioId) throw new UserError(400, "이 곡은 Suno 작업 번호가 없어 시간 가사를 받을 수 없습니다. 가사 글로 넣고 싱크 화면에서 맞춰 주세요.");
  const { data: key } = await createAdminClient().from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", "suno").maybeSingle();
  const apiKey = (key?.api_key as string | undefined)?.trim();
  if (!apiKey) throw new UserError(400, "본인 Suno API 키가 없습니다. 음악(SUNO) 자동화의 「API키등록·플랫폼연동」에서 등록해 주세요.", { needSunoKey: true });

  let res: Response;
  try {
    res = await fetch(`${SUNO_BASE}/api/v1/generate/get-timestamped-lyrics`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ taskId, audioId }), signal: AbortSignal.timeout(30_000), cache: "no-store",
    });
  } catch { throw new UserError(502, "Suno 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
  const body = (await res.json().catch(() => null)) as { code?: number; msg?: string; data?: { alignedWords?: SunoWord[] } } | null;
  if (res.status === 401 || body?.code === 401) throw new UserError(400, "Suno API 키가 맞지 않습니다. 음악(SUNO) 자동화에서 본인 키를 다시 확인해 주세요.", { needSunoKey: true });
  if (res.status === 429 || body?.code === 429 || body?.code === 430) throw new UserError(429, "Suno 크레딧이 부족하거나 요청이 많습니다. 잠시 후 다시 시도해 주세요.");
  if (!res.ok || body?.code !== 200) throw new UserError(502, `Suno가 시간 가사를 주지 않았습니다${body?.msg ? `(${String(body.msg).slice(0, 80)})` : ""}. 가사 글로 넣고 싱크 화면에서 맞춰 주세요.`);
  const lines = linesFromAlignedWords(body.data?.alignedWords ?? []);
  if (!lines.length) throw new UserError(422, "Suno 시간 가사가 비어 있습니다. 가사 글로 넣고 싱크 화면에서 맞춰 주세요.");
  return lines;
}
