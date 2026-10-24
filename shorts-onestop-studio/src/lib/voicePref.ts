// v1.42 「다음 영상부터 이 음성으로 시작」 기억 + 무료 음성 사용 조건 확인(이 브라우저에 저장 — 없거나 막혀도 기본값으로 동작)
import type { ShortsScript } from "@/lib/script";
import type { AudioSettings } from "@/lib/voice";

const PREF_KEY = "shorts-onestop:voice-pref";
const AGREE_KEY = "shorts-onestop:free-tts-agreed";
export type VoicePref = Pick<AudioSettings, "provider" | "model" | "voice" | "speed" | "tone">;

export function loadVoicePref(): VoicePref | null {
  try {
    const v = JSON.parse(localStorage.getItem(PREF_KEY) ?? "null") as VoicePref | null;
    return v && typeof v.model === "string" && typeof v.voice === "string" ? v : null;
  } catch { return null; }
}
export function saveVoicePref(p: VoicePref | null) {
  try { if (p) localStorage.setItem(PREF_KEY, JSON.stringify(p)); else localStorage.removeItem(PREF_KEY); } catch { /* 저장 못 해도 이번 화면은 그대로 */ }
}
export const samePref = (p: VoicePref | null, a: AudioSettings) => !!p && p.model === a.model && p.voice === a.voice;

/** 음성 설정을 한 번도 고르지 않은 새 대본이면 기억해 둔 음성으로 시작한다 */
export function withVoicePref(s: ShortsScript): ShortsScript {
  if (s.audio) return s;
  const p = loadVoicePref();
  return p ? { ...s, audio: { ...p } } : s;
}

export function freeTtsAgreed(): boolean {
  try { return localStorage.getItem(AGREE_KEY) === "1"; } catch { return false; }
}
export function setFreeTtsAgreed() {
  try { localStorage.setItem(AGREE_KEY, "1"); } catch { /* 이번 화면에서만 확인된 것으로 둔다 */ }
}
