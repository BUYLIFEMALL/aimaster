import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { TTS_VOICES } from "@/lib/render/voices";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 「브라우저에서 만들기(무료)」용 장면 내레이션 음성 — 회원 본인 OpenAI 키(gpt-4o-mini-tts)로 만들어 오디오 바이트를 바로 돌려준다.
// v1.27: 같은 (대사·목소리·빠르기·모델) 음성은 shots-bgm `<회원>/<영상>/voice/<해시>.mp3`에 보관해 다시 만들 때 OpenAI를 부르지 않는다
// (요금·시간 절약, 응답 머리글 X-Voice-Cache: hit|miss). 보관 파일은 30일 뒤 /api/cron/cleanup-videos가 지운다.
const MODEL = "gpt-4o-mini-tts";

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await req.json().catch(() => null)) as { text?: unknown; voice?: unknown; speed?: unknown; videoId?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 1000) : "";
  if (!text) return NextResponse.json({ error: "읽을 내레이션이 없습니다." }, { status: 400 });
  const voice = TTS_VOICES.some((v) => v.id === body?.voice) ? String(body?.voice) : "coral";
  const speed = Math.min(1.5, Math.max(0.8, Number(body?.speed) || 1.05));

  const supabase = await createClient();
  const videoId = typeof body?.videoId === "string" ? body.videoId : "";
  const { data: video } = videoId
    ? await supabase.from("shorts_videos").select("id").eq("user_id", access.user.id).eq("id", videoId).maybeSingle()
    : { data: null };
  const cachePath = video ? `${access.user.id}/${video.id}/voice/${createHash("sha256").update(JSON.stringify([MODEL, voice, speed, text])).digest("hex").slice(0, 32)}.mp3` : null;
  const storage = createAdminClient().storage.from("shots-bgm");
  if (cachePath) {
    const { data: cached } = await storage.download(cachePath);
    if (cached) return new NextResponse(await cached.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice-Cache": "hit" } });
  }

  const key = await resolveApiKey(supabase, access.user.id, "openai");
  if (!key) return NextResponse.json({ error: "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요.", code: "no_key" }, { status: 400 });

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.any([req.signal, AbortSignal.timeout(60_000)]), // 브라우저가 끊으면 함께 멈춤
    body: JSON.stringify({ model: MODEL, voice, input: text, response_format: "mp3", speed, instructions: "밝고 또렷한 한국어 쇼츠 내레이션처럼 읽어 주세요." }),
  }).catch(() => null);
  if (!res) return NextResponse.json({ error: "음성 생성이 늦어지고 있습니다. 다시 시도해 주세요." }, { status: 504 });
  if (!res.ok) {
    const msg = res.status === 401 || res.status === 403 ? "본인 OpenAI API 키와 음성 모델 사용 권한을 확인해 주세요."
      : res.status === 429 ? "본인 OpenAI 계정의 사용 한도·결제 설정을 확인해 주세요."
      : "OpenAI 음성을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: msg }, { status: res.status === 429 ? 429 : 502 });
  }
  const audio = await res.arrayBuffer();
  if (cachePath) await storage.upload(cachePath, Buffer.from(audio), { contentType: "audio/mpeg", upsert: true }).catch(() => undefined); // 보관 실패해도 이번 음성은 그대로 쓴다
  return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice-Cache": "miss" } });
}
