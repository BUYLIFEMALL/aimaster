/**
 * 근거 수치 기반 AI 기획안 — 앱이 계산한 통계와 떡상 영상만 넣고 「없는 수치를 지어내지 말 것」을 지시,
 * 고정 JSON 스키마로 받아 검증·정리한다. 실행은 회원 본인 Claude 키(api/ai/viral-plan).
 *
 * 출처: boks-youtube-finder (https://github.com/boksajang/boks-youtube-finder, 커밋 3aacecf) services/ai-cli.js —
 *       PLAN_SCHEMA, pickPromptVideos, videoLine, trendSummary, buildPrompt, sanitize, extractJsonObject, normalizeReport
 *       (로컬 CLI 실행 부분은 옮기지 않음 — 웹 서비스·회원 본인 키 구조와 맞지 않음)
 *       MIT License © 2026 복사장 (Boksajang) — 전문은 youtube-viral-studio/NOTICE.md
 * 이식: 2026-11-16 영상 담당, 프롬프트·스키마·검증 그대로.
 */

import type { FinderFormat } from "./core";

/** 기획안에 넣는 영상 칸(화면이 보낸 값을 서버에서 다시 걸러 쓴다) */
export interface PlanVideo {
  title: string;
  channelTitle: string;
  isShorts: boolean;
  durationFormatted: string;
  subscriberCountFormatted: string;
  viewCount: number;
  viewCountFormatted: string;
  publishedAtRelative: string;
  score: number | null;
  scoreFormatted: string;
  scoreBasis: "baseline" | "subs" | null;
  channelBaselineFormatted: string;
  subsRatio: number | null;
  subsRatioFormatted: string;
  viewsPerDayFormatted: string;
  likeRate: number | null;
  qualifies: boolean;
  tags: string[];
}

/** 기획안에 넣는 트렌드 요약 칸 */
export interface PlanTrends {
  totals: { count: number; outlierCount: number; outlierRate: number; medianViews: number; recent30Share: number };
  formatSplit: { shorts: { count: number; outlierRate: number; medianScore: number | null }; long: { count: number; outlierRate: number; medianScore: number | null } };
  findings: { text: string }[];
  topTags: { tag: string }[];
}

export interface PlanRecommendation {
  format: string;
  title: string;
  altTitles: string[];
  targetLength: string;
  targetViewer: string;
  thumbnailConcept: string;
  hookIntro: string;
  outline: string[];
  keyPoints: string[];
  tags: string[];
  reference: string;
}

export interface PlanReport {
  summary: string;
  hookingAngles: string[];
  titleFormulas: string[];
  thumbnailPatterns: string[];
  formatStrategy: string;
  recommendations: PlanRecommendation[];
  blueOceanInsight: string;
}

export const PLAN_SYSTEM_PROMPT = "당신은 한국 유튜브 콘텐츠 전략가입니다. 사용자 메시지의 지시와 출력 형식만 정확히 따르세요.";

const FORMAT_LABEL: Record<string, string> = { all: "쇼츠·롱폼 전체", long: "롱폼", shorts: "쇼츠" };

const isOutlier = (v: PlanVideo) => !!v.qualifies && typeof v.score === "number" && v.score >= 3;

const PLAN_SCHEMA = {
  shorts: `    {
      "format": "쇼츠",
      "title": "영상 제목(쇼츠 제목은 짧고 강하게)",
      "altTitles": ["다른 제목 후보 1", "다른 제목 후보 2"],
      "targetLength": "권장 길이(예: 35~45초)",
      "targetViewer": "누가 왜 볼지",
      "thumbnailConcept": "첫 화면(커버)에 보일 장면과 큰 자막",
      "hookIntro": "첫 1~2초에 말할 문장 또는 보여줄 장면",
      "outline": ["0~2초: 훅", "2~10초: ...", "10~30초: ...", "마지막 3초: 반복 시청·댓글 유도"],
      "keyPoints": ["화면 자막·편집 리듬·반복 시청 장치 등 시청 유지 포인트"],
      "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
      "reference": "근거가 된 데이터(영상 번호·패턴)"
    }`,
  long: `    {
      "format": "롱폼",
      "title": "영상 제목",
      "altTitles": ["다른 제목 후보 1", "다른 제목 후보 2"],
      "targetLength": "권장 길이(예: 10~14분)",
      "targetViewer": "누가 왜 볼지",
      "thumbnailConcept": "썸네일 시각 요소와 문구",
      "hookIntro": "첫 30초 오프닝 대본 뼈대",
      "outline": ["00:00 오프닝", "01:00 ...", "05:00 ...", "09:00 ...", "마무리·다음 영상 유도"],
      "keyPoints": ["중간 이탈을 막는 장치(예고·반전·체크리스트 등)"],
      "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
      "reference": "근거가 된 데이터(영상 번호·패턴)"
    }`,
};

/** 프롬프트 구조를 깨는 제어문자 제거 */
export function sanitize(s: unknown): string {
  return String(s || "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").replace(/<\/?videos>/gi, "").slice(0, 300);
}

/**
 * AI에 넘길 영상: 떡상 판정 영상을 점수순으로, 부족하면 조회수 상위 영상으로 채운다.
 *   전체: 쇼츠·롱폼 각각 최대 8개 / 한 형식: 최대 12개
 */
function pickFrom(list: PlanVideo[], limit: number) {
  const pool = list.filter((v) => v.viewCount > 0);
  const outliers = pool.filter(isOutlier).sort((a, b) => (b.score as number) - (a.score as number)).slice(0, limit);
  if (outliers.length >= Math.min(5, limit)) return { picked: outliers, supplemented: false };
  const rest = pool.filter((v) => !outliers.includes(v)).sort((a, b) => b.viewCount - a.viewCount);
  return { picked: [...outliers, ...rest].slice(0, limit), supplemented: true };
}

export function pickPromptVideos(videos: PlanVideo[], format: FinderFormat = "all") {
  const list = videos || [];
  if (format === "all") {
    const s = pickFrom(list.filter((v) => v.isShorts), 8);
    const l = pickFrom(list.filter((v) => !v.isShorts), 8);
    return { picked: [...s.picked, ...l.picked], supplemented: s.supplemented || l.supplemented, shortsCount: s.picked.length, longCount: l.picked.length };
  }
  const only = list.filter((v) => (format === "shorts" ? v.isShorts : !v.isShorts));
  const r = pickFrom(only, 12);
  return { ...r, shortsCount: format === "shorts" ? r.picked.length : 0, longCount: format === "long" ? r.picked.length : 0 };
}

function videoLine(v: PlanVideo, i: number): string {
  const main = v.scoreBasis === "baseline"
    ? `채널 평소(최근 같은 형식 영상 중앙값 ${v.channelBaselineFormatted}회) 대비 ${v.scoreFormatted}`
    : v.scoreBasis === "subs"
      ? `채널 평소 조회수 확인 불가 → 구독자 대비 ${v.scoreFormatted}(추정)`
      : "배수 계산 불가";
  const tags = (v.tags || []).slice(0, 6).map(sanitize).join(", ");
  return [
    `${i + 1}. [${v.isShorts ? "쇼츠" : "롱폼"} ${v.durationFormatted || "?"}] ${sanitize(v.title)}`,
    `   채널: ${sanitize(v.channelTitle)} (구독자 ${v.subscriberCountFormatted}) · 조회수 ${v.viewCountFormatted} · ${v.publishedAtRelative} 업로드${isOutlier(v) ? " · 떡상" : ""}`,
    `   ${main}${v.subsRatio != null ? ` · 구독자 대비 ${v.subsRatioFormatted}` : ""} · 하루 평균 ${v.viewsPerDayFormatted}회${v.likeRate !== null && v.likeRate !== undefined ? ` · 좋아요율 ${v.likeRate}%` : ""}`,
    tags ? `   태그: ${tags}` : "",
  ].filter(Boolean).join("\n");
}

function trendSummary(t: PlanTrends | null, format: FinderFormat): string {
  if (!t || !t.totals || t.totals.count === 0) return "";
  const lines: string[] = [];
  const tt = t.totals;
  lines.push(`- 분석 영상 ${tt.count}개 · 떡상 ${tt.outlierCount}개(${tt.outlierRate}%) · 조회수 중앙값 ${tt.medianViews.toLocaleString("ko-KR")}회 · 최근 30일 영상 ${tt.recent30Share}%`);
  if (format === "all") {
    const s = t.formatSplit.shorts;
    const l = t.formatSplit.long;
    lines.push(`- 쇼츠 ${s.count}개(떡상 ${s.outlierRate}%, 평소 대비 중앙값 ${s.medianScore ?? "-"}배) · 롱폼 ${l.count}개(떡상 ${l.outlierRate}%, 평소 대비 중앙값 ${l.medianScore ?? "-"}배)`);
  }
  (t.findings || []).forEach((f) => lines.push(`- ${sanitize(f.text)}`));
  if (t.topTags && t.topTags.length) lines.push(`- 자주 쓰인 태그: ${t.topTags.slice(0, 10).map((x) => sanitize(x.tag)).join(", ")}`);
  return lines.join("\n");
}

export function buildPlanPrompt(keyword: string, videos: PlanVideo[], format: FinderFormat = "all", trends: PlanTrends | null = null): string {
  const pick = pickPromptVideos(videos, format);
  const lines = pick.picked.map(videoLine).join("\n");
  const rule = "조회수 1만 회 이상이면서 그 채널 평소 조회수의 3배 이상";
  const intro = pick.supplemented
    ? `아래는 실제 검색 영상입니다(떡상 = ${rule}). 떡상 영상이 적은 형식은 조회수 상위 영상으로 채웠으니 "떡상" 표시 영상에 더 무게를 두세요.`
    : `아래는 실제 검색 영상 중 떡상 영상(${rule})을 배수 순으로 고른 것입니다.`;

  let task: string;
  let planSchema: string;
  let extra = "";
  if (format === "all") {
    task = `쇼츠와 롱폼을 모두 다루세요. recommendations 는 쇼츠 2개, 롱폼 2개로 정확히 4개를 쓰고, outline 은 3~4단계로 간결하게 쓰세요.${pick.shortsCount === 0 ? " 쇼츠 데이터가 없으면 쇼츠 기획안은 검색 키워드와 롱폼 데이터에서 추론했다고 reference 에 밝히세요." : ""}${pick.longCount === 0 ? " 롱폼 데이터가 없으면 롱폼 기획안은 추론했다고 reference 에 밝히세요." : ""}`;
    planSchema = `${PLAN_SCHEMA.shorts},\n${PLAN_SCHEMA.long}`;
    extra = '\n  "formatStrategy": "이 키워드에서 쇼츠와 롱폼을 어떻게 나눠 운영할지(어느 쪽을 먼저, 서로 어떻게 연결할지) 2~3문장",';
  } else {
    const label = format === "shorts" ? "쇼츠" : "롱폼";
    task = `${label}만 다루세요. 다른 형식은 언급하지 마세요. recommendations 는 ${label} 기획안 정확히 3개이며, outline 은 ${format === "shorts" ? "초 단위 장면 4~6컷" : "시간 표시가 있는 구성 5~7단계"}로 바로 촬영할 수 있게 구체적으로 쓰세요.`;
    planSchema = format === "shorts" ? PLAN_SCHEMA.shorts : PLAN_SCHEMA.long;
  }

  const stats = trendSummary(trends, format);
  return `검색 키워드: "${sanitize(keyword)}" · 분석 형식: ${FORMAT_LABEL[format] || "전체"}

${stats ? `[검색 결과 통계 — 앱이 계산한 실제 수치]\n${stats}\n\n` : ""}${intro}
<videos>
${lines}
</videos>

이 데이터를 근거로, 이제 막 시작하는 크리에이터가 바로 제작할 수 있는 기획안을 작성하세요.
- ${task}
- 데이터에 없는 수치를 지어내지 마세요. 수치를 말할 때는 위 통계와 영상 정보에 있는 값만 쓰세요.
- 모든 문장은 자연스러운 한국어로 쓰세요.
- 출력은 아래 스키마의 JSON 객체 하나만 쓰세요. 코드블록·설명·인사말을 붙이지 마세요.

{
  "summary": "이 키워드에서 조회수가 터지는 핵심 패턴 한 문장",
  "hookingAngles": ["시청자를 끈 패턴과 이유 1", "패턴과 이유 2", "패턴과 이유 3"],
  "titleFormulas": ["떡상 제목에서 뽑은 제목 공식과 예시 1", "공식 2", "공식 3"],
  "thumbnailPatterns": ["떡상 영상 썸네일·첫 화면에서 반복되는 요소 1", "요소 2"],${extra}
  "recommendations": [
${planSchema}
  ],
  "blueOceanInsight": "대형 채널과 겹치지 않는 틈새 공략 각도"
}`;
}

// --- 출력 파싱 ---

export function extractJsonObject(text: string): Record<string, unknown> | null {
  const src = String(text || "").trim();
  try {
    const whole = JSON.parse(src);
    if (whole && typeof whole === "object") return whole;
  } catch { /* 앞뒤에 설명·코드펜스가 붙은 경우 아래에서 추출 */ }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(src);
  const body = fenced ? fenced[1] : src;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(body.slice(start, end + 1)); } catch { return null; }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strList = (v: unknown, max = 10) => (Array.isArray(v) ? v : []).map(str).filter(Boolean).slice(0, max);

function normalizeFormat(f: unknown): string {
  const s = str(f);
  if (/쇼츠|숏|short/i.test(s)) return "쇼츠";
  if (/롱폼|long|일반/i.test(s)) return "롱폼";
  return s || "기획안";
}

export function normalizeReport(obj: unknown, format: FinderFormat = "all"): PlanReport | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  let recommendations = (Array.isArray(o.recommendations) ? o.recommendations : [])
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      format: normalizeFormat(r.format),
      title: str(r.title),
      altTitles: strList(r.altTitles, 3),
      targetLength: str(r.targetLength),
      targetViewer: str(r.targetViewer),
      thumbnailConcept: str(r.thumbnailConcept),
      hookIntro: str(r.hookIntro),
      outline: strList(r.outline, 8),
      keyPoints: strList(r.keyPoints, 5),
      tags: strList(r.tags, 12).map((t) => t.replace(/^#/, "")),
      reference: str(r.reference),
    }))
    .filter((r) => r.title);
  // 한 형식만 요청했는데 다른 형식이 섞여 오면 버린다
  if (format === "shorts") recommendations = recommendations.filter((r) => r.format !== "롱폼");
  if (format === "long") recommendations = recommendations.filter((r) => r.format !== "쇼츠");
  const report: PlanReport = {
    summary: str(o.summary),
    hookingAngles: strList(o.hookingAngles, 5),
    titleFormulas: strList(o.titleFormulas, 5),
    thumbnailPatterns: strList(o.thumbnailPatterns, 4),
    formatStrategy: format === "all" ? str(o.formatStrategy) : "",
    recommendations,
    blueOceanInsight: str(o.blueOceanInsight),
  };
  return report.summary && report.recommendations.length > 0 ? report : null;
}
