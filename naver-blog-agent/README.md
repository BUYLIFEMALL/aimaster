# 네이버 블로그 에이전트 (Naver Blog Agent)

> **BLC-04 v2.05 운영 완료:** [사진 후기 편집·저장·검수 인수인계](docs/IMPROVEMENT_HANDOFF_20261021_BLC04_PHOTO_SAVE.md) · [플랜/해석 정정](docs/PLAN_20261021_BLC04_PHOTO_SAVE.md). 코드 `4b3f84b6`/`342eef52` 푸시·운영 Ready·DB/확장/설치/라이브 ZIP 일치. 회귀 185개·확장 모의 42개·타입/빌드, 지정 회원 후기 1회·저장/편집/재열기/검수 해제·실제 네이버 prepared 8/8·516px 안내/사진 검수 완료. 새 시험 사진 2장/763바이트·원고 1건·최종 발행 0. 원본 사진 AI 활용 표시/초기 폴링 지연은 후속 검토, 상세창 모의 해석 정정은 인수인계에 기록. 다음은 BLC-05 자료 수집/출처 비교 플랜입니다.


> **BLC-03 v2.03 운영 완료:** [사진·방문 메모 후기 인수인계](docs/IMPROVEMENT_HANDOFF_20261021_BLC03_PHOTO_REVIEW.md). 사진 관찰과 회원 경험을 나눠 초안을 만들고 근거 대조/복사를 제공합니다. 코드 `1812bf7f` 푸시·운영 Ready·DB/확장/라이브 ZIP 일치, 회귀 176개·확장 모의 42개·타입/빌드 통과. 실제 지정 회원 GPT-4o-mini 생성 1회·근거 대조/복사/입력 변경·안내/좁은 화면 검수 완료. 저장/편집/확장은 BLC-04 후속 항목입니다.

> **BLC-02 v2.02 운영 완료 이력:** [사진 준비 UI 인수인계](docs/IMPROVEMENT_HANDOFF_20261020_BLC02_PHOTO_INPUT.md). 최대 6장·대표/순서/설명·제거/취소 로컬 실제 회원 검수와 회귀 158개 통과. 운영 Ready·DB/확장/라이브 ZIP 일치·실제 일반 회원 사진 준비/취소·사용 안내 검수 완료. 당시 남은 좁은 화면 바로가기 픽셀/펼침은 v2.03에서 확인했습니다. 사진 AI 글쓰기는 BLC-03 완료, 원고 저장은 BLC-04 대기입니다.

> **BLC-01 v2.01 운영 완료:** [최신 인수인계](docs/IMPROVEMENT_HANDOFF_20261020_BLC01_RELEASE.md). 승인된 비공개 Storage/정책 적용, 실제 로컬 회원 사진 API 9개 통과. 운영 배포 Ready, 앱/DB/확장/라이브 ZIP v2.01 일치. 운영 일반 회원·실제 확장 준비(prepared 6/6) 검수 완료, 최종 발행 0회. 아래 v2.00·승인 대기·미배포 기록은 이전 이력입니다.

> **2026-10-20 재개 확인:** [Edge 부분 제어·Storage 승인 대기 인수인계](docs/IMPROVEMENT_HANDOFF_20261020_BLC01_RESUME.md). 코드 대조·회귀 시험 통과, BLC-01 운영 미완료·v2.00 유지.

> **부분 통합 담당: Codex(2026-10-20 주인님 지정)**. [순차 작업목록 BLC-00~15](../docs/BLOG_CONSOLIDATION_TASKS.md). BLC-00 안전장치 운영 검수 완료. BLC-01 사진 비공개 보관 기반은 로컬 구현/검수 통과·운영 미적용입니다. [최신 인수인계](docs/IMPROVEMENT_HANDOFF_20261020_BLC01_PRIVATE_PHOTOS.md) · [플랜](docs/PLAN_20261020_BLC01_PRIVATE_PHOTOS.md) · [운영 저장소·권한 변경안(미승인/미적용)](docs/BLC01_STORAGE_CHANGE_PROPOSAL.md).

> **2026-10-20 부분 통합 0단계**: 새 원고 준비 모드 초기화 3개 파일이 다른 CLI 커밋 `9e3bb9ea`에 함께 반영됐습니다. 기존 원고 설정은 유지합니다. [순차 실행 계획](docs/PLAN_20261020_BLOG_CONSOLIDATION_STAGE0.md) · [0단계 이력](docs/IMPROVEMENT_HANDOFF_20261020_BLOG_CONSOLIDATION_STAGE0.md). 운영 검수는 Claude `7320615a` 결과를 인수해 완료했습니다. 사진 UI/글쓰기 이관·기존 도구 중단은 아직 하지 않았습니다.

> **공식 서비스 URL**: https://naver-blog-agent.buylife.xyz
> **현재 운영 버전**: `v2.03` (2026-10-21, 사진 후기 초안 운영·실제 회원 검수 완료)
> **디자인 템플릿**: **플로우 위저드 스타일 (네이버 그린 라이트 변형)**

크롬 확장 프로그램과 5단계 멀티 AI 에이전트로 네이버 블로그 글의 기획·작성·윤문·스마트에디터 ONE 안전 자동 발행을 지원하는 올인원 에이전트 프로그램입니다.

---

## 1. 프로그램 사용 목적 및 대상
- **사용 목적**: 실시간 화제의 떡상 글감 수집부터 5단계 AI 글 작성, 그리고 크롬 확장을 통한 네이버 스마트에디터 ONE 안전 자동 입력을 원스톱 지원.
- **주요 대상**:
  - 네이버 블로그 1일 1포스팅을 안정적이고 빠르게 발행하고자 하는 블로거
  - 스마트에디터 ONE 글쓰기 창에서 서식과 이미지를 안전하게 자동 입력하길 원하는 크리에이터
  - 복수의 네이버 블로그 계정을 효율적으로 관리하고자 하는 마케터

---

## 2. 개발 도구 및 기술 스택
- **프레임워크**: Next.js 16.2.11 (App Router, Turbopack), React 19.2.4, TypeScript 5
- **스타일링**: Tailwind CSS v4, Lucide React
- **AI 멀티 엔진**: Google Gemini 2.5, OpenAI GPT-4o, Claude 3.5 Sonnet, NanoBanana (이미지 생성)
- **에디터**: Tiptap Editor (리치 텍스트 서식 편집기)
- **크롬 확장 프로그램**: Manifest V3 기반 네이버 블로그 전용 자동화 확장 (`extension/`)
- **인증 및 DB**: Supabase Auth (SSR 쿠키), Supabase Database (`programs`, `posts` 등)
- **실세션 검수**: Microsoft Edge (`msedge`) Playwright 포그라운드 실세션 검수

---

## 3. 핵심 기능 및 3단계 워크플로우

1. **STEP 1: 떡상 콘텐츠 수집 (`/collector`)**:
   - 실시간 인기 급상승 검색어와 유튜브/뉴스 트렌드 토픽을 실시간 수집하여 고효율 글감 발굴.
2. **STEP 2: 콘텐츠 생성 (`/`) - 5단계 AI 파이프라인**:
   - 기획 → 초안 → 윤문 → AI 검수 → 이미지 컷 생성의 체계적 파이프라인으로 체류 시간 높은 포스팅 완성.
   - 글의 화자(페르소나), 목표 글자 수(1~4,000자), AI 모델 선택 및 1~5장 맞춤 이미지 컷 생성.
3. **STEP 3: 콘텐츠 보관함 (`/queue`) & 크롬 확장 발행**:
   - [최종원고 수정 및 확인 완료] 검수 게이트를 거쳐 크롬 확장에 안전하게 전송.
   - '발행 전 준비까지만 · 최종 버튼은 직접 누름' 모드를 통해 스마트에디터 ONE에 제목·본문·이미지를 안전하게 자동 타이핑하고 최종 확인 후 발행.
4. **비주얼 연동 & 사용 매뉴얼 (`/guide`)**:
   - 공식 가이드북 히어로 배너, 3단계 파이프라인 카드, 크롬 확장 1초 설치/페어링 가이드, C-Rank/D.I.A.+ 노하우, FAQ 5종 아코디언.

---

## 4. 버전 변경 이력 (Changelog)

- **`v1.99` (2026-10-20, 현재 버전 · Claude Code)**: 여러 기사로 만든 글감마다 내용이 가장 겹치는 기사 하나만 원문으로 보관(`pickBestArticle`). v1.98은 묶음 앞 4,000자를 모든 글감에 같이 넣어 뒤쪽 기사가 잘렸음(운영 검수에서 발견).
- **`v1.98` (2026-10-20 · Claude Code)**: ① 수집 4종이 요약 전 원문 `source_text`(최대 4,000자)를 글감에 함께 보관 → 생성 근거 = 요약 + 원문(`buildSourceMaterial`) ② 원문 대조를 「사실 주장 문장」으로 한정(감상·추측·질문·일반론 제외) ③ 브라우저 `alert` 29곳·`confirm` 11곳을 화면 안 알림·확인 창으로 교체(`src/lib/uiDialog.ts` `notify`/`askConfirm` + `src/components/DialogHost.tsx`, 대시보드 셸에 1회). 닫기·Esc=취소. 새로 코드를 쓸 때도 `alert`/`confirm` 대신 이 두 함수를 쓴다.
- **`v1.97` (2026-10-20 · Claude Code)**: ① 글감 근거 전달 — 생성 화면이 선택한 글감 **전체 내용**을 `sourceMaterial`로 보내고(예전엔 앞 100자만 「발행 목적」으로 감 → 사실 왜곡 원인), 기획·작성 프롬프트에 「이 자료의 사실만」 블록(`src/lib/ai/sourceGrounding.ts`) ② 원문 대조 — 같은 검수 호출에서 자료에 없는 사실 문장(`unsupported`, 최대 5개)을 받아 PASS→WARN·검수 의견에 표시(추가 AI 호출 없음) ③ 보관함 「발행 설정」에 바로/예약 발행(10분 단위, `/api/posts/[id]/publishing` 예약 저장·조회) ④ 랭킹 상태 점검 `/api/collector/ranking-health`(목록만·무료·30분 캐시) + 수집 버튼 🟢/🔴, 매일 `/api/cron/cleanup`에서도 점검 로그 ⑤ 글감 카드 「🏠 홈판형으로 바로 쓰기」(`format=homefeed`) ⑥ 생성 화면이 `/api/accounts`에서 본인 블로그 목록을 직접 불러옴.
- **`v1.96` (2026-10-20 · Claude Code)**: 원고 목록 API가 `is_reserved`·`scheduled_at`을 내보내도록 수정(v1.95 ⏰ 예약 배지가 새로고침 뒤 사라지던 버그). 테스트 계정 실검수 결과·발견(홈판형 사실 왜곡, 생성 화면 블로그 목록 로컬 캐시 의존)은 `docs/IMPROVEMENT_HANDOFF_20261020.md`.
- **`v1.95` (2026-10-20 · Claude Code)**:
  - **네이버 랭킹 글감**: 수집 화면 URL 탭에 「연예 많이 본 뉴스·스포츠 인기 뉴스·경제 최신 뉴스」 버튼(`src/lib/naverRanking.ts`, `api/collector` `action:"ranking"`). 상위 기사 5건 본문만 읽고 기사 이미지는 쓰지 않음. 연예·스포츠는 네이버 화면용 **비공식** JSON(`api-gw.entertain.naver.com`, `api-gw.sports.naver.com`)이라 바뀌면 안내 오류로 분리.
  - **홈판형 글 구성**: 생성 화면 「글 구성 — 기본 정보형 / 홈판형 이슈글」(`src/lib/ai/articleFormats.ts`). 홈판형은 기획·작성 단계에 질문형 도입·소제목 4개·제목 20~40자 규칙을 덧붙임. 기본값은 기존과 동일.
  - **간격 예약 일괄 전송**: 보관함 일괄 전송에 「간격 예약 발행」(첫 시각 + 10분 단위 간격, 목록 순서대로 배정, `src/lib/scheduleSlots.ts`). PUT 저장이 `is_reserved`/`scheduled_at`을 받음(검사: 20분 이후·10분 단위). 목록에 ⏰ 예약 배지. 확장 코드는 기존 예약 입력 그대로 사용.
  - **쇼핑 커넥트 링크**: 생성 화면에 링크(네이버 쇼핑 주소만 최대 5개) 입력 → 소제목마다 「👉 관련 상품 보러 가기 + URL 한 줄」, 맨 앞 대가성 문구 자동(`src/lib/shoppingLinks.ts`). 확장 전송 때(`extensionBridge.ts`) 문구가 빠졌으면 다시 붙임. 자동 수집은 공식 API가 없어 하지 않음.
  - 배경: 외부 설치형 앱 「Naver Blog AI-Setup-0.1.0」 정적 분석 → 새 프로그램 대신 이 프로그램에 흡수(코드 미복사). 플랜 `docs/PLAN_20261020_HOMEFEED_TREND_SCHEDULE.md`, 인수인계 `docs/IMPROVEMENT_HANDOFF_20261020.md`.
- **`v1.94` (2026-10-18)**:
  - 플로우 위저드 라이트 (네이버 그린) 디자인 테마 전면 리뉴얼
  - 375px 모바일 반응형 헤더 & 슬라이드 드로어 내비게이션(`DashboardShell.tsx`) 구축
  - 비주얼 연동 & 사용 매뉴얼(`/guide`) 전면 고도화
  - 크롬 확장 manifest v3, ZIP 아카이브, DB `version` / `extension_version` 일괄 동기화
  - Microsoft Edge 포그라운드 실세션 5종 캡처 검수 완료
- `v1.82` ~ `v1.93`:
  - 대기열 필터링 고도화, 보관함 저장 복구 로직 강화, 다중 AI 모델 어댑터 연동
- `v1.81` (2026-10-12):
  - 가이드 사용 순서 8개 구간 및 5단계 빠른 시작 정리
- `v1.01` ~ `v1.80`:
  - 떡상 글감 수집기, 5단계 AI 생성기, 크롬 확장 프로그램 최초 구축 및 안전 발행 게이트 탑재

---

## 5. 추가 개선 백로그
- 상세 백로그는 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)를 참조하십시오.

---

## 6. 다른 프로그램과의 연계 아이디어
- `naver-blog-allinone`: 멀티모달 비전 사진 분석과 7대 키워드 분석 엔진 상호 연동.
- `ai-image-studio`: 본문 컷 이미지 생성 시 최신 나노바나나 고화질 엔진과 연계.
- `cardnews-studio` & `threads-posting`: 네이버 블로그 원고를 멀티채널 SNS 콘텐츠로 원클릭 재가공.

---

## 7. 사용자 UI/UX 개선 제안
- 스마트에디터 ONE 전송 실시간 타이핑 진행도(%) 인디케이터.
- 가상 스마트폰 폰 프레임 뷰어.
- 에디터 자동 로컬 백업 안내 뱃지.
