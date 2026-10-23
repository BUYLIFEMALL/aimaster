// v1.20: 「⚡ 내 PC 고속 변환」 — 크롬 확장(local-renderer/extension)을 거쳐 회원 PC의 ffmpeg로 GIF를 만든다.
// 확장이 없거나(크롬이 아니거나) 렌더러·ffmpeg가 없으면 detect가 이유를 돌려주고, 화면은 지금처럼 브라우저(wasm)로 변환한다.
// 약속: local-renderer/host/host.pl · host.ps1 맨 위 주석, 플랜 docs/PLAN_20261023_LOCAL_RENDERER.md.
// 렌더러에는 명령 문자열을 보내지 않는다 — 가로폭·fps·색 수·구간 숫자만 보낸다(렌더러가 범위를 다시 검사).

export const LOCAL_RENDERER_EXT_ID = "efgimakonmphcdojhiegemjmpbokpcgk";
const UPLOAD_CHUNK = 512 * 1024;

type Msg = { type: string; job?: string; req?: number; seq?: number; [key: string]: unknown };
type ChromePort = {
  postMessage(message: unknown): void;
  disconnect(): void;
  onMessage: { addListener(fn: (message: Msg) => void): void };
  onDisconnect: { addListener(fn: () => void): void };
};
type ChromeRuntime = { connect(extensionId: string): ChromePort; lastError?: { message?: string } };

function runtime(): ChromeRuntime | null {
  const chromeObj = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome;
  return chromeObj?.runtime?.connect ? chromeObj.runtime : null;
}

export type RendererStatus =
  | { kind: "ready"; extVersion: string; ffmpegVersion: string }
  | { kind: "none" } // 확장 없음(설치 안 함·크롬 아님)
  | { kind: "no-host"; extVersion: string } // 확장은 있는데 렌더러 설치 안 함
  | { kind: "no-ffmpeg"; extVersion: string };

class RendererError extends Error {}

/** 확장 하나와의 연결. 확장은 연결마다 렌더러 프로세스를 따로 띄운다(동시 변환 = 연결 여러 개). */
class RendererPort {
  private inbox: Msg[] = [];
  private waiters: { pred: (m: Msg) => boolean; resolve: (m: Msg) => void; reject: (e: Error) => void }[] = [];
  private closed = false;

  private constructor(private port: ChromePort) {
    port.onMessage.addListener((m) => this.deliver(m));
    port.onDisconnect.addListener(() => {
      this.closed = true;
      const err = new RendererError("내 PC 변환 연결이 끊겼습니다.");
      for (const w of this.waiters.splice(0)) w.reject(err);
    });
  }

  static open(): RendererPort | null {
    const rt = runtime();
    if (!rt) return null;
    try {
      return new RendererPort(rt.connect(LOCAL_RENDERER_EXT_ID));
    } catch {
      return null;
    }
  }

  private deliver(m: Msg) {
    // 렌더러 오류 중 요청 번호가 없는 것(연결 단위 오류)은 기다리는 쪽 모두에게 알린다.
    if (m.type === "error" && m.req === undefined && m.job === undefined) {
      for (const w of this.waiters.splice(0)) w.resolve(m);
      return;
    }
    const i = this.waiters.findIndex((w) => w.pred(m));
    if (i >= 0) this.waiters.splice(i, 1)[0].resolve(m);
    else this.inbox.push(m);
  }

  send(message: Msg) {
    if (this.closed) throw new RendererError("내 PC 변환 연결이 끊겼습니다.");
    this.port.postMessage(message);
  }

  wait(pred: (m: Msg) => boolean, timeoutMs: number): Promise<Msg> {
    const i = this.inbox.findIndex(pred);
    if (i >= 0) return Promise.resolve(this.inbox.splice(i, 1)[0]);
    if (this.closed) return Promise.reject(new RendererError("내 PC 변환 연결이 끊겼습니다."));
    return new Promise((resolve, reject) => {
      const waiter = { pred, resolve, reject };
      this.waiters.push(waiter);
      setTimeout(() => {
        const k = this.waiters.indexOf(waiter);
        if (k >= 0) {
          this.waiters.splice(k, 1);
          reject(new RendererError("내 PC 변환이 응답하지 않습니다."));
        }
      }, timeoutMs);
    });
  }

  close() {
    if (!this.closed) this.port.disconnect();
    this.closed = true;
  }
}

/** 확장·렌더러·ffmpeg가 있는지 확인한다(몇 초 안에 끝남). */
export async function detectLocalRenderer(): Promise<RendererStatus> {
  const port = RendererPort.open();
  if (!port) return { kind: "none" };
  try {
    port.send({ type: "ext-hello" });
    const hello = await port.wait((m) => m.type === "ext-hello", 1500);
    const extVersion = String(hello.version ?? "");
    port.send({ type: "ping" });
    const pong = await port.wait((m) => m.type === "pong" || m.type === "error", 5000);
    if (pong.type === "error") return { kind: "no-host", extVersion };
    if (!pong.ffmpeg) return { kind: "no-ffmpeg", extVersion };
    return { kind: "ready", extVersion, ffmpegVersion: String(pong.ffmpegVersion ?? "").replace(/^ffmpeg version\s+/, "").split(" ")[0] };
  } catch {
    return { kind: "none" };
  } finally {
    port.close();
  }
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as unknown as number[]);
  }
  return btoa(s);
}
function fromBase64(data: string): Uint8Array {
  const s = atob(data);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export type EncodeParams = { width: number; fps: number; colors: number; start?: number; duration?: number };

/** 영상을 한 번 올려 둔 렌더러 하나. encode는 한 번에 하나씩(렌더러가 순서대로 처리). */
class RendererWorker {
  private chain: Promise<unknown> = Promise.resolve();
  private reqSeq = 0;
  constructor(private port: RendererPort, private job: string) {}

  static async create(file: File, job: string, onUploaded?: (ratio: number) => void): Promise<RendererWorker> {
    const port = RendererPort.open();
    if (!port) throw new RendererError("내 PC 변환 확장을 찾지 못했습니다.");
    const isMine = (m: Msg) => m.job === job || (m.type === "error" && m.job === undefined);
    try {
      port.send({ type: "begin", job, size: file.size });
      const begin = await port.wait((m) => isMine(m) && (m.type === "begin-ok" || m.type === "error"), 10_000);
      if (begin.type === "error") throw new RendererError(String(begin.message ?? "렌더러를 시작하지 못했습니다."));
      for (let seq = 0, off = 0; off < file.size; seq++, off += UPLOAD_CHUNK) {
        const bytes = new Uint8Array(await file.slice(off, off + UPLOAD_CHUNK).arrayBuffer());
        port.send({ type: "chunk", job, seq, data: toBase64(bytes) });
        const ack = await port.wait((m) => isMine(m) && ((m.type === "chunk-ok" && m.seq === seq) || m.type === "error"), 30_000);
        if (ack.type === "error") throw new RendererError(String(ack.message ?? "영상을 넘기지 못했습니다."));
        onUploaded?.(Math.min(1, (off + UPLOAD_CHUNK) / file.size));
      }
      port.send({ type: "end", job });
      const end = await port.wait((m) => isMine(m) && (m.type === "end-ok" || m.type === "error"), 30_000);
      if (end.type === "error") throw new RendererError(String(end.message ?? "영상을 넘기지 못했습니다."));
      return new RendererWorker(port, job);
    } catch (error) {
      port.close();
      throw error;
    }
  }

  encode(params: EncodeParams, onProgress?: (ratio: number) => void): Promise<Uint8Array> {
    const run = async () => {
      const req = ++this.reqSeq;
      const mine = (m: Msg) => (m.job === this.job && m.req === req) || (m.type === "error" && m.job === undefined);
      this.port.send({ type: "encode", job: this.job, req, ...params });
      let result: Msg;
      for (;;) {
        // ffmpeg 한 단계가 아주 길 수 있어 진행 알림마다 다시 기다린다(알림 없이 10분이면 멈춘 것으로 봄).
        const m = await this.port.wait(mine, 600_000);
        if (m.type === "progress") {
          onProgress?.(Number(m.ratio) || 0);
          continue;
        }
        if (m.type === "result") {
          result = m;
          break;
        }
        throw new RendererError(String(m.message ?? "내 PC 변환에 실패했습니다."));
      }
      const chunks = Number(result.chunks);
      const out = new Uint8Array(Number(result.size));
      let off = 0;
      for (let i = 0; i < chunks; i++) {
        const c = await this.port.wait((m) => mine(m) && m.type === "result-chunk" && m.seq === i, 60_000);
        const part = fromBase64(String(c.data ?? ""));
        out.set(part, off);
        off += part.length;
      }
      await this.port.wait((m) => mine(m) && m.type === "result-end", 60_000);
      if (off !== out.length) throw new RendererError("내 PC 변환 결과가 잘렸습니다.");
      return out;
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => {});
    return p;
  }

  close() {
    try {
      this.port.send({ type: "release", job: this.job });
    } catch {
      // 이미 끊김
    }
    this.port.close();
  }
}

/**
 * 렌더러 여러 개(동시 변환 수 = slots)에 같은 영상을 올리고, encodeAt이 비어 있는 렌더러에 단계를 맡긴다.
 * 사다리 판단은 화면 쪽(gifLadder.runLadder)이 하고, 여기서는 「i단계를 만들어 달라」만 처리한다.
 */
export class LocalRendererPool {
  private workers: RendererWorker[] = [];
  private busy = new Set<RendererWorker>();
  private queue: (() => void)[] = [];

  static async create(file: File, slots: number, onUploaded?: (ratio: number) => void): Promise<LocalRendererPool> {
    const pool = new LocalRendererPool();
    const id = Math.random().toString(36).slice(2, 10);
    const progress = new Array(slots).fill(0);
    try {
      pool.workers = await Promise.all(
        Array.from({ length: slots }, (_, i) =>
          RendererWorker.create(file, `g${id}${i}`, (r) => {
            progress[i] = r;
            onUploaded?.(progress.reduce((a, b) => a + b, 0) / slots);
          }),
        ),
      );
    } catch (error) {
      pool.close();
      throw error;
    }
    return pool;
  }

  get size() {
    return this.workers.length;
  }

  async encode(params: EncodeParams, onProgress?: (ratio: number) => void): Promise<Uint8Array> {
    let worker = this.workers.find((w) => !this.busy.has(w));
    while (!worker) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
      worker = this.workers.find((w) => !this.busy.has(w));
    }
    this.busy.add(worker);
    try {
      return await worker.encode(params, onProgress);
    } finally {
      this.busy.delete(worker);
      this.queue.shift()?.();
    }
  }

  close() {
    for (const w of this.workers) w.close();
    this.workers = [];
  }
}

/** 동시에 돌릴 렌더러 수 — 코어 하나는 화면용으로 남기고 최대 4개. 큰 영상(100MB 초과)은 올리는 시간 때문에 2개까지. */
export function localSlots(fileBytes: number): number {
  const cores = typeof navigator !== "undefined" && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 2;
  const slots = Math.max(1, Math.min(4, cores - 1));
  return fileBytes > 100 * 1024 * 1024 ? Math.min(2, slots) : slots;
}
