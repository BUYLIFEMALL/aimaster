// BLC-11 (2026-10-22): 「AI 블로그 키워드 자동화」(blog-keyword) 결과를 SEO 스튜디오로 넘겨받는 규칙 — 순수 함수(서버·화면·시험 공용).
// 주소에는 기록 번호만 오고, 서버가 같은 회원의 blog_keyword_reports 행을 다시 읽어 이 함수로 판정·정리한다.
// 실측(네이버 API 값)·AI 추정·값 없음을 나눠 담고, 값 없음을 0으로 바꾸지 않으며 새 종합 점수를 만들지 않는다.

export const HANDOFF_DAYS = 30; // 회원 생성 데이터 30일 보관 규칙 — 그보다 오래된 기록은 받지 않는다
const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Measured = { label: string; value: number | string; unit: string; source: string };
export type Estimated = { label: string; value: number | string };
export type KeywordEvidence = {
  reportId: string;
  feature: string;
  featureLabel: string;
  keyword: string;
  createdAt: string;
  expiresAt: string;
  daysLeft: number; // 만료까지 남은 날(올림)
  measured: Measured[];
  missing: string[]; // 실측 항목 중 값이 없는 것(0이 아니라 수집되지 않음)
  notes: string[]; // 키워드 도구가 남긴 실측 안내(예: 검색광고 키 없음)
  estimated: Estimated[];
  candidates: string[]; // 키워드 도구 결과의 후보 키워드
  titles: string[]; // AI가 제안한 제목
};
export type HandoffRow = { id: string; user_id: string; feature: string; keyword: string | null; created_at: string; result: unknown };
export type HandoffJudgement = { ok: true; evidence: KeywordEvidence } | { ok: false; status: number; error: string };

const FEATURE_LABELS: Record<string, string> = {
  autocomplete: "자동완성 키워드", related: "AI 연관검색어", blogs: "상위 블로그 분석", competition: "키워드 경쟁력",
  recommend: "오늘의 전략 키워드", sustainable: "다각도 주제 발굴", news: "실시간 뉴스 전략", trend: "카테고리 트렌드", prompt: "프롬프트 라이브러리",
};
const WITH_REAL = new Set(["blogs", "competition", "trend"]);

export const isReportId = (value: unknown): value is string => typeof value === "string" && REPORT_ID.test(value);

const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {});
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown, max = 80): string => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");
const isNum = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function unique(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}
const titlesOf = (items: unknown): string[] => arr(items).map((item) => text(obj(item).title, 120));

function realOf(raw: unknown): { measured: Measured[]; missing: string[]; notes: string[] } {
  const real = obj(raw);
  const measured: Measured[] = [];
  const missing: string[] = [];
  const AD = "네이버 검색광고 키워드도구";
  const add = (label: string, value: unknown, unit: string, source: string, required: boolean) => {
    if (isNum(value) || (typeof value === "string" && value.trim())) measured.push({ label, value: isNum(value) ? value : value.trim(), unit, source });
    else if (required) missing.push(label);
  };
  add("월간 검색수(PC+모바일)", real.monthlyTotal, "회", AD, true);
  add("월간 검색수(PC)", real.monthlyPc, "회", AD, false);
  add("월간 검색수(모바일)", real.monthlyMobile, "회", AD, false);
  add("광고 경쟁 정도", real.compIdx, "", AD, false);
  add("블로그 총 문서 수", real.blogDocTotal, "건", "네이버 블로그 검색 API", true);
  const trend = arr(real.trend).map(obj).filter((point) => isNum(point.ratio));
  const last = trend[trend.length - 1];
  if (last) add(`최근 검색 지수(${text(last.period, 20) || "최근 달"})`, last.ratio, "(최근 12개월 중 최고 달=100)", "네이버 데이터랩", true);
  else missing.push("최근 검색 지수");
  return { measured, missing, notes: arr(real.notes).map((note) => text(note, 160)).filter(Boolean).slice(0, 5) };
}

// 결과 종류마다 후보 키워드·제안 제목·AI 추정 값을 꺼낸다. 「문서 수」 문자열(documentCount)은 실측·추정이 섞여 있어 쓰지 않는다.
function pick(feature: string, result: Record<string, unknown>) {
  let candidates: string[] = [];
  let titles: string[] = [];
  const estimated: Estimated[] = [];
  if (feature === "autocomplete") {
    candidates = arr(result.keywords).map((item) => text(obj(item).text));
    titles = titlesOf(obj(result.topics).items);
  } else if (feature === "related") {
    candidates = arr(result.relatedSearches).map((item) => text(obj(item).keyword));
    const strategy = obj(result.strategy);
    titles = [text(obj(strategy.pillarPost).title, 120), ...titlesOf(strategy.suggestions)];
  } else if (feature === "blogs") {
    candidates = arr(obj(result.analysis).commonKeywords).map((item) => text(item));
    titles = titlesOf(result.suggestions);
  } else if (feature === "competition") {
    const strategy = obj(result.strategy);
    candidates = arr(strategy.expandedKeywords).map((item) => text(item));
    titles = titlesOf(strategy.blogTopics);
    if (isNum(result.opportunityScore)) estimated.push({ label: "기회 점수", value: result.opportunityScore });
    if (isNum(result.searchInterestIndex)) estimated.push({ label: "검색 관심도", value: result.searchInterestIndex });
    if (isNum(result.competitionIndex)) estimated.push({ label: "경쟁도", value: result.competitionIndex });
    if (text(result.competitionLevel)) estimated.push({ label: "경쟁 수준", value: text(result.competitionLevel) });
  } else if (feature === "recommend") {
    candidates = arr(result.items).map((item) => text(obj(item).keyword));
    titles = titlesOf(result.items);
  } else if (feature === "sustainable") {
    const topics = arr(result.categories).flatMap((category) => arr(obj(category).topics));
    candidates = topics.flatMap((topic) => arr(obj(topic).keywords).map((item) => text(item)));
    titles = titlesOf(topics);
  } else if (feature === "news") {
    titles = titlesOf(result.suggestions);
  } else if (feature === "trend") {
    candidates = arr(result.frequent).map((item) => text(obj(item).word));
    titles = [...titlesOf(result.keywordBased), ...titlesOf(result.analysisBased)];
  }
  return { candidates, titles, estimated };
}

export function judgeHandoff(row: HandoffRow | null, userId: string, now: Date = new Date()): HandoffJudgement {
  // 남의 기록과 없는 기록은 같은 답을 준다(있는지 여부를 알려 주지 않음).
  if (!row || row.user_id !== userId) return { ok: false, status: 404, error: "넘어온 키워드 기록을 찾지 못했습니다. 본인이 만든 기록만 열 수 있습니다." };
  if (!FEATURE_LABELS[row.feature]) return { ok: false, status: 422, error: "이 종류의 키워드 기록은 넘겨받을 수 없습니다." };
  const created = new Date(row.created_at);
  if (Number.isNaN(created.getTime())) return { ok: false, status: 422, error: "기록 생성일을 확인할 수 없어 넘겨받지 않았습니다." };
  const expires = new Date(created.getTime() + HANDOFF_DAYS * DAY_MS);
  if (now >= expires) return { ok: false, status: 410, error: `만든 지 ${HANDOFF_DAYS}일이 지난 기록이라 넘겨받지 않았습니다. 키워드 도구에서 다시 분석해 주세요.` };

  const result = obj(row.result);
  const { candidates, titles, estimated } = pick(row.feature, result);
  const real = WITH_REAL.has(row.feature) ? realOf(result.real) : { measured: [], missing: [], notes: [] };
  const keyword = text(row.keyword, 60) || text(result.keyword, 60) || candidates.map((item) => text(item, 60)).find(Boolean) || "";
  return {
    ok: true,
    evidence: {
      reportId: row.id.toLowerCase(),
      feature: row.feature,
      featureLabel: FEATURE_LABELS[row.feature],
      keyword,
      createdAt: created.toISOString(),
      expiresAt: expires.toISOString(),
      daysLeft: Math.ceil((expires.getTime() - now.getTime()) / DAY_MS),
      measured: real.measured,
      missing: real.missing,
      notes: real.notes,
      estimated,
      candidates: unique(candidates.filter((item) => item !== keyword), 20),
      titles: unique(titles, 10),
    },
  };
}

// 주소 해시(#title&keyword-report=<번호>)에서 기록 번호를 꺼낸다. 번호 모양이 아니면 null.
export function handoffIdFromHash(hash: string): string | null {
  const match = hash.match(/keyword-report=([0-9a-fA-F-]{36})/);
  return match && isReportId(match[1]) ? match[1].toLowerCase() : null;
}

// 「제목 추천에 쓰기」 — 주제는 키워드, 핵심 키워드는 키워드 + 후보 앞 4개
export function titleSeed(evidence: Pick<KeywordEvidence, "keyword" | "candidates">): { topic: string; keywords: string } {
  return { topic: evidence.keyword, keywords: unique([evidence.keyword, ...evidence.candidates.slice(0, 4)], 5).join(", ") };
}
