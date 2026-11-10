// V6 「내 채널 진짜 지표」(v1.27, 2026-11-11) — YouTube Analytics API v2 응답을 화면용 숫자로 정리하는 순수 함수(네트워크 없음, 시험 tests/myChannel.test.mjs).
// 공식 문서(2026-11-11 확인): GET https://youtubeanalytics.googleapis.com/v2/reports, ids=channel==MINE, 응답 columnHeaders[] + rows[][](데이터 없으면 rows 생략).
// 노출수·노출 클릭률(CTR)은 분석 API 지표 목록에 없음 → 화면에서 「유튜브 스튜디오에서만 보이는 지표」로 안내.

export const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly";
export const YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
/** 이 화면에 꼭 필요한 권한(문서상 보고서 호출에 youtube.readonly도 요구될 수 있어 둘 다) */
export const MY_CHANNEL_NEED_SCOPES = [ANALYTICS_SCOPE, YOUTUBE_READONLY_SCOPE];
/** 연결할 때 함께 받는 권한 — 유튜브 댓글(force-ssl)·shots(upload)도 같은 연결을 다시 쓰게(공용 연동 규칙) */
export const MY_CHANNEL_CONNECT_SCOPES = [
  ANALYTICS_SCOPE,
  YOUTUBE_READONLY_SCOPE,
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube.upload",
];

export const PERIODS = [7, 28, 90] as const;
export type Period = (typeof PERIODS)[number];
export const pickPeriod = (v: unknown): Period => {
  const n = Number(v);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 28;
};

/** 기간: 오늘(한국 날짜) 기준 지난 N일. 분석 데이터는 최근 하루 이틀이 비어 있을 수 있음(문서) */
export function dateRange(days: number, now: Date = new Date()): { startDate: string; endDate: string } {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const end = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: f(start), endDate: f(end) };
}

export type ReportTable = { columnHeaders?: { name?: string }[]; rows?: unknown[][] };

/** columnHeaders 이름으로 행을 객체로 바꾼다(열 순서에 기대지 않음) */
export function toRecords(t: ReportTable | null | undefined): Record<string, string | number>[] {
  const names = (t?.columnHeaders ?? []).map((h) => String(h?.name ?? ""));
  if (!names.length || !Array.isArray(t?.rows)) return [];
  return t!.rows!.filter(Array.isArray).map((r) => {
    const o: Record<string, string | number> = {};
    names.forEach((n, i) => {
      const v = r[i];
      o[n] = typeof v === "number" ? v : typeof v === "string" ? v : 0;
    });
    return o;
  });
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export const SUMMARY_METRICS = "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares";

export type Summary = {
  views: number; watchHours: number; avgViewSeconds: number; avgViewPercent: number;
  subscribersNet: number; subscribersGained: number; subscribersLost: number; likes: number; comments: number; shares: number;
};

export function toSummary(t: ReportTable | null | undefined): Summary {
  const r = toRecords(t)[0] ?? {};
  const gained = num(r.subscribersGained), lost = num(r.subscribersLost);
  return {
    views: num(r.views),
    watchHours: Math.round((num(r.estimatedMinutesWatched) / 60) * 10) / 10,
    avgViewSeconds: Math.round(num(r.averageViewDuration)),
    avgViewPercent: Math.round(num(r.averageViewPercentage) * 10) / 10,
    subscribersNet: gained - lost, subscribersGained: gained, subscribersLost: lost,
    likes: num(r.likes), comments: num(r.comments), shares: num(r.shares),
  };
}

export type DayPoint = { day: string; views: number; watchHours: number; subscribersNet: number };
export function toDaily(t: ReportTable | null | undefined): DayPoint[] {
  return toRecords(t)
    .map((r) => ({ day: String(r.day ?? ""), views: num(r.views), watchHours: Math.round((num(r.estimatedMinutesWatched) / 60) * 10) / 10, subscribersNet: num(r.subscribersGained) - num(r.subscribersLost) }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export type TopVideo = { videoId: string; views: number; watchHours: number; avgViewPercent: number; title?: string };
export function toTopVideos(t: ReportTable | null | undefined): TopVideo[] {
  return toRecords(t)
    .map((r) => ({ videoId: String(r.video ?? ""), views: num(r.views), watchHours: Math.round((num(r.estimatedMinutesWatched) / 60) * 10) / 10, avgViewPercent: Math.round(num(r.averageViewPercentage) * 10) / 10 }))
    .filter((v) => /^[A-Za-z0-9_-]{6,20}$/.test(v.videoId));
}

/** 유입 경로 이름(문서 insightTrafficSourceType 값) → 쉬운 한국어 */
export const TRAFFIC_LABELS: Record<string, string> = {
  YT_SEARCH: "유튜브 검색", RELATED_VIDEO: "추천 영상", SHORTS: "쇼츠 피드", YT_CHANNEL: "내 채널 페이지", SUBSCRIBER: "구독 피드",
  EXT_URL: "외부 사이트·구글 검색", NO_LINK_OTHER: "직접 입력·기타", PLAYLIST: "재생목록", NOTIFICATION: "알림", YT_OTHER_PAGE: "유튜브 기타 화면",
  END_SCREEN: "최종 화면", HASHTAGS: "해시태그", ADVERTISING: "광고", PROMOTED: "프로모션", NO_LINK_EMBEDDED: "퍼가기(소스 미확인)",
  SOUND_PAGE: "사운드 페이지", VIDEO_REMIXES: "리믹스", PRODUCT_PAGE: "상품 페이지", ANNOTATION: "주석", LIVE_REDIRECT: "라이브 이동", WATCH_WITH: "함께 보기",
};
export type Share = { key: string; label: string; value: number; percent: number };
export function toTraffic(t: ReportTable | null | undefined): Share[] {
  const rows = toRecords(t).map((r) => ({ key: String(r.insightTrafficSourceType ?? ""), value: num(r.views) })).filter((r) => r.key && r.value > 0);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows
    .sort((a, b) => b.value - a.value)
    .map((r) => ({ key: r.key, label: TRAFFIC_LABELS[r.key] ?? r.key, value: r.value, percent: total ? Math.round((r.value / total) * 1000) / 10 : 0 }));
}

const AGE_LABELS: Record<string, string> = { "age13-17": "13~17세", "age18-24": "18~24세", "age25-34": "25~34세", "age35-44": "35~44세", "age45-54": "45~54세", "age55-64": "55~64세", "age65-": "65세 이상" };
const GENDER_LABELS: Record<string, string> = { female: "여성", male: "남성", user_specified: "직접 지정" };
/** ageGroup,gender × viewerPercentage → 나이별 합계·성별 합계(%) */
export function toDemographics(t: ReportTable | null | undefined): { ages: Share[]; genders: Share[] } {
  const rows = toRecords(t);
  const ageMap = new Map<string, number>(), genMap = new Map<string, number>();
  for (const r of rows) {
    const p = num(r.viewerPercentage);
    const a = String(r.ageGroup ?? ""), g = String(r.gender ?? "");
    if (a) ageMap.set(a, (ageMap.get(a) ?? 0) + p);
    if (g) genMap.set(g, (genMap.get(g) ?? 0) + p);
  }
  const conv = (m: Map<string, number>, labels: Record<string, string>, order?: string[]) =>
    [...m.entries()]
      .filter(([, v]) => v > 0)
      .sort((x, y) => (order ? order.indexOf(x[0]) - order.indexOf(y[0]) : y[1] - x[1]))
      .map(([k, v]) => ({ key: k, label: labels[k] ?? k, value: Math.round(v * 10) / 10, percent: Math.round(v * 10) / 10 }));
  return { ages: conv(ageMap, AGE_LABELS, Object.keys(AGE_LABELS)), genders: conv(genMap, GENDER_LABELS) };
}

export function toCountries(t: ReportTable | null | undefined, limit = 8): Share[] {
  const rows = toRecords(t).map((r) => ({ key: String(r.country ?? ""), value: num(r.views) })).filter((r) => r.key && r.value > 0);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((r) => ({ key: r.key, label: r.key === "ZZ" ? "알 수 없음" : r.key, value: r.value, percent: total ? Math.round((r.value / total) * 1000) / 10 : 0 }));
}

const CONTENT_LABELS: Record<string, string> = { SHORTS: "쇼츠", VIDEO_ON_DEMAND: "일반 영상", LIVE_STREAM: "라이브", STORY: "스토리", UNSPECIFIED: "기타" };
/** day,creatorContentType × views → 유형별 합계(문서: creatorContentType은 기간별 보고서에서 선택 차원) */
export function toContentTypes(t: ReportTable | null | undefined): Share[] {
  const m = new Map<string, number>();
  for (const r of toRecords(t)) {
    // 문서 값은 SHORTS·VIDEO_ON_DEMAND이지만 실제 응답은 shorts·videoOnDemand(2026-11-11 운영 확인) → 대문자_밑줄로 맞춤
    const k = String(r.creatorContentType ?? "").replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
    if (k) m.set(k, (m.get(k) ?? 0) + num(r.views));
  }
  const total = [...m.values()].reduce((s, v) => s + v, 0);
  return [...m.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ key: k, label: CONTENT_LABELS[k] ?? k, value: v, percent: total ? Math.round((v / total) * 1000) / 10 : 0 }));
}

/** 숫자만 보고 만드는 다음 할 일 힌트(AI 호출 없음 — 비용 0) */
export function buildHints(o: { summary: Summary; top: TopVideo[]; traffic: Share[]; contentTypes: Share[]; days: number }): string[] {
  const out: string[] = [];
  const { summary: s } = o;
  if (s.views === 0) return ["이 기간에 집계된 조회수가 없습니다. 유튜브 분석 숫자는 하루 이틀 늦게 들어오니 기간을 늘려 보세요."];
  const low = o.top.filter((v) => v.avgViewPercent > 0 && v.avgViewPercent < 30);
  if (low.length) out.push(`평균 시청 비율 30% 미만 영상이 ${low.length}개 있습니다. 앞 15초(훅)와 썸네일·제목 약속이 맞는지 다시 보세요.`);
  if (s.avgViewPercent >= 50) out.push(`채널 평균 시청 비율이 ${s.avgViewPercent}%로 높습니다. 지금 형식을 유지하면서 올리는 횟수를 늘려 보세요.`);
  const search = o.traffic.find((t) => t.key === "YT_SEARCH");
  if (search && search.percent >= 30) out.push(`조회수의 ${search.percent}%가 유튜브 검색에서 옵니다. 제목·설명에 검색어를 계속 넣는 전략이 맞습니다.`);
  const related = o.traffic.find((t) => t.key === "RELATED_VIDEO");
  if (related && related.percent >= 30) out.push(`추천 영상 유입이 ${related.percent}%입니다. 비슷한 주제로 이어 보기 좋은 시리즈를 만들어 보세요.`);
  const shorts = o.contentTypes.find((c) => c.key === "SHORTS");
  if (shorts && shorts.percent >= 70 && s.subscribersNet <= 0) out.push(`조회수의 ${shorts.percent}%가 쇼츠인데 구독자가 늘지 않았습니다. 쇼츠 끝에 긴 영상·채널로 이어지는 안내를 넣어 보세요.`);
  if (s.subscribersLost > s.subscribersGained) out.push(`이 기간 구독 취소(${s.subscribersLost})가 새 구독(${s.subscribersGained})보다 많습니다. 최근 영상 주제가 기존 구독자 관심과 달라졌는지 확인해 보세요.`);
  if (s.views > 0 && s.likes / s.views < 0.01) out.push("좋아요 비율이 1% 미만입니다. 영상 중간·끝에 좋아요·댓글을 부르는 질문을 넣어 보세요.");
  if (!out.length) out.push("뚜렷하게 나쁜 신호는 없습니다. 잘 된 영상 상위 3개의 주제·길이·첫 장면을 다음 영상에 다시 써 보세요.");
  return out.slice(0, 5);
}
