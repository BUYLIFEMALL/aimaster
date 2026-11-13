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
  /** 그 구의 동 이름(반포·방배…) — 제목에 있으면 「제목에 지역 있음」으로 본다(2026-11-13, 넘기지 않으면 쓰지 않음) */
  dongs?: string[];
}

// 구 줄임 이름이 흔한 낱말과 같아 다른 기사가 섞일 곳(예: 용인시 수지구 → 「수지 개선」) — 줄임 이름을 쓰지 않는다
const SHORT_NAME_EXCEPTIONS = new Set(["수지", "수정", "장안", "중원"]);

/** 「고양시 일산동구」 → 검색 「고양시 일산동구」, 통과 이름 일산동구·일산 / 「강서구」(서울) → 「서울 강서구」, 통과 강서구 / 「중구」(부산) → 부산도 함께
 *  개선 A(2026-11-11): 시+구는 시 이름(「화성」)만으로 통과시키지 않는다 — 11-11 알림에서 광명 철산자이 기사가 「화성시 동탄구」로 분류됨.
 *  대신 구 줄임 이름(동탄구→동탄, 일산동구→일산)으로 「화성시 동탄」 기사는 놓치지 않는다 */
export function regionTerms(sggCd: string, sggNm: string, dongs?: string[]): RegionTerms {
  return { ...baseTerms(sggCd, sggNm), ...(dongs?.length ? { dongs } : {}) };
}

function baseTerms(sggCd: string, sggNm: string): RegionTerms {
  const parts = sggNm.trim().split(/\s+/).filter(Boolean);
  const sido = sidoOf(sggCd);
  if (parts.length >= 2) {
    const district = parts[parts.length - 1];
    const short = district.replace(/(동|서|남|북)?구$/, "");
    const useShort = short !== district && short.length >= 2 && !SHORT_NAME_EXCEPTIONS.has(short);
    return { query: sggNm.trim(), anyOf: [district, ...(useShort ? [short] : [])], alsoNeed: null };
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

/** 개선 A 실측(2026-11-11): 광명 철산자이 기사가 요약의 「경기 화성시 동탄구(21.91%)에 이어 두 번째」로 동탄구에 들어옴.
 *  지역 이름이 「이름(숫자…)」 통계 목록 형태로만 나오면 지나가는 언급으로 본다 */
export function onlyListedInStats(text: string, terms: RegionTerms): boolean {
  if (!mentionsRegion(text, terms)) return false;
  let masked = text;
  for (const n of [...terms.anyOf].sort((a, b) => b.length - a.length)) {
    masked = masked.replace(new RegExp(`${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s?\\(\\s?[0-9.+\\-]`, "g"), "□(");
  }
  return !terms.anyOf.some((n) => masked.includes(n));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 제목에 지역 이름이나 그 구의 동 이름이 있는가 */
export function titleMentionsRegion(title: string, terms: RegionTerms): boolean {
  return mentionsRegion(title, terms) || Boolean(terms.dongs?.some((d) => title.includes(d)));
}

/** 잡음 줄이기(2026-11-13, docs/PLAN_20261113_NEWS_NOISE.md) — 11-13 서초구 37건 중 제목에 서초가 있는 기사는 3건뿐이었다.
 *  요약의 지역 언급이 지나가는 꼴뿐이면 true:
 *  가) 통계 목록 「서초구(21.9%)」 나) 행사 장소 「서초구 aT센터에서 열린」
 *  다) 다른 구와 나란히 든 통계 비교 — 구가 셋 이상 나열(「서초구, 강남구, 송파구」)이거나, 둘이면 바로 뒤에 숫자·「각각」이 올 때(「강남구와 서초구의 전셋값이 각각 2.52%」).
 *     「서초구와 강남구는 부담금 예정액을 통보」처럼 그 구가 주체인 문장은 숫자가 바로 따라오지 않아 남는다 */
export function onlyPassingMention(text: string, terms: RegionTerms): boolean {
  if (!mentionsRegion(text, terms)) return false;
  let masked = text;
  const JOIN = "(?:와|과|,|·|ㆍ)\\s?";
  for (const n of [...terms.anyOf].sort((a, b) => b.length - a.length)) {
    const e = escapeRe(n);
    masked = masked
      .replace(new RegExp(`${e}\\s?\\(\\s?[0-9.+\\-]`, "g"), "□(")
      .replace(new RegExp(`${e}[^.。]{0,25}?(센터|타워|호텔|컨벤션|회관|빌딩|사옥|본사|홀)[^.。]{0,10}?에서`, "g"), "□에서")
      .replace(new RegExp(`((?:[가-힣]{1,4}구${JOIN})*)${e}((?:${JOIN}[가-힣]{1,4}구)*)`, "g"), (m: string, before: string, after: string, offset: number, whole: string) => {
        const others = (before.match(/구(?:와|과|,|·|ㆍ)/g) ?? []).length + (after.match(/[가-힣]구/g) ?? []).length;
        if (others >= 2) return "□";
        if (others === 1 && /[0-9]|각각/.test(whole.slice(offset + m.length, offset + m.length + 30))) return "□";
        return m;
      });
  }
  return !terms.anyOf.some((n) => masked.includes(n));
}

/** 여러 회사·여러 소식을 한 기사에 모은 묶음 기사 제목(「[건설 브리핑]」「[오늘의 건설]」「이 시각 헤드라인」) */
export function isRoundupTitle(title: string): boolean {
  return /(브리핑|라운지|레이더|업계 소식|오늘의 건설|건설·분양오늘|헤드라인|이 시각)/.test(title);
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

// 개선 B(2026-11-11): 같은 사건을 언론사마다 다른 제목으로 쓴 기사 묶기(11-11 알림: 재초환 탄원 중앙·동아 2건)
// 사건을 가리지 못하는 흔한 낱말 — 셀 때 뺀다
const STORY_STOPWORDS = new Set([
  "아파트", "단지", "추진", "사업", "개발", "부동산", "지역", "일대", "인근", "속도", "본격", "확정", "발표", "예정", "관련",
  "단독", "속보", "종합", "기자", "뉴스", "오늘", "내일", "올해", "내년", "이번", "최대", "최초", "공개", "전망", "논란",
  "정부", "시장", "주민", "가격", "매매", "전세", "분양", "청약", "조합", "정비", "구역", "신설", "학교", "학군", "지하철",
  "재건축", "재개발", "규제", "토지거래허가", "조정대상지역", "GTX", "서울", "경기", "인천", "수도권", "대책", "계획",
  // 실측(2026-11-11): 시황 기사끼리 「강남/집값/하락」만으로 묶이던 낱말
  "강남", "강북", "집값", "아파트값", "하락", "상승", "급등", "급락", "주택", "공급", "수요", "거래", "신규", "칼럼", "사설",
]);
// 「도·로·이·가」는 여의도·대로처럼 이름 끝 글자와 겹쳐 떼지 않는다
const JOSA = /(으로|에서|까지|부터|에게|은|는|을|를|의|에)$/;

/** 제목 → 사건 낱말 묶음(괄호·기호 제거, 2글자 이상, 조사 떼기, 지역 이름·흔한 낱말 빼기) */
export function storyTokens(title: string, terms?: RegionTerms): Set<string> {
  const region = terms
    ? [...terms.anyOf, ...terms.anyOf.map((n) => n.replace(/(구|시|군)$/, "")), ...terms.query.split(/\s+/), terms.alsoNeed ?? ""].filter((w) => w.length >= 2)
    : [];
  const out = new Set<string>();
  // 「2.2억」을 「2」「2억」으로 쪼개지 않게 소수점은 숫자 사이에서만 남긴다
  for (const raw of title.replace(/\[[^\]]*\]|\([^)]*\)/g, " ").split(/(?:(?<!\d)\.|\.(?!\d)|[^0-9A-Za-z가-힣㎡%.])+/)) {
    let w = raw;
    const stripped = w.replace(JOSA, "");
    if (stripped.length >= 2 && stripped !== w && !/\d/.test(w)) w = stripped;
    if (w.length < 2 || STORY_STOPWORDS.has(w)) continue;
    if (region.some((r) => w.includes(r) || r.includes(w))) continue;
    out.add(w);
  }
  return out;
}

/** 낱말 3개 이상 겹치거나, 숫자 낱말(「20억」「84㎡」)을 포함해 2개 이상 겹치면 같은 사건 */
export function isSameStory(a: Set<string>, b: Set<string>): boolean {
  let n = 0;
  let digit = false;
  for (const w of a) {
    if (!b.has(w)) continue;
    n++;
    if (/\d/.test(w)) digit = true;
  }
  return n >= 3 || (n >= 2 && digit);
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

/** 응답 → 후보: 지역 이름 없음·너무 오래됨·같은 제목·같은 사건은 뺀다. 먼저 나온 분류가 남는다.
 *  recentTitles = 이 회원·이 지역에 지난 3일 이미 받은 기사 제목(다음 날 다른 언론사가 같은 사건을 내도 다시 보내지 않음) */
export function pickCandidates(
  results: { category: NewsCategory; items: RawNews[] }[],
  terms: RegionTerms,
  now = new Date(),
  recentTitles: string[] = [],
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
      if (!mentionsRegion(title, terms) && onlyListedInStats(it.description ?? "", terms)) continue;
      // 잡음 줄이기(2026-11-13): 제목에 지역 이름이 없는 묶음 기사, 제목에 지역·동 이름이 없고 요약 언급이 지나가는 꼴뿐인 기사는 뺀다
      if (!mentionsRegion(title, terms) && isRoundupTitle(title)) continue;
      if (!titleMentionsRegion(title, terms) && onlyPassingMention(it.description ?? "", terms)) continue;
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
  const inTitle = (c: NewsCandidate) => titleMentionsRegion(c.title, terms);
  const ordered = [...out.filter(inTitle), ...out.filter((c) => !inTitle(c))];
  // 같은 사건은 앞에 온 것(제목에 지역 이름 있는 쪽)만 남긴다. 이미 받은 기사와 같은 사건이면 넣지 않는다
  const kept: Set<string>[] = recentTitles.map((t) => storyTokens(t, terms));
  return ordered.filter((c) => {
    const tokens = storyTokens(c.title, terms);
    if (kept.some((k) => isSameStory(tokens, k))) return false;
    kept.push(tokens);
    return true;
  });
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
