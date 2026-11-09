// RQ-C 지역 뉴스 레이더(2026-11-09, v1.57). 순수 함수만 둔다(시험 tests/newsRadar.test.mjs).
// 사전 검증(ego, 네이버 뉴스 최신순): 검색어에 지역을 넣어도 다른 지역 기사가 많이 섞인다
// (예: 「강서구 재건축」 → 고양 능곡 기사) → 제목·요약에 지역 이름이 있는 기사만 남긴다.

export const NEWS_CATEGORIES = ["개발", "교통", "학교", "규제"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

// 분류마다 검색어 2개(지역 5곳 × 8번 = 회원당 하루 40번, 네이버 하루 한도 2만 5천 번)
export const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  개발: ["재개발", "재건축"],
  교통: ["GTX", "지하철"],
  학교: ["학교 신설", "학군"],
  규제: ["토지거래허가", "조정대상지역"],
};

export const MAX_NEWS_REGIONS = 5; // 결정 5(2026-11-09): 관심 지역 중 앞 5곳
export const NEWS_HOUR_KST = 8; // 결정 4: 아침 8시 이후 첫 예약 회차에 1번
export const NEWS_MAX_AGE_DAYS = 3; // 처음 켠 날 오래된 기사가 쏟아지지 않게

const SIDO_BY_PREFIX: Record<string, string> = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주", "30": "대전", "31": "울산", "36": "세종",
  "41": "경기", "42": "강원", "43": "충북", "44": "충남", "45": "전북", "46": "전남", "47": "경북", "48": "경남", "50": "제주", "51": "강원", "52": "전북",
  "12": "전남",
};

export function sidoOf(sggCd: string): string {
  return SIDO_BY_PREFIX[sggCd.slice(0, 2)] ?? "";
}

export interface RegionTerms {
  /** 검색어 앞에 붙일 지역 이름 */
  query: string;
  /** 이 중 하나가 있어야 통과 */
  anyOf: string[];
  /** 이것도 함께 있어야 통과(「중구」처럼 흔한 이름일 때 시·도 이름) */
  alsoNeed: string | null;
}

/** 「고양시 일산동구」 → 검색 「고양시 일산동구」, 통과 이름 일산동구·고양 / 「강서구」(서울) → 「서울 강서구」, 통과 강서구 / 「중구」(부산) → 부산도 함께 */
export function regionTerms(sggCd: string, sggNm: string): RegionTerms {
  const parts = sggNm.trim().split(/\s+/).filter(Boolean);
  const sido = sidoOf(sggCd);
  if (parts.length >= 2) {
    const city = parts[0].replace(/(시|군)$/, "");
    return { query: sggNm.trim(), anyOf: [parts[parts.length - 1], city].filter((s) => s.length >= 2), alsoNeed: null };
  }
  const name = parts[0] ?? "";
  const stem = name.replace(/(시|군)$/, "");
  const anyOf = [name, ...(stem !== name && stem.length >= 2 ? [stem] : [])];
  const common = name.length <= 2; // 중구·동구·서구·남구·북구
  const needsSido = Boolean(sido) && !name.endsWith("시") && !name.endsWith("군") && sido !== "세종";
  return { query: needsSido ? `${sido} ${name}` : name, anyOf, alsoNeed: common ? sido || null : null };
}

export function buildQueries(sggCd: string, sggNm: string): { category: NewsCategory; query: string }[] {
  const t = regionTerms(sggCd, sggNm);
  return NEWS_CATEGORIES.flatMap((category) => CATEGORY_KEYWORDS[category].map((kw) => ({ category, query: `${t.query} ${kw}` })));
}

export function mentionsRegion(text: string, terms: RegionTerms): boolean {
  if (!terms.anyOf.some((n) => text.includes(n))) return false;
  return terms.alsoNeed ? text.includes(terms.alsoNeed) : true;
}

/** 같은 기사를 다른 주소로 받지 않게: 소문자 호스트, 끝 「/」·추적 꼬리(utm_·fbclid) 제거 */
export function normalizeLink(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    for (const k of [...u.searchParams.keys()]) if (/^utm_|^fbclid$|^gclid$/i.test(k)) u.searchParams.delete(k);
    const s = u.toString();
    return s.endsWith("/") ? s.slice(0, -1) : s;
  } catch {
    return raw.trim();
  }
}

/** 같은 보도자료 재전송을 묶으려고 제목에서 기호·공백을 뺀 열쇠 */
export function titleKey(title: string): string {
  return title.replace(/\[[^\]]*\]|\([^)]*\)/g, "").replace(/[^0-9A-Za-z가-힣]/g, "").slice(0, 40);
}

export interface NewsCandidate {
  category: NewsCategory;
  title: string;
  link: string;
  snippet: string;
  publishedAt: string | null;
  source: string | null;
}

export interface RawNews { title: string; link: string; originallink?: string; description: string; pubDate?: string }

/** 원문 주소의 호스트를 언론사 대신 보여 준다(네이버 뉴스 응답에 언론사 이름 칸이 없음) */
export function sourceOf(originallink: string | undefined, link: string): string | null {
  try {
    return new URL(originallink || link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** 응답 → 후보: 지역 이름 없음·너무 오래됨·같은 제목은 뺀다. 먼저 나온 분류가 남는다 */
export function pickCandidates(
  results: { category: NewsCategory; items: RawNews[] }[],
  terms: RegionTerms,
  now = new Date(),
): NewsCandidate[] {
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const out: NewsCandidate[] = [];
  const oldest = now.getTime() - NEWS_MAX_AGE_DAYS * 24 * 3600 * 1000;
  for (const { category, items } of results) {
    for (const it of items) {
      const title = (it.title ?? "").trim();
      if (!title) continue;
      if (!mentionsRegion(`${title} ${it.description ?? ""}`, terms)) continue;
      const published = it.pubDate ? new Date(it.pubDate) : null;
      if (published && !Number.isNaN(published.getTime()) && published.getTime() < oldest) continue;
      const link = normalizeLink(it.originallink || it.link);
      if (!/^https?:\/\//i.test(link)) continue; // 화면 링크로 쓰므로 웹 주소만
      const tk = titleKey(title);
      if (seenLinks.has(link) || (tk && seenTitles.has(tk))) continue;
      seenLinks.add(link);
      if (tk) seenTitles.add(tk);
      out.push({
        category,
        title: title.slice(0, 300),
        link: link.slice(0, 2048),
        snippet: (it.description ?? "").trim().slice(0, 300),
        publishedAt: published && !Number.isNaN(published.getTime()) ? published.toISOString() : null,
        source: sourceOf(it.originallink, it.link),
      });
    }
  }
  // 개선 후보 2(2026-11-09 첫 실측): 「의원(서울 서초구 갑)안」처럼 요약에만 지나가듯 나온 기사보다 제목에 지역 이름이 있는 기사를 앞에(같은 무리 안 순서는 그대로)
  const inTitle = (c: NewsCandidate) => mentionsRegion(c.title, terms);
  return [...out.filter(inTitle), ...out.filter((c) => !inTitle(c))];
}

/** 한국 시각 날짜 「2026-11-09」와 시(0~23) */
export function kstDateHour(now = new Date()): { date: string; hour: number } {
  const k = new Date(now.getTime() + 9 * 3600 * 1000);
  return { date: k.toISOString().slice(0, 10), hour: k.getUTCHours() };
}

export function isNewsDue(sentOn: string | null | undefined, now = new Date()): boolean {
  const { date, hour } = kstDateHour(now);
  return hour >= NEWS_HOUR_KST && sentOn !== date;
}

export interface DigestItem { sggNm: string; category: NewsCategory; title: string; link: string }

/** 첫 실측(2026-11-09) 서초구 66건이 몰려 알림 앞 8건이 한 지역만 보이던 문제 → 지역을 번갈아 하나씩(지역 안 순서는 그대로) */
export function interleaveByRegion<T extends { sggNm: string }>(items: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) groups.set(it.sggNm, [...(groups.get(it.sggNm) ?? []), it]);
  const lists = [...groups.values()];
  const out: T[] = [];
  for (let i = 0; out.length < items.length; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

/** 알림 글: 분류별 건수 + 지역별 제목 몇 개와 원문 링크. withLinks=false는 알림톡(짧게) */
export function buildNewsMessage(items: DigestItem[], opts: { withLinks: boolean; aiSummary?: string | null; pageUrl: string; maxItems?: number; firstRun?: boolean }): string {
  const counts = NEWS_CATEGORIES.map((c) => [c, items.filter((i) => i.category === c).length] as const).filter(([, n]) => n > 0);
  const head = `📰 오늘의 지역 소식 ${items.length}건\n${counts.map(([c, n]) => `${c} ${n}`).join(" · ")}`;
  // 개선 후보 3: 처음 켠 날은 지난 3일치가 한꺼번에(첫 실측 106건) → 건수와 화면 링크만
  if (opts.firstRun) {
    const regions = [...new Set(items.map((i) => i.sggNm))];
    return `${head}\n\n지역 뉴스를 처음 켜서 지난 3일 기사를 모았어요(${regions.join(", ")}). 목록은 화면에서 보세요.\n내일부터는 새 기사만 아침에 보내 드려요.\n\n전체 보기: ${opts.pageUrl}\n출처: 각 언론사, 네이버 검색`.slice(0, opts.withLinks ? 3900 : 950);
  }
  const parts = [head];
  if (opts.aiSummary) parts.push(`🤖 요약\n${opts.aiSummary.trim()}`);
  const shown = interleaveByRegion(items).slice(0, opts.maxItems ?? (opts.withLinks ? 8 : 4));
  parts.push(shown.map((i) => `• [${i.sggNm}·${i.category}] ${i.title}${opts.withLinks ? `\n${i.link}` : ""}`).join("\n"));
  if (items.length > shown.length) parts.push(`…외 ${items.length - shown.length}건`);
  parts.push(`전체 보기: ${opts.pageUrl}\n출처: 각 언론사, 네이버 검색`);
  const text = parts.join("\n\n");
  return opts.withLinks ? text.slice(0, 3900) : text.slice(0, 950);
}
