import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { linesFromAlignedWords, type SunoWord, type TimedLine } from "@/lib/sunoAlign";
import { lookupRemixVariant, ownStoragePath, remixTrack, signRemixAssets, type RemixDb, type RemixRow, type RemixVariantRow } from "@/lib/remixTracks";

// v1.19 음악(SUNO) 자동화(music/, slug music-automation)에서 회원 본인이 만든 곡을 가져온다(가사영상 v1.05 `src/lib/suno.ts`와 같은 규칙).
// 공용 DB의 music_tracks·music_track_variants를 읽기만 하고, 모든 조회를 회원 user_id로 거른다.
// 저장소 music-audio는 비공개라 음악은 1시간짜리 서명 주소로만 넘긴다.
// 리믹스 결과(music_track_remixes·music_track_remix_variants)도 같은 규칙으로 함께 — 두 표 모두 회원 user_id로 거른다(가사 영상 suno.ts와 같음).
// 시간 가사는 회원 본인 Suno 키(user_api_keys provider "suno")로만 받는다 — 운영자·다른 회원 키로 폴백하지 않는다.
const SUNO_BASE = "https://api.sunoapi.org";
const BUCKET = "music-audio";
const VARIANTS = "music_track_variants!music_track_variants_track_id_fkey"; // 관계가 2개라(연장 원곡) 이름을 지정해야 한다

export class SunoError extends Error {
  constructor(public status: number, message: string, public needSunoKey = false) { super(message); }
}

export interface SunoVariant { id: string; duration: number | null; canTime: boolean; blocked?: string }
export interface SunoTrack { id: string; title: string; mode: "vocal" | "instrumental"; createdAt: string; variants: SunoVariant[] }

function storagePath(url: string | null): string | null {
  if (!url) return null;
  const prefix = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length).split("?")[0]) || null;
}

async function signPath(path: string): Promise<string | null> {
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

async function signed(url: string | null): Promise<string | null> {
  const path = storagePath(url);
  if (!path) return url && /^https:\/\//.test(url) ? url : null;
  return signPath(path);
}

type VRow = { id: string; suno_audio_id: string | null; duration_seconds: number | null; created_at: string };

const REMIX_LIMIT = 20;

/** 회원 본인의 완료된 리믹스(최근 20개) — 읽기에 실패하면 일반 곡 목록은 그대로 두고 리믹스만 빠진다 */
async function listRemixTracks(userId: string): Promise<SunoTrack[]> {
  const { data, error } = await createAdminClient()
    .from("music_track_remixes")
    .select("id, mode, instrumental, source_title, task_id, created_at, music_track_remix_variants(id, user_id, suno_audio_id, duration_seconds, created_at, audio_url)")
    .eq("user_id", userId).eq("status", "completed")
    .order("created_at", { ascending: false }).limit(REMIX_LIMIT);
  if (error) { console.error("[playlist suno remixes]", error.code ?? "unknown"); return []; }
  return (data ?? []).flatMap((r) => {
    const row = r as Record<string, unknown>;
    const variants = ((row.music_track_remix_variants ?? []) as (RemixVariantRow & { user_id: string })[]).filter((v) => v.user_id === userId);
    // 음원이 회원 폴더에 저장되지 않은 변주(외부 주소 등)는 「받을 수 없음」으로 — 받기에서 410이 날 곡을 미리 고르지 못하게
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const track = remixTrack({ ...(row as unknown as RemixRow), variants }, (v) => !!ownStoragePath(v.audio_url ?? null, base, BUCKET, userId));
    return track ? [track] : [];
  });
}

/** 회원 본인의 완성된 곡(보컬·인스트루멘탈, 최근 40곡) + 완료된 리믹스(최근 20개), 만든 순서 최신 먼저 */
export async function listSunoTracks(userId: string): Promise<SunoTrack[]> {
  const [songs, remixes] = await Promise.all([listSongTracks(userId), listRemixTracks(userId)]);
  return [...songs, ...remixes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function listSongTracks(userId: string): Promise<SunoTrack[]> {
  const { data, error } = await createAdminClient()
    .from("music_tracks")
    .select(`id, title, mode, created_at, task_id, ${VARIANTS}(id, suno_audio_id, duration_seconds, created_at)`)
    .eq("user_id", userId).eq("status", "completed")
    .order("created_at", { ascending: false }).limit(40);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => {
    const row = t as Record<string, unknown>;
    const vs = ((row.music_track_variants ?? []) as VRow[]).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
    const mode: SunoTrack["mode"] = row.mode === "instrumental" ? "instrumental" : "vocal";
    return {
      id: row.id as string, title: (row.title as string) || "제목 없음", mode, createdAt: row.created_at as string,
      variants: vs.map((v) => ({ id: v.id, duration: v.duration_seconds, canTime: mode === "vocal" && !!(row.task_id && v.suno_audio_id) })),
    };
  }).filter((t) => t.variants.length > 0);
}

type VariantRow = { id: string; suno_audio_id: string | null; audio_url: string; image_url: string | null; music_tracks: { title: string; task_id: string | null; mode: string } | null; remix?: true };

async function ownVariant(userId: string, variantId: string): Promise<VariantRow> {
  const { data, error } = await createAdminClient()
    .from("music_track_variants")
    .select("id, suno_audio_id, audio_url, image_url, music_tracks!music_track_variants_track_id_fkey(title, task_id, mode)")
    .eq("id", variantId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as unknown as VariantRow;
  // 리믹스 결과(?remix=) — 회원 본인 「완료된」 것만(곡 목록과 같은 조건). 반주 추가·연주곡은 연주곡으로 보아 시간 가사를 받지 않는다
  const remix = await lookupRemixVariant(createAdminClient() as unknown as RemixDb, userId, variantId);
  if (remix) return remix;
  throw new SunoError(404, "곡을 찾지 못했습니다. 음악(SUNO) 자동화에서 내가 만든 곡만 가져올 수 있습니다.");
}

/** 변주 하나의 음악·커버 서명 주소(v1.20 커버 추가 — 플레이리스트 배경 만들기) */
export async function getSunoVariant(userId: string, variantId: string) {
  const v = await ownVariant(userId, variantId);
  if (v.remix) { // 리믹스: 회원 본인 폴더 경로만 서명(외부 주소·다른 회원 경로는 서명하지 않음). 일반 곡은 아래 기존 그대로
    const { audioUrl, coverUrl } = await signRemixAssets(v, userId, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", BUCKET, signPath);
    if (!audioUrl) throw new SunoError(410, "이 곡의 음악 파일을 찾지 못했습니다. 보관 기간이 지나 지워졌을 수 있습니다.");
    return { id: v.id, title: v.music_tracks?.title ?? "", audioUrl, coverUrl };
  }
  const audioUrl = await signed(v.audio_url);
  if (!audioUrl) throw new SunoError(410, "이 곡의 음악 파일을 찾지 못했습니다. 보관 기간이 지나 지워졌을 수 있습니다.");
  return { id: v.id, title: v.music_tracks?.title ?? "", audioUrl, coverUrl: await signed(v.image_url) };
}

/** 회원 본인 Suno 키로 시간 가사를 받아 줄 시간표로 바꾼다 */
export async function fetchSunoTimedLines(userId: string, variantId: string): Promise<TimedLine[]> {
  const v = await ownVariant(userId, variantId);
  const taskId = v.music_tracks?.task_id, audioId = v.suno_audio_id;
  if (v.music_tracks?.mode !== "vocal" || !taskId || !audioId) throw new SunoError(400, "이 곡은 시간 가사를 받을 수 없습니다(연주곡이거나 Suno 작업 번호 없음).");
  const { data: key } = await createAdminClient().from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", "suno").maybeSingle();
  const apiKey = (key?.api_key as string | undefined)?.trim();
  if (!apiKey) throw new SunoError(400, "본인 Suno API 키가 없습니다. 음악(SUNO) 자동화의 「API키등록·플랫폼연동」에서 등록해 주세요.", true);

  let res: Response;
  try {
    res = await fetch(`${SUNO_BASE}/api/v1/generate/get-timestamped-lyrics`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ taskId, audioId }), signal: AbortSignal.timeout(30_000), cache: "no-store",
    });
  } catch { throw new SunoError(502, "Suno 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
  const body = (await res.json().catch(() => null)) as { code?: number; msg?: string; data?: { alignedWords?: SunoWord[] } } | null;
  if (res.status === 401 || body?.code === 401) throw new SunoError(400, "Suno API 키가 맞지 않습니다. 음악(SUNO) 자동화에서 본인 키를 다시 확인해 주세요.", true);
  if (res.status === 429 || body?.code === 429 || body?.code === 430) throw new SunoError(429, "Suno 크레딧이 부족하거나 요청이 많습니다. 잠시 후 다시 시도해 주세요.");
  if (!res.ok || body?.code !== 200) throw new SunoError(502, `Suno가 시간 가사를 주지 않았습니다${body?.msg ? `(${String(body.msg).slice(0, 80)})` : ""}.`);
  const lines = linesFromAlignedWords(body.data?.alignedWords ?? []);
  if (!lines.length) throw new SunoError(422, "Suno 시간 가사가 비어 있습니다.");
  return lines;
}
