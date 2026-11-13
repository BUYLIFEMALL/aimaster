# U10 연계 3 — 「콘텐츠 캘린더」·「업무 현황판」 + 발행·분석·수집 프로그램 결과 받기 (상세 플랜)

> **현재 상태(2026-11-13 점검)**: ✅ 완료 — 1차(v1.22, 인스타·쓰레드) · 2차 6개 프로그램(2026-11-11) · 유튜브 shots·원스톱(2026-11-12)·플레이리스트(v1.40, 2026-11-13) · 「📊 업무 현황판」 v1.32~v1.33. 남은 확인: 원스톱·플레이리스트 버튼을 실제 업로드 기록으로 눌러 보기(기록이 생긴 뒤).

- 작성: 2026-11-06 · [역할: workspace] Claude Code(윈도우) `claude-win-20261025-workspace`
- 상위: 로드맵 [PLAN_20261024_EXPANSION_ROADMAP.md](PLAN_20261024_EXPANSION_ROADMAP.md) §3-2·§5 U10, 공용 표 안내 [`docs/WORK_INBOX.md`](../../docs/WORK_INBOX.md), 아이디어 표 IDEA-AWW-01, 앞 단위 [PLAN_20261106_U9_LINKS.md](PLAN_20261106_U9_LINKS.md)
- 대상: ① AIMaster 운영(공용 DB `esgxyikcnnvmlhygjkth`). Lab 아님.
- 상태: **2차 구현 완료·미배포(2026-11-07, 주인님 「진행해」)**: ai-auto-blog `c44499682` · naver-blog-agent `18cfb01d5` · competitor-analysis `82c25c802`·`34ed724a1`(분석 + 키워드 확장 — 옛 longtail은 병합돼 여기로) · web-crawler `21ba04b80` · blog-keyword `acb6e98d7` · 워크스페이스 이름표 `3c175bcce`. 배포 승인 뒤 순차 배포·운영 확인. (이전: 1차 (가) 배포·운영 확인 완료(2026-11-06): 워크스페이스 v1.22 · INSTA v1.72 · Threads v2.23 — ego 시험 계정으로 INSTA 예약 글·Threads 발행 글이 콘텐츠 캘린더 행으로 정상. 2차는 주인님 「2차 진행」 대기.** (이전 상태: 구현 중 — 2026-11-06 주인님 결정 1번(다른 역할 폴더에 버튼·라우트만) 「진행해」, 나머지는 추천안으로 진행(1차 (가)·`document`+구조 데이터·유튜브/ghost-scraper 제외·현황판 U11). 워크스페이스 쪽 `cc4f4eabe`+`b98de2641`, 인스타 `b98de2641`, Threads `7caa31152`(모두 미배포) — 1차 (가) 구현 완료, 빌드 3회 승인 대기(워크스페이스 v1.22 → INSTA v1.72 → Threads v2.23).**

## 1. 목표
회원이 여러 자동화 프로그램에서 만든 **발행 기록·분석 결과·수집 결과를 워크스페이스 한곳에 모아 본다.** 발행 기록은 「📅 콘텐츠 캘린더」 표(캘린더·보드 보기)에 쌓이고, 분석·수집 결과는 지금처럼 페이지·표 행으로 받는다. 프로그램끼리 서로의 API를 부르지 않고 공용 표 `public.work_inbox` 하나만 쓰는 U7~U9 방식 그대로다. **DB 변경 없음.**

| 묶음 | 프로그램 | 보내는 것 | 워크스페이스에서 받는 모양 |
|---|---|---|---|
| 발행 | `naver-blog-agent`·`insta_auto_poster`·`threads-content-ops`·`ai-auto-blog` | 글 한 건의 발행 기록(제목·채널·상태·예약일·발행일·발행 주소·원본 링크) | 「📅 콘텐츠 캘린더에 넣기」 → 회원의 콘텐츠 캘린더 표에 행 하나 |
| 분석 | `competitor-analysis`·`longtail-keyword-expander`·`blog-keyword` | 분석 리포트(요약 글·키워드 목록) | 「📄 페이지로 만들기」(기존) |
| 수집 | `web-crawler`(web-crawler-saas) | 완료된 수집 작업(주소·행 수·결과 파일 링크) | 「📊 표에 행으로 넣기」(기존, 링크 종류) |

자동화 지침 수치: 처음 설정 **0단계**(버튼 한 번, 키·동의 없음) · 매일 조작 **1~2번**(보내기 → 캘린더에 넣기) · 동의 **0번**.

## 2. 지금 상태 (2026-11-06 코드 조사 — 탐색 에이전트, 파일 안 위치는 「미확인」)
| 프로그램 | 버전 | 결과 저장 표 · 캘린더에 쓸 열 | 결과 화면(버튼 자리) | 접근 확인 | 담당 역할 · 작업 중 |
|---|---|---|---|---|---|
| `naver-blog-agent` | v2.27 | `nba_posts`: `title`·`status`(draft/queued/publishing/published/failed)·`scheduled_at`·`published_at`·`post_url` — **가장 알맞음** | `src/app/(dashboard)/queue/page.tsx` | `checkProgramAccessApi` 있음 | blog — **`claude-win-20261101-blog` 작업 중**(ACTIVE_WORK) |
| `insta_auto_poster` | v1.71 | `insta_posts`: `caption`·`status`·`scheduled_at`·`published_at`·`ig_permalink`(제목 없음 → 캡션 앞 60자) | `src/app/(dashboard)/posts/[id]/page.tsx` | 있음 | ecommerce-image·analysis-planning 문서에 언급, 작업 중 아님 |
| `threads-content-ops` | v2.22 | `tco_posts`: `body`·`status`·`scheduled_at`·`published_at`·`permalink`(제목 없음 → 본문 앞 60자) | `app/threads-content-ops/OperationsDashboard.tsx` | **`checkProgramAccessApi` 없음**(`checkProgramAccess`만) → Api 판 추가 필요 | design 문서에 언급, 작업 중 아님 |
| `ai-auto-blog`(교육용 레퍼런스) | v1.86 | `blog_posts`: `title`·`published_at`(날짜)·`naver_input_status`·`naver_input_completed_at`(예약·발행 주소 없음) | `app/posts/[id]/page.tsx` | `utils/access.ts`에 있음 | blog, 작업 중 아님 |
| `competitor-analysis` | v1.12 | `competitor_analyses`: `summary_text`·`html_report`·`created_at`(제목은 키워드로 조합) | `keywords/[id]/jobs/[jobId]/page.tsx` | 있음 | blog·analysis-planning 문서에 언급 |
| `longtail-keyword-expander` | v1.11 | `longtail_runs`(`summary_text`·`executed_at`) + `longtail_expansions`(`keyword`) | `seeds/[id]/runs/[runId]/page.tsx` | 있음 | 지정 없음 |
| `blog-keyword` | v1.11 | `blog_keyword_reports`: `feature`·`keyword`·`result`(JSON → 글로 바꿔야 함) | `src/app/(workspace)/history/page.tsx` | 있음 | blog |
| `web-crawler` | v1.10 | `web_crawler_jobs`: `url`·`status`·`result_url`·`row_count`·`completed_at` | `webapp/src/app/(dashboard)/jobs/page.tsx`(완료 작업만) | 있음 | 지정 없음 |
| 유튜브 | — | `youtube-viral-studio`는 분석 도구(즐겨찾기만 저장). 실제 올리기는 `shorts-onestop-studio`·`playlist-channel-studio`인데 **발행 시각·영상 주소 열이 확인되지 않음** | — | — | video 역할 |
| `ghost-scraper`(website-scraper) | v1.14 | 결과 저장 없음, **2026-10-21 web-crawler로 병합돼 사용 꺼짐** | — | — | — |

- 조사한 프로그램 모두 `lib/workInbox.ts` 사본·`work-inbox` 라우트가 없다(새로 만든다).
- 워크스페이스(v1.21 + 미배포 3건): 받은 업무 「페이지로 만들기 / 표에 행으로 넣기」 있음, 템플릿은 `src/litpage/server/content/catalog.ts`에 표 구조로 정의(갤러리 버전 `seed.ts`를 올리면 운영에 다시 심김), 차트 보기 있음.

## 3. 구현 내용
### 3-1. 워크스페이스
1. **템플릿 「📅 콘텐츠 캘린더」**(`catalog.ts`, 분류 work): 열 = 제목(title)·채널(select: 네이버 블로그·블로그·Threads·인스타그램·유튜브)·상태(status: 초안·예약·발행됨·실패)·예약일(date)·발행일(date)·발행 주소(url)·보낸 프로그램(select)·원본 링크(url)·메모(text). 보기 = 캘린더(발행일)·보드(상태별)·표(전체). 예시 행 3개(한국어).
2. **받은 업무 「📅 콘텐츠 캘린더에 넣기」**: 받은 항목의 `data`에 `채널`과 `발행일`(또는 `예약일`)이 있으면 이 버튼을 보인다. 회원의 캘린더 표가 없으면 템플릿으로 처음 한 번 만들고(`user_settings`에 표 id 저장, 「📨 받은 업무 표」와 같은 방식), 있으면 CSV 합치기(`mergeCsv`)로 행을 넣는다. 종류 값은 기존 `document`를 그대로 쓰고 구조 데이터로 구분하므로 **공용 기준 코드 사본 5개를 다시 맞출 필요가 없다**(결정 §8-3).
3. **템플릿 「📊 업무 현황판」**: 콘텐츠 캘린더·받은 업무 표·할 일을 한 페이지에서 보는 템플릿. 기존 표를 다른 페이지에서 보는 「연결 보기」가 이 엔진에 있는지 구현 전에 확인한다 — 없으면 이번에는 캘린더 표 안의 차트 보기(채널별 발행 수·상태별)로 대신하고 현황판은 U11로 미룬다.
4. 받은 업무 이름표(`InboxBoard.tsx` `SOURCE`)에 새 slug 8개 추가, 매뉴얼(`/guide`) 「받은 업무」 단락에 캘린더 한 줄.

### 3-2. 보내는 프로그램 공통 (프로그램마다 한 단위)
- 기준 코드 `ai-work-workspace/src/lib/workInbox.ts`를 `lib/workInbox.ts` 사본으로 복사(공용 기준 코드 규칙, `docs/SHARED_MODULES.md` 사본 목록 갱신).
- 서버 라우트 `/api/work-inbox`(POST `{ id }`): `checkProgramAccessApi()`로 로그인 회원 확인 → **회원 본인 `user_id` 조건으로 그 프로그램 DB에서 글을 다시 읽어** 내용을 만든다(브라우저가 보낸 본문을 그대로 넣지 않음). `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`.
- 화면: 결과·상세 화면에 「📨 업무 워크스페이스로 보내기」 버튼, 성공하면 「받은 업무 열기」 링크(U9와 같은 문구).
- 발행 4개는 `kind: "document"` + `data: { 채널, 상태, 예약일, 발행일, "발행 주소" }` + `bodyMd`(본문 요약 또는 전문) + `sourceUrl`. 분석 3개는 `kind: "document"`(리포트 마크다운). 수집은 `kind: "link"` + `data: { 주소, "행 수", "완료일" }`.
- `threads-content-ops`는 `lib/access/checkProgramAccessApi` 판을 먼저 추가한다(기존 `checkProgramAccess`를 감싸는 작은 함수).
- 발행 프로그램의 「예약 발행」 흐름(회원 cron-job.org)은 건드리지 않는다. 보내기는 회원이 버튼을 누를 때만 한다(자동 전송 없음 — 자동 전송은 U11 자동화에서 검토).

### 3-3. 하지 않는 것
- 유튜브 발행 기록: 저장 열이 확인되지 않아 이번 범위에서 뺀다(video 역할과 확인 뒤 다음 단위).
- `ghost-scraper`: 꺼진 프로그램이라 뺀다. `web-crawler`의 한 페이지 분석(`inspect`)도 저장이 없어 뺀다(작업 목록만).
- 워크스페이스에서 발행 프로그램으로 **원고를 보내는 방향**(역방향)은 블로그 핵심 지침(웹에서 완성 → 확장 발행)과 겹치므로 blog 역할과 상의 뒤 별도 단위.

## 4. 진행 순서 (제안)
1. **워크스페이스**: 캘린더 템플릿 + 「캘린더에 넣기」 + 이름표·매뉴얼 → 시험(CSV·행 만들기 순수 함수)·tsc → 커밋(미배포).
2. **발행 1차 2개**: `insta_auto_poster` → `threads-content-ops`(Api 판 추가 포함). 두 곳 모두 지금 작업 중인 세션이 없다.
3. **발행 2차 2개**: `ai-auto-blog` → `naver-blog-agent`(blog 세션 작업이 끝난 뒤, 또는 그 세션에 요청).
4. **분석·수집 4개**: `competitor-analysis` → `longtail-keyword-expander` → `web-crawler` → `blog-keyword`(JSON → 글 변환이 있어 마지막).
5. 단위마다 구현 → 시험·tsc → 커밋 → 미배포 대기. **워크스페이스 캘린더가 먼저 배포된 뒤** 보내는 쪽을 배포한다(받을 곳이 없는데 버튼만 열리지 않게).

## 5. 검수
- 자동: 워크스페이스 `tests/integration/workInbox.test.ts`에 캘린더 행 CSV·버튼 조건 시험 추가, 보내는 프로그램은 내용 만들기 순수 함수 시험 1개씩.
- 실제(ego, 시험 계정 `buylifemall@naver.com`): 프로그램마다 글 하나를 보내고 → 받은 업무 → 「캘린더에 넣기」 → 캘린더 보기에서 날짜 칸에 보이는지 확인. 분석·수집은 페이지·표 행 확인. AI 호출 없이 저장된 기록만 보내므로 **시험 비용 없음**.

## 6. 배포 (작은 수정 모아 배포 규칙)
| 프로그램 | 이번 내용 | 함께 나갈 미배포 | 버전 | 빌드 |
|---|---|---|---|---|
| `ai-work-workspace` | 캘린더 템플릿·캘린더에 넣기·이름표 | `376c55c7a`·`a80274b4c`·받아쓰기 엔진 선택(다른 세션) | v1.22 | 1회 |
| `insta_auto_poster` | 보내기 | 그 폴더 미배포 확인 | v1.72 | 1회 |
| `threads-content-ops` | 보내기 + Api 판 | 〃 | v2.23 | 1회 |
| `ai-auto-blog` | 보내기 + 확장 ZIP·DB 버전 맞춤(확장 있음, 원칙 10) | 〃 | v1.87 | 1회 |
| `naver-blog-agent` | 보내기 + 확장 ZIP·DB 버전 맞춤 | blog 세션 몫과 합침 | v2.28 | 1회 |
| `competitor-analysis` | 보내기 + 확장 ZIP·DB 버전 맞춤 | 〃 | v1.13 | 1회 |
| `longtail-keyword-expander` | 보내기 | 〃 | v1.12 | 1회 |
| `web-crawler` | 보내기 | 〃 | v1.11 | 1회 |
| `blog-keyword` | 보내기 | 〃 | v1.12 | 1회 |

합계 **빌드 최대 9회**(1차 범위만이면 3회: 워크스페이스·인스타·Threads). 한 번에 하나씩 순차 배포, 각 프로그램 `programs.version` SQL 함께.

## 7. 비용
| 항목 | 내용 | 비용 |
|---|---|---|
| 개발·시험 | 로컬 시험·tsc, ego 실제 확인(저장된 기록만 보냄, AI 호출 없음) | 없음 |
| 운영자 | Vercel 빌드(위 표) | 빌드 1회당 수백 원 수준(팀 기본 빌드) |
| 회원 | 없음(본인 키 호출 없음) | 없음 |

## 8. 결정 항목 (주인님)
1. **다른 역할 폴더 수정 허락**: `insta_auto_poster`·`threads-content-ops`·`ai-auto-blog`·`competitor-analysis`·`blog-keyword`(blog·design·ecommerce-image 역할 문서에 언급)와 `naver-blog-agent`(blog 세션 작업 중 — 끝난 뒤 제가 하거나 그 세션에 요청). U9 때처럼 이 세션이 「보내기 버튼·라우트」만 넣는 범위로 허락해 주실지.
2. **1차 범위**: (가) 워크스페이스 + 발행 2개(인스타·Threads)만 먼저(빌드 3회) → 운영 확인 뒤 나머지 / (나) 발행 4개 + 워크스페이스(빌드 5회) / (다) 9개 전부(빌드 9회). **추천: (가)** — 캘린더가 실제로 쓸모 있는지 먼저 보고 넓히는 쪽이 비용이 적습니다.
3. **종류 값**: 공용 표 종류(`kind`)에 `post`를 새로 넣지 않고 `document` + 구조 데이터(채널·발행일)로 캘린더 대상을 구분하는 방식(사본 5개 재동기화·재배포 없음). 다른 뜻이 있으시면 `post` 추가로 바꿉니다.
4. **유튜브 제외**(발행 기록 저장 열 미확인)와 **`ghost-scraper` 제외**(꺼진 프로그램) 확인.
5. 「업무 현황판」은 연결 보기가 없으면 U11로 미루고 이번에는 캘린더 차트 보기로 대신하는 것에 동의하실지.

결정이 오면 §4 순서대로 시작합니다(결정 없이 시작하지 않음).
