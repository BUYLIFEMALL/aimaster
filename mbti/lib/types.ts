/**
 * 16개 유형 설명. 전부 자체 작성한 콘텐츠다 — 유형 코드(INFP 등) 자체는 업계 전반에서
 * 통용되는 일반적인 분류 표기이지 특정 회사의 저작물이 아니지만, 설명 문구는 공식 검사의
 * 리포트를 참고/복제하지 않고 독자적으로 썼다.
 */

export interface PersonalityType {
  code: string;
  emoji: string;
  epithet: string; // 카드 한 줄 타이틀
  oneLiner: string; // 공유용 한 줄 카피
  description: string;
  strengths: string[];
  color: string; // OG 카드 배경 그라디언트 시작색
}

export const PERSONALITY_TYPES: Record<string, PersonalityType> = {
  INTJ: {
    code: "INTJ",
    emoji: "♟️",
    epithet: "전략가",
    oneLiner: "머릿속에 이미 3수 앞을 그려둔 사람",
    description:
      "장기적인 그림을 먼저 그리고 거기에 맞춰 움직입니다. 비효율적인 방식을 유독 못 참고, 스스로 세운 기준에 도달할 때까지 묵묵히 파고드는 편이에요.",
    strengths: ["장기 전략 수립", "독립적인 문제 해결", "높은 기준"],
    color: "#4C1D95",
  },
  INTP: {
    code: "INTP",
    emoji: "🔬",
    epithet: "논리학자",
    oneLiner: "궁금한 건 끝까지 파고드는 타입",
    description:
      "새로운 개념이나 원리를 이해하는 데서 희열을 느낍니다. 정해진 답보다 '왜 그런가'를 스스로 납득해야 직성이 풀리는 편이에요.",
    strengths: ["분석적 사고", "호기심", "독창적인 아이디어"],
    color: "#312E81",
  },
  ENTJ: {
    code: "ENTJ",
    emoji: "🧭",
    epithet: "지휘관",
    oneLiner: "목표가 정해지면 바로 실행 모드",
    description:
      "목표를 향해 사람과 자원을 조직화하는 데 능숙합니다. 우유부단한 상황을 답답해하고, 결단력 있게 밀어붙이는 리더십이 강점이에요.",
    strengths: ["추진력", "리더십", "효율적인 실행"],
    color: "#7C2D12",
  },
  ENTP: {
    code: "ENTP",
    emoji: "💡",
    epithet: "발명가",
    oneLiner: "'이거 이렇게 하면 어떨까?'가 입버릇",
    description:
      "새로운 가능성을 발견하고 기존 방식에 물음표를 던지는 걸 즐깁니다. 토론을 통해 아이디어를 다듬어가는 과정 자체를 즐기는 편이에요.",
    strengths: ["발상 전환", "논쟁을 즐기는 순발력", "적응력"],
    color: "#B45309",
  },
  INFJ: {
    code: "INFJ",
    emoji: "🌙",
    epithet: "옹호자",
    oneLiner: "말 없이도 사람 마음을 먼저 읽는 사람",
    description:
      "타인의 감정과 상황을 섬세하게 읽어내고, 그 안에서 의미를 찾으려 합니다. 겉으로는 조용해 보여도 속에는 확고한 신념이 자리하고 있어요.",
    strengths: ["공감 능력", "통찰력", "깊은 신념"],
    color: "#065F46",
  },
  INFP: {
    code: "INFP",
    emoji: "🌿",
    epithet: "중재자",
    oneLiner: "내 방식대로, 내 속도대로 살고 싶은 사람",
    description:
      "자신만의 가치관을 소중히 여기고, 그 기준에 어긋나는 일에는 쉽게 움직이지 않습니다. 겉보기와 달리 내면에는 따뜻한 이상주의가 깔려 있어요.",
    strengths: ["진정성", "따뜻한 이상주의", "창의적인 표현"],
    color: "#15803D",
  },
  ENFJ: {
    code: "ENFJ",
    emoji: "🤝",
    epithet: "선도자",
    oneLiner: "주변 사람들을 자연스럽게 이끄는 사람",
    description:
      "사람들의 잠재력을 알아보고 북돋아주는 데 탁월합니다. 모임의 분위기를 살피고 조율하는 역할을 자처하게 되는 경우가 많아요.",
    strengths: ["설득력", "타인에 대한 관심", "조율 능력"],
    color: "#0E7490",
  },
  ENFP: {
    code: "ENFP",
    emoji: "✨",
    epithet: "활동가",
    oneLiner: "재밌어 보이면 일단 저지르고 보는 편",
    description:
      "새로운 사람, 새로운 경험에 호기심이 넘칩니다. 에너지가 넘치고 표현이 풍부해서 주변을 금세 활기차게 만드는 편이에요.",
    strengths: ["열정", "친화력", "즉흥적인 창의력"],
    color: "#C2410C",
  },
  ISTJ: {
    code: "ISTJ",
    emoji: "📋",
    epithet: "현실주의자",
    oneLiner: "말보다 행동, 약속은 반드시 지키는 사람",
    description:
      "정확성과 책임감을 중요하게 여기며, 한 번 맡은 일은 끝까지 해냅니다. 즉흥보다는 검증된 방식을 신뢰하는 편이에요.",
    strengths: ["책임감", "꼼꼼함", "일관성"],
    color: "#1E3A8A",
  },
  ISFJ: {
    code: "ISFJ",
    emoji: "🛡️",
    epithet: "수호자",
    oneLiner: "티 안 나게 주변을 챙기는 사람",
    description:
      "가까운 사람들의 필요를 세심하게 살피고 조용히 돕는 편입니다. 겉으로 드러내지 않아도 신뢰와 헌신이 깊게 자리하고 있어요.",
    strengths: ["세심한 배려", "성실함", "신뢰감"],
    color: "#166534",
  },
  ESTJ: {
    code: "ESTJ",
    emoji: "📐",
    epithet: "경영자",
    oneLiner: "체계 없이는 못 견디는 살아있는 조직도",
    description:
      "체계를 세우고 그 안에서 효율적으로 일을 처리하는 데 능숙합니다. 원칙과 절차가 분명할 때 오히려 마음이 편한 편이에요.",
    strengths: ["체계적 관리", "실행력", "책임감"],
    color: "#78350F",
  },
  ESFJ: {
    code: "ESFJ",
    emoji: "🎀",
    epithet: "집정관",
    oneLiner: "모임에서 분위기 챙기는 그 사람",
    description:
      "주변 사람들의 상황을 잘 살피고, 함께하는 자리가 편안하도록 배려합니다. 관계 속에서 소속감과 조화를 특히 중요하게 여겨요.",
    strengths: ["사교성", "배려심", "협조적인 태도"],
    color: "#9D174D",
  },
  ISTP: {
    code: "ISTP",
    emoji: "🔧",
    epithet: "장인",
    oneLiner: "일단 손으로 직접 뜯어보는 사람",
    description:
      "이론보다 직접 해보면서 원리를 익히는 걸 선호합니다. 위기 상황에서도 침착하게 문제의 본질부터 파악하려 해요.",
    strengths: ["실용적 문제 해결", "침착함", "손재주"],
    color: "#334155",
  },
  ISFP: {
    code: "ISFP",
    emoji: "🎨",
    epithet: "모험가",
    oneLiner: "말없이 자기만의 감각으로 사는 사람",
    description:
      "자신의 감각과 취향을 중요하게 여기며, 억지로 남에게 맞추기보다 자연스러운 흐름을 따릅니다. 은근히 예술적인 감각이 있는 편이에요.",
    strengths: ["섬세한 감각", "유연함", "자유로운 태도"],
    color: "#065F46",
  },
  ESTP: {
    code: "ESTP",
    emoji: "🏄",
    epithet: "사업가",
    oneLiner: "고민할 시간에 일단 몸이 먼저 나가는 사람",
    description:
      "지금 이 순간의 상황을 빠르게 파악하고 즉각 대응하는 데 능합니다. 위험을 감수하더라도 일단 부딪혀보는 실행력이 강점이에요.",
    strengths: ["순발력", "현실 감각", "대담함"],
    color: "#B91C1C",
  },
  ESFP: {
    code: "ESFP",
    emoji: "🎉",
    epithet: "연예인",
    oneLiner: "어디 가나 분위기 메이커",
    description:
      "즐거움을 나누고 지금 이 순간을 만끽하는 데 진심입니다. 주변을 즐겁게 만드는 특유의 에너지로 모임의 활력소가 되는 편이에요.",
    strengths: ["긍정적 에너지", "친화력", "순발력"],
    color: "#A16207",
  },
};

export const ALL_TYPE_CODES = Object.keys(PERSONALITY_TYPES);
