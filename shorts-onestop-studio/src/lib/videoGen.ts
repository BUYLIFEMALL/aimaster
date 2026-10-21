// v1.23 AI 동영상 장면 — 회원 본인 키로 업체에 「제출 → 상태 확인 → 결과 받기」를 나눠 부른다.
// 영상은 1~5분 걸려 한 번의 요청으로 기다리면 Vercel 300초 제한에 걸리므로, 제출 번호를 대본에 저장하고 화면이 몇 초마다 확인한다.
// 이중 과금 방지: 자동 재시도 없음. 실패하면 회원이 직접 다시 누른다.
// 외부 무료배포 shorts-auto(라이선스 없음)의 코드는 쓰지 않고 우리 구조로 새로 만들었다(docs/analysis-shorts-auto-20261022).
import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "@/lib/ai";
import { UserError } from "@/lib/errors";
import { BUCKET } from "@/lib/media";
import type { VideoJob, VideoModel } from "@/lib/videoModels";
import { falState, findGeminiVideo, geminiState, isHost, isJobId, replicateOutputUrl, replicateState } from "@/lib/videoParse";

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const MAX_FRAME_BYTES = 10 * 1024 * 1024;
const MAX_VIDEOS_PER_USER = 100;

export type { VideoJob };
export type SubmitResult = { job: VideoJob } | { path: string };
export type CheckResult = { state: "running" } | { state: "done"; path: string };

const NAME = { gemini: "Google Gemini", fal: "fal", replicate: "Replicate" } as const;

async function providerError(provider: VideoModel["provider"], res: Response): Promise<never> {
  const text = (await res.text().catch(() => "")).slice(0, 400);
  const n = NAME[provider];
  if (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(text)) throw new AiError(400, "key", `${n}가 키를 거절했습니다. API키등록·플랫폼연동에서 본인 ${n} 키를 확인해 주세요.`);
  if (res.status === 401 || res.status === 403) {
    if (provider === "gemini" && /billing|free tier|paid|FAILED_PRECONDITION/i.test(text)) throw new AiError(402, "quota", "Gemini 영상 생성은 결제가 연결된 키에서만 됩니다. Google AI Studio에서 결제(유료 등급)를 연결해 주세요.");
    throw new AiError(400, "key", `${n}가 키를 거절했습니다. API키등록·플랫폼연동에서 본인 ${n} 키를 확인해 주세요.`);
  }
  if (res.status === 402) throw new AiError(402, "quota", `본인 ${n} 계정의 잔액·결제 설정을 확인해 주세요.`);
  if (res.status === 429) throw new AiError(429, "quota", `본인 ${n} 계정의 사용 한도에 걸렸습니다. 잠시 후 다시 시도하거나 결제 설정을 확인해 주세요.`);
  if (res.status === 400 && provider === "gemini" && /billing|free tier|paid/i.test(text)) throw new AiError(402, "quota", "Gemini 영상 생성은 결제가 연결된 키에서만 됩니다. Google AI Studio에서 결제(유료 등급)를 연결해 주세요.");
  if (res.status === 404) throw new AiError(422, "model", `${n}에서 이 영상 모델을 쓸 수 없습니다. 다른 모델을 골라 주세요.`);
  if (res.status === 400 || res.status === 422) throw new AiError(422, "provider", `${n}가 요청을 받지 않았습니다(장면 사진·설명을 바꿔 보세요). ${text.replace(/\s+/g, " ").slice(0, 160)}`);
  throw new AiError(502, "provider", `${n} 서버가 응답하지 않습니다(${res.status}). 잠시 후 다시 시도해 주세요.`);
}

async function fetchFrame(url: string): Promise<{ data: string; mime: string }> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new UserError(400, "장면 사진을 불러오지 못했습니다. 배경을 다시 고른 뒤 시도해 주세요.");
  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!/^image\/(png|jpeg|webp)$/.test(mime)) throw new UserError(400, "사진 배경(PNG·JPG·WEBP)만 영상의 시작·끝 화면으로 쓸 수 있습니다.");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_FRAME_BYTES) throw new UserError(400, "장면 사진이 너무 큽니다(10MB 이하).");
  return { data: buf.toString("base64"), mime };
}

/** 결과 영상 받기 → 회원 폴더(<user_id>/video/)에 저장. 다운로드 주소에는 키를 보내지 않는다(Gemini 파일 주소만 예외, 호스트 확인 후) */
async function saveVideo(userId: string, bytes: Buffer): Promise<string> {
  if (bytes.length < 1000) throw new AiError(502, "noimage", "업체가 빈 영상을 돌려주었습니다. 다시 시도해 주세요.");
  if (bytes.length > MAX_VIDEO_BYTES) throw new AiError(502, "provider", "영상 파일이 너무 큽니다(30MB 초과). 더 낮은 화질 모델을 골라 주세요.");
  const admin = createAdminClient();
  const { data: list } = await admin.storage.from(BUCKET).list(`${userId}/video`, { limit: MAX_VIDEOS_PER_USER + 1 });
  if ((list?.length ?? 0) >= MAX_VIDEOS_PER_USER) throw new UserError(400, `AI 영상은 ${MAX_VIDEOS_PER_USER}개까지 보관할 수 있습니다(30일 뒤 자동 삭제). 쓰지 않는 대본을 정리해 주세요.`);
  const path = `${userId}/video/${randomUUID()}.mp4`;
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "video/mp4", upsert: false });
  if (error) throw new UserError(500, "영상을 저장하지 못했습니다.");
  return path;
}

async function download(url: string, headers?: Record<string, string>): Promise<Buffer> {
  const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new AiError(502, "provider", "만든 영상을 받아오지 못했습니다. 잠시 후 [상태 확인]을 다시 눌러 주세요.");
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_VIDEO_BYTES) throw new AiError(502, "provider", "영상 파일이 너무 큽니다(30MB 초과).");
  return Buffer.from(await res.arrayBuffer());
}

async function geminiVideoBytes(json: unknown, key: string): Promise<Buffer | null> {
  const v = findGeminiVideo(json);
  if (!v) return null;
  if (v.data) return Buffer.from(v.data, "base64");
  if (v.uri && isHost(v.uri, ["generativelanguage.googleapis.com"])) {
    const u = v.uri.includes(":download") ? v.uri : `${v.uri.split("?")[0]}:download?alt=media`;
    return download(u, { "x-goog-api-key": key });
  }
  return null;
}

// ── 제출 ─────────────────────────────────────────────
export async function submitVideo(o: { userId: string; key: string; model: VideoModel; prompt: string; startUrl: string; endUrl?: string; seconds: number }): Promise<SubmitResult> {
  const withEnd = !!o.endUrl && o.model.endFrame;
  const startedAt = new Date().toISOString();
  const base = { provider: o.model.provider, model: o.model.id, withEnd, startedAt, seconds: o.seconds };

  if (o.model.provider === "gemini") {
    const frames = [await fetchFrame(o.startUrl), ...(withEnd ? [await fetchFrame(o.endUrl!)] : [])];
    const body = (background: boolean) => JSON.stringify({
      model: o.model.id,
      input: [...frames.map((f) => ({ type: "image", data: f.data, mime_type: f.mime })), { type: "text", text: `${o.prompt} About ${o.seconds} seconds long.` }],
      response_format: { type: "video", aspect_ratio: "9:16", resolution: "720p" },
      ...(background ? { background: true, store: true } : {}),
    });
    const headers = { "x-goog-api-key": o.key, "Content-Type": "application/json" };
    let res = await fetch(`${GEMINI}/interactions`, { method: "POST", headers, body: body(true), cache: "no-store", signal: AbortSignal.timeout(60_000) });
    if (res.status === 400) {
      const t = await res.clone().text();
      // 백그라운드 실행을 이 모델이 지원하지 않으면(거절은 요금 없음) 한 번에 기다리는 방식으로 다시 보낸다 — 최대 270초
      if (/background/i.test(t)) res = await fetch(`${GEMINI}/interactions`, { method: "POST", headers, body: body(false), cache: "no-store", signal: AbortSignal.timeout(270_000) }).catch(() => {
        throw new AiError(504, "timeout", "Gemini 영상 응답을 기다리다 시간이 지났습니다. 구글 쪽에서는 이미 만들어져 요금이 나갔을 수 있으니, 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.");
      });
    }
    if (!res.ok) await providerError("gemini", res);
    const json = (await res.json()) as { id?: string; status?: string; error?: { message?: string } };
    const bytes = geminiState(json.status) === "done" || !json.id ? await geminiVideoBytes(json, o.key) : null;
    if (bytes) return { path: await saveVideo(o.userId, bytes) };
    if (!json.id || !isJobId(json.id)) throw new AiError(502, "provider", "Gemini가 영상 작업 번호를 돌려주지 않았습니다. 잠시 후 다시 시도해 주세요.");
    return { job: { ...base, id: json.id } };
  }

  if (o.model.provider === "fal") {
    const isSeedance = o.model.id.includes("seedance");
    const input: Record<string, unknown> = { prompt: o.prompt, image_url: o.startUrl, duration: String(o.seconds), generate_audio: false };
    if (withEnd) input.end_image_url = o.endUrl;
    if (isSeedance) Object.assign(input, { resolution: "720p", aspect_ratio: "9:16" });
    const res = await fetch(`https://queue.fal.run/${o.model.id}`, { method: "POST", headers: { Authorization: `Key ${o.key}`, "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store", signal: AbortSignal.timeout(60_000) });
    if (!res.ok) await providerError("fal", res);
    const json = (await res.json()) as { request_id?: string; status_url?: string; response_url?: string };
    if (!isJobId(json.request_id) || !isHost(json.status_url, ["queue.fal.run"]) || !isHost(json.response_url, ["queue.fal.run"])) throw new AiError(502, "provider", "fal이 작업 번호를 돌려주지 않았습니다. 잠시 후 다시 시도해 주세요.");
    return { job: { ...base, id: json.request_id, statusUrl: json.status_url, responseUrl: json.response_url } };
  }

  // replicate
  const isKling = o.model.id.includes("kling");
  const input: Record<string, unknown> = isKling
    ? { prompt: o.prompt, start_image: o.startUrl, duration: o.seconds, mode: withEnd ? "pro" : "standard", ...(withEnd ? { end_image: o.endUrl } : {}) }
    : { prompt: o.prompt, image: o.startUrl, duration: o.seconds, resolution: "720p", camera_fixed: false, ...(withEnd ? { last_frame_image: o.endUrl } : {}) };
  const res = await fetch(`https://api.replicate.com/v1/models/${o.model.id}/predictions`, { method: "POST", headers: { Authorization: `Bearer ${o.key}`, "Content-Type": "application/json" }, body: JSON.stringify({ input }), cache: "no-store", signal: AbortSignal.timeout(60_000) });
  if (!res.ok) await providerError("replicate", res);
  const json = (await res.json()) as { id?: string };
  if (!isJobId(json.id)) throw new AiError(502, "provider", "Replicate가 작업 번호를 돌려주지 않았습니다. 잠시 후 다시 시도해 주세요.");
  return { job: { ...base, id: json.id } };
}

// ── 상태 확인(끝났으면 받아서 저장) ─────────────────────
export async function checkVideo(o: { userId: string; key: string; job: VideoJob }): Promise<CheckResult> {
  const { job } = o;
  if (!isJobId(job.id)) throw new UserError(400, "영상 작업 정보가 올바르지 않습니다. 다시 만들어 주세요.");

  if (job.provider === "gemini") {
    const id = job.id.replace(/^interactions\//, "");
    const res = await fetch(`${GEMINI}/interactions/${encodeURIComponent(id)}`, { headers: { "x-goog-api-key": o.key }, cache: "no-store", signal: AbortSignal.timeout(120_000) });
    if (!res.ok) await providerError("gemini", res);
    const json = (await res.json()) as { status?: string; error?: { message?: string } };
    const st = geminiState(json.status);
    if (st === "running") return { state: "running" };
    if (st === "failed") throw new AiError(422, "provider", `Gemini가 영상을 만들지 못했습니다${json.error?.message ? `: ${json.error.message.slice(0, 160)}` : ""}. 장면 사진·설명을 바꿔 다시 시도해 주세요.`);
    const bytes = await geminiVideoBytes(json, o.key);
    if (!bytes) throw new AiError(502, "noimage", "Gemini 응답에 영상이 없습니다. 다시 시도해 주세요.");
    return { state: "done", path: await saveVideo(o.userId, bytes) };
  }

  if (job.provider === "fal") {
    if (!isHost(job.statusUrl, ["queue.fal.run"]) || !isHost(job.responseUrl, ["queue.fal.run"])) throw new UserError(400, "영상 작업 정보가 올바르지 않습니다. 다시 만들어 주세요.");
    const auth = { Authorization: `Key ${o.key}` };
    const res = await fetch(job.statusUrl, { headers: auth, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!res.ok) await providerError("fal", res);
    const st = falState(((await res.json()) as { status?: string }).status);
    if (st === "running") return { state: "running" };
    const out = await fetch(job.responseUrl, { headers: auth, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!out.ok) await providerError("fal", out);
    const url = ((await out.json()) as { video?: { url?: string } }).video?.url;
    if (!url || !/^https:\/\//.test(url)) throw new AiError(422, "provider", "fal이 영상을 만들지 못했습니다. 장면 사진·설명을 바꿔 다시 시도해 주세요.");
    return { state: "done", path: await saveVideo(o.userId, await download(url)) };
  }

  const res = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(job.id)}`, { headers: { Authorization: `Bearer ${o.key}` }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) await providerError("replicate", res);
  const json = (await res.json()) as { status?: string; output?: unknown; error?: unknown };
  const st = replicateState(json.status);
  if (st === "running") return { state: "running" };
  const url = replicateOutputUrl(json.output);
  if (st === "failed" || !url) throw new AiError(422, "provider", `Replicate가 영상을 만들지 못했습니다${typeof json.error === "string" ? `: ${json.error.slice(0, 160)}` : ""}. 장면 사진·설명을 바꿔 다시 시도해 주세요.`);
  return { state: "done", path: await saveVideo(o.userId, await download(url)) };
}
