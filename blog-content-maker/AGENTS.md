# AI 블로그 콘텐츠 제작 자동화 (blog-content-maker) — 작업 지침 및 인수인계 규격서

> **✅ v1.11 배포 완료 (2026-10-23, Claude Code 윈도우 — 주인님 지시 「나머지 블로그 자동화 프로그램도 이 방식으로 싹다 바꿔」) — 확장 자동 연결·실제 설치 상태 표시(기준 구현 naver-blog-seo-studio v2.09~v2.10, 루트 `docs/SHARED_FEATURE_MAP.md` §16):** ① 웹-확장 연결 통로를 새로 만듦 — `extension/web-bridge.js`(이 사이트 화면만, `bcm-app`↔`bcm-extension`, `ping`·`connect`), `manifest.json` `content_scripts` 등록 ② `extension/background.js` `connectFromWeb`(확장 화면만 받던 기존 출처 검사 앞에서 처리 — 이 사이트 출처·43자리 형식·`GET /api/extension` 확인 통과 때만 `bcm-token` 저장, 요청 시 탭 닫기) ③ 확장 팝업 「자동 연결 (웹에서 로그인)」 → 새 화면 `/extension-connect?from=extension`(`requireProgramAccess`, proxy가 넘긴 현재 주소로 로그인 뒤 복귀), 코드 직접 입력은 접힘 칸, 저장되면 팝업이 원고 목록을 다시 불러옴 ④ 웹 `src/components/ExtensionConnect.tsx`(`ExtensionConnectButton` — `POST /api/extension {action:"issue"}`로 7일 코드 발급 → `src/lib/extensionPageBridge.ts`로 전달, `ExtensionInstallStatus` — 실제 확장 버전 표시)를 설정 「Chrome 확장 연결」에 배치, 기존 발급 버튼은 「직접 입력용 연결 코드 발급」 ⑤ **로그인 폼 복귀 수정**: `src/components/auth/LoginForm.tsx`가 늘 `/dashboard`로 가던 것을 주소의 `redirect`(이 사이트 안 `/` 경로만)로 복귀하게 함. 서버 API 변경 없음. 시험 10·tsc·eslint·로컬 빌드(ZIP v1.11) 통과, `verify-native-extension`은 확장이 설치된 크롬이 필요해 생략. 배포 Ready·DB/확장/ZIP v1.11(`check-extension-release` OK). 웨일 설정 화면: 「확장을 찾지 못했습니다 · 설치 전이거나 v1.10 이하」(미설치)·바로 연결·직접 입력용 발급 버튼 확인. 실제 버튼 연결은 확장 설치 뒤.

> 먼저 루트 `CLAUDE.md`·`AGENTS.md`·`GEMINI.md`·`docs/HANDOFF.md`를 읽습니다.
> 최신 배포 URL: [https://blog-content-maker.buylife.xyz](https://blog-content-maker.buylife.xyz)

---

## 1. 프로그램 사용 목적 및 대상
- **사용 목적**: 블로그 글감과 제목 추천부터 5가지 모드의 원고 작성, 실시간 문단/반복 어휘/FAQ 품질 점검, Gemini 최신 이미지 생성 모델을 활용한 본문 삽입 이미지 제작, 그리고 전용 크롬 확장을 통한 네이버 스마트에디터 ONE 자동 원고 전송까지 지원하는 올인원 블로그 마케팅 자동화 솔루션.
- **주요 대상**:
  - 네이버 블로그, 티스토리, 워드프레스 운영자 및 디지털 마케터
  - 매일 꾸준한 양질의 정보성/후기형/비교형 블로그 포스팅이 필요한 1인 기업가
  - 글 작성 후 네이버 블로그 편집기에 텍스트와 이미지를 일일이 복사·붙여넣는 번거로움을 줄이고 싶은 크리에이터
  - 회원 본인의 AI 키로 투명하고 안전하게 콘텐츠를 생성하고 30일간 버전 이력을 관리하려는 사용자

---

## 2. 개발 구현 도구 / 기술 스택 / 스킬
- **프레임워크**: Next.js 16.4.1 (App Router, Turbopack)
- **라이브러리**: React 19.3.0, TypeScript 5.9.3, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.3, `jszip` 3.10.1, `lucide-react` 1.48.0
- **인프라 & 백엔드**: Supabase (PostgreSQL, Auth, RLS 소유자 격리, Storage 버킷 `blog-content-maker`), Vercel 프로덕션 배포
- **크롬 확장 프로그램**: Manifest V3 전용 확장 (`extension/`), 네이버 스마트에디터 ONE 자동 입력기 탑재
- **디자인 시스템**: **플로우 위저드 스타일 — 단계별 블로그 콘텐츠 에디션** (소프트 화이트 `#f8fafc`, 퓨어 화이트 `#ffffff`, 인디고 블루 `#2563eb`, 에메랄드 `#10b981`)
- **브라우저 검수 도구**: Playwright (Microsoft Edge 전용, 화면 최전면 포그라운드 노출)

---

## 3. 핵심 기능, 시스템 아키텍처, 장점 및 단점

### 5단계 핵심 작업 흐름 (Workflow Pipeline)
1. **1단계 글감·제목 찾기 (`/ideas`)**: 핵심 키워드 입력 시 독자의 클릭을 유도하는 10가지 매력적인 제목과 소주제 자동 도출.
2. **2단계 원고 만들기 (`/write`)**: 정보성, 후기형, 비교형 등 5가지 작성 모드로 서론·본론·결론이 정돈된 완성형 초안 작성 (Google Gemini / OpenAI 선택 가능, 웹 검색 근거 주입 지원).
3. **3단계 글 점검·다듬기 (`/review`)**: 제목 일치율, 반복 단어, 문단 길이, FAQ 포함 여부 실시간 감사(Audit) 및 버전별 수정본 비교.
4. **4단계 이미지·장면 준비 (`/images`)**: Gemini 정식 모델(`gemini-nano-banana-2.1`, `gemini-3-pro-image`)을 활용한 본문 소주제별 삽입 이미지 및 제품 합성 이미지 생성.
5. **5단계 네이버로 옮기기 (`/export`)**: 전용 크롬 확장을 통해 네이버 스마트에디터 ONE에 제목·본문·이미지를 안전하게 자동 입력하거나 HTML/Markdown/ZIP으로 내보내기.

### 장점
1. **플로우 위저드 단계별 완성형 구조**: 복잡한 블로그 포스팅 작업을 5단계로 체계화하여 글쓰기 초보자도 고품질 콘텐츠 완성 가능.
2. **네이버 스마트에디터 ONE 전용 확장 연동**: 브라우저 디버거 API를 활용하여 빈 편집기 탭에 텍스트와 이미지를 완벽하게 자동 주입.
3. **소유자 기반 30일 격리 보관**: 모든 원고와 이미지는 회원 본인 격리 저장소에 안전하게 보관되며 30일 후 자동 만료.

### 단점 및 개선 여지
1. 네이버 블로그 외 티스토리, 워드프레스 전용 REST API 직접 발행 플러그인은 추가 개발 필요.
2. 본문 이미지 편집기 상에서 간단한 텍스트 배지 오버레이 도구 부재.

---

## 4. 버전별 변경 히스토리
- **v1.10 (2026-10-18, Antigravity CLI)**:
  - 플로우 위저드 스타일 디자인 리뉴얼 (`#f8fafc`, `#ffffff`, `#2563eb`, `#10b981`).
  - 사이드바 메뉴명 `📖 연동 & 사용 매뉴얼` 표준화 및 비주얼 가이드북(`/guide`) 전면 고도화.
  - 확장 프로그램(`extension/manifest.json`), 코드(`version.ts`), 패키지(`package.json`), Supabase DB `version`/`extension_version` 모두 `v1.10`으로 완벽 일치.
  - Microsoft Edge 최전면 포그라운드 실세션 6종 검수 완료 및 데스크톱 대시보드 10분 화면 유지.
- **v1.09 (2026-10-17)**: Gemini 이미지 최신 모델 연동 및 공용 모듈 사본 적용.
- **v1.04 (2026-10-16)**: 최상위 Supabase 데이터베이스 연동 변수 호환 작업.
- **v1.03 (2026-10-16)**: Production Supabase Publishable Key 호환 배포 및 Chrome 확장 입력 안정화.
- **v1.00 (2026-10-15)**: 최초 정식 릴리즈.

---

## 5. 추가 프로그램 및 디자인 작업 대기 내용
- 상세 내용은 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) 참조.
- 워드프레스(WordPress) 및 티스토리(Tistory) REST API 기반 자동 초안 전송 기능.
- 본문 썸네일 이미지에 블로그 제목 텍스트를 오버레이 합성해 주는 퀵 캔버스 툴바.

---

## 6. 기존 타 자동화 프로그램과의 연계 / 기능 병합 제안
1. **`blog-keyword` (AI 블로그 키워드 자동화) 연계**: 황금 키워드 발굴기에서 찾은 저경쟁 고효율 키워드를 원클릭으로 `blog-content-maker`의 글감 찾기 단계로 자동 전달.
2. **`thumbnail-master` (AI 썸네일 마스터) 연계**: 블로그 대표 썸네일 제작 시 썸네일 마스터의 A/B 헤드라인 그래픽 썸네일 엔진을 호출하여 고시인성 대표 이미지 생성.
3. **`naver-blog-auto-poster` 연계**: 작성 완료된 원고를 스케줄러 기반 예약 발행 파이프라인으로 전송.

---

## 7. 사용자 편의성 증대를 위한 UI/UX 개선안
1. **실시간 스마트에디터 ONE 목업 뷰**: 네이버 블로그 모바일 앱 및 PC 웹 뷰에서 내 글이 어떻게 보일지 실시간 시뮬레이션해 주는 모의 프리뷰 패널.
2. **글자 수 및 맞춤법 실시간 인디케이터**: 본문 작성 시 공백 포함/제외 글자 수와 맞춤법 검사 추천을 에디터 하단에 고정 표시.
3. **단축키 가이드 키캡 툴팁**: 다음 단계 이동(`Ctrl + Enter`), 임시 저장(`Ctrl + S`) 등 파워 유저를 위한 단축키 안내.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
