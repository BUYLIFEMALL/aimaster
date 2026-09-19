import { TAROT_DECK, type Orientation } from "./cards";

export type SpreadType =
  | "one_card"
  | "three_cards"
  | "love_three_cards"
  | "five_cards"
  | "celtic_cross"
  | "horseshoe"
  | "relationship"
  | "career"
  | "year_ahead"
  | "tree_of_life"
  | "mandala"
  | "yes_no";

export type CardStyle =
  | "watercolor"
  | "korean_traditional"
  | "stained_glass"
  | "dark_art_nouveau"
  | "cyberpunk"
  | "cute_character";

export interface CardStyleOption {
  id: CardStyle;
  name: string;
  badge: string;
  description: string;
  promptModifier: string;
}

export const CARD_STYLES: Record<CardStyle, CardStyleOption> = {
  watercolor: {
    id: "watercolor",
    name: "몽환 수채화",
    badge: "🎨 판타지",
    description: "부드럽고 신비로운 수채화 파스텔 분위기",
    promptModifier: "Mystical watercolor illustration style, soft pastel palette with glowing magical aura, dreamy atmospheric lighting",
  },
  cute_character: {
    id: "cute_character",
    name: "귀여운 캐릭터",
    badge: "🧸 아기자기 큐트",
    description: "귀엽고 사랑스러운 동화 캐릭터 스타일",
    promptModifier: "Cute anime chibi character illustration style, adorable whimsical fairytale aesthetic, soft warm pastels, round expressive eyes, charming pastel background",
  },
  korean_traditional: {
    id: "korean_traditional",
    name: "한국 전통 동양화",
    badge: "🏮 단청 & 산수화",
    description: "단청과 한지 고풍스러운 동양미 감성",
    promptModifier: "Korean traditional Dancheong and Minhwa art style, elegant ink wash painting on Hanji paper, oriental gold and cyan accents",
  },
  stained_glass: {
    id: "stained_glass",
    name: "네온 스테인드글라스",
    badge: "🏛️ 성당 고딕",
    description: "고딕 성당 유리창과 화려한 빛의 판타지",
    promptModifier: "Intricate stained glass window illustration style, vibrant jewel tones with glowing leaded outlines, divine light beaming through",
  },
  dark_art_nouveau: {
    id: "dark_art_nouveau",
    name: "다크 아르누보 골드",
    badge: "👑 럭셔리 골드",
    description: "딥 블랙 배경에 화려한 찬란한 금빛 라인 아르누보",
    promptModifier: "Dark luxury Art Nouveau tarot card style, ornate golden linework on deep obsidian velvet background, Alphonse Mucha inspired elegant frame",
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "사이버펑크 네온",
    badge: "⚡ 미래 지향",
    description: "네온 홀로그램과 미래적 사이버 감성",
    promptModifier: "Futuristic Cyberpunk neon tarot style, glowing magenta and cyan holographic lineart, sci-fi synthwave aesthetic",
  },
};

export const GEMINI_MODEL_OPTIONS = [
  { value: "nanobanana-2-2k", label: "NanoBanana 2-2K (2K 고화질 비주얼 - 추천)" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2-4K (4K 울트라 HD)" },
  { value: "nanobanana-pro", label: "NanoBanana Pro (프로페셔널 타로 아트)" },
  { value: "nanobanana", label: "NanoBanana Standard (기본 모델)" },
] as const;

export const OPENAI_MODEL_OPTIONS = [
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol (최고 품질 · 가장 똑똑한 타로 리딩 - 추천)" },
  { value: "gpt-5.6-terra", label: "GPT-5.6 Terra (균형형 · 자연스러운 심층 해석)" },
  { value: "gpt-5.6-luna", label: "GPT-5.6 Luna (가성비 · 신속한 타로 해석)" },
  { value: "gpt-5.5-sol", label: "GPT-5.5 Sol (고성능 심층 리딩)" },
  { value: "gpt-5.5-terra", label: "GPT-5.5 Terra (자연스러운 균형 해석)" },
  { value: "gpt-5.5-luna", label: "GPT-5.5 Luna (신속한 타로 해석)" },
  { value: "gpt-5.4-sol", label: "GPT-5.4 Sol (안정적인 고품질 리딩)" },
  { value: "gpt-5.4-terra", label: "GPT-5.4 Terra (균형형 타로 해석)" },
  { value: "gpt-5.4-luna", label: "GPT-5.4 Luna (가성비 타로 해석)" },
  { value: "o3-mini", label: "OpenAI o3-Mini (추론 특화 AI - 명쾌한 논리 리딩)" },
  { value: "o1", label: "OpenAI o1 (최고 수준 심층 추론 AI)" },
] as const;

export type SpreadPosition =
  | "advice"
  | "past"
  | "present"
  | "future"
  | "me"
  | "other"
  | "situation"
  | "cause"
  | "obstacle"
  | "result"
  | "challenge"
  | "distant_past"
  | "recent_past"
  | "possible_outcome"
  | "near_future"
  | "self_attitude"
  | "external_influences"
  | "hopes_fears"
  | "final_outcome"
  | "hidden_influences"
  | "connection"
  | "strength"
  | "opportunity"
  | "jan"
  | "feb"
  | "mar"
  | "apr"
  | "may"
  | "jun"
  | "jul"
  | "aug"
  | "sep"
  | "oct"
  | "nov"
  | "dec"
  | "keter"
  | "chokmah"
  | "binah"
  | "chesed"
  | "gevurah"
  | "tiferet"
  | "netzach"
  | "hod"
  | "yesod"
  | "malkuth"
  | "core"
  | "love"
  | "work"
  | "finance"
  | "health"
  | "family"
  | "growth"
  | "spirit"
  | "joy"
  | "sign_one"
  | "sign_two"
  | "sign_three";

export const SPREAD_POSITION_LABELS: Record<string, string> = {
  advice: "오늘의 조언",
  past: "과거",
  present: "현재",
  future: "미래",
  me: "나의 마음",
  other: "상대방의 마음",
  situation: "현재 상황",
  cause: "원인 · 배경",
  obstacle: "장애물 · 주의",
  result: "최종 결과",
  challenge: "도전 · 장애물",
  distant_past: "먼 과거 · 근본 원인",
  recent_past: "최근 과거",
  possible_outcome: "가능한 미래",
  near_future: "가까운 미래",
  self_attitude: "나 자신의 태도",
  external_influences: "주변 환경 · 외부 영향",
  hopes_fears: "희망과 두려움",
  final_outcome: "최종 결과",
  hidden_influences: "숨겨진 영향",
  connection: "두 사람의 연결고리",
  strength: "관계의 강점",
  opportunity: "다가오는 기회",
  keter: "영적 목표 · 근본 동기",
  chokmah: "영감 · 창조적 시작",
  binah: "이해 · 내면의 통찰",
  chesed: "자비 · 확장과 성장",
  gevurah: "절제 · 한계와 규율",
  tiferet: "균형 · 나의 중심",
  netzach: "감정 · 열정과 욕망",
  hod: "지성 · 소통과 표현",
  yesod: "잠재의식 · 무의식의 기반",
  malkuth: "현실 · 최종 결과",
  core: "지금 나의 핵심 테마",
  love: "사랑 · 관계",
  work: "일 · 커리어",
  finance: "재정 · 물질",
  health: "건강 · 활력",
  family: "가족",
  growth: "자기계발 · 성장",
  spirit: "영성 · 내면",
  joy: "여가 · 즐거움",
  sign_one: "첫 번째 신호",
  sign_two: "두 번째 신호",
  sign_three: "세 번째 신호",
};

export interface SpreadInfo {
  type: SpreadType;
  title: string;
  subtitle: string;
  badge: string;
  cardCount: number;
  positions: SpreadPosition[];
  positionLabels: Record<string, string>;
  positionDescriptions: Record<string, string>;
}

// 한 해 운세(12개월) 스프레드의 자리 구성 — 1~12월 각각 하나의 카드 자리다. 매달
// 반복되는 라벨/설명이라 손으로 12줄씩 나열하는 대신 여기서 한 번에 만들어 쓴다.
const YEAR_AHEAD_MONTH_KEYS: SpreadPosition[] = [
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
];
const YEAR_AHEAD_MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월",
];

export const SPREAD_CONFIGS: Record<SpreadType, SpreadInfo> = {
  one_card: {
    type: "one_card",
    title: "오늘의 운세 (원카드 조언)",
    subtitle: "부담 없이 매일 아침 체크하는 오늘의 타로 한 장",
    badge: "🎴 1카드",
    cardCount: 1,
    positions: ["advice"],
    positionLabels: {
      advice: "오늘의 조언",
    },
    positionDescriptions: {
      advice: "오늘 하루 당신에게 필요한 핵심 조언과 메시지입니다.",
    },
  },
  three_cards: {
    type: "three_cards",
    title: "과거 · 현재 · 미래 (기본 3카드)",
    subtitle: "흐름을 한눈에 파악하는 대표적인 타로 리딩",
    badge: "🔮 3카드",
    cardCount: 3,
    positions: ["past", "present", "future"],
    positionLabels: {
      past: "과거",
      present: "현재",
      future: "미래",
    },
    positionDescriptions: {
      past: "현재 상황을 만들어낸 핵심 사건과 경험",
      present: "당신이 직면해 있는 직관적인 현재 에너지",
      future: "앞으로 다가올 결과와 나아가야 할 방향",
    },
  },
  love_three_cards: {
    type: "love_three_cards",
    title: "연인 & 친구 궁합 (관계 3카드)",
    subtitle: "너와 나, 그리고 우리의 관계와 미래 분석",
    badge: "💖 3카드 궁합",
    cardCount: 3,
    positions: ["me", "other", "future"],
    positionLabels: {
      me: "나의 마음",
      other: "상대방의 마음",
      future: "우리의 미래",
    },
    positionDescriptions: {
      me: "이 관계에서 내가 느끼는 속마음과 태도",
      other: "나를 바라보는 상대방의 진심과 상태",
      future: "두 사람이 함께 만들어갈 진전과 관계의 흐름",
    },
  },
  five_cards: {
    type: "five_cards",
    title: "심층 분석 타로 (5카드 솔루션)",
    subtitle: "원인부터 조언, 장애물, 결과까지 명쾌하게 풀어주는 종합 리딩",
    badge: "✨ 5카드 심층",
    cardCount: 5,
    positions: ["situation", "cause", "advice", "obstacle", "result"],
    positionLabels: {
      situation: "현재 상황",
      cause: "원인 · 배경",
      advice: "해법 · 조언",
      obstacle: "장애물 · 주의",
      result: "최종 결과",
    },
    positionDescriptions: {
      situation: "현재 직면해 있는 고민과 환경의 전체적인 상태",
      cause: "이 문제나 마음의 상태가 생겨난 근본적인 원인",
      advice: "문제를 슬기롭게 해결하기 위해 취해야 할 액션",
      obstacle: "진행 과정에서 주의해야 할 경계나 방해 요소",
      result: "조언을 따랐을 때 다가올 최종적인 흐름과 결과",
    },
  },
  celtic_cross: {
    type: "celtic_cross",
    title: "켈틱 크로스 (정통 10카드 심층)",
    subtitle: "가장 정통적이고 입체적인 타로 스프레드로 고민의 모든 면을 살펴봅니다",
    badge: "🔟 켈틱크로스",
    cardCount: 10,
    positions: [
      "present",
      "challenge",
      "distant_past",
      "recent_past",
      "possible_outcome",
      "near_future",
      "self_attitude",
      "external_influences",
      "hopes_fears",
      "final_outcome",
    ],
    positionLabels: {
      present: "현재 상황",
      challenge: "도전 · 장애물",
      distant_past: "먼 과거 · 근본 원인",
      recent_past: "최근 과거",
      possible_outcome: "가능한 미래",
      near_future: "가까운 미래",
      self_attitude: "나 자신의 태도",
      external_influences: "주변 환경 · 외부 영향",
      hopes_fears: "희망과 두려움",
      final_outcome: "최종 결과",
    },
    positionDescriptions: {
      present: "지금 당신이 처해 있는 핵심적인 상황과 에너지",
      challenge: "지금 상황을 가로막거나 직접 마주해야 할 도전 과제",
      distant_past: "이 상황의 뿌리가 된 먼 과거의 사건이나 근본 원인",
      recent_past: "최근에 지나온, 지금 상황에 영향을 준 흐름",
      possible_outcome: "지금 흐름대로라면 도달할 수 있는 가능성 있는 미래",
      near_future: "가까운 시일 안에 다가올 사건이나 변화",
      self_attitude: "이 상황을 대하는 당신 자신의 마음가짐과 태도",
      external_influences: "주변 사람이나 환경이 이 상황에 미치는 영향",
      hopes_fears: "이 상황에 대해 마음 깊이 품고 있는 희망과 두려움",
      final_outcome: "모든 요소가 종합됐을 때 다다르게 될 최종적인 결과",
    },
  },
  horseshoe: {
    type: "horseshoe",
    title: "말굽 스프레드 (심층 7카드)",
    subtitle: "과거부터 예상 결과까지, 조언을 중심에 두고 살펴보는 균형 잡힌 7카드 리딩",
    badge: "🐴 말굽 7카드",
    cardCount: 7,
    positions: [
      "past",
      "present",
      "hidden_influences",
      "obstacle",
      "external_influences",
      "advice",
      "result",
    ],
    positionLabels: {
      past: "과거의 영향",
      present: "현재 상황",
      hidden_influences: "숨겨진 영향",
      obstacle: "장애물 · 극복할 점",
      external_influences: "주변 환경 · 외부 영향",
      advice: "조언 · 취해야 할 행동",
      result: "예상되는 결과",
    },
    positionDescriptions: {
      past: "지금 상황에 영향을 준 과거의 흐름과 경험",
      present: "지금 당신이 놓여 있는 현재 상황",
      hidden_influences: "겉으로 드러나지 않았지만 실제로 작용하고 있는 숨은 요인",
      obstacle: "앞으로 나아가기 위해 넘어서야 할 장애물이나 주의할 점",
      external_influences: "주변 사람이나 환경이 이 상황에 미치는 영향",
      advice: "지금 취하면 좋을 현실적인 조언과 행동 방향",
      result: "이 흐름대로라면 다다르게 될 예상 결과",
    },
  },
  relationship: {
    type: "relationship",
    title: "관계 심층 분석 (6카드)",
    subtitle: "나와 상대방, 관계의 연결고리부터 강점·과제·방향까지 깊이 있게 살펴봅니다",
    badge: "💞 관계 6카드",
    cardCount: 6,
    positions: ["me", "other", "connection", "strength", "challenge", "possible_outcome"],
    positionLabels: {
      me: "나의 마음과 역할",
      other: "상대방의 마음과 역할",
      connection: "두 사람의 연결고리",
      strength: "관계의 강점",
      challenge: "관계의 과제",
      possible_outcome: "관계가 나아갈 방향",
    },
    positionDescriptions: {
      me: "이 관계 안에서 내가 느끼는 감정과 내가 맡고 있는 역할",
      other: "상대방이 이 관계에서 느끼는 감정과 맡고 있는 역할",
      connection: "두 사람을 이어주는 근본적인 연결고리와 관계의 바탕",
      strength: "이 관계가 가진 강점, 잘 맞는 부분",
      challenge: "관계를 더 깊게 만들기 위해 함께 풀어야 할 과제나 장애물",
      possible_outcome: "지금의 흐름대로라면 이 관계가 나아갈 방향",
    },
  },
  career: {
    type: "career",
    title: "커리어 · 진로 스프레드 (6카드)",
    subtitle: "현재 상황부터 강점, 걸림돌, 기회, 조언, 결과까지 진로 고민을 입체적으로 살펴봅니다",
    badge: "💼 커리어 6카드",
    cardCount: 6,
    positions: ["situation", "strength", "obstacle", "opportunity", "advice", "result"],
    positionLabels: {
      situation: "현재 커리어 상황",
      strength: "나의 강점 · 역량",
      obstacle: "걸림돌 · 극복할 점",
      opportunity: "다가오는 기회",
      advice: "다음 행동 · 조언",
      result: "예상되는 결과",
    },
    positionDescriptions: {
      situation: "지금 일이나 진로에서 놓여 있는 현재 상황",
      strength: "이 상황에서 내가 가진 강점과 활용할 수 있는 역량",
      obstacle: "앞으로 나아가기 위해 넘어서야 할 걸림돌이나 주의할 점",
      opportunity: "지금 또는 가까운 시일 안에 다가올 수 있는 기회",
      advice: "지금 취하면 좋을 현실적인 다음 행동",
      result: "이 흐름대로라면 다다르게 될 예상 결과",
    },
  },
  year_ahead: {
    type: "year_ahead",
    title: "한 해 운세 (12개월 리딩)",
    subtitle: "1월부터 12월까지, 한 달에 카드 한 장씩 올해 전체의 흐름을 짚어봅니다",
    badge: "🗓️ 한 해 운세 12카드",
    cardCount: 12,
    positions: YEAR_AHEAD_MONTH_KEYS,
    positionLabels: Object.fromEntries(
      YEAR_AHEAD_MONTH_KEYS.map((key, i) => [key, YEAR_AHEAD_MONTH_NAMES[i]]),
    ),
    positionDescriptions: Object.fromEntries(
      YEAR_AHEAD_MONTH_KEYS.map((key, i) => [key, `${YEAR_AHEAD_MONTH_NAMES[i]}에 다가올 전반적인 흐름과 기운`]),
    ),
  },
  tree_of_life: {
    type: "tree_of_life",
    title: "생명의 나무 (카발라 10카드)",
    subtitle: "카발라 세피로트에 기반한 정통 신비주의 스프레드로 영적 목표부터 현실까지 살펴봅니다",
    badge: "🌳 생명의 나무 10카드",
    cardCount: 10,
    positions: [
      "keter",
      "chokmah",
      "binah",
      "chesed",
      "gevurah",
      "tiferet",
      "netzach",
      "hod",
      "yesod",
      "malkuth",
    ],
    positionLabels: {
      keter: "영적 목표 · 근본 동기 (Keter)",
      chokmah: "영감 · 창조적 시작 (Chokmah)",
      binah: "이해 · 내면의 통찰 (Binah)",
      chesed: "자비 · 확장과 성장 (Chesed)",
      gevurah: "절제 · 한계와 규율 (Gevurah)",
      tiferet: "균형 · 나의 중심 (Tiferet)",
      netzach: "감정 · 열정과 욕망 (Netzach)",
      hod: "지성 · 소통과 표현 (Hod)",
      yesod: "잠재의식 · 무의식의 기반 (Yesod)",
      malkuth: "현실 · 최종 결과 (Malkuth)",
    },
    positionDescriptions: {
      keter: "이 상황의 가장 근본적인 동기와 영적인 목표",
      chokmah: "새로운 영감과 창조적 시작의 씨앗",
      binah: "직관을 통해 얻는 깊은 이해와 통찰",
      chesed: "자비롭게 확장되고 성장하는 흐름",
      gevurah: "스스로에게 필요한 절제와 한계, 규율",
      tiferet: "모든 것이 조화를 이루는 나의 중심",
      netzach: "마음속에 흐르는 감정과 열정, 욕망",
      hod: "생각을 정리하고 표현하는 지성의 힘",
      yesod: "겉으로 드러나지 않은 무의식의 기반",
      malkuth: "모든 것이 종합되어 나타나는 현실의 결과",
    },
  },
  mandala: {
    type: "mandala",
    title: "만다라 라이프 밸런스 (9카드)",
    subtitle: "핵심 테마를 중심으로 사랑·일·재정·건강 등 삶의 여러 영역을 한 번에 점검합니다",
    badge: "🌸 만다라 9카드",
    cardCount: 9,
    positions: ["core", "love", "work", "finance", "health", "family", "growth", "spirit", "joy"],
    positionLabels: {
      core: "지금 나의 핵심 테마",
      love: "사랑 · 관계",
      work: "일 · 커리어",
      finance: "재정 · 물질",
      health: "건강 · 활력",
      family: "가족",
      growth: "자기계발 · 성장",
      spirit: "영성 · 내면",
      joy: "여가 · 즐거움",
    },
    positionDescriptions: {
      core: "지금 이 순간 내 삶 전체를 관통하는 핵심 테마",
      love: "사랑과 인간관계 영역의 현재 흐름",
      work: "일과 커리어 영역의 현재 흐름",
      finance: "재정과 물질적 영역의 현재 흐름",
      health: "몸과 마음의 건강, 활력 상태",
      family: "가족과의 관계 흐름",
      growth: "자기계발과 성장의 흐름",
      spirit: "영성과 내면의 상태",
      joy: "여가와 즐거움, 삶의 활력소",
    },
  },
  yes_no: {
    type: "yes_no",
    title: "예 / 아니오 타로 (3카드 판정)",
    subtitle: "예/아니오로 답할 수 있는 질문에 세 장의 카드로 명쾌한 답을 구합니다",
    badge: "🎯 예·아니오 3카드",
    cardCount: 3,
    positions: ["sign_one", "sign_two", "sign_three"],
    positionLabels: {
      sign_one: "첫 번째 신호",
      sign_two: "두 번째 신호",
      sign_three: "세 번째 신호",
    },
    positionDescriptions: {
      sign_one: "질문에 대한 첫 번째 신호",
      sign_two: "질문에 대한 두 번째 신호",
      sign_three: "질문에 대한 세 번째 신호",
    },
  },
};

export interface DrawnCard {
  cardId: string;
  position: SpreadPosition;
  orientation: Orientation;
}

/**
 * 선택된 스프레드 유형에 맞춰 78장 중 카드들을 무작위로 뽑습니다.
 */
export function drawCards(spreadType: SpreadType = "three_cards"): DrawnCard[] {
  const config = SPREAD_CONFIGS[spreadType] ?? SPREAD_CONFIGS.three_cards;
  const count = config.cardCount;

  const shuffled = [...TAROT_DECK].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((card, idx) => ({
    cardId: card.id,
    position: config.positions[idx],
    orientation: Math.random() < 0.5 ? "upright" : "reversed",
  }));
}

/** 기존 하위 호환성을 유지하는 3카드 뽑기 함수 */
export function drawThreeCardSpread(): DrawnCard[] {
  return drawCards("three_cards");
}

/** 결과 페이지 URL에 실을 짧은 문자열로 직렬화합니다. 
 * 예: "three_cards|watercolor|major-00:U:past,minor-cups-03:R:present,major-21:U:future"
 */
export function serializeDraw(
  cards: DrawnCard[],
  spreadType: SpreadType = "three_cards",
  cardStyle: CardStyle = "watercolor",
): string {
  const cardStr = cards
    .map((c) => `${c.cardId}:${c.orientation === "upright" ? "U" : "R"}:${c.position}`)
    .join(",");
  return `${spreadType}|${cardStyle}|${cardStr}`;
}

export function deserializeDraw(
  raw: string | undefined,
): { spreadType: SpreadType; cardStyle: CardStyle; cards: DrawnCard[] } | null {
  if (!raw) return null;

  let spreadType: SpreadType = "three_cards";
  let cardStyle: CardStyle = "watercolor";
  let cardsPart = raw;

  if (raw.includes("|")) {
    const parts = raw.split("|");
    if (parts.length === 3) {
      spreadType = (parts[0] in SPREAD_CONFIGS ? parts[0] : "three_cards") as SpreadType;
      cardStyle = (parts[1] in CARD_STYLES ? parts[1] : "watercolor") as CardStyle;
      cardsPart = parts[2] || "";
    } else if (parts.length === 2) {
      spreadType = (parts[0] in SPREAD_CONFIGS ? parts[0] : "three_cards") as SpreadType;
      cardsPart = parts[1] || "";
    }
  }

  const parts = cardsPart.split(",").filter(Boolean);
  const config = SPREAD_CONFIGS[spreadType] ?? SPREAD_CONFIGS.three_cards;

  if (parts.length !== config.cardCount && !raw.includes("|")) {
    // 구 버전 파라미터(3카드) 호환 처리
    if (parts.length === 3) {
      spreadType = "three_cards";
    } else if (parts.length === 1) {
      spreadType = "one_card";
    } else {
      return null;
    }
  }

  const result: DrawnCard[] = [];
  const currentConfig = SPREAD_CONFIGS[spreadType];

  for (let i = 0; i < parts.length; i++) {
    const [cardId, flag, pos] = parts[i].split(":");
    if (!cardId || (flag !== "U" && flag !== "R")) return null;

    const position = (pos as SpreadPosition) || currentConfig.positions[i] || "present";
    result.push({
      cardId,
      position,
      orientation: flag === "U" ? "upright" : "reversed",
    });
  }

  return { spreadType, cardStyle, cards: result };
}
