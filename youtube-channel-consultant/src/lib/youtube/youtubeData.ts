/**
 * 유튜브 조회 공용 기준 코드 — YouTube Data API v3 읽기 호출·오류 안내·할당량 계산 (2026-10-17).
 *
 * ⚠️ 공용 기준 코드(docs/SHARED_MODULES.md, 모듈 id: youtube-data-client).
 *   - 기준(여기만 고친다): youtube-channel-consultant/src/lib/youtube/youtubeData.ts
 *   - 사본(직접 고치지 않는다): docs/SHARED_MODULES.md §3 표와 scripts/check-shared-modules.mjs 목록 참고
 *   기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`로 사본에 반영하고, 사본을 쓰는 프로그램도 빌드·배포·버전 +0.01.
 *
 * 범위: 회원 본인 API 키로 정보를 "읽는" 호출만(search·videos·channels·playlistItems·commentThreads 등).
 *       업로드·댓글 쓰기 같은 로그인 연동(OAuth) 호출은 대상이 아니다.
 * 안정성 장치: ① 15초 시간 제한 ② 서버 오류(5xx)·네트워크 끊김·시간 초과에만 1회 재시도(키·한도·요청 오류는 재시도 안 함)
 *             ③ 오류 문구에서 키 가리기 ④ 일일 한도 소진과 분당 호출 제한을 구분해 안내 ⑤ 한도 초기화 시각을 서머타임에 맞춰 계산.
 * 각 프로그램은 이 파일의 오류(YouTubeDataError)를 자기 오류 형식으로 바꿔 써도 된다(code·status·message 유지).
 * 프로그램 고유 코드(server-only, 회원 키 읽기, 화면 문구)는 여기에 넣지 않는다.
 */

export const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/** 호출 1회당 할당량(유닛). 공식 표 기준 — 목록에 없는 읽기 호출은 1유닛. */
export const YOUTUBE_UNITS: Record<string, number> = {
  search: 100,
  videos: 1,
  channels: 1,
  playlistItems: 1,
  playlists: 1,
  commentThreads: 1,
  comments: 1,
  videoCategories: 1,
};

export type YouTubeErrorCode =
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "INVALID_KEY"
  | "API_NOT_ENABLED"
  | "KEY_RESTRICTED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "TIMEOUT"
  | "NETWORK"
  | "SERVER_ERROR"
  | "UNKNOWN";

export class YouTubeDataError extends Error {
  readonly code: YouTubeErrorCode;
  readonly status: number;
  /** YouTube가 알려 준 원래 사유(reason) — 기록·진단용 */
  readonly reason: string;
  /** 회원이 키를 바꾸거나 설정해야 하는 오류 */
  readonly keyProblem: boolean;
  constructor(message: string, code: YouTubeErrorCode, status: number, reason = "") {
    super(message);
    this.name = "YouTubeDataError";
    this.code = code;
    this.status = status;
    this.reason = reason;
    this.keyProblem = code === "INVALID_KEY" || code === "API_NOT_ENABLED" || code === "KEY_RESTRICTED";
  }
}

/** 할당량 사용량 계산기(요청 1건마다 하나씩 만든다). 실패한 호출도 YouTube가 할당량을 차감하므로 보낸 호출을 모두 센다. */
export class QuotaMeter {
  used = 0;
  add(units: number) {
    this.used += units;
  }
}

/** 오류 문구·로그에 키가 섞이지 않게 가린다. */
export function maskApiKey(text: string): string {
  return String(text ?? "")
    .replace(/([?&]key=)[^&\s"']+/gi, "$1***")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "AIza***");
}

/** 일일 한도 초기화 시각(미국 태평양 자정)을 한국 시간으로 — 서머타임이면 오후 4시, 아니면 오후 5시. */
export function quotaResetKstText(now: Date = new Date()): string {
  const la = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" }).format(now);
  const dst = /PDT/.test(la);
  return dst ? "한국 시간 오후 4시" : "한국 시간 오후 5시";
}

interface ApiErrorBody {
  error?: { message?: string; errors?: { reason?: string; message?: string }[] };
}

/** YouTube 오류 응답을 회원이 이해할 수 있는 한국어 오류로 바꾼다(순수 함수). */
export function toYouTubeDataError(status: number, body: unknown, now: Date = new Date()): YouTubeDataError {
  const err = (body as ApiErrorBody | null)?.error;
  const reason = err?.errors?.[0]?.reason ?? "";
  const raw = maskApiKey(err?.message ?? "");
  const lower = raw.toLowerCase();

  if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
    return new YouTubeDataError(
      `등록하신 YouTube API 키의 일일 사용 한도(기본 10,000유닛)를 모두 썼습니다. 한도는 매일 ${quotaResetKstText(now)}(미국 태평양 자정)에 초기화됩니다. 검색 1회는 약 100유닛을 씁니다.`,
      "QUOTA_EXCEEDED",
      429,
      reason
    );
  }
  if (reason === "rateLimitExceeded" || reason === "userRateLimitExceeded" || status === 429) {
    return new YouTubeDataError(
      "YouTube API 호출이 짧은 시간에 너무 많았습니다. 1~2분 뒤 다시 시도해 주세요(일일 한도와는 별개입니다).",
      "RATE_LIMITED",
      429,
      reason
    );
  }
  if (reason === "keyInvalid" || reason === "API_KEY_INVALID" || (status === 400 && lower.includes("api key not valid"))) {
    return new YouTubeDataError(
      "유효하지 않은 YouTube API 키입니다. [API키등록·플랫폼연동]에서 Google Cloud 콘솔에 발급된 키를 다시 확인해 주세요.",
      "INVALID_KEY",
      401,
      reason
    );
  }
  if (reason === "accessNotConfigured" || lower.includes("has not been used in project") || lower.includes("is disabled")) {
    return new YouTubeDataError(
      "이 키의 Google Cloud 프로젝트에서 'YouTube Data API v3'가 사용 설정되지 않았습니다. 콘솔의 [API 및 서비스]에서 사용 설정(Enable)해 주세요.",
      "API_NOT_ENABLED",
      403,
      reason
    );
  }
  if (
    reason === "ipRefererBlocked" ||
    reason.startsWith("API_KEY_") ||
    lower.includes("referer") ||
    lower.includes("requests from this") ||
    lower.includes("are blocked")
  ) {
    return new YouTubeDataError(
      "이 YouTube API 키에 사용 제한(웹사이트·IP·앱 제한)이 걸려 있어 서버에서 호출할 수 없습니다. Google Cloud 콘솔의 키 설정에서 '애플리케이션 제한사항'을 '없음'으로 바꾸고, API 제한에 YouTube Data API v3가 포함됐는지 확인해 주세요.",
      "KEY_RESTRICTED",
      403,
      reason
    );
  }
  if (status === 403) {
    return new YouTubeDataError(raw || "YouTube가 이 요청을 거부했습니다(권한 없음).", "FORBIDDEN", 403, reason);
  }
  if (status === 404) {
    return new YouTubeDataError(raw || "요청한 영상·채널을 찾을 수 없습니다.", "NOT_FOUND", 404, reason);
  }
  if (status === 400) {
    return new YouTubeDataError(raw || "YouTube 요청 형식이 올바르지 않습니다.", "BAD_REQUEST", 400, reason);
  }
  if (status >= 500) {
    return new YouTubeDataError("YouTube 서버가 일시적으로 응답하지 않습니다. 잠시 뒤 다시 시도해 주세요.", "SERVER_ERROR", 502, reason);
  }
  return new YouTubeDataError(raw || `YouTube API 요청에 실패했습니다. (${status})`, "UNKNOWN", status || 500, reason);
}

export interface YouTubeRequestOptions {
  /** 할당량 계산기(선택). 보낸 호출마다 units만큼 더한다(재시도 포함). */
  meter?: QuotaMeter;
  /** 이 호출의 유닛. 비우면 YOUTUBE_UNITS 표 값(없으면 1). */
  units?: number;
  /** 시간 제한(ms). 기본 15초 */
  timeoutMs?: number;
  /** 일시 오류 재시도 횟수. 기본 1 */
  retries?: number;
  /**
   * 같은 요청을 이 시간(초) 동안 재사용(Next.js 데이터 캐시). 회원 할당량을 아끼려고 원래 캐시를 쓰던 호출만 지정한다.
   * 요청 주소에 회원 키가 들어 있어 다른 회원과 섞이지 않는다. 비우면 저장하지 않음(no-store).
   */
  revalidateSeconds?: number;
  /** 테스트용 fetch 바꿔 끼우기 */
  fetchImpl?: typeof fetch;
  /** 테스트용 대기 함수 */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * YouTube Data API 읽기 호출 1회. 성공하면 응답 JSON, 실패하면 YouTubeDataError를 던진다.
 * 기본은 저장하지 않음(no-store). revalidateSeconds를 주면 그 시간 동안 같은 요청을 재사용한다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube 응답 원본(필요한 칸은 호출하는 쪽에서 읽음)
export async function youtubeRequest(endpoint: string, query: Record<string, string>, apiKey: string, options: YouTubeRequestOptions = {}): Promise<any> {
  const { meter, timeoutMs = 15_000, retries = 1, fetchImpl = fetch, sleep = defaultSleep, revalidateSeconds } = options;
  const units = options.units ?? YOUTUBE_UNITS[endpoint] ?? 1;
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey);

  let lastError: YouTubeDataError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(800 * attempt);
    meter?.add(units);
    let res: Response;
    try {
      const cacheInit = revalidateSeconds ? { next: { revalidate: revalidateSeconds } } : { cache: "no-store" as const };
      res = await fetchImpl(url.toString(), { ...cacheInit, signal: AbortSignal.timeout(timeoutMs) } as RequestInit);
    } catch (e) {
      const timedOut = (e as { name?: string })?.name === "TimeoutError" || (e as { name?: string })?.name === "AbortError";
      lastError = timedOut
        ? new YouTubeDataError(`YouTube 응답이 ${Math.round(timeoutMs / 1000)}초 안에 오지 않았습니다. 잠시 뒤 다시 시도해 주세요.`, "TIMEOUT", 504)
        : new YouTubeDataError("YouTube 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", "NETWORK", 502);
      continue; // 시간 초과·네트워크 끊김은 재시도
    }
    const data = await res.json().catch(() => null);
    if (res.ok) return data ?? {};
    const error = toYouTubeDataError(res.status, data);
    if (error.code !== "SERVER_ERROR") throw error; // 키·한도·요청 오류는 재시도해도 같다
    lastError = error;
  }
  throw lastError ?? new YouTubeDataError("YouTube API 요청에 실패했습니다.", "UNKNOWN", 500);
}

/** 영상 상세를 50개씩 나눠 조회(50개당 1유닛). 결과는 id → 원본 항목. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube 응답 원본
export async function fetchVideosByIds(ids: string[], apiKey: string, part: string, options: YouTubeRequestOptions = {}): Promise<Map<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube 응답 원본
  const map = new Map<string, any>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  for (let i = 0; i < unique.length; i += 50) {
    const data = await youtubeRequest("videos", { part, id: unique.slice(i, i + 50).join(",") }, apiKey, options);
    for (const item of data?.items ?? []) map.set(item.id, item);
  }
  return map;
}

/** 채널 상세를 50개씩 나눠 조회(50개당 1유닛). 결과는 id → 원본 항목. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube 응답 원본
export async function fetchChannelsByIds(ids: string[], apiKey: string, part: string, options: YouTubeRequestOptions = {}): Promise<Map<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube 응답 원본
  const map = new Map<string, any>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  for (let i = 0; i < unique.length; i += 50) {
    const data = await youtubeRequest("channels", { part, id: unique.slice(i, i + 50).join(",") }, apiKey, options);
    for (const item of data?.items ?? []) map.set(item.id, item);
  }
  return map;
}
