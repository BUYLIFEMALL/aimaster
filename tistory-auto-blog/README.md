# 티스토리 포스팅 자동화 — `tistory-auto-blog`

> **운영 이름 변경 완료:** v1.83 Ready·Edge 새 이름 확인, 소스 release/tistory-name-v183-20261022 (`8589073f`). [배포 완료/차기 v1.84 구분](docs/IMPROVEMENT_HANDOFF_20261022_NAME_RELEASE.md). master 자동 발행 후보는 v1.84 미배포입니다.
> **2026-10-22 운영 이름 우선 반영:** 운영 v1.83은 기존 입력 준비 기능+새 명칭 **티스토리 포스팅 자동화** 릴리스입니다. 이 master의 자동 최종 발행 구현은 **후속 v1.84 미배포/실검수 대기**입니다. [명칭 반영 플랜](docs/PLAN_20261022_NAME_RELEASE.md). 이전 v1.83 자동 발행 후보 기록은 개발 이력으로 읽습니다.
> **2026-10-22 최신 재개 위치:** 실제 입력은 completed, 댓글 메뉴/비공개 현재 처리 수정·155개 검사 통과, 실설정 재검수/배포/최종 발행 대기. [이어가기 인수인계](docs/IMPROVEMENT_HANDOFF_20261022_AUTO_PUBLISH_CONTINUE.md).
> 최신 지정명: **티스토리 포스팅 자동화**. 목록 이름 변경 완료 / 웹·확장 v1.83 미배포. [2026-10-21 구현 결과·재로그인 이후 첫 단계](docs/IMPROVEMENT_HANDOFF_20261021_AUTO_PUBLISH.md).
> **2026-10-21 자동 포스팅 v1.83 구현/검수 중(미배포):** 주인님 최신 지시로 기존 마지막 수동 발행 경계에 **별도 자동 포스팅 선택**을 추가합니다. 입력 준비는 기존대로 마지막 발행 수동, 자동 포스팅은 원고/설정 대조·서버 ACK 뒤 최종 1회·실제 URL/제목 확인/서버 기록까지 수행합니다. 과거 아래의 ‘마지막 버튼 자동화 금지’는 입력 준비 조작의 이력이며 이번 명시적 자동 모드 요청 범위는 최신 플랜이 우선합니다. 보호글/비밀번호 저장 금지·부분 입력 중단·TinyMCE 전체 setContent 금지·본인 계정/키·원래 30일 수명은 유지합니다. [플랜](docs/PLAN_20261021_AUTO_PUBLISH.md) · 실제 회원 발행을 확인하기 전 완료 표시 금지.


> **공식 서비스 URL**: https://tistory-auto-blog.buylife.xyz  
> **현재 버전**: `v1.82`  
> **공식 디자인 템플릿**: **플로우 위저드 스타일 — 티스토리 오렌지 앰버 에디션 (Flow Wizard Style — Tistory Orange Amber Edition)**

AIMaster 회원이 AI로 전문 블로그 원문을 만들고, **전용 크롬 확장 프로그램**이 티스토리 글쓰기 에디터(TinyMCE)에 사람처럼 서식·이미지·카테고리·태그를 자동으로 입력해 주는 스마트 자동화 솔루션입니다. (최종 저장 및 발행은 안전을 위해 회원이 직접 확인 후 클릭)

---

## 7대 핵심 프로그램 정보

### 1. 프로그램 사용목적 및 대상 (Target & Purpose)
- **대상**: 애드센스 수익형 블로그, IT/기술 블로그, 리뷰/정보성 블로그를 운영하는 전문 블로거, 마케터 및 크리에이터.
- **목적**: 글감 발굴, AI 원문 작성, 서식 편집, 티스토리 자동 전송까지 올인원 파이프라인으로 블로그 운영 시간을 대폭 절감.

### 2. 기술 스택 및 연동 도구 (Tech Stack & Skills)
- **Frontend / Fullstack**: Next.js 16.2.10 (Turbopack), React 19, TailwindCSS v4, TypeScript.
- **Editor**: Tiptap v3 Suite (소제목 밑줄, 요약 인용구, 이미지 라운딩 서식 완비).
- **Database & Storage**: Supabase SSR, Supabase Storage (30일 안전 격리 보관).
- **Chrome Extension (Manifest V3)**: TinyMCE 자동 제어, 30분 작업 대기 큐, 대화상자 자동 취소 가드.
- **공용 클라이언트 연동**: `gemini-image-client`, `gemini-image-models`, `youtube-data-client`.

### 3. 핵심 기능 및 아키텍처 (Features & Architecture)
1. **4대 주제 수집기 (`/candidates`)**: HTTP URL, RSS 피드, Perplexity 트렌드 검색, **유튜브 쇼츠 떡상 분석**.
2. **AI 글쓰기 (`/write/ai-form`)**: 다양한 톤앤매너, 모델 선택(Gemini, Claude, OpenAI), NanoBanana 이미지 자동 생성.
3. **게시글 관리 및 1-Click 전송 (`/posts/[id]`)**: 발행 설정 패널(카테고리, 공개 범위, 댓글 허용, 홈주제, 예약 발행) 및 티스토리 원스톱 전송.
4. **연동 & 사용 매뉴얼 (`/guide`)**: 5단계 파이프라인 다이어그램, 실전 가이드, 키캡 치트시트, FAQ 아코디언.

### 4. 현재 버전 및 변경 히스토리 (Changelog)
- **v1.82 (2026-10-18)**: 플로우 위저드 오렌지 앰버 테마 리뉴얼, 375px 모바일 햄버거 헤더/드로어 구축, 비주얼 가이드북(`/guide`) 신설, Edge 포그라운드 실세션 검수 완료.
- **v1.81 (2026-10-18)**: 이미지 시간 초과 안내를 Google 사용량 확인으로 정정.
- **v1.80 (2026-10-18)**: 이미지 시간 초과 자동 재시도 중단(이중 과금 방지).

### 5. 작업 대기 백로그 (Pending Tasks)
- 상세 목록: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
  - 크롬 확장 실시간 연결 상태 핑 배지 연동.
  - 본문 서식(HTML) 4종 프리셋 템플릿 다양화.
  - 주제 후보 카테고리별 일괄 다중 글 생성 큐.

### 6. 타 프로그램과의 연계 아이디어 (Integration Ideas)
- 상세 목록: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
  - `shorts-viral-studio` (31번) 쇼츠 대본 ➔ 티스토리 원문 1-Click 변환.
  - `ai-image-studio` (34번) 보관함 갤러리 이미지 에디터 직접 불러오기.
  - `naver-blog-agent` (29번) 네이버 & 티스토리 원스톱 동시 발행.

### 7. 사용자 편의성 UI/UX 제안 (UI/UX Proposals)
- 3단계 플로우 스텝퍼의 동적 진행 카운트 뱃지.
- 모바일 드로어 및 터치 인터랙션 최적화.

---

## 관련 인수인계 문서
- [디자인 개발완료 보고서](docs/DESIGN_HANDOFF.md)
- [사전 개발 플랜](docs/PLAN_20261018_DESIGN_RENEWAL.md)
- [개선 과제 제안서](docs/IMPROVEMENTS.md)
- [작업 대기 백로그](docs/IMPROVEMENT_BACKLOG.md)
- [운영 및 개발 인수인계](docs/OPERATIONS_HANDOFF.md)
