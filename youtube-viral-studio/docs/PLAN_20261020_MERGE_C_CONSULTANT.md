# 개발 플랜 겸 인수인계 — 병합 C: YOUTUBE CHANNEL CONSULTANT → YOUTUBE VIRAL FINDER (2026-10-20, Claude Code 윈도우)

> **다른 CLI가 이어받을 때 이 문서부터 읽는다.** 진행 상태는 맨 아래 「8. 진행 상황」 표가 기준이다.
> 근거 분석: `../../docs/analysis-youtube-consolidation-20261020/REPORT.md` (보기 좋은 표: https://claude.ai/artifact/7Ad6WiRz8ykhuXTZ9PYCqx)
> 앞선 같은 방식의 병합(참고 구현): 인스타 병합 B — `../../instagram-comment-reply/docs/PLAN_20261020_DM_MERGE.md`, `../../instagram-comment-reply/docs/IMPROVEMENT_HANDOFF_20261020.md`

## 0. 주인님 지시·결정
- 2026-10-20 「병합 C … 이것부터 하자」 — 유튜브 병합 C·D·E 중 C를 먼저 진행.
- 이름 **「YOUTUBE 트렌드 분석」 확정**(주인님 2026-10-20 「너무 길어」). 요금·권한 그대로, **회원 본인 계정·본인 API 키 최상위 규칙 유지**.
- 「토큰 다되면 다른 CLI가 이어서 할꺼라서 인수인계 문서로 남겨놔」 「너가 지금 작업 하는 것도 인수인계 문서로」 → 이 문서.

## 1. 대상
| 구분 | 기준(남는 앱) | 들어오는 앱 |
|---|---|---|
| 프로그램 | YOUTUBE VIRAL FINDER `youtube-viral-studio` v1.19 · 배지 new/best/recommended | YOUTUBE CHANNEL CONSULTANT `youtube-channel-consultant` v1.10 · 배지 new |
| 주소 | https://youtube-viral-studio.buylife.xyz | https://youtube-channel-consultant.buylife.xyz |
| 폴더·형식 | `youtube-viral-studio/` Next 16.4.2, `src/` | `youtube-channel-consultant/` Next 16.2.11, `src/`, `vercel.json`(crons 없음) |
| 운영 DB | `esgxyikcnnvmlhygjkth` | 같음 |

기준을 VIRAL FINDER로 한 이유: BEST·추천 배지, 버전·Next 최신, 권한 회원이 더 많음(아래), 즐겨찾기 DB 표가 있음.

## 2. 조사 결과 (2026-10-20 확인)
- **화면**: VIRAL `/dashboard /viral-shorts /golden-channels /trending-videos /source-finder /favorites /settings /guide` · CONSULTANT `/dashboard /channel-analysis /keyword-analysis /golden-channels /settings /guide`. 겹침 `/dashboard /golden-channels /settings /guide`.
- **API**: VIRAL `/api/youtube/{search-shorts,golden-channels,trending,source-finder,analyze-script}`, `/api/favorites`, `/api/settings/api-keys` · CONSULTANT `/api/youtube/{channel,keyword,golden-channels}`, `/api/ai/analyze`, `/api/settings/api-keys`.
- **CONSULTANT에만 있는 파일 18개**(옮길 대상): `app/(dashboard)/channel-analysis/page.tsx`, `app/(dashboard)/keyword-analysis/page.tsx`, `app/api/ai/analyze/route.ts`, `app/api/youtube/channel/route.ts`, `app/api/youtube/keyword/route.ts`, `components/ai/{AiPanels,Markdown,useAi}`, `components/analysis/{Charts,VideoList,common}`, `components/settings/GuideLinkButton.tsx`, `lib/ai/{llm,models,prompts}.ts`, `lib/export.ts`, `lib/youtube/{analysis,targets}.ts` (모두 `src/` 아래).
- **같은 경로인데 내용이 다른 파일 20개**: 특히 `lib/youtube/client.ts`(151줄 차이)·`metrics.ts`(230줄)·`types.ts`(132줄) — **두 앱이 같은 이름의 유튜브 함수·형식을 다르게 갖고 있음**. 그대로 덮어쓰면 VIRAL 기능이 깨진다 → CONSULTANT 쪽은 `src/lib/consultant/`(또는 `lib/youtube/consultant/`)로 이름을 나눠 옮기고 import를 바꾸는 방식(인스타 병합 B의 `lib/dmApp/`과 같은 방식). 같은 내용 파일 9개는 그대로 공유.
- **공용 기준 코드**: `youtube-data-client`(`lib/youtube/youtubeData.ts`)·`youtube-golden-engine`(`lib/youtube/goldenEngine.ts`)의 **기준이 CONSULTANT**, VIRAL은 사본(`scripts/check-shared-modules.mjs` 130·135·149·266행 근처). 병합하면 기준 위치를 VIRAL로 옮기고 CONSULTANT 항목을 사본 목록에서 정리해야 함(카드뉴스 병합 때 기준 위치 이동 사례: 커밋 `e574afed`).
- **키**: 두 앱 모두 `user_api_keys`의 `youtube_api_key`·`openai`·`gemini`·`anthropic` 4종(`lib/apiKeys.ts` 8줄 차이만) → 회원이 다시 등록할 필요 없음.
- **DB 표**: 공용 권한 표(`profiles`·`programs`·`subscriptions`·`user_program_access`·`usage_logs`) + VIRAL 전용 `yvs_favorites`(즐겨찾기, 회원별). CONSULTANT는 결과를 저장하지 않음 → **DB 이전 없음**.
- **외부 등록 주소 없음**: OAuth·웹훅·텔레그램이 없어 인스타 병합 같은 재등록 문제 없음.
- **이용 권한**: VIRAL 180명, CONSULTANT 148명, **CONSULTANT 148명 모두 VIRAL에도 있음**(VIRAL만 32명) → 권한 이전 불필요. 활성 구독 두 앱 모두 0.
- 두 폴더 미커밋 변경 없음, ACTIVE_WORK에 다른 CLI 없음(2026-10-20 확인).

## 3. 단계 (인스타 병합 A·B와 같은 3단계)
### 1단계 — CONSULTANT 화면·기능 이식 (VIRAL v1.20)
1. CONSULTANT 전용 파일 18개를 VIRAL로 복사: 화면은 `/channel-analysis`·`/keyword-analysis` 그대로(겹치지 않음), API `/api/youtube/channel`·`/api/youtube/keyword`·`/api/ai/analyze` 그대로.
2. 이름이 겹치는 `lib/youtube/{client,metrics,types}.ts`의 CONSULTANT 판은 `src/lib/consultant/youtube/`로 옮기고, 옮겨 온 파일들의 import를 그쪽으로 바꾼다. `lib/ai/*`·`components/ai/*`·`components/analysis/*`는 VIRAL에 없으므로 그대로.
3. `/golden-channels`(공략 채널): 두 화면이 같은 엔진을 쓰므로 **VIRAL 화면 하나로**. CONSULTANT 화면에만 있는 입력·표시 항목이 있으면 VIRAL 화면에 옵션으로 추가(두 page.tsx 비교: VIRAL 325줄 / CONSULTANT 240줄, API route 28줄 차이).
4. 좌측 메뉴: 「🔥 트렌드 발굴」(떡상 쇼츠·급상승·원본 찾기) / 「📊 채널·키워드 진단」(채널 분석·키워드 분석·공략 채널) / 즐겨찾기 / 설정·매뉴얼. 휴대폰 ☰·계정 위치 규칙 유지.
5. 검수: `npx tsc --noEmit`, `npm run build`, `node scripts/check-shared-modules.mjs`, 기존 `tests/` 실행 → 배포 → 크롬(관리자)에서 채널 분석·키워드 분석·공략 채널 화면. **유튜브 API 호출은 회원 할당량을 쓰므로 시험은 최소 1~2회**(비용 규칙).
### 2단계 — 대시보드·매뉴얼 하나로 (VIRAL v1.21)
- 대시보드에 진단 바로가기 추가, 매뉴얼 `/guide`에 채널·키워드 분석 단계와 「숫자 읽는 법」(CONSULTANT 매뉴얼) 합치기, 앱 안 이름 「YOUTUBE 채널·트렌드 분석」(후보), 공지 띠(`program-notice-banner` 사본) 함께.
### 3단계 — 옛 CONSULTANT 정리 (주인님 확인 후)
- `youtube-channel-consultant/next.config.ts`에 화면 redirect(`/`·`/dashboard`→VIRAL `/dashboard`, `/channel-analysis`·`/keyword-analysis`·`/golden-channels`·`/settings`·`/guide`→같은 경로, `/login`) + `/api/*` rewrite(같은 경로로) — 참고: `instagram-dm-reply/next.config.mjs`, `cardnews-studio/next.config.ts`.
- DB: 병합 전 두 `programs` 줄 백업(`docs/analysis-youtube-consolidation-20261020/backup-programs-before-merge-c.json`) → CONSULTANT `is_active=false`·한 줄 소개 앞 `[병합됨 → …]`, VIRAL 이름·소개·특징·순서·추천 대상 다시 쓰기(`docs/PROGRAM_DESCRIPTION_STANDARD.md`). 메인 `next.config.mjs`에 `/programs/youtube-channel-consultant` → `/programs/youtube-viral-studio`.
- 공용 기준 코드 기준 위치 VIRAL로 이동(`scripts/check-shared-modules.mjs`), 역량 지도·공용 기능 지도·DESIGN.md 갱신. Vercel 프로젝트·도메인 삭제 안 함.

## 4. 비용
- 유료 API 없음(AI 리포트 시험은 생략 또는 최저가 모델 1회). 유튜브 API는 회원 무료 할당량 — 시험 최소화. Vercel 빌드 단계마다 1회(옛 앱 3단계 1회 추가).

## 5. 위험·주의
- `lib/youtube/*` 이름 충돌로 VIRAL 기능이 깨질 수 있음 → 덮어쓰지 말고 폴더를 나눈다. 단계마다 VIRAL 기존 화면(떡상 쇼츠·황금 채널·급상승·원본 찾기·즐겨찾기)도 열어 회귀 확인.
- 공용 기준 코드 사본은 직접 고치지 않는다(기준 수정 후 `--sync`). 기준 위치 이동은 3단계에서 한 번에.
- 배포 직전 `docs/SHARED_MODULES.md` 「미배포 사본」 확인(공지 띠 등 함께 넣기).
- 공용 문서(HANDOFF·ACTIVE_WORK·PROGRAM_IDEA_BACKLOG)는 다른 CLI 미커밋 내용이 있으면 내 줄만 올린다.
- 상세 교훈: `../../docs/ERROR_LESSONS.md` 2026-10-20 항목(앱 병합 비밀값·공용 부품 형식 오류·배포 누락 등).

## 6. 결과물(완료 시)
- VIRAL `AGENTS.md`·`README.md` 7대 항목 갱신, `docs/IMPROVEMENT_HANDOFF_<날짜>.md`, `docs/DESIGN_HANDOFF.md`, CONSULTANT `AGENTS.md`에 「병합됨」 기록, 루트 `docs/HANDOFF.md` 맨 위, `docs/PROGRAM_CAPABILITY_MAP.md`.

## 7. 다음 첫 단계 (이어받는 CLI)
1. `docs/ACTIVE_WORK.md`에 두 폴더 줄이 있는지 확인(있으면 그 CLI와 조율).
2. 주인님께 이 플랜을 보여 드리고 「진행」 확인을 받는다(2026-10-20 기준 아직 플랜 승인 전 — 아래 표 참고).
3. 1단계 1번부터: CONSULTANT 전용 파일 복사 → `lib/youtube` 충돌 3개를 `lib/consultant/youtube/`로 → tsc.

## 8. 진행 상황
| 날짜 | CLI | 한 일 | 상태 |
|---|---|---|---|
| 2026-10-20 | Claude Code(윈도우) | 유튜브 10개 분석 보고서(`REPORT.md`·아티팩트), 병합 C 조사(화면·API·파일 비교·키·DB 표·권한 겹침·공용 코드 위치), 이 플랜 작성 | ✅ 분석·플랜 완료 / ⏳ **주인님 플랜 확인 대기, 코드 변경 없음** |
| 2026-10-20 | Claude Code(윈도우) | 주인님 「진행해줘」 → **1단계 v1.20**: 파일 21개 이식(`lib/consultant/youtube/` 분리), 메뉴 두 묶음, 공략 채널 하나로(VIRAL 화면 유지), 공지 띠, tsc·build·테스트 11개 통과 | ✅ 1단계 배포(아래 커밋) / 다음: 크롬 화면 확인 → 2단계(대시보드·매뉴얼 통합·앱 이름) |
| 2026-10-20 | Claude Code(윈도우) | 1단계 배포 `youtube-viral-studio-qx64y92i3` Ready, 커밋 `40404619`, DB v1.20. 크롬(관리자): 메뉴 두 묶음·v1.20 표시, `/channel-analysis`에서 `@YouTube` 실제 분석 성공(구독자·조회수·인기 점수 차트·AI 분석 버튼·영상 목록·JSON/CSV, 유튜브 3유닛), `/golden-channels` 기존 화면 정상. AI 분석·키워드 분석 실제 호출은 안 함 | ✅ 1단계 완료 / **다음 첫 단계: 2단계** — 대시보드에 진단 바로가기, `/guide`에 채널·키워드 분석(CONSULTANT `src/app/(dashboard)/guide/page.tsx`의 숫자 읽는 법) 합치기, 앱 이름 `src/lib/version.ts` `APP_NAME` 「YOUTUBE 채널·트렌드 분석」(주인님 확정 전이면 후보로 질문) |
| 2026-10-20 | Claude Code(윈도우) | **2단계 v1.21**: 이름 「YOUTUBE 트렌드 분석」(앱 안), 대시보드 진단 카드 2개, 매뉴얼에 진단 사용법·팁·FAQ 4개 합침, 즐겨찾기 주의 문구 정정. tsc·build 통과 | ✅ 2단계 배포 / **다음 첫 단계: 3단계(주인님 확인 후)** — 옛 CONSULTANT 주소 이동·API 전달, DB 백업 후 CONSULTANT 노출 중지·VIRAL 이름(`YOUTUBE 트렌드 분석`)·소개 다시 쓰기, 메인 상세 redirect, 공용 기준 코드 기준 위치 이동, 역량 지도 |
