import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "@/lib/ai";
import { BUCKET } from "@/lib/media";
import { UserError } from "@/lib/errors";
import type { TtsProvider } from "@/lib/voice";

// 내레이션 음성 합성(회원 본인 키) → 비공개 버킷 <user_id>/voice/ 에 저장. 재생 길이는 브라우저가 파일을 읽어 잰다.
function wav(pcm: Buffer, rate = 24000): Buffer {
  const h = Buffer.alloc(44); const size = pcm.length;
  h.write("RIFF", 0); h.writeUInt32LE(36 + size, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(size, 40);
  return Buffer.concat([h, pcm]);
}
function err(provider: TtsProvider, status: number): never {
  const who = provider === "openai" ? "OpenAI" : "Gemini";
  if (status === 401 || status === 403) throw new AiError(400, "key", `본인 ${who} API 키와 음성 모델 사용 권한을 확인해 주세요.`);
  if (status === 429) throw new AiError(429, "quota", `본인 ${who} 계정의 사용 한도·결제 설정을 확인해 주세요.`);
  if (status === 404) throw new AiError(422, "model", `선택한 ${who} 음성 모델을 쓸 수 없습니다. 다른 모델을 골라 주세요.`);
  throw new AiError(502, "provider", `${who} 음성을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.`);
}

export async function synthesize(o: { provider: TtsProvider; key: string; model: string; voice: string; text: string; speed: number; tone: string }): Promise<{ bytes: Buffer; mime: string }> {
  const text = o.text.slice(0, 1000);
  if (o.provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST", headers: { Authorization: `Bearer ${o.key}`, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({ model: o.model, voice: o.voice, input: text, response_format: "mp3", speed: o.speed, ...(o.model === "gpt-4o-mini-tts" && o.tone ? { instructions: o.tone } : {}) }),
    }).catch(() => null);
    if (!res) throw new AiError(504, "timeout", "음성 생성이 늦어지고 있습니다. 다시 시도해 주세요.");
    if (!res.ok) err("openai", res.status);
    return { bytes: Buffer.from(await res.arrayBuffer()), mime: "audio/mpeg" };
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(o.model)}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": o.key, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({ contents: [{ parts: [{ text: o.tone ? `${o.tone}\n\n${text}` : text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: o.voice } } } } }),
  }).catch(() => null);
  if (!res) throw new AiError(504, "timeout", "음성 생성이 늦어지고 있습니다. 다시 시도해 주세요.");
  if (!res.ok) err("gemini", res.status);
  const data = await res.json();
  const part = (data?.candidates?.[0]?.content?.parts ?? []).find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);
  if (!part) throw new AiError(502, "noaudio", "AI가 음성을 돌려주지 않았습니다. 다시 시도해 주세요.");
  return { bytes: wav(Buffer.from(part.inlineData.data, "base64")), mime: "audio/wav" };
}

export async function saveAudio(userId: string, folder: "voice" | "bgm", a: { bytes: Buffer; mime: string }): Promise<string> {
  const ext = a.mime === "audio/wav" ? "wav" : "mp3";
  const path = `${userId}/${folder}/${randomUUID()}.${ext}`;
  const { error } = await createAdminClient().storage.from(BUCKET).upload(path, a.bytes, { contentType: a.mime, upsert: false });
  if (error) throw new UserError(500, "음성 파일을 저장하지 못했습니다.");
  return path;
}

/** 배경음악 업로드용 일회용 주소(브라우저가 저장소로 바로 올림 — 서버 본문 크기 제한 회피) */
export async function bgmUploadUrl(userId: string, fileName: string): Promise<{ path: string; token: string }> {
  const ext = (/\.(mp3|m4a|wav|ogg|aac)$/i.exec(fileName)?.[1] ?? "mp3").toLowerCase();
  const path = `${userId}/bgm/${randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new UserError(500, "업로드 주소를 만들지 못했습니다.");
  return { path, token: data.token };
}
