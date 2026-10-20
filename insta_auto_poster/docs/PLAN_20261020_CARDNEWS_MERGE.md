# 개발 플랜 — INSTA 포스팅 안으로 카드뉴스 스튜디오 병합 (2026-10-20, Claude Code 윈도우)

근거: `docs/analysis-insta-consolidation-20261020/REPORT.md` 병합 A. 주인님 확정(2026-10-20):
- 방향: **INSTA 포스팅(`insta_auto_poster`, slug `auto-instagram-posting`) 안으로 카드뉴스(`cardnews-studio`)를 넣는다.**
- 요금: **INSTA의 FREE 배지 유지**(카드뉴스 기능도 가입 회원 무료).
- **최상위 규칙 그대로**: 회원 본인 인스타 계정 연동 + 본인 API 키(Gemini·OpenAI·Claude) 등록 뒤 사용. 키가 없으면 「본인 키를 등록해 주세요」, 운영자·다른 회원 키 폴백 금지.

## 조사 결과
- 두 앱 모두 Next 16.2.11·React 19.2.4·Tailwind v4·같은 다크 토큰(`#0d0f17`/`#161922`/`#262c3d`) → 화면 이식 시 디자인 충돌 작음.
- 카드뉴스 화면: `/plan` `/copy` `/design` `/background` `/export` `/dashboard` `/guide` `/settings` `/login`. INSTA와 겹치는 경로: `/dashboard` `/guide` `/settings` `/login`.
- 카드뉴스 API: `/api/cardnews/*`(13개), `/api/projects`, `/api/templates`, `/api/settings/api-keys`, `/api/auth/logout` — INSTA와 경로 충돌 없음.
- lib 겹침: `instagram/publish.ts`·`ai/geminiImage.ts`·`ai/nanoBananaModels.ts`·`memberIntegrations.ts`는 내용 동일(공용 코드). `instagram/memberAccount.ts`·`supabase/*`·`access.ts`·`apiKeys.ts`·`auth.ts`·`actions/auth.ts`는 다름 → INSTA 것을 기준으로, 카드뉴스 전용 동작이 필요한 것만 카드뉴스 폴더로.
- 추가 의존성: `jszip`·`lucide-react`·`pretendard`·`@fontsource/*` 3종·`sharp`·`undici`.
- 카드뉴스 DB 표 `cns_projects`·`cns_templates`·`cns_insta_posts`·`cns_member_scheduler` — 같은 공용 DB라 **이전 없이 그대로 사용**.

## 단계
### 1단계 — 카드뉴스 스튜디오를 INSTA 앱 안으로 이식 (INSTA v1.35)
1. 화면: `src/app/(dashboard)/cardnews/`(홈) + `cardnews/plan|copy|design|background|export`. 카드뉴스 「설정」은 INSTA 설정(같은 `user_api_keys`)으로 연결, 「가이드」는 `/cardnews/guide`.
2. API: `/api/cardnews/*`·`/api/projects`·`/api/templates` **경로 그대로** 옮김(옛 주소 전달·회원 cron-job.org 작업 주소 호환).
3. 코드 위치: 카드뉴스 전용 컴포넌트 `src/components/cardnews/`, 전용 lib는 `src/lib/cardnews/` 아래로 모으고 import 경로 정리. 공용 코드 사본은 공용 기준 코드 등록부(`scripts/check-shared-modules.mjs`)에 INSTA 경로를 사본으로 추가.
4. 좌측 메뉴: INSTA 사이드바에 「🎨 카드뉴스 스튜디오」 묶음(기획·문구·디자인·배경·저장·게시).
5. 권한: INSTA의 `requireProgramAccess()`(FREE 판정) 그대로. 모든 카드뉴스 API는 기존처럼 회원 본인 키만 사용(폴백 없음) — 이식 후 키 없는 상태 안내 문구 확인.
6. 검수: tsc·build → 커밋 → INSTA 배포 → 크롬(관리자·시험 회원) `/cardnews` 5단계 화면·저장·불러오기·예약 게시 목록. AI 생성 시험은 최소 1회(본인 키).
7. 이 단계에서는 **카드뉴스 기존 주소(cardnews-studio.buylife.xyz)와 카탈로그는 그대로 둔다**(회원 영향 없음).

### 2단계 — 게시·예약 보관함 하나로 (INSTA v1.36)
- INSTA 「게시물」 목록에 카드뉴스 예약·게시 기록(`cns_insta_posts`)도 함께 표시, 예약 실행(cron)도 한 앱에서.
- INSTA 「새 게시물 → 카드뉴스 4장(AI 이미지)」은 스튜디오로 안내(한글 깨짐 없는 방식으로 일원화) — 화면 문구는 주인님 확인 후.

### 3단계 — 옛 카드뉴스 정리 (주인님 확인 후 진행)
- `cardnews-studio.buylife.xyz` 화면 주소 → INSTA `/cardnews/...`로 이동, API 주소는 전달(rewrite)로 유지. Vercel 프로젝트·도메인은 삭제하지 않음.
- 카탈로그: 카드뉴스 「병합됨 → auto-instagram-posting(2026-10-20)」 표시 후 비공개, INSTA 상세 소개·핵심 특징 다시 작성, 역량 지도 카드 갱신.
- 공용 기준 코드의 기준 위치를 `cardnews-studio` → `insta_auto_poster`로 이동.

## 비용
- 유료 API: 이식 검수용 AI 생성 최소 1회(관리자 본인 키, 가장 싼 모델). 그 외 없음.
- 운영자 인프라: Vercel 빌드(단계마다 INSTA 1회). 새 서버·도메인 비용 없음.
- 회원 부담: 지금과 같음(본인 키로 쓰는 AI 비용).

## 인수인계 산출물
- `insta_auto_poster/AGENTS.md`·`README.md` 버전 기록, `docs/IMPROVEMENTS.md`, 루트 `docs/HANDOFF.md`, 단계별 커밋.
