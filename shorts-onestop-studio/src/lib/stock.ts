import "server-only";
import { UserError } from "@/lib/errors";

// 스톡 검색(회원 본인 Pexels·Pixabay 키, 서버에서만 호출 — 키를 브라우저로 보내지 않는다).
// 결과의 미디어 주소는 CDN이 CORS를 허용해(2026-10-16 확인) 브라우저가 바로 캔버스에 그릴 수 있다.
export type StockProvider = "pexels" | "pixabay";
export interface StockItem { id: string; type: "image" | "video"; src: string; thumb: string; width: number; height: number; credit: string; pageUrl: string; /** 내용 맞춤 점수용 키워드(Pixabay 태그·Pexels 주소 이름) */ tags?: string }

const timeout = () => AbortSignal.timeout(15000);
/** 페이지 주소의 이름 부분(예: /video/woman-stretching-123/ → "woman stretching") */
const slug = (u: string) => (u.split("/").filter(Boolean).pop() ?? "").replace(/-?\d+$/, "").replace(/-/g, " ");
function fail(provider: StockProvider, status: number): never {
  const who = provider === "pexels" ? "Pexels" : "Pixabay";
  if (status === 401 || status === 403 || status === 400) throw new UserError(400, `본인 ${who} API 키를 확인해 주세요.`, { needKey: true });
  if (status === 429) throw new UserError(429, `${who} 사용 한도에 걸렸습니다. 잠시 후 다시 검색해 주세요.`);
  throw new UserError(502, `${who} 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.`);
}

type PexelsPhoto = { id: number; width: number; height: number; url: string; alt?: string; photographer: string; src: { large2x: string; portrait: string; medium: string } };
type PexelsVideo = { id: number; width: number; height: number; url: string; user: { name: string }; image: string; video_files: { link: string; width: number; height: number; quality: string; file_type: string }[] };
type PixabayHit = { id: number; pageURL: string; tags?: string; user: string; webformatURL?: string; largeImageURL?: string; imageWidth?: number; imageHeight?: number; videos?: Record<string, { url: string; width: number; height: number; thumbnail?: string }> };

/** 세로(9:16)에 가까운 결과를 앞으로, 영상은 1080~1920 사이 화질 파일을 고른다 */
export async function searchStock(provider: StockProvider, key: string, type: "image" | "video", query: string): Promise<StockItem[]> {
  const q = encodeURIComponent(query.slice(0, 100));
  if (provider === "pexels") {
    const url = type === "image" ? `https://api.pexels.com/v1/search?query=${q}&orientation=portrait&per_page=18` : `https://api.pexels.com/videos/search?query=${q}&orientation=portrait&per_page=15`;
    const res = await fetch(url, { headers: { Authorization: key }, signal: timeout(), cache: "no-store" }).catch(() => null);
    if (!res) throw new UserError(504, "Pexels 서버에 연결하지 못했습니다.");
    if (!res.ok) fail(provider, res.status);
    const data = await res.json();
    if (type === "image") return ((data.photos ?? []) as PexelsPhoto[]).map((p) => ({ id: `px-${p.id}`, type: "image", src: p.src.large2x || p.src.portrait, thumb: p.src.medium, width: p.width, height: p.height, credit: `${p.photographer} / Pexels`, pageUrl: p.url, tags: `${p.alt ?? ""} ${slug(p.url)}` }));
    return ((data.videos ?? []) as PexelsVideo[]).map((v): StockItem | null => {
      const files = v.video_files.filter((f) => f.file_type === "video/mp4" && f.link).sort((a, b) => Math.abs(a.height - 1920) - Math.abs(b.height - 1920));
      const pick = files.find((f) => f.height >= 1280 && f.height <= 2560) ?? files[0];
      return pick ? { id: `pxv-${v.id}`, type: "video" as const, src: pick.link, thumb: v.image, width: pick.width, height: pick.height, credit: `${v.user?.name ?? "Pexels"} / Pexels`, pageUrl: v.url, tags: slug(v.url) } : null;
    }).filter((x): x is StockItem => !!x);
  }
  const url = type === "image" ? `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${q}&orientation=vertical&safesearch=true&per_page=18` : `https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${q}&safesearch=true&per_page=15`;
  const res = await fetch(url, { signal: timeout(), cache: "no-store" }).catch(() => null);
  if (!res) throw new UserError(504, "Pixabay 서버에 연결하지 못했습니다.");
  if (!res.ok) fail(provider, res.status);
  const data = await res.json();
  const hits = (data.hits ?? []) as PixabayHit[];
  if (type === "image") return hits.filter((h) => h.largeImageURL).map((h) => ({ id: `pb-${h.id}`, type: "image", src: h.largeImageURL!, thumb: h.webformatURL ?? h.largeImageURL!, width: h.imageWidth ?? 0, height: h.imageHeight ?? 0, credit: `${h.user} / Pixabay`, pageUrl: h.pageURL, tags: h.tags ?? slug(h.pageURL) }));
  return hits.map((h): StockItem | null => {
    const v = h.videos ?? {}; const pick = v.large?.url ? v.large : v.medium?.url ? v.medium : v.small;
    return pick?.url ? { id: `pbv-${h.id}`, type: "video" as const, src: pick.url, thumb: pick.thumbnail ?? v.tiny?.thumbnail ?? "", width: pick.width, height: pick.height, credit: `${h.user} / Pixabay`, pageUrl: h.pageURL, tags: h.tags ?? slug(h.pageURL) } : null;
  }).filter((x): x is StockItem => !!x).sort((a, b) => (b.height / Math.max(1, b.width)) - (a.height / Math.max(1, a.width)));
}

/** Pixabay 임시 주소 갱신: 원본 번호로 새 주소를 받는다(사진 /api/?id=, 영상 /api/videos/?id=). 실패한 항목은 빼고 돌려준다 */
export async function resolvePixabay(key: string, items: { id: string; type: "image" | "video" }[]): Promise<Record<string, { src: string; thumb: string }>> {
  const out: Record<string, { src: string; thumb: string }> = {};
  for (const it of items.slice(0, 12)) {
    if (!/^\d+$/.test(it.id)) continue;
    const url = it.type === "video" ? `https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&id=${it.id}` : `https://pixabay.com/api/?key=${encodeURIComponent(key)}&id=${it.id}`;
    const res = await fetch(url, { signal: timeout(), cache: "no-store" }).catch(() => null);
    if (!res?.ok) continue;
    const h = ((await res.json()).hits ?? [])[0] as PixabayHit | undefined;
    if (!h) continue;
    if (it.type === "video") { const v = h.videos ?? {}; const p = v.large?.url ? v.large : v.medium?.url ? v.medium : v.small; if (p?.url) out[it.id] = { src: p.url, thumb: p.thumbnail ?? "" }; }
    else if (h.largeImageURL) out[it.id] = { src: h.largeImageURL, thumb: h.webformatURL ?? h.largeImageURL };
  }
  return out;
}
