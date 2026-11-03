// 대기열 작업 한 개 실행 — 엔진이 직접 음악 엔진(ACE-Step)에 맡기고, 3초마다 확인하고, 끝나면 내 PC 보관함에 저장한다.
// 사이트가 하던 일(startTask → checkTask → saveToLibrary)을 엔진 안으로 옮겨, 브라우저 탭을 닫아도 이어서 만든다.
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { extOfAudioRef } from "./library.mjs";

const POLL_MS = 3000;
const MAX_WAIT_MS = 45 * 60_000;

/** query_result 응답에서 작업 하나의 상태(사이트 src/lib/engine.ts parseTaskState와 같은 규칙) */
export function parseTaskState(body, taskId) {
  const list = body?.data;
  const item = Array.isArray(list) ? list.find((d) => d && d.task_id === taskId) : null;
  if (!item) return { state: "running" };
  const status = Number(item.status);
  if (status === 2) return { state: "failed", error: "음악 엔진이 곡을 만들지 못했습니다. 가사·스타일을 줄여 다시 시도해 주세요." };
  if (status !== 1) return { state: "running" };
  let results = item.result;
  if (typeof results === "string") {
    try {
      results = JSON.parse(results);
    } catch {
      results = null;
    }
  }
  const file = Array.isArray(results) && typeof results[0]?.file === "string" ? results[0].file : "";
  if (!file.startsWith("/v1/audio?")) return { state: "failed", error: "완성된 음원 주소를 찾지 못했습니다." };
  return { state: "done", file };
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(Object.assign(new Error("취소됨"), { name: "AbortError" }));
    }, { once: true });
  });

/**
 * @param {{ port: number, key: string, library: { save: Function }, sourceDir: string, pollMs?: number, maxWaitMs?: number, fetchImpl?: typeof fetch }} ctx
 */
export function createRunner({ port, key, library, sourceDir, pollMs = POLL_MS, maxWaitMs = MAX_WAIT_MS, fetchImpl = fetch }) {
  const base = `http://127.0.0.1:${port}`;
  const auth = { authorization: `Bearer ${key}` };

  async function release(job) {
    let res;
    if (job.kind === "text2music") {
      res = await fetchImpl(`${base}/release_task`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(job.task) });
    } else {
      if (!job.source) throw new Error("원곡 파일이 없습니다.");
      const form = new FormData();
      for (const [k, v] of Object.entries(job.fields ?? {})) form.append(k, String(v));
      const buf = await readFile(path.join(sourceDir, job.source.file)).catch(() => null);
      if (!buf) throw new Error("원곡 파일을 찾지 못했습니다. 가져온 음악 화면에서 다시 올려 주세요.");
      form.append("src_audio", new Blob([buf]), job.source.name || job.source.file);
      res = await fetchImpl(`${base}/release_task`, { method: "POST", headers: auth, body: form });
    }
    const data = await res.json().catch(() => null);
    const taskId = data?.data?.task_id;
    if (!res.ok || typeof taskId !== "string") throw new Error("음악 엔진이 작업을 받지 못했습니다.");
    return taskId;
  }

  return async function run(job, signal, stage) {
    stage("음악 엔진에 보내는 중");
    const taskId = await release(job);
    stage("만드는 중");
    const started = Date.now();
    let file = "";
    for (;;) {
      await sleep(pollMs, signal);
      const r = await fetchImpl(`${base}/query_result`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ task_id_list: [taskId] }), signal });
      const s = parseTaskState(await r.json().catch(() => null), taskId);
      if (s.state === "failed") throw new Error(s.error);
      if (s.state === "done") {
        file = s.file;
        break;
      }
      const sec = Math.round((Date.now() - started) / 1000);
      stage(`만드는 중 · ${Math.floor(sec / 60)}분 ${sec % 60}초 지남`);
      if (Date.now() - started > maxWaitMs) throw new Error("너무 오래 걸려 기다리기를 멈췄습니다. 엔진 창에 오류가 있는지 확인해 주세요.");
    }
    stage("보관함에 저장하는 중");
    const audio = await fetchImpl(`${base}${file}`, { headers: auth, signal });
    if (!audio.ok) throw new Error("음악 엔진에서 완성 음원을 받지 못했습니다.");
    const ext = extOfAudioRef(file);
    await library.save(job.track.id, Buffer.from(await audio.arrayBuffer()), job.title, ext);
    // 다 쓴 원곡 파일은 지운다(같은 작업을 다시 하려면 원곡을 다시 올린다)
    if (job.source) {
      await rm(path.join(sourceDir, job.source.file), { force: true });
      delete job.source;
    }
    return { trackId: job.track.id, ext };
  };
}
