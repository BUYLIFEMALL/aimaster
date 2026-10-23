import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getUserApiKeys } from "@/lib/apiKeys";
import { saveAudio, synthesize, wordStarts } from "@/lib/tts";
import { signPaths } from "@/lib/media";
import { normalizeAudio } from "@/lib/voice";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// 장면 내레이션 1개 → 회원 본인 키로 음성 합성 → 본인 폴더 저장 → 임시 주소
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const text = String(g.body.text ?? "").trim();
    if (text.length < 2) throw new UserError(400, "읽을 내레이션이 없습니다.");
    const a = normalizeAudio(g.body.settings as never);
    const key = (await getUserApiKeys(g.userId, [a.provider]))[a.provider];
    if (!key) throw new UserError(400, `${a.provider === "openai" ? "OpenAI" : a.provider === "elevenlabs" ? "ElevenLabs" : "Gemini"} API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록하거나 다른 음성 모델을 골라 주세요.`, { needKey: true });
    const audio = await synthesize({ provider: a.provider, key, model: a.model, voice: a.voice, text, speed: a.speed, tone: a.tone });
    const path = await saveAudio(g.userId, "voice", audio);
    // v1.27 낱말 시각: ElevenLabs는 합성 때 함께 받음, 그 밖에는 회원 OpenAI 키가 있으면 Whisper(없거나 실패하면 생략)
    let words = audio.words ?? null;
    if (!words && a.captions.on) { const ok = (await getUserApiKeys(g.userId, ["openai"])).openai; if (ok) words = await wordStarts(ok, audio, text); }
    return json({ path, src: (await signPaths(g.userId, [path]))[path], words });
  } catch (e) { return fail(e); }
}
