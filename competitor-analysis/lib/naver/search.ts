import "server-only";

// 제휴 타깃 찾기(v1.10 초안) — 키워드로 그 주제의 채널(블로그·업체·카페·쇼핑몰)을 네이버 공식 검색 API로 찾는다.
// 호출 방식은 blog-keyword/src/lib/kw/naver.ts 와 같다: NAVER API HUB 먼저, 인증·미가입류(401/403/404)일 때만 옛 주소.
// 키는 회원 본인 naver_client_id·naver_client_secret 만(공용 user_api_keys, 다른 프로그램과 같은 이름). 운영자 키 폴백 없음.
// 공식 API는 연락처를 주지 않는다(지역 검색 telephone 은 빈 값으로 바뀜) — 연락처는 회원이 공개 페이지에서 확인해 적는다.
const HUB_SEARCH = "https://naverapihub.apigw.ntruss.com/search/v1";
const LEGACY_SEARCH = "https://openapi.naver.com/v1/search";
const FALLBACK = new Set([401, 403, 404]);
const TIMEOUT_MS = 12_000;

export interface NaverAuth { clientId: string; clientSecret: string }
export type ChannelType = "blog" | "local" | "cafe" | "shop";

export class NaverSearchError extends Error {
  constructor(public code: "auth" | "quota" | "http" | "network", message: string) { super(message); }
}

/** 화면에 쓰는 한 줄: 채널 하나(같은 채널의 여러 글은 하나로 합친다). */
export interface ChannelHit {
  channel_type: ChannelType;
  name: string;
  url: string;
  summary: string;
  category: string;
  address: string;
  /** 같은 채널이 이 키워드 검색 결과에 나온 횟수(매칭 신호). */
  hit_count: number;
  /** 그 채널로 나온 글 제목·요약들(매칭 판정용, 최대 5개). */
  texts: string[];
}

const API_PATH: Record<ChannelType, string> = { blog: "blog", local: "local", cafe: "cafearticle", shop: "shop" };
const LABEL: Record<ChannelType, string> = { blog: "네이버 블로그 검색", local: "네이버 지역 검색", cafe: "네이버 카페글 검색", shop: "네이버 쇼핑 검색" };
// 지역 검색은 한 번에 최대 5개만 준다(네이버 제한).
const MAX_DISPLAY: Record<ChannelType, number> = { blog: 100, local: 5, cafe: 100, shop: 100 };

function strip(v: unknown): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .trim();
}

function safeUrl(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^https?:\/\//i.test(s) ? s.slice(0, 500) : "";
}

async function call(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch {
    throw new NaverSearchError("network", "네이버 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

function classify(status: number, what: string): NaverSearchError {
  if (status === 401 || status === 403) return new NaverSearchError("auth", `${what} 인증에 실패했습니다. 설정에서 본인 네이버 Client ID·Secret과 검색 API 사용 설정을 확인해 주세요.`);
  if (status === 429) return new NaverSearchError("quota", `${what} 하루 호출 한도를 넘었습니다. 내일 다시 시도해 주세요.`);
  return new NaverSearchError("http", `${what} 호출에 실패했습니다(${status}).`);
}

type RawItem = Record<string, unknown>;

function toHit(type: ChannelType, it: RawItem): ChannelHit | null {
  if (type === "blog") {
    const name = strip(it.bloggername); const url = safeUrl(it.bloggerlink);
    return name && url ? { channel_type: type, name, url, summary: strip(it.title), category: "", address: "", hit_count: 1, texts: [strip(it.title), strip(it.description)].filter(Boolean) } : null;
  }
  if (type === "cafe") {
    const name = strip(it.cafename); const url = safeUrl(it.cafeurl);
    return name && url ? { channel_type: type, name, url, summary: strip(it.title), category: "", address: "", hit_count: 1, texts: [strip(it.title), strip(it.description)].filter(Boolean) } : null;
  }
  if (type === "local") {
    const name = strip(it.title);
    return name ? { channel_type: type, name, url: safeUrl(it.link), summary: strip(it.description), category: strip(it.category), address: strip(it.roadAddress) || strip(it.address), hit_count: 1, texts: [strip(it.title), strip(it.description), strip(it.category)].filter(Boolean) } : null;
  }
  const name = strip(it.mallName);
  return name ? { channel_type: type, name, url: safeUrl(it.link), summary: strip(it.title), category: [it.category1, it.category2].map(strip).filter(Boolean).join(" > "), address: "", hit_count: 1, texts: [strip(it.title)].filter(Boolean) } : null;
}

/** 한 종류 검색 → 채널 단위로 합친 목록(같은 이름·주소는 한 줄). */
export async function searchChannels(auth: NaverAuth, type: ChannelType, keyword: string, display = 50): Promise<ChannelHit[]> {
  const n = Math.min(MAX_DISPLAY[type], Math.max(1, display));
  const qs = `?query=${encodeURIComponent(keyword)}&display=${n}&start=1&sort=sim`;
  let r = await call(`${HUB_SEARCH}/${API_PATH[type]}${qs}`, { "X-NCP-APIGW-API-KEY-ID": auth.clientId, "X-NCP-APIGW-API-KEY": auth.clientSecret });
  if (!r.ok && FALLBACK.has(r.status)) {
    r = await call(`${LEGACY_SEARCH}/${API_PATH[type]}.json${qs}`, { "X-Naver-Client-Id": auth.clientId, "X-Naver-Client-Secret": auth.clientSecret });
  }
  if (!r.ok) throw classify(r.status, LABEL[type]);
  let items: RawItem[] = [];
  try { items = (JSON.parse(r.text) as { items?: RawItem[] }).items ?? []; } catch { throw new NaverSearchError("http", "네이버 응답을 해석하지 못했습니다."); }
  // 같은 채널(이름+주소)은 한 줄로 합치고, 나온 횟수와 글 제목·요약을 모은다(매칭 판정에 씀).
  const byKey = new Map<string, ChannelHit>();
  for (const it of items) {
    const hit = toHit(type, it);
    if (!hit) continue;
    const key = `${hit.name.toLowerCase()}|${hit.url}`;
    const prev = byKey.get(key);
    if (!prev) { byKey.set(key, hit); continue; }
    prev.hit_count += 1;
    for (const t of hit.texts) if (prev.texts.length < 5 && !prev.texts.includes(t)) prev.texts.push(t);
  }
  return Array.from(byKey.values());
}
