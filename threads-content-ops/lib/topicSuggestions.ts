// 2026-10-23 v2.15 병합 A: `threads-easy-planner`의 요일·시간대 추천 주제(src/lib/constants/luckyTopics.ts)를 옮겼다.
// 주제 칸을 채우는 예시일 뿐이며, 글 생성은 이 앱의 사실 원칙(글감에 없는 경험을 지어내지 않음)을 그대로 따른다.
// 페르소나 id는 이 앱 기준(기획 앱의 homemaker → housewife).

export type TimeContext = { timeLabel: string; vibe: string; personaId: string; topics: string[] };

export const MOOD_TOPICS: { label: string; emoji: string; personaId: string; topics: string[] }[] = [
  { label: "공감 일상", emoji: "🤣", personaId: "single", topics: ["자취 5년 차에 깨달은 돈 버리는 살림템 vs 진짜 필수템", "주말에 누워서 넷플릭스 보다가 현타 온 순간과 극복법", "남들은 모르는 나만의 절약 루틴 3가지"] },
  { label: "살림 찐템", emoji: "🧺", personaId: "housewife", topics: ["워싱소다·백식초로 안 되던 세탁조 청소 방법", "비싼 줄 알았는데 가성비였던 살림템", "다이소 천 원으로 삶의 질 올린 주방 꿀템"] },
  { label: "직장·돈 팩폭", emoji: "⚡", personaId: "side_hustle", topics: ["통장 잔고 50만원에서 부업으로 월 100만원 만드는 현실 과정", "퇴사 마려울 때 통장 보고 마음 다잡는 생존법", "30대에 인간관계 정리하고 통장 잔고 불어난 이유"] },
];

/** 지금 요일·시간대(한국 시간)에 어울리는 추천 주제. */
export function currentTimeContext(now = new Date()): TimeContext {
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = kst.getDay();
  const hour = kst.getHours();
  if (day === 1 && hour < 14) return { timeLabel: "월요병 출근길", vibe: "월요병 극복·출근길 직장인 공감", personaId: "working_mom", topics: ["월요일 출근하자마자 퇴사 마려운 순간과 멘탈 복구법", "월급날 통장 스쳐 간 뒤 시작한 강제 절약 팁", "출근길 피드 보며 헛웃음 나는 직장 생활 현실"] };
  if (day === 5 && hour >= 16) return { timeLabel: "불타는 금요일 밤", vibe: "일주일 버틴 나를 위한 보상", personaId: "single", topics: ["금요일 퇴근 후 혼자 먹는 가성비 야식 조합", "일주일 고생한 나를 위한 3만원 이하 소확행 템", "금요일 밤 침대에서 시작하면 안 되는 딴짓"] };
  if (day === 0 || day === 6) return { timeLabel: "나른한 주말", vibe: "주말 대청소·가성비 살림", personaId: "housewife", topics: ["주말 대청소 때 꼭 보는 세탁조·주방 청소 포인트", "왜 이제 샀나 싶은 다이소·쿠팡 살림템", "일요일 밤 월요일 오기 전 마음 잡는 현실 조언"] };
  if (hour >= 21 || hour < 4) return { timeLabel: "새벽 감성 심야", vibe: "잠 안 올 때 멈추는 속마음 이야기", personaId: "single", topics: ["새벽 충동구매가 인생템이 되는 경우", "30대에 인간관계 정리하고 마음 편해진 이유", "통장 잔고 바닥일 때 다시 일어서는 방법"] };
  return { timeLabel: "나른한 평일 오후", vibe: "일상 피로를 날리는 꿀팁", personaId: "housewife", topics: ["워싱소다·백식초로 안 되던 세탁조 청소 방법", "비싼 줄 알았는데 가성비였던 살림템", "자취 5년 차가 꼽는 돈 버리는 살림템 vs 필수템"] };
}
