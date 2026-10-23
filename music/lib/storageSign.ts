import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// music-audio 저장소 서명 주소(2026-10-21 주인님 결정 — 공개 저장소를 비공개로 전환).
// DB에는 예전처럼 공개 주소 형식(…/storage/v1/object/public/music-audio/<경로>)이 남아 있고, 이 값은 「파일 위치」로만 쓴다.
// 서버 페이지가 회원 본인 행(user_id로 거른 결과)을 화면에 넘기기 직전에, 그 안의 저장소 주소를 일정 시간만 열리는
// 서명 주소로 바꾼다. 비공개 저장소라 서명 주소 없이는 열리지 않는다.
const BUCKET = "music-audio";
const PUBLIC_PREFIX = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;

export const VIEW_TTL_SECONDS = 60 * 60; // 화면 재생·다운로드: 1시간
export const SUNO_FETCH_TTL_SECONDS = 24 * 60 * 60; // Suno 서버가 원곡을 받아 가는 리믹스 요청: 24시간

function pathOf(url: string): string | null {
  if (!url.startsWith(PUBLIC_PREFIX)) return null;
  const path = decodeURIComponent(url.slice(PUBLIC_PREFIX.length).split("?")[0]);
  return path || null;
}

function collect(value: unknown, out: Set<string>) {
  if (typeof value === "string") {
    if (pathOf(value)) out.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collect(v, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collect(v, out));
  }
}

function replace<T>(value: T, map: Map<string, string>): T {
  if (typeof value === "string") return (map.get(value) ?? value) as T;
  if (Array.isArray(value)) return value.map((v) => replace(v, map)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replace(v, map)])) as T;
  }
  return value;
}

/** 주소 여러 개를 한 번에 서명한다. 실패한 주소는 원래 값(열리지 않음)으로 남긴다. */
export async function signStorageUrls(urls: string[], ttlSeconds = VIEW_TTL_SECONDS): Promise<Map<string, string>> {
  const unique = Array.from(new Set(urls.filter((u) => pathOf(u))));
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const paths = unique.map((u) => pathOf(u)!);
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrls(paths, ttlSeconds);
  (data ?? []).forEach((row, i) => {
    if (row?.signedUrl) map.set(unique[i], row.signedUrl);
  });
  return map;
}

/** 데이터(객체·배열) 안의 저장소 주소를 모두 서명 주소로 바꾼 사본을 돌려준다. 회원 본인 데이터에만 쓴다. */
export async function withSignedStorageUrls<T>(data: T, ttlSeconds = VIEW_TTL_SECONDS): Promise<T> {
  const urls = new Set<string>();
  collect(data, urls);
  if (urls.size === 0) return data;
  const map = await signStorageUrls(Array.from(urls), ttlSeconds);
  return replace(data, map);
}

/** 주소 하나를 서명한다(저장소 주소가 아니면 그대로). */
export async function signStorageUrl(url: string, ttlSeconds = VIEW_TTL_SECONDS): Promise<string> {
  return (await signStorageUrls([url], ttlSeconds)).get(url) ?? url;
}
