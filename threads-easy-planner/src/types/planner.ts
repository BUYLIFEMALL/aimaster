export interface TopicSuggestion {
  id: number;
  topic: string;
  hookPreview: string;
  whyItWorks: string;
}

export interface HookVariant {
  type: string; // 자책형 | 부정 명령형 | 리얼 썰형 | 논쟁형 | 반전형
  hook: string;
  whyItWorks: string;
  content: string;
}

export interface ThreadPlanResult {
  topic: string;
  hook: string;
  hookType?: string;
  whyHookWorks?: string;
  content: string;
  cta: string;
  followUpIdeas: string[];
  hookVariants?: HookVariant[];
}

/**
 * 개별 최적화 이미지 아이템 (다중 이미지 지원)
 */
export interface ProcessedImageItem {
  id: string;
  fileName: string;
  previewUrl: string;
  base64: string;
  mimeType: string;
  fileSize?: number;
}

/**
 * 이미지 및 영상 첨부 분석 페이로드
 */
export interface MediaPayload {
  type: "image" | "video";
  fileName: string;
  mimeType: string;
  base64List: string[]; // base64 문자열 (이미지 1~5장, 또는 영상 추출 프레임 1~3장)
  videoDuration?: number;
  imageCount?: number;
}

export interface MediaAttachment extends MediaPayload {
  previewUrl: string; // 대표 미리보기 (첫 번째 이미지 또는 비디오 프레임)
  fileSize?: number;
  imageItems?: ProcessedImageItem[]; // 다중 이미지인 경우 개별 아이템 배열
}

/**
 * 실전 기획 템플릿 입력 데이터
 */
export interface ThreadPlannerTemplateInput {
  product?: string;          // 연결할 상품 / 핵심 소재
  experience?: string;       // 내 실제 경험 / 상황
  targetAudience?: string;   // 타깃 독자
  persona?: string;          // 나의 역할 / 페르소나
  benchmarkPost?: string;    // 참고할 터진 글 원문(선택)
}

/**
 * 원클릭 실전 템플릿 프리셋 3선
 */
export interface TemplatePreset {
  id: string;
  title: string;
  badge: string;
  emoji: string;
  data: ThreadPlannerTemplateInput;
}

export interface PlannerPersona {
  id: string;
  name: string;
  badge: string;
  emoji: string;
  tagline: string;
  description: string;
  tonePrompt: string;
  defaultTopic: string;
}

export const PLANNER_PERSONAS: PlannerPersona[] = [
  {
    id: "housewife",
    name: "가전·살림 주부형",
    badge: "살림 9단 꼼꼼 비교",
    emoji: "👩‍🍳",
    tagline: "실생활 가성비 & 살림 꿀팁 톤",
    description: "가성비, 내구성, 남편·아이 실생활 활용도 중심의 꼼꼼한 주부 시점.",
    tonePrompt: "너는 살림 9단이자 가전·살림템에 진심인 30대 후반 주부야. 깐깐하게 비교해보고 실생활에서 진짜 삶의 질을 올려준 찐후기 톤. 친근하면서도 믿음직한 언니/동네 이웃 말투(반말/치니체).",
    defaultTopic: "살림 9단이 뽑은 삶의 질 수직상승 가전/살림 필수템",
  },
  {
    id: "single",
    name: "독신·자취생형",
    badge: "2030 자취 찐현실 썰",
    emoji: "🏠",
    tagline: "퇴근 후 귀차니즘 & 생존 꿀팁 톤",
    description: "퇴근 후 설거지/청소 귀차니즘, 원룸 생존 꿀팁 중심의 현실 공감 썰.",
    tonePrompt: "너는 원룸 자취 4년 차, 퇴근하면 손 하나 까딱하기 싫은 20대 후반 독신 직장인이야. 설거지 극혐, 좁은 방 공간 활용, 배달비 아끼는 솔직담백한 자취 썰 말투(반말, ';;', 'ㅠㅠ').",
    defaultTopic: "퇴근 후 설거지하기 싫어서 안달 난 자취생의 인생템",
  },
  {
    id: "working_mom",
    name: "워킹맘·직장인형",
    badge: "퇴근길 지친 30대 공감",
    emoji: "💼",
    tagline: "시간 1초 아끼는 현실 피로 공감",
    description: "회사 업무와 육아/살림 병행의 피로를 덜어주는 시간 단축 꿀팁 톤.",
    tonePrompt: "너는 회사 다니면서 육아와 살림까지 해내는 34세 워킹맘이야. 퇴근길 지하철에서 지친 몸으로 스레드 보는 사람들에게 '나도 그래' 하며 위로와 시간 절약 팁을 던지는 친한 언니 반말 톤.",
    defaultTopic: "퇴근하고 쓰러지기 일보 직전인 워킹맘의 시간 절약 꿀팁",
  },
  {
    id: "editor",
    name: "20대 쇼핑·뷰티 에디터형",
    badge: "감성 추천 & 종결템 썰",
    emoji: "💄",
    tagline: "비싼 건 줄 알았는데 가성비 종결템",
    description: "트렌디한 뷰티/패션/소품 추천, 감탄사와 반전이 있는 인생템 종결 톤.",
    tonePrompt: "너는 트렌디한 20대 패션/뷰티 쇼핑 에디터야. '이거 비싼 건 줄 알았는데;; 가성비템이었다니', '버릴 색이 1도 없다... 이걸로 종결 땅땅!' 같은 찰진 스레드 감탄사 어조.",
    defaultTopic: "비싼 브랜드인 줄 알았는데 알고 보니 가성비 종결템이었던 썰",
  },
  {
    id: "tech",
    name: "IT·테크 리뷰어형",
    badge: "팩트 분석 & 스펙 비교",
    emoji: "⚡",
    tagline: "모르면 평생 손해 보는 논리 톤",
    description: "스펙과 실사용 장단점을 군더더기 없이 분석해 주는 테크 덕후 톤.",
    tonePrompt: "너는 IT 기기와 전자기기, 생산성 툴을 집요하게 파고드는 테크 리뷰어야. 거품 싹 빼고 3주 써본 팩트 중심, '이 기능 모르면 평생 손해'라는 식의 핵심 찌르기 반말 톤.",
    defaultTopic: "3주 동안 실사용해보고 결론 내린 가성비 전자기기 팩트 리뷰",
  },
  {
    id: "side_hustle",
    name: "N잡러·재테크 부업형",
    badge: "자본주의 현실 극복",
    emoji: "💰",
    tagline: "월 100 더 버는 현실 실행 톤",
    description: "통장 잔고 현실, 푼돈 모아 목돈 만드는 실행력 자극 톤.",
    tonePrompt: "너는 본업 외에 스마트스토어, 블로그, 제휴마케팅으로 월 150만원 추가 파이프라인을 만든 30대 N잡러야. 뜬구름 잡는 강의 팔이가 아닌, 진짜 계좌에 찍히는 현실 돈 버는 꿀팁 톤.",
    defaultTopic: "통장 잔고 50만원에서 부업으로 월 100만원 파이프라인 만든 현실 과정",
  },
];

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "laundry",
    title: "52만 뷰 세탁조 청소 썰",
    badge: "조회수 52만 회 떡상",
    emoji: "🧺",
    data: {
      product: "LG 세탁기 관리제 (세탁조 클리너)",
      experience: "워싱소다 백식초 다 써봐도 효과 없길래 추천글 보고 주문. 물색깔 보고 기절함... 수건 쉰내 싹 없어짐",
      targetAudience: "살림하는 2030 자취생 및 주부, 수건 쉰내 고민자",
      persona: "솔직 담백한 30대 일상 살림러",
      benchmarkPost: "넘더러워서 안올리려고 했는데 추천해준 스치니한테 고마워서 올림\n\n워싱소다 백식초 이런거 다 써봐도 효과 없길래\n치니 추천글보고 마지막으로 주문했거든??\n\n물색깔 보고 기절함....\n얼마 안쓴건데 이래ㅠㅠ\n이거 하니까 바로 수건 쉰내 싹 없어지더라",
    },
  },
  {
    id: "shadow",
    title: "1.6만 뷰 섀도 가성비 종결템",
    badge: "1.6만 바이럴",
    emoji: "✨",
    data: {
      product: "엑셀 4구 아이섀도우 팔레트",
      experience: "비싼 건 줄 알았는데 가성비템이었음. 과하지 않고 엄청 자연스럽고 버릴 색이 1도 없음",
      targetAudience: "2030 출근러, 자연스러운 데일리 메이크업 찾는 여성",
      persona: "가성비 꿀템 밝혀내는 친근한 뷰티 언니",
      benchmarkPost: "이거 비싼건줄 알았는데;;\n가성비템이었다니...\n\n과하지도 않고 엄청 자연스러워\n중요한건 버릴색이 1도 없다...\n섀도는 이거 하나로 종결 땅땅!",
    },
  },
  {
    id: "steamer",
    title: "퇴근 후 설거지 탈출 찜기 썰",
    badge: "공감 폭발 자취템",
    emoji: "🍲",
    data: {
      product: "실리콘 전자레인지 찜기",
      experience: "퇴근 후 설거지가 너무 싫어서 저녁을 일주일에 4번 거르다가 샀음. 써 본 지 2주째인데 냄비 설거지 안 나와서 삶의 질 수직 상승",
      targetAudience: "20대 후반 퇴근길 자취 직장인",
      persona: "퇴근길 녹초가 된 3년차 자취 직장인",
      benchmarkPost: "",
    },
  },
];

export type RewriteMode =
  | "provocative" // 더 자극적으로
  | "natural"     // 더 자연스럽게
  | "shorter"     // 더 짧게
  | "expert"      // 더 전문적으로
  | "funny"       // 더 웃기게
  | "no_ad"       // 광고 느낌 빼기
  | "hooks_only"; // 후킹만 다시 만들기

export interface RewriteModeOption {
  mode: RewriteMode;
  label: string;
  icon: string;
  desc: string;
}

export const REWRITE_MODES: RewriteModeOption[] = [
  { mode: "provocative", label: "더 자극적으로", icon: "⚡", desc: "손해 회피·부정 명령 극대화, 궁금해서 미치겠는 어조" },
  { mode: "natural", label: "더 자연스럽게", icon: "🌿", desc: "친한 친구/언니에게 카톡하듯 날것의 리얼 반말" },
  { mode: "shorter", label: "더 짧게", icon: "✂️", desc: "군더더기 다 쳐내고 3~4줄 임팩트 압축" },
  { mode: "expert", label: "더 전문적으로", icon: "🎓", desc: "신뢰도 높은 인사이트와 논리적 구조" },
  { mode: "funny", label: "더 웃기게", icon: "🤣", desc: "자조적 유머, B급 드립과 피식하는 위트" },
  { mode: "no_ad", label: "광고 느낌 빼기", icon: "🛡️", desc: "제품명 100% 삭제, 내돈내산 찐경험담 톤" },
  { mode: "hooks_only", label: "후킹만 다시 만들기", icon: "🎯", desc: "5대 바이럴 훅 유형 집중 개선" },
];

/**
 * 저장된 콘텐츠 보관함 데이터 모델
 */
export interface SavedThreadPlan {
  id: string;
  user_id?: string;
  topic: string;
  hook: string;
  hook_reason?: string;
  hook_variants?: HookVariant[];
  body_text: string;
  reply_cta?: string;
  follow_up_topics?: string[];
  persona_id?: string;
  persona_name?: string;
  model_label?: string;
  created_at: string;
  updated_at?: string;
}

