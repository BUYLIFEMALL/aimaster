// AI 분석 프롬프트. 화면에서 이미 조회한 데이터만 근거로 쓰게 하고, 없는 정보는 "확인 불가"로 말하게 한다
// (docs/PLATFORM_PATTERNS.md §30 "가짜 분석 금지"). 연도는 매번 현재 연도를 넣는다(루트 CLAUDE.md 핵심 원칙 8).


/** 한국 시간 기준 현재 연·월 지침(계절 착오 방지, docs/ERROR_LESSONS.md 2026-10-14). 서버가 UTC여도 한국 날짜를 쓴다. */
function koreaNowRule(now: Date = new Date()): string {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(now).split("-");
  return `[기준 시점: 한국 시간으로 지금은 ${y}년 ${Number(m)}월입니다. 계절·시기 표현(봄·여름·가을·겨울, 명절, 연말연시 등)은 현재 월에 맞추고, 근거 없이 다른 계절을 쓰지 마세요.]`;
}
export type AiAnalysisType =
  | "video-summary"
  | "channel-diagnosis"
  | "channel-growth"
  | "channel-competition"
  | "keyword-competition";

export const AI_ANALYSIS_TYPES: AiAnalysisType[] = [
  "video-summary",
  "channel-diagnosis",
  "channel-growth",
  "channel-competition",
  "keyword-competition",
];

export interface VideoDigest {
  id: string;
  title: string;
  publishedAt: string;
  channelTitle: string;
  viewCount: number;
  likeCount: number | null;
  commentCount: number | null;
  durationSeconds: number;
  isShort: boolean;
  popularity: number;
  tags: string[];
  description: string;
  channelSubscriberCount: number | null;
}

export interface ChannelDigest {
  title: string;
  handle: string;
  subscriberCount: number | null;
  viewCount: number;
  videoCount: number;
  publishedAt: string;
  averageIntervalHours: number | null;
  sinceLastUploadHours: number | null;
}

export interface ChannelPayload {
  channel: ChannelDigest;
  videos: VideoDigest[];
}

export interface KeywordPayload {
  keyword: string;
  region: string;
  order: string;
  totals: { views: number; likes: number; comments: number };
  channelShare: { title: string; videoCount: number; viewCount: number }[];
  videos: VideoDigest[];
}

export interface PromptBundle {
  system: string;
  user: string;
  /** 영상을 직접 보게 할 때의 공개 YouTube 주소 (Gemini 전용) */
  videoUrl?: string;
  /** 영상을 직접 봤는지, 제목·지표 기반 추정인지 */
  mode: "direct-video" | "data-only";
}

const n = (v: number | null | undefined) => (v === null || v === undefined ? "비공개" : v.toLocaleString("en-US"));

function systemPrompt(year: number, role: string): string {
  return [
    `당신은 ${role}입니다.`,
    `[기준 연도 엄수: 현재 연도는 ${year}년입니다. 모든 연도 표기, 트렌드, 제안은 반드시 ${year}년(당해 연도)을 기준으로 작성하세요. 과거 연도(2023년, 2024년 등)로 퇴행하지 마세요.]`,
    koreaNowRule(),
    "규칙:",
    "- 아래 [제공 데이터]에 있는 숫자와 사실만 근거로 말하세요. 근거가 되는 수치를 문장에 함께 적으세요.",
    "- 제공되지 않은 정보(시청 지속률, 노출수, 클릭률, 수익, 경쟁 채널의 세부 데이터 등)는 추측하지 말고 '확인 불가'라고 쓰세요. 추정이면 '(추정)'을 붙이세요.",
    "- 한국어로, 쉬운 말로 쓰세요. 마크다운만 사용하세요: `## 제목`, `- 목록`, `**굵게**`. 표·코드 블록·HTML은 쓰지 마세요.",
    "- 일반론이나 뻔한 조언 대신, 이 데이터에서만 나올 수 있는 구체적인 내용을 우선하세요.",
  ].join("\n");
}

function videoLine(v: VideoDigest, index: number, withChannel: boolean): string {
  const kind = v.isShort ? "쇼츠(추정)" : "일반";
  const parts = [
    `${index + 1}. "${v.title}"`,
    withChannel ? `채널 ${v.channelTitle}${v.channelSubscriberCount !== null ? `(구독자 ${n(v.channelSubscriberCount)})` : ""}` : "",
    `게시 ${v.publishedAt.slice(0, 10)}`,
    `${kind} ${v.durationSeconds}초`,
    `조회수 ${n(v.viewCount)}`,
    `좋아요 ${n(v.likeCount)}`,
    `댓글 ${n(v.commentCount)}`,
    `인기점수 ${v.popularity.toFixed(1)}`,
    v.tags.length ? `태그 ${v.tags.slice(0, 4).join(",")}` : "",
  ].filter(Boolean);
  return parts.join(" | ");
}

function hoursText(h: number | null): string {
  if (h === null) return "확인 불가";
  return h >= 24 ? `${(h / 24).toFixed(1)}일` : `${h.toFixed(1)}시간`;
}

function channelBlock(c: ChannelDigest): string {
  return [
    `채널명: ${c.title}${c.handle ? ` (${c.handle})` : ""}`,
    `구독자: ${n(c.subscriberCount)} / 총 조회수: ${n(c.viewCount)} / 총 영상 수: ${n(c.videoCount)}`,
    `채널 개설일: ${c.publishedAt ? c.publishedAt.slice(0, 10) : "확인 불가"}`,
    `분석에 쓴 영상 사이의 평균 업로드 간격: ${hoursText(c.averageIntervalHours)} / 마지막 업로드 후 경과: ${hoursText(c.sinceLastUploadHours)}`,
  ].join("\n");
}

const SCOPE_NOTE =
  "※ 영상 목록은 채널 전체가 아니라 최근 업로드 영상만입니다. 인기점수는 이 목록 안에서 조회수 60%·좋아요 25%·댓글 15%를 최고값 대비 0~100으로 환산한 상대 점수입니다. 쇼츠 구분은 길이와 #shorts 표기로 한 추정입니다.";

export function buildPrompt(
  type: AiAnalysisType,
  payload: ChannelPayload | KeywordPayload | VideoDigest,
  options: { year?: number; canWatchVideo?: boolean } = {}
): PromptBundle {
  const year = options.year ?? new Date().getFullYear();

  if (type === "video-summary") {
    const v = payload as VideoDigest;
    const url = `https://www.youtube.com/watch?v=${v.id}`;
    // 영상을 직접 보는 것은 Gemini + 15분 이하 영상으로 제한한다(비용·시간).
    const direct = !!options.canWatchVideo && v.durationSeconds > 0 && v.durationSeconds <= 900;
    const meta = [
      `제목: ${v.title}`,
      `채널: ${v.channelTitle}${v.channelSubscriberCount !== null ? ` (구독자 ${n(v.channelSubscriberCount)})` : ""}`,
      `게시일: ${v.publishedAt.slice(0, 10)} / 길이: ${v.durationSeconds}초 / ${v.isShort ? "쇼츠(추정)" : "일반 영상"}`,
      `조회수 ${n(v.viewCount)} / 좋아요 ${n(v.likeCount)} / 댓글 ${n(v.commentCount)}`,
      v.tags.length ? `태그: ${v.tags.join(", ")}` : "",
      `설명(앞부분): ${v.description || "없음"}`,
    ]
      .filter(Boolean)
      .join("\n");
    const headings = direct
      ? "## 한 줄 요약\n## 핵심 내용 (시간 순서로 5~8개)\n## 도입 3초 훅\n## 이 영상이 잘 된 이유\n## 내 채널에 활용할 아이디어"
      : "## 한 줄 요약(추정)\n## 제목·설명으로 짐작되는 내용\n## 이 영상이 잘 된 이유(추정)\n## 내 채널에 활용할 아이디어";
    return {
      mode: direct ? "direct-video" : "data-only",
      videoUrl: direct ? url : undefined,
      system: systemPrompt(year, "유튜브 영상을 분석해 요약하고 벤치마킹 포인트를 알려주는 전문가"),
      user: [
        direct
          ? "첨부된 영상을 직접 보고 요약하세요. 영상에서 실제로 보이고 들리는 내용만 근거로 하세요."
          : "영상을 직접 볼 수 없습니다. 아래 제목·설명·지표만으로 요약하되, 모든 내용은 영상을 보지 않은 추정이라고 첫 줄에 분명히 밝히세요.",
        "",
        "[제공 데이터]",
        meta,
        "",
        "다음 제목 순서대로 작성하세요:",
        headings,
      ].join("\n"),
    };
  }

  if (type === "keyword-competition") {
    const p = payload as KeywordPayload;
    const share = p.channelShare
      .slice(0, 10)
      .map((c, i) => `${i + 1}. ${c.title} — 영상 ${c.videoCount}개, 조회수 합계 ${n(c.viewCount)}`)
      .join("\n");
    return {
      mode: "data-only",
      system: systemPrompt(year, "키워드 시장의 경쟁 구도를 분석하고 진입 전략을 제안하는 유튜브 전략가"),
      user: [
        "[제공 데이터]",
        `검색 키워드: ${p.keyword} / 검색 지역: ${p.region} / 검색 기준: ${p.order}`,
        `검색된 영상 ${p.videos.length}개의 합계 — 조회수 ${n(p.totals.views)}, 좋아요 ${n(p.totals.likes)}, 댓글 ${n(p.totals.comments)}`,
        "",
        "[채널별 조회수 점유(상위 10개)]",
        share || "없음",
        "",
        "[상위 영상 목록]",
        p.videos.slice(0, 30).map((v, i) => videoLine(v, i, true)).join("\n"),
        "",
        "※ 검색 결과 영상만 본 것이며 키워드 전체 시장이 아닙니다. 쇼츠 구분은 추정입니다.",
        "",
        "다음 제목 순서대로 작성하세요:",
        "## 시장 개요\n## 상위 경쟁 채널 분석\n## 상위 영상의 공통 패턴 (제목·길이·포맷)\n## 진입 전략 (틈새 제안 3가지)\n## 주의할 점과 확인 불가 항목",
      ].join("\n"),
    };
  }

  const p = payload as ChannelPayload;
  const body = [
    "[제공 데이터]",
    channelBlock(p.channel),
    "",
    `[최근 영상 ${p.videos.length}개]`,
    p.videos.slice(0, 60).map((v, i) => videoLine(v, i, false)).join("\n"),
    "",
    SCOPE_NOTE,
  ];

  if (type === "channel-diagnosis") {
    return {
      mode: "data-only",
      system: systemPrompt(year, "유튜브 채널을 진단하고 컨설팅하는 전문 컨설턴트"),
      user: [
        ...body,
        "",
        "이 채널을 진단하고 컨설팅하세요. 다음 제목 순서대로 작성하세요:",
        "## 한눈에 보는 진단 (3줄)\n## 강점\n## 약점과 위험 신호\n## 우선순위 개선 과제 (3~5개, 각각 근거 수치 포함)\n## 다음 4주 실행 계획\n## 확인 불가 항목 (더 알아야 정확해지는 것)",
      ].join("\n"),
    };
  }

  if (type === "channel-growth") {
    return {
      mode: "data-only",
      system: systemPrompt(year, "채널의 성장 과정을 시간 순서로 해석하는 유튜브 성장 분석가"),
      user: [
        ...body,
        "",
        "게시일 순서로 이 채널의 성장 과정을 분석하세요. 데이터에 없는 구독자 추이는 말하지 말고, 영상 성과 변화만으로 설명하세요. 다음 제목 순서대로 작성하세요:",
        "## 성장 단계 구분 (영상 게시 시기 기준)\n## 성과가 튄 시점과 공통점\n## 업로드 빈도와 포맷(쇼츠/일반) 변화\n## 성장을 가로막은 구간과 근거\n## 앞으로 3개월 제안",
      ].join("\n"),
    };
  }

  // channel-competition
  return {
    mode: "data-only",
    system: systemPrompt(year, "채널의 경쟁 우위와 차별화 전략을 제안하는 유튜브 전략가"),
    user: [
      ...body,
      "",
      "경쟁 채널의 데이터는 제공되지 않았습니다. 이 채널 데이터만으로 말할 수 있는 포지셔닝과 차별화 전략을 제안하고, 경쟁 비교에 필요한 추가 데이터는 '확인 불가'로 표시하세요. 다음 제목 순서대로 작성하세요:",
      "## 포지셔닝 요약 (이 채널 데이터 기준)\n## 잘 먹히는 주제와 포맷 (상위 영상 패턴)\n## 차별화 전략 제안\n## 경쟁 비교를 위해 더 필요한 데이터",
    ].join("\n"),
  };
}
