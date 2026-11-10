# BLOG(원문)생성 자동화 (ai-auto-blog) 개선사항 및 발전 과제 (IMPROVEMENTS.md)

> **🗂️ 「내 자료함」 연동 안내 — 블로그 담당께 (2026-11-11, 세션 `claude-win-rea`, 주인님 지시)**: 운영 DB `supabase/migrations/0061_member_assets_video_text.sql`로 이 프로그램의 원고(`blog_posts`, 숫자 id → md5 고정 번호)이(가) 공용 자료 목록 `member_assets`에 자동 등록되고, **원본 줄을 지우면 자료함 줄도 함께 지워집니다**(보관 기간 = 이 프로그램 정리 규칙, 발행된 원고는 「발행 1년」 규칙 대상). **이 프로그램 코드·배포는 바꾸지 않았습니다.** 칸 이름·저장 경로(`{user_id}/…`)·상태 값을 바꾸면 트리거 함수 `member_assets_sync_blog`도 함께 고쳐 주세요(트리거 오류 = 원본 저장 실패). 화면: https://www.buylife.xyz/library · 플랜 `docs/PLAN_20261111_MEMBER_LIBRARY.md` §9

> **최초 작성**: 2026-10-19  
> **상태**: 지속 누적 관리 문서 (Living Improvement Backlog)  
> **프로그램**: 59번 BLOG(원문)생성 자동화 (`ai-auto-blog`, `https://ai-auto-blog.buylife.xyz`)

---

## 2026-11-07 🟡 미배포 대기 — 「📨 업무 워크스페이스로 보내기」 (U10 2차, [역할: workspace] Claude Code 윈도우)
- 글 보기(`app/posts/[id]/page.tsx`) 관리 버튼 줄에 버튼(`components/SendToWorkspaceButton.tsx`, 독립 설치본은 숨김) → `POST /api/work-inbox`(출처 확인 → `checkProgramAccessApi` → 회원 본인 `blog_posts` 다시 읽기 → 공용 사본 `lib/workInbox.ts`(`work-inbox-client`, **직접 고치지 말 것** — 기준 `ai-work-workspace/src/lib/workInbox.ts` 수정 후 `--sync`)). 연결 파일 `lib/supabase/admin.ts`(사본이 부르는 경로, 기존 서버 클라이언트 재내보내기).
- 내용: `utils/workInboxContent.ts` — 제목, 본문(요약 첫 줄 + HTML → 마크다운, 이미지·이미지 프롬프트 구역 제외), 구조 데이터 `{ 채널: 네이버 블로그, 상태: draft|failed, 예약일 }`. 이 프로그램은 네이버 발행을 회원이 직접 누르고 발행 주소가 없어 「발행 완료」로 보내지 않는다 — 날짜는 네이버 입력일(없으면 작성일), 워크스페이스 캘린더에서 회원이 상태를 고친다.
- 검수: `npm run test:work-inbox` 4개, `test:extension-api` 38, tsc 0, 새 파일 eslint 0. 다음 배포 때 함께(버전 +0.01·DB·확장 ZIP 버전 맞춤, 화면에서 버튼 → 워크스페이스 받은 업무 → 캘린더 넣기 확인).
- 발견(기존, 이번 변경과 무관): `npm run test:security`의 카테고리 시험 6개가 실패 — v1.84에서 카테고리를 회원별(관리자 분기 제거)로 바꾼 뒤 시험이 옛 「관리자만 변경」 기대값으로 남아 있음. 시험 기대값을 새 규칙으로 고쳐야 함(blog 역할).

---

## 1. 프로그램 로직 및 비즈니스 기능 개선 과제

1. **실시간 트렌드 키워드 크롤러 및 토픽 추천 확장**:
   - 현재 HTTP, RSS, Perplexity, 쇼츠 기반 글감 수집 외에 네이버 실시간 검색 트렌드 및 구글 트렌드 일일 인기 급상승 검색어 자동 수집 엔진 보강.
   - 수집된 키워드의 검색량 및 경쟁강도를 자동 산출하여 '상위 노출 유망 글감' 라벨 부여.

2. **나노바나나 다중 섹션 이미지 자동 배치 고도화**:
   - 현재 본문 문맥에 따라 생성된 나노바나나 이미지를 서론/본론/결론의 최적 위치에 자동으로 분산 삽입하는 스마트 앵커링 로직 강화.
   - 이미지 캡션 및 대체 텍스트(alt tag) 자동 생성으로 검색엔진 SEO 점수 극대화.

3. **네이버 블로그 원클릭 클립보드 서식 복사 엔진 탑재**:
   - Tiptap 에디터에서 작성된 글과 이미지를 네이버 스마트에디터 ONE의 HTML/클립보드 규격에 맞춰 원클릭 복사할 수 있는 전용 복사 클립보드 직렬화 모듈 탑재.

---

## 2. 사용자 인터페이스(UI) 및 가독성·편의성 개선 과제

1. **에디터 전체 화면 포커스 모드(Zen Mode) 지원**:
   - 글 작성 및 수정 화면(`posts/[id]/edit`)에서 좌측 사이드바와 상단 바를 일시 숨기고 오직 글쓰기에만 집중할 수 있는 무소음 작성 모드 지원.

2. **본문 실시간 글자수 및 형태소 분포 인디케이터**:
   - 네이버 블로그 최적 기준(1,500자~2,500자) 달성 여부 및 핵심 키워드 반복 횟수를 시각적 프로그레스 바로 실시간 피드백.

3. **모바일 뷰포트에서의 Tiptap 툴바 가로 스크롤 최적화**:
   - 모바일(375px~390px) 환경에서 에디터 툴바가 2단 이상으로 깨지지 않고 가로 스와이프 가능한 스크롤 바로 부드럽게 작동하도록 방어.

---

## 3. 플랫폼 내 타 자동화 프로그램과의 연계 가능 기능

1. **49번 롱테일 키워드분석 (`longtail-keyword-expander`) 및 50번 경쟁사 분석 (`competitor-analysis`) 연계**:
   - 발굴된 황금 키워드 리스트를 `ai-auto-blog`의 글감 후보(`/candidates`)로 1클릭 전송하여 즉각적인 고수익 블로그 글 초안 작성 파이프라인 형성.

2. **22번 AI 유튜브 썸네일 프로 (`seo-thumbnail-pro`) 연계**:
   - 작성된 블로그 본문의 제목과 핵심 키워드를 기반으로 블로그 썸네일 및 카드뉴스 이미지를 1클릭으로 제작해 자동 삽입.

3. **26번 네이버 블로그 올인원 (`naver-blog-allinone`) 및 29번 네이버 블로그 에이전트 (`naver-blog-agent`) 연계**:
   - 완성된 원문 블로그 글을 크롬 확장 프로그램 또는 네이버 에이전트 큐로 자동 발송하여 원클릭 예약 발행 연동.

## 2026-10-23 (Claude Code 윈도우) — 소제목 반복 제거 적용(미배포 대기)
- 티스토리 글 18번에서 찾은 「### 작은 제목이 바로 위 ## 소제목을 그대로 되풀이」 문제가 같은 생성기 구조인 이 프로그램에도 해당되어 같은 방식으로 고쳤습니다(지시문 1줄 + 조립 때 `dropRepeatedHeading`). 티스토리는 고친 뒤 실검수(글 19번)에서 반복 0건이었습니다.
- 이 프로그램의 실제 생성 확인은 다음 배포 뒤 글 1편으로 합니다(AI 비용은 그때 주인님께 먼저 여쭙기).

## 2026-10-23 (Claude Code 윈도우, 블로그 전담 `claude-win-20261023-seo-bg`) — ⏳ 미배포 대기: 30일 정리 회원별 기록
- 매일 30일 정리 크론이 **실제로 지운 것만** 회원별로 세어 `usage_logs`(action `cleanup_expired`)에 한 줄씩 남김 — 메인 관리자 「30일 자동 정리」 표·「운영 상태」 진행률용. 공용 기준 `cleanup-usage-log`(기준 `four-cut-comics/src/lib/cleanupUsageLog.ts`) 사본을 `check-shared-modules.mjs --sync`로 받음(직접 고치지 않음). 미리 보기(`?dry=1`)는 기록 안 함, 기록 실패해도 정리는 계속. 다음 배포 때 함께(버전 +0.01).

## 2026-10-26 v1.83 — 보안 업데이트·운영 반영(Codex)

- Next.js/eslint-config-next16.4.2·sharp0.35.5 적용, React19.2.4 유지. 코드 6728a83ab; 새 UI/게시 엔진을 만들지 않았고 기존 작업을 보존했습니다.
- 무료 검사188개·tsc·로컬빌드 통과 → 팀 빌드0 확인 뒤 한 곳씩 배포 → READY/공식alias·HTTP 버전·인증 응답·DB/확장/라이브ZIP v1.83 OK. 최근15분 운영 오류 기록0.
- Vercel 빌드1회(인수인계 앱별1회 승인), AI/이미지/영상 생성0. 운영 ref esgxyikcnnvmlhygjkth의 programs 해당1행만 이전버전/예상다운로드URL 조건으로 갱신했고 배포 도우미의 ops집계 갱신 포함. 회원원고/키/연결/권한/스키마 변경0, 실제 입력/발행/예약0.
- [세 앱 공통 근거](../../docs/analysis-blog-consolidation-20261020/evidence/blog-security-batch-20261026.json)·[이 앱 검사](../../docs/analysis-blog-consolidation-20261020/evidence/ai-auto-blog-security-tests-20261026.json). 실제 회원 화면/확장 설치본 검수는 별도입니다.

## 2026-10-30 배포 키트 작업 중 발견 (Claude Code 윈도우, 세션 `claude-win-20261029-statusbar`)
- **시험 기대값 낡음(미처리)**: `npm run test:security` 6개(categories POST/PATCH/DELETE·GET canManage·관리자 이름 바꾸기·관리자 조회 실패)와 `npm run test:shorts` 1개(analyze 저장)가 실패 — v1.84(10-28) 카테고리 회원별 전환으로 「관리자만 수정·공용 카테고리」 기대가 맞지 않게 됨. 코드 결함이 아니라 시험 기대값을 회원 본인 소유 규칙으로 고쳐야 함(기대값만 수정, 시험 삭제 금지). 우선순위 중간.
- **독립 모드(배포 키트) 스위치 추가**: `lib/deployment.ts` — 자세한 내용은 `AGENTS.md` 맨 위와 `KIT/README.md`.

## 2026-11-01 v1.85 사용법 「✨ 새로 생긴 기능」 카드 (맥미니 `claude-mac-20261101-blog`, 주인님 승인 바로 배포)
- 블로그 정리 뒤 남은 프로그램의 소구점을 사용법(/guide) 맨 위 카드로 안내(기능·설명·「📍 어디서」 실제 메뉴 이름·💡 팁·⚠️ 주의). 컴포넌트 `GuideHighlights.tsx`(블로그 5개 공통 사본, 인라인 스타일). 메인 사이트 소개 문구도 같은 소구점으로 갱신(SQL `docs/program-descriptions/blog-copy-2026-11-01.sql`, DB만). tsc 통과.
