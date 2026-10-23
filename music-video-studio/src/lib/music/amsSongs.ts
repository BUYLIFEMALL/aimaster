import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// v1.13 AI 음악 스튜디오(ai-music-studio)에서 회원 본인이 만든 곡을 가져온다(가사영상 v1.10·플레이리스트 v1.27·쇼츠 원스톱 v1.38과 같은 규칙).
// 공용 DB ams_generations를 읽기만 하고 회원 user_id로 거른다. 저장소 ai-music-studio는 비공개라 1시간 서명 주소로만 넘긴다.
// 이 프로그램은 서버에 아무것도 저장하지 않는다(곡 번호만 브라우저 프로젝트에 기억). 외부 AI 호출 없음.
const BUCKET = "ai-music-studio";
const TTL = 60 * 60;

type Output = { path?: string; title?: string; durationS?: number; bytes?: number };
type Row = { id: string; title: string | null; prompt: string; lyrics: string | null; model: string; instrumental: boolean; created_at: string; outputs: Output[] | null };

export interface AmsSongItem {
  ref: string;
  title: string;
  model: string;
  durationS: number | null;
  instrumental: boolean;
  createdAt: string;
  /** 곡 설명(스타일) — 가져오면 「Suno 스타일 프롬프트」 칸에 넣는다 */
  style: string;
  lyrics: string;
  audioUrl: string | null;
}

const titleOf = (row: Row, o: Output, index: number) => {
  const base = (o.title || row.title || row.prompt.slice(0, 40) || "AI 음악").slice(0, 80);
  return (row.outputs ?? []).length > 1 ? `${base} (${index + 1})` : base;
};

/** 내 완성곡(최근 40개 생성 기록의 곡들), 미리 듣기 주소 포함 */
export async function listAmsSongs(userId: string): Promise<AmsSongItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ams_generations")
    .select("id, title, prompt, lyrics, model, instrumental, created_at, outputs")
    .eq("user_id", userId).eq("status", "completed")
    .order("created_at", { ascending: false }).limit(40);
  if (error) throw new Error(error.message);
  const items: { row: Row; o: Output; index: number }[] = [];
  for (const row of (data ?? []) as Row[]) {
    (row.outputs ?? []).forEach((o, index) => { if (o?.path?.startsWith(`${userId}/`)) items.push({ row, o, index }); });
  }
  if (!items.length) return [];
  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrls(items.map((x) => x.o.path as string), TTL);
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return items.map(({ row, o, index }) => ({
    ref: `${row.id}:${index}`,
    title: titleOf(row, o, index),
    model: row.model,
    durationS: typeof o.durationS === "number" ? Math.round(o.durationS) : null,
    instrumental: row.instrumental,
    createdAt: row.created_at,
    style: row.prompt.slice(0, 300),
    lyrics: row.instrumental ? "" : (row.lyrics ?? "").slice(0, 3000),
    audioUrl: urls.get(o.path as string) ?? null,
  }));
}

/** 가져온 곡의 듣기 주소를 새로 받는다(프로젝트를 다시 열 때) — 없거나 30일이 지나 지워졌으면 null */
export async function signAmsSong(userId: string, ref: string): Promise<string | null> {
  const m = /^([0-9a-f-]{36}):(\d{1,2})$/i.exec(ref);
  if (!m) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("ams_generations")
    .select("status, outputs")
    .eq("id", m[1]).eq("user_id", userId).maybeSingle();
  const row = data as { status: string; outputs: Output[] | null } | null;
  const path = row?.status === "completed" ? row.outputs?.[Number(m[2])]?.path : undefined;
  if (!path || !path.startsWith(`${userId}/`)) return null;
  const { data: s } = await admin.storage.from(BUCKET).createSignedUrl(path, TTL);
  return s?.signedUrl ?? null;
}
