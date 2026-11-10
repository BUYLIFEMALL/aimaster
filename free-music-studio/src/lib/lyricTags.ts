
// AI 작사 장르·분위기 버튼(2026-11-06 주인님 「장르를 직접 입력하게 하지말고 버튼 형식으로」「분위기 선택(다중선택)」,
// 같은 날 「사용 가능한 분위기를 더 알아보고 더 디테일한 선택」).
// 근거: ACE-Step 1.5 공식 Tutorial(docs/en/Tutorial.md) — 캡션(스타일)에 감정·분위기, 빠르기·리듬, 목소리 특징을 함께 쓰면 방향이 정확해지고,
// 서로 반대되는 단어를 섞으면 결과가 나빠진다. 그래서 한국어 이름(가사용)과 영어 태그(스타일용)를 짝으로 두고, 반대 묶음을 섞으면 경고한다.

export type Tag = { ko: string; en: string };
export type GenreGroup = { ko: string; subs: readonly Tag[] };

/**
 * 노래 장르 2단계(2026-11-09 주인님 「가능한 장르가 더 있는지 알아보고 좀더 세분화」) — 대분류 = 노래용 스타일 프리셋 분류(프리셋 카드와 함께 움직임),
 * 세부 장르 = ACE-Step 스타일 태그(영어). 장르를 섞으면 결과가 흐려지므로(Tutorial) 세부 장르도 하나만.
 * 트로트·성인가요(2026-11-10 추가) — 자료로 지원 확인을 못 해 Admin PC에서 ACE-Step 1.5로 정통·세미·댄스 3곡을 만들어 주인님이 들어 보고
 * 「셋다 트로트 답다」(C-17, docs/HANDOFF_20261109_SHORTS_BGM_FROM_FMS.md 22절). 세부 태그는 그 시험 문구의 장르 단어 그대로.
 */
export const GENRE_GROUPS: readonly GenreGroup[] = [
  { ko: "발라드", subs: [{ ko: "팝 발라드", en: "pop ballad" }, { ko: "록 발라드", en: "rock ballad" }, { ko: "R&B 발라드", en: "r&b ballad" }, { ko: "피아노 발라드", en: "piano ballad" }, { ko: "어쿠스틱 발라드", en: "acoustic ballad" }] },
  { ko: "K-POP", subs: [{ ko: "아이돌 댄스", en: "k-pop idol dance" }, { ko: "걸그룹 팝", en: "k-pop girl group pop" }, { ko: "보이그룹 힙합", en: "k-pop boy group hip hop" }, { ko: "청량 K-POP", en: "refreshing summer k-pop" }, { ko: "K-POP 발라드", en: "k-pop ballad" }] },
  { ko: "록·메탈", subs: [{ ko: "모던 록", en: "modern rock" }, { ko: "얼터너티브", en: "alternative rock" }, { ko: "인디 록", en: "indie rock" }, { ko: "팝 펑크", en: "pop punk" }, { ko: "하드 록", en: "hard rock" }, { ko: "헤비메탈", en: "heavy metal" }] },
  { ko: "팝·레트로", subs: [{ ko: "시티팝", en: "city pop" }, { ko: "디스코", en: "disco" }, { ko: "80년대 신스웨이브", en: "80s synthwave" }, { ko: "90년대 가요풍", en: "90s korean pop" }, { ko: "레트로 팝", en: "retro pop" }] },
  { ko: "트로트·성인가요", subs: [{ ko: "정통 트로트", en: "korean trot" }, { ko: "세미 트로트", en: "korean semi-trot" }, { ko: "댄스 트로트", en: "korean dance trot" }, { ko: "성인가요", en: "korean adult contemporary ballad" }] },
  { ko: "댄스·일렉트로닉", subs: [{ ko: "댄스 팝", en: "dance pop" }, { ko: "신스 팝", en: "synth pop" }, { ko: "EDM", en: "edm" }, { ko: "하우스", en: "house" }, { ko: "퓨처 베이스", en: "future bass" }, { ko: "트로피컬 하우스", en: "tropical house" }] },
  { ko: "힙합·알앤비", subs: [{ ko: "붐뱁", en: "boom bap hip hop" }, { ko: "트랩", en: "trap" }, { ko: "로파이 힙합", en: "lo-fi hip hop" }, { ko: "컨템포러리 R&B", en: "contemporary r&b" }, { ko: "얼반 팝", en: "urban pop" }] },
  { ko: "재즈·블루스", subs: [{ ko: "스윙", en: "swing jazz" }, { ko: "보사노바", en: "bossa nova" }, { ko: "블루스", en: "blues" }, { ko: "재즈 팝", en: "jazz pop" }, { ko: "스무스 재즈", en: "smooth jazz" }] },
  { ko: "소울·펑크", subs: [{ ko: "소울", en: "soul" }, { ko: "네오 소울", en: "neo soul" }, { ko: "모타운", en: "motown" }, { ko: "펑크(Funk)", en: "funk" }] },
  { ko: "포크·어쿠스틱", subs: [{ ko: "어쿠스틱", en: "acoustic pop" }, { ko: "인디 포크", en: "indie folk" }, { ko: "포크 록", en: "folk rock" }, { ko: "컨트리", en: "country" }, { ko: "블루그래스", en: "bluegrass" }] },
  { ko: "월드·라틴", subs: [{ ko: "라틴 팝", en: "latin pop" }, { ko: "레게", en: "reggae" }, { ko: "레게톤", en: "reggaeton" }, { ko: "플라멩코", en: "flamenco" }, { ko: "아프로비트", en: "afrobeats" }, { ko: "J-POP", en: "j-pop" }] },
  { ko: "영화·드라마·무대", subs: [{ ko: "드라마 OST", en: "korean drama ost ballad" }, { ko: "애니메이션 주제가", en: "anime theme song" }, { ko: "뮤지컬 넘버", en: "musical theatre" }, { ko: "시네마틱 팝", en: "cinematic pop" }] },
  { ko: "어린이·종교 음악", subs: [{ ko: "동요", en: "children's song" }, { ko: "CCM·워십", en: "contemporary worship" }, { ko: "가스펠", en: "gospel" }] },
];

/**
 * 연주곡 장르 2단계(2026-11-09 주인님 「연주곡 분류 세분화」) — 대분류 = 연주곡용 스타일 프리셋 분류 9개(프리셋 카드와 함께 움직임),
 * 세부 장르 = ACE-Step 스타일 태그(영어). 노래 장르와 이름이 같은 대분류(재즈·블루스)도 세부는 연주곡용으로 따로 둔다.
 */
export const INSTRUMENTAL_GENRE_GROUPS: readonly GenreGroup[] = [
  { ko: "재즈·블루스", subs: [{ ko: "재즈 피아노 트리오", en: "jazz piano trio" }, { ko: "스무스 재즈", en: "smooth jazz" }, { ko: "보사노바 연주", en: "bossa nova instrumental" }, { ko: "비밥", en: "bebop" }, { ko: "블루스 기타", en: "blues guitar" }, { ko: "로파이 재즈", en: "lo-fi jazz" }] },
  { ko: "피아노·클래식", subs: [{ ko: "솔로 피아노", en: "solo piano" }, { ko: "뉴에이지 피아노", en: "new age piano" }, { ko: "현악 사중주", en: "string quartet" }, { ko: "바로크", en: "baroque" }, { ko: "낭만파 클래식", en: "romantic era classical" }] },
  { ko: "일렉트로닉·비트", subs: [{ ko: "로파이 비트", en: "lo-fi beats" }, { ko: "신스웨이브", en: "synthwave" }, { ko: "칠웨이브", en: "chillwave" }, { ko: "다운템포", en: "downtempo" }, { ko: "트립합", en: "trip hop" }, { ko: "칩튠", en: "chiptune" }] },
  { ko: "앰비언트·휴식", subs: [{ ko: "앰비언트", en: "ambient" }, { ko: "명상 음악", en: "meditation music" }, { ko: "수면 음악", en: "sleep music" }, { ko: "자연 앰비언트", en: "nature ambient" }, { ko: "드론 앰비언트", en: "drone ambient" }] },
  { ko: "댄스·클럽", subs: [{ ko: "하우스 연주", en: "house instrumental" }, { ko: "딥 하우스", en: "deep house" }, { ko: "테크노", en: "techno" }, { ko: "트랜스", en: "trance" }, { ko: "드럼 앤 베이스", en: "drum and bass" }, { ko: "퓨처 베이스 연주", en: "future bass instrumental" }] },
  { ko: "펑크·밴드", subs: [{ ko: "펑크(Funk) 연주", en: "funk instrumental" }, { ko: "퓨전 재즈", en: "jazz fusion" }, { ko: "포스트 록", en: "post-rock" }, { ko: "기타 록 연주", en: "instrumental rock" }, { ko: "서프 록", en: "surf rock" }] },
  { ko: "오케스트라·영화", subs: [{ ko: "에픽 오케스트라", en: "epic orchestral" }, { ko: "영화 음악", en: "cinematic film score" }, { ko: "게임 음악", en: "video game soundtrack" }, { ko: "동화풍 오케스트라", en: "whimsical orchestral" }, { ko: "트레일러 음악", en: "epic trailer music" }] },
  { ko: "어쿠스틱·기타", subs: [{ ko: "핑거스타일 기타", en: "fingerstyle guitar" }, { ko: "클래식 기타", en: "classical guitar" }, { ko: "어쿠스틱 포크 연주", en: "acoustic folk instrumental" }, { ko: "컨트리 기타", en: "country guitar" }, { ko: "우쿨렐레", en: "ukulele" }] },
  { ko: "라틴·리듬", subs: [{ ko: "살사", en: "salsa" }, { ko: "탱고", en: "tango" }, { ko: "플라멩코 기타", en: "flamenco guitar" }, { ko: "삼바", en: "samba" }, { ko: "레게 리듬", en: "reggae instrumental" }, { ko: "아프로비트 연주", en: "afrobeat instrumental" }] },
];
export const INSTRUMENTAL_GENRES: readonly string[] = INSTRUMENTAL_GENRE_GROUPS.map((g) => g.ko);

/** 노래 장르(대분류) — 화면 버튼·그림 읽기 선택지 */
export const LYRIC_GENRES: readonly string[] = GENRE_GROUPS.map((g) => g.ko);

/** 이 대분류의 세부 장르(없으면 []) */
export const subGenresOf = (genre: string, instrumental = false): readonly Tag[] =>
  (instrumental ? INSTRUMENTAL_GENRE_GROUPS : GENRE_GROUPS).find((g) => g.ko === genre)?.subs ?? [];

/** AI에게 보낼 장르 글(60자 안) — 「K-POP · 아이돌 댄스」 */
export function genreLabel(genre: string, sub: string, instrumental = false): string {
  const ok = subGenresOf(genre, instrumental).some((s) => s.ko === sub);
  return (ok ? `${genre} · ${sub}` : genre).slice(0, 60);
}

/** AI 작곡 기획에 보낼 연주곡 장르 글(80자 안) — 「재즈·블루스 · 보사노바 연주 (bossa nova instrumental)」, 없는 장르면 "" */
export function instrumentalGenreHint(genre: string, sub: string): string {
  if (!INSTRUMENTAL_GENRES.includes(genre)) return "";
  const en = subGenresOf(genre, true).find((s) => s.ko === sub)?.en;
  return (genreLabel(genre, sub, true) + (en ? ` (${en})` : "")).slice(0, 80);
}
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
export function lyricMoodPayload(sel: { moods: string[]; tempo: string; vocals: string[]; genre?: string; sub?: string }): { mood: string; tags: string } {
  const allMoods = MOOD_GROUPS.flatMap((g) => g.moods);
  const subEn = sel.genre && sel.sub ? enOf(subGenresOf(sel.genre), sel.sub) : undefined;
  const en = [subEn, ...sel.moods.map((m) => enOf(allMoods, m)), enOf(TEMPOS, sel.tempo), ...sel.vocals.map((v) => enOf(VOCALS, v))].filter(Boolean) as string[];
  return { mood: sel.moods.join(", ").slice(0, 60), tags: en.join(", ") };
}
