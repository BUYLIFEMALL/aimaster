/**
 * 아무 생각 없을 때를 위한 요일/시간대별 실전 떡상 썰 풀 및 3대 무드 칩
 */

export interface QuickMoodChip {
  id: string;
  emoji: string;
  label: string;
  tagline: string;
  personaId: string;
  seedTopics: string[];
}

export const QUICK_MOOD_CHIPS: QuickMoodChip[] = [
  {
    id: "relatable",
    emoji: "🤣",
    label: "찌질·공감 일상 썰",
    tagline: "나만 이런 줄 알았는데 다들 똑같은 현실 흑역사",
    personaId: "single",
    seedTopics: [
      "자취 5년 차에 깨달은 돈 버리는 살림템 vs 진짜 필수템",
      "주말에 누워서 넷플릭스 보다가 현타 온 순간과 극복 썰",
      "남들은 모르는 나만의 찌질한 절약 루틴 3가지",
    ],
  },
  {
    id: "item",
    emoji: "🧺",
    label: "써보고 기절한 찐템",
    tagline: "워싱소다 백식초 다 소용없고 이거 하나로 끝난 썰",
    personaId: "homemaker",
    seedTopics: [
      "워싱소다 백식초 다 써봐도 안 되길래 추천받고 물색깔 보고 기절한 세탁조 클리너",
      "이거 비싼 건줄 알았는데 가성비템이라 쟁여둔 실사용 썰",
      "다이소에서 천 원 주고 샀다가 삶의 질 수직 상승한 주방 꿀템",
    ],
  },
  {
    id: "reality",
    emoji: "⚡",
    label: "직장·돈 버는 팩폭",
    tagline: "월급날 통장 스쳐 지나간 뒤 정신 차린 현실 실행",
    personaId: "side_hustle",
    seedTopics: [
      "통장 잔고 50만원에서 부업으로 월 100만원 만든 현실 과정",
      "퇴사 마려울 때마다 통장 보고 마음 다잡는 현실 생존법",
      "30대 되고 나서 인간관계 싹 정리하고 통장 잔고 불어난 썰",
    ],
  },
];

export interface TimeContextInfo {
  timeLabel: string;
  recommendedVibe: string;
  defaultTopics: string[];
  suggestedPersonaId: string;
}

export function getCurrentTimeContext(): TimeContextInfo {
  const now = new Date();
  const day = now.getDay(); // 0: 일, 1: 월, ... 6: 토
  const hour = now.getHours();

  // 월요일 오전 / 출근길
  if (day === 1 && hour < 14) {
    return {
      timeLabel: "월요병 출근길",
      recommendedVibe: "월요병 극복 및 출근길 직장인 현실 공감",
      suggestedPersonaId: "working_mom",
      defaultTopics: [
        "월요일 출근하자마자 퇴사 마려웠던 순간과 현실 멘탈 복구 썰",
        "월급날 통장 스쳐 지나간 뒤 정신 차리고 시작한 강제 절약 팁",
        "출근길에 피드 보며 헛웃음 터진 직장 생활 찐현실",
      ],
    };
  }

  // 금요일 저녁 / 불금
  if (day === 5 && hour >= 16) {
    return {
      timeLabel: "불타는 금요일 밤",
      recommendedVibe: "일주일 버틴 나를 위한 보상과 해방감 썰",
      suggestedPersonaId: "single",
      defaultTopics: [
        "금요일 퇴근하고 혼자 침대에서 시켜먹는 갓성비 야식 조합",
        "일주일 동안 개고생한 나를 위해 지른 3만원 이하 소확행 템",
        "금요일 밤에 절대 침대에서 시작하면 안 되는 딴짓 썰",
      ],
    };
  }

  // 주말 (토, 일)
  if (day === 0 || day === 6) {
    return {
      timeLabel: "나른한 주말",
      recommendedVibe: "침대에서 넘겨보는 대청소 & 갓성비 살림 썰",
      suggestedPersonaId: "homemaker",
      defaultTopics: [
        "주말에 대청소하다가 발견하고 기절한 세탁조/주방 때 썰",
        "주말 내내 써보고 왜 이제 샀나 후회한 다이소/쿠팡 꿀템",
        "일요일 밤 월요일 오기 전 현타 올 때 마음 잡는 현실 조언",
      ],
    };
  }

  // 심야 / 새벽 (21시 ~ 04시)
  if (hour >= 21 || hour < 4) {
    return {
      timeLabel: "새벽 감성 심야 시간",
      recommendedVibe: "밤에 잠 안 올 때 스크롤 멈추는 진솔한 속마음 썰",
      suggestedPersonaId: "single",
      defaultTopics: [
        "새벽에 잠 안 와서 충동구매했는데 인생템 된 물건 썰",
        "30대 되고 나서 인간관계 싹 정리하고 마음 편해진 썰",
        "통장 잔고 50만원 시절 매일 밤마다 자책하다가 일어선 과정",
      ],
    };
  }

  // 평일 낮 / 오후 (기본값)
  return {
    timeLabel: "나른한 평일 오후",
    recommendedVibe: "일상 피로를 날리는 꿀팁 및 기절템 썰",
    suggestedPersonaId: "homemaker",
    defaultTopics: [
      "워싱소다 백식초 다 써봐도 안 되길래 추천받아 쓰고 기절한 세탁조 썰",
      "이거 비싼 건줄 알았는데 가성비템이라 쟁여둔 실사용 썰",
      "자취 5년 차에 깨달은 돈 버리는 살림템 vs 진짜 필수템 비교",
    ],
  };
}

/**
 * 아무 생각 없을 때를 위한 랜덤 럭키 픽 1개 추출
 */
export function getRandomLuckyPick(): { topic: string; personaId: string; timeLabel: string } {
  const timeCtx = getCurrentTimeContext();
  const allPool = [
    ...timeCtx.defaultTopics,
    ...QUICK_MOOD_CHIPS.flatMap((c) => c.seedTopics),
  ];
  const randomTopic = allPool[Math.floor(Math.random() * allPool.length)];
  return {
    topic: randomTopic,
    personaId: timeCtx.suggestedPersonaId,
    timeLabel: timeCtx.timeLabel,
  };
}
