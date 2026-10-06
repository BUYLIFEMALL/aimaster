# 네이버 블로그 에이전트 (Naver Blog Agent)

크롬 확장프로그램과 5단계 멀티 AI 에이전트로 봇 탐지 및 아이디 보호조치 없이 네이버 스마트에디터 ONE에 글을 자동 기획·작성·윤문·발행하는 마케팅 자동화 프로그램입니다.

- **버전**: `v1.01` (`src/lib/version.ts` 및 DB `programs.version`)
- **라이브 URL**: `https://naver-blog-agent.vercel.app`
- **구조**: Next.js 16 Web SaaS Hub + Chrome Extension (Manifest V3)

---

## 핵심 특징

1. **네이버 봇 탐지 100% 우회**:
   - Playwright/헤드리스 브라우저를 배제하고, 회원이 평소 쓰는 일반 Chrome 브라우저의 정상 세션과 쿠키 환경에서 작동합니다.
   - 크롬 확장프로그램이 스마트에디터 ONE의 내부 iframe DOM을 직접 조작하므로 아이디 보호조치와 캡차가 발생하지 않습니다.
2. **5단계 멀티 AI 에이전트 파이프라인**:
   - **1단계 (Research)**: C-Rank 및 DIA+ 검색 알고리즘 맞춤형 제목 및 소제목 기획
   - **2단계 (Writer)**: 1,800~2,500자 분량의 정보성 본문 작성 (스마트에디터 ONE 서식)
   - **3단계 (Blog Humanizer)**: 상투적인 AI 번역투를 제거하고 사람이 직접 쓴 듯한 자연스러운 한국어 문체로 윤문
   - **4단계 (Reviewer)**: 팩트 검수 및 네이버 SEO 태그 추출
   - **5단계 (Image)**: 썸네일 및 본문 삽입 이미지 프롬프트 생성 (AI 마크 토글 연동)
3. **BYOK (회원 본인 키 사용)**:
   - OpenAI (GPT-4o), Google Gemini, Claude 키를 지원합니다.
4. **AIMaster 통합 권한 체계**:
   - `requireProgramAccess()`를 통한 통합 로그인 및 유료 구독/등급 관리.
