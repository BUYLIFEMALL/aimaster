// 회원 PC의 로컬 엔진(free-music-studio/engine)과 주고받는 연결 계층. 브라우저에서만 쓴다.
// 계약 기준: 엔진 e8e52b505의 「새 그림 사이트 범위」(gateway.mjs handleScopedQueue·handleScopedArt, security.mjs createScopedTokens).
// fetch·저장소·난수를 받아 쓰므로 설치 없이 시험한다(tests/engine.test.mjs, 모의 엔진 tests/mockEngine.mjs).

/** 엔진 주소는 이 PC의 루프백으로 고정한다. 설정·환경변수·사용자 입력으로 바꾸지 않는다. */
export const ENGINE_URL = "http://127.0.0.1:47821";
export const IMAGE_SIZES = [
  [1024, 1024],
  [1280, 720],
  [720, 1280],
] as const;
export const PROMPT_LIMIT = 900;
export const SEED_MAX = 2147483647;
export const TITLE_LIMIT = 80;

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;
const JOB_ID = /^[0-9a-f-]{36}$/;
const PATH = /^\/[A-Za-z0-9/-]*$/;
const LEDGER_MAX = 300;
/** 이 시간 안에 접수한 것만 「엔진에 없음」을 미접수로 확정할 수 있다(오래되면 엔진이 끝난 기록을 정리했을 수 있다). */
export const CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000;

// 엔진이 작업을 목록에 넣기 **전에** 돌려주는 400(e8e52b505 gateway.mjs handleScopedQueue · queue.mjs add).
// 엔진은 목록에 넣은 뒤 파일 저장을 기다리므로, 이 문구가 아닌 400은 「받았는지 모름」으로 본다.
const PRE_ADD_400 = [
  "그림 작업 내용이 올바르지 않습니다.",
  "접수 번호가 올바르지 않습니다.",
  "그릴 수 없는 크기입니다(1024×1024 · 1280×720 · 720×1280).",
  "시드 값이 올바르지 않습니다.",
  "그림 설명을 영어로 3단어 이상 적어 주세요(내 PC 그림 모델은 영어만 읽습니다).",
];
const QUEUE_FULL_400 = /^대기열에는 \d+개까지 넣을 수 있습니다\./;
/** 엔진이 이 접수를 받지 않은 것이 확실한 응답인가 */
function certainlyNotAccepted(error: EngineError): boolean {
  if ([401, 403, 409, 429, 503].includes(error.status)) return true; // 연결 문·대기열이 넣기 전에 막는 응답
  return error.status === 400 && (PRE_ADD_400.includes(error.message) || QUEUE_FULL_400.test(error.message));
}

export type EngineErrorKind =
  | "offline" // 엔진이 꺼져 있거나 응답을 받지 못함
  | "needPair" // 401 — 연결(짝짓기) 필요
  | "badCode" // 연결 코드가 틀림
  | "busy" // 429 — 잠시 뒤 다시
  | "forbidden" // 403 — 엔진이 이 사이트를 허용하지 않음
  | "notFound" // 404 — 없는 작업(남의 작업 포함)
  | "conflict" // 409 — 같은 접수 번호인데 내용이 다름
  | "closed" // 503 — 엔진이 이 사이트의 작업 기록을 닫음
  | "invalid" // 400 또는 보내기 전 검사에서 거절
  | "storage" // 브라우저 저장소에 쓰지 못함
  | "stale" // 회원 전환·연결 해제 뒤에 도착한 응답(버림)
  | "error"; // 그 밖의 엔진 오류

export class EngineError extends Error {
  kind: EngineErrorKind;
  status: number;
  constructor(kind: EngineErrorKind, message: string, status = 0) {
    super(message);
    this.name = "EngineError";
    this.kind = kind;
    this.status = status;
  }
}

export type KeyValueStore = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };

export type EngineJob = {
  id: string;
  kind: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled" | "interrupted";
  stage?: string;
  title?: string;
  error?: string;
  clientRequestId?: string;
  createdAt?: string;
  result?: { model?: string; seconds?: number; seed?: number; vramPeakGb?: number | null };
};

export type ArtTask = { prompt: string; variantId?: string; width?: number; height?: number; seed?: number };
export type SubmitInput = ArtTask & { title: string };

/**
 * 접수 기록(브라우저 보관). 엔진에 보내기 **전에** 적는다.
 *  pending     보내는 중
 *  accepted    엔진이 받음(jobId 있음)
 *  unknown     엔진이 받았는지 모름(응답 유실·서버 오류·넣은 뒤 실패일 수 있는 400). confirm()으로 같은 접수 번호를 물어본다
 *  notReceived confirm()이 **같은 연결 범위에서 근거를 갖고** 엔진에 없음을 확인 — resend()로 같은 번호·같은 내용을 다시 보낼 수 있다
 *  rejected    엔진이 넣기 전에 거절한 것이 확실함(401·403·409·429·503, 사전 검사 400). error에 사유
 * link는 접수 당시의 연결 범위 표시다. 연결이 끊겨 새 범위가 되면 이전 범위의 접수는 확인도 다시 보내기도 하지 않는다
 * (엔진의 중복 방지는 범위 안에서만 듣는다 — 새 범위로 다시 보내면 같은 그림이 두 번 그려진다).
 */
export type Submission = {
  requestId: string;
  trackId: string;
  /** 접수 당시의 연결 범위 표시(짝짓기로 범위를 이어받는 동안 같은 값) */
  link: string;
  title: string;
  task: ArtTask;
  state: "pending" | "accepted" | "unknown" | "notReceived" | "rejected";
  jobId?: string;
  error?: string;
  errorKind?: EngineErrorKind;
  at: number;
};

const DEFAULT_MESSAGE: Record<number, string> = {
  400: "엔진이 요청을 받지 않았습니다.",
  401: "PC 연결이 필요합니다. 엔진 창의 연결 코드 6자리를 넣어 주세요.",
  403: "엔진이 이 사이트를 허용하지 않습니다. 엔진을 최신 버전으로 올려 주세요.",
  404: "그 작업을 찾지 못했습니다.",
  409: "같은 접수 번호로 다른 내용이 이미 접수돼 있습니다.",
  429: "잠시 뒤 다시 시도해 주세요.",
  503: "엔진이 이 사이트의 작업을 멈췄습니다. 엔진 창을 확인해 주세요.",
};
const KIND_OF: Record<number, EngineErrorKind> = { 400: "invalid", 401: "needPair", 403: "forbidden", 404: "notFound", 409: "conflict", 429: "busy", 503: "closed" };
const OFFLINE = "내 PC 엔진이 응답하지 않습니다. 엔진이 켜져 있는지 확인해 주세요.";

/** 엔진이 받는 설명인지 미리 본다(엔진은 ASCII만 읽는다). 고쳐 보내지 않고 거절한다. */
export function checkArtInput(input: SubmitInput): string | null {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > TITLE_LIMIT) return `제목은 1~${TITLE_LIMIT}자로 적어 주세요.`;
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt) return "그림 설명을 적어 주세요.";
  if (/[^\x20-\x7e]/.test(prompt)) return "그림 설명은 영문으로 적어 주세요(내 PC 그림 모델은 영어만 읽습니다).";
  if (prompt.length > PROMPT_LIMIT) return `그림 설명은 ${PROMPT_LIMIT}자까지 적을 수 있습니다.`;
  if (prompt.split(/\s+/).length < 3) return "그림 설명을 영어로 3단어 이상 적어 주세요.";
  const sized = input.width !== undefined || input.height !== undefined;
  if (sized && !IMAGE_SIZES.some(([w, h]) => w === input.width && h === input.height)) return "그릴 수 없는 크기입니다(1024×1024 · 1280×720 · 720×1280).";
  if (input.seed !== undefined && !(Number.isInteger(input.seed) && input.seed >= 0 && input.seed <= SEED_MAX)) return "시드 값이 올바르지 않습니다.";
  if (input.variantId !== undefined && (typeof input.variantId !== "string" || !/^[a-z0-9._:-]{1,80}$/.test(input.variantId))) return "모델 구성 이름이 올바르지 않습니다.";
  return null;
}

export type EngineClientOptions = {
  /** 로그인한 회원 번호. 토큰과 접수 기록을 이 번호별로 나눠 둔다 */
  memberId: string;
  storage: KeyValueStore;
  fetch?: typeof globalThis.fetch;
  uuid?: () => string;
  now?: () => number;
};

export function createEngineClient(opts: EngineClientOptions) {
  const memberId = typeof opts.memberId === "string" ? opts.memberId.trim() : "";
  if (!/^[A-Za-z0-9-]{8,64}$/.test(memberId)) throw new EngineError("invalid", "회원 번호가 없어 엔진에 연결할 수 없습니다.");
  const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
  const uuid = opts.uuid ?? (() => globalThis.crypto.randomUUID());
  const now = opts.now ?? Date.now;
  const storage = opts.storage;
  const tokenKey = `fis.engineToken.v1:${memberId}`;
  const ledgerKey = `fis.submissions.v1:${memberId}`;
  // 연결 범위 표시: 엔진이 「이전 범위를 이어받았다」고 답한 짝짓기에서만 유지하고, 그 밖에는 새로 만든다.
  const linkKey = `fis.engineLink.v1:${memberId}`;

  // 회원 전환(dispose)·연결 해제·다시 연결이 일어나면 그 전에 보낸 요청의 응답은 버린다.
  let epoch = 0;
  let disposed = false;
  /** 접수 번호별로 보내기·확인을 한 번에 하나만(겹친 응답이 서로의 결과를 덮지 않게) */
  const busy = new Set<string>();
  const readLink = (): string | null => {
    try {
      return storage.getItem(linkKey) || null;
    } catch {
      return null;
    }
  };
  const alive = (e0: number) => {
    if (disposed || e0 !== epoch) throw new EngineError("stale", "연결이 바뀌어 이 응답은 쓰지 않습니다.");
  };

  const readToken = (): string | null => {
    try {
      return storage.getItem(tokenKey) || null;
    } catch {
      return null;
    }
  };

  async function request(path: string, init: { method?: string; body?: unknown; auth?: boolean; timeoutMs?: number } = {}): Promise<Response> {
    if (disposed) throw new EngineError("stale", "연결이 바뀌어 요청을 보내지 않았습니다.");
    if (!PATH.test(path) || path.includes("//")) throw new EngineError("invalid", "엔진 주소가 올바르지 않습니다.");
    const e0 = epoch;
    const token = init.auth === false ? null : readToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    let res: Response;
    try {
      res = await doFetch(ENGINE_URL + path, {
        method: init.method ?? "GET",
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
      });
    } catch {
      alive(e0);
      throw new EngineError("offline", OFFLINE);
    }
    alive(e0);
    if (res.ok) return res;
    let message = "";
    try {
      const data = (await res.json()) as { error?: unknown } | null;
      if (data && typeof data.error === "string") message = data.error.slice(0, 300);
    } catch {}
    alive(e0);
    if (res.status === 401 && path === "/pair") throw new EngineError("badCode", message || "연결 코드가 맞지 않습니다.", 401);
    if (res.status === 401) {
      // 이 요청에 쓴 토큰이 아직 그대로일 때만 지운다(그사이 새로 연결했다면 새 토큰을 지우지 않는다).
      try {
        if (token && storage.getItem(tokenKey) === token) storage.removeItem(tokenKey);
      } catch {}
    }
    throw new EngineError(KIND_OF[res.status] ?? "error", message || DEFAULT_MESSAGE[res.status] || `엔진 오류(${res.status})`, res.status);
  }

  async function requestJson(path: string, init?: Parameters<typeof request>[1]): Promise<Record<string, unknown>> {
    const e0 = epoch;
    const res = await request(path, init);
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      alive(e0);
      throw new EngineError("error", "엔진 응답을 읽지 못했습니다.", res.status);
    }
    alive(e0);
    if (!data || typeof data !== "object") throw new EngineError("error", "엔진 응답을 읽지 못했습니다.", res.status);
    return data as Record<string, unknown>;
  }

  // ── 접수 기록 ──
  function readLedger(): Submission[] {
    try {
      const data: unknown = JSON.parse(storage.getItem(ledgerKey) ?? "[]");
      return Array.isArray(data) ? (data.filter((s) => s && typeof s === "object" && typeof (s as Submission).requestId === "string") as Submission[]) : [];
    } catch {
      return [];
    }
  }
  function writeLedger(list: Submission[]) {
    // 끝난 기록부터 덜어 내고, 결과를 모르는 기록(unknown·pending·notReceived)은 지우지 않는다.
    let out = list;
    if (out.length > LEDGER_MAX) {
      const settled = out.filter((s) => s.state === "accepted" || s.state === "rejected").sort((a, b) => a.at - b.at);
      const drop = new Set(settled.slice(0, out.length - LEDGER_MAX).map((s) => s.requestId));
      out = out.filter((s) => !drop.has(s.requestId));
    }
    try {
      storage.setItem(ledgerKey, JSON.stringify(out));
    } catch {
      throw new EngineError("storage", "브라우저에 접수 기록을 적지 못했습니다. 저장 공간을 확인해 주세요.");
    }
  }
  /** only가 있으면 지금 상태가 그 가운데 하나일 때만 고친다(늦게 온 결과가 더 새로운 상태를 덮지 않게). 고쳤으면 true */
  function patch(requestId: string, change: Partial<Submission>, only?: Submission["state"][]): boolean {
    const list = readLedger();
    const i = list.findIndex((s) => s.requestId === requestId);
    if (i < 0 || (only && !only.includes(list[i].state))) return false;
    list[i] = { ...list[i], ...change };
    try {
      writeLedger(list);
      return true;
    } catch {
      return false;
    }
  }
  const asJob = (v: unknown): EngineJob | null => (v && typeof v === "object" && typeof (v as EngineJob).id === "string" && typeof (v as EngineJob).status === "string" ? (v as EngineJob) : null);

  /** 기록에 있는 접수를 엔진에 보낸다. 같은 접수 번호·같은 내용만 보낸다. */
  async function send(entry: Submission): Promise<{ requestId: string; state: "accepted"; job: EngineJob } | { requestId: string; state: "unknown" | "rejected"; error: EngineError }> {
    if (busy.has(entry.requestId)) throw new EngineError("invalid", "이 접수는 지금 처리하는 중입니다.");
    busy.add(entry.requestId);
    try {
      const data = await requestJson("/queue", {
        method: "POST",
        body: {
          kind: "art",
          title: entry.title,
          track: { id: entry.trackId, song_id: null, style_prompt: "", lyrics: "", duration_sec: 0, device: "", kind: "art" },
          clientRequestId: entry.requestId,
          task: entry.task,
        },
      });
      const job = asJob(data.job);
      // 엔진이 돌려준 작업이 이 접수 번호의 것이 아니면 받은 것으로 치지 않는다.
      if (!job || job.clientRequestId !== entry.requestId) {
        const error = new EngineError("error", "엔진 응답에서 접수 결과를 확인하지 못했습니다.");
        patch(entry.requestId, { state: "unknown", error: error.message, errorKind: error.kind });
        return { requestId: entry.requestId, state: "unknown", error };
      }
      patch(entry.requestId, { state: "accepted", jobId: job.id, error: undefined, errorKind: undefined });
      return { requestId: entry.requestId, state: "accepted", job };
    } catch (e) {
      const error = e instanceof EngineError ? e : new EngineError("error", "접수하지 못했습니다.");
      // 엔진이 넣기 전에 막은 것이 확실한 응답만 rejected. 응답 유실·서버 오류·넣은 뒤 실패일 수 있는 400은 unknown.
      const state = certainlyNotAccepted(error) ? "rejected" : "unknown";
      // 대기열이 가득 찬 400은 내용 문제가 아니라 잠시 뒤 같은 번호로 다시 보낼 수 있다.
      const errorKind = error.status === 400 && QUEUE_FULL_400.test(error.message) ? "busy" : error.kind;
      patch(entry.requestId, { state, error: error.message, errorKind });
      if (error.kind === "stale") throw error;
      return { requestId: entry.requestId, state, error };
    } finally {
      busy.delete(entry.requestId);
    }
  }

  return {
    memberId,

    /** 이 회원이 엔진과 연결돼 있는가(토큰이 있는가) */
    isPaired: () => !!readToken(),

    /** 엔진 상태 — 꺼져 있으면 null. 토큰을 보내지 않는다 */
    async getStatus(): Promise<{ name?: string; version?: string; features?: string[] } | null> {
      try {
        return await requestJson("/status", { auth: false, timeoutMs: 3000 });
      } catch (e) {
        if (e instanceof EngineError && e.kind === "stale") throw e;
        return null;
      }
    },

    /** 엔진 창의 6자리 코드로 연결. 이 회원의 이전 토큰이 있으면 함께 보내 작업 범위를 이어받는다 */
    async pair(code: string): Promise<{ inherited: boolean }> {
      const clean = typeof code === "string" ? code.trim() : "";
      if (!/^\d{6}$/.test(clean)) throw new EngineError("invalid", "연결 코드는 숫자 6자리입니다.");
      const prev = readToken();
      const data = await requestJson("/pair", { method: "POST", auth: false, body: prev ? { code: clean, prevToken: prev } : { code: clean } });
      if (typeof data.token !== "string" || !data.token) throw new EngineError("error", "연결하지 못했습니다. 다시 시도해 주세요.");
      try {
        storage.setItem(tokenKey, data.token);
      } catch {
        throw new EngineError("storage", "브라우저에 연결 정보를 적지 못했습니다.");
      }
      epoch += 1; // 이전 토큰으로 보낸 요청의 응답은 버린다
      const inherited = data.inherited === true;
      // 엔진이 이전 범위를 이어받았다고 답했고 이 브라우저에 그 범위 표시가 있을 때만 유지한다. 아니면 새 범위다.
      if (!(inherited && prev && readLink())) {
        try {
          storage.setItem(linkKey, uuid());
        } catch {
          throw new EngineError("storage", "브라우저에 연결 정보를 적지 못했습니다.");
        }
      }
      return { inherited };
    },

    /** 연결 끊기 — 이 브라우저의 토큰만 지운다(엔진의 기록 파일에는 남는다). 접수 기록은 남긴다 */
    disconnect() {
      epoch += 1;
      try {
        storage.removeItem(tokenKey);
        storage.removeItem(linkKey); // 다음 연결은 새 범위다
      } catch {}
    },

    /** 회원이 바뀌거나 화면을 떠날 때 부른다. 그 뒤에 도착한 응답은 모두 버린다 */
    dispose() {
      disposed = true;
    },

    getImageModels: () => requestJson("/image-models"),

    /** 자기 범위의 작업 목록 */
    async listJobs(): Promise<EngineJob[]> {
      const data = await requestJson("/queue");
      return Array.isArray(data.jobs) ? (data.jobs.map(asJob).filter(Boolean) as EngineJob[]) : [];
    },

    /**
     * 그림 한 장 접수. 접수 번호를 만들어 **기록에 먼저 적은 뒤** 보낸다.
     * 응답을 받지 못하면 state "unknown"으로 돌아온다 — 새 번호로 다시 넣지 말고 confirm()으로 확인한다.
     */
    async submit(input: SubmitInput) {
      const problem = checkArtInput(input);
      if (problem) throw new EngineError("invalid", problem);
      // 연결돼 있지 않으면 접수 기록도 만들지 않는다(어느 범위의 접수인지 적을 수 없다).
      if (!readToken()) throw new EngineError("needPair", DEFAULT_MESSAGE[401], 401);
      let link = readLink();
      if (!link) {
        link = uuid(); // 토큰만 있고 범위 표시가 없으면(저장소 일부가 지워짐) 이전 접수와 잇지 않는다
        try {
          storage.setItem(linkKey, link);
        } catch {
          throw new EngineError("storage", "브라우저에 연결 정보를 적지 못했습니다.");
        }
      }
      const requestId = uuid();
      const trackId = uuid();
      if (!REQUEST_ID.test(requestId) || !JOB_ID.test(trackId)) throw new EngineError("invalid", "접수 번호를 만들지 못했습니다.");
      const task: ArtTask = { prompt: input.prompt.trim() };
      if (input.variantId !== undefined) task.variantId = input.variantId;
      if (input.width !== undefined) (task.width = input.width), (task.height = input.height);
      if (input.seed !== undefined) task.seed = input.seed;
      const entry: Submission = { requestId, trackId, link, title: input.title.trim(), task, state: "pending", at: now() };
      const list = readLedger();
      if (list.some((s) => s.requestId === requestId)) throw new EngineError("invalid", "접수 번호가 겹쳤습니다. 다시 시도해 주세요.");
      writeLedger([...list, entry]); // 적지 못하면 여기서 멈추고 엔진에 보내지 않는다
      return send(entry);
    },

    /**
     * 결과를 모르는 접수를 같은 접수 번호로 물어본다. 엔진에 새 작업을 만들지 않는다.
     * 「엔진에 없음」을 미접수(notReceived)로 확정하는 조건 — 하나라도 아니면 unknown으로 둔다:
     *  1) 접수 당시와 같은 연결 범위다(otherScope가 아님)
     *  2) 목록 응답이 온전하다(jobs가 배열이고 모든 줄이 작업 모양)
     *  3) 접수한 지 CONFIRM_WINDOW_MS 안이다(tooOld가 아님)
     *  4) 이 접수보다 먼저 만든 작업이 목록에 남아 있다 — 그 사이 기록이 보존됐다는 근거(noEvidence가 아님).
     *     빈 목록, 나중 작업만 있는 목록은 「기록이 지워졌을 수 있음」과 구별되지 않는다.
     * 엔진 창에서 그 작업 하나만 손으로 지운 경우는 이 조건으로도 가려내지 못한다(문서의 한계).
     */
    async confirm(requestId: string): Promise<{ state: "accepted"; job: EngineJob | null } | { state: "notReceived" } | { state: "unknown"; reason: "otherScope" | "tooOld" | "noEvidence" }> {
      const entry = readLedger().find((s) => s.requestId === requestId);
      if (!entry) throw new EngineError("invalid", "접수 기록이 없습니다.");
      if (busy.has(requestId)) throw new EngineError("invalid", "이 접수는 지금 처리하는 중입니다.");
      const link = readLink();
      if (!link || entry.link !== link) {
        patch(requestId, { state: "unknown" }, ["pending"]);
        return { state: "unknown", reason: "otherScope" };
      }
      busy.add(requestId);
      try {
        const data = await requestJson("/queue");
        const rows = Array.isArray(data.jobs) ? data.jobs.map(asJob) : null;
        if (!rows || rows.some((j) => !j)) throw new EngineError("error", "엔진의 작업 목록을 읽지 못했습니다. 접수 상태는 그대로 두었습니다.");
        if (readLink() !== link) return { state: "unknown", reason: "otherScope" };
        const jobs = rows as EngineJob[];
        const job = jobs.find((j) => j.clientRequestId === requestId) ?? null;
        if (job) {
          patch(requestId, { state: "accepted", jobId: job.id, error: undefined, errorKind: undefined });
          return { state: "accepted", job };
        }
        // 이미 받은 것으로 적힌 접수는 목록에 없다고 되돌리지 않는다(끝난 작업을 지웠거나 정리됐을 수 있다).
        if (readLedger().find((s) => s.requestId === requestId)?.state === "accepted") return { state: "accepted", job: null };
        const settle = (reason: "tooOld" | "noEvidence") => {
          patch(requestId, { state: "unknown" }, ["pending"]);
          return { state: "unknown" as const, reason };
        };
        if (!(now() - entry.at >= 0 && now() - entry.at <= CONFIRM_WINDOW_MS)) return settle("tooOld");
        const kept = jobs.some((j) => {
          const t = Date.parse(j.createdAt ?? "");
          return Number.isFinite(t) && t <= entry.at;
        });
        if (!kept) return settle("noEvidence");
        // 그사이 다른 처리가 상태를 바꿨으면(예: accepted) 덮지 않는다.
        if (!patch(requestId, { state: "notReceived" }, ["unknown", "pending", "notReceived"])) return { state: "accepted", job: null };
        return { state: "notReceived" };
      } finally {
        busy.delete(requestId);
      }
    },

    /**
     * 엔진이 받지 않은 것이 확인된 접수를 **같은 번호·같은 내용**으로 다시 보낸다.
     * 결과를 모르는 접수는 confirm()부터, 연결 범위가 바뀐 접수는 다시 보내지 않는다(새로 접수해야 한다).
     */
    async resend(requestId: string) {
      const entry = readLedger().find((s) => s.requestId === requestId);
      if (!entry) throw new EngineError("invalid", "접수 기록이 없습니다.");
      if (busy.has(requestId)) throw new EngineError("invalid", "이 접수는 지금 처리하는 중입니다.");
      if (entry.state === "unknown" || entry.state === "pending") throw new EngineError("invalid", "엔진이 받았는지 먼저 확인해 주세요.");
      if (entry.state === "accepted") throw new EngineError("invalid", "이미 접수된 작업입니다.");
      if (!readLink() || entry.link !== readLink()) throw new EngineError("invalid", "엔진 연결이 바뀌어 이 접수는 다시 보낼 수 없습니다. 새로 접수해 주세요.");
      if (entry.errorKind === "conflict" || entry.errorKind === "invalid") throw new EngineError("invalid", "이 접수는 다시 보낼 수 없습니다. 내용을 고쳐 새로 접수해 주세요.");
      if (!patch(requestId, { state: "pending" }, ["notReceived", "rejected"])) throw new EngineError("invalid", "접수 상태가 바뀌었습니다. 다시 확인해 주세요.");
      return send({ ...entry, state: "pending" });
    },

    /** 접수 기록(이 회원 것만) */
    submissions: (): Submission[] => readLedger(),

    /** 지금 연결 범위에서 확인·다시 보내기를 할 수 있는 접수인가(범위가 바뀐 과거 접수는 false) */
    inCurrentScope(requestId: string): boolean {
      const link = readLink();
      return !!link && readLedger().some((s) => s.requestId === requestId && s.link === link);
    },

    /**
     * 접수 기록에서 지우기. 지금 범위에서 결과를 모르는 접수는 지우지 않는다(지우면 확인할 길이 없어진다).
     * 범위가 바뀌어 더는 확인할 수 없는 과거 접수는 지울 수 있다.
     */
    forget(requestId: string): boolean {
      const list = readLedger();
      const entry = list.find((s) => s.requestId === requestId);
      if (!entry || busy.has(requestId)) return false;
      const open = entry.state === "unknown" || entry.state === "pending";
      if (open && entry.link === readLink()) return false;
      writeLedger(list.filter((s) => s.requestId !== requestId));
      return true;
    },

    async cancel(jobId: string): Promise<void> {
      if (!JOB_ID.test(jobId)) throw new EngineError("invalid", "작업 번호가 올바르지 않습니다.");
      await requestJson(`/queue/${jobId}/cancel`, { method: "POST" });
    },

    /** 끝난 작업을 엔진 목록에서 지운다 */
    async dismiss(jobId: string): Promise<void> {
      if (!JOB_ID.test(jobId)) throw new EngineError("invalid", "작업 번호가 올바르지 않습니다.");
      await requestJson(`/queue/${jobId}`, { method: "DELETE" });
    },

    /** 그린 PNG. 자기 범위의 끝난 작업만 */
    async fetchArt(jobId: string): Promise<Blob> {
      if (!JOB_ID.test(jobId)) throw new EngineError("invalid", "작업 번호가 올바르지 않습니다.");
      const e0 = epoch;
      const res = await request(`/image-art/${jobId}`, { timeoutMs: 60_000 });
      if (!/^image\/png\b/i.test(res.headers.get("content-type") ?? "")) throw new EngineError("error", "그림 파일이 아닌 응답을 받았습니다.");
      const buf = await res.arrayBuffer();
      alive(e0);
      return new Blob([buf], { type: "image/png" });
    },
  };
}

export type EngineClient = ReturnType<typeof createEngineClient>;
