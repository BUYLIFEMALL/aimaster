import "server-only";

// 회원 본인 cron-job.org에 「매일 정한 시각 1번」 작업을 만든다. 지침: 루트 docs/SCHEDULER_POLICY.md(회원 전용 토큰, 사이트 비밀값 미전달).
// 예약 글처럼 1분 확인이 필요 없어 하루 1번이며, 쿠팡 호출을 아끼려고 시각도 회원이 고른다.
const API = "https://api.cron-job.org";
const TITLE = "AIMaster 쿠팡 아침 요약";

async function call<T>(apiKey: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("cron-job.org API 키가 올바르지 않습니다. 콘솔 Settings에서 다시 복사해 주세요.");
    if (res.status === 403) throw new Error("cron-job.org가 거부했습니다. API 키에 IP 제한이 있으면 해제해 주세요.");
    if (res.status === 429) throw new Error("cron-job.org 하루 호출 한도를 넘었습니다. 내일 다시 시도해 주세요.");
    throw new Error(`cron-job.org 요청이 실패했습니다(HTTP ${res.status}).`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

const findJob = async (apiKey: string, url: string) => (await call<{ jobs?: { jobId: number; url: string }[] }>(apiKey, "GET", "/jobs")).jobs?.find((j) => j.url === url) ?? null;

export async function upsertDailyJob(apiKey: string, url: string, token: string, hour: number): Promise<void> {
  const job = {
    url,
    enabled: true,
    title: TITLE,
    saveResponses: false,
    requestMethod: 0,
    requestTimeout: 30,
    schedule: { timezone: "Asia/Seoul", expiresAt: 0, hours: [hour], mdays: [-1], minutes: [0], months: [-1], wdays: [-1] },
    extendedData: { headers: { Authorization: `Bearer ${token}` } },
  };
  const found = await findJob(apiKey, url);
  if (found) await call(apiKey, "PATCH", `/jobs/${found.jobId}`, { job });
  else await call(apiKey, "PUT", "/jobs", { job });
}

export async function stopDailyJob(apiKey: string, url: string): Promise<void> {
  const found = await findJob(apiKey, url);
  if (found) await call(apiKey, "PATCH", `/jobs/${found.jobId}`, { job: { enabled: false } });
}
