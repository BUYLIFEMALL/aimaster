import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AIS_BUCKET, AIS_PROGRAM_ID, aisStoragePath } from "./aisPath";

// v1.24 AI 이미지 스튜디오(ai-image-studio)에서 회원 본인이 만든 이미지를 참고 이미지로 가져온다(곡 가져오기 v1.13 amsSongs.ts와 같은 규칙).
// 공용 DB usage_logs를 읽기만 하고 회원 user_id로 거른다. 저장소는 비공개라 1시간 서명 주소로만 넘긴다. 외부 AI 호출·서버 저장 없음.
const TTL = 60 * 60;
const MAX = 40;

export interface AisImageItem { id: string; prompt: string; createdAt: string; url: string }

type Row = { id: string; created_at: string; metadata: { image_path?: unknown; image_url?: unknown; prompt?: unknown } | null };

/** 내 최근 30일 AI 이미지 스튜디오 이미지(최대 40장) */
export async function listAisImages(userId: string): Promise<AisImageItem[]> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("usage_logs")
    .select("id, created_at, metadata")
    .eq("user_id", userId).eq("program_id", AIS_PROGRAM_ID)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX * 2);
  if (error) throw new Error(error.message);
  const items = ((data ?? []) as Row[])
    .map((r) => ({ r, path: aisStoragePath(r.metadata, userId) }))
    .filter((x): x is { r: Row; path: string } => !!x.path)
    .slice(0, MAX);
  if (!items.length) return [];
  const { data: signed } = await admin.storage.from(AIS_BUCKET).createSignedUrls(items.map((x) => x.path), TTL);
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return items
    .map(({ r, path }) => ({
      id: r.id,
      prompt: (typeof r.metadata?.prompt === "string" ? r.metadata.prompt : "").slice(0, 120),
      createdAt: r.created_at,
      url: urls.get(path) ?? "",
    }))
    .filter((x) => x.url);
}
