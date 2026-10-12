import { PromptTemplate } from "@/types/prompt";

export const DEFAULT_CATEGORIES: string[] = [
  "Writing",
  "Coding",
  "Business",
  "Marketing",
  "Personal",
];

export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: "1",
    title: "이메일 초안 작성",
    description: "전문적인 비즈니스 이메일 초안을 빠르게 작성합니다.",
    content: `당신은 전문적인 비서입니다. 다음 주제에 대해 "{{recipient}}"에게 보낼 이메일 초안을 작성해주세요.

주제: {{topic}}
어조: {{tone}}`,
    category: "Business",
    variables: ["recipient", "topic", "tone"],
    createdAt: Date.now(),
  },
  {
    id: "2",
    title: "코드 리팩토링",
    description: "주어진 코드를 클린 코드 원칙에 따라 개선합니다.",
    content: `다음 코드를 분석하고 리팩토링 제안을 해주세요. 언어는 "{{language}}"입니다.

코드:
\`\`\`
{{code}}
\`\`\`

중점 사항: 가독성, 성능 최적화`,
    category: "Coding",
    variables: ["language", "code"],
    createdAt: Date.now() - 10000,
  },
  {
    id: "3",
    title: "블로그 글 개요 생성",
    description: "SEO에 최적화된 블로그 글 개요를 생성합니다.",
    content: `"{{keyword}}" 키워드를 중심으로 블로그 글 개요를 작성해주세요. 타겟 독자는 "{{audience}}"입니다.`,
    category: "Marketing",
    variables: ["keyword", "audience"],
    createdAt: Date.now() - 20000,
  },
  {
    id: "4",
    title: "회의록 요약 및 액션 아이템",
    description: "긴 회의 녹취록을 핵심 안건과 할 일 목록으로 정리합니다.",
    content: `다음 회의 스크립트를 요약해주세요.

회의 내용:
{{transcript}}

요청 사항:
1. 논의된 핵심 안건 3가지 요약
2. 담당자와 기한이 명시된 액션 아이템 리스트`,
    category: "Business",
    variables: ["transcript"],
    createdAt: Date.now() - 30000,
  },
  {
    id: "5",
    title: "React 컴포넌트 생성기",
    description: "요구사항에 맞는 모던 React 컴포넌트 코드를 생성합니다.",
    content: `다음 요구사항을 만족하는 React 함수형 컴포넌트를 작성해주세요.

기능 요구사항: {{requirements}}
스타일링 도구: {{styling_tool}}

TypeScript 인터페이스와 함께 작성하고, 에러 처리도 포함해주세요.`,
    category: "Coding",
    variables: ["requirements", "styling_tool"],
    createdAt: Date.now() - 40000,
  },
  {
    id: "6",
    title: "인스타그램 캡션 생성",
    description: "참여를 유도하는 매력적인 소셜 미디어 게시글을 작성합니다.",
    content: `인스타그램 게시물에 사용할 캡션을 작성해주세요.

사진 설명: {{photo_description}}
원하는 분위기: {{vibe}}

이모지를 적절히 사용하고, 관련 해시태그 10개를 포함해주세요.`,
    category: "Marketing",
    variables: ["photo_description", "vibe"],
    createdAt: Date.now() - 50000,
  },
  {
    id: "7",
    title: "영어 비즈니스 표현",
    description: "특정 상황에서 사용할 수 있는 세련된 영어 표현을 추천받습니다.",
    content: `저는 외국계 회사에서 일하고 있습니다. "{{situation}}" 상황에서 사용할 수 있는 정중하고 프로페셔널한 영어 표현 3가지를 추천해주시고, 각각의 뉘앙스 차이를 설명해주세요.`,
    category: "Personal",
    variables: ["situation"],
    createdAt: Date.now() - 60000,
  },
  {
    id: "8",
    title: "유튜브 영상 기획",
    description: "조회수를 부르는 썸네일 문구와 영상 구성을 기획합니다.",
    content: `"{{topic}}" 주제로 유튜브 영상을 기획하고 있습니다.
타겟 시청자: {{target_audience}}

1. 클릭을 부르는 썸네일 카피 3가지
2. 초반 30초 시선을 끄는 오프닝 멘트
3. 영상의 기승전결 구조를 제안해주세요.`,
    category: "Marketing",
    variables: ["topic", "target_audience"],
    createdAt: Date.now() - 70000,
  },
  {
    id: "9",
    title: "판타지 소설 세계관 설정",
    description: "소설이나 게임을 위한 독창적인 세계관 설정을 도와줍니다.",
    content: `판타지 소설의 세계관을 만들고 싶습니다.
핵심 컨셉: {{concept}}
주요 종족: {{races}}

이 세계의 역사적 배경, 마법 시스템의 규칙, 그리고 현재 갈등 상황을 포함하여 흥미로운 세계관 설정을 작성해주세요.`,
    category: "Writing",
    variables: ["concept", "races"],
    createdAt: Date.now() - 80000,
  },
];
