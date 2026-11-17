import "server-only";
import robotsParser from "robots-parser"; // MIT, robots-parser@3.0.1 (Sam Clarke) — 2026-11-17 T-05
import { safeFetch, BlockedUrlError } from "@/lib/inspect/safeFetch";

// 「한 페이지 분석」이 robots.txt가 막은 주소를 자동으로 가져가지 않게 한다(완성 기준 §2 조건 4, T-05).
// safeFetch의 beforeRequest 훅으로 첫 주소와 리디렉트 다음 주소마다 "본문 요청 전에" 판정한다.

/** 실제 요청에 쓰는 User-Agent. robots 판정 대상 토큰과 반드시 같은 이름을 쓴다. */
export const INSPECT_ROBOTS_TOKEN = "WebCrawlerInspect";
export const INSPECT_USER_AGENT =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 ${INSPECT_ROBOTS_TOKEN}/1.0`;

const ROBOTS_TIMEOUT_MS = 5_000;
export const ROBOTS_MAX_BYTES = 512_000;

/** robots.txt가 이 주소를 막았다(또는 robots.txt 자체가 401·403). → 403 */
export class RobotsBlockedError extends Error {}
/** robots.txt를 지금 확인할 수 없다(429·5xx·그 밖의 4xx·연결 오류·시간 초과·크기 초과). → 503, 자동 재시도 없음 */
export class RobotsUnavailableError extends Error {}

const BLOCKED_MSG = "이 사이트의 robots.txt가 이 주소의 자동 분석을 허용하지 않습니다.";
const UNAVAILABLE_MSG = "사이트의 robots.txt를 지금 확인할 수 없습니다. 잠시 뒤 다시 시도해 주세요.";

type RobotsRule = { kind: "none" } | { kind: "rules"; robots: ReturnType<typeof robotsParser> };

/** 본문을 끝까지 text()로 읽지 않고, 흐름으로 읽다가 상한을 넘으면 바로 멈춘다. */
async function readBounded(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new RobotsUnavailableError(UNAVAILABLE_MSG);
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(buf);
}

async function loadRobots(origin: string, outer: AbortSignal): Promise<RobotsRule> {
  const robotsUrl = `${origin}/robots.txt`;
  const signal = AbortSignal.any([outer, AbortSignal.timeout(ROBOTS_TIMEOUT_MS)]);
  let response: Response;
  try {
    // 훅 없이 부른다 → robots.txt 요청에 다시 robots 판정이 걸리지 않는다(재귀 0).
    // 사설망 차단·DNS 고정·리디렉트 5회 제한은 그대로 받는다(넘치면 BlockedUrlError가 그대로 나간다).
    ({ response } = await safeFetch(robotsUrl, {
      headers: { "User-Agent": INSPECT_USER_AGENT, Accept: "text/plain,*/*;q=0.5" },
      signal,
    }));
  } catch (err) {
    if (err instanceof BlockedUrlError) throw err;
    throw new RobotsUnavailableError(UNAVAILABLE_MSG);
  }
  const status = response.status;
  if (status === 404 || status === 410) {
    await response.body?.cancel().catch(() => {});
    return { kind: "none" };
  }
  if (status === 401 || status === 403) {
    await response.body?.cancel().catch(() => {});
    throw new RobotsBlockedError(BLOCKED_MSG);
  }
  if (status < 200 || status >= 300) {
    // 429·5xx·그 밖의 4xx·남은 3xx는 불확실 → 본문 요청하지 않음
    await response.body?.cancel().catch(() => {});
    throw new RobotsUnavailableError(UNAVAILABLE_MSG);
  }
  let text: string;
  try {
    text = await readBounded(response, ROBOTS_MAX_BYTES);
  } catch (err) {
    if (err instanceof RobotsUnavailableError) throw err;
    throw new RobotsUnavailableError(UNAVAILABLE_MSG);
  }
  if (!text.trim()) return { kind: "none" };
  return { kind: "rules", robots: robotsParser(robotsUrl, text) };
}

/**
 * 분석 1회용 판정 장치. 같은 출처의 robots.txt는 이 분석 안에서 한 번만 받는다(저장 캐시 아님).
 * 사용: safeFetch(url, init, { beforeRequest: createRobotsGuard() })
 */
export function createRobotsGuard(token: string = INSPECT_ROBOTS_TOKEN) {
  const byOrigin = new Map<string, Promise<RobotsRule>>();
  return async function beforeRequest(url: URL, signal: AbortSignal): Promise<void> {
    const origin = url.origin;
    let pending = byOrigin.get(origin);
    if (!pending) {
      pending = loadRobots(origin, signal);
      byOrigin.set(origin, pending);
    }
    const rule = await pending;
    if (rule.kind === "none") return;
    // 그 토큰 이름의 그룹이 있으면 그 그룹만, 없으면 * 그룹만 쓴다(두 그룹을 함께 적용하지 않음).
    const allowed = rule.robots.isAllowed(url.href, token);
    if (allowed === true) return;
    if (allowed === false) throw new RobotsBlockedError(BLOCKED_MSG);
    throw new RobotsUnavailableError(UNAVAILABLE_MSG); // undefined = 판정 불가
  };
}
