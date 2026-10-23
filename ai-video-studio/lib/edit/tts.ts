import "server-only";
import { startsFromChars, startsFromWords, type TtsProvider } from "@/lib/edit/voice";

// [쇼츠 원스톱 `src/lib/tts.ts`(v1.27)의 synthesize·wordStarts를 가져옴 — 오류만 이 프로그램 형식(VoiceError)으로 바꿈]
// 내레이션 음성 합성(회원 본인 키). 파일은 서버에 저장하지 않고 화면으로 돌려준다(편집을 저장할 때만 회원 저장소에 올림).

export class VoiceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function wav(pcm: Buffer, rate = 24000): Buffer {
  const h = Buffer.alloc(44); const size = pcm.length;
  h.write("RIFF", 0); h.writeUInt32LE(36 + size, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(size, 40);
  return Buffer.concat([h, pcm]);
}

function err(provider: TtsProvider, status: number): never {
  const who = provider === "openai" ? "OpenAI" : provider === "elevenlabs" ? "ElevenLabs" : "Gemini";
  if (status === 401 || status === 403) throw new VoiceError(400, `본인 ${who} API 키와 음성 모델 사용 권한을 확인해 주세요.`);
  if (status === 429 || (provider === "elevenlabs" && status === 402)) throw new VoiceError(429, `본인 ${who} 계정의 사용 한도·결제 설정을 확인해 주세요.`);
  if (status === 404) throw new VoiceError(422, provider === "elevenlabs" ? "선택한 ElevenLabs 목소리를 찾지 못했습니다. 목소리 목록을 새로 불러와 다시 골라 주세요." : `선택한 ${who} 음성 모델을 쓸 수 없습니다. 다른 모델을 골라 주세요.`);
  throw new VoiceError(502, `${who} 음성을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.`);
}

export async function synthesize(o: { provider: TtsProvider; key: string; model: string; voice: string; text: string; speed: number; tone: string }): Promise<{ bytes: Buffer; mime: string; words?: number[] }> {
  const text = o.text.slice(0, 1000);
  if (o.provider === "elevenlabs") {
    if (!/^[A-Za-z0-9]{10,40}$/.test(o.voice)) throw new VoiceError(400, "ElevenLabs 목소리를 먼저 골라 주세요(목소리 목록 불러오기).");
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${o.voice}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST", headers: { "xi-api-key": o.key, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({ text, model_id: o.model, voice_settings: { stability: 0.5, similarity_boost: 0.8, speed: Math.min(1.2, Math.max(0.7, o.speed)) } }),
    }).catch(() => null);
    if (!res) throw new VoiceError(504, "음성 생성이 늦어지고 있습니다. 다시 시도해 주세요.");
    if (!res.ok) err("elevenlabs", res.status);
    const d = (await res.json()) as { audio_base64?: string; alignment?: { characters?: string[]; character_start_times_seconds?: number[] } };
    if (!d.audio_base64) throw new VoiceError(502, "ElevenLabs가 음성을 돌려주지 않았습니다. 다시 시도해 주세요.");
    const al = d.alignment;
    const words = al?.characters && al.character_start_times_seconds ? startsFromChars(text, al.characters, al.character_start_times_seconds) ?? undefined : undefined;
    return { bytes: Buffer.from(d.audio_base64, "base64"), mime: "audio/mpeg", words };
  }
  if (o.provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST", headers: { Authorization: `Bearer ${o.key}`, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({ model: o.model, voice: o.voice, input: text, response_format: "mp3", speed: o.speed, ...(o.model === "gpt-4o-mini-tts" && o.tone ? { instructions: o.tone } : {}) }),
    }).catch(() => null);
    if (!res) throw new VoiceError(504, "음성 생성이 늦어지고 있습니다. 다시 시도해 주세요.");
    if (!res.ok) err("openai", res.status);
    return { bytes: Buffer.from(await res.arrayBuffer()), mime: "audio/mpeg" };
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(o.model)}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": o.key, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({ contents: [{ parts: [{ text: o.tone ? `${o.tone}\n\n${text}` : text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: o.voice } } } } }),
  }).catch(() => null);
  if (!res) throw new VoiceError(504, "음성 생성이 늦어지고 있습니다. 다시 시도해 주세요.");
  if (!res.ok) err("gemini", res.status);
  const data = await res.json();
  const part = (data?.candidates?.[0]?.content?.parts ?? []).find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);
  if (!part) throw new VoiceError(502, "AI가 음성을 돌려주지 않았습니다. 다시 시도해 주세요.");
  return { bytes: wav(Buffer.from(part.inlineData.data, "base64")), mime: "audio/wav" };
}

/** OpenAI·Gemini 음성의 낱말 시각: 회원 본인 OpenAI 키로 받아쓰기(whisper-1, 낱말 시각) → 대본 낱말에 맞춤. 실패하면 null(글자 수 비례로 대신함) */
export async function wordStarts(key: string, audio: { bytes: Buffer; mime: string }, text: string): Promise<number[] | null> {
  try {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(audio.bytes)], { type: audio.mime }), audio.mime === "audio/wav" ? "voice.wav" : "voice.mp3");
    fd.append("model", "whisper-1"); fd.append("response_format", "verbose_json"); fd.append("timestamp_granularities[]", "word"); fd.append("language", "ko");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd, cache: "no-store", signal: AbortSignal.timeout(45_000) });
    if (!res.ok) return null;
    const d = (await res.json()) as { words?: { word: string; start: number }[] };
    return d.words?.length ? startsFromWords(text, d.words) : null;
  } catch { return null; }
}
