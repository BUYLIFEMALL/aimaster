// M5-1b 자기 도메인(2026-11-15) — 요청 주소 이름 → 몰 이름(slug). proxy가 부른다.
// DB 공개 함수 mall_builder_slug_by_domain(0093)을 공개 키로 부르고, 결과(없음 포함)를 서버 메모리에 60초 보관해 요청마다 DB를 부르지 않는다.
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const TTL_MS = 60_000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { slug: string | null; at: number }>();

export async function slugForCustomDomain(domain: string): Promise<string | null> {
  const hit = cache.get(domain);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.slug;
  let slug: string | null = null;
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/mall_builder_slug_by_domain`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_domain: domain }),
      cache: "no-store",
    });
    if (!res.ok) return hit?.slug ?? null; // 일시 오류면 묵은 값이라도 쓰고 보관하지 않음
    const v = await res.json();
    slug = typeof v === "string" && v ? v : null;
  } catch {
    return hit?.slug ?? null;
  }
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(domain, { slug, at: Date.now() });
  return slug;
}
