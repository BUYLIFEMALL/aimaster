import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NaverSearchItem, NaverSearchType } from "./search";

// 뉴스는 트렌드보다 갱신 주기가 빠르므로 TTL을 12시간으로 짧게 잡는다.
const TTL_MS = 12 * 60 * 60 * 1000;

function buildCacheKey(type: NaverSearchType, query: string): string {
  return crypto.createHash("sha256").update(`${type}:${query}`).digest("hex");
}

export async function getCachedSearch(type: NaverSearchType, query: string): Promise<NaverSearchItem[] | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("naver_search_cache")
    .select("items, fetched_at")
    .eq("cache_key", buildCacheKey(type, query))
    .maybeSingle();

  if (!data) return null;
  const age = Date.now() - new Date(data.fetched_at).getTime();
  if (age > TTL_MS) return null;
  return data.items as unknown as NaverSearchItem[];
}

export async function saveCachedSearch(type: NaverSearchType, query: string, items: NaverSearchItem[]): Promise<void> {
  const admin = createAdminClient();
  await admin.from("naver_search_cache").upsert(
    {
      cache_key: buildCacheKey(type, query),
      search_type: type,
      query,
      items: items as never,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "cache_key" },
  );
}
