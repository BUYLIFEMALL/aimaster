// 대기열 작업 한 개 실행 — 엔진이 직접 음악 엔진(ACE-Step)에 맡기고, 3초마다 확인하고, 끝나면 내 PC 보관함에 저장한다.
// 사이트가 하던 일(startTask → checkTask → saveToLibrary)을 엔진 안으로 옮겨, 브라우저 탭을 닫아도 이어서 만든다.
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { extOfAudioRef } from "./library.mjs";
import { progressText, watchGrowth } from "./acestep.mjs";

const POLL_MS = 3000;
const MAX_WAIT_MS = 45 * 60_000;

/** query_result 응답에서 작업 하나의 상태(사이트 src/lib/engine.ts parseTaskState와 같은 규칙) */
export function parseTaskState(body, taskId) {
  const list = body?.data;
  const item = Array.isArray(list) ? list.find((d) => d && d.task_id === taskId) : null;
  if (!item) return { state: "running" };
  const status = Number(item.status);
  let results = item.result;
  if (typeof results === "string") {
    try {
      results = JSON.parse(results);
    } catch {
      results = null;
    }
  }
  if (status === 2) {
    // 음악 엔진이 알려 준 실패 이유(result[0].error)를 그대로 붙인다 — 이것이 없으면 원인을 찾을 수 없다(2026-11-04 마스터PC)
    const reason = Array.isArray(results) && typeof results[0]?.error === "string" ? results[0].error.trim() : "";
    const short = reason.replace(/\s+/g, " ").slice(0, 400);
    return { state: "failed", error: short ? `음악 엔진이 곡을 만들지 못했습니다 — ${short}` : "음악 엔진이 곡을 만들지 못했습니다. 가사·스타일을 줄여 다시 시도해 주세요." };
  }
  if (status !== 1) return { state: "running" };
  const file = Array.isArray(results) && typeof results[0]?.file === "string" ? results[0].file : "";
  if (!file.startsWith("/v1/audio?")) return { state: "failed", error: "완성된 음원 주소를 찾지 못했습니다." };
  return { state: "done", file };
}

/**
 * 취소한 작업이 음악 엔진에서 끝났는가(B-2, 2026-11-08) — ACE-Step에는 작업을 멈추는 주소가 없어 취소해도 끝까지 만든다.
 * 목록에 없으면(엔진을 다시 켜 기록이 사라짐) 끝난 것으로 본다. status 0만 「아직 만드는 중」.
 */
export function orphanFinished(body, taskId) {
  const list = body?.data;
  const item = Array.isArray(list) ? list.find((d) => d && d.task_id === taskId) : null;
  return !item || Number(item.status) !== 0;
}

/** 앞 작업 정리를 기다리는 최대 시간 — 넘으면 그냥 보낸다(음악 엔진이 차례로 처리) */
const ORPHAN_MAX_MS = 20 * 60_000;

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(Object.assign(new Error("취소됨"), { name: "AbortError" }));
    }, { once: true });
  });

/**
 * watch: 처음 쓰는 모델을 ACE-Step이 받는 폴더(checkpoints)와 아직 안 받은 크기(GB) — 폴더가 커지는 동안 「받는 중」을 보인다
 * @param {{ port: number, key: string, library: { save: Function }, sourceDir: string, pollMs?: number, maxWaitMs?: number, fetchImpl?: typeof fetch,
 *           watch?: { dir: string, missingGb: () => Promise<number>, every?: number } }} ctx
 */
export function createRunner({ port, key, library, sourceDir, pollMs = POLL_MS, maxWaitMs = MAX_WAIT_MS, fetchImpl = fetch, watch }) {
  const base = `http://127.0.0.1:${port}`;
  const auth = { authorization: `Bearer ${key}` };
  // 「만드는 중」에 취소된 작업 — 음악 엔진이 아직 만들고 있으니, 다음 작업은 이것이 끝날 때까지 「앞 작업 정리 중」으로 기다린다
  let orphan = null;

  async function waitOrphan(signal, stage) {
    if (!orphan) return;
    const { taskId, at } = orphan;
    for (;;) {
      const r = await fetchImpl(`${base}/query_result`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ task_id_list: [taskId] }), signal }).catch((e) => {
        if (signal?.aborted) throw e;
        return null;
      });
      if (!r || orphanFinished(await r.json().catch(() => null), taskId) || Date.now() - at > ORPHAN_MAX_MS) break;
      const sec = Math.round((Date.now() - at) / 1000);
      stage(`앞 작업 정리 중 · 취소한 곡을 음악 엔진이 마저 끝내는 중(${Math.floor(sec / 60)}분 ${sec % 60}초) — 끝나면 바로 시작합니다`);
      await sleep(pollMs, signal);
    }
    orphan = null;
  }

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

  async function run(job, signal, stage) {
    // 이 구성의 모델을 아직 안 받았으면 받는 폴더를 지켜본다(받는 동안은 그 진행을 먼저 보인다)
    const missing = watch ? await watch.missingGb().catch(() => 0) : 0;
    let grewAt = 0;
    let dlText = "";
    const stopWatch = missing
      ? watchGrowth(watch.dir, (b) => {
          grewAt = Date.now();
          dlText = progressText("음악 모델 받는 중(처음 한 번)", b, missing);
          stage(dlText);
        }, watch.every)
      : () => {};
    try {
      return await runInner(job, signal, stage, () => (Date.now() - grewAt < 15_000 ? dlText : ""));
    } finally {
      stopWatch();
    }
  }

  async function runInner(job, signal, stage, downloading) {
    await waitOrphan(signal, stage);
    stage("음악 엔진에 보내는 중");
    const taskId = await release(job);
    stage(downloading() || "만드는 중");
    const started = Date.now();
    let file = "";
    try {
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
      stage(downloading() || `만드는 중 · ${Math.floor(sec / 60)}분 ${sec % 60}초 지남`);
      if (Date.now() - started > maxWaitMs) throw new Error("너무 오래 걸려 기다리기를 멈췄습니다. 엔진 창에 오류가 있는지 확인해 주세요.");
    }
    } catch (e) {
      // 취소면 음악 엔진은 계속 만들고 있다 — 다음 작업이 기다리도록 기억
      if (signal?.aborted) orphan = { taskId, at: Date.now() };
      throw e;
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
  }

  return run;
}
