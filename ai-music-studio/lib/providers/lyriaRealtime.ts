import "server-only";

// Google Lyria RealTime(실험 모델 models/lyria-realtime-exp) — 서버 녹음 방식(2026-10-23 주인님 선택 「가」).
// 회원 키는 서버에서만 쓴다: 서버가 웹소켓으로 연결 → setup → 설명(weightedPrompts)·설정 → PLAY → 정한 길이만큼 소리 조각을 모아 → STOP → WAV로 저장.
// 연결·메시지 모양: 구글 공식 JS 라이브러리 원본(github.com/googleapis/js-genai src/music.ts·types.ts, 2026-10-23)과
// 공식 문서(ai.google.dev/gemini-api/docs/realtime-music-generation): 소리는 16비트 PCM 48kHz 스테레오, 연주곡만, 워터마크 포함.
// 유료 생성일 수 있으므로 생성이 시작된 뒤에는 다시 시도하지 않는다(이중 과금 방지). 연결 단계 거절만 다른 API 버전으로 한 번 더.
const MODEL = "models/lyria-realtime-exp";
const VERSIONS = ["v1beta", "v1alpha"] as const;
/** 첫 소리가 이 시간 안에 오지 않으면 실패로 본다 */
const FIRST_AUDIO_MS = 45_000;
/** 전체 녹음 상한(요청 길이 + 여유) — 서버 작업 300초 안 */
const MAX_TOTAL_MS = 230_000;

export interface RealtimeRequest {
  prompt: string;
  durationS: number;
  bpm?: number;
}

interface Chunk { data?: string; mimeType?: string }
type Msg = { setupComplete?: unknown; serverContent?: { audioChunks?: Chunk[] }; filteredPrompt?: { text?: string; filteredReason?: string }; error?: { message?: string } };

/** "audio/l16;rate=48000;channels=2" → 숫자(없으면 문서 기본값) */
export function pcmFormat(mime: string | undefined): { rate: number; channels: number } {
  const rate = Number(/rate=(\d+)/.exec(mime ?? "")?.[1] ?? 48000);
  const channels = Number(/channels=(\d+)/.exec(mime ?? "")?.[1] ?? 2);
  return { rate: rate > 0 ? rate : 48000, channels: channels > 0 ? channels : 2 };
}

/** 16비트 PCM 바이트에 WAV 머리글(44바이트)을 붙인다 */
export function pcmToWav(pcm: Uint8Array, rate: number, channels: number): Uint8Array {
  const out = new Uint8Array(44 + pcm.byteLength);
  const v = new DataView(out.buffer);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.byteLength, true); w(8, "WAVE");
  w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, channels, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * channels * 2, true); v.setUint16(32, channels * 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, pcm.byteLength, true);
  out.set(pcm, 44);
  return out;
}

async function textOf(data: unknown): Promise<string> {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (data && typeof (data as Blob).text === "function") return (data as Blob).text();
  return "";
}

class SetupRejected extends Error {}

function recordOnce(version: string, req: RealtimeRequest, apiKey: string): Promise<{ wav: Uint8Array; seconds: number }> {
  return new Promise((resolve, reject) => {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${version}.GenerativeService.BidiGenerateMusic?key=${encodeURIComponent(apiKey)}`;
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    const parts: Uint8Array[] = [];
    let bytes = 0;
    let fmt = { rate: 48000, channels: 2 };
    let target = 0;
    let started = false;
    let filtered = "";
    let done = false;
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(firstTimer); clearTimeout(totalTimer);
      try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ playbackControl: "STOP" })); } catch { /* 닫는 중 */ }
      try { ws.close(); } catch { /* 이미 닫힘 */ }
      if (err) return reject(err);
      const pcm = new Uint8Array(bytes);
      let o = 0;
      for (const p of parts) { pcm.set(p, o); o += p.byteLength; }
      const frame = fmt.channels * 2;
      const usable = pcm.subarray(0, Math.min(pcm.byteLength, target || pcm.byteLength) - (Math.min(pcm.byteLength, target || pcm.byteLength) % frame));
      resolve({ wav: pcmToWav(usable, fmt.rate, fmt.channels), seconds: Math.round(usable.byteLength / (fmt.rate * frame)) });
    };
    const firstTimer = setTimeout(() => finish(new Error(started ? "Lyria RealTime 소리가 오지 않았습니다. 잠시 뒤 다시 시도해 주세요." : "Lyria RealTime 연결이 시작되지 않았습니다.")), FIRST_AUDIO_MS);
    const totalTimer = setTimeout(() => (bytes > 0 ? finish() : finish(new Error("Lyria RealTime 녹음 시간이 초과됐습니다."))), MAX_TOTAL_MS);

    ws.onopen = () => ws.send(JSON.stringify({ setup: { model: MODEL } }));
    ws.onerror = () => finish(started ? new Error("Lyria RealTime 연결이 끊겼습니다.") : new SetupRejected("connect"));
    ws.onclose = (e: CloseEvent) => {
      if (done) return;
      if (!started) return finish(new SetupRejected(`close ${e.code}`));
      if (bytes > 0) return finish();
      const reason = e.reason ? ` 원문: ${e.reason.slice(0, 200)}` : "";
      const hint = e.code === 1008 || /key|permission|auth/i.test(e.reason) ? " API 키(결제 등록된 Gemini 키)를 확인해 주세요." : "";
      finish(new Error(`Lyria RealTime 연결이 닫혔습니다(${e.code}).${hint}${filtered ? ` 설명이 안전 필터에 걸렸습니다: ${filtered}` : ""}${reason}`));
    };
    ws.onmessage = async (ev: MessageEvent) => {
      let msg: Msg;
      try { msg = JSON.parse(await textOf(ev.data)) as Msg; } catch { return; }
      if (msg.setupComplete && !started) {
        started = true;
        ws.send(JSON.stringify({ clientContent: { weightedPrompts: [{ text: req.prompt.slice(0, 1000), weight: 1 }] } }));
        ws.send(JSON.stringify({ musicGenerationConfig: { ...(req.bpm ? { bpm: Math.min(200, Math.max(60, Math.round(req.bpm))) } : {}) } }));
        ws.send(JSON.stringify({ playbackControl: "PLAY" }));
        return;
      }
      if (msg.filteredPrompt) filtered = `${msg.filteredPrompt.text ?? ""} (${msg.filteredPrompt.filteredReason ?? ""})`.slice(0, 200);
      for (const c of msg.serverContent?.audioChunks ?? []) {
        if (!c.data) continue;
        if (!bytes) { fmt = pcmFormat(c.mimeType); target = req.durationS * fmt.rate * fmt.channels * 2; clearTimeout(firstTimer); }
        const b = new Uint8Array(Buffer.from(c.data, "base64"));
        parts.push(b); bytes += b.byteLength;
      }
      if (target && bytes >= target) finish();
    };
  });
}

/** 정한 길이(초)만큼 녹음해 WAV로 돌려준다. 연결 단계에서 거절되면 다른 API 버전으로 한 번 더(생성 전이라 비용 없음) */
export async function recordLyriaRealtime(req: RealtimeRequest, apiKey: string): Promise<{ data: Uint8Array; contentType: string; durationS: number }> {
  let last: unknown;
  for (const v of VERSIONS) {
    try {
      const r = await recordOnce(v, req, apiKey);
      if (r.seconds < 1) throw new Error("Lyria RealTime 소리가 거의 녹음되지 않았습니다. 다시 시도해 주세요.");
      return { data: r.wav, contentType: "audio/wav", durationS: r.seconds };
    } catch (e) {
      last = e;
      if (!(e instanceof SetupRejected)) throw e;
    }
  }
  throw new Error(`Lyria RealTime에 연결하지 못했습니다(${last instanceof Error ? last.message : "알 수 없음"}). 결제 등록된 Gemini 키인지, 실험 모델 사용이 가능한지 확인해 주세요.`);
}
