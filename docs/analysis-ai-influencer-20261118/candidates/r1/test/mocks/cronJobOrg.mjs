const T = () => globalThis.T;
export async function setDispatchJobEnabled(key, url, on) { T().cronLog.push(["enable", key, on]); if (T().cronFail) throw new Error("cron 실패"); return T().jobExists !== false; }
export async function upsertDispatchJob(key) { T().cronLog.push(["upsert", key]); if (T().cronFail) throw new Error("cron 실패"); return 77; }
export async function deleteDispatchJob(key) { T().cronLog.push(["delete", key]); }
