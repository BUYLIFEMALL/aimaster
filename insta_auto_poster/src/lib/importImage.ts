// 다른 프로그램(감성 글귀 이미지 v1.17)이 넘긴 첨부 이미지(?imageUrl=)를 받을지 판단한다(v1.47).
// 우리 Supabase 공개 버킷 insta-post-images의 「로그인한 회원 본인 폴더」 주소만 받는다 — INSTA 「직접 첨부」와 같은 위치·같은 취급.
export function acceptImportImage(raw: unknown, userId: string, supabaseUrl: string | undefined): string | null {
  if (typeof raw !== "string" || raw.length > 1000 || !userId) return null;
  try {
    const u = new URL(raw);
    const own = new URL(supabaseUrl ?? "https://invalid.local");
    if (u.protocol !== "https:" || u.host !== own.host || u.search) return null;
    const prefix = `/storage/v1/object/public/insta-post-images/${userId}/`;
    const path = decodeURIComponent(u.pathname);
    if (!path.startsWith(prefix)) return null;
    const name = path.slice(prefix.length);
    return /^[A-Za-z0-9-]+\.(jpe?g|png|webp)$/.test(name) ? u.toString() : null;
  } catch {
    return null;
  }
}
