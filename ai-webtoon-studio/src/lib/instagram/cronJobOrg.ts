// cron-job.org REST API(https://docs.cron-job.org/rest-api.html) — 회원 본인 cron-job.org 계정으로 예약 발행 실행(2026-10-20, v1.16 — 인플루언서 v1.15 사본).
// 지침: 루트 docs/SCHEDULER_POLICY.md. 회원이 본인 API 키를 넣으면 1분마다 "회원 전용 실행 주소"를 부르는 작업을 그 계정에 만든다.
// 머리글에는 회원 전용 토큰을 넣는다(사이트 비밀값 CRON_SECRET은 절대 넣지 않는다). 기준 구현: threads/src/lib/posts/cronJobOrg.ts → cardnews-studio 사본(주소·작업 이름만 바꿈).
// 하루 호출 한도가 100회(기본)라 화면을 열 때 자동으로 부르지 않고, 버튼을 누를 때만 부른다.

const API_BASE = "https://api.cron-job.org";
export const MEMBER_DISPATCH_PATH = "/api/instagram/dispatch-member";
export const CRON_JOB_TITLE = "AIMaster AI 웹툰 인스타 예약 게시(1분)";

export type CronJobSummary = {
  jobId: number;
  url: string;
  enabled: boolean;
  lastStatus: number;
  lastExecution: number;
  nextExecution: number | null;
};

async function call<T>(apiKey: string, method: "GET" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("cron-job.org API 키가 올바르지 않습니다. 콘솔 Settings에서 키를 다시 복사해 주세요.");
    if (response.status === 403) throw new Error("cron-job.org가 요청을 거부했습니다. API 키에 IP 제한이 걸려 있으면 해제해 주세요(Vercel 서버 주소는 계속 바뀝니다).");
    if (response.status === 429) throw new Error("cron-job.org 하루 호출 한도(기본 100회)를 넘었습니다. 내일 다시 시도해 주세요.");
    throw new Error(`cron-job.org 요청이 실패했습니다(HTTP ${response.status}). 잠시 뒤 다시 시도해 주세요.`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

function jobBody(url: string, bearerToken: string) {
  return {
    job: {
      url,
      enabled: true,
      title: CRON_JOB_TITLE,
      saveResponses: false,
      requestMethod: 0,
      requestTimeout: 30,
      schedule: { timezone: "Asia/Seoul", expiresAt: 0, hours: [-1], mdays: [-1], minutes: [-1], months: [-1], wdays: [-1] },
      extendedData: { headers: { Authorization: `Bearer ${bearerToken}` } },
    },
  };
}

export async function findDispatchJob(apiKey: string, url: string): Promise<CronJobSummary | null> {
  const { jobs } = await call<{ jobs?: CronJobSummary[] }>(apiKey, "GET", "/jobs");
  return (jobs ?? []).find((job) => job.url === url) ?? null;
}

/** 같은 주소의 작업이 있으면 설정을 덮어쓰고(중복 생성 방지), 없으면 새로 만든다. */
export async function upsertDispatchJob(apiKey: string, url: string, bearerToken: string): Promise<number> {
  const existing = await findDispatchJob(apiKey, url);
  if (existing) {
    await call(apiKey, "PATCH", `/jobs/${existing.jobId}`, jobBody(url, bearerToken));
    return existing.jobId;
  }
  const { jobId } = await call<{ jobId: number }>(apiKey, "PUT", "/jobs", jobBody(url, bearerToken));
  return jobId;
}

/** 작업 켜기/끄기(작업은 지우지 않음). 작업이 없으면 false. */
export async function setDispatchJobEnabled(apiKey: string, url: string, enabled: boolean): Promise<boolean> {
  const existing = await findDispatchJob(apiKey, url);
  if (!existing) return false;
  if (existing.enabled !== enabled) await call(apiKey, "PATCH", `/jobs/${existing.jobId}`, { job: { enabled } });
  return true;
}

export async function deleteDispatchJob(apiKey: string, url: string): Promise<boolean> {
  const existing = await findDispatchJob(apiKey, url);
  if (!existing) return false;
  await call(apiKey, "DELETE", `/jobs/${existing.jobId}`);
  return true;
}

/** cron-job.org JobStatus → 화면 문구 */
export function describeLastStatus(status: number): string {
  if (status === 0) return "아직 실행 전";
  if (status === 1) return "정상";
  if (status === 4) return "실패(HTTP 오류 — 401이면 연결 토큰이 바뀐 것이니 다시 연결하세요)";
  if (status === 5) return "실패(시간 초과)";
  return `실패(코드 ${status})`;
}
