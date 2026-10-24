// v1.42 장면 음성 만들기(화면 쪽 공용): 무료 음성은 회원 브라우저에서 만들어 본인 폴더로 바로 올리고, 그 밖에는 지금처럼 서버(/api/ai/tts, 회원 본인 키)
import { api } from "@/components/ui/api";
import { createClient } from "@/lib/supabase/client";
import { FreeTtsError, speak } from "@/lib/freeTts/engine";
import { sentenceWords } from "@/lib/freeTts/protocol";
import { startsFromWords, type AudioSettings } from "@/lib/voice";

export interface SceneVoiceResult { path: string; src: string; words?: number[] | null; free?: boolean }

async function freeVoice(text: string, a: AudioSettings): Promise<SceneVoiceResult> {
  const r = await speak(text, { voice: a.voice, speed: a.speed });
  const up = await api<{ path: string; token: string }>("/api/media/voice-upload", { body: { size: r.wav.size } });
  const { error } = await createClient().storage.from("shorts-onestop-studio").uploadToSignedUrl(up.path, up.token, r.wav, { contentType: "audio/wav" });
  if (error) throw new FreeTtsError("무료 음성을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", error.message);
  const src = (await api<{ urls: Record<string, string> }>("/api/media/sign", { body: { paths: [up.path] } })).urls[up.path];
  // 자막 시각: 문장별 길이로 계산(받아쓰기 호출 없음)
  const words = a.captions.on ? startsFromWords(text, sentenceWords(r.sentences)) : null;
  return { path: up.path, src, words, free: true };
}

export function sceneVoice(text: string, a: AudioSettings): Promise<SceneVoiceResult> {
  if (a.provider === "browser") return freeVoice(text, a);
  return api<SceneVoiceResult>("/api/ai/tts", { body: { text, settings: a } });
}
