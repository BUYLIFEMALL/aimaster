import { createAdminClient } from "@/lib/supabase/admin";
import { CLEANUP_ACTION } from "@/lib/sceneImageCleanup";

// v1.37 30일 정리 기록 읽기 — 스크립트 화면이 「이 장면 이미지는 30일이 지나 정리됐습니다」를 보여 줄 장면을 찾는다.
// 기록은 /api/cron/cleanup-videos가 usage_logs에 회원별로 남긴다(metadata.segments = 이미지가 비워진 장면 id).

/** 이 회원의 정리 기록 중 주어진 장면(이미지가 비어 있는 장면)에 해당하는 id */
export async function findExpiredSegments(userId: string, emptySegmentIds: string[]): Promise<string[]> {
  if (!emptySegmentIds.length) return [];
  try {
    // programs·usage_logs는 이 프로그램 DB 타입에 없어 access.ts의 logProgramUsage와 같은 방식으로 느슨하게 읽는다
    const admin = createAdminClient() as unknown as { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: program } = await admin.from("programs").select("id").eq("slug", "auto-shorts-posting").maybeSingle();
    if (!program) return [];
    const { data } = await admin
      .from("usage_logs")
      .select("metadata")
      .eq("user_id", userId)
      .eq("program_id", program.id)
      .eq("action", CLEANUP_ACTION)
      .order("created_at", { ascending: false })
      .limit(200);
    const logged = new Set<string>();
    for (const row of (data ?? []) as { metadata: unknown }[]) {
      const segs = (row.metadata as { segments?: unknown } | null)?.segments;
      if (Array.isArray(segs)) for (const s of segs) if (typeof s === "string") logged.add(s);
    }
    return emptySegmentIds.filter((id) => logged.has(id));
  } catch {
    return [];
  }
}
