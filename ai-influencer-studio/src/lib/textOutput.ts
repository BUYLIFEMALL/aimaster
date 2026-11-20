// 글 생성 입력·응답 검사(순수 함수) — 2026-11-20, CC-SNS-01, 글 모델 선택 2단계.
// 설계: docs/analysis-ai-influencer-20261118/PLAN6_SUPPLEMENT_20261119.md 「R2-상세」 라-1·2·3·5.
// ★ 아직 어느 라우트·화면도 이 파일을 읽지 않는다. 연결은 다음 단계(3사 호출과 함께)다. 지금의 Gemini 경로 동작은 바뀌지 않았다.
// 이 파일은 다른 파일을 불러오지 않는다(선택지 목록은 인자로 받는다) — 서버·화면·시험이 같은 함수를 그대로 쓴다.

/** 회원이 적는 칸 하나의 최대 글자 수. 회원 본인 키의 비용이 한 번에 커지지 않게 호출 전에 거절한다. */
export const TEXT_INPUT_LIMIT = 2000;
/** 인스타 캡션 최대 길이(src/lib/instagram/feedImage.ts의 MAX_INSTA_CAPTION과 같은 값 — 시험이 대조한다) */
export const CAPTION_MAX_CHARS = 2200;
export const CAPTION_COUNT = 3;
export const SCENARIO_MAX = 5;

type Fail = { ok: false; field: string; message: string };

/** 입력 칸 검사: 비어 있으면 통과(필수 여부는 부르는 쪽이 따로 본다), 글자가 아니거나 상한을 넘으면 거절 */
export function checkTextInputs(fields: Record<string, unknown>, limit = TEXT_INPUT_LIMIT): { ok: true } | Fail {
  for (const [field, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") return { ok: false, field, message: "입력 값의 형식이 올바르지 않습니다." };
    if ([...value].length > limit) return { ok: false, field, message: `입력이 너무 깁니다. ${limit.toLocaleString("ko-KR")}자 이내로 줄여 주세요.` };
  }
  return { ok: true };
}

/** 응답이 배열이거나 { [key]: 배열 }이면 그 배열을 꺼낸다(회사마다 맨 바깥 모양이 다를 수 있다) */
function unwrap(raw: unknown, key: string): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>)[key])) return (raw as Record<string, unknown[]>)[key];
  return null;
}

/**
 * 캡션 응답 검사: 빈 글·글자 아닌 값·너무 긴 글을 빼고 앞의 3개. 3개가 안 되면 null(화면에 적용하지 않는다).
 * 길이는 **UTF-16 단위(`.length`)**로 잰다 — 즉시 게시(`api/instagram/publish`)·예약 등록(`api/instagram/posts`)·게시 화면이
 * 이미 `.slice(0, MAX_INSTA_CAPTION)`(UTF-16)으로 자르기 때문에, 여기서 통과한 캡션은 게시 경로에서 잘리지 않는다.
 * (입력 칸 상한 checkTextInputs는 글자(코드 포인트) 단위다 — 둘은 목적이 다르다. 게시 경로는 이번에 바꾸지 않았다.)
 */
export function parseCaptions(raw: unknown): string[] | null {
  const list = unwrap(raw, "captions");
  if (!list) return null;
  const ok = list
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= CAPTION_MAX_CHARS);
  return ok.length >= CAPTION_COUNT ? ok.slice(0, CAPTION_COUNT) : null;
}

type Option = { id: string };
export type ScenarioOptionLists = {
  lightings: Option[];
  cameraGroups: { options: Option[] }[];
  filmStocks: Option[];
  hairStyles: Option[];
  faceStyles: Option[];
  skinTextures: Option[];
};
export type ScenarioOptionSets = Record<"lighting" | "camera" | "filmStock" | "hairStyle" | "faceStyle" | "skin", ReadonlySet<string>>;

/** 화면 선택지 목록(src/data/influencer-options.ts)에서 허용 값 묶음을 만든다 */
export function buildScenarioOptionSets(l: ScenarioOptionLists): ScenarioOptionSets {
  const ids = (xs: Option[]) => new Set(xs.map((x) => x.id));
  return {
    lighting: ids(l.lightings),
    camera: ids(l.cameraGroups.flatMap((g) => g.options)),
    filmStock: ids(l.filmStocks),
    hairStyle: ids(l.hairStyles),
    faceStyle: ids(l.faceStyles),
    skin: ids(l.skinTextures),
  };
}

export type ParsedScenario = {
  id: string; labelKo: string; labelEn: string; story: string; timeOrder: number;
  config: { outfit: string; location: string; expression: string; pose: string; lighting: string; hairStyle: string; faceStyle: string; camera: string; filmStock: string; skin: string[] };
};

/** 글자(코드 포인트) 단위로 자른다 — UTF-16으로 자르면 이모지가 반쪽(외톨이 서로게이트)으로 남는다 */
export function clipChars(s: string, max: number): string {
  let n = 0, end = 0;
  for (const ch of s) {
    if (n === max) break;
    n++; end += ch.length;
  }
  return s.slice(0, end);
}
const str = (v: unknown, max = TEXT_INPUT_LIMIT) => (typeof v === "string" ? clipChars(v.trim(), max) : "");
/** 목록 밖 값은 빈 글로 — 화면(applyScenario)은 빈 값이면 지금 설정을 그대로 둔다 */
const pick = (v: unknown, set: ReadonlySet<string>) => (typeof v === "string" && set.has(v) ? v : "");

/**
 * 기획 응답 검사. 시나리오 하나라도 쓸 수 있으면 최대 5개를, 하나도 없으면 null.
 * 쓸 수 있는 시나리오 = 객체이고 config가 객체이며, 장면을 만드는 글(의상·장소·표정·자세) 가운데 하나 이상이 있다.
 * 선택지 칸(조명·카메라·필름·헤어·얼굴·피부)은 목록 안 값만 남긴다. 번호가 없거나 겹치면 순서로 다시 붙인다.
 */
export function parseScenarios(raw: unknown, sets: ScenarioOptionSets): ParsedScenario[] | null {
  const list = unwrap(raw, "scenarios");
  if (!list) return null;
  const out: ParsedScenario[] = [];
  const seen = new Set<string>();
  // 응답에 적힌 번호 전부(뒤 항목 것 포함) — 새로 붙이는 번호가 뒤 항목의 번호를 빼앗지 않게 한다
  const claimed = new Set<string>();
  for (const item of list) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const raw = str((item as Record<string, unknown>).id, 80);
      if (raw) claimed.add(raw);
    }
  }
  const freshId = (n: number) => {
    for (let k = n; ; k++) {
      const id = `scenario-${k}`;
      if (!seen.has(id) && !claimed.has(id)) return id;
    }
  };
  for (const item of list) {
    if (out.length >= SCENARIO_MAX) break;
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const s = item as Record<string, unknown>;
    const c = s.config;
    if (!c || typeof c !== "object" || Array.isArray(c)) continue;
    const cfg = c as Record<string, unknown>;
    const scene = { outfit: str(cfg.outfit), location: str(cfg.location), expression: str(cfg.expression), pose: str(cfg.pose) };
    if (!scene.outfit && !scene.location && !scene.expression && !scene.pose) continue;
    const n = out.length + 1;
    let id = str(s.id, 80);
    if (!id || seen.has(id)) id = freshId(n);
    seen.add(id);
    const order = typeof s.timeOrder === "number" && Number.isInteger(s.timeOrder) && s.timeOrder >= 1 ? s.timeOrder : n;
    out.push({
      id,
      labelKo: str(s.labelKo, 80) || `장면 ${n}`,
      labelEn: str(s.labelEn, 80),
      story: str(s.story),
      timeOrder: order,
      config: {
        ...scene,
        lighting: pick(cfg.lighting, sets.lighting),
        camera: pick(cfg.camera, sets.camera),
        filmStock: pick(cfg.filmStock, sets.filmStock),
        hairStyle: pick(cfg.hairStyle, sets.hairStyle),
        faceStyle: pick(cfg.faceStyle, sets.faceStyle),
        skin: Array.isArray(cfg.skin) ? [...new Set(cfg.skin.filter((x): x is string => typeof x === "string" && sets.skin.has(x)))] : [],
      },
    });
  }
  return out.length > 0 ? out : null;
}

export type TextFailureKind = "auth" | "quota" | "timeout" | "format" | "other";

/**
 * 구조적 코드 → 종류. **이 표에 있는 코드만** 믿는다(자유 문장 속 낱말로 판정하지 않는다 — 「authentication」 같은 낱말이 다른 오류 문장에 섞여도 흔들리지 않게).
 * 출처: Google API 오류 형식(error.status 문자열·details[].reason) — Gemini는 잘못된 키를 HTTP 400 + reason API_KEY_INVALID로 돌려준다.
 */
const AUTH_CODES = new Set(["UNAUTHENTICATED", "PERMISSION_DENIED", "API_KEY_INVALID", "API_KEY_SERVICE_BLOCKED", "API_KEY_HTTP_REFERRER_BLOCKED", "API_KEY_IP_ADDRESS_BLOCKED"]);
const QUOTA_CODES = new Set(["RESOURCE_EXHAUSTED", "RATE_LIMIT_EXCEEDED"]);
const TIMEOUT_CODES = new Set(["DEADLINE_EXCEEDED"]);

/**
 * 소문자 구조 코드의 제한 별칭 → 인증. **구조 칸(code·type 값, 또는 오류 문장 속 JSON의 "code"·"type" 값)에 정확히 이 글자로 있을 때만** 쓴다.
 * 근거(공개 문서 기준 — 실제 호출로 확인하지 않음): OpenAI 오류 code `invalid_api_key`, Anthropic 오류 type `authentication_error`(401)·`permission_error`(403).
 * 지금 연결된 회사는 Gemini뿐이지만, 회사 선택을 붙일 때 같은 판정을 쓰므로 미리 둔다. 자유 문장 속 낱말은 보지 않는다.
 */
const AUTH_ALIASES = new Set(["invalid_api_key", "authentication_error", "permission_error"]);

/** 구조 칸에서 소문자 코드 값을 모은다: e.code·e.type·e.error.code·e.error.type, 오류 문장 속 JSON의 "code"/"type" 값 */
function structuredLowerCodes(e: Record<string, unknown>, msg: string): Set<string> {
  const out = new Set<string>();
  const inner = e.error && typeof e.error === "object" ? (e.error as Record<string, unknown>) : {};
  for (const v of [e.code, e.type, inner.code, inner.type]) if (typeof v === "string" && /^[a-z_]+$/.test(v)) out.add(v);
  for (const m of msg.matchAll(/"(?:code|type)"\s*:\s*"([a-z_]+)"/g)) out.add(m[1]);
  return out;
}

/** 숫자 상태: 숫자이거나 숫자만 든 글자일 때만 */
function statusNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && /^\d{3}$/.test(v.trim())) return Number(v.trim());
  return null;
}

/** 오류에서 구조적 코드를 모은다: status·code 글자 값, 오류 문장 안 JSON의 "status"·"reason" 값, 그리고 대문자 코드 낱말 */
function structuredCodes(e: Record<string, unknown>, msg: string): Set<string> {
  const codes = new Set<string>();
  for (const v of [e.status, e.code, e.reason]) if (typeof v === "string" && /^[A-Z_]+$/.test(v)) codes.add(v);
  for (const m of msg.matchAll(/"(?:status|reason)"\s*:\s*"([A-Z_]+)"/g)) codes.add(m[1]);
  for (const m of msg.matchAll(/\b([A-Z][A-Z_]{5,})\b/g)) codes.add(m[1]);
  return codes;
}

/**
 * 호출 실패를 회원이 읽을 수 있는 종류로 가른다. 키·인증 문제는 기본 문구로 감추면 안 되는 종류다.
 * 순서: 인증 신호(숫자 401·403 또는 인증 코드)가 하나라도 있으면 auth — 다른 신호보다 먼저 본다(인증 문제를 놓치지 않는 쪽으로 기운다).
 *       그다음 숫자 429·한도 코드 → quota, 숫자 408·504·시간 코드·시간 초과 오류 이름 → timeout, 응답 풀기 실패 → format, 나머지 other.
 */
export function classifyTextFailure(err: unknown): TextFailureKind {
  const e = (err && typeof err === "object" ? err : {}) as Record<string, unknown>;
  const msg = typeof e.message === "string" ? e.message : typeof err === "string" ? err : "";
  const status = statusNumber(e.status) ?? statusNumber(e.code) ?? statusNumber(e.statusCode);
  const codes = structuredCodes(e, msg);
  const has = (set: Set<string>) => [...codes].some((c) => set.has(c));
  const aliasAuth = [...structuredLowerCodes(e, msg)].some((c) => AUTH_ALIASES.has(c));
  if (status === 401 || status === 403 || has(AUTH_CODES) || aliasAuth) return "auth";
  if (status === 429 || has(QUOTA_CODES)) return "quota";
  if (status === 408 || status === 504 || has(TIMEOUT_CODES) || e.name === "AbortError" || e.name === "TimeoutError") return "timeout";
  if (e.name === "SyntaxError" || codes.has("AI_RESPONSE_FORMAT")) return "format";
  return "other";
}

/** 기본 문구로 대신해도 되는 종류(허용 목록). auth는 절대 들어가지 않는다 — 회원이 키를 고쳐야 하므로 오류로 보여 준다 */
const FALLBACK_KINDS: ReadonlySet<TextFailureKind> = new Set<TextFailureKind>(["quota", "timeout", "format", "other"]);
export function allowsCaptionFallback(kind: TextFailureKind): boolean {
  return kind !== "auth" && FALLBACK_KINDS.has(kind);
}

/** 기본 문구로 대신했을 때 화면에 함께 보일 사유 */
export function captionFallbackNotice(kind: TextFailureKind): string {
  const why: Record<TextFailureKind, string> = {
    auth: "API 키 확인에 실패했습니다",
    quota: "API 사용 한도에 걸렸습니다",
    timeout: "AI 응답이 늦어 시간이 초과됐습니다",
    format: "AI 응답 형식을 읽지 못했습니다",
    other: "AI 응답을 받지 못했습니다",
  };
  return `${why[kind]}. 그래서 기본 문구를 넣었습니다. 다시 생성하거나 직접 고쳐 주세요.`;
}

/** 오류로 돌려줄 때의 문장(키 값·원문 오류 글은 담지 않는다) */
export function textFailureMessage(kind: TextFailureKind, providerLabel: string): string {
  switch (kind) {
    case "auth": return `${providerLabel} API 키가 올바르지 않거나 권한이 없습니다. 「API키등록·플랫폼연동」에서 본인 키를 확인해 주세요.`;
    case "quota": return `${providerLabel} API 사용 한도에 걸렸습니다. 잠시 뒤 다시 시도하거나 결제·한도 설정을 확인해 주세요.`;
    case "timeout": return `${providerLabel} 응답이 늦어 시간이 초과됐습니다. 잠시 뒤 다시 시도해 주세요.`;
    case "format": return "AI 응답 형식을 읽지 못했습니다. 다시 시도해 주세요.";
    default: return `${providerLabel} 호출에 실패했습니다. 잠시 뒤 다시 시도해 주세요.`;
  }
}
