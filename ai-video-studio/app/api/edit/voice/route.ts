import { NextResponse } from "next/server";
import { checkProgramAccessApi, getUserApiKey, logProgramUsage } from "@/lib/access";
import { TTS_MODELS, TTS_VOICES, isElevenVoiceId } from "@/lib/edit/voice";
import { VoiceError, synthesize, wordStarts } from "@/lib/edit/tts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

const NAMES = { openai: "OpenAI", gemini: "Gemini", elevenlabs: "ElevenLabs" } as const;

/** 영상 합치기 내레이션 — 회원 본인 키로 음성을 만들고 낱말 시각(자동 자막용)과 함께 돌려준다. 파일은 서버에 저장하지 않는다 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim().slice(0, 1000) : "";
  if (!text) return NextResponse.json({ error: "읽을 내레이션 문장을 입력해 주세요." }, { status: 400 });
  const model = TTS_MODELS.find((m) => m.id === body.model) ?? TTS_MODELS[0];
  const voice = model.provider === "elevenlabs"
    ? (isElevenVoiceId(body.voice) ? body.voice : "")
    : (TTS_VOICES[model.provider].some((v) => v.id === body.voice) ? body.voice : TTS_VOICES[model.provider][0].id);
  const speed = typeof body.speed === "number" && Number.isFinite(body.speed) ? Math.min(1.5, Math.max(0.7, body.speed)) : 1;

  const key = await getUserApiKey(user.id, model.provider);
  if (!key) {
    return NextResponse.json({ error: `${NAMES[model.provider]} API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록하거나 다른 음성 모델을 골라 주세요.`, needKey: true }, { status: 400 });
  }
  try {
    const audio = await synthesize({ provider: model.provider, key, model: model.id, voice, text, speed, tone: "또렷하고 자연스러운 한국어 내레이션." });
    let starts = audio.words ?? null;
    if (!starts) {
      const openaiKey = model.provider === "openai" ? key : await getUserApiKey(user.id, "openai");
      if (openaiKey) starts = await wordStarts(openaiKey, audio, text);
    }
    await logProgramUsage(user.id, "edit_voice", 1, { model: model.id, chars: text.length, timed: Boolean(starts) });
    return NextResponse.json(
      { audio: audio.bytes.toString("base64"), mime: audio.mime, starts },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    if (e instanceof VoiceError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "음성을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
