// [공용 기준 코드 `ai-video-client` — 기준: ai-video-studio/lib/video/videoProviders.ts(2026-10-23 ai-image-studio에서 이전), 사본: ai-image-studio/lib/video/·
//  shorts-onestop-studio/src/lib/·shots/src/lib/video/·music-video-studio/src/lib/video/. 사본은 직접 고치지 말고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`]
// AI 동영상 업체 호출(회원 본인 키): Gemini Omni Flash(Interactions API)·fal(대기열)·Replicate(예측) — 「제출 → 상태 확인 → 영상 바이트」.
// 영상은 1~5분 걸려 한 번의 요청으로 기다리면 Vercel 300초 제한에 걸리므로 제출 번호를 저장하고 화면이 몇 초마다 확인한다.
// 이 파일은 프로그램 고유 모듈(오류 클래스·저장소·권한)을 쓰지 않는다 — 오류는 VideoGenError로 던지고, 각 프로그램이 자기 오류 형식·저장소로 바꾼다.
// 이중 과금 방지: 자동 재시도 없음. 키를 실어 보내는 주소는 업체 공식 호스트만(isHost).
// 외부 무료배포 shorts-auto(라이선스 없음)의 코드는 쓰지 않고 새로 만들었다(docs/analysis-shorts-auto-20261022).
import type { FalInputSpec, VideoJob, VideoModel, VideoProvider } from "./videoModels";
import { falState, findGeminiVideo, geminiState, isHost, isJobId, replicateOutputUrl, replicateState } from "./videoParse";

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const MAX_FRAME_BYTES = 10 * 1024 * 1024;
const NAME: Record<VideoProvider, string> = { gemini: "Google Gemini", fal: "fal", replicate: "Replicate" };

/** code: key(키 거절) · quota(한도·결제) · model(모델 없음) · input(요청 거절) · frame(장면 사진 문제) · timeout · empty(결과 없음) · provider(그 밖) */
export class VideoGenError extends Error {
  constructor(public status: number, public code: "key" | "quota" | "model" | "input" | "frame" | "timeout" | "empty" | "provider", message: string) { super(message); }
}

export type SubmitResult = { job: VideoJob } | { bytes: Buffer };
export type CheckResult = { state: "running" } | { state: "done"; bytes: Buffer };

async function providerError(provider: VideoProvider, res: Response): Promise<never> {
  const text = (await res.text().catch(() => "")).slice(0, 400);
  const n = NAME[provider];
  const billing = "Gemini 영상 생성은 결제가 연결된 키에서만 됩니다. Google AI Studio에서 결제(유료 등급)를 연결해 주세요.";
  if (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(text)) throw new VideoGenError(400, "key", `${n}가 키를 거절했습니다. API키등록·플랫폼연동에서 본인 ${n} 키를 확인해 주세요.`);
  if (res.status === 401 || res.status === 403) {
    if (provider === "gemini" && /billing|free tier|paid|FAILED_PRECONDITION/i.test(text)) throw new VideoGenError(402, "quota", billing);
    throw new VideoGenError(400, "key", `${n}가 키를 거절했습니다. API키등록·플랫폼연동에서 본인 ${n} 키를 확인해 주세요.`);
  }
  if (res.status === 402) throw new VideoGenError(402, "quota", `본인 ${n} 계정의 잔액·결제 설정을 확인해 주세요.`);
  if (res.status === 429) throw new VideoGenError(429, "quota", `본인 ${n} 계정의 사용 한도에 걸렸습니다. 잠시 후 다시 시도하거나 결제 설정을 확인해 주세요.`);
  if (res.status === 400 && provider === "gemini" && /billing|free tier|paid/i.test(text)) throw new VideoGenError(402, "quota", billing);
  if (res.status === 404) throw new VideoGenError(422, "model", `${n}에서 이 영상 모델을 쓸 수 없습니다. 다른 모델을 골라 주세요.`);
  if (res.status === 400 || res.status === 422) throw new VideoGenError(422, "input", `${n}가 요청을 받지 않았습니다(장면 사진·설명을 바꿔 보세요). ${text.replace(/\s+/g, " ").slice(0, 160)}`);
  throw new VideoGenError(502, "provider", `${n} 서버가 응답하지 않습니다(${res.status}). 잠시 후 다시 시도해 주세요.`);
}

async function fetchFrame(url: string): Promise<{ data: string; mime: string }> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!res?.ok) throw new VideoGenError(400, "frame", "장면 사진을 불러오지 못했습니다. 사진을 다시 고른 뒤 시도해 주세요.");
  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!/^image\/(png|jpeg|webp)$/.test(mime)) throw new VideoGenError(400, "frame", "사진(PNG·JPG·WEBP)만 영상의 시작·끝 화면으로 쓸 수 있습니다.");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_FRAME_BYTES) throw new VideoGenError(400, "frame", "장면 사진이 너무 큽니다(10MB 이하).");
  return { data: buf.toString("base64"), mime };
}

/** 결과 영상 받기. 다운로드 주소에는 키를 보내지 않는다(Gemini 파일 주소만 예외, 호스트 확인 후) */
async function download(url: string, maxBytes: number, headers?: Record<string, string>): Promise<Buffer> {
  const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(120_000) }).catch(() => null);
  if (!res?.ok) throw new VideoGenError(502, "provider", "만든 영상을 받아오지 못했습니다. 잠시 후 다시 확인해 주세요.");
  if (Number(res.headers.get("content-length") ?? 0) > maxBytes) throw new VideoGenError(502, "provider", `영상 파일이 너무 큽니다(${Math.round(maxBytes / 1048576)}MB 초과).`);
  return checkBytes(Buffer.from(await res.arrayBuffer()), maxBytes);
}

function checkBytes(b: Buffer, maxBytes: number): Buffer {
  if (b.length < 1000) throw new VideoGenError(502, "empty", "업체가 빈 영상을 돌려주었습니다. 다시 시도해 주세요.");
  if (b.length > maxBytes) throw new VideoGenError(502, "provider", `영상 파일이 너무 큽니다(${Math.round(maxBytes / 1048576)}MB 초과). 더 낮은 화질 모델을 골라 주세요.`);
  return b;
}

async function geminiVideoBytes(json: unknown, key: string, maxBytes: number): Promise<Buffer | null> {
  const v = findGeminiVideo(json);
  if (!v) return null;
  if (v.data) return checkBytes(Buffer.from(v.data, "base64"), maxBytes);
  if (v.uri && isHost(v.uri, ["generativelanguage.googleapis.com"])) {
    const u = v.uri.includes(":download") ? v.uri : `${v.uri.split("?")[0]}:download?alt=media`;
    return download(u, maxBytes, { "x-goog-api-key": key });
  }
  return null;
}

/** 2026-10-23 fal 입력 칸 규칙(FalInputSpec)대로 요청 본문을 만든다 — 모델마다 사진 칸·길이 형식·소리 칸 이름이 다르다 */
export function falInput(spec: FalInputSpec, prompt: string, startUrl: string, endUrl: string | undefined, seconds: number, aspect: "9:16" | "16:9", resolution?: string): Record<string, unknown> {
  const input: Record<string, unknown> = { prompt, [spec.image]: startUrl };
  input.duration = spec.duration === "int" ? seconds : spec.duration === "s" ? `${seconds}s` : String(seconds);
  if (endUrl) input.end_image_url = endUrl;
  if (spec.audio) input[spec.audio] = false;
  if (spec.aspect) input.aspect_ratio = aspect;
  if (spec.resolutions?.length) input.resolution = resolution && spec.resolutions.includes(resolution) ? resolution : spec.resolutions[0];
  return input;
}

// ── 제출 ─────────────────────────────────────────────
// prompt는 호출하는 쪽이 만든다(videoModels.ts motionPrompt 권장). endUrl은 모델이 끝 화면을 지원할 때만 쓴다.
// startUrl·endUrl은 https 주소 또는 data:image/...;base64 주소. startUrl 생략(글만으로 생성)은 Gemini만 된다.
// aspectRatio는 기본 9:16(세로 쇼츠) — 2026-10-23 뮤직비디오(16:9 가로)용으로 추가, Gemini·fal Seedance에 적용.
export async function submitVideoJob(o: { key: string; model: VideoModel; prompt: string; startUrl?: string; endUrl?: string; seconds: number; maxBytes?: number; aspectRatio?: "9:16" | "16:9"; resolution?: string }): Promise<SubmitResult> {
  const maxBytes = o.maxBytes ?? 30 * 1024 * 1024;
  const withEnd = !!o.startUrl && !!o.endUrl && o.model.endFrame;
  const aspect = o.aspectRatio ?? "9:16";
  const base = { provider: o.model.provider, model: o.model.id, withEnd, startedAt: new Date().toISOString(), seconds: o.seconds };

  if (o.model.provider !== "gemini" && !o.startUrl) throw new VideoGenError(400, "frame", "이 영상 모델은 시작 장면 사진이 필요합니다. 장면 사진을 먼저 만들어 주세요.");

  if (o.model.provider === "gemini") {
    const frames = [...(o.startUrl ? [await fetchFrame(o.startUrl)] : []), ...(withEnd ? [await fetchFrame(o.endUrl!)] : [])];
    const body = (background: boolean) => JSON.stringify({
      model: o.model.id,
      input: [...frames.map((f) => ({ type: "image", data: f.data, mime_type: f.mime })), { type: "text", text: `${o.prompt} About ${o.seconds} seconds long.` }],
      response_format: { type: "video", aspect_ratio: aspect, resolution: "720p" },
      ...(background ? { background: true, store: true } : {}),
    });
    const headers = { "x-goog-api-key": o.key, "Content-Type": "application/json" };
    let res = await fetch(`${GEMINI}/interactions`, { method: "POST", headers, body: body(true), cache: "no-store", signal: AbortSignal.timeout(60_000) });
    if (res.status === 400 && /background/i.test(await res.clone().text())) {
      // 백그라운드 실행을 이 모델이 받지 않으면(거절은 요금 없음) 한 번에 기다리는 방식으로 다시 보낸다 — 최대 270초
      res = await fetch(`${GEMINI}/interactions`, { method: "POST", headers, body: body(false), cache: "no-store", signal: AbortSignal.timeout(270_000) }).catch(() => {
        throw new VideoGenError(504, "timeout", "Gemini 영상 응답을 기다리다 시간이 지났습니다. 구글 쪽에서는 이미 만들어져 요금이 나갔을 수 있으니, 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.");
      });
    }
    if (!res.ok) await providerError("gemini", res);
    const json = (await res.json()) as { id?: string; status?: string };
    const bytes = geminiState(json.status) === "done" || !json.id ? await geminiVideoBytes(json, o.key, maxBytes) : null;
    if (bytes) return { bytes };
    if (!json.id || !isJobId(json.id)) throw new VideoGenError(502, "provider", "Gemini가 영상 작업 번호를 돌려주지 않았습니다. 잠시 후 다시 시도해 주세요.");
    return { job: { ...base, id: json.id } };
  }

  if (o.model.provider === "fal") {
    const spec = o.model.fal;
    const input: Record<string, unknown> = spec
      ? falInput(spec, o.prompt, o.startUrl!, withEnd ? o.endUrl : undefined, o.seconds, aspect, o.resolution)
      : { prompt: o.prompt, image_url: o.startUrl, duration: String(o.seconds), generate_audio: false };
    if (!spec && withEnd) input.end_image_url = o.endUrl;
    if (!spec && o.model.id.includes("seedance")) Object.assign(input, { resolution: "720p", aspect_ratio: aspect });
    const res = await fetch(`https://queue.fal.run/${o.model.id}`, { method: "POST", headers: { Authorization: `Key ${o.key}`, "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store", signal: AbortSignal.timeout(60_000) });
    if (!res.ok) await providerError("fal", res);
    const json = (await res.json()) as { request_id?: string; status_url?: string; response_url?: string };
    if (!isJobId(json.request_id) || !isHost(json.status_url, ["queue.fal.run"]) || !isHost(json.response_url, ["queue.fal.run"])) throw new VideoGenError(502, "provider", "fal이 작업 번호를 돌려주지 않았습니다. 잠시 후 다시 시도해 주세요.");
    return { job: { ...base, id: json.request_id, statusUrl: json.status_url, responseUrl: json.response_url } };
  }

  // replicate
  const input: Record<string, unknown> = o.model.id.includes("kling")
    ? { prompt: o.prompt, start_image: o.startUrl, duration: o.seconds, mode: withEnd ? "pro" : "standard", ...(withEnd ? { end_image: o.endUrl } : {}) }
    : { prompt: o.prompt, image: o.startUrl, duration: o.seconds, resolution: "720p", camera_fixed: false, ...(withEnd ? { last_frame_image: o.endUrl } : {}) };
  const res = await fetch(`https://api.replicate.com/v1/models/${o.model.id}/predictions`, { method: "POST", headers: { Authorization: `Bearer ${o.key}`, "Content-Type": "application/json" }, body: JSON.stringify({ input }), cache: "no-store", signal: AbortSignal.timeout(60_000) });
  if (!res.ok) await providerError("replicate", res);
  const json = (await res.json()) as { id?: string };
  if (!isJobId(json.id)) throw new VideoGenError(502, "provider", "Replicate가 작업 번호를 돌려주지 않았습니다. 잠시 후 다시 시도해 주세요.");
  return { job: { ...base, id: json.id } };
}

// ── 상태 확인(끝났으면 영상 바이트) ─────────────────────
export async function checkVideoJob(o: { key: string; job: VideoJob; maxBytes?: number }): Promise<CheckResult> {
  const maxBytes = o.maxBytes ?? 30 * 1024 * 1024;
  const { job } = o;
  if (!isJobId(job.id)) throw new VideoGenError(400, "input", "영상 작업 정보가 올바르지 않습니다. 다시 만들어 주세요.");

  if (job.provider === "gemini") {
    const res = await fetch(`${GEMINI}/interactions/${encodeURIComponent(job.id.replace(/^interactions\//, ""))}`, { headers: { "x-goog-api-key": o.key }, cache: "no-store", signal: AbortSignal.timeout(120_000) });
    if (!res.ok) await providerError("gemini", res);
    const json = (await res.json()) as { status?: string; error?: { message?: string } };
    const st = geminiState(json.status);
    if (st === "running") return { state: "running" };
    if (st === "failed") throw new VideoGenError(422, "input", `Gemini가 영상을 만들지 못했습니다${json.error?.message ? `: ${json.error.message.slice(0, 160)}` : ""}. 장면 사진·설명을 바꿔 다시 시도해 주세요.`);
    const bytes = await geminiVideoBytes(json, o.key, maxBytes);
    if (!bytes) throw new VideoGenError(502, "empty", "Gemini 응답에 영상이 없습니다. 다시 시도해 주세요.");
    return { state: "done", bytes };
  }

  if (job.provider === "fal") {
    if (!isHost(job.statusUrl, ["queue.fal.run"]) || !isHost(job.responseUrl, ["queue.fal.run"])) throw new VideoGenError(400, "input", "영상 작업 정보가 올바르지 않습니다. 다시 만들어 주세요.");
    const auth = { Authorization: `Key ${o.key}` };
    const res = await fetch(job.statusUrl, { headers: auth, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!res.ok) await providerError("fal", res);
    if (falState(((await res.json()) as { status?: string }).status) === "running") return { state: "running" };
    const out = await fetch(job.responseUrl, { headers: auth, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!out.ok) await providerError("fal", out);
    const url = ((await out.json()) as { video?: { url?: string } }).video?.url;
    if (!url || !/^https:\/\//.test(url)) throw new VideoGenError(422, "input", "fal이 영상을 만들지 못했습니다. 장면 사진·설명을 바꿔 다시 시도해 주세요.");
    return { state: "done", bytes: await download(url, maxBytes) };
  }

  const res = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(job.id)}`, { headers: { Authorization: `Bearer ${o.key}` }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) await providerError("replicate", res);
  const json = (await res.json()) as { status?: string; output?: unknown; error?: unknown };
  const st = replicateState(json.status);
  if (st === "running") return { state: "running" };
  const url = replicateOutputUrl(json.output);
  if (st === "failed" || !url) throw new VideoGenError(422, "input", `Replicate가 영상을 만들지 못했습니다${typeof json.error === "string" ? `: ${json.error.slice(0, 160)}` : ""}. 장면 사진·설명을 바꿔 다시 시도해 주세요.`);
  return { state: "done", bytes: await download(url, maxBytes) };
}
