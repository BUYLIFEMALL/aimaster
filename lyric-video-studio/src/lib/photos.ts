import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserError } from "@/lib/errors";
import { PhotoError, isPhotoProvider, parsePhotos, photoSearchRequest, providerLabel, type Photo, type PhotoProvider } from "@/lib/photoSearch";

// L-3 무료 사진 배경 — 회원 본인 Pixabay·Pexels 키(공용 user_api_keys, 다른 프로그램에서 등록한 키를 그대로 씀).
// 검색·받기는 공용 기준 코드 `free-photo-search` 사본(photoSearch.ts). 가로 영상이면 가로 사진을, 한글 검색어면 한국어 검색을 부르는 쪽에서 덧붙인다.
export type PhotoAspect = "landscape" | "portrait";
export { isPhotoProvider, type PhotoProvider };

export async function photoKeys(userId: string): Promise<Partial<Record<PhotoProvider, string>>> {
  const { data } = await createAdminClient().from("user_api_keys").select("provider, api_key").eq("user_id", userId).in("provider", ["pixabay", "pexels"]);
  const out: Partial<Record<PhotoProvider, string>> = {};
  for (const r of (data ?? []) as { provider: string; api_key: string | null }[]) if (isPhotoProvider(r.provider) && r.api_key?.trim()) out[r.provider] = r.api_key.trim();
  return out;
}

export async function savePhotoKey(userId: string, provider: PhotoProvider, key: string): Promise<void> {
  const { error } = await createAdminClient().from("user_api_keys").upsert({ user_id: userId, provider, api_key: key, updated_at: new Date().toISOString() }, { onConflict: "user_id,provider" });
  if (error) throw new UserError(500, "키를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
}

export async function searchBackgrounds(provider: PhotoProvider, key: string, query: string, aspect: PhotoAspect, signal?: AbortSignal): Promise<Photo[]> {
  const req = photoSearchRequest(provider, key, query, "9:16");
  const korean = /[가-힣]/.test(query);
  if (aspect === "landscape") req.url.searchParams.set("orientation", provider === "pixabay" ? "horizontal" : "landscape");
  if (korean) req.url.searchParams.set(provider === "pixabay" ? "lang" : "locale", provider === "pixabay" ? "ko" : "ko-KR");
  const res = await fetch(req.url, { headers: req.headers, cache: "no-store", redirect: "error", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000) });
  const name = providerLabel(provider);
  if (res.status === 401 || res.status === 403 || res.status === 400) throw new UserError(400, `${name} 본인 API 키를 확인해 주세요.`, { needPhotoKey: true });
  if (res.status === 429) throw new UserError(429, `${name} 검색 한도에 도달했습니다. 잠시 뒤 다시 시도해 주세요.`);
  if (!res.ok) throw new UserError(502, `${name} 사진 검색에 실패했습니다. 잠시 뒤 다시 시도해 주세요.`);
  try {
    return parsePhotos(provider, await res.json());
  } catch (e) {
    throw new UserError(502, e instanceof PhotoError ? e.message : "사진 검색 응답을 읽지 못했습니다.");
  }
}
