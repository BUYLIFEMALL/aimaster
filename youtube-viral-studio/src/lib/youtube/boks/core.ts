/**
 * 떡상 판정·결과 거르기·시장 분석 순수 함수 (네트워크 없음).
 *
 * 출처: boks-youtube-finder (https://github.com/boksajang/boks-youtube-finder, 커밋 3aacecf)
 *       services/youtube.js — computeChannelBaseline, buildVideos(판정 부분), relevanceIssue, languageMismatch,
 *       isReligious/isReligiousQuery, computeMarketAnalytics, extractTitleKeywords, calculatePublishedRange, 서식 함수
 *       MIT License © 2026 복사장 (Boksajang) — 전문은 youtube-viral-studio/NOTICE.md
 * 이식: 2026-11-16 영상 담당(claude-win-video), 원본 로직을 그대로 TypeScript로 옮김(값·문구 동일).
 * 네트워크 호출(search.ts)은 AIMaster 공용 기준 코드 youtubeData.ts를 거친다.
 * 이 파일은 Node 시험(node --test)에서 바로 읽히도록 타입만 쓰고 server-only를 넣지 않는다.
 */

// YouTube Shorts 최대 길이(2024-10 이후 3분). API에 쇼츠 여부 필드가 없어 길이로 추정한다.
export const SHORTS_MAX_SEC = 180;
export const SMALL_CHANNEL_MAX_SUBS = 20000;
export const OUTLIER_RATIO = 3.0;
// 떡상 판정 최소 조회수: 구독자 1명·조회수 104회 같은 소규모 노이즈가 "104배"로 잡히는 것을 막는다
export const MIN_OUTLIER_VIEWS = 10000;

// 채널 평소 조회수(메인 지표) = 같은 형식(쇼츠/롱폼) 최근 영상 조회수의 중앙값
export const BASELINE_FETCH_PER_CHANNEL = 30; // 업로드 목록에서 가져올 최근 영상 수
export const BASELINE_SAMPLE_MAX = 15; // 중앙값 계산에 쓰는 최근 영상 수
export const BASELINE_SAMPLE_MIN = 5; // 이보다 적으면 구독자 대비 배수로 대신(추정)
export const BASELINE_MIN_AGE_MS = 48 * 3600 * 1000; // 막 올라와 조회수가 쌓이는 중인 영상 제외
export const BASELINE_FLOOR = 1000; // 평소 조회수가 아주 낮은 채널의 배수 과장을 막는 하한
const AUTO_TOPIC_RE = /\s-\sTopic$/; // YouTube 자동 생성 음악 채널

// 영상에 붙는 카테고리 이름(카테고리 ID는 전 세계 공통)
export const CATEGORY_NAMES: Record<string, string> = {
  "1": "영화/애니메이션", "2": "자동차", "10": "음악", "15": "반려동물/동물", "17": "스포츠",
  "18": "단편 영화", "19": "여행/이벤트", "20": "게임", "21": "동영상 블로그", "22": "인물/블로그",
  "23": "코미디", "24": "엔터테인먼트", "25": "뉴스/정치", "26": "노하우/스타일", "27": "교육",
  "28": "과학기술", "29": "비영리/사회운동", "30": "영화", "31": "애니메이션", "32": "액션/모험",
  "33": "고전", "34": "코미디", "35": "다큐멘터리", "36": "드라마", "37": "가족", "38": "외국",
  "39": "공포", "40": "공상과학/판타지", "41": "스릴러", "42": "단편", "43": "프로그램", "44": "예고편",
};

export type ExcludeReason = "live" | "format" | "spam" | "language" | "offtopic" | "religion";
export type FinderFormat = "all" | "long" | "shorts";
export type ScoreBasis = "baseline" | "subs" | null;

/** 업로드 통계 한 줄 = [videoId, 조회수|null, 길이(초), 게시 시각(ms)] */
export type UploadRow = [string, number | null, number, number];

/** videos.list 항목을 정리한 내부 영상 형식(원본 mapVideoItem) */
export interface RawFinderVideo {
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  categoryId: string;
  publishedAt: string;
  thumbnails: Record<string, { url?: string } | undefined>;
  liveBroadcastContent: string;
  tags: string[];
  defaultAudioLanguage: string;
  defaultLanguage: string;
  durationSec: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isShorts?: boolean;
}

/** 화면·AI에 넘기는 분석 영상 */
export interface FinderVideo {
  id: string;
  url: string;
  title: string;
  channelId: string;
  channelTitle: string;
  categoryId: string;
  categoryName: string;
  publishedAt: string;
  publishedAtRelative: string;
  thumbnail: string;
  durationSec: number;
  durationFormatted: string;
  isShorts: boolean;
  viewCount: number;
  viewCountFormatted: string;
  subscriberCount: number | null;
  subscriberCountFormatted: string;
  likeCount: number;
  commentCount: number;
  likeRate: number | null;
  commentRate: number | null;
  score: number | null;
  scoreFormatted: string;
  scoreBasis: ScoreBasis;
  channelBaseline: number | null;
  channelBaselineFormatted: string;
  baselineSampleSize: number;
  subsRatio: number | null;
  subsRatioFormatted: string;
  qualifies: boolean;
  viewsPerDay: number;
  viewsPerDayFormatted: string;
  tags: string[];
}

export const round1 = (x: number) => Math.round(x * 10) / 10;

// --- 평소 조회수 ---

/**
 * 채널 평소 조회수: 후보 영상 자신·48시간 미만·길이 0(라이브/예정) 영상을 빼고
 * 같은 형식(쇼츠 ≤180초 / 롱폼)의 최근 최대 15개 조회수 중앙값. 표본이 5개 미만이면 null.
 */
export function computeChannelBaseline(
  uploads: unknown,
  { videoId, isShorts, now = Date.now() }: { videoId: string; isShorts: boolean; now?: number }
): { median: number; sampleSize: number } | null {
  if (!Array.isArray(uploads) || uploads.length === 0) return null;
  const sample = (uploads as unknown[])
    .filter((u): u is UploadRow => Array.isArray(u) && u.length === 4)
    .filter(([id, views, dur, pub]) =>
      id !== videoId &&
      typeof views === "number" &&
      dur > 0 &&
      (dur <= SHORTS_MAX_SEC) === isShorts &&
      Number.isFinite(pub) && now - pub >= BASELINE_MIN_AGE_MS)
    .sort((a, b) => b[3] - a[3])
    .slice(0, BASELINE_SAMPLE_MAX)
    .map((u) => u[1] as number)
    .sort((a, b) => a - b);
  if (sample.length < BASELINE_SAMPLE_MIN) return null;
  const mid = Math.floor(sample.length / 2);
  const median = sample.length % 2 ? sample[mid] : Math.round((sample[mid - 1] + sample[mid]) / 2);
  return { median, sampleSize: sample.length };
}

/**
 * 거르기를 통과한 영상 하나에 채널 구독자·평소 조회수를 붙여 떡상 지표를 계산한다(원본 buildVideos의 영상별 부분).
 * uploads: 이 채널의 업로드 통계(없으면 null), asOf: 그 통계를 모은 시각(48시간 경과 판정 기준)
 */
export function buildFinderVideo(
  id: string,
  v: RawFinderVideo,
  subscriberCount: number | null,
  channelUploads: { asOf: number; uploads: UploadRow[] } | null,
  now: number = Date.now()
): FinderVideo {
  const viewCount = v.viewCount;
  const subsRatio = subscriberCount && subscriberCount > 0 ? round1(viewCount / subscriberCount) : null;

  const publishedAt = new Date(v.publishedAt);
  const ageDays = Math.max(1, (now - publishedAt.getTime()) / 86400000);
  const viewsPerDay = Number.isFinite(ageDays) ? Math.round(viewCount / ageDays) : 0;
  const isShorts = !!v.isShorts;

  // 메인 지표: 같은 채널·같은 형식의 최근 영상 중앙값 대비 배수
  const base = channelUploads ? computeChannelBaseline(channelUploads.uploads, { videoId: id, isShorts, now: channelUploads.asOf }) : null;
  const baselineRatio = base ? round1(viewCount / Math.max(base.median, BASELINE_FLOOR)) : null;
  // 평소 조회수를 모를 때의 추정 배수에도 같은 하한(1,000)을 둔다. 자동 음악 채널("- Topic")은 추정하지 않는다
  const autoChannel = AUTO_TOPIC_RE.test(v.channelTitle || "");
  const subsScore = subsRatio !== null && !autoChannel && subscriberCount !== null ? round1(viewCount / Math.max(subscriberCount, BASELINE_FLOOR)) : null;
  const score = baselineRatio !== null ? baselineRatio : subsScore;
  const scoreBasis: ScoreBasis = baselineRatio !== null ? "baseline" : subsScore !== null ? "subs" : null;

  return {
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: v.title,
    channelId: v.channelId,
    channelTitle: v.channelTitle,
    categoryId: v.categoryId,
    categoryName: CATEGORY_NAMES[v.categoryId] || "기타",
    publishedAt: v.publishedAt,
    publishedAtRelative: formatRelativeTime(publishedAt, now),
    thumbnail: pickThumbnail(v.thumbnails),
    durationSec: v.durationSec,
    durationFormatted: formatDuration(v.durationSec),
    isShorts,
    viewCount,
    viewCountFormatted: formatNumber(viewCount),
    subscriberCount,
    subscriberCountFormatted: subscriberCount === null ? "비공개" : formatNumber(subscriberCount),
    likeCount: v.likeCount,
    commentCount: v.commentCount,
    // 반응도(%): 좋아요·댓글이 비공개면 0으로 오므로 조회수가 있을 때만 계산
    likeRate: viewCount > 0 && v.likeCount > 0 ? Math.round((v.likeCount / viewCount) * 10000) / 100 : null,
    commentRate: viewCount > 0 && v.commentCount > 0 ? Math.round((v.commentCount / viewCount) * 100000) / 1000 : null,
    score,
    scoreFormatted: formatMultiplier(score),
    scoreBasis,
    channelBaseline: base ? base.median : null,
    channelBaselineFormatted: base ? formatNumber(base.median) : "-",
    baselineSampleSize: base ? base.sampleSize : 0,
    subsRatio,
    subsRatioFormatted: formatMultiplier(subsRatio),
    qualifies: score !== null && viewCount >= MIN_OUTLIER_VIEWS,
    viewsPerDay,
    viewsPerDayFormatted: formatNumber(viewsPerDay),
    tags: v.tags,
  };
}

export const isOutlierVideo = (v: { qualifies?: boolean; score: number | null }) =>
  !!v.qualifies && typeof v.score === "number" && v.score >= OUTLIER_RATIO;

// --- 관련성 거르기 ---
// YouTube 검색은 제목·설명에 키워드를 해시태그로 도배한 해외 스팸 쇼츠까지 돌려준다.

const HASHTAG_RE = /#[^\s#]+/gu;
const HANGUL_RE = /[ㄱ-ㆎ가-힣]/gu;
const hangulCount = (s: string) => (String(s || "").match(HANGUL_RE) || []).length;

function stripHashtags(s: string) {
  return String(s || "").replace(HASHTAG_RE, " ");
}

function compact(s: string) {
  return String(s || "").toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, "");
}

// 언어별 문자 판정. 라틴 문자 언어(영어·스페인어 등)끼리는 글자로 구분할 수 없어 '라틴 문자 위주인지'만 본다.
const SCRIPT_RE: Record<string, RegExp> = {
  hangul: HANGUL_RE,
  kana: /[\p{Script=Hiragana}\p{Script=Katakana}]/gu,
  han: /\p{Script=Han}/gu,
  thai: /\p{Script=Thai}/gu,
  devanagari: /\p{Script=Devanagari}/gu,
  cyrillic: /\p{Script=Cyrillic}/gu,
  arabic: /\p{Script=Arabic}/gu,
  latin: /\p{Script=Latin}/gu,
};
const scriptCount = (s: string, key: string) => (String(s || "").match(SCRIPT_RE[key]) || []).length;
const LANG_SCRIPT: Record<string, string> = { ko: "hangul", ja: "kana", zh: "han", th: "thai", hi: "devanagari", ru: "cyrillic", ar: "arabic" };

type RelevanceInput = Pick<RawFinderVideo, "title" | "channelTitle" | "description" | "tags" | "defaultAudioLanguage" | "defaultLanguage">;

/**
 * 선택한 언어의 영상이 아니면 true.
 * 1) 영상의 음성·기본 언어가 선택 언어와 같으면 통과
 * 2) 제목(해시태그 제외)·채널명과 설명 앞부분에 그 언어의 글자가 거의 없으면 다른 언어
 */
export function languageMismatch(v: Partial<RelevanceInput>, lang: string, core: string, channelTitle: string, description: string): boolean {
  const base = String(lang || "").split("-")[0].toLowerCase();
  if (!base) return false;
  const declared = String(v.defaultAudioLanguage || v.defaultLanguage || "").split("-")[0].toLowerCase();
  if (declared && declared === base) return false;
  const head = core + " " + channelTitle;
  const desc = stripHashtags(description.slice(0, 400));
  const tags = (v.tags || []).join(" ");
  const script = LANG_SCRIPT[base];
  if (script) {
    // 태그에 그 언어 글자가 충분하면 같은 언어로 본다(제목·채널명이 영어인 K-pop 뮤직비디오 등)
    if (scriptCount(tags, script) >= 4) return false;
    // 중국어는 한자가 있어도 가나가 섞이면 일본어로 본다
    if (base === "zh" && scriptCount(head, "kana") >= 2) return true;
    // 일본어 제목은 한자만으로 이뤄지기도 한다. 가나가 한 글자라도 있거나, 설명이 비어 판단 근거가 없을 때 한자 제목이면 통과
    if (base === "ja") {
      if (scriptCount(head, "kana") >= 1 || scriptCount(desc, "kana") >= 10) return false;
      return !(scriptCount(head, "han") >= 2 && scriptCount(head, "hangul") === 0 && !desc.trim());
    }
    return scriptCount(head, script) < 2 && scriptCount(desc, script) < 10;
  }
  // 라틴 문자 언어: 제목·채널명과 설명 모두 라틴 문자보다 다른 문자가 많으면 다른 언어
  const nonLatin = (s: string) => ["hangul", "kana", "han", "thai", "devanagari", "cyrillic", "arabic"].reduce((n, k) => n + scriptCount(s, k), 0);
  return nonLatin(head) > scriptCount(head, "latin") && nonLatin(desc) >= scriptCount(desc, "latin");
}

/** @returns null(통과) | 'spam'(해시태그 도배) | 'language'(다른 언어) | 'offtopic'(키워드 무관) */
export function relevanceIssue(v: Partial<RelevanceInput>, query: string, relevanceLanguage = "ko", langOnly = true): null | "spam" | "language" | "offtopic" {
  // 분해형(NFD) 한글도 같은 글자로 보도록 먼저 정규화
  const title = String(v.title || "").normalize("NFC");
  const channelTitle = String(v.channelTitle || "").normalize("NFC");
  const description = String(v.description || "").normalize("NFC");
  query = String(query || "").normalize("NFC");
  const q = compact(query);
  const words = query.split(/\s+/).map(compact).filter((w) => w.length > 0);
  const base = String(relevanceLanguage || "").split("-")[0].toLowerCase();
  const titleC = compact(title);
  // 키워드 없이 찾은 경우(인기 영상 탐색)는 제목에 키워드가 있는 것으로 본다
  const titleHasQuery = !q || titleC.includes(q) || words.some((w) => w.length >= 2 && titleC.includes(w));

  // #shorts·#쇼츠 같은 형식 표시 해시태그는 도배로 세지 않는다
  const tagsInTitle = (title.match(HASHTAG_RE) || []).filter((t) => !/^#(shorts?|쇼츠|숏츠)$/i.test(t));
  const core = stripHashtags(title);
  const coreLetters = (core.match(/[\p{L}\p{N}]/gu) || []).length;
  // 1) 해시태그 도배: 제목에 해시태그 5개 이상, 또는 해시태그를 빼면 글자가 거의 없는 제목
  if (coreLetters < 3 && tagsInTitle.length >= 2) return "spam";
  const coreOk = base === "ko" ? hangulCount(core) >= 2 : coreLetters >= 6;
  if (tagsInTitle.length >= 5 && !(coreOk && titleHasQuery)) return "spam";

  // 2) 언어
  if (langOnly && languageMismatch(v, relevanceLanguage, core, channelTitle, description)) return "language";

  // 3) 키워드: 제목·태그·설명·채널명 어디에도 키워드(띄어쓰기 무시)가 없으면 무관한 영상
  if (!q) return null;
  const hay = compact(title + " " + (v.tags || []).join(" ") + " " + description + " " + channelTitle);
  if (hay.includes(q)) return null;
  if (words.length > 1) {
    const found = words.filter((w) => hay.includes(w)).length;
    if (found === words.length) return null;
    if (titleHasQuery && found >= Math.ceil(words.length / 2)) return null;
  }
  return "offtopic";
}

// --- 종교 영상 판별(기본 제외) ---
// API에 종교 구분이 없어 글자로 판별한다(100% 정확하지 않음).
//   확실한 단어: 하나만 있어도 종교 영상 / 약한 단어: 서로 다른 단어가 두 개 이상일 때만
const RELIGION_STRONG_KO = ["ccm", "찬양", "찬송", "복음성가", "워십", "예배", "설교", "성경", "교회", "성가대", "큐티", "불경", "염불", "법문", "독경", "천수경", "반야심경", "금강경", "법회", "설법"];
const RELIGION_STRONG_EN = /\b(ccm|worship|hymns?|gospel|sermons?|bible|church|christian|praise\s*(?:&|and)\s*worship)\b/i;
const RELIGION_WEAK_KO = ["하나님", "하느님", "주님", "예수", "그리스도", "할렐루야", "아멘", "은혜", "기도", "말씀", "성령", "십자가", "부처님", "불교", "스님", "목사", "찬미"];
const RELIGION_WEAK_EN = /\b(jesus|christ|god|lord|amen|hallelujah|holy\s*spirit|pray(?:er|ing)?|buddha|buddhist)\b/gi;

function religionHits(text: string) {
  const raw = String(text || "").normalize("NFC");
  const c = compact(raw);
  const strong = RELIGION_STRONG_KO.some((w) => c.includes(w)) || RELIGION_STRONG_EN.test(raw);
  const weak = new Set(RELIGION_WEAK_KO.filter((w) => c.includes(w)));
  for (const m of raw.matchAll(RELIGION_WEAK_EN)) weak.add(m[1].toLowerCase().replace(/\s+/g, ""));
  return { strong, weak: weak.size };
}

/** 검색어 자체가 종교 단어면(예: "찬양 모음") 사용자가 찾으려는 것이므로 빼지 않는다 */
export function isReligiousQuery(query: string): boolean {
  const h = religionHits(query);
  return h.strong || h.weak > 0;
}

export function isReligious(v: Partial<RelevanceInput>): boolean {
  const head = [v.title, v.channelTitle, (v.tags || []).join(" ")].join(" ");
  const h = religionHits(head);
  if (h.strong) return true;
  const all = religionHits(`${head} ${String(v.description || "").slice(0, 300)}`);
  return (all.strong && h.weak > 0) || all.weak >= 2;
}

// --- 시장 분석 ---

export interface TitleKeyword { word: string; count: number; percent: number }

export interface MarketAnalytics {
  knownCount: number;
  sizedCount: number;
  hiddenCount: number;
  baselineCount: number;
  estimatedCount: number;
  outlierCount: number;
  maxMultiplier: number | null;
  maxMultiplierFormatted: string;
  avgViewsFormatted: string;
  topKeywords: TitleKeyword[];
  keywordBasis: "all" | "outliers";
  keywordBasisCount: number;
  minOutlierViews: number;
  opportunityScore: number;
  opportunityLevel: string;
  opportunityTone: "neutral" | "good" | "mid" | "bad";
  opportunityAdvice: string;
  smallChannelShare: number;
  smallChannelCount: number;
  smallOutlierCount: number;
  smallOutlierShare: number;
  medianSubscribersFormatted: string;
}

/**
 * 시장 진입 기회 지수 (0~100)
 *   = 소형 채널(구독 2만 이하) 영상 비중 × 60
 *   + 소형 채널 떡상(조회수 1만 이상 & 평소 대비 3배 이상) 영상 비중 × 2(최대 100%) × 40
 * 채널 규모는 구독자 수로 나누므로 구독자 비공개 채널은 이 계산에서 제외한다.
 */
export function computeMarketAnalytics(videos: FinderVideo[] | null | undefined, query = ""): MarketAnalytics {
  const list = videos || [];
  const known = list.filter((v) => typeof v.score === "number");
  const isOutlier = (v: FinderVideo) => v.qualifies && (v.score as number) >= OUTLIER_RATIO;
  const outliers = known.filter(isOutlier);
  const avgViews = list.length ? Math.round(list.reduce((s, v) => s + v.viewCount, 0) / list.length) : 0;
  const baselineCount = list.filter((v) => v.scoreBasis === "baseline").length;
  const estimatedCount = list.filter((v) => v.scoreBasis === "subs").length;
  const sized = known.filter((v) => typeof v.subscriberCount === "number" && v.subscriberCount > 0);

  // 떡상 영상이 충분하면 그 제목에서, 반복 키워드가 3개 미만이면 전체 제목에서 추출
  let keywordSource = outliers.length >= 5 ? outliers : list;
  let topKeywords = extractTitleKeywords(keywordSource, query);
  if (keywordSource !== list && topKeywords.length < 3) {
    keywordSource = list;
    topKeywords = extractTitleKeywords(list, query);
  }
  const qualified = known.filter((v) => v.qualifies);
  const maxMultiplier = qualified.length ? qualified.reduce((m, v) => Math.max(m, v.score as number), 0) : null;

  const common = {
    knownCount: known.length,
    sizedCount: sized.length,
    hiddenCount: list.length - sized.length,
    baselineCount,
    estimatedCount,
    outlierCount: outliers.length,
    maxMultiplier,
    maxMultiplierFormatted: formatMultiplier(maxMultiplier),
    avgViewsFormatted: formatNumber(avgViews),
    topKeywords,
    keywordBasis: (keywordSource === list ? "all" : "outliers") as "all" | "outliers",
    keywordBasisCount: keywordSource.length,
    minOutlierViews: MIN_OUTLIER_VIEWS,
  };

  if (sized.length === 0) {
    return {
      ...common,
      opportunityScore: 0,
      opportunityLevel: "데이터 부족",
      opportunityTone: "neutral",
      opportunityAdvice: known.length === 0
        ? "채널 평소 조회수와 구독자 수를 확인할 수 있는 영상이 없어 시장을 평가하지 못했습니다."
        : "구독자 수가 공개된 채널이 없어 채널 규모별 시장을 평가하지 못했습니다.",
      smallChannelShare: 0, smallChannelCount: 0, smallOutlierCount: 0, smallOutlierShare: 0,
      medianSubscribersFormatted: "-",
    };
  }

  const small = sized.filter((v) => (v.subscriberCount as number) <= SMALL_CHANNEL_MAX_SUBS);
  const smallOutliers = small.filter(isOutlier);
  const smallShare = small.length / sized.length;
  const smallOutlierShare = smallOutliers.length / sized.length;
  const score = Math.round(Math.min(100, smallShare * 60 + Math.min(1, smallOutlierShare * 2) * 40));

  let level = "경쟁 보통";
  let tone: MarketAnalytics["opportunityTone"] = "mid";
  let advice = "틈새 키워드와 차별화된 썸네일로 충분히 공략할 수 있는 시장입니다.";
  if (score >= 60) {
    level = "기회 높음";
    tone = "good";
    advice = "구독자가 적은 채널도 높은 조회수를 얻고 있습니다. 지금 진입하기 좋은 시장입니다.";
  } else if (score < 30) {
    level = "경쟁 치열";
    tone = "bad";
    advice = "대형 채널이 상위를 차지하고 있습니다. 더 좁은 세부 키워드로 우회 진입을 권장합니다.";
  }

  const subsSorted = sized.map((v) => v.subscriberCount as number).sort((a, b) => a - b);
  const medianSubs = subsSorted[Math.floor(subsSorted.length / 2)];

  return {
    ...common,
    opportunityScore: score,
    opportunityLevel: level,
    opportunityTone: tone,
    opportunityAdvice: advice,
    smallChannelShare: Math.round(smallShare * 100),
    smallChannelCount: small.length,
    smallOutlierCount: smallOutliers.length,
    smallOutlierShare: Math.round(smallOutlierShare * 100),
    medianSubscribersFormatted: formatNumber(medianSubs),
  };
}

// --- 제목 키워드 ---

const STOP_WORDS = new Set([
  // 한국어 일반어·기능어
  "있는", "하는", "없는", "되는", "위한", "대한", "통해", "그냥", "정말", "진짜", "지금", "이거", "이것", "그거", "이런", "그런",
  "모든", "가장", "많이", "너무", "하면", "해서", "하고", "합니다", "입니다", "있습니다", "없습니다", "했습니다", "됩니다",
  "영상", "방법", "이유", "어떻게", "무엇", "뭐가", "것은", "것이", "경우", "오늘", "이번", "우리", "저는", "제가", "내가",
  "쇼츠", "숏츠", "구독", "좋아요", "알림", "설정", "최신판",
  "만에", "하나", "한번", "이제", "바로", "같은", "하기", "하세요", "해야", "해보니", "했더니", "봤습니다", "드립니다", "알려드립니다",
  // 영어 기능어
  "the", "a", "an", "to", "of", "in", "on", "and", "or", "for", "with", "you", "your", "how", "is", "are", "this", "that",
  "my", "i", "it", "its", "be", "from", "at", "by", "what", "why", "shorts", "short", "vs", "ep", "feat",
]);

// 조사·어미 (긴 것부터 검사)
const KO_SUFFIXES = ["에서는", "으로는", "에게서", "이라고", "에서", "으로", "에게", "까지", "부터", "처럼", "보다", "이나", "라고",
  "하는", "하고", "해서", "하면", "이다", "은", "는", "이", "가", "을", "를", "에", "의", "도", "만", "로", "와", "과", "나"];

function normalizeToken(token: string) {
  let t = token.toLowerCase();
  if (/[가-힣]$/.test(t)) {
    for (const suf of KO_SUFFIXES) {
      if (t.length - suf.length >= 2 && t.endsWith(suf)) {
        t = t.slice(0, -suf.length);
        break;
      }
    }
  }
  return t;
}

function tokenize(text: string) {
  return (String(text).match(/[\p{L}\p{N}]+/gu) || []).map(normalizeToken);
}

export function extractTitleKeywords(videos: { title: string }[], query = ""): TitleKeyword[] {
  const queryTokens = new Set(tokenize(query));
  // 검색어를 품은 합성어(예: 검색어 "일상생활" → "일상생활영어")도 새로운 정보가 아니므로 뺀다(한글 토큰만)
  const queryWords = [...queryTokens].filter((q) => q.length >= 2 && /[가-힣]/.test(q));
  const freq = new Map<string, number>();

  for (const v of videos) {
    const unique = new Set(
      tokenize(v.title).filter((w) =>
        w.length >= 2 &&
        !/^\d+$/.test(w) &&
        !STOP_WORDS.has(w) &&
        !queryTokens.has(w) &&
        !queryWords.some((q) => w.includes(q))
      )
    );
    unique.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
  }

  return [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, 8)
    .map(([word, count]) => ({ word, count, percent: Math.round((count / videos.length) * 100) }));
}

// --- 기간 ---

export const PERIOD_DAYS: Record<string, number> = { "24h": 1, "3d": 3, "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
const KST_OFFSET_MS = 9 * 3600 * 1000;

export class FinderRangeError extends Error {
  readonly code = "BAD_RANGE";
}

/** 'YYYY-MM-DD'(한국 시간 날짜) → 그 날 0시의 UTC ms. 형식이 틀리면 null */
export function kstDateStart(str: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ""));
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]) - KST_OFFSET_MS;
  const back = new Date(t + KST_OFFSET_MS);
  return back.getUTCFullYear() === +m[1] && back.getUTCMonth() === +m[2] - 1 && back.getUTCDate() === +m[3] ? t : null;
}

/**
 * 업로드 기간 → search.list publishedAfter/Before.
 * custom: 시작일 0시 ~ 종료일 다음날 0시(한국 시간). 종료일이 미래면 지금까지.
 */
export function calculatePublishedRange(
  period: string,
  customRange: { from?: string; to?: string } | null = null,
  now: number = Date.now()
): { after: string | null; before: string | null } {
  if (period === "custom") {
    const from = kstDateStart(customRange?.from);
    const toStart = kstDateStart(customRange?.to);
    if (from === null || toStart === null || from > toStart) {
      throw new FinderRangeError("직접 지정한 기간이 올바르지 않습니다. 시작일과 종료일을 다시 확인해 주세요.");
    }
    if (from > now) throw new FinderRangeError("시작일이 오늘보다 늦습니다. 기간을 다시 지정해 주세요.");
    const before = Math.min(toStart + 86400000, now);
    return { after: new Date(from).toISOString(), before: new Date(before).toISOString() };
  }
  return PERIOD_DAYS[period]
    ? { after: new Date(now - PERIOD_DAYS[period] * 86400000).toISOString(), before: null }
    : { after: null, before: null };
}

// --- 변환·서식 ---

export function toInt(v: unknown): number {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

// ISO 8601 (P#DT#H#M#S, P0D)
export function parseIsoDuration(str: string | null | undefined): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(str || "");
  if (!m) return 0;
  return toInt(m[1] ?? 0) * 86400 + toInt(m[2] ?? 0) * 3600 + toInt(m[3] ?? 0) * 60 + toInt(m[4] ?? 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube 응답 원본
export function mapVideoItem(v: any): RawFinderVideo {
  const s = v?.snippet || {};
  const st = v?.statistics || {};
  return {
    title: s.title || "",
    description: s.description || "",
    channelId: s.channelId || "",
    channelTitle: s.channelTitle || "",
    categoryId: s.categoryId || "0",
    publishedAt: s.publishedAt,
    thumbnails: s.thumbnails || {},
    liveBroadcastContent: s.liveBroadcastContent || "none",
    tags: Array.isArray(s.tags) ? s.tags : [],
    defaultAudioLanguage: s.defaultAudioLanguage || "",
    defaultLanguage: s.defaultLanguage || "",
    durationSec: parseIsoDuration(v?.contentDetails?.duration),
    viewCount: toInt(st.viewCount),
    likeCount: toInt(st.likeCount),
    commentCount: toInt(st.commentCount),
  };
}

export function pickThumbnail(t: Record<string, { url?: string } | undefined> = {}): string {
  return t.medium?.url || t.high?.url || t.default?.url || "";
}

export function formatDuration(total: number): string {
  if (!total || total <= 0) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatNumber(num: number | null | undefined): string {
  if (!num || num <= 0) return "0";
  if (num >= 100000000) return `${(num / 100000000).toFixed(1).replace(/\.0$/, "")}억`;
  if (num >= 10000) return `${(num / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  return num.toLocaleString("ko-KR");
}

export function formatMultiplier(x: number | null | undefined): string {
  if (x === null || x === undefined) return "-";
  if (x >= 100) return `${Math.round(x).toLocaleString("ko-KR")}배`;
  return `${x.toFixed(1).replace(/\.0$/, "")}배`;
}

export function decodeEntities(s: string | null | undefined): string {
  return String(s || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

export function formatRelativeTime(date: Date, now: number = Date.now()): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const sec = Math.floor((now - date.getTime()) / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}일 전`;
  if (day < 365) return `${Math.min(11, Math.floor(day / 30))}개월 전`;
  return `${Math.floor(day / 365)}년 전`;
}
