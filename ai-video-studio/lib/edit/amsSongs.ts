import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

// 2차 영상 합치기 — AI 음악 스튜디오(ai-music-studio)에서 회원 본인이 만든 완성곡을 배경음악으로 고른다.
// 쇼츠 원스톱 v1.38 `src/lib/amsSongs.ts`의 목록 함수와 같은 규칙(공용 DB ams_generations 읽기만, user_id로 거름, 비공개 버킷 1시간 서명 주소).
// 렌더는 회원 브라우저에서 하므로 이 프로그램 저장소로 복사하지 않는다. 외부 AI 호출 없음.
const AMS_BUCKET = "ai-music-studio";
export const AMS_APP_URL = "https://ai-music-studio.buylife.xyz";
const MAX_BYTES = 30 * 1024 * 1024;

type Output = { path?: string; title?: string; durationS?: number; bytes?: number };
type Row = { id: string; title: string | null; prompt: string; model: string; instrumental: boolean; created_at: string; outputs: Output[] | null };

export interface AmsSong { ref: string; title: string; model: string; durationS: number | null; instrumental: boolean; createdAt: string; url: string | null; tooBig: boolean }

/** 내 완성곡(최근 40개 생성 기록의 곡들) — 1시간 서명 주소 포함 */
export async function listAmsSongs(userId: string): Promise<AmsSong[]> {
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
      instrumental: row.instrumental,
      createdAt: row.created_at,
      url: urls.get(o.path as string) ?? null,
      tooBig: typeof o.bytes === "number" && o.bytes > MAX_BYTES,
    };
  });
}
