// 공용 기준 코드 `pc-renderer-client`(2026-10-24) — 기준 파일 ai-mastering-studio/src/lib/pcRenderer.ts.
// 사본은 직접 고치지 말고 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`(목록: docs/SHARED_MODULES.md).
// 「AIMaster 내 PC 고속 변환」(크롬 확장 → 회원 PC 실행기 → ffmpeg)과 이야기하는 명령 종류와 상관없는 부분:
// 확장·실행기·ffmpeg 감지(가능한 명령 목록 capabilities 포함), 파일 조각 올리기, 명령 실행·진행률, 결과 조각 받기.
// 확장·실행기는 video-to-gif/local-renderer(GIF 변환이 원래 쓰던 것과 같음), 로드맵 docs/analysis-pc-renderer-20261024/ROADMAP.md.
// 실행기에는 명령 문자열을 보내지 않는다 — 명령 종류와 숫자·정해진 낱말만 보내고 실행기가 범위를 다시 검사한다.

export const PC_RENDERER_EXT_ID = "efgimakonmphcdojhiegemjmpbokpcgk";
/** 설치 안내(확장·실행기·ffmpeg) — GIF 자동화 매뉴얼의 설치 절 */
export const PC_RENDERER_GUIDE_URL = "https://video-to-gif.buylife.xyz/guide";
const UPLOAD_CHUNK = 512 * 1024;

type Msg = { type: string; job?: string; req?: number; seq?: number; [key: string]: unknown };
type ChromePort = {
  postMessage(message: unknown): void;
  disconnect(): void;
  onMessage: { addListener(fn: (message: Msg) => void): void };
  onDisconnect: { addListener(fn: () => void): void };
};
type ChromeRuntime = { connect(extensionId: string): ChromePort };

function runtime(): ChromeRuntime | null {
  const chromeObj = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome;
  return chromeObj?.runtime?.connect ? chromeObj.runtime : null;
}

export type PcOs = "mac" | "windows" | "unknown";
export type PcRendererStatus =
  | { kind: "ready"; extVersion: string; hostVersion: string; os: PcOs; ffmpegVersion: string; capabilities: string[] }
  | { kind: "none" } // 확장 없음(설치 안 함·크롬·엣지 아님)
  | { kind: "no-host"; extVersion: string } // 확장은 있는데 실행기 설치 안 함
  | { kind: "no-ffmpeg"; extVersion: string; hostVersion: string; os: PcOs }
  | { kind: "old"; extVersion: string; hostVersion: string; os: PcOs; need: string }; // 실행기가 이 명령을 모름(업데이트 필요)

/** 「ffmpeg version 9.0.2-full_build…」 → 「9.0.2-full_build…」의 앞부분 */
export function shortFfmpegVersion(v: unknown): string {
  return String(v ?? "").replace(/^ffmpeg version\s+/, "").split(" ")[0];
}

/** pong 응답 → 상태(순수 함수, 시험용). need: 이 화면이 쓰려는 명령 이름 */
export function statusFromPong(pong: Msg, extVersion: string, need: string): PcRendererStatus {
  if (pong.type === "error") return { kind: "no-host", extVersion };
  const hostVersion = String(pong.hostVersion ?? "");
  const os: PcOs = pong.host === "perl" ? "mac" : pong.host === "powershell" ? "windows" : "unknown";
  if (!pong.ffmpeg) return { kind: "no-ffmpeg", extVersion, hostVersion, os };
  const capabilities = Array.isArray(pong.capabilities) ? pong.capabilities.map(String) : ["gif"]; // 1.00 실행기는 목록이 없음 = GIF만
  if (need && !capabilities.includes(need)) return { kind: "old", extVersion, hostVersion, os, need };
  return { kind: "ready", extVersion, hostVersion, os, ffmpegVersion: shortFfmpegVersion(pong.ffmpegVersion), capabilities };
}

class PcRendererError extends Error {}

class Port {
  private inbox: Msg[] = [];
  private waiters: { pred: (m: Msg) => boolean; resolve: (m: Msg) => void; reject: (e: Error) => void }[] = [];
  private closed = false;

  private constructor(private port: ChromePort) {
    port.onMessage.addListener((m) => this.deliver(m));
    port.onDisconnect.addListener(() => {
      this.closed = true;
      const err = new PcRendererError("내 PC 변환 연결이 끊겼습니다.");
      for (const w of this.waiters.splice(0)) w.reject(err);
    });
  }

  static open(): Port | null {
    const rt = runtime();
    if (!rt) return null;
    try {
      return new Port(rt.connect(PC_RENDERER_EXT_ID));
    } catch {
      return null;
    }
  }

  private deliver(m: Msg) {
    if (m.type === "error" && m.req === undefined && m.job === undefined) {
      for (const w of this.waiters.splice(0)) w.resolve(m);
      return;
    }
    const i = this.waiters.findIndex((w) => w.pred(m));
    if (i >= 0) this.waiters.splice(i, 1)[0].resolve(m);
    else this.inbox.push(m);
  }

  send(message: Msg) {
    if (this.closed) throw new PcRendererError("내 PC 변환 연결이 끊겼습니다.");
    this.port.postMessage(message);
  }

  wait(pred: (m: Msg) => boolean, timeoutMs: number): Promise<Msg> {
    const i = this.inbox.findIndex(pred);
    if (i >= 0) return Promise.resolve(this.inbox.splice(i, 1)[0]);
    if (this.closed) return Promise.reject(new PcRendererError("내 PC 변환 연결이 끊겼습니다."));
    return new Promise((resolve, reject) => {
      const waiter = { pred, resolve, reject };
      this.waiters.push(waiter);
      setTimeout(() => {
        const k = this.waiters.indexOf(waiter);
        if (k >= 0) {
          this.waiters.splice(k, 1);
          reject(new PcRendererError("내 PC 변환이 응답하지 않습니다."));
        }
      }, timeoutMs);
    });
  }

  close() {
    if (!this.closed) this.port.disconnect();
    this.closed = true;
  }
}

/** 확장·실행기·ffmpeg가 있고 need 명령을 아는지 확인한다(몇 초 안에 끝남). */
export async function detectPcRenderer(need: string): Promise<PcRendererStatus> {
  const port = Port.open();
  if (!port) return { kind: "none" };
  try {
    port.send({ type: "ext-hello" });
    const hello = await port.wait((m) => m.type === "ext-hello", 1500);
    port.send({ type: "ping" });
    const pong = await port.wait((m) => m.type === "pong" || m.type === "error", 5000);
    return statusFromPong(pong, String(hello.version ?? ""), need);
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

export type PcJobResult = { bytes: Uint8Array; info: Record<string, unknown> };

/**
 * 파일 하나를 실행기에 올리고 명령 하나를 실행해 결과 파일을 받는다(연결 하나 = 실행기 하나).
 * command: { type: "audio", ...검사받을 숫자·낱말 } — 실행기가 범위를 다시 검사한다.
 * 결과의 info에는 실행기가 result 메시지에 함께 담아 준 값(예: 측정한 음량)이 들어 있다.
 */
export async function runPcJob(
  file: Blob,
  command: { type: string; [key: string]: unknown },
  opts: { onUploaded?: (ratio: number) => void; onProgress?: (ratio: number) => void } = {},
): Promise<PcJobResult> {
  const port = Port.open();
  if (!port) throw new PcRendererError("내 PC 변환 확장을 찾지 못했습니다.");
  const job = "j" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const isMine = (m: Msg) => m.job === job || (m.type === "error" && m.job === undefined);
  try {
    port.send({ type: "begin", job, size: file.size });
    const begin = await port.wait((m) => isMine(m) && (m.type === "begin-ok" || m.type === "error"), 10_000);
    if (begin.type === "error") throw new PcRendererError(String(begin.message ?? "실행기를 시작하지 못했습니다."));
    for (let seq = 0, off = 0; off < file.size; seq++, off += UPLOAD_CHUNK) {
      const bytes = new Uint8Array(await file.slice(off, off + UPLOAD_CHUNK).arrayBuffer());
      port.send({ type: "chunk", job, seq, data: toBase64(bytes) });
      const ack = await port.wait((m) => isMine(m) && ((m.type === "chunk-ok" && m.seq === seq) || m.type === "error"), 30_000);
      if (ack.type === "error") throw new PcRendererError(String(ack.message ?? "파일을 넘기지 못했습니다."));
      opts.onUploaded?.(Math.min(1, (off + UPLOAD_CHUNK) / file.size));
    }
    port.send({ type: "end", job });
    const end = await port.wait((m) => isMine(m) && (m.type === "end-ok" || m.type === "error"), 30_000);
    if (end.type === "error") throw new PcRendererError(String(end.message ?? "파일을 넘기지 못했습니다."));

    const req = 1;
    const mine = (m: Msg) => (m.job === job && m.req === req) || (m.type === "error" && m.job === undefined);
    port.send({ ...command, job, req });
    let result: Msg;
    for (;;) {
      const m = await port.wait(mine, 600_000); // 진행 알림 없이 10분이면 멈춘 것으로 봄
      if (m.type === "progress") { opts.onProgress?.(Number(m.ratio) || 0); continue; }
      if (m.type === "result") { result = m; break; }
      throw new PcRendererError(String(m.message ?? "내 PC 변환에 실패했습니다."));
    }
    const out = new Uint8Array(Number(result.size));
    let off = 0;
    for (let i = 0; i < Number(result.chunks); i++) {
      const c = await port.wait((m) => mine(m) && m.type === "result-chunk" && m.seq === i, 60_000);
      const part = fromBase64(String(c.data ?? ""));
      out.set(part, off);
      off += part.length;
    }
    await port.wait((m) => mine(m) && m.type === "result-end", 60_000);
    if (off !== out.length) throw new PcRendererError("내 PC 변환 결과가 잘렸습니다.");
    const { type: _t, job: _j, req: _r, size: _s, chunks: _c, ...info } = result;
    return { bytes: out, info };
  } finally {
    try { port.send({ type: "release", job }); } catch { /* 이미 끊김 */ }
    port.close();
  }
}
