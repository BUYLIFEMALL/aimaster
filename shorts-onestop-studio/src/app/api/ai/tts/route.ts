import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getUserApiKeys } from "@/lib/apiKeys";
import { geminiWordStarts, saveAudio, synthesize, wordStarts } from "@/lib/tts";
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
    if (a.provider === "browser") throw new UserError(400, "무료 음성은 서버가 아니라 회원님 브라우저에서 만듭니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");
    const key = (await getUserApiKeys(g.userId, [a.provider]))[a.provider];
    if (!key) throw new UserError(400, `${a.provider === "openai" ? "OpenAI" : a.provider === "elevenlabs" ? "ElevenLabs" : "Gemini"} API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록하거나 다른 음성 모델을 골라 주세요.`, { needKey: true });
    const audio = await synthesize({ provider: a.provider, key, model: a.model, voice: a.voice, text, speed: a.speed, tone: a.tone });
    const path = await saveAudio(g.userId, "voice", audio);
    // v1.27 낱말 시각: ElevenLabs는 합성 때 함께 받음, 그 밖에는 회원 OpenAI 키가 있으면 Whisper(없거나 실패하면 생략)
    // v1.59 Whisper가 없거나 실패하면 회원 Gemini 키로 Gemini 낱말 시각(B안). wordsVia:"gemini"는 Whisper를 건너뛴다(비교 시험용)
    let words = audio.words ?? null; let wordsBy: string | null = words ? "elevenlabs" : null;
    if (!words && a.captions.on) {
      const ks = await getUserApiKeys(g.userId, ["openai", "gemini"]);
      if (ks.openai && g.body.wordsVia !== "gemini") { words = await wordStarts(ks.openai, audio, text); if (words) wordsBy = "whisper"; }
      const gk = a.provider === "gemini" ? key : ks.gemini;
      if (!words && gk) { words = await geminiWordStarts(gk, audio, text); if (words) wordsBy = "gemini"; }
    }
    return json({ path, src: (await signPaths(g.userId, [path]))[path], words, wordsBy });
  } catch (e) { return fail(e); }
}
