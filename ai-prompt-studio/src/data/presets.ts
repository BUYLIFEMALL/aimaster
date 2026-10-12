import { PromptMode, ModeMeta, CapabilityConstraint } from "@/types/prompt";

export interface PromptPreset {
  id: string;
  category: string;
  title: string;
  mode: PromptMode;
  goal: string;
  role?: string;
  task?: string;
  structure?: string;
  chain?: string;
  excludedCapabilities?: CapabilityConstraint[];
}

export const PROMPT_MODES: ModeMeta[] = [
  {
    id: "RTSC",
    label: "RTSC 마스터",
    title: "RTSC 메타 프롬프트",
    description: "역할(Role), 작업(Task), 구조(Structure), 제약(Chain) 4단계 설계를 통해 가장 완벽하고 신뢰도 높은 프롬프트를 생성합니다.",
    bullets: ["전문가 페르소나 설정", "구조적 출력 형식 지정"],
    color: "text-indigo-700",
    btnBg: "bg-indigo-600 hover:bg-indigo-700",
    activeBorder: "border-indigo-500",
    activeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    iconName: "Bot"
  },
  {
    id: "BUSINESS",
    label: "프레임워크 전문가",
    title: "비즈니스 프레임워크",
    description: "CO-STAR, RTF, RICE, PREP, SWOT, PAS 등 검증된 글로벌 비즈니스 프레임워크를 상황에 맞게 자동 매핑합니다.",
    bullets: ["Pro Frameworks (CO-STAR/PREP)", "표준화된 비즈니스 서식"],
    color: "text-blue-700",
    btnBg: "bg-blue-600 hover:bg-blue-700",
    activeBorder: "border-blue-500",
    activeBg: "bg-blue-50 text-blue-700 border-blue-200",
    iconName: "Compass"
  },
  {
    id: "ARCHITECT",
    label: "프롬프트 아키텍트",
    title: "프롬프트 아키텍트",
    description: "복잡한 설정 없이 단 한 줄의 아이디어만으로 Zero-Question 원칙의 고품질 한국어 실행 프롬프트를 즉시 설계합니다.",
    bullets: ["Zero-Question 원칙", "한국어 정밀 타겟팅"],
    color: "text-violet-700",
    btnBg: "bg-violet-600 hover:bg-violet-700",
    activeBorder: "border-violet-500",
    activeBg: "bg-violet-50 text-violet-700 border-violet-200",
    iconName: "Wand2"
  },
  {
    id: "VERTEX_XML",
    label: "Vertex AI XML",
    title: "Vertex AI XML 구조화",
    description: "Google 권장 표준 XML 태그(<OBJECTIVE_AND_PERSONA>, <INSTRUCTIONS> 등)로 모델의 지시 이행률과 제어력을 극대화합니다.",
    bullets: ["Google 표준 XML 태그", "구조화된 Few-Shot 예시"],
    color: "text-emerald-700",
    btnBg: "bg-emerald-600 hover:bg-emerald-700",
    activeBorder: "border-emerald-500",
    activeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconName: "CodeXml"
  },
  {
    id: "COT_REASONING",
    label: "논리적 추론 (CoT)",
    title: "Chain-of-Thought 추론",
    description: "단계별 사고 체인과 <thought> 내부 독백 기법을 강제하여 수학, 코딩, 복잡한 분석에서 환각을 방지하고 정답률을 극대화합니다.",
    bullets: ["단계별 인과관계 추론", "내부 독백(Internal Monologue)"],
    color: "text-rose-700",
    btnBg: "bg-rose-600 hover:bg-rose-700",
    activeBorder: "border-rose-500",
    activeBg: "bg-rose-50 text-rose-700 border-rose-200",
    iconName: "Brain"
  }
];

export const PROMPT_PRESETS: PromptPreset[] = [
  // 1. 비즈니스 기획
  {
    id: "biz-1",
    category: "비즈니스 기획",
    title: "신규 모바일 앱 CO-STAR 런칭 기획안",
    mode: "BUSINESS",
    goal: "2026년 타겟 2030 직장인 대상 습관 형성 모바일 앱 서비스 런칭 기획안 작성",
    role: "10년 차 IT 프로덕트 매니저(PM)",
    task: "1. Context(시장 환경) 분석\n2. Objective(핵심 목표)\n3. Strategy(실행 전략)\n4. Target(타겟 오디언스)\n5. Action Plan(마일스톤)",
    structure: "CO-STAR 프레임워크 기반 마크다운 보고서",
    chain: "실현 불가능한 추상적 계획 배제, 실행 가능한 구체적 수치 제시"
  },
  {
    id: "biz-2",
    category: "비즈니스 기획",
    title: "투자 유치를 위한 PREP 엘리베이터 피치",
    mode: "BUSINESS",
    goal: "시드 라운드 투자 유치를 위한 3분 엘리베이터 피치 스크립트 작성",
    role: "스타트업 전문 IR 피치 컨설턴트",
    task: "Point(주장) -> Reason(근거) -> Example(구체적 사례 및 지표) -> Point(핵심 메시지 재강조)",
    structure: "말하기 대본 형식 (시간 배분 가이드 포함)",
    chain: "전문용어는 최소화하고 비즈니스 모델의 명확성에 집중"
  },
  {
    id: "biz-3",
    category: "비즈니스 기획",
    title: "신규 기능 우선순위 산정 (RICE 프레임워크)",
    mode: "BUSINESS",
    goal: "B2B SaaS 백로그 기능 5종의 개발 우선순위 매트릭스 산정",
    role: "Agile 프로젝트 디렉터",
    task: "Reach(도달 범위), Impact(영향도), Confidence(확신도), Effort(소요 리소스) 평가",
    structure: "RICE 스코어링 표(Table) 및 분석 요약",
    chain: "각 지표별 채점 근거를 명확하게 기재할 것"
  },
  {
    id: "biz-4",
    category: "비즈니스 기획",
    title: "글로벌 경쟁사 SWOT 분석 보고서",
    mode: "BUSINESS",
    goal: "북미 이커머스 경쟁 플랫폼과의 기능 및 마케팅 전략 비교 분석",
    role: "글로벌 시장 조사 분석가",
    task: "강점(S), 약점(W), 기회(O), 위협(T) 및 SO/ST/WO/WT 교차 전략 수립",
    structure: "SWOT 4분면 매트릭스 및 실행 전략 요약",
    chain: "객관적 시장 데이터 기반으로 서술"
  },
  {
    id: "biz-5",
    category: "비즈니스 기획",
    title: "신규 입사자 온보딩 가이드라인 (RTF)",
    mode: "BUSINESS",
    goal: "개발팀 신규 입사자를 위한 첫 30일 적응 로드맵 수립",
    role: "HR 피플 앤 컬처 리드",
    task: "역할 정의, 주차별 마일스톤, 멘토링 체크리스트 수립",
    structure: "Role-Task-Format 구조화 가이드",
    chain: "친근하면서도 체계적인 어조"
  },

  // 2. 개발 / 코딩
  {
    id: "dev-1",
    category: "개발 / 코딩",
    title: "Next.js Turbopack 최적화 아키텍처 설계",
    mode: "ARCHITECT",
    goal: "Next.js App Router 기반 대규모 웹 서비스의 서버 컴포넌트 렌더링 최적화",
    role: "프론트엔드 시스템 아키텍트",
    task: "LCP/CLS 개선, Turbopack 빌드 최적화, SSR/RSC 데이터 페칭 전략 수립",
    structure: "기술 설계 문서 (RFC 형태)",
    chain: "Zero-Question 원칙으로 즉시 프로덕션 적용 가능한 코드 블록 포함",
    excludedCapabilities: ["WEB_SEARCH"]
  },
  {
    id: "dev-2",
    category: "개발 / 코딩",
    title: "시니어 코드 리뷰 및 리팩토링 에이전트",
    mode: "RTSC",
    goal: "지저분한 TypeScript 레거시 코드를 클린 아키텍처로 리팩토링",
    role: "15년 차 시니어 소프트웨어 엔지니어",
    task: "코드 스멜 식별, SOLID 원칙 적용, 단위 테스트(Jest) 작성 가이드",
    structure: "리팩토링 전/후 비교 코드 블록 및 이유 설명",
    chain: "불필요한 주석 없이 코드의 자체 설명력 극대화"
  },
  {
    id: "dev-3",
    category: "개발 / 코딩",
    title: "텍스트-to-SQL 쿼리 최적화 에이전트",
    mode: "VERTEX_XML",
    goal: "자연어 요구사항을 고성능 PostgreSQL 인덱스 활용 쿼리로 변환",
    role: "Database Administrator (DBA)",
    task: "테이블 조인 최적화, 실행 계획(EXPLAIN ANALYZE) 고려 쿼리 작성",
    structure: "<SQL_QUERY>\n<EXPLANATION>\n<INDEX_RECOMMENDATION>",
    chain: "Full Table Scan을 피하는 조건절 작성"
  },
  {
    id: "dev-4",
    category: "개발 / 코딩",
    title: "분산 시스템 장애 원인 분석 (RCA)",
    mode: "COT_REASONING",
    goal: "마이크로서비스 환경에서 발생한 간헐적 504 게이트웨이 타임아웃 근본 원인 규명",
    role: "Site Reliability Engineer (SRE)",
    task: "네트워크, 커넥션 풀, 비동기 큐, DB 락 경합 시나리오 단계별 추론",
    structure: "<thought> 내부 추론 과정 -> 근본 원인 보고서",
    chain: "모든 가설에 대해 반증 논리를 함께 검토할 것"
  },
  {
    id: "dev-5",
    category: "개발 / 코딩",
    title: "RESTful API 명세서 OpenAPI 3.0 자동 작성",
    mode: "RTSC",
    goal: "회원 인증 및 권한 관리 모듈의 Swagger/OpenAPI 명세서 작성",
    role: "API 플랫폼 엔지니어",
    task: "엔드포인트, 요청/응답 스키마, 에러 코드(400, 401, 403, 500) 상세 정의",
    structure: "YAML 표준 OpenAPI 스키마 포맷",
    chain: "누락된 파라미터 없이 완전한 명세"
  },

  // 3. 마케팅 / 카피
  {
    id: "mkt-1",
    category: "마케팅 / 카피",
    title: "인스타그램 릴스 바이럴 숏폼 대본 (60초)",
    mode: "RTSC",
    goal: "생산성 AI 도구 소개를 위한 초반 3초 후킹 인스타 릴스 대본 작성",
    role: "100만 팔로워 숏폼 크리에이터 & 바이럴 마케터",
    task: "0~3초 후킹 멘트 -> 4~30초 문제 제기 및 솔루션 -> 31~50초 시연 -> 51~60초 CTA",
    structure: "[타임코드 | 시각 연출(비디오) | 오디오 멘트 | 화면 자막] 표 형식",
    chain: "지루한 설명 금지, 즉각적인 도파민 자극 연출"
  },
  {
    id: "mkt-2",
    category: "마케팅 / 카피",
    title: "고전환 네이버 스마트스토어 상세페이지 카피 (PAS)",
    mode: "BUSINESS",
    goal: "프리미엄 텀블러 신제품의 구매 전환율 극대화 상세페이지 기획",
    role: "억대 매출 이커머스 상세페이지 전문 카피라이터",
    task: "Problem(불편함 호소) -> Agitation(문제 심화) -> Solution(신제품 해결책)",
    structure: "PAS 프레임워크 섹션별 카피 & 비주얼 기획안",
    chain: "감각적이고 구체적인 형용사 사용"
  },
  {
    id: "mkt-3",
    category: "마케팅 / 카피",
    title: "B2B SaaS 신규 고객 발굴 콜드 이메일 시퀀스",
    mode: "RTSC",
    goal: "미팅 성사율 15% 목표의 3단계 B2B 콜드메일 시퀀스",
    role: "실리콘밸리 엔터프라이즈 세일즈 디렉터",
    task: "1차 도입 제안 메일 -> 2차 후속 팔로업(사례 제시) -> 3차 브레이크업 메일",
    structure: "제목(A/B 테스트용 2개씩) + 본문 + 서명 포맷",
    chain: "스팸 필터링 단어 배제, 개인화된 가치 제안"
  },
  {
    id: "mkt-4",
    category: "마케팅 / 카피",
    title: "네이버 블로그 상위 노출 SEO 포스팅 가이드",
    mode: "ARCHITECT",
    goal: "2026년 정부지원금 정책 주제로 검색 유입 극대화 블로그 글 작성",
    role: "네이버 검색 알고리즘 및 SEO 전문 에디터",
    task: "메인 키워드/서브 키워드 배치, 가독성 높은 소제목 구성, Q&A 섹션",
    structure: "원클릭 복사 가능한 마크다운 블로그 초안",
    chain: "현재 2026년 기준 정확한 정책 내용만 반영",
  },
  {
    id: "mkt-5",
    category: "마케팅 / 카피",
    title: "구글 검색 광고(RSA) 고성과 헤드라인 15선",
    mode: "RTSC",
    goal: "온라인 코딩 부트캠프 수강생 모집을 위한 검색 광고 소재 생성",
    role: "퍼포먼스 마케팅 팀장",
    task: "헤드라인 15개(30자 이내), 설명문 4개(90자 이내)",
    structure: "글자 수 카운트가 포함된 마케팅 스프레드시트 포맷",
    chain: "혜택, 긴급성, 사회적 증거 골고루 배분"
  },

  // 4. 데이터 / 분석
  {
    id: "data-1",
    category: "데이터 / 분석",
    title: "페르미 추정: 서울시 하루 커피 소비량 산출",
    mode: "COT_REASONING",
    goal: "논리적 가설과 인구 통계를 기반으로 서울시 일일 테이크아웃 커피 소비량 추정",
    role: "맥킨지 시니어 비즈니스 컨설턴트",
    task: "상향식/하향식 추정 가설 수립, 변수 정의, 단계별 수식 계산, 민감도 분석",
    structure: "<thought> 사고 체인 -> 최종 추정치 요약 표",
    chain: "모든 추정 계수의 현실적 근거를 명시할 것"
  },
  {
    id: "data-2",
    category: "데이터 / 분석",
    title: "고객 이탈(Churn) 예측 모델 지표 분석",
    mode: "RTSC",
    goal: "구독형 서비스 고객 이탈 징후 분석 및 리텐션 전략 보고서",
    role: "데이터 사이언스 리드",
    task: "코호트 분석, LTV/CAC 비율 평가, 이탈 고위험군 클러스터링",
    structure: "경영진 보고용 Executive Summary",
    chain: "통계적 유의미성과 실질적 실행 방안 동시 제시"
  },
  {
    id: "data-3",
    category: "데이터 / 분석",
    title: "비정형 고객 CS 리뷰 감정 분석 및 카테고리 태깅",
    mode: "VERTEX_XML",
    goal: "수천 건의 사용자 피드백 리뷰를 긍정/부정/요구사항으로 XML 정밀 분류",
    role: "NLP 자연어 처리 전문가",
    task: "문맥 파악, 핵심 키워드 추출, 개선 제안 사항 분류",
    structure: "<REVIEWS>\n  <REVIEW id=\"...\">\n    <SENTIMENT>...</SENTIMENT>\n    <TOPIC>...</TOPIC>\n  </REVIEW>\n</REVIEWS>",
    chain: "일관된 태그 규칙 엄수"
  },

  // 5. 창작 / 글쓰기
  {
    id: "creative-1",
    category: "창작 / 글쓰기",
    title: "SF 디스토피아 소설 시놉시스 및 세계관 구축",
    mode: "RTSC",
    goal: "기후 위기 이후의 2080년 서울을 배경으로 한 몰입도 높은 SF 소설 설정집",
    role: "휴고상 수상 SF 소설가",
    task: "사회 시스템, 과학 기술(사이버네틱스), 주연 인물 3인 갈등 구조, 1막 줄거리",
    structure: "소설 기획 트리트먼트 형식",
    chain: "진부한 클리셰 배제, 독창적이고 치밀한 개연성"
  },
  {
    id: "creative-2",
    category: "창작 / 글쓰기",
    title: "감성 에세이: 비 오는 날의 카페와 위로",
    mode: "ARCHITECT",
    goal: "지친 현대인들에게 따뜻한 위로와 여운을 전하는 감성 수필 한 편",
    role: "베스트셀러 에세이스트",
    task: "오감을 자극하는 섬세한 묘사, 담담하면서도 마음에 스며드는 어조",
    structure: "전문 마크다운 에세이 원문",
    chain: "과장된 교훈 대신 잔잔한 공감 위주"
  }
];

export const PRESET_EXAMPLES = PROMPT_PRESETS;
