// cron-job.org REST API(https://docs.cron-job.org/rest-api.html) — 몰 운영자 본인 cron-job.org 계정에 입금 기한 확인 작업을 만든다.
// 호출 방식은 공용 기준 코드 「insta-cronjob-org」(기준 cardnews-studio, 사본 ai-influencer-studio/src/lib/instagram/cronJobOrg.ts)와 같고,
// Lab은 독립 프로그램이라 사본으로 가져와 몰 단위·10분 주기로 맞췄다. 머리글에는 몰 전용 토큰만 넣는다(사이트 비밀값 금지).
// 하루 호출 한도가 100회(기본)라 화면을 열 때 부르지 않고, 운영자가 저장·일시정지 버튼을 누를 때만 부른다.
import { CHECK_MINUTES } from "./depositScheduler.ts";

const API_BASE = "https://api.cron-job.org";
export const CRON_JOB_TITLE = "AI 쇼핑몰 빌더 입금 기한 확인";

type Fetch = typeof fetch;

export type CronJobSummary = { jobId: number; url: string; enabled: boolean; lastStatus: number; lastExecution: number };

async function call<T>(f: Fetch, apiKey: string, method: "GET" | "PUT" | "PATCH", path: string, body?: unknown): Promise<T> {
  const response = await f(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("cron-job.org API 키가 올바르지 않습니다. cron-job.org 콘솔 Settings에서 키를 다시 복사해 주세요.");
    if (response.status === 403) throw new Error("cron-job.org가 요청을 거부했습니다. API 키에 IP 제한이 걸려 있으면 해제해 주세요(서버 주소는 계속 바뀝니다).");
    if (response.status === 429) throw new Error("cron-job.org 하루 호출 한도(기본 100회)를 넘었습니다. 내일 다시 시도해 주세요.");
    throw new Error(`cron-job.org 요청이 실패했습니다(HTTP ${response.status}). 잠시 뒤 다시 시도해 주세요.`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export function jobBody(url: string, bearerToken: string, enabled: boolean) {
  return {
    job: {
      url,
      enabled,
      title: CRON_JOB_TITLE,
      saveResponses: false,
      requestMethod: 0,
      requestTimeout: 30,
      schedule: { timezone: "Asia/Seoul", expiresAt: 0, hours: [-1], mdays: [-1], minutes: CHECK_MINUTES, months: [-1], wdays: [-1] },
      extendedData: { headers: { Authorization: `Bearer ${bearerToken}` } },
    },
  };
}

export async function findJob(apiKey: string, url: string, f: Fetch = fetch): Promise<CronJobSummary | null> {
  const { jobs } = await call<{ jobs?: CronJobSummary[] }>(f, apiKey, "GET", "/jobs");
  return (jobs ?? []).find((job) => job.url === url) ?? null;
}

/** 같은 주소의 작업이 있으면 덮어쓰고(새 토큰·켜짐), 없으면 새로 만든다 → 작업 번호 */
export async function upsertJob(apiKey: string, url: string, bearerToken: string, f: Fetch = fetch): Promise<number> {
  const existing = await findJob(apiKey, url, f);
  if (existing) {
    await call(f, apiKey, "PATCH", `/jobs/${existing.jobId}`, jobBody(url, bearerToken, true));
    return existing.jobId;
  }
  const { jobId } = await call<{ jobId: number }>(f, apiKey, "PUT", "/jobs", jobBody(url, bearerToken, true));
  return jobId;
}

/** 작업 켜기/끄기(작업은 지우지 않음) → 작업 번호, 작업이 없으면 null */
export async function setJobEnabled(apiKey: string, url: string, enabled: boolean, f: Fetch = fetch): Promise<number | null> {
  const existing = await findJob(apiKey, url, f);
  if (!existing) return null;
  if (existing.enabled !== enabled) await call(f, apiKey, "PATCH", `/jobs/${existing.jobId}`, { job: { enabled } });
  return existing.jobId;
}
