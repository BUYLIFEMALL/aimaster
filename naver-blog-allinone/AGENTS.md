# naver-blog-allinone — AI 에이전트 작업 지침

## 프로그램 개요
- **프로그램명**: 네이버 블로그 올인원 마스터 PRO
- **Slug**: `naver-blog-allinone`
- **버전**: `v1.04`
- **목적**: E-E-A-T 기반 기획, 멀티모달 비전 사진 분석, 실시간 뉴스/키워드 분석, 스마트에디터 ONE 포스팅을 하나로 통합한 네이버 블로그 올인원 솔루션

## 핵심 불변 원칙 준수
1. **사용자 본인 API 키 원칙**: Google Gemini API 키는 사용자 본인의 브라우저 `localStorage`에만 보관하며 서버로 전송하지 않는다.
2. **연도 불변 원칙**: 모든 AI 프롬프트와 기사 생성은 항상 당해 연도(현재 2026년)를 기준으로 작성한다 (`new Date().getFullYear()`).
3. **UI 표준**: 흰색 베이스(Clean White & Slate), 중성 회색 테두리, 카드형 모듈러 레이아웃 준수.

## 버전 변경 이력
- `v1.04` (2026-10-11):
  - 스마트에디터 ONE 전용 크롬 확장 프로그램 구축 (`extension/`, `manifest.json` v1.04)
  - 네이버 블로그 글쓰기(`blog.naver.com`) 화면에서 원클릭으로 제목/인라인 서식 HTML 본문 자동 주입 플로팅 위젯 (`content-naver.js`)
  - 웹 앱-확장 간 원고 자동 동기화 브릿지 (`content-web.js`, `chrome.storage.local`)
  - 최신 확장 프로그램 ZIP 다운로드 패키징 (`public/downloads/naver-blog-allinone-latest.zip`) 및 헤더 다운로드 링크 배치
  - SEO 최적화 모드 선택 (홈판 노출 모드 감성 스토리텔링 vs 기본 SEO 모드 정보형 리뷰)
  - AI SEO 키워드 자동 추출기 탑재 (Gemini 기반 메인 및 서브 타겟 키워드 실시간 추천)
  - 3단 서식 뷰어 & 원클릭 복사 시스템 (네이버 스마트에디터 ONE HTML / 티스토리·워드프레스 마크다운 / 일반 텍스트)
  - 네이버 블로그 글쓰기 새 탭 바로가기 링크 연결
- `v1.03` (2026-10-11):
  - 키워드 파이터 PRO 7대 분석 엔진 탑재 (`KeywordFighterSection.tsx`)
  - 실시간 자동완성 다이렉트 프록시 API (`/api/keywords/autocomplete`) - Google 및 Naver 공식 공개 엔드포인트 연동
  - 언론사 실시간 RSS 뉴스 피드 수집기 (`/api/keywords/news`) - 최신 속보 및 원문 기사 기반 블로그 글 기획 지원
  - 키워드 경쟁력(검색 의도, PAA 5선, 콘텐츠 갭), AI 연관검색어, 상위 블로그 1~5위 구조 분석, 다각도 4대 관점 발굴, 오늘의 전략 키워드 10선 구축
- `v1.02` (2026-10-11):
  - 맛집/카페/여행 멀티모달 비전 사진 분석 엔진 탑재 (`PlacesVisionSection.tsx`, `imageUtils.ts`)
  - 드래그앤드롭 다중 사진 업로더, 대표 썸네일 클릭 지정, 사진 순서 번호 매칭
  - 방문 메타정보(장소명, 카테고리, 지역, 방문일, 동행, 한줄인상, 상세정보) + FAQ 토글 + 7대 컬러 테마 스타일링
  - Gemini Vision 멀티모달 프롬프트 파이프라인 및 스마트에디터 ONE 서식 원클릭 복사 탑재
- `v1.01` (2026-10-11):
  - 신규 서브프로젝트 스캐폴딩 (Next.js 16, React 19, Tailwind CSS v4)
  - Supabase 통합 권한 연동 및 `requireProgramAccess` 구성
  - 환경설정 모달 (Gemini API 키 연결 테스트 및 로컬 저장, 텍스트/이미지 모델 선택)
  - 5대 주제 아이디어 기획 엔진 탑재 (E-E-A-T 기반, 카테고리별, 에버그린, 롱테일, 메모/파일 기반)
  - 7대 테마 컬러 팔레트 & 스마트에디터 ONE HTML 인라인 서식 복사 엔진 구축
