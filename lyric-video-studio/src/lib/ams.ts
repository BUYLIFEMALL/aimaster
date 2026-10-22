import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserError } from "@/lib/errors";
import { amsTimedLines, type AmsTimedLine } from "@/lib/amsLyrics";

// v1.10 AI 음악 스튜디오(ai-music-studio)에서 회원 본인이 만든 곡을 가져온다.
// 공용 DB ams_generations를 읽기만 하고(쓰기 없음) 회원 user_id로 거른다. 저장소 ai-music-studio는 비공개라 1시간 서명 주소로만 넘긴다.
// 외부 AI 호출은 없다(시간 가사는 Lyria가 생성 때 함께 준 것을 그대로 씀).
const BUCKET = "ai-music-studio";
const VIEW_TTL_SECONDS = 60 * 60;
export const AMS_APP_URL = "https://ai-music-studio.buylife.xyz";

type Output = { path?: string; title?: string };
type Row = { id: string; status: string; title: string | null; prompt: string; lyrics: string | null; lyrics_out: string | null; instrumental: boolean; outputs: Output[] | null };

export interface AmsSong { id: string; title: string; lyrics: string; audioUrl: string; timedLines: AmsTimedLine[] | null; instrumental: boolean }

export async function getAmsSong(userId: string, generationId: string, index: number): Promise<AmsSong> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ams_generations")
    .select("id, status, title, prompt, lyrics, lyrics_out, instrumental, outputs")
    .eq("id", generationId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as Row | null;
  if (!row) throw new UserError(404, "곡을 찾지 못했습니다. AI 음악 스튜디오에서 내가 만든 곡만 가져올 수 있습니다.");
  if (row.status !== "completed") throw new UserError(409, "아직 완성되지 않은 곡입니다. AI 음악 스튜디오에서 완성된 뒤 다시 보내 주세요.");
  const out = (row.outputs ?? [])[index];
  const path = out?.path;
  if (!path || !path.startsWith(`${userId}/`)) throw new UserError(410, "이 곡의 음악 파일을 찾지 못했습니다. 보관 기간(30일)이 지나 지워졌을 수 있습니다.");
  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(path, VIEW_TTL_SECONDS);
  if (!signed?.signedUrl) throw new UserError(410, "이 곡의 음악 파일을 찾지 못했습니다. 보관 기간(30일)이 지나 지워졌을 수 있습니다.");
  return {
    id: row.id,
    title: (out.title || row.title || row.prompt.slice(0, 40) || "AI 음악").slice(0, 80),
    lyrics: row.instrumental ? "" : (row.lyrics ?? ""),
    audioUrl: signed.signedUrl,
    timedLines: row.instrumental ? null : amsTimedLines(row.lyrics_out),
    instrumental: row.instrumental,
  };
}
