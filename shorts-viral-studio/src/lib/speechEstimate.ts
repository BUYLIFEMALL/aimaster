// 2026-11-20 영상 담당: 대본 나레이션의 글자 수와 예상 발화 시간(어림) — 순수 함수, 네트워크·AI 호출 없음.
// 실제 음성 길이는 목소리·속도 설정에 따라 달라지므로 화면에는 항상 「약」으로 보인다.

/** 한국어 쇼츠 나레이션 어림 속도(공백·문장 부호를 뺀 글자 기준). 측정값이 아니라 안내용 기준이다. */
export const SPEECH_CHARS_PER_SEC = 6;

/** 소리 내어 읽는 글자 수: 공백·문장 부호·기호를 뺀 글자(한글·영문·숫자 등)만 센다. */
export function countSpeechChars(text: string | null | undefined): number {
  if (!text) return 0;
  return (text.normalize("NFC").match(/[\p{L}\p{N}]/gu) ?? []).length;
}

/** 예상 발화 시간(초, 소수 첫째 자리). 글자가 없으면 0. */
export function estimateSpeechSec(text: string | null | undefined): number {
  const n = countSpeechChars(text);
  return n === 0 ? 0 : Math.round((n / SPEECH_CHARS_PER_SEC) * 10) / 10;
}

/** 씬 한 줄 표시: "24자 · 약 4초". 글자가 없으면 빈 문자열. */
export function sceneSpeechLabel(text: string | null | undefined): string {
  const n = countSpeechChars(text);
  return n === 0 ? "" : `${n}자 · 약 ${estimateSpeechSec(text)}초`;
}

export type SpeechTotal = { chars: number; sec: number; targetSec: number; over: boolean; label: string };

/** 전체 합계와 목표 길이 비교. 목표보다 15% 넘게 길면 over(줄이라는 안내 기준). 목표가 없으면 비교하지 않는다. */
export function totalSpeech(narrations: (string | null | undefined)[], targetSec?: number): SpeechTotal {
  const chars = narrations.reduce((sum, t) => sum + countSpeechChars(t), 0);
  const sec = chars === 0 ? 0 : Math.round((chars / SPEECH_CHARS_PER_SEC) * 10) / 10;
  const target = targetSec && targetSec > 0 ? targetSec : 0;
  const over = target > 0 && sec > target * 1.15;
  const base = `나레이션 ${chars}자 · 예상 약 ${sec}초`;
  const label = target ? `${base} / 목표 ${target}초${over ? " — 목표보다 깁니다. 문장을 줄여 보세요." : ""}` : base;
  return { chars, sec, targetSec: target, over, label };
}
