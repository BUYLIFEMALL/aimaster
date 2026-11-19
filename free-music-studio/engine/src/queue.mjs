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
export const KEEP_DAYS = 30;
export const MAX_QUEUED = 50;

/** 화면에 보낼 모양 — 생성 요청 원문(task)과 원곡 파일 경로는 빼고 기록용 정보만 */
export function publicJob(j) {
  const { task: _task, fields: _fields, source: _source, ...rest } = j;
  return rest;
}

/** 같은 범위·같은 접수 ID인데 요청 내용이 다를 때(IMG-P1 PR-A) — 연결 문이 409로 답한다 */
export class QueueConflictError extends Error {
  constructor() {
    super("같은 접수 번호로 다른 내용을 보냈습니다. 새 접수 번호로 다시 보내 주세요.");
    this.status = 409;
  }
}
/** 대기열 파일이 깨져 이 대기열을 닫았을 때(failClosed) */
export class QueueClosedError extends Error {
  constructor(reason) {
    super(`작업 기록 파일을 읽지 못해 이 작업 목록을 멈췄습니다(${reason}). 파일은 그대로 두었습니다.`);
    this.status = 503;
  }
}

/**
 * 두 대기열을 합쳐 한 번에 한 작업만(IMG-P1 PR-A) — 상대 대기열이 만드는 중이 아니고, 이 작업이 상대 맨 앞 대기 작업보다
 * 먼저 접수됐을 때만 차례다(접수 시각 순). canRun 안에서 부르고, 각 대기열의 onFinished에서 상대 pump()를 다시 부른다.
 * pump는 「확인 → running 표시」 사이에 await가 없어 두 대기열이 동시에 시작하지 않는다.
 */
export function sharedTurn(job, other) {
  return !other.running() && Date.parse(job.createdAt) <= other.headQueuedAt();
}

/**
 * @param {{ file: string, run: (job: object, signal: AbortSignal, stage: (s: string) => void) => Promise<object>,
 *           canRun?: (job: object) => boolean, onFinished?: (job: object) => Promise<void> | void, log?: (e: unknown) => void,
 *           failClosed?: boolean }} opts
 * failClosed(IMG-P1 PR-A, 새 그림 사이트 범위 전용): 파일이 있는데 읽지 못하면 원본을 덮어쓰지 않고 이 대기열을 닫는다
 * (목록·넣기·실행 모두 거절). 없으면 빈 대기열. 기존 queue.json은 이 옵션 없이 예전 동작 그대로.
 */
export function createQueue({ file, run, canRun = () => true, onFinished = () => {}, onDrop = () => {}, log = () => {}, now = Date.now, failClosed = false, onQueuedCancel = () => {} }) {
  let jobs = [];
  let working = false;
  let executing = false; // 실행 함수가 도는 중(취소로 표시 상태가 바뀌어도 실제로 끝날 때까지 true)
  let controller = null;
  let broken = "";

  // 저장은 한 번에 하나씩 — 넣기와 처리가 같은 임시 파일에 동시에 쓰면 윈도우에서 이름 바꾸기가 부딪혀 실패했다(2026-11-04 시험에서 가끔 재현)
  let saving = Promise.resolve();
  const saveNow = async () => {
    if (broken) return; // 닫힌 대기열은 깨진 원본을 덮어쓰지 않는다
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify({ jobs }, null, 2));
    await rename(tmp, file);
  };
  const save = () => (saving = saving.catch(() => {}).then(saveNow));
  const assertOpen = () => {
    if (broken) throw new QueueClosedError(broken);
  };
  /** 저장돼 있던 작업 항목이 쓸 수 있는 모양인지(failClosed 대기열을 읽을 때) — 번호·종류·상태·접수 시각, 끝난 시각이 있으면 그것도 */
  const validJob = (j) =>
    !!j &&
    typeof j === "object" &&
    !Array.isArray(j) &&
    typeof j.id === "string" &&
    !!j.id &&
    typeof j.kind === "string" &&
    typeof j.status === "string" &&
    Object.hasOwn(STATUS_LABEL, j.status) &&
    typeof j.createdAt === "string" &&
    Number.isFinite(Date.parse(j.createdAt)) &&
    (j.finishedAt === undefined || (typeof j.finishedAt === "string" && Number.isFinite(Date.parse(j.finishedAt))));

  // 끝난 작업은 100개까지, 그리고 끝난 지 30일 지난 기록은 지운다(0.6.9, 원본 boks-music `store.mjs pruneJobs` 규칙, MIT).
  // 사이트에 아직 기록하지 않은 완성 작업은 남긴다. 지운 작업의 원곡 사본은 onDrop으로 부르는 쪽이 지운다.
  const trim = (now = Date.now()) => {
    const old = (j) => FINISHED.has(j.status) && !(j.status === "done" && !j.recorded) && now - Date.parse(j.finishedAt ?? j.createdAt ?? "") > KEEP_DAYS * 864e5;
    const finished = jobs.filter((j) => FINISHED.has(j.status));
    const drop = new Set([...finished.slice(0, Math.max(0, finished.length - KEEP_FINISHED)), ...jobs.filter(old)].map((j) => j.id));
    if (!drop.size) return;
    for (const j of jobs) if (drop.has(j.id)) Promise.resolve(onDrop(j)).catch(() => {});
    jobs = jobs.filter((j) => !drop.has(j.id));
  };

  const q = {
    /** 저장된 대기열 읽기 — 진행 중이던 작업은 엔진이 꺼져 끊긴 것이므로 「중단됨」 */
    async load() {
      let text = null;
      try {
        text = await readFile(file, "utf8");
      } catch (e) {
        // 파일이 없으면 빈 대기열. 그 밖의 읽기 실패는 failClosed일 때 닫는다
        if (failClosed && e?.code !== "ENOENT") broken = "읽기 실패";
      }
      try {
        const data = text == null ? { jobs: [] } : JSON.parse(text);
        if (!Array.isArray(data?.jobs)) throw new Error("jobs 없음");
        jobs = data.jobs;
      } catch {
        jobs = [];
        if (failClosed) broken = broken || "내용이 올바르지 않음";
      }
      // 새 그림 사이트 범위(failClosed): 배열 안 항목까지 본다 — 항목이 깨졌는데 그대로 쓰면 아래 정리에서 예외가 나
      // 엔진 기동(최상위 await)까지 막을 수 있다. 하나라도 올바르지 않으면 이 대기열만 닫고 파일은 그대로 둔다.
      if (failClosed && !broken && !jobs.every(validJob)) {
        jobs = [];
        broken = "작업 항목이 올바르지 않음";
      }
      if (broken) {
        log(new QueueClosedError(broken));
        return;
      }
      for (const j of jobs) {
        if (j.status === "running") Object.assign(j, { status: "interrupted", stage: STATUS_LABEL.interrupted, finishedAt: new Date().toISOString() });
      }
      trim(now()); // 엔진을 켤 때 30일 지난 기록 정리
      // 새 그림 사이트 범위(failClosed): 파일이 없고 작업도 없으면 만들지 않는다 — 그 사이트를 쓰지 않는 PC에 빈 파일을 남기지 않게.
      // 기존 queue.json은 예전처럼 켤 때마다 저장한다.
      if (failClosed && text == null && !jobs.length) return;
      await save();
    },

    /** 이 대기열이 닫혔으면 그 이유(failClosed), 아니면 "" */
    get broken() {
      return broken;
    },

    /** 목록 — keep을 주면 그 조건에 맞는 작업만(새 그림 사이트 범위 거르기). 닫힌 대기열은 빈 목록 */
    list(keep) {
      if (broken) return [];
      return (keep ? jobs.filter(keep) : jobs).map(publicJob);
    },

    get(id) {
      if (broken) return null;
      return jobs.find((j) => j.id === id) ?? null;
    },

    /**
     * 만드는 중인 작업이 있는지(두 대기열을 합쳐 한 번에 하나만 돌릴 때 상대가 본다).
     * 표시 상태만 보지 않는다 — 만드는 중에 취소하면 상태는 바로 「취소됨」이 되지만 실행 함수는 아직 끝나지 않았을 수 있다.
     * 실행 함수와 끝난 뒤 정리(저장)까지 마쳐야 false가 된다(executing).
     */
    running() {
      return executing || jobs.some((j) => j.status === "running");
    },

    /** 맨 앞 대기 작업의 접수 시각(ms), 없으면 Infinity — 두 대기열의 차례(접수 시각 순) */
    headQueuedAt() {
      if (broken) return Infinity;
      const j = jobs.find((x) => x.status === "queued");
      return j ? Date.parse(j.createdAt) : Infinity;
    },

    /** 작업 하나 넣기. request: { kind, title, track, task?(JSON 본문) | fields?+source?(커버·부분 수정) } */
    // IMG-P1 PR-A(새 그림 사이트만): site·scope·clientRequestId·digest가 오면 작업에 적고, 같은 site·scope·접수 ID가
    // 기록에 남아 있으면 새로 넣지 않는다 — 내용 요약(digest)이 같으면 그 작업을, 다르면 QueueConflictError(409).
    // 확인부터 jobs.push까지 await가 없어 동시에 여러 번 와도 작업은 하나만 생긴다.
    async add(request) {
      assertOpen();
      if (request.clientRequestId) {
        const same = jobs.find((j) => j.clientRequestId === request.clientRequestId && j.site === request.site && j.scope === request.scope);
        if (same) {
          if (same.digest !== request.digest) throw new QueueConflictError();
          return publicJob(same);
        }
      }
      if (jobs.filter((j) => j.status === "queued" || j.status === "running").length >= MAX_QUEUED) {
        throw new Error(`대기열에는 ${MAX_QUEUED}개까지 넣을 수 있습니다. 앞의 작업이 끝난 뒤 넣어 주세요.`);
      }
      const job = {
        id: randomUUID(),
        kind: request.kind,
        // 엔진 이름은 연결 문이 확인한 것만 온다(0.4.0: 추가 엔진). 분류는 엔진이 정한 값, 없으면 YuE2만 비상업용
        engine: typeof request.engine === "string" && request.engine ? request.engine : "acestep",
        license: request.license === "noncommercial" || request.engine === "yue2" ? "noncommercial" : "commercial",
        title: request.title,
        track: request.track,
        ...(request.task ? { task: request.task } : {}),
        ...(request.fields ? { fields: request.fields } : {}),
        ...(request.source ? { source: request.source } : {}),
        ...(request.site ? { site: request.site, scope: request.scope } : {}),
        ...(request.clientRequestId ? { clientRequestId: request.clientRequestId, digest: request.digest } : {}),
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
      const wasQueued = job.status === "queued";
      if (job.status === "running") controller?.abort();
      Object.assign(job, { status: "cancelled", stage: STATUS_LABEL.cancelled, finishedAt: new Date().toISOString() });
      await save();
      // 대기 중이던 작업을 빼면 맨 앞 대기 작업이 바뀐다 — 두 대기열을 합쳐 돌릴 때 상대가 차례를 다시 보게 알린다(IMG-P1 PR-A)
      if (wasQueued) {
        try {
          onQueuedCancel(job);
        } catch (e) {
          log(e);
        }
      }
      return true;
    },

    /** 중단·실패한 작업을 같은 내용으로 다시 대기열에(곡 번호는 새로 — 엔진 파일 이름이 겹치지 않게) */
    async rerun(id, newTrackId) {
      const prev = q.get(id);
      if (!prev || !(prev.status === "interrupted" || prev.status === "failed")) throw new Error("다시 할 수 있는 작업이 아닙니다.");
      // 마스터링은 원곡을 보관함에서 다시 읽으므로 따로 둔 원곡 사본이 없어도 다시 할 수 있다(0.6.9)
      if (prev.kind !== "text2music" && prev.kind !== "master" && prev.kind !== "stems" && prev.kind !== "align" && prev.kind !== "art" && !prev.source) throw new Error("원곡 파일이 남아 있지 않아 다시 할 수 없습니다. 가져온 음악 화면에서 다시 올려 주세요.");
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
      if (working || broken) return;
      working = true;
      try {
        // 차례는 넣은 순서 그대로 — 맨 앞 작업을 지금 만들 수 없으면(예: 음악 엔진 준비 중) 기다린다
        for (let job; (job = jobs.find((j) => j.status === "queued")) && canRun(job); ) {
          controller = new AbortController();
          executing = true; // 「확인 → 표시」 사이에 await 없음. 실행 함수가 끝나고 정리를 마칠 때까지 유지한다
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
          trim(now());
          try {
            await save();
          } finally {
            executing = false; // 상대 대기열을 깨우는 onFinished보다 먼저 푼다
          }
          try {
            await onFinished(job);
          } catch (e) {
            log(e);
          }
        }
      } finally {
        executing = false;
        working = false;
      }
    },
  };
  return q;
}
