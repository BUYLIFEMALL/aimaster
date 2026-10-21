import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// v1.26 「AI 썸네일·SEO 자동화」(thumbnail-master)에서 회원이 만든 썸네일을 유튜브 카드에서 고르기.
// 같은 공용 DB의 회원 본인 행(user_id)만 읽는다 — 다른 회원 것은 찾지 못한다. 저장소는 비공개라 1시간짜리 서명 주소만 돌려준다.
// 저장 형식(thumbnail-master src/lib/images.ts cleanSet): images_a/images_b = { versions: [{ path }], cur }
const BUCKET = "thumbnail-master-images";
const LIMIT = 12;

export type ThumbPick = { id: string; name: string; option: "A" | "B"; url: string };

function currentPath(raw: unknown): string | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as { versions?: unknown; cur?: unknown };
  const versions = (Array.isArray(r.versions) ? r.versions : []).filter((v): v is { path: string } => !!v && typeof (v as { path?: unknown }).path === "string");
  if (!versions.length) return null;
  const cur = typeof r.cur === "number" && r.cur >= 0 && r.cur < versions.length ? r.cur : versions.length - 1;
  return versions[cur].path;
}

export async function listThumbnailPicks(userId: string): Promise<ThumbPick[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("thumbnail_master_projects")
    .select("id, name, images_a, images_b").eq("user_id", userId)
    .order("updated_at", { ascending: false }).limit(LIMIT);
  if (error) throw new Error("THUMB_PICKS_DB");
  const items: { id: string; name: string; option: "A" | "B"; path: string }[] = [];
  for (const r of (data ?? []) as { id: string; name: string | null; images_a: unknown; images_b: unknown }[]) {
    for (const [option, raw] of [["A", r.images_a], ["B", r.images_b]] as const) {
      const path = currentPath(raw);
      if (path && path.startsWith(`${userId}/`)) items.push({ id: r.id, name: r.name ?? "제목 없는 썸네일", option, path });
    }
  }
  if (!items.length) return [];
  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrls(items.map((i) => i.path), 60 * 60);
  const url = new Map((signed ?? []).filter((s) => s.path && s.signedUrl).map((s) => [s.path!, s.signedUrl]));
  return items.filter((i) => url.has(i.path)).map((i) => ({ id: i.id, name: i.name, option: i.option, url: url.get(i.path)! }));
}
