import { TAROT_DECK, type Orientation } from "./cards";

export type SpreadType = "one_card" | "three_cards" | "love_three_cards" | "five_cards";

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
  { value: "gpt-4o", label: "GPT-4o (플래그십 - 깊이 있는 심층 해석 - 추천)" },
  { value: "o3-mini", label: "OpenAI o3-Mini (추론 특화 AI - 명쾌한 논리 리딩)" },
  { value: "o1", label: "OpenAI o1 (최고 수준 심층 추론 AI)" },
  { value: "o1-mini", label: "OpenAI o1-Mini (경량 추론 AI)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo (고성능 전통 지식 모델)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (가성비 기본 모델)" },
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
  | "result";

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
