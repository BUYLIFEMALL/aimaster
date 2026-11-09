import { NextResponse } from "next/server";
import { checkProgramAccessApi, getUserApiKey, logProgramUsage } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET, markFailed, toClient, type GenerationRow } from "@/lib/generations";
import { isHost, isJobId } from "@/lib/video/videoParse";
import { isRetentionExempt } from "@/lib/retentionExempt";
import { POST_SPECS, isBgColor, postBlocked, postCostUsd, postInput, postModelId, type PostKind } from "@/lib/postprocess";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 2026-11-09 후처리 접수(백로그 3차) — 내 보관함 완성 영상 1개 → 회원 본인 fal 키로 1건(자동 재시도 없음 = 이중 과금 방지).
// 결과는 새 행(model "post:<종류>")으로 저장하고, 상태 확인·저장은 기존 GET /api/generations(advance)가 그대로 맡는다.
const MAX_RUNNING = 4;
const MAX_AUDIO_BYTES = 3 * 1024 * 1024; // 요청 한도(4.5MB) 안 — 60초 MP3는 약 1MB
const KINDS = new Set<string>(["lipsync", "upscale", "bgremove"]);

function parseAudio(v: unknown): { bytes: Buffer; type: string; ext: string } | null {
  if (typeof v !== "string") return null;
  const m = /^data:(audio\/(mpeg|mp3|wav|x-wav|wave));base64,([A-Za-z0-9+/=]+)$/.exec(v);
  if (!m) return null;
  const bytes = Buffer.from(m[3], "base64");
  if (bytes.byteLength < 1000 || bytes.byteLength > MAX_AUDIO_BYTES) return null;
  const wav = /wav/.test(m[2]);
  return { bytes, type: wav ? "audio/wav" : "audio/mpeg", ext: wav ? "wav" : "mp3" };
}

export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4_300_000) return NextResponse.json({ error: "목소리 파일이 너무 큽니다(3MB 이하)." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const kind = String(body.kind ?? "");
  if (!KINDS.has(kind)) return NextResponse.json({ error: "지원하지 않는 후처리입니다." }, { status: 400 });
  const k = kind as PostKind;
  const spec = POST_SPECS[k];
  const sourceId = String(body.sourceId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(sourceId)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const admin = createAdminClient();
  const { data: src } = await admin.from("avs_generations").select("*").eq("id", sourceId).eq("user_id", user.id).maybeSingle();
  const source = src as GenerationRow | null;
  const out = source?.outputs?.[0];
  if (!source || source.status !== "completed" || !out?.path?.startsWith(`${user.id}/`)) return NextResponse.json({ error: "완성된 내 영상만 후처리할 수 있습니다." }, { status: 404 });

  // 업스케일한 영상은 1080p로 기록되므로 두 번 키우지 않는다
  const resolution = source.options?.resolution;
  const blocked = postBlocked(k, source.duration_s, resolution);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 400 });
  const audio = k === "lipsync" ? parseAudio(body.audio) : null;
  if (k === "lipsync" && !audio) return NextResponse.json({ error: "립싱크할 목소리 파일(MP3·WAV, 3MB 이하)을 넣어 주세요." }, { status: 400 });
  const color = isBgColor(body.color) ? body.color : "Green";

  // 회원 본인 fal 키만 — 없으면 등록 안내(다른 회원·운영자 키로 대신하지 않음)
  const apiKey = await getUserApiKey(user.id, "fal");
  if (!apiKey) return NextResponse.json({ error: "fal API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요.", missingKeys: ["fal"] }, { status: 400 });

  const { count } = await admin.from("avs_generations").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "running");
  if ((count ?? 0) >= MAX_RUNNING) return NextResponse.json({ error: `동시에 진행할 수 있는 작업은 ${MAX_RUNNING}개까지입니다. 진행 중인 작업이 끝난 뒤 다시 시도해 주세요.` }, { status: 429 });

  const id = crypto.randomUUID();
  // 립싱크 목소리는 새 행 폴더에 두고 end_image 칸에 경로를 적는다 — 삭제·30일 정리가 그 칸의 파일도 함께 지운다
  let audioPath: string | null = null;
  if (audio) {
    audioPath = `${user.id}/${id}/voice.${audio.ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(audioPath, audio.bytes, { contentType: audio.type, upsert: true });
    if (error) return NextResponse.json({ error: "목소리 파일을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }

  const label = spec.name + (k === "bgremove" ? `(${color === "Green" ? "초록" : color === "White" ? "흰색" : "검정"} 배경)` : "");
  const { data: created, error } = await admin
    .from("avs_generations")
    .insert({
      id, user_id: user.id, provider: "fal", model: postModelId(k), status: "running",
      prompt: `${spec.emoji} ${label} · ${source.prompt}`.slice(0, 2000),
      aspect_ratio: source.aspect_ratio, duration_s: source.duration_s,
      start_image: null, end_image: audioPath,
      options: { post: { kind: k, sourceId, ...(k === "bgremove" ? { color } : {}) }, ...(k === "upscale" ? { resolution: "1080p" } : typeof resolution === "string" ? { resolution } : {}) },
      est_cost_usd: postCostUsd(k, source.duration_s),
    })
    .select("*")
    .single();
  if (error || !created) {
    console.error("[generations/post] 저장 실패:", error);
    if (audioPath) await admin.storage.from(BUCKET).remove([audioPath]);
    return NextResponse.json({ error: "후처리 요청을 저장하지 못했습니다." }, { status: 500 });
  }
  const row = created as GenerationRow;

  // fal 대기열에 접수 — 영상·소리는 1시간짜리 서명 주소로 넘긴다
  try {
    const paths = [out.path, ...(audioPath ? [audioPath] : [])];
    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrls(paths, 3600);
    const videoUrl = signed?.[0]?.signedUrl;
    const audioUrl = (audioPath ? signed?.[1]?.signedUrl : undefined) ?? undefined;
    if (!videoUrl || (audioPath && !audioUrl)) throw new Error("영상 주소를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    const res = await fetch(`https://queue.fal.run/${spec.endpoint}`, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(postInput(k, { videoUrl, audioUrl, color, resolution })),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
      throw new Error(
        res.status === 401 || res.status === 403 ? "fal이 키를 거절했습니다. API키등록·플랫폼연동에서 본인 fal 키를 확인해 주세요."
        : res.status === 402 ? "본인 fal 계정의 잔액·결제 설정을 확인해 주세요."
        : res.status === 429 ? "본인 fal 계정의 사용 한도에 걸렸습니다. 잠시 후 다시 시도해 주세요."
        : res.status === 400 || res.status === 422 ? `fal이 이 영상을 받지 않았습니다(길이·화질·얼굴 등 조건을 확인해 주세요). ${text}`
        : `fal 서버가 응답하지 않습니다(${res.status}). 잠시 후 다시 시도해 주세요.`,
      );
    }
    const json = (await res.json()) as { request_id?: string; status_url?: string; response_url?: string };
    if (!isJobId(json.request_id) || !isHost(json.status_url, ["queue.fal.run"]) || !isHost(json.response_url, ["queue.fal.run"])) throw new Error("fal이 작업 번호를 돌려주지 않았습니다. fal 콘솔에서 요청 기록을 확인한 뒤 다시 시도해 주세요.");
    const job = { provider: "fal", model: postModelId(k), id: json.request_id, statusUrl: json.status_url, responseUrl: json.response_url, withEnd: false, startedAt: new Date().toISOString(), seconds: source.duration_s };
    await admin.from("avs_generations").update({ provider_task_id: job.id, provider_meta: job, updated_at: new Date().toISOString() }).eq("id", id);
  } catch (e) {
    await markFailed(admin, id, e instanceof Error ? e.message : "후처리 접수에 실패했습니다.");
  }
  await logProgramUsage(user.id, "postprocess_video", 1, { kind: k, seconds: source.duration_s, sourceId });

  const { data: fresh } = await admin.from("avs_generations").select("*").eq("id", id);
  return NextResponse.json({ generations: await toClient(admin, (fresh ?? [row]) as GenerationRow[], await isRetentionExempt(admin, user.id)) }, { headers: { "Cache-Control": "private, no-store" } });
}



