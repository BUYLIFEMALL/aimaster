# INSTA Cardnews 자동화 (`cardnews-studio`) AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과 본인 API 키(Gemini·OpenAI·Claude)를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다. 상세: 루트 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`.
> **생성 데이터도 회원 본인 소유로 격리하며 다른 회원과 공유·복사·재사용하지 않는다.**

---

## 1. 프로그램의 사용목적 및 대상
- **프로그램명**: INSTA Cardnews 자동화 (영문 `INSTA Cardnews Auto` / `CARDNEWS STUDIO`)
- **서비스 URL**: https://cardnews-studio.buylife.xyz
- **사용 목적**: 복잡한 그래픽 툴(포토샵, 피그마, 미리캔버스) 없이도, 주제 하나만 입력하면 AI가 기획·카피라이팅·고화질 배경 생성·글자 얹기·인스타그램 피드 캡션 및 25개 해시태그 패키징까지 한 번에 자동 완성하는 원스톱 인스타 카드뉴스 제작 솔루션.
- **주요 대상**:
  - 인스타그램 카드뉴스 계정을 운영하는 1인 크리에이터 및 마케터
  - 지식 정보형 콘텐츠를 정기적으로 발행해야 하는 인플루언서
  - 블로그/유튜브 콘텐츠를 인스타 캐러셀로 재가공(One Source Multi Use)하려는 브랜드 운영자

---

## 2. 개발 구현에 사용된 도구 / 개발기법 / 플러그인 / 스킬
- **프레임워크 & 런타임**: Next.js 16.2.11 (App Router, Turbopack), React 19, TypeScript
- **스타일링**: Tailwind CSS v4, Lucide React 아이콘
- **디자인 템플릿**: **크리에이티브 아틀리에 스타일 (인스타 카드뉴스 변형)** 다크 테마 (`bg-[#0d0f17]`, 서피스 `#161922`, 보더 `#262c3d`)
- **반응형 아키텍처**: 데스크톱(1440px) 260px 좌측 사이드바 + 모바일(375px) 상단 56px 고정 헤더 & 슬라이드 오버레이 드로어
- **백엔드 & 데이터베이스**: Supabase SSR (공유 DB `esgxyikcnnvmlhygjkth`), PostgreSQL RLS (회원별 데이터 엄격 격리)
- **스토리지**: Supabase Storage (`cardnews-images` 공개 버킷, 유저별 경로 격리 `<user_id>/<uuid>.<ext>`)
- **캔버스 렌더링 엔진**: 순수 HTML5 Canvas API를 이용한 브라우저 클라이언트 렌더링 (`src/lib/cardnews/render.ts`, `renderClient.ts`)
- **AI 모델 연동**: Google Gemini (`gemini-nano-banana-2.1`, `gemini-3-pro-image`, `gemini-3.7-flash`), OpenAI GPT-4o, Anthropic Claude 3.7 Sonnet

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처, 장점 및 단점
### 핵심 기능 (5단계 파이프라인)
1. **1단계 기획 (`/plan`)**: 분야(자기계발/경제/맛집 등), 핵심 주제(AI 주제 5종 추천), 어조(5종), 페이지 수(4/6/8/10장), 해상도 비율(4:5 세로형 / 1:1 정방형) 설정.
2. **2단계 문구 (`/copy`)**: 장별 헤드라인 및 서브 카피를 AI가 구조화된 JSON으로 생성, 맞춤형 카드 선 아이콘(24종) 자동 매핑.
3. **3단계 디자인 (`/design`)**: 4대 디자인 무드(정보형/감성형/볼드형/미니멀형), 화풍 4종, 비주얼 구성 4종, 폰트 및 텍스트 배치 실시간 캔버스 프리뷰.
4. **4단계 배경 생성 (`/background`)**: Gemini 나노바나나 2.1 고화질 이미지 모델로 장별 맞춤형 배경 생성 (장당 최대 6개 이력 보관).
5. **5단계 내보내기 (`/export`)**: 고해상도 PNG 개별/ZIP 일괄 다운로드, AI 인스타 캡션(후킹 카피, 본문 요약, CTA, 해시태그 20~25개) 원클릭 복사.

### 장점 및 단점
- **장점**:
  - 외부 이미지 생성 툴 없이도 글자 없는 배경 생성 ➔ 폰트 레이아웃 합성이 원스톱으로 이루어져 글자 깨짐이나 오염 없음.
  - 4:5 세로형(1080×1350) 완벽 지원으로 모바일 인스타 피드 스크롤 점유율 극대화.
  - `ProjectProvider`의 1.5초 주기 자동 저장으로 새로고침이나 브라우저 종료 시에도 안전 복구.
- **단점**:
  - 초기 브라우저 로딩 시 상업용 웹폰트 리소스 로딩 지연이 수 초 발생할 수 있음.
  - ~~현재 인스타그램 공식 Graph API 직접 발행은 미지원~~ → v1.18(즉시)·v1.19(예약)부터 지원(2026-10-20 문서 정정). 인스타 연결은 INSTA 포스팅 자동화에서 한 번 해야 함.

---

## 4. 현재 버전 및 버전별 변경 히스토리
- **현재 버전**: `v1.24` (2026-10-20)
- **v1.24 (2026-10-20, Claude Code 윈도우) — ⏰ 인스타 예약 게시 실행 방식 회원 선택(AIMaster 기본 Vercel / 본인 cron-job.org) + 24시간 규칙** — 주인님 지시(예약 방식 1순위 ③). 지침 루트 `docs/SCHEDULER_POLICY.md`, 플랜 `docs/PLAN_20261020_MEMBER_SCHEDULER.md`, 기준 `threads/` v1.19.
  - 코드: `src/lib/instagram/cronJobOrg.ts`·`memberScheduler.ts`(표 `cns_member_scheduler`, 토큰 `cns_…` DB엔 해시, 끄기 스위치 `CNS_PLATFORM_SCHEDULER=off`, 운영 전용이라 기본 Vercel), `posts.ts` `dispatchDuePosts(limit, { userId, excludeUserIds, failWithMessage })` + 24시간 규칙(`schedule.ts` `isTooLate`) — 기존 조건부 잠금·10분 뒤 1회 재시도·재시도 전 중복 확인은 그대로. 새 주소 `/api/cardnews/instagram/dispatch-member`(회원 토큰, 즉시 응답 + `after`, 남은 예약 0건이면 작업 끔), `/api/cardnews/scheduler`(화면용 상태·방식·일시정지·재개 — 이 프로그램은 서버 액션 대신 API 구조). 운영자 주소는 vercel·비일시정지 회원만. 예약 저장 API: 저장 전 방식·키 확인, 저장 뒤 작업 켜기(실패 시 예약 취소·이미지 정리). 키 API: 허용 목록 `cronjob_org_api_key`(설정용 타입 `SettingsKeyProvider` — AI 키 타입은 그대로), 키 변경·삭제 시 작업 정리.
  - 화면(다크): 설정 「⏰ 예약 발행」(`SchedulerModePicker` + cron-job.org 키 칸 + 가입 3단계), 인스타 게시 패널 예약 모드에 상태 줄·일시정지/재개(`SchedulePublishingControl`), 예약 완료 문구에 1분/5분, `/guide` FAQ.
  - DB(운영 `esgxyikcnnvmlhygjkth`): `supabase/migrations/20261020100000_cns_member_scheduler.sql` — 2026-10-20 주인님 승인 후 크롬 SQL Editor(AIMaster·PRODUCTION 확인)로 적용, 결과 `cns_member_scheduler`·`v1.24`.
  - 검수: tsc 0, 단위 52/52(24시간 규칙 추가), build(새 주소 2개), 배포 `cardnews-studio-ictkczgcr`(Ready), 실행 주소 무인증·가짜 토큰 401, `/api/cardnews/scheduler` 비로그인 401, `/login` 200. 크롬(관리자 본인 키, **실제 게시 없음**): 설정 v1.24·공용 키 「연동 완료」 → 「내 cron-job.org」 선택 → 관리자에게 카드뉴스가 없어(AI 생성 비용 피함) 작은 시험 이미지를 회원 폴더에 올리고 로그인된 크롬에서 실제 예약 API로 10-21 21:00 예약 → 작업 8678676 자동 생성·켜짐 → 상태 API 실행 중·대기 1건 → 일시정지·재개 → 예약 취소(이미지도 삭제) → 약 61초 뒤 자동 꺼짐 → Vercel 복귀. 게시 패널 안 상태 줄 화면은 카드뉴스가 있어야 보여 실화면 확인은 회원 사용 때.
- **v1.23 (2026-10-19, Claude Code 윈도우) — 🔎 지금 게시 실패 때 이미 올라갔는지 확인 + 기록에 「이미 게시 확인」 표시** — 주인님 지시 「추가개선 제안 1·2 진행」:
  - 즉시 게시: `publish/route.ts`가 일시 오류(`isTransientPublishError`)로 실패하면 회원 본인 최근 게시물(`fetchRecentMedia`, `posts.ts`에서 공개)을 보고, **버튼을 누른 시각 이후** 같은 캡션이 있으면(`findSameRecentPost(..., startedAt + FIRST_ATTEMPT_MARGIN_MS)` → 기준 = 누른 시각) 성공으로 처리·「게시됨」 기록·응답 `alreadyPosted: true`. 화면: 「응답이 늦었지만 @계정에 이미 올라간 것을 확인했습니다. 다시 게시하지 않아도 됩니다.」 → 사용자가 다시 눌러 중복 게시하는 일을 막음.
  - 기록 표시: 「이미 올라간 것 확인」으로 처리된 게시됨 기록(예약 재시도·즉시 게시 모두)에 `ALREADY_POSTED_NOTE`를 `error_message`에 남기고(게시됨 기록에서는 원래 빈 칸 — DB 칸 추가 없음) 목록에 회색 「ℹ️ 응답이 늦었지만 …」 줄로 표시.
  - 검수: 단위 51/51(누른 시각 이전 글 제외), tsc, 빌드, Vercel READY(`cardnews-studio-pbc1blq1e`, 1회), DB v1.23. 크롬(관리자): 임시 프로젝트 + 임시 게시됨 기록으로 회색 안내 줄·상단 「이미 게시했습니다」 경고 확인 → 임시 데이터 삭제(기록 0·프로젝트 0). 실제 게시는 하지 않음(주인님 결정).
- **v1.22 (2026-10-19, Claude Code 윈도우) — 🎯 중복 확인 기준을 1차 시도 이후로 좁힘** — v1.21 남은 문제 「같은 캡션의 다른 글을 1시간 안에 올리면 오판」 보완: `findSameRecentPost(media, caption, now, firstFailedAt)` — 기준 시각 = 1차 실패 기록 시각(`updated_at`, 예약 실행이 잠그기 전 값) − 10분(`FIRST_ATTEMPT_MARGIN_MS`), 단 1시간보다 넓히지 않음. 오판 범위 약 1시간 → 약 20분. 검수: 단위 50/50, tsc, 빌드, Vercel READY(`cardnews-studio-kfrhrhfgb`, 1회), DB v1.22(Supabase MCP 재연결 확인), 크롬 버전 표시 v1.22·예약 실행 주소 401. 실제 게시 시험은 주인님 결정으로 하지 않음(2026-10-19 「지금은 하지 않음」 — 첫 실제 예약 게시 때 결과 확인).
- **v1.21 (2026-10-19, Claude Code 윈도우) — 🛡️ 다시 시도 전 중복 게시 확인 + 디자인 테마 안내 문구** — 주인님 지시 「추가개선 제안 1·2 진행」:
  - 중복 확인: 예약 실행이 다시 시도하는 차례(`error_message`에 1차 실패 기록이 있을 때)면 먼저 회원 본인 계정 최근 게시물 10개(`/{ig-user-id}/media?fields=caption,timestamp,permalink`)를 보고, 최근 1시간(`DUPLICATE_WINDOW_MS`) 안에 같은 캡션(앞뒤 공백·줄바꿈 차이 무시)이 있으면 다시 올리지 않고 그 게시물로 「게시됨」 기록(`schedule.ts` `findSameRecentPost`, `posts.ts` `fetchRecentMedia`). 조회 실패는 평소대로 다시 시도. 캡션이 같은 다른 글을 1시간 안에 따로 올린 드문 경우 이미 게시된 것으로 볼 수 있음(그 경우에도 글은 이미 올라가 있음).
  - 디자인 단계 안내: 「테마 컬러는 목록·비교·큰 숫자 카드의 강조색에 바로 반영 … 배경을 만들 때도 반영」.
  - 검수: 단위 49/49(중복 판단·`+0000` 시각 형식), tsc, 빌드, Vercel READY(`cardnews-studio-6266uyd97`, 1회), DB v1.21(Supabase 연결이 끊겨 로컬 서버 키로 갱신). 크롬(관리자): 임시 프로젝트로 새 안내 문구와 따뜻한 테마 베이지 골드 확인 → 임시 프로젝트 삭제(0개). v1.20 검수용 임시 기록 2건도 삭제 완료(기록 0건). 실제 게시·재시도·중복 확인 실행은 미확인(외부 공개라 주인님 허락 필요).
- **v1.20 (2026-10-19, Claude Code 윈도우) — 🎨 데이터형 카드 강조색 테마 연동 + 🔁 예약 게시 일시 오류 1회 재시도 + 취소 기록 문구** — v1.19 남은 작업 + 주인님 제안 「잠깐 늦어 실패하면 한 번은 다시 시도」:
  - 강조색: `presets.ts` `DATA_ACCENTS`/`dataAccent()`(자동=기존 주황 `#FF6B4A`, 따뜻한=베이지 골드, 시원한=하늘색+남보라, 미니멀=밝은 회색), `render.ts` 데이터형 카드(목록·VS·큰 숫자)의 고정 주황을 테마 색으로 교체 — 미리보기·PNG·인스타 게시 모두 같은 함수라 함께 바뀜.
  - 재시도: `schedule.ts` `isTransientPublishError()`(지연·Timeout·네트워크·5xx만 true, 만료·권한·형식 오류는 false), `posts.ts` `dispatchDuePosts`가 일시 오류면 예약 상태로 되돌리고 10분 뒤(`RETRY_DELAY_MS`) 한 번 더 — **DB 칸 추가 없이** `error_message`에 「1차 실패 — …」를 남기는 것이 「이미 한 번 다시 시도함」 표시(두 번째 실패는 최종 실패). 공용 게시 코드(`instagram-publish` 사본)의 같은 실행 안 Timeout 2회 재시도는 그대로. 주의: 인스타에서 이미 올라갔는데 응답만 늦은 드문 경우 다시 시도로 중복 게시가 생길 수 있음(공용 코드의 기존 재시도와 같은 위험 수준).
  - 기록 문구: 취소 = 「○월 ○일 ○○:○○ 예약 → 취소」, 재시도 대기 = 「○월 ○일 ○○:○○ 다시 시도 예정」 + 노란 사유 줄.
  - 검수: 단위 48/48(재시도 판단·테마 색 2개 추가), tsc, 빌드, Vercel READY(`cardnews-studio-2s97nysyu`, 1회 배포), DB v1.20. 메인 크롬(관리자): 임시 프로젝트(목록·VS·큰 숫자 3장) — 시원한 테마에서 밑줄·번호·84점·VS 오른쪽이 하늘색, 디자인 단계에서 Auto로 바꾸자 미리보기·내보내기 모두 주황으로 복귀. 임시 기록 2건(취소·재시도 대기)으로 문구 확인 → 앱의 예약 취소로 둘 다 취소 처리, 임시 프로젝트 삭제. 임시 기록 2건(`37da22f9…`·`03003a86…`)은 v1.21 작업 때 삭제 완료. 실제 게시·실제 재시도 실행은 확인하지 않음.
- **v1.19 (2026-10-19, Claude Code 윈도우) — 📅 인스타 예약 게시(자동 포스팅 2차) + 게시 기록** — 주인님 지시 「예약 게시 2차 진행」 + 제안 「게시 기록(시각·게시물 주소)으로 중복 방지」:
  - DB(운영 `esgxyikcnnvmlhygjkth`): `cns_insta_posts`(회원 본인만 읽기 RLS, 쓰기는 서버만, 30일 뒤 자동 삭제) — `supabase/migrations/0010_v1_19_insta_posts.sql`. Vercel 운영 환경변수 `CRON_SECRET` 추가(비밀값, 주인님 승인).
  - 예약: 내보내기 패널에 [지금 게시]/[예약 게시] 전환, 한국 시간 10분 뒤~60일 안, 회원당 대기 20건. 이미지는 예약 시각까지 회원 폴더에 보관 → `vercel.json` 자동 실행(5분마다) `/api/cardnews/instagram/dispatch`(Bearer CRON_SECRET, 없으면 401)가 조건부 잠금(scheduled→publishing)으로 두 번 게시를 막고, 게시 직전 이용 권한을 다시 확인한 뒤 회원 본인 연결값으로 게시, 끝나면 이미지 삭제. 30분 넘게 멈춘 글은 실패 처리.
  - 게시 기록: 즉시·예약 모두 기록(상태·시각·게시물 주소·실패 사유). 이 카드뉴스를 이미 게시했으면 「○월 ○일에 이미 게시했습니다」 경고. 예약은 목록에서 취소(이미지도 삭제).
  - 파일: `src/lib/cardnews/schedule.ts`(순수 함수), `src/lib/instagram/posts.ts`(게시·기록·예약 실행 공용), `api/cardnews/instagram/{posts,dispatch}`, `publish/route.ts`(기록 추가), `InstagramPublishPanel.tsx`, `tests/schedule.test.mjs`.
  - 검수: 단위 46/46, tsc, 빌드, Vercel READY(`cardnews-studio-5djaix1h9` — 출력이 잘려 같은 코드로 1회 더 배포됨, 빌드 1회 추가), DB v1.19, 자동 실행 등록 확인(`vercel crons ls`: `*/5 * * * *`), 비밀값 없는 호출 401·비로그인 기록 조회 401. 메인 크롬(관리자): 임시 프로젝트로 12월 8일 10:00 예약 → 기록에 「예약됨」 표시 → 예약 취소 → DB `canceled`·업로드 이미지 0장 확인 → 임시 프로젝트·기록 삭제(0건). **실제 게시는 하지 않음(주인님 결정 유지).**
  - 남은 것: 취소된 예약의 기록 문구가 「등록 시각」으로 보임 → 「예약 시각 + 취소」로 바꾸기(다음 배포 때 함께), 예약 실행 결과를 실제로 본 적 없음(첫 실제 예약 때 확인).
- **v1.18 (2026-10-19, Claude Code 윈도우) — 📤 인스타그램에 바로 올리기(자동 포스팅 1차: 즉시 게시)** — 주인님 지시 「모든 인스타 자동화 프로그램은 자동 포스팅까지」, 「한 번 연결하면 여러 프로그램에서 가져와 쓰기」:
  - 내보내기 화면 패널(`components/studio/InstagramPublishPanel.tsx`): 연결 상태(연결됨 @계정 / 연결 필요·만료 → INSTA 포스팅 자동화 설정으로 이동), 게시 문구(캡션 생성값 자동 채움, 2200자), 공개 게시 확인 체크 후 [인스타그램에 게시] — 1장=피드, 2~10장=캐러셀.
  - 흐름: 브라우저에서 카드를 JPEG로 그림(`renderClient.ts` `renderCardToJpegBlob`, 인스타 API는 JPEG만) → `POST /api/cardnews/instagram/upload`(회원 폴더 `{userId}/insta/{묶음}/NN.jpg` 서명 업로드 주소) → 공개 저장소 `cardnews-images`에 올림 → `POST /api/cardnews/instagram/publish`(경로가 본인 폴더인지 검사, 회원 본인 연결값으로 게시, 성공·실패 모두 임시 파일 삭제, 오류 메시지에서 토큰 가림) → 게시물 주소 표시. `GET /api/cardnews/instagram`은 연결 상태만(토큰 미포함).
  - **연결값은 새로 등록하지 않음**: `src/lib/instagram/memberAccount.ts`가 INSTA 포스팅 자동화에서 회원이 한 번 연결한 공용 DB `insta_accounts`(로그인한 회원 본인 행만)를 읽음 — 루트 최상위 지침 「회원 연동 정보 공용 저장·재사용 규칙」(① AIMaster 운영).
  - 게시 엔진: 공용 기준 코드 `instagram-publish`(기준 `insta_auto_poster/src/lib/instagram/publish.ts`) 사본 `src/lib/instagram/publish.ts` — 직접 고치지 말 것.
  - 검수: 단위 42/42, tsc, 빌드, Vercel READY(`cardnews-studio-exjf8a7z8`), DB v1.18. 운영 확인(메인 크롬, 관리자): 연결 상태 API 200 `connected:true, @buylife.co.kr`, 응답에 토큰 없음, 내보내기 패널 표시·확인 체크 전 버튼 비활성. **실제 게시는 외부 공개라 주인님 확인 대기.**
  - 다음: 예약 게시(2차), 인플루언서·웹툰에 같은 방식 적용(대기 목록).
- **v1.17 (2026-10-19, Claude Code 윈도우) — 🔥 떡상 리메이크 2단계: 데이터형 카드 레이아웃 3종**:
  - 카드마다 레이아웃(`CardPage.layout`): 배경형(기존·기본) · **번호 목록**(`points` 2~4, 번호 배지+반투명 상자) · **A vs B**(`points` 2칸, 가운데 VS 원) · **큰 숫자**(`number{value,label}`). 데이터형은 진한 막(최소 70%)+흰 글자+주황 강조색, 글자 크기 고정(제목 ≤72px·항목 40/30px)이라 항목이 많아도 작아지지 않음. 배치 계산은 순수 함수(`layout.ts` `layoutDataHeader`·`layoutList`·`layoutVs`·`layoutNumber`·`centeredTop` — 제목 아래 남는 공간 가운데 배치), 그리기는 `render.ts` `drawDataCard`.
  - 떡상 리메이크 문구: AI가 장마다 레이아웃과 데이터를 함께 씀(1장 배경형, 목록=list, 비교=vs, 자료에 있는 수치만 number, 마지막 장 3줄 요약 list). `parseRemakeCopy`가 데이터가 모자란 장은 배경형으로 되돌림. 주제로 시작(일반) 흐름은 그대로 배경형.
  - 문구 화면에 장마다 레이아웃 선택·항목/비교/숫자 편집기(`components/studio/LayoutEditor.tsx`). 저장 정리(`sanitize.ts` `pageLayout`)·글꼴 로딩(`fonts.ts`)·미리보기·PNG 저장이 새 칸을 함께 씀(`CardContent` 타입).
  - 검수: 단위 42/42(레이아웃 배치·응답 해석·저장 정리 6개 추가), tsc, 빌드, Vercel READY(`cardnews-studio-44cqb2wtk`), DB v1.17. 운영 실검수(메인 크롬): v1.16 시험 프로젝트로 리메이크 문구 재생성 1회(Gemini Flash Lite) → AI가 「배경형 표지 + 번호 목록 4장」 선택 → 번호 목록 카드 확인, 3·4장을 화면에서 A vs B·큰 숫자로 바꿔 두 레이아웃 그리기 확인 → 내용이 위에 몰리고 VS 원이 칸 글자를 살짝 가리던 점을 고쳐 재배포 후 재확인 → 시험 프로젝트 삭제(DB 0건 확인).
- **v1.16 (2026-10-19, Claude Code 윈도우) — 🔥 떡상 리메이크 1단계** (참고 원본 `nam-ai-trend/15_cardnews` 장점 합치기 A안, 분석 `docs/ANALYSIS_20261019_REF_15_CARDNEWS.md`(루트), 플랜 `docs/PLAN_20261019_VIRAL_REMAKE.md`):
  - 기획 화면 시작 방식 2가지(✍️ 주제로 시작 / 🔥 떡상 리메이크, `startMode`). 리메이크: 원문 붙여넣기·주소(기사=서버가 본문 추출, 유튜브=Gemini 영상 직접 보기, 인스타=안내)·카드 화면 캡처 최대 6장(브라우저에서 1024px JPEG로 줄임, 공용 `image-file-check`로 깨진 사진 거름, 저장 안 함) → `POST /api/cardnews/remake/analyze`.
  - 분석: 원문 요약·핵심 사실(최대 24)·떡상 이유(심리)·차별화 전략·목록 항목 수 → 추천 장수(표지+본문 3개씩+마무리, 4~10)·**7대 관점**(`remakePrompts.ts` `VIRAL_ANGLES`) 중 TOP 3(후킹 카피·이유·전개·장별 줄거리). 관점을 고르면 주제·장수·프로젝트 이름 자동 입력.
  - 문구: `/api/cardnews/copy`가 `remake{analysis, angleId}`를 받으면 `buildRemakeCopyPrompt` — 관점 지침·정보 누락 금지(핵심 사실 번호 목록 전달)·제목 22자/보조 120자(①②③ 줄바꿈). 장수 선택지 4~10 모두(`PAGE_COUNTS`).
  - AI 호출 `llm.ts`에 이미지 전달(Gemini inlineData·OpenAI image_url·Claude base64). 기사 주소는 공용 `safe-fetch`(기준 ghost-scraper, 내부망 차단·리디렉트 재검사·DNS 고정, `undici` 7.30.0 추가). 저장 정리(`sanitize.ts`)에 `startMode`·`remake` 보관.
  - 검수: 단위 36/36(신규 `tests/remake.test.mjs` 10개 + 공용 사진 검사 5), tsc, 빌드, Vercel READY(`cardnews-studio-2un1qwbk2`), DB v1.16. **운영 실검수(메인 크롬, 관리자, Gemini 3.5 Flash Lite 2회)**: 직접 쓴 시험 원문(사회초년생 월급 관리 7단계) → 분석 성공(항목 7개→5장 추천, TOP3: 치트키·타깃 맞춤·쉬운 요약) → 1위 선택 시 주제·5장·이름 자동 → 문구 5장 생성, ①~⑦ 7항목 모두 담김·2026년 기준 → 디자인 미리보기 정상. 시험 프로젝트 「사회초년생 첫 월급 관리 7단계 체크리스트」가 관리자 보관함에 남아 있음.
  - 다음: 2단계 v1.17 데이터형 레이아웃(번호 목록·A vs B·큰 숫자) — 지금 보조 문구가 길면 글자가 작아짐. 3단계 인스타 자동 포스팅은 대기 목록.
- **v1.15 (2026-10-17, Antigravity CLI)**:
  - **크리에이티브 아틀리에 스타일 (인스타 카드뉴스 변형)** 다크 테마 전면 적용 (`globals.css`, `layout.tsx`, `dashboard`, `settings`, `ui.tsx`).
  - 375px 모바일 전용 고정 헤더(`h-14`) 및 슬라이드 오버레이 드로어 메뉴 구축.
  - **비주얼 연동 & 사용 매뉴얼 (`/guide`) 완전 신설** (마스코트 배너, 5단계 파이프라인, 4:5 vs 1:1 황금비율, 저장&공유 알고리즘 팁, BYOK 보안 가이드, FAQ 4종).
  - Microsoft Edge 포그라운드 실세션 검수 완료 (데스크톱/모바일 5종 캡처 보존).
- **v1.11 (2026-10-17)**: 이미지 모델 호출을 공용 기준 코드(`geminiImage.ts`)로 위임.
- **v1.10 (2026-10-17)**: 이미지 모델 최신 정식 규격 교체 (`gemini-nano-banana-2.1`, `gemini-3-pro-image`).
- **v1.09 (2026-10-16)**: DB 연동 변수(PUBLISHABLE/SECRET) 표준화 호환.
- **v1.08 (2026-10-15)**: AI 프롬프트에 한국 시간(Asia/Seoul) 현재 월 자동 주입.
- **v1.06 (2026-10-12)**: Google Flow Carousel Pro 1:1 대조 카드 선 아이콘 24종 탑재, 무드 명칭 동기화.
- **v1.05 (2026-10-12)**: 공식 명칭 "INSTA Cardnews 자동화" 리브랜딩.
- **v1.04 (2026-10-12)**: 인스타그램 피드 캡션 및 해시태그 25개 원클릭 생성기 탑재.

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
- 상세 내역은 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) 참조.
  1. `CARD-01`: 상업용 한글 웹폰트 5종 탑재 (프리텐다드, 지마켓산스 등)
  2. `CARD-02`: 캔버스 세로형 4:5 안전영역(Safe Zone) 점선 가이드 오버레이 토글
  3. `CARD-03`: 기획/문구 단계 슬라이드 순서 드래그 앤 드롭 정렬 UI
  4. `CARD-04`: 모바일 카드 슬라이더 스와이프 제스처 시뮬레이터 뷰
  5. `CARD-07`: Instagram Graph API 직접 캐러셀 자동 발행

---

## 6. 기존 다른 프로그램과의 연계 / 기능 병합 제안
1. **`threads-posting` (Threads 포스팅 자동화) 연계**:
   - 카드뉴스 5단계 내보내기 화면에서 인스타 캡션뿐만 아니라 Threads 타래글(스레드 체인)로 즉시 분할 변환해 주는 원클릭 내보내기 버튼 연동.
2. **`ai-image-studio` (AI 이미지 스튜디오) 연계**:
   - `ai-image-studio`의 최신 이미지 생성 엔진 어댑터를 공유하여 고품질 3D 일러스트, 미니멀 사진 배경 프리셋을 동기화.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI개선안과 레이아웃 제안
1. **캔버스 줌인/줌아웃 컨트롤러 바**: 데스크톱 작업 시 캔버스를 50%~150%로 확대/축소하여 텍스트 정렬 디테일을 검수할 수 있는 플로팅 툴바 제공.
2. **모바일 카드뉴스 숏폼 카드 뷰**: 모바일 환경에서 위아래 스크롤이 길어지는 현상을 줄이고, 탭 전환 방식의 콤팩트 카드 에디터 도입.

---

## 8. 관련 문서 링크
- [디자인 개발 플랜](docs/PLAN_20261017_DESIGN_RENEWAL.md)
- [디자인 핸드오프](docs/DESIGN_HANDOFF.md)
- [개선 및 특이사항](docs/IMPROVEMENTS.md)
- [개선 백로그](docs/IMPROVEMENT_BACKLOG.md)

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.25 — 예약 공용 코드 「실패 시 상태 되돌리기」 (Claude Code 윈도우)
- 주인님 「순서대로 진행해줘」(남은 일 4번). 「내 cron-job.org」로 바꿀 때 cron-job.org 작업 켜기가 실패하면(하루 호출 한도 초과·키 오류) **이전 방식으로 되돌림**(예전엔 cronjob으로 남아 운영자 실행에서도 빠져 예약이 멈출 수 있었음), 「재개」가 실패하면 **일시정지 상태로 되돌림**(예전엔 화면은 일시정지·DB는 대기로 어긋남). `memberScheduler.ts`의 `setMemberSchedulerMode`·`resumeMemberScheduler` 두 곳, 11개 사본 같은 수정. 커밋 `ccf80d68`, DB 버전 크롬 SQL Editor로 갱신, 11개 순차 배포 모두 Ready·`/login` 정상·회원 실행 주소 가짜 토큰 401. 이 프로그램 배포 `cardnews-studio-moabkfnwb`.
- 실검수는 같은 코드인 booking-reminder에서 실패 경로 3가지를 실제로 확인(cron-job.org 하루 한도 소진 상태 이용).

## 2026-10-20 v1.26 — 회원 연동 정보 공용 저장 ④단계 Instagram (Claude Code 윈도우)
- `src/lib/instagram/memberAccount.ts` `getMemberInstagramAccount`가 공용 표 `member_platform_accounts`(platform `instagram`)를 먼저 보고, 로그인 방식에 맞는 게시 권한(Instagram 로그인 `instagram_business_basic`·`content_publish` / Facebook 로그인 `instagram_basic`·`instagram_content_publish`)이 있고 재연결 필요가 아니면 그것을, 아니면 지금처럼 INSTA의 `insta_accounts`를 쓴다. 이 프로그램은 연결 화면이 없어 쓰기·해제 코드는 없다. 공용 부품 사본 `src/lib/memberIntegrations.ts`. 테스트 52개 통과.

## 2026-10-20 — OpenAI 요청 규칙 공용 기준 코드 사본 적용 (Claude Code 윈도우, **미배포 — 다음 배포 때 함께**)
- `cardnews-studio/src/lib/ai/openaiRequestParams.ts`는 공용 기준 코드 `openai-request-params` 사본(기준 `naver-blog-seo-studio/lib/ai/openaiRequestParams.ts`) — **직접 고치지 않는다**. 「GPT-4 계열일 때만 온도」 분기를 `openAIGenerationParams(model, { temperature })`로 바꿈(동작 같음, 추론 모델 규칙은 기준 한 곳에서 관리).
- 검수: tsc 0, 기존 테스트 통과. 급하지 않은 정리라 배포하지 않음(빌드 비용 규칙). **다음에 이 프로그램을 배포하는 CLI는 버전 +0.01(코드·DB)하고 버전 기록에 이 항목을 적을 것.** 목록: 루트 `docs/SHARED_MODULES.md` 「미배포 사본」.

## 2026-10-20 v1.27 — 일시정지 안전 처리·상태 줄 즉시 갱신 (Claude Code 윈도우)
- 예약 공용 코드 보강(구글폼 CRM v1.12 등 6개와 같은 수정): ① `pauseMemberScheduler`가 일시정지를 먼저 저장하고 cron-job.org 끄기는 시도만(실패 시 「작업 끄기는 다음 호출 때 다시 시도」 안내), 회원 실행 주소가 `skipPausedMember`로 일시정지 회원을 건너뛰고 작업 끄기를 다시 시도 ② 상태 줄이 서버 값 변화를 따라감(`useEffect`). 커밋 `0dc07e3c`, DB 버전 크롬 SQL Editor, 배포 `cardnews-studio-jpe0fbod3` Ready·`/login` 정상·회원 실행 주소 가짜 토큰 401.
- 이 프로그램은 일시정지가 API 주소(`/api/cardnews/scheduler`)라 응답에 `notice`를 실어 보내고, 상태 줄은 원래 `refreshKey`마다 서버에서 다시 읽어 ②는 해당 없음. 다른 CLI가 미배포로 커밋해 둔 OpenAI 요청 규칙 사본(`openaiRequestParams`)도 이 배포에 함께 나감.
- **다음에 이 프로그램을 고칠 때 함께(주인님 결정 2026-10-20)**: 글 모델 선택 칸(`src/components/studio/ui.tsx · src/app/(dashboard)/background/page.tsx`) 아래에 모델 성격·상대 비용·GPT-5 지연 안내 붙이기 — 사본에 이미 `openAIModelBadge`·`openAIModelTierHint`·`openAIModelNotice`가 있어 화면 한두 줄만 추가. 기준 구현·방법: 루트 `docs/SHARED_FEATURE_MAP.md` §8.

## 2026-10-20 v1.29 — 인스타 예약 서버 코드 공용 기준 코드 등록(기준) · 예약 취소 중복 누름 방지 (Claude Code 윈도우)
- 공용 기준 코드 등록(2026-10-20): `insta-schedule-time`(schedule.ts)·`insta-member-scheduler`(memberScheduler.ts)·`insta-cronjob-org`(cronJobOrg.ts) — 기준 = `cardnews-studio`, 사본 = 인플루언서·웹툰·4컷. 프로그램마다 다른 값(사이트 주소·표 이름·토큰 앞글자·환경변수 이름·실행 주소·작업 이름)은 각 폴더 `src/lib/instagram/schedulerConfig.ts`(공용 아님). 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`. 이 폴더가 **기준**이다 — `memberScheduler.ts`·`cronJobOrg.ts`·`src/lib/cardnews/schedule.ts`를 고치면 사본 3개에 반영(`--sync`)하고 사본 프로그램도 테스트·배포.
- `memberScheduler.ts`·`cronJobOrg.ts`의 프로그램 값을 `src/lib/instagram/schedulerConfig.ts`로 옮김(동작 같음). 환경변수는 `process.env[PLATFORM_SCHEDULER_ENV]`(이름 `CNS_PLATFORM_SCHEDULER` 그대로), 토큰 검사는 `^cns_` 그대로.
- 게시 기록 「예약 취소」: 누르는 즉시 버튼을 막고(「취소하는 중...」) 성공하면 바로 「취소」로 바꿈 — 목록 갱신이 늦어 다시 누르면 「이미 끝난 예약」 오류가 나던 문제(4컷 v1.19 검수 중 발견).
- 검수(2026-10-20): 4개 모두 타입 검사·시험·빌드 통과, 순차 배포 Ready(카드뉴스 `cardnews-studio-73dn1lu4s`·인플루언서 `ai-influencer-studio-ohxzut5xz`·웹툰 `ai-webtoon-studio-85kgtktv9`·4컷 `four-cut-comics-74d8ph7yq`), DB 버전 4개 갱신(크롬 SQL Editor). 회원 실행 주소 가짜 토큰·설정 주소 비로그인 모두 401. 관리자 계정으로 인플루언서·웹툰·4컷 일시정지 경로 실행: 실행 중 → 일시정지(200) → 「일시정지됨」 → 재개(200) → 원래대로(Vercel 방식이라 cron-job.org 호출 없음). Vercel 5분 예약 호출 10:40 카드뉴스·인플루언서·웹툰·4컷 모두 200. 카드뉴스 화면의 취소 버튼은 4컷과 같은 수정이라 별도 실검수 없음(예약 기록 없음).

## 2026-10-20 v1.30 — 방식이 다른 회원 토큰 호출 시 cron-job.org 작업 끄기 (Claude Code 윈도우)
- 회원 토큰 확인(`memberIdForToken`)에서 토큰은 맞지만 실행 방식이 「내 cron-job.org」가 아니면 지금처럼 401을 돌려주되 **cron-job.org 작업을 끄고 `active: false`로 정리**(재개·방식 변경이 겹쳐 작업이 켜진 채 남으면 5분마다 401 헛호출이 이어지던 문제). 직전 배포(c69b0407)의 `skipPausedMember` 방식 조건은 토큰 확인이 먼저 401로 걸러 닿지 않는 코드였으므로 일시정지만 보는 원래 조건으로 되돌림. 커밋 `be5c5107`, DB 버전 크롬 SQL Editor, 15개 순차 배포 Ready·가짜 토큰 401.
- 재현 검수(상품소싱, 관리자): 작업을 켠 뒤 DB 방식만 Vercel로 → 11:00 회원 실행 401 + 작업 꺼짐(`active: false`) → 11:05~11:34 호출 없음. 시험 전 상태로 복귀.

## 2026-10-20 (버전 변경 없음·미배포) — 인스타 예약 화면 동작 공용화(상태 줄·게시 기록 시각·예약 취소) (Claude Code 윈도우)
- 한 일: 인스타 예약 화면의 같은 동작을 공용 기준 코드 `insta-posts-client`(`src/lib/instagram/postsClient.ts`, 기준 `cardnews-studio`, 사본 인플루언서·웹툰·4컷)로 뺐다 — ① 「⏰ 예약 발행」 상태 줄 동작 `useInstaSchedulerStatus(주소, refreshKey)`(불러오기·일시정지/재개·다음 상태 계산) + 상태 이름·설명 `SCHEDULER_STATE_TEXT` ② 게시 기록 시각 문구 `postTimeLabel` ③ 예약 취소 훅 `useScheduledPostCancel(주소, {onCanceled, onError, onSettled})`(취소 중 다른 버튼 막기·성공 즉시 「취소」 표시) + `markCanceled`. **화면 모양(색·테마·배치)과 주소는 각 프로그램에 그대로**(상태 줄은 색 표 `STATE_TONE`/`STATE_COLOR`만 남김). 카드뉴스는 `src/lib/instagram/schedule.ts`를 새로 두어 `lib/cardnews/schedule.ts`를 다시 내보냄(공용 파일이 같은 경로로 부르도록).
- 바뀐 화면 파일: `SchedulePublishingControl.tsx`(4곳), 게시 기록이 있는 `InstagramPublishPanel.tsx`(카드뉴스·인플루언서·웹툰) / `InstaPostHistory.tsx`(4컷). 화면 마크업·문구 변경 없음.
- 검수: 네 프로그램 tsc·테스트(카드뉴스 52·웹툰 18·인플루언서 18·4컷 52)·build 통과, `check-shared-modules.mjs` 일치, 훅 앞 이른 return 없음 확인. **화면 실검수는 다음 배포 때**(미배포).
- **미배포**(내부 정리 — 공용 기준 코드 배포 등급): 다음 배포 때 함께 나가며 버전 +0.01도 그때. 그 배포 때 「⏰ 예약 발행」 줄·게시 기록 「예약 취소」 화면을 크롬으로 한 번 확인할 것.
- 2026-10-20 추가: 공용 `insta-member-scheduler`를 예약 프로그램 15개 공용 **`member-scheduler`**로 넓혔다. `schedulerConfig.ts`에 `SCHEDULER_IS_STANDALONE`(false)·`countRemainingWork`(남은 예약 게시 수) 추가, 기준 `memberScheduler.ts`는 상대 경로(`./cronJobOrg`·`./schedulerConfig`)로 부름. 동작 같음·미배포. 플랜 `cardnews-studio/docs/PLAN_20261020_MEMBER_SCHEDULER_SHARED.md`.
