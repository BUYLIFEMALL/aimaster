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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const JOB_STATUS = ["queued", "running", "done", "failed", "cancelled", "interrupted"];
const PATH = /^\/[A-Za-z0-9/-]*$/;
const LEDGER_MAX = 300;
// 엔진이 작업을 목록에 넣기 **전에** 돌려주는 400(e8e52b505 gateway.mjs handleScopedQueue · queue.mjs add).
// 엔진은 목록에 넣은 뒤 파일 저장을 기다리므로, 이 문구가 아닌 400은 「받았는지 모름」으로 본다.
const PRE_ADD_400 = [
  "그림 작업 내용이 올바르지 않습니다.",
  "접수 번호가 올바르지 않습니다.",
  "그릴 수 없는 크기입니다(1024×1024 · 1280×720 · 720×1280).",
  "시드 값이 올바르지 않습니다.",
  "그림 설명을 영어로 3단어 이상 적어 주세요(내 PC 그림 모델은 영어만 읽습니다).",
];
/** 넣기 전 거절 가운데 같은 번호로 다시 보내도 되는 종류(내용 문제·허용 안 됨·내용 충돌은 제외) */
const RETRYABLE: EngineErrorKind[] = ["busy", "closed", "needPair"];
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
 *  unknown     엔진이 받았는지 모름(응답 유실·서버 오류·넣은 뒤 실패일 수 있는 400). confirm()이 목록에서 같은 접수 번호를
 *              찾으면 accepted가 된다. **목록에 없다는 것은 미접수의 근거가 아니다** — 지금 엔진에는 「받지 않았다」를 알려 주는
 *              응답이 없고, 끝난 작업은 정리·삭제될 수 있다. 그래서 unknown은 다시 보내지 않는다
 *  rejected    엔진이 넣기 전에 거절한 것이 확실함(401·403·409·429·503, 사전 검사 400). error에 사유.
 *              이 가운데 다시 해 볼 만한 것(대기열 가득 참·잠시 뒤·닫힘·연결 필요)만 resend()가 같은 번호·같은 내용으로 보낸다
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
  state: "pending" | "accepted" | "unknown" | "rejected";
  jobId?: string;
  error?: string;
  errorKind?: EngineErrorKind;
  /** 이 접수를 만든 곳의 표시(예: 어느 묶음의 어느 항목). 엔진에는 보내지 않는다 */
  tag?: string;
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
  // 연결 기록 한 칸에 토큰과 연결 범위 표시를 **함께** 적는다({ v: 2, token, link }). 둘이 따로 저장돼 어긋나는 일이 없다.
  // 범위 표시는 엔진이 「이전 범위를 이어받았다」고 답한 짝짓기에서만 유지하고 그 밖에는 새로 만든다.
  // 이 모양이 아닌 값(이전 저장 형식의 토큰 문자열 등)은 연결로 치지 않는다 — 어느 범위인지 알 수 없어 새 범위와 잇지 않는다.
  const tokenKey = `fis.engineToken.v1:${memberId}`;
  const ledgerKey = `fis.submissions.v1:${memberId}`;
  const legacyLinkKey = `fis.engineLink.v1:${memberId}`; // 예전에 따로 두던 칸 — 읽지 않고, 연결을 바꿀 때 지우기만 한다

  // 회원 전환(dispose)·연결 해제·다시 연결이 일어나면 그 전에 보낸 요청의 응답은 버린다.
  let epoch = 0;
  let disposed = false;
  /** 접수 번호별로 보내기·확인을 한 번에 하나만(겹친 응답이 서로의 결과를 덮지 않게) */
  const busy = new Set<string>();
  const readSession = (): { token: string; link: string } | null => {
    try {
      const data: unknown = JSON.parse(storage.getItem(tokenKey) ?? "null");
      const d = data as { v?: unknown; token?: unknown; link?: unknown } | null;
      return d && typeof d === "object" && d.v === 2 && typeof d.token === "string" && d.token.length >= 16 && typeof d.link === "string" && JOB_ID.test(d.link) ? { token: d.token, link: d.link } : null;
    } catch {
      return null;
    }
  };
  const readLink = (): string | null => readSession()?.link ?? null;
  const alive = (e0: number) => {
    if (disposed || e0 !== epoch) throw new EngineError("stale", "연결이 바뀌어 이 응답은 쓰지 않습니다.");
  };

  const readToken = (): string | null => readSession()?.token ?? null;

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
        if (token && readToken() === token) storage.removeItem(tokenKey);
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
    // 끝난 기록부터 덜어 내고, 결과를 모르는 기록(unknown·pending)은 지우지 않는다.
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
  /**
   * 엔진이 돌려준 작업 한 줄이 계약대로인지(e8e52b505 queue.mjs add·publicJob, gateway handleScopedQueue):
   * 번호는 UUID, 종류는 그림, 상태는 여섯 가지 가운데 하나, 접수 번호는 접수 번호 형식. 하나라도 아니면 null.
   */
  const asJob = (v: unknown): EngineJob | null => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const j = v as Record<string, unknown>;
    if (typeof j.id !== "string" || !UUID.test(j.id)) return null;
    if (j.kind !== "art") return null;
    if (typeof j.status !== "string" || !JOB_STATUS.includes(j.status)) return null;
    if (typeof j.clientRequestId !== "string" || !REQUEST_ID.test(j.clientRequestId)) return null;
    return v as EngineJob;
  };

  /** 기록에 있는 접수를 엔진에 보낸다. 같은 접수 번호·같은 내용만 보낸다. */
  type SendResult = { requestId: string; state: "accepted"; job: EngineJob | null } | { requestId: string; state: "unknown" | "rejected"; error: EngineError };
  /**
   * 전송이 실패·불명으로 끝났을 때 기록에 적는다. 기록이 아직 「보내는 중」일 때만 고친다 —
   * 그사이 다른 화면이 이 접수를 접수됨으로 확인했다면 그 결과를 따른다(늦은 실패가 접수됨을 덮지 않는다).
   */
  function settle(requestId: string, state: "unknown" | "rejected", error: EngineError, errorKind: EngineErrorKind): SendResult {
    if (patch(requestId, { state, error: error.message, errorKind }, ["pending"])) return { requestId, state, error };
    const current = readLedger().find((x) => x.requestId === requestId);
    if (current?.state === "accepted") return { requestId, state: "accepted", job: null };
    return { requestId, state: current?.state === "rejected" ? "rejected" : "unknown", error };
  }
  async function send(entry: Submission): Promise<SendResult> {
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
      // 엔진이 돌려준 작업이 계약 모양이 아니거나 이 접수 번호의 것이 아니면 받은 것으로 치지 않는다(작업 번호를 적지 않는다).
      if (!job || job.clientRequestId !== entry.requestId) {
        const error = new EngineError("error", "엔진 응답에서 접수 결과를 확인하지 못했습니다.");
        return settle(entry.requestId, "unknown", error, error.kind);
      }
      patch(entry.requestId, { state: "accepted", jobId: job.id, error: undefined, errorKind: undefined });
      return { requestId: entry.requestId, state: "accepted", job };
    } catch (e) {
      const error = e instanceof EngineError ? e : new EngineError("error", "접수하지 못했습니다.");
      // 엔진이 넣기 전에 막은 것이 확실한 응답만 rejected. 응답 유실·서버 오류·넣은 뒤 실패일 수 있는 400은 unknown.
      const state = certainlyNotAccepted(error) ? "rejected" : "unknown";
      // 대기열이 가득 찬 400은 내용 문제가 아니라 잠시 뒤 같은 번호로 다시 보낼 수 있다.
      const errorKind = error.status === 400 && QUEUE_FULL_400.test(error.message) ? "busy" : error.kind;
      const result = settle(entry.requestId, state, error, errorKind);
      if (error.kind === "stale") throw error;
      return result;
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
      const prev = readSession();
      const data = await requestJson("/pair", { method: "POST", auth: false, body: prev ? { code: clean, prevToken: prev.token } : { code: clean } });
      if (typeof data.token !== "string" || data.token.length < 16) throw new EngineError("error", "연결하지 못했습니다. 다시 시도해 주세요.");
      const inherited = data.inherited === true;
      // 엔진이 이전 범위를 이어받았다고 답했고 그 이전 연결 기록이 **지금도 그대로**일 때만 범위 표시를 유지한다. 아니면 새 범위다.
      const now0 = readSession();
      const link = inherited && prev && now0 && now0.token === prev.token ? prev.link : uuid();
      if (!JOB_ID.test(link)) throw new EngineError("error", "연결하지 못했습니다. 다시 시도해 주세요.");
      try {
        storage.setItem(tokenKey, JSON.stringify({ v: 2, token: data.token, link })); // 토큰과 범위 표시를 한 번에
      } catch {
        // 적지 못했으면 앞 연결 기록(토큰·범위 표시)이 통째로 그대로다. 새 토큰과 옛 범위가 섞인 상태는 생기지 않는다.
        throw new EngineError("storage", "브라우저에 연결 정보를 적지 못했습니다.");
      }
      epoch += 1; // 이전 토큰으로 보낸 요청의 응답은 버린다
      try {
        storage.removeItem(legacyLinkKey);
      } catch {}
      return { inherited };
    },

    /** 연결 끊기 — 이 브라우저의 토큰만 지운다(엔진의 기록 파일에는 남는다). 접수 기록은 남긴다 */
    disconnect() {
      epoch += 1;
      try {
        storage.removeItem(tokenKey); // 토큰과 범위 표시가 함께 사라진다 — 다음 연결은 새 범위다
        storage.removeItem(legacyLinkKey);
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
      const rows = Array.isArray(data.jobs) ? data.jobs.map(asJob) : null;
      // 모양이 다른 줄을 조용히 빼면 「작업이 없다」로 보이므로, 온전하지 않은 목록은 통째로 오류로 돌린다.
      if (!rows || rows.some((j) => !j)) throw new EngineError("error", "엔진의 작업 목록을 읽지 못했습니다.");
      return rows as EngineJob[];
    },

    /**
     * 그림 한 장 접수. 접수 번호를 만들어 **기록에 먼저 적은 뒤** 보낸다.
     * 응답을 받지 못하면 state "unknown"으로 돌아온다 — 새 번호로 다시 넣지 말고 confirm()으로 확인한다.
     */
    /**
     * opts.requestId: 부르는 쪽이 **미리 정해 자기 기록에 적어 둔** 접수 번호를 쓴다(묶음의 항목과 접수를 보내기 전에 잇기 위해).
     *   이미 접수 기록에 있는 번호면 보내지 않고 거절한다 — 같은 번호로 두 번 접수하지 않는다.
     * opts.tag: 이 접수를 만든 곳의 표시. 접수 기록에만 남는다.
     */
    async submit(input: SubmitInput, opts: { requestId?: string; tag?: string } = {}) {
      const problem = checkArtInput(input);
      if (problem) throw new EngineError("invalid", problem);
      // 연결돼 있지 않으면 접수 기록도 만들지 않는다(어느 범위의 접수인지 적을 수 없다).
      const session = readSession();
      if (!session) throw new EngineError("needPair", DEFAULT_MESSAGE[401], 401);
      const link = session.link;
      if (opts.requestId !== undefined && (typeof opts.requestId !== "string" || !REQUEST_ID.test(opts.requestId))) throw new EngineError("invalid", "접수 번호가 올바르지 않습니다.");
      const requestId = opts.requestId ?? uuid();
      const trackId = uuid();
      if (!REQUEST_ID.test(requestId) || !JOB_ID.test(trackId)) throw new EngineError("invalid", "접수 번호를 만들지 못했습니다.");
      const task: ArtTask = { prompt: input.prompt.trim() };
      if (input.variantId !== undefined) task.variantId = input.variantId;
      if (input.width !== undefined) (task.width = input.width), (task.height = input.height);
      if (input.seed !== undefined) task.seed = input.seed;
      const entry: Submission = { requestId, trackId, link, title: input.title.trim(), task, state: "pending", at: now() };
      if (typeof opts.tag === "string" && opts.tag) entry.tag = opts.tag.slice(0, 120);
      const list = readLedger();
      if (list.some((s) => s.requestId === requestId)) throw new EngineError("invalid", opts.requestId ? "이미 접수 기록에 있는 접수 번호입니다." : "접수 번호가 겹쳤습니다. 다시 시도해 주세요.");
      writeLedger([...list, entry]); // 적지 못하면 여기서 멈추고 엔진에 보내지 않는다
      return send(entry);
    },

    /**
     * 결과를 모르는 접수를 같은 접수 번호로 물어본다. 엔진에 새 작업을 만들지 않는다.
     * 목록에서 같은 접수 번호를 찾았을 때만 accepted로 확정한다. 찾지 못하면 unknown 그대로다:
     *  - otherScope  접수 당시와 연결 범위가 다르다(엔진에 묻지 않는다)
     *  - notListed   같은 범위의 온전한 목록에 없다 — 받지 않았을 수도, 받은 뒤 정리·삭제됐을 수도 있다
     * 목록 응답이 온전하지 않으면(jobs가 배열이 아니거나 작업 모양이 아닌 줄이 있음) 예외를 던지고 상태를 그대로 둔다.
     */
    async confirm(requestId: string): Promise<{ state: "accepted"; job: EngineJob | null } | { state: "unknown"; reason: "otherScope" | "notListed" }> {
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
        const job = (rows as EngineJob[]).find((j) => j.clientRequestId === requestId) ?? null;
        if (job) {
          patch(requestId, { state: "accepted", jobId: job.id, error: undefined, errorKind: undefined });
          return { state: "accepted", job };
        }
        // 이미 받은 것으로 적힌 접수는 목록에 없다고 되돌리지 않는다(끝난 작업을 지웠거나 정리됐을 수 있다).
        if (readLedger().find((s) => s.requestId === requestId)?.state === "accepted") return { state: "accepted", job: null };
        // 보내는 중에 멈춘 기록(pending)만 unknown으로 정리한다. 거절이 확실한 기록(rejected)은 그대로 둔다.
        patch(requestId, { state: "unknown" }, ["pending"]);
        return { state: "unknown", reason: "notListed" };
      } finally {
        busy.delete(requestId);
      }
    },

    /**
     * 엔진이 **넣기 전에 거절한 것이 확실하고 다시 해 볼 만한** 접수만 같은 번호·같은 내용으로 다시 보낸다
     * (대기열 가득 참·잠시 뒤·엔진이 닫힘·연결 필요). 결과를 모르는 접수(unknown)는 다시 보내지 않는다 —
     * 엔진이 받았을 수 있고, 받았다면 같은 그림이 두 번 그려질 수 있어 화면이 사용자에게 알리고 새 접수를 고르게 한다.
     * 연결 범위가 바뀐 접수도 다시 보내지 않는다.
     */
    async resend(requestId: string) {
      const entry = readLedger().find((s) => s.requestId === requestId);
      if (!entry) throw new EngineError("invalid", "접수 기록이 없습니다.");
      if (busy.has(requestId)) throw new EngineError("invalid", "이 접수는 지금 처리하는 중입니다.");
      if (entry.state === "accepted") throw new EngineError("invalid", "이미 접수된 작업입니다.");
      if (entry.state !== "rejected") throw new EngineError("invalid", "엔진이 받았는지 알 수 없는 접수는 다시 보내지 않습니다.");
      if (!readLink() || entry.link !== readLink()) throw new EngineError("invalid", "엔진 연결이 바뀌어 이 접수는 다시 보낼 수 없습니다. 새로 접수해 주세요.");
      if (!entry.errorKind || !RETRYABLE.includes(entry.errorKind)) throw new EngineError("invalid", "이 접수는 다시 보낼 수 없습니다. 내용을 고쳐 새로 접수해 주세요.");
      if (!patch(requestId, { state: "pending" }, ["rejected"])) throw new EngineError("invalid", "접수 상태가 바뀌었습니다. 다시 확인해 주세요.");
      return send({ ...entry, state: "pending" });
    },

    /** 이 접수를 resend()로 다시 보낼 수 있는가 */
    canResend(requestId: string): boolean {
      const entry = readLedger().find((s) => s.requestId === requestId);
      return !!entry && !busy.has(requestId) && entry.state === "rejected" && !!entry.errorKind && RETRYABLE.includes(entry.errorKind) && !!readLink() && entry.link === readLink();
    },

    /** 접수 기록(이 회원 것만) */
    submissions: (): Submission[] => readLedger(),

    /** 지금 연결 범위의 표시(연결돼 있지 않으면 null). 다시 연결해 범위를 이어받는 동안 같은 값이다 */
    scopeId: (): string | null => readLink(),

    /** 지금 연결 범위에서 확인·다시 보내기를 할 수 있는 접수인가(범위가 바뀐 과거 접수는 false) */
    inCurrentScope(requestId: string): boolean {
      const link = readLink();
      return !!link && readLedger().some((s) => s.requestId === requestId && s.link === link);
    },

    /**
     * 접수 기록에서 지우기. 보내는 중(pending)인 접수는 지우지 않는다.
     * 결과를 모르는 접수(unknown)는 force일 때만 지운다 — 화면이 「엔진이 이미 그렸을 수 있음」을 알린 뒤 사용자가 고른 경우.
     * 범위가 바뀌어 더는 확인할 수 없는 과거 접수는 그냥 지울 수 있다.
     */
    forget(requestId: string, opts: { force?: boolean } = {}): boolean {
      const list = readLedger();
      const entry = list.find((s) => s.requestId === requestId);
      if (!entry || busy.has(requestId)) return false;
      const sameScope = entry.link === readLink();
      if (entry.state === "pending" && sameScope) return false;
      if (entry.state === "unknown" && sameScope && !opts.force) return false;
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
