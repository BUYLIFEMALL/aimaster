import { presetCategories, presetsFor } from "./presets";

// AI 작사 장르·분위기 버튼(2026-11-06 주인님 「장르를 직접 입력하게 하지말고 버튼 형식으로」「분위기 선택(다중선택)」).
// 장르는 스타일 프리셋 분류(lib/presets.ts)와 같은 계열로 — 음악 엔진이 잘 만드는 장르만. 서버는 글자로 받으므로(60자) 분위기는 3개까지.

/** 노래 장르 = 노래용 스타일 프리셋 분류(엔진이 잘 만드는 장르만, 프리셋과 같은 이름이라 아래 프리셋 카드와 함께 움직임) */
export const LYRIC_GENRES: readonly string[] = presetCategories(presetsFor("vocal"));

export const LYRIC_MOODS = [
  "따뜻한",
  "설레는",
  "신나는",
  "잔잔한",
  "애틋한",
  "쓸쓸한",
  "희망찬",
  "위로하는",
  "몽환적인",
  "그리운",
  "강렬한",
  "로맨틱한",
  "유쾌한",
  "차분한",
] as const;

export const MAX_MOODS = 3;

/** 분위기 하나를 켜고 끈다 — 3개가 찼으면 새로 켜지 않는다 */
export function toggleMood(selected: string[], mood: string): string[] {
  if (selected.includes(mood)) return selected.filter((m) => m !== mood);
  return selected.length >= MAX_MOODS ? selected : [...selected, mood];
}
