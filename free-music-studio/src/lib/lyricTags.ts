import { presetCategories, presetsFor } from "./presets";

// AI 작사 장르·분위기 버튼(2026-11-06 주인님 「장르를 직접 입력하게 하지말고 버튼 형식으로」「분위기 선택(다중선택)」,
// 같은 날 「사용 가능한 분위기를 더 알아보고 더 디테일한 선택」).
// 근거: ACE-Step 1.5 공식 Tutorial(docs/en/Tutorial.md) — 캡션(스타일)에 감정·분위기, 빠르기·리듬, 목소리 특징을 함께 쓰면 방향이 정확해지고,
// 서로 반대되는 단어를 섞으면 결과가 나빠진다. 그래서 한국어 이름(가사용)과 영어 태그(스타일용)를 짝으로 두고, 반대 묶음을 섞으면 경고한다.

/** 노래 장르 = 노래용 스타일 프리셋 분류(엔진이 잘 만드는 장르만, 프리셋과 같은 이름이라 아래 프리셋 카드와 함께 움직임) */
export const LYRIC_GENRES: readonly string[] = presetCategories(presetsFor("vocal"));

export type Tag = { ko: string; en: string };
export type MoodGroup = { id: "bright" | "calm" | "sad" | "intense" | "dreamy"; label: string; moods: readonly Tag[] };

export const MOOD_GROUPS: readonly MoodGroup[] = [
  {
    id: "bright",
    label: "밝고 신나는",
    moods: [
      { ko: "신나는", en: "energetic" },
      { ko: "희망찬", en: "uplifting" },
      { ko: "벅찬", en: "euphoric" },
      { ko: "설레는", en: "giddy" },
      { ko: "유쾌한", en: "playful" },
      { ko: "자신감 넘치는", en: "confident" },
      { ko: "축제 같은", en: "celebratory" },
    ],
  },
  {
    id: "calm",
    label: "따뜻하고 잔잔한",
    moods: [
      { ko: "따뜻한", en: "warm" },
      { ko: "포근한", en: "cozy" },
      { ko: "잔잔한", en: "calm" },
      { ko: "평화로운", en: "serene" },
      { ko: "여유로운", en: "laid-back" },
      { ko: "다정한", en: "tender" },
      { ko: "로맨틱한", en: "romantic" },
    ],
  },
  {
    id: "sad",
    label: "슬프고 그리운",
    moods: [
      { ko: "애틋한", en: "bittersweet" },
      { ko: "그리운", en: "nostalgic" },
      { ko: "쓸쓸한", en: "lonely" },
      { ko: "우울한", en: "melancholic" },
      { ko: "아련한", en: "wistful" },
      { ko: "감성적인", en: "sentimental" },
      { ko: "위로하는", en: "comforting" },
    ],
  },
  {
    id: "intense",
    label: "강렬하고 웅장한",
    moods: [
      { ko: "강렬한", en: "intense" },
      { ko: "웅장한", en: "epic" },
      { ko: "비장한", en: "dramatic" },
      { ko: "격렬한", en: "aggressive" },
      { ko: "반항적인", en: "rebellious" },
      { ko: "승리의", en: "triumphant" },
      { ko: "긴장감 있는", en: "tense" },
    ],
  },
  {
    id: "dreamy",
    label: "몽환적이고 신비한",
    moods: [
      { ko: "몽환적인", en: "dreamy" },
      { ko: "신비로운", en: "mysterious" },
      { ko: "어두운", en: "dark" },
      { ko: "아득한", en: "ethereal" },
      { ko: "오싹한", en: "haunting" },
      { ko: "새벽 도시 같은", en: "late-night urban" },
      { ko: "속삭이는 듯한", en: "intimate" },
    ],
  },
];

/** 빠르기·리듬(하나) — ACE-Step Tutorial 「Speed/Rhythm」 */
export const TEMPOS: readonly Tag[] = [
  { ko: "느린", en: "slow tempo" },
  { ko: "중간 빠르기", en: "mid-tempo" },
  { ko: "빠른", en: "fast-paced" },
  { ko: "그루비한", en: "groovy" },
  { ko: "몰아치는", en: "driving" },
  { ko: "느긋한 리듬", en: "laid-back rhythm" },
];

/** 목소리(최대 2개) — ACE-Step Tutorial 「Vocal Characteristics」 */
export const VOCALS: readonly Tag[] = [
  { ko: "여성 보컬", en: "female vocal" },
  { ko: "남성 보컬", en: "male vocal" },
  { ko: "숨소리 섞인", en: "breathy vocal" },
  { ko: "힘 있는", en: "powerful vocal" },
  { ko: "가성", en: "falsetto" },
  { ko: "허스키한", en: "raspy vocal" },
  { ko: "합창", en: "choir" },
];

export const MAX_MOODS = 3;
export const MAX_VOCALS = 2;
/** 예전 이름(다른 화면·시험 호환) — 한국어 분위기 이름 전체 */
export const LYRIC_MOODS: readonly string[] = MOOD_GROUPS.flatMap((g) => g.moods.map((m) => m.ko));

/** 여러 개 고르기 — 켜고 끄고, 한도가 찼으면 새로 켜지 않는다 */
export function toggleMany(selected: string[], item: string, max: number): string[] {
  if (selected.includes(item)) return selected.filter((m) => m !== item);
  return selected.length >= max ? selected : [...selected, item];
}
export const toggleMood = (selected: string[], mood: string) => toggleMany(selected, mood, MAX_MOODS);

/** 반대 묶음 — 함께 고르면 결과가 흐려진다(Tutorial 「Avoid conflicting words」) */
const OPPOSITE: Record<MoodGroup["id"], MoodGroup["id"][]> = {
  bright: ["sad", "dreamy"],
  calm: ["intense"],
  sad: ["bright"],
  intense: ["calm"],
  dreamy: ["bright"],
};
const groupOf = (ko: string) => MOOD_GROUPS.find((g) => g.moods.some((m) => m.ko === ko));
const enOf = (list: readonly Tag[], ko: string) => list.find((t) => t.ko === ko)?.en;

/** 고른 분위기에 반대 묶음이 섞였으면 안내 문구, 아니면 "" */
export function moodConflict(moods: string[]): string {
  const groups = [...new Set(moods.map((m) => groupOf(m)?.id).filter(Boolean))] as MoodGroup["id"][];
  for (const a of groups)
    for (const b of OPPOSITE[a])
      if (groups.includes(b)) {
        const la = MOOD_GROUPS.find((g) => g.id === a)!.label;
        const lb = MOOD_GROUPS.find((g) => g.id === b)!.label;
        return `「${la}」과 「${lb}」 분위기를 함께 고르면 음악 엔진이 방향을 잡기 어려워 결과가 흐려질 수 있습니다. 한쪽으로 맞추거나, 곡 안에서 바뀌게 하려면 주제 칸에 「절은 잔잔하게, 후렴은 터지게」처럼 적어 주세요.`;
      }
  return "";
}

/** AI에게 보낼 한국어 분위기(가사용, 60자 안)와 영어 태그(스타일용) */
export function lyricMoodPayload(sel: { moods: string[]; tempo: string; vocals: string[] }): { mood: string; tags: string } {
  const allMoods = MOOD_GROUPS.flatMap((g) => g.moods);
  const en = [...sel.moods.map((m) => enOf(allMoods, m)), enOf(TEMPOS, sel.tempo), ...sel.vocals.map((v) => enOf(VOCALS, v))].filter(Boolean) as string[];
  return { mood: sel.moods.join(", ").slice(0, 60), tags: en.join(", ") };
}
