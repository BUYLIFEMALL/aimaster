// cron-job.org 모의: 작업의 있음/켜짐 상태를 들고 있다. T.gate가 있으면 호출마다 순서 조정 지점이 된다.
const T = () => globalThis.T;
async function step(entry, failing) { if (T().gate) await T().gate(); T().cronLog.push(entry); if (T().onCron) T().onCron(entry); if (T().cronFail || failing) throw new Error("cron 실패"); }
export async function setDispatchJobEnabled(key, url, on) { await step(["enable", key, on], on && T().cronFailOn); if (!T().job.exists) return false; T().job.enabled = on; return true; }
export async function upsertDispatchJob(key) { await step(["upsert", key], T().cronFailOn); T().job.exists = true; T().job.enabled = true; return 77; }
export async function deleteDispatchJob(key) { if (T().gate) await T().gate(); T().cronLog.push(["delete", key]); T().job.exists = false; T().job.enabled = false; }
