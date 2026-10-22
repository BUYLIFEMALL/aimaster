// 카드뉴스 배경 무료 사진 검색(v1.63) — 회원 본인 Pixabay·Pexels 키로 검색하고, 고른 사진만 서버가 받아 회원 폴더에 저장한다.
// 감성 글귀 자동화(emotion-writer/src/lib/studio/services.ts searchPhotos·photoDataUrl, validation.ts allowedPhotoUrl) 방식을 옮김 — 공용화 후보(docs/IMPROVEMENTS.md).
import type { RatioId } from "@/lib/cardnews/presets";

export type PhotoProvider = "pixabay" | "pexels";
export const PHOTO_PROVIDERS: { value: PhotoProvider; label: string }[] = [
  { value: "pixabay", label: "Pixabay" },
  { value: "pexels", label: "Pexels" },
];
export type Photo = { id: string; url: string; preview: string; pageUrl: string; author: string; source: PhotoProvider };

type Fetcher = (input: URL, init?: RequestInit) => Promise<Response>;
const MAX_PHOTO = 8 * 1024 * 1024;

export class PhotoError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export const isPhotoProvider = (v: unknown): v is PhotoProvider => v === "pixabay" || v === "pexels";
export const providerLabel = (p: PhotoProvider) => (p === "pixabay" ? "Pixabay" : "Pexels");

/** 제공처 이미지 서버의 사진 경로만 허용한다(임의 주소 대신 받아 주기 방지). */
export function allowedPhotoUrl(value: unknown): URL {
  if (typeof value !== "string" || value.length > 2000) throw new PhotoError("이미지 주소가 올바르지 않습니다.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PhotoError("이미지 주소가 올바르지 않습니다.");
  }
  const hostOk =
    (url.hostname === "cdn.pixabay.com" && url.pathname.startsWith("/photo/")) ||
    (url.hostname === "pixabay.com" && url.pathname.startsWith("/get/")) ||
    (url.hostname === "images.pexels.com" && url.pathname.startsWith("/photos/"));
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash || !hostOk || !/\.(?:jpe?g|png|webp)$/i.test(url.pathname))
    throw new PhotoError("지원하는 사진 제공처의 이미지 주소만 사용할 수 있습니다.");
  return url;
}

/** 검색 요청 주소·머리글. Pixabay는 주소에 key, Pexels는 Authorization 머리글. */
export function photoSearchRequest(provider: PhotoProvider, key: string, query: string, ratio: RatioId) {
  if (provider === "pixabay") {
    const url = new URL("https://pixabay.com/api/");
    url.search = new URLSearchParams({ key, q: query, image_type: "photo", safesearch: "true", per_page: "12", orientation: ratio === "1:1" ? "all" : "vertical" }).toString();
    return { url, headers: {} as Record<string, string> };
  }
  const url = new URL("https://api.pexels.com/v1/search");
  url.search = new URLSearchParams({ query, per_page: "12", orientation: ratio === "1:1" ? "square" : "portrait" }).toString();
  return { url, headers: { Authorization: key } as Record<string, string> };
}

/** 제공처 응답에서 사진 목록만 뽑는다. 허용되지 않는 주소의 행은 버린다. */
export function parsePhotos(provider: PhotoProvider, data: unknown): Photo[] {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const rows = provider === "pixabay" ? d.hits : d.photos;
  if (!Array.isArray(rows)) throw new PhotoError("사진 검색 응답을 읽지 못했습니다.", 502);
  const photos: Photo[] = [];
  for (const raw of rows.slice(0, 12)) {
    const r = (raw ?? {}) as {
      id?: unknown; largeImageURL?: string; webformatURL?: string; pageURL?: string; user?: string;
      src?: { large2x?: string; medium?: string }; url?: string; photographer?: string;
    };
    const original = provider === "pixabay" ? r.largeImageURL : r.src?.large2x;
    const preview = provider === "pixabay" ? r.webformatURL : r.src?.medium;
    const pageUrl = provider === "pixabay" ? r.pageURL : r.url;
    try {
      allowedPhotoUrl(original);
      allowedPhotoUrl(preview);
      const page = new URL(String(pageUrl));
      if (page.protocol !== "https:" || !["pixabay.com", "www.pexels.com"].includes(page.hostname)) continue;
      photos.push({ id: String(r.id), url: String(original), preview: String(preview), pageUrl: String(pageUrl), author: String((provider === "pixabay" ? r.user : r.photographer) ?? "").slice(0, 100), source: provider });
    } catch {
      /* 형식이 이상한 행은 건너뛴다 */
    }
  }
  return photos;
}

function providerError(status: number, provider: PhotoProvider) {
  const name = providerLabel(provider);
  if (status === 401 || status === 403) return new PhotoError(`${name} API 키가 올바르지 않습니다. [API키등록·플랫폼연동]에서 본인 키를 확인해주세요.`, 400);
  if (status === 429) return new PhotoError(`${name} 검색 한도를 넘었습니다. 잠시 뒤 다시 시도해주세요.`, 429);
  return new PhotoError(`${name} 사진 검색에 실패했습니다. 잠시 뒤 다시 시도해주세요.`, 502);
}

export async function searchPhotos(provider: PhotoProvider, key: string, query: string, ratio: RatioId, call: Fetcher = fetch): Promise<Photo[]> {
  const req = photoSearchRequest(provider, key, query, ratio);
  const res = await call(req.url, { headers: req.headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw providerError(res.status, provider);
  return parsePhotos(provider, await res.json());
}

/** 고른 사진을 받아 온다(제공처 주소만, 8MB까지). */
export async function downloadPhoto(url: unknown, call: Fetcher = fetch): Promise<{ bytes: Buffer; mime: string }> {
  const safe = allowedPhotoUrl(url);
  const res = await call(safe, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(25_000) });
  if (!res.ok || !res.body) throw new PhotoError("사진을 가져오지 못했습니다. 다른 사진을 골라주세요.", 502);
  const mime = res.headers.get("content-type")?.split(";")[0] ?? "";
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) throw new PhotoError("지원하는 이미지 형식이 아닙니다.", 502);
  if (Number(res.headers.get("content-length")) > MAX_PHOTO) throw new PhotoError("사진이 너무 큽니다. 다른 사진을 골라주세요.", 413);
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_PHOTO) {
      await reader.cancel();
      throw new PhotoError("사진이 너무 큽니다. 다른 사진을 골라주세요.", 413);
    }
    parts.push(value);
  }
  if (!size) throw new PhotoError("사진 파일이 비어 있습니다.", 502);
  return { bytes: Buffer.concat(parts), mime };
}
