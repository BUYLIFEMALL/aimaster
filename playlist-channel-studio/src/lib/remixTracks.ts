// 음악(SUNO) 리믹스 결과(music_track_remixes + music_track_remix_variants)를 플레이리스트 곡 목록 모양으로 바꾸는 규칙.
// 서버 조회(sunoTracks.ts)와 화면 주소 읽기(SunoImportPanel.tsx)가 같이 쓰고, 순수 함수라 단위 시험한다.
// 규칙은 가사 영상(lyric-video-studio/src/lib/suno.ts ownVariant)과 같다: 반주 추가·연주곡은 가사가 없어 시간 가사를 받지 않는다.

export const REMIX_MODE_LABEL: Record<string, string> = { cover: "커버", add_vocals: "보컬 추가", add_instrumental: "반주 추가", mashup: "매시업" };

export type RemixMeta = { mode: string | null; instrumental: boolean | null; source_title: string | null; task_id: string | null };
export type RemixVariantRow = { id: string; suno_audio_id: string | null; duration_seconds: number | null; created_at: string };
export type RemixRow = RemixMeta & { id: string; created_at: string; variants: RemixVariantRow[] };
export type RemixTrack = {
  id: string; title: string; mode: "vocal" | "instrumental"; createdAt: string;
  variants: { id: string; duration: number | null; canTime: boolean }[];
};

/** 노래(가사)가 있는 리믹스인가 — 반주 추가·연주곡이면 아니다 */
export const remixIsVocal = (r: Pick<RemixMeta, "mode" | "instrumental">): boolean => !r.instrumental && r.mode !== "add_instrumental";

/** 「원곡 제목 (방식)」 — 같은 원곡의 일반 곡과 구분된다 */
export const remixTitle = (r: Pick<RemixMeta, "mode" | "source_title">): string =>
  `${(r.source_title ?? "").trim() || "제목 없음"} (${REMIX_MODE_LABEL[r.mode ?? ""] ?? "리믹스"})`;

/** 리믹스 한 건 → 곡 목록 한 줄(변주는 만든 순서). 변주가 없으면 null */
export function remixTrack(r: RemixRow): RemixTrack | null {
  if (!r.variants.length) return null;
  const vocal = remixIsVocal(r);
  return {
    id: r.id, title: remixTitle(r), mode: vocal ? "vocal" : "instrumental", createdAt: r.created_at,
    variants: [...r.variants].sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((v) => ({ id: v.id, duration: v.duration_seconds, canTime: vocal && !!(r.task_id && v.suno_audio_id) })),
  };
}

const UUID = /^[0-9a-f-]{36}$/i;

/** 주소의 쉼표 목록(?suno=a,b / ?remix=c)에서 올바른 곡 번호만, 중복 없이 */
export function parseIdParam(raw: string | null): string[] {
  return Array.from(new Set((raw ?? "").split(",").map((x) => x.trim()).filter((x) => UUID.test(x))));
}

/** 일반 곡 번호 뒤에 리믹스 번호를 이어 붙여 최대 max개(앞쪽 우선, 중복 제거) */
export function mergeIncoming(suno: string[], remix: string[], max: number): string[] {
  return Array.from(new Set([...suno, ...remix])).slice(0, max);
}

/** 리믹스 조회에 필요한 만큼만 — 실제로는 Supabase 관리자 클라이언트, 시험에서는 가짜 */
type Query = { eq(column: string, value: string): Query; maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }> };
export type RemixDb = { from(table: string): { select(columns: string): Query } };
export type RemixVariant = {
  id: string; suno_audio_id: string | null; audio_url: string; image_url: string | null;
  music_tracks: { title: string; task_id: string | null; mode: "vocal" | "instrumental" };
  /** 리믹스 경로 표시 — 파일 주소는 signRemixAssets(회원 폴더 확인)로만 발급한다 */
  remix: true;
};

/**
 * 곡 번호가 회원 본인의 「완료된」 리믹스 결과면 곡 정보로, 아니면 null(부르는 쪽이 기존 404).
 * 곡 목록(listRemixTracks)과 같은 조건 — 변주·부모 모두 user_id, 부모는 status completed.
 * null이면 부르는 쪽은 서명 주소·Suno 키 조회·Suno 호출 전에 멈춘다.
 */
export async function lookupRemixVariant(db: RemixDb, userId: string, variantId: string): Promise<RemixVariant | null> {
  const { data: rv, error: rvErr } = await db
    .from("music_track_remix_variants").select("id, remix_id, suno_audio_id, audio_url, image_url")
    .eq("id", variantId).eq("user_id", userId).maybeSingle();
  if (rvErr) throw new Error(rvErr.message);
  const v = rv as { id: string; remix_id: string; suno_audio_id: string | null; audio_url: string; image_url: string | null } | null;
  if (!v) return null;
  const { data: rm, error: rmErr } = await db
    .from("music_track_remixes").select("task_id, mode, source_title, instrumental")
    .eq("id", v.remix_id).eq("user_id", userId).eq("status", "completed").maybeSingle();
  if (rmErr) throw new Error(rmErr.message);
  const r = rm as (RemixMeta & { task_id: string | null }) | null;
  if (!r) return null;
  const vocal = remixIsVocal(r);
  return {
    id: v.id, suno_audio_id: vocal ? v.suno_audio_id : null, audio_url: v.audio_url, image_url: v.image_url,
    music_tracks: { title: remixTitle(r), task_id: vocal ? r.task_id : null, mode: vocal ? "vocal" : "instrumental" },
    remix: true,
  };
}

/**
 * 저장소 공개 주소 형식(`<base>/storage/v1/object/public/<bucket>/<path>`)이고 그 경로가 회원 본인 폴더(`<userId>/…`)일 때만 경로를 돌려준다.
 * 외부 주소·다른 저장소·다른 회원 폴더·빈 칸이나 `.`·`..` 조각이 있으면 null(관리자 서명을 하지 않는다).
 * 음악(SUNO) 리믹스 결과는 `<user>/remix/…`에 저장된다(운영 6개 모두 확인 2026-11-19).
 */
export function ownStoragePath(url: string | null, base: string, bucket: string, userId: string): string | null {
  if (!url || !base || !userId) return null;
  const prefix = `${base.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/`;
  if (!url.startsWith(prefix)) return null;
  let path: string;
  try { path = decodeURIComponent(url.slice(prefix.length).split(/[?#]/)[0]); } catch { return null; }
  const seg = path.split("/");
  if (seg.length < 2 || seg[0] !== userId || seg.some((s) => !s || s === "." || s === "..")) return null;
  return path;
}

/** 리믹스 음악·커버 서명 — 회원 폴더 경로만 sign을 부른다. 음악이 회원 폴더가 아니면 커버도 서명하지 않는다 */
export async function signRemixAssets(
  v: { audio_url: string | null; image_url: string | null }, userId: string, base: string, bucket: string,
  sign: (path: string) => Promise<string | null>,
): Promise<{ audioUrl: string | null; coverUrl: string | null }> {
  const audioPath = ownStoragePath(v.audio_url, base, bucket, userId);
  if (!audioPath) return { audioUrl: null, coverUrl: null };
  const audioUrl = await sign(audioPath);
  if (!audioUrl) return { audioUrl: null, coverUrl: null };
  const coverPath = ownStoragePath(v.image_url, base, bucket, userId);
  return { audioUrl, coverUrl: coverPath ? await sign(coverPath) : null };
}

/** 주소로 받은 곡 번호 중 실제 내 곡 목록에 있는 수 — 목록을 아직 못 받았으면 null */
export function incomingStatus(incomingIds: string[], availableIds: string[] | null): { found: number; missing: number } | null {
  if (!availableIds) return null;
  const have = new Set(availableIds);
  const found = incomingIds.filter((id) => have.has(id)).length;
  return { found, missing: incomingIds.length - found };
}
