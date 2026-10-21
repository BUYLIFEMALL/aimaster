// 정밀 기획 스튜디오 보관함 API (2026-10-21 병합 M1): 보관함(곡·앨범 기획)과 내 Style을 회원별 서버 표에 저장.
// 회원 세션 클라이언트로 읽고 써서 RLS(본인 행만, 기획은 수정 30일 지나면 안 보임)가 그대로 적용된다.
import { guarded } from "@/lib/studioApiGuard";
import { createClient } from "@/lib/supabase/server";
import { AppError, validateStore } from "@/lib/studio/validation";
import { EMPTY_DRAFT, type SavedItem, type SavedStyle } from "@/lib/studio/config";
import { LIBRARY_MAX_BYTES } from "@/lib/studio/library";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 새 표는 아직 database.types.ts에 없어 이 파일에서만 느슨하게 다룬다.
type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

function ids(v: unknown, label: string): string[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || !UUID_RE.test(x)))
    throw new AppError(`${label} 목록이 올바르지 않습니다.`);
  return v as string[];
}

export function GET(request: Request) {
  return guarded(request, async (userId) => {
    const db = (await createClient()) as unknown as Db;
    const [p, s] = await Promise.all([
      db.from("music_studio_projects").select("data").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100),
      db.from("music_studio_styles").select("data").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100),
    ]);
    if (p.error || s.error) throw new Error("load failed");
    const saved = (p.data ?? []).map((r: { data: SavedItem }) => r.data);
    const styles = (s.data ?? []).map((r: { data: SavedStyle }) => r.data);
    // 저장된 자료도 화면에 넘기기 전에 같은 검사를 거친다.
    const safe = validateStore({ schema: 1, draft: EMPTY_DRAFT, saved, styles });
    return { saved: safe.saved, styles: safe.styles };
  });
}

export function POST(request: Request) {
  return guarded(
    request,
    async (userId, body) => {
      const safe = validateStore({
        schema: 1,
        draft: EMPTY_DRAFT,
        saved: body.upsertSaved ?? [],
        styles: body.upsertStyles ?? [],
      });
      if ([...safe.saved, ...safe.styles].some((i) => !UUID_RE.test(i.id)))
        throw new AppError("저장 ID 형식이 올바르지 않습니다. 화면을 새로고침해 주세요.");
      const deleteSaved = ids(body.deleteSaved, "삭제할 보관함");
      const deleteStyles = ids(body.deleteStyles, "삭제할 Style");
      const db = (await createClient()) as unknown as Db;
      const now = new Date().toISOString();
      if (safe.saved.length) {
        const { error } = await db.from("music_studio_projects").upsert(
          safe.saved.map((i) => ({
            id: i.id,
            user_id: userId,
            kind: i.draft.album ? "album" : "song",
            title: i.name.slice(0, 200),
            data: i,
            updated_at: now,
          })),
        );
        if (error) throw new Error("save failed");
      }
      if (safe.styles.length) {
        const { error } = await db.from("music_studio_styles").upsert(
          safe.styles.map((s) => ({ id: s.id, user_id: userId, name: s.name.slice(0, 80), data: s, updated_at: now })),
        );
        if (error) throw new Error("save failed");
      }
      if (deleteSaved.length) {
        const { error } = await db.from("music_studio_projects").delete().eq("user_id", userId).in("id", deleteSaved);
        if (error) throw new Error("delete failed");
      }
      if (deleteStyles.length) {
        const { error } = await db.from("music_studio_styles").delete().eq("user_id", userId).in("id", deleteStyles);
        if (error) throw new Error("delete failed");
      }
      return { ok: true };
    },
    LIBRARY_MAX_BYTES,
  );
}
