# ai-webtoon-studio — AI 에이전트 작업 지침

## 프로그램 개요
- **프로그램명**: AI 웹툰 자동화 (구 AI 웹툰 스튜디오 PRO)
- **Slug**: `ai-webtoon-studio`
- **버전**: `v1.03`
- **목적**: 시놉시스 기획부터 캐릭터 일관성 시트, 컷별 콘티 생성, 세로 스크롤 완성 원고 렌더링 및 롱스크롤 이어붙이기(JPG)까지 한 곳에서 완성하는 AI 웹툰 제작 자동화 솔루션
- **배포 주소**: `https://ai-webtoon-automation.buylife.xyz` (기존 `https://ai-webtoon-studio.buylife.xyz` 병행 지원)
- **Vercel 주소**: `https://ai-webtoon-automation.vercel.app`

## 핵심 불변 원칙 준수
1. **사용자 본인 API 키 원칙**: Google Gemini API 키는 사용자 본인의 브라우저 `localStorage`에만 보관하며 서버로 전송하지 않는다.
2. **연도 불변 원칙**: 모든 AI 프롬프트와 시놉시스 생성은 항상 당해 연도(현재 2026년)를 기준으로 작성한다 (`new Date().getFullYear()`).
3. **UI 표준**: 흰색 베이스(Clean White & Slate), 중성 회색 테두리, 카드형 모듈러 레이아웃 준수.

## 버전 변경 이력
- `v1.03` (2026-10-12, Codex / 주인님 화면 수정 요청):
  - 상단 텍스트/이미지 모델 안내 배지 제거.
  - 상단 및 STEP 4의 ZIP/JPG 저장 버튼을 노란색 배경·짙은 글자·테두리·키보드 포커스로 통일하고 STEP 4 버튼 줄바꿈 허용.
  - 이미지 생성/다운로드 동작을 변경하지 않은 화면 수정. 검수·배포 증거는 `docs/UI_RELEASE_V1_03.md`에 기록.
- `v1.02` (2026-10-12, 주인님 지시):
  - 공식 프로그램명 **"AI 웹툰 자동화"** 로 리브랜딩 (`APP_NAME`, 레이아웃 메타데이터, 사이드바, 푸터, 알림 문구 전체 동기화).
  - Vercel 주소 및 배포 주소 개편:
    - 커스텀 배포 도메인: `https://ai-webtoon-automation.buylife.xyz` (Vercel domains add 및 Cloudflare 와일드카드 SSO 게이트 연동).
    - Vercel 별칭 주소: `https://ai-webtoon-automation.vercel.app` 연결.
    - 기존 `ai-webtoon-studio.buylife.xyz` 및 `ai-webtoon-studio-buylife.vercel.app` 하위 호환 유지.
  - 공용 DB `programs` 테이블: `name = 'AI 웹툰 자동화'`, `version = 'v1.02'`, `app_url = 'https://ai-webtoon-automation.buylife.xyz'` 동기화.
- `v1.01` (2026-10-11):
  - 신규 서브프로젝트 스캐폴딩 (Next.js 16, React 19, Tailwind CSS v4)
  - STEP 1 기획 & 컨셉 설정 (작품 제목, 작가명, 시놉시스 AI 확장, 5대 아트 스타일, 2대 레이아웃, 3대 말풍선 스타일, 표지 토글)
  - STEP 2 캐릭터 일관성 시트 (인물 1~3인 외형 묘사 AI 보강, 턴어라운드 시트 생성, 참조 사진 업로드)
  - STEP 3 시나리오 콘티 생성기 (챕터/장수 조절, 스토리 추가 요청, 컷별 연출·대사 콘티 자동 분할 및 인라인 편집)
  - STEP 4 웹툰 제작 & 뷰어 (메인 표지 생성, 컷 일괄 렌더링, 세로 스크롤 뷰어, HTML5 캔버스 롱스크롤 JPG 병합 저장, ZIP 일괄 다운로드)
  - JSON 프로젝트 설정 내보내기/불러오기 백업 엔진 탑재
  - 환경설정 모달 (Gemini API 키 연결 테스트 및 브라우저 격리 보관 + `/api/user/key` 동기화)
  - 메인 카탈로그 전용 16:9 실사 썸네일 등록 완료 (`gemini-3-pro-image-preview`, Supabase Storage `program-images/catalog/ai-webtoon-studio-thumbnail.jpg`)
  - AIMaster 통합 권한 게이트 탑재 (`requireProgramAccess`, 비로그인 시 메인 SSO 로그인 `https://buylife.xyz/login` 자동 리다이렉트)
  - 좌측 메뉴 표준 규격 (`docs/SIDEBAR_LAYOUT_STANDARD.md` 준수: 1~4 스텝퍼 배지 & 세로선, ← 다른 프로그램 보기, 🔑 API키등록·플랫폼연동, 하단 로그인 계정 & 로그아웃)
  - Vercel 프로덕션 배포 완료: `https://ai-webtoon-studio.buylife.xyz` (HTTP 307 SSO 게이트 정상 작동 확인)
  - DB `programs` 연동 완료: slug `ai-webtoon-studio`, badges `["new", "free"]`, version `v1.01`, app_url `https://ai-webtoon-studio.buylife.xyz`


