import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { amsTimedLines, type AmsTimedLine } from "@/lib/amsLyrics";

// v1.27 AI 음악 스튜디오(ai-music-studio)에서 회원 본인이 만든 곡을 가져온다(가사영상 v1.10 `src/lib/ams.ts`와 같은 규칙).
// 공용 DB ams_generations를 읽기만 하고 회원 user_id로 거른다. 저장소 ai-music-studio는 비공개라 1시간 서명 주소로만 넘긴다.
// 외부 AI 호출은 없다(시간 가사는 Lyria가 생성 때 함께 준 것).
const BUCKET = "ai-music-studio";

export interface AmsSong { ref: string; title: string; audioUrl: string | null; duration: number | null; timedLines: AmsTimedLine[] | null; error?: string }

type Row = { id: string; status: string; title: string | null; prompt: string; lyrics_out: string | null; instrumental: boolean; outputs: { path?: string; title?: string; durationS?: number }[] | null };

/** refs = ["<생성 번호>:<곡 순서>", …] — 찾지 못한 곡은 error를 담아 돌려준다(나머지는 그대로 진행) */
export async function getAmsSongs(userId: string, refs: { id: string; index: number }[]): Promise<AmsSong[]> {
  const admin = createAdminClient();
  const ids = Array.from(new Set(refs.map((r) => r.id)));
  const { data, error } = await admin
    .from("ams_generations")
    .select("id, status, title, prompt, lyrics_out, instrumental, outputs")
    .eq("user_id", userId).in("id", ids);
  if (error) throw new Error(error.message);
  const rows = new Map(((data ?? []) as Row[]).map((r) => [r.id, r]));
  const out: AmsSong[] = [];
  for (const { id, index } of refs) {
    const ref = `${id}:${index}`;
    const row = rows.get(id);
    const o = row?.status === "completed" ? (row.outputs ?? [])[index] : undefined;
    if (!row || !o?.path || !o.path.startsWith(`${userId}/`)) {
      out.push({ ref, title: "찾을 수 없는 곡", audioUrl: null, duration: null, timedLines: null, error: row && row.status !== "completed" ? "아직 완성되지 않은 곡입니다." : "곡을 찾지 못했습니다(내 곡이 아니거나 30일 보관 기간이 지남)." });
      continue;
    }
    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(o.path, 60 * 60);
    const base = (o.title || row.title || row.prompt.slice(0, 40) || "AI 음악").slice(0, 80);
    const multi = (row.outputs ?? []).length > 1;
    out.push({
      ref,
      title: multi ? `${base} (${index + 1})` : base,
      audioUrl: signed?.signedUrl ?? null,
      duration: typeof o.durationS === "number" ? o.durationS : null,
      timedLines: row.instrumental ? null : amsTimedLines(row.lyrics_out),
      ...(signed?.signedUrl ? {} : { error: "음악 파일 주소를 만들지 못했습니다." }),
    });
  }
  return out;
}
