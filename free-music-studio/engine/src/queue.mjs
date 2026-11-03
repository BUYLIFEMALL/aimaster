// 작업 대기열 — 원본 기능을 옮김(2026-11-03). 생성·커버를 쌓아 두면 한 번에 하나씩 차례로 만든다.
// 상태: queued(대기) → running(진행) → done(완료) | failed(실패) | cancelled(취소) | interrupted(엔진이 꺼져 중단).
// 엔진을 다시 켜면 진행 중이던 작업은 interrupted가 되고, 회원이 [다시 하기]를 누르면 같은 내용으로 다시 대기열에 들어간다.
// 대기 중이던 작업은 그대로 남아 엔진이 준비되면 이어서 만든다. 탭을 닫아도 엔진이 계속 만든다.
// 저장: 데이터 폴더 queue.json. 끝난 작업은 최근 100개만 남긴다.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const STATUS_LABEL = { queued: "대기 중", running: "만드는 중", done: "완료", failed: "실패", cancelled: "취소됨", interrupted: "중단됨" };
const FINISHED = new Set(["done", "failed", "cancelled", "interrupted"]);
export const KEEP_FINISHED = 100;
export const MAX_QUEUED = 50;

/** 화면에 보낼 모양 — 생성 요청 원문(task)과 원곡 파일 경로는 빼고 기록용 정보만 */
export function publicJob(j) {
  const { task: _task, fields: _fields, source: _source, ...rest } = j;
  return rest;
}

/**
 * @param {{ file: string, run: (job: object, signal: AbortSignal, stage: (s: string) => void) => Promise<object>,
 *           canRun?: (job: object) => boolean, onFinished?: (job: object) => Promise<void> | void, log?: (e: unknown) => void }} opts
 */
export function createQueue({ file, run, canRun = () => true, onFinished = () => {}, log = () => {} }) {
  let jobs = [];
  let working = false;
  let controller = null;

  const save = async () => {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify({ jobs }, null, 2));
    await rename(tmp, file);
  };

  const trim = () => {
    const finished = jobs.filter((j) => FINISHED.has(j.status));
    if (finished.length <= KEEP_FINISHED) return;
    const drop = new Set(finished.slice(0, finished.length - KEEP_FINISHED).map((j) => j.id));
    jobs = jobs.filter((j) => !drop.has(j.id));
  };

  const q = {
    /** 저장된 대기열 읽기 — 진행 중이던 작업은 엔진이 꺼져 끊긴 것이므로 「중단됨」 */
    async load() {
      try {
        const data = JSON.parse(await readFile(file, "utf8"));
        jobs = Array.isArray(data?.jobs) ? data.jobs : [];
      } catch {
        jobs = [];
      }
      for (const j of jobs) {
        if (j.status === "running") Object.assign(j, { status: "interrupted", stage: STATUS_LABEL.interrupted, finishedAt: new Date().toISOString() });
      }
      await save();
    },

    list() {
      return jobs.map(publicJob);
    },

    get(id) {
      return jobs.find((j) => j.id === id) ?? null;
    },

    /** 작업 하나 넣기. request: { kind, title, track, task?(JSON 본문) | fields?+source?(커버·부분 수정) } */
    async add(request) {
      if (jobs.filter((j) => j.status === "queued" || j.status === "running").length >= MAX_QUEUED) {
        throw new Error(`대기열에는 ${MAX_QUEUED}개까지 넣을 수 있습니다. 앞의 작업이 끝난 뒤 넣어 주세요.`);
      }
      const job = {
        id: randomUUID(),
        kind: request.kind,
        engine: request.engine === "yue2" ? "yue2" : "acestep",
        license: request.engine === "yue2" ? "noncommercial" : "commercial",
        title: request.title,
        track: request.track,
        ...(request.task ? { task: request.task } : {}),
        ...(request.fields ? { fields: request.fields } : {}),
        ...(request.source ? { source: request.source } : {}),
        status: "queued",
        stage: STATUS_LABEL.queued,
        createdAt: new Date().toISOString(),
        recorded: false,
      };
      jobs.push(job);
      await save();
      void q.pump();
      return publicJob(job);
    },

    /** 대기 중이면 바로 빼고, 만드는 중이면 기다리기를 멈춘다(음악 엔진 안에서는 그 곡이 끝까지 만들어질 수 있음). */
    async cancel(id) {
      const job = q.get(id);
      if (!job || !(job.status === "queued" || job.status === "running")) return false;
      if (job.status === "running") controller?.abort();
      Object.assign(job, { status: "cancelled", stage: STATUS_LABEL.cancelled, finishedAt: new Date().toISOString() });
      await save();
      return true;
    },

    /** 중단·실패한 작업을 같은 내용으로 다시 대기열에(곡 번호는 새로 — 엔진 파일 이름이 겹치지 않게) */
    async rerun(id, newTrackId) {
      const prev = q.get(id);
      if (!prev || !(prev.status === "interrupted" || prev.status === "failed")) throw new Error("다시 할 수 있는 작업이 아닙니다.");
      if (prev.kind !== "text2music" && !prev.source) throw new Error("원곡 파일이 남아 있지 않아 다시 할 수 없습니다. 가져온 음악 화면에서 다시 올려 주세요.");
      jobs = jobs.filter((j) => j !== prev);
      const job = { ...prev, id: randomUUID(), track: { ...prev.track, id: newTrackId }, status: "queued", stage: STATUS_LABEL.queued, createdAt: new Date().toISOString(), recorded: false };
      for (const k of ["startedAt", "finishedAt", "error", "result"]) delete job[k];
      jobs.push(job);
      await save();
      void q.pump();
      return publicJob(job);
    },

    /** 끝난 작업을 목록에서 지운다(만든 음원은 보관함에 그대로) */
    async dismiss(id) {
      const job = q.get(id);
      if (!job || !FINISHED.has(job.status)) return false;
      jobs = jobs.filter((j) => j !== job);
      await save();
      return true;
    },

    /** 사이트가 「모든 음악」 기록을 남겼음 */
    async markRecorded(id) {
      const job = q.get(id);
      if (!job || job.status !== "done") return false;
      job.recorded = true;
      await save();
      return true;
    },

    /** 대기 중인 작업을 차례로 처리한다. 음악 엔진이 준비되지 않았으면 기다린다(준비되면 다시 부른다). */
    async pump() {
      if (working) return;
      working = true;
      try {
        // 차례는 넣은 순서 그대로 — 맨 앞 작업을 지금 만들 수 없으면(예: 음악 엔진 준비 중) 기다린다
        for (let job; (job = jobs.find((j) => j.status === "queued")) && canRun(job); ) {
          controller = new AbortController();
          Object.assign(job, { status: "running", stage: "작업 준비 중", startedAt: new Date().toISOString() });
          await save();
          try {
            const result = await run(job, controller.signal, (s) => {
              if (job.status === "running") job.stage = s;
            });
            if (job.status === "running") Object.assign(job, { status: "done", stage: STATUS_LABEL.done, result, finishedAt: new Date().toISOString() });
          } catch (err) {
            if (job.status === "running") {
              const aborted = controller.signal.aborted;
              Object.assign(job, {
                status: aborted ? "cancelled" : "failed",
                stage: aborted ? STATUS_LABEL.cancelled : STATUS_LABEL.failed,
                ...(aborted ? {} : { error: err instanceof Error ? err.message : String(err) }),
                finishedAt: new Date().toISOString(),
              });
            }
            if (!controller.signal.aborted) log(err);
          } finally {
            controller = null;
          }
          trim();
          await save();
          try {
            await onFinished(job);
          } catch (e) {
            log(e);
          }
        }
      } finally {
        working = false;
      }
    },
  };
  return q;
}
