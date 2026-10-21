# AI 4컷 만화 자동화 (four-cut-comics) — 작업 지침 (v1.07)

- 이어서 작업하는 CLI/계정은 **먼저 `docs/CLI_HANDOFF.md`(현재 상태·남은 작업 순서)와 `docs/DEVELOPMENT_PLAN.md`(원본 분석·전체 플랜)를 읽는다.** 루트 `CLAUDE.md`·`docs/ERROR_LESSONS.md`도 함께.
- 프로그램명 "AI 4컷 만화 자동화"(주인님 확정 2026-10-14), slug `four-cut-comics`, 폴더 `AIMaster/four-cut-comics`.
- 원칙: 본인 Gemini 키만(폴백 금지), 이미지 서버 저장 금지, 모든 쓰기·유료 호출에 `checkProgramAccessApi`, 당해 연도(2026) 프롬프트 주입, 인물 한국인 기본, 흰색 UI, 버전 `v1.01` 시작(`lib/version.ts`+DB `programs.version`).
- 상태(2026-10-14 밤): v1.07 배포 — 컷마다 다른 비율·웹툰형 나눠 저장(ZIP). 이전: v1.06 웹툰형 세로 저장·서버 보관함 전체 삭제·카탈로그 설명 갱신. 이전: v1.05 스타일 8종·컷 수 3·4·6·비율 4종·서버 보관함(버킷 `four-cut-comics-files`, `src/lib/saved.ts`)·완결 안내. 이전: v1.04 인스타 문구·이어서 만들기·만화 합치기·내 작품(`extras.ts`·`gallery.ts`·`/api/insta`·`/works`). 이전: v1.03 모바일 셸, v1.02 AI 자동 말풍선·말풍선 직접 배치 편집(`src/lib/comic/balloon.ts`·`/api/balloon`·`BalloonEditor.tsx`). 남은 일: 실제 휴대폰 확인. 상세는 docs/CLI_HANDOFF.md §6.


## 2026-10-16 DB 연동 변수 호환 — v1.08 (four-cut-comics)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.09 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/comic/options.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-18 v1.10 — 이미지 생성 호출을 공용 기준 코드로 (이미지 4묶음 B · SDK 사용형, Claude Code 윈도우)
- **한 일**: `src/lib/gemini.ts` `generateImage`를 공용 호출로. 라우트(`/api/character`·`/api/panel`) 한도 60초 → 시간 제한 50초. 예전 `withRetry`(504·혼잡 자동 재시도)에서 이미지 호출을 뺌(글 생성은 그대로). `toUserError`는 메시지를 넣어 던진 `AiError`면 그 메시지를 보여 줌(시간 초과 표준 안내용). 쓰지 않게 된 `SAFETY_REASONS` 삭제.
- **왜**: ① SDK 호출에 시간 제한이 없어 Vercel 함수 한도에서 원인 모를 끊김(요금은 나갔을 수 있음) ② 응답의 첫 이미지만 꺼내 `gemini-3-pro-image`의 중간 초안(thought) 이미지를 결과로 쓸 위험 ③ 영어 오류 문장을 정규식으로 추측해 분류 — 공용 모듈은 시간 제한·최종 이미지 선택·상태 코드별 오류 구분·키 가리기·시간 초과 표준 안내(Google AI Studio 사용량 확인)를 갖췄다.
- **바꾸지 않은 것**: 프롬프트·모델 이름·비율·화질·화면·글 생성 호출(SDK 그대로). 유료 생성이라 재시도 0(이중 과금 방지).
- **검수**: tsc 0, 프로그램 테스트(26개 통과), `check-shared-modules` OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. eslint는 이 폴더에 설정 파일이 없어(이전부터) 실행 안 됨. 실제 이미지 생성 시험은 하지 않음(비용) — 오류가 나면 그때 검증.
- **주의(다음 CLI)**: `src/lib/geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 이 프로그램만 다르게 해야 하면 호출하는 쪽에서 덮어쓴다. 점검표: 루트 `docs/SHARED_MODULE_CHECKPOINTS.md`.

## 2026-10-18 v1.11 — 이미지 함수 한도 상향 (Claude Code 윈도우)
- **함수 한도 상향**: 이미지 라우트 `maxDuration` 60초 → 300초, 이미지 호출 시간 제한 50초 → 240초(Pro 이미지 모델 시간 초과 방지). 오래 걸리는 요청만 그만큼 함수 시간이 늘고, 예전엔 60초에서 잘려도 구글 요금은 이미 나갔다.
  대상: `/api/character`·`/api/panel`, `src/lib/gemini.ts` 240초.
- **검수**: tsc 0, 테스트 26개 통과, `check-shared-modules` OK, Vercel 프로덕션 배포 1회(비용 절감 규칙)·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.12 — 디자인 리뉴얼 「크리에이티브 아틀리에 — 코믹 파스텔 변형」 (Claude Code 윈도우, **2026-10-18 배포 완료** — 당초 10-19 예정이었으나 주인님 배포 규칙 정정으로 앞당김, 검수 `docs/DESIGN_HANDOFF.md` 6절)
- 크림 배경·먹선 카드·코랄/머스타드 포인트, 말풍선 단계 칩, 비주얼 매뉴얼(마스코트·흐름 그림·옵션 비교). 기능 로직·프롬프트·API 무변경.
- 바뀐 파일: `globals.css`, `Sidebar.tsx`, `Studio.tsx`(단계 라벨만), `guide/page.tsx`, `version.ts`. DB 버전은 배포 때 v1.12.
- 상세: `docs/PLAN_20261018_DESIGN_RENEWAL.md` · `docs/DESIGN_HANDOFF.md` · `docs/IMPROVEMENT_HANDOFF_20261018.md`(다음 첫 단계).

## 7대 핵심 항목 (2026-10-18 정리)
1. **사용 목적·대상**: 그림을 못 그려도 인스타툰·4컷 만화로 홍보·일상 콘텐츠를 만들고 싶은 1인 사업자·마케터·크리에이터. 주제 한 줄 → 완성 만화까지 한 화면에서.
2. **기술 스택**: Next.js App Router(16) + TypeScript, 순수 CSS(`globals.css`), Supabase(공용 인증·권한·서버 보관함 버킷 `four-cut-comics-files`), Google Gemini(글: SDK, 그림: 공용 기준 코드 `geminiImage.ts` 사본), Canvas 합성(말풍선·저장), Vercel.
3. **핵심 기능·구조·장단점**: 4단계(주제·대본·캐릭터·컷) 스튜디오(`Studio.tsx`), 캐릭터 시트를 모든 컷 참고 이미지로 써 일관성 유지, AI 자동 말풍선(`/api/balloon`)·직접 편집(`BalloonEditor.tsx`), 스타일 8·컷 3/4/6·비율 4, 웹툰형 저장·ZIP 나눔, 이어서 만들기(연재)·합치기, 인스타 문구, 브라우저 보관(20개)·서버 보관함(30개, 기간 선택). 장점: 본인 키·서버 미저장 기본, 연재 일관성. 단점: 새로고침 시 작업 손실, 컷마다 그림 비용, 실제 휴대폰 미검수.
4. **버전**: v1.12(운영, 2026-10-18 배포). 이력은 위 각 절과 `docs/CLI_HANDOFF.md`.
5. **대기 과제**: `docs/IMPROVEMENT_BACKLOG.md`.
6. **연계·아이디어**: INSTA 자동포스팅으로 넘기기, 카드뉴스 표지 붙이기, 웹툰 스튜디오와 역할 구분 — `docs/IMPROVEMENTS.md` 3절.
7. **UI/UX 제안**: 단계 칩 클릭 이동, 결과 예시 그림, 빈 화면 마스코트, 다크 변형 — `docs/IMPROVEMENTS.md` 2절.

## 2026-10-19 브라우저 자동 테스트 추가 (Claude Code 윈도우, 앱 코드 무변경 — 버전·배포 없음)
- **발견**: `package.json`에 `test:browser` 명령·`playwright`는 있었지만 테스트 파일이 없었다(뼈대 복사 흔적).
- **추가**: `tests/browser.mjs` + `tests/browser-entry.tsx` — esbuild로 `Studio`를 묶어 로컬 시험 서버 → 보이는 Chrome. `/api/script`·`character`·`panel`·`balloon`은 모의 응답(실제 AI 호출·비용 없음), 시험 그림은 스크립트가 직접 만든 단색 PNG라 외부 파일 불필요.
- **검사 8개**: 빈 주제 안내 / 대본 생성 → 2단계·컷 수 4 전송 / 캐릭터 시트 2장 / 「만화 생성하러 가기」 → 「모든 이미지 한번에 생성」 → 컷 4장·컷마다 캐릭터 시트 2장 참고 전송 / 대사 있는 컷만 AI 말풍선 배치(3회) / 바둑판·웹툰형 저장 파일 / 390px 가로 넘침 없음 / 화면 스크립트 오류 없음.
- **실행**: `npm run test:browser`. 실패하면 `test-artifacts/browser-fail.png`. 화면 동작을 바꾼 작업은 배포 전에 `npx tsc --noEmit` → `npm test` → `npm run test:browser` → `npm run build`.

## 2026-10-19 v1.13 — 「만화 합치기」에서 깨진 사진을 빼고 안내 (Claude Code 윈도우)
- 확인: 캐릭터 시트 칸(`fileToSheet`)은 이미 「이미지를 불러오지 못했습니다.」 안내가 있었고, **만화 합치기(`MergeTool`)**는 `fileToDataUrl`로 풀어 보지 않고 목록에 넣어 깨진 사진이 들어갔음.
- 공용 부품 `image-file-check` 사본 `src/lib/imageFileCheck.ts`(+ `tests/imageFileCheck.test.mjs`) — **직접 고치지 말 것**, 기준 `portrait-photo/src/lib/imageFileCheck.ts` 수정 후 `node scripts/check-shared-modules.mjs --sync`.
- `src/components/studio/MergeTool.tsx` `add`에서 `splitReadableImages` → 깨진 사진은 빼고 「사진을 읽지 못했어요…(파일명)」.
- 검수: 단위 31/31(공용 5 포함), 브라우저 8/8, tsc, 빌드, Vercel READY(`four-cut-comics-6btu5w7ty`), DB v1.13, 운영 실측 — 합치기 도구에 깨진 사진 → 안내, 목록 0장. AI 비용 없음.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.14 — 작업 화면 편의 기능 3가지 (Claude Code 윈도우)
- 백로그 「비즈니스 로직」 3건: ① **끝난 단계 칩을 눌러 바로 이동**(가 본 단계는 앞뒤 모두, 생성 중·대본 없음은 막음) ② **저장 전 탭 닫기·새로고침 경고**(대본·그림이 있는데 지금 화를 [내 작품]·서버 보관함에 저장 안 했을 때 `beforeunload`) ③ **일괄 생성 진행률**(캐릭터·컷 일괄 생성 「그리는 중 2/4」 + 진행 막대).
- 파일: `src/lib/comic/flow.ts`(신규 — `canJumpToStep`·`hasUnsavedWork`·`progressLabel`), `src/components/studio/Studio.tsx`, `src/app/globals.css`, `tests/comic.test.mjs`(+3). 플랜: `docs/PLAN_20261020_STUDIO_CONVENIENCE.md`.
- 검수: tsc 0, 시험 34/34, 빌드. 배포·크롬 확인 결과는 아래 줄에 추가.
- 배포·검수(2026-10-20): `four-cut-comics-8nsul8r8h` Ready, DB `programs.version` v1.14. 크롬 실화면(관리자 계정): 사이드바 v1.14, 대본 생성 1회(관리자 본인 키) 후 2단계에서 칩 1만 버튼·3·4는 비활성, 칩 1→1단계 이동 후 칩 2로 대본 화면 복귀(대본 유지), 저장 전 `beforeunload` 차단(defaultPrevented=true) 확인. 일괄 생성 진행률은 그림 생성 비용 때문에 실화면 미검수(단위 시험 `progressLabel`로만 확인) — 다음에 그림 생성 시 「그리는 중 n/4」 표시 확인 필요.

## 2026-10-20 v1.15 — INSTA 자동포스팅으로 넘기기 (Claude Code 윈도우)
- 백로그 「외부 연계」: 인스타 문구 칸에 **[INSTA 자동포스팅으로 올리기]** — 문구 복사 + INSTA 새 글 화면(`https://auto-instagram-posting.buylife.xyz/posts/new?caption=&hashtags=`, 주소 6000자 넘으면 문구 없이) 새 탭 + 바둑판 그림 `4컷만화-인스타.jpg` 내려받기 + 직접 첨부 안내. INSTA 폴더는 수정하지 않음(기존 입력값·직접 첨부 기능 사용).
- 파일: `src/lib/comic/extras.ts`(`INSTA_NEW_POST_URL`·`instaHandoffUrl`), `src/components/studio/Studio.tsx`(`sendToInsta`), `tests/comic.test.mjs`(+1). 플랜: `docs/PLAN_20261020_INSTA_HANDOFF.md`.
- 주의: INSTA 주소가 바뀌면 `INSTA_NEW_POST_URL`도 함께 고친다. 새 탭은 그림 저장보다 먼저 연다(비동기 뒤에 열면 팝업 차단).
- 검수: tsc 0, 시험 35/35, 빌드. 배포·크롬 확인 결과는 아래 줄에 추가.
- 배포·검수(2026-10-20): `four-cut-comics-gmsrnixmd` Ready, DB `programs.version` v1.15. 크롬: 사이드바 v1.15, 버튼이 여는 INSTA 주소(`?caption=&hashtags=`)로 INSTA 새 글 화면의 캡션·해시태그 칸이 정확히 채워짐(`&` 포함). 크롬 확인 중 INSTA가 AI 이미지 없이는 첨부 칸을 안 보이고 제출 때 항상 AI로 덮어쓰는 문제를 발견 → 주인님 승인으로 INSTA v1.27에서 보완(아래 INSTA 기록). 4컷 화면의 버튼 클릭 자체(컷 그림이 모두 있어야 보임)는 그림 생성 비용 때문에 실화면 미검수 — 다음에 그림을 만들 때 버튼→새 탭·그림 저장·안내 확인.

## 2026-10-20 v1.23 — 여러 회차 예약: 회차별 캡션 미리보기·수정 (Claude Code 윈도우)
- 「여러 회차 한 번에 예약」 회차 줄마다 「✏️ 캡션」 → 자동 캡션을 펼쳐 고치기(고친 회차만 저장, 나머지는 자동 캡션), 글자 수 n/2200 표시·초과 시 「캡션이 너무 깁니다」로 예약 버튼 막기, 「자동 캡션으로 되돌리기」. 파일/작품을 다시 고르거나 예약이 끝나면 비움. DB 변경 없음. 커밋 `088367ba`. 추가개선 제안 2-2.
- 검수: tsc·시험 52·build, 배포 `four-cut-comics-8belqftpt` Ready, DB v1.23. 크롬(관리자) `/works`에서 브라우저 저장소에만 시험 작품 1개를 넣어 캡션 열기·수정·2300자 초과 막힘·되돌리기 확인(예약 버튼은 누르지 않음, 시험 작품 삭제).

## 2026-10-20 v1.22 — 여러 회차 묶음 예약 직전 서버 보관함 그림 주소 새로 받기 (Claude Code 윈도우, 남은 작업 ⑦)
- 문제: 「내 작품」 📚 여러 회차 한 번에 예약은 서버 보관함 그림 주소(1시간 서명 주소)를 화면을 열 때 한 번만 받아, 1시간 넘게 열어 둔 뒤 예약하면 그림을 만들지 못함.
- 수정: `src/components/studio/WorksInstaSchedule.tsx` — 서버 보관함 읽기를 `loadServerWorks()`로 빼고, `scheduleAll()` 시작 때 서버 작품이 있으면 목록을 다시 받아 새 주소로 바꿈. 그사이 지워진 작품은 그 회차만 「서버 보관함에서 찾지 못했어요」 실패로 표시(나머지는 계속). 다시 받기에 실패하면 가지고 있던 주소로 시도.
- **이 배포로 미배포 공용 정리 3건도 함께 나감**: 인스타 게시 처리·예약 API 5개(`insta-posting` 외), 예약 화면 동작(`insta-posts-client`), 예약 실행 방식(`member-scheduler`).
- 검수: tsc·시험 52·build, 커밋 `a4b6d18b`, 배포 `four-cut-comics-izg1i9baa` Ready, DB v1.22(크롬 SQL Editor, PRODUCTION). 운영: 회원 실행 주소 가짜 토큰·Vercel 실행 주소 비밀값 없음·예약 상태 API 비로그인 모두 401. 크롬(관리자) `/works` v1.22 표시·게시 기록 「아직 기록 없음」 정상, 로그인 상태 `/api/instagram/scheduler` 200(`state: platform`, 남은 예약 0)·`/api/instagram/posts` 200. **실제 묶음 예약·만료 재현은 안 함**(서버 보관함 작품 없음, 유료 생성 필요) — 회원 사용 중 문제가 생기면 그때 확인.

## 2026-10-20 (버전 변경 없음·미배포) — 인스타 예약 화면 동작 공용화(상태 줄·게시 기록 시각·예약 취소) (Claude Code 윈도우)
- 한 일: 인스타 예약 화면의 같은 동작을 공용 기준 코드 `insta-posts-client`(`src/lib/instagram/postsClient.ts`, 기준 `cardnews-studio`, 사본 인플루언서·웹툰·4컷)로 뺐다 — ① 「⏰ 예약 발행」 상태 줄 동작 `useInstaSchedulerStatus(주소, refreshKey)`(불러오기·일시정지/재개·다음 상태 계산) + 상태 이름·설명 `SCHEDULER_STATE_TEXT` ② 게시 기록 시각 문구 `postTimeLabel` ③ 예약 취소 훅 `useScheduledPostCancel(주소, {onCanceled, onError, onSettled})`(취소 중 다른 버튼 막기·성공 즉시 「취소」 표시) + `markCanceled`. **화면 모양(색·테마·배치)과 주소는 각 프로그램에 그대로**(상태 줄은 색 표 `STATE_TONE`/`STATE_COLOR`만 남김). 카드뉴스는 `src/lib/instagram/schedule.ts`를 새로 두어 `lib/cardnews/schedule.ts`를 다시 내보냄(공용 파일이 같은 경로로 부르도록).
- 바뀐 화면 파일: `SchedulePublishingControl.tsx`(4곳), 게시 기록이 있는 `InstagramPublishPanel.tsx`(카드뉴스·인플루언서·웹툰) / `InstaPostHistory.tsx`(4컷). 화면 마크업·문구 변경 없음.
- 검수: 네 프로그램 tsc·테스트(카드뉴스 52·웹툰 18·인플루언서 18·4컷 52)·build 통과, `check-shared-modules.mjs` 일치, 훅 앞 이른 return 없음 확인. **화면 실검수는 다음 배포 때**(미배포).
- **미배포**(내부 정리 — 공용 기준 코드 배포 등급): 다음 배포 때 함께 나가며 버전 +0.01도 그때. 그 배포 때 「⏰ 예약 발행」 줄·게시 기록 「예약 취소」 화면을 크롬으로 한 번 확인할 것.
- 2026-10-20 추가: 공용 `insta-member-scheduler`를 예약 프로그램 15개 공용 **`member-scheduler`**로 넓혔다. `schedulerConfig.ts`에 `SCHEDULER_IS_STANDALONE`(false)·`countRemainingWork`(남은 예약 게시 수) 추가, 기준 `memberScheduler.ts`는 상대 경로(`./cronJobOrg`·`./schedulerConfig`)로 부름. 동작 같음·미배포. 플랜 `cardnews-studio/docs/PLAN_20261020_MEMBER_SCHEDULER_SHARED.md`.

## 2026-10-20 (버전 변경 없음·미배포) — 인스타 게시 처리·예약 API 5개 공용 사본 전환 (Claude Code 윈도우)
- 한 일: `src/lib/instagram/posting.ts`와 `src/app/api/instagram/{posts,dispatch,dispatch-member,scheduler}/route.ts` 5개를 **공용 기준 코드로 등록**(`insta-posting`·`insta-posts-route`·`insta-dispatch-route`·`insta-dispatch-member-route`·`insta-scheduler-route`, 기준 `ai-webtoon-studio`, 사본 `ai-influencer-studio`·`four-cut-comics`). 프로그램마다 다르던 값(게시 기록 표·slug·이미지 확인 함수 파일)은 `src/lib/instagram/schedulerConfig.ts`의 `SCHEDULER_POSTS_TABLE`·`SCHEDULER_PROGRAM_SLUG`·다시 내보낸 `MAX_INSTA_CAPTION`/`validInstaPaths`로. **사본은 직접 고치지 말고** 기준(웹툰)만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
- 동작 변경 없음(표 이름·slug·키 가림 형식 모두 이전과 같음). DB 변경 없음. 카드뉴스는 구조가 달라 제외. 플랜 `ai-webtoon-studio/docs/PLAN_20261020_INSTA_POSTING_SHARED.md`.
- 검수: 세 프로그램 tsc·테스트(웹툰 18·인플루언서 18·4컷 52)·build 통과, `check-shared-modules.mjs` 일치.
- **미배포**(내부 정리 — 공용 기준 코드 배포 등급): 버전은 그대로이고, 이 프로그램을 다음에 배포할 때 함께 나가며 그때 버전 +0.01.
## 2026-10-20 v1.20 — 인스타 예약 서버 코드 공용 사본 전환 · 일시정지 안전 처리 보강 (Claude Code 윈도우, v1.18 추가개선 제안 ③)
- 공용 기준 코드 등록(2026-10-20): `insta-schedule-time`(schedule.ts)·`insta-member-scheduler`(memberScheduler.ts)·`insta-cronjob-org`(cronJobOrg.ts) — 기준 = `cardnews-studio`, 사본 = 인플루언서·웹툰·4컷. 프로그램마다 다른 값(사이트 주소·표 이름·토큰 앞글자·환경변수 이름·실행 주소·작업 이름)은 각 폴더 `src/lib/instagram/schedulerConfig.ts`(공용 아님). 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`.
- **일시정지 안전 처리 누락 보강**: v1.18 예약은 웹툰 v1.16 사본이라 빠져 있었다 → 공용 사본으로 반영, 회원 실행 주소가 일시정지·비cronjob 회원을 건너뜀, 일시정지 응답 `notice`·상태 줄 표시. (예약 취소 중복 누름 방지는 v1.19에서 `InstaPostHistory`로 처리됨)
- 검수(2026-10-20): 4개 모두 타입 검사·시험·빌드 통과, 순차 배포 Ready(카드뉴스 `cardnews-studio-73dn1lu4s`·인플루언서 `ai-influencer-studio-ohxzut5xz`·웹툰 `ai-webtoon-studio-85kgtktv9`·4컷 `four-cut-comics-74d8ph7yq`), DB 버전 4개 갱신(크롬 SQL Editor). 회원 실행 주소 가짜 토큰·설정 주소 비로그인 모두 401. 관리자 계정으로 인플루언서·웹툰·4컷 일시정지 경로 실행: 실행 중 → 일시정지(200) → 「일시정지됨」 → 재개(200) → 원래대로(Vercel 방식이라 cron-job.org 호출 없음). Vercel 5분 예약 호출 10:40 카드뉴스·인플루언서·웹툰·4컷 모두 200.
- 범위 밖(다음 후보): `posting.ts`·예약 API 4개는 카드뉴스에 프로젝트 연결 등 구조 차이가 있어 이번에 공용화하지 않음.

## 2026-10-20 v1.19 — 내 작품: 📚 여러 회차 한 번에 인스타 예약 · 예약 대기·게시 기록 (Claude Code 윈도우, v1.18 추가개선 제안 ①②)
- 플랜 `docs/PLAN_20261020_WORKS_BATCH_SCHEDULE.md`. 참고: `ai-webtoon-studio` v1.17 `EpisodeBatchSchedule`·`ScheduledSummary`. **DB 구조 변경 없음**(v1.18 표 그대로, version v1.19 — `supabase/migrations/0010_insta_schedule_v1_18.sql` 끝에 기록).
- 「내 작품」 맨 위 「📤 인스타그램 예약」(`components/studio/WorksInstaSchedule.tsx`): 최근 30일 게시 기록·예약 취소 + 위에 「⏰ 예약 n건 대기 · 다음 게시」, 아래 「📚 여러 회차 한 번에 예약(연재용)」 — 「이 브라우저」·「서버 보관함」 작품을 체크해 고르면 화 순서(같은 화는 먼저 만든 것)대로, 첫 회차 시각부터 매일·3일·매주·2주 간격으로 예약. 회차마다 바둑판 그림 1장 = 게시물 1개(비율 밖이면 흰 여백), 캡션 「제목 N화 + #4컷만화 #인스타툰 #만화」. 대기 20건·첫/마지막 시각(10분 뒤~60일) 화면 사전 경고·버튼 막음, 회차별 결과 표시.
- 정리: 게시 기록 목록을 `InstaPostHistory.tsx`로 분리(게시 칸·내 작품 공용, 대기 요약 포함), 그림 변환·올리기를 `src/lib/instagram/feedRender.ts`(`toFeedJpeg`·`uploadBlobs`)로 분리. 순수 함수 `feed.ts`: `episodeTimes`·`sortForBatch`·`workCaption`·`MAX_BATCH_EPISODES` + 시험 3개(합 52개).
- **검수 중 발견·수정**: 예약 취소를 누른 뒤 목록 갱신이 늦어 같은 「예약 취소」 버튼이 남아, 다시 누르면 「이미 게시 중이거나 끝난 예약」 오류 → 누르는 즉시 버튼을 막고(「취소하는 중...」) 성공하면 바로 「취소」로 바꾸게 고쳐 재배포. (같은 취소 코드를 쓰는 웹툰·인플루언서·카드뉴스는 미수정 — 개선 문서 참고)
- 검수(2026-10-20): 시험 52개·타입·빌드 통과. 배포 `four-cut-comics-qypnoaxnu` → 취소 수정 `four-cut-comics-m3f7p53cq` Ready, DB v1.19. 크롬(관리자 계정): 내 작품 맨 위 상자·지난 기록 표시 → 이 브라우저 보관함(IndexedDB, 원래 0개)에 시험 작품 3개(3화·1화·2화 순으로 넣음) → 목록 1→2→3화 정렬 → 3화·1화 순으로 골라도 1화 10/27·3화 10/28(매일) → **실제 예약 2건** ✓ → 「예약 2건 대기 · 다음 게시 10월 27일 19:00」 → DB 19:00 KST=10:00 UTC·저장소 각 1장 640×800 → 취소(중복 누름 문제 발견·수정 후 재확인: 「취소하는 중...」·두 번째 누름 무시·오류 없음) → 대기 요약 사라짐·사진 2장 삭제(400) → 시험 작품 3개 지움(0개로 복원). 취소된 시험 기록 2건(관리자 본인)은 30일 뒤 자동 삭제.
- **하지 않은 것**: 실제 인스타 게시, 서버 보관함 작품으로 묶음 예약(같은 코드 경로·서명 주소 그림 — 서버 보관함 작품이 없어 미시험).

## 2026-10-20 v1.18 — ⏰ 인스타 예약 게시·게시 기록 + 올라갈 장 미리보기 (Claude Code 윈도우, v1.17 추가개선 제안 ①②)
- 플랜 `docs/PLAN_20261020_INSTA_SCHEDULE.md`. 기준: `ai-webtoon-studio` v1.16 사본(원본 카드뉴스 v1.19·v1.24 + 실패 시 되돌리기). 지침: 루트 `docs/SCHEDULER_POLICY.md`.
- 게시 칸(`InstaDirectPublish.tsx`): 「지금 게시 / 예약 게시」, 예약 날짜·시간(한국 시간 10분 뒤~60일), 실행 상태 줄(`SchedulePublishingControl.tsx` — 일시정지·재개·실행 방식 바꾸기 → /settings), 「최근 인스타 게시 기록(30일)」(예약됨·게시 중·게시됨·실패·취소, 게시물 보기, 예약 취소). 즉시 게시도 기록, 일시 오류 때 이미 올라갔는지 확인해 중복 게시 방지.
- **올라갈 장 미리보기**: 게시와 같은 `toFeedJpeg`(흰 여백 포함)로 그려 ‹ › 로 넘겨 봄. 형식·컷이 바뀌면 닫고, 그림 주소는 목록이 바뀌거나 닫힐 때만 정리(넘겨도 그림 유지).
- 설정(/settings): 「API키등록·플랫폼연동」 아래 「⏰ 예약 발행」(`components/workspace/ScheduleSettings.tsx`, 웹툰 사본을 밝은 테마 `card`·`chip`으로) — Vercel 기본 / 내 cron-job.org + 공용 키 한 줄. 머리글 안내도 「인스타 게시·예약」 기준으로 고침.
- 서버: `src/lib/instagram/{schedule,cronJobOrg,memberScheduler}.ts`(웹툰 사본, 접두어 `fcc_`, 사이트 주소 four-cut-comics.buylife.xyz), `posting.ts`(기록·예약 실행·30일 정리·30분 멈춤·24시간 지연 미게시·1회 재시도 전 중복 확인), API `/api/instagram/{posts,dispatch,dispatch-member,scheduler}` + `publish` 기록 추가. `vercel.json` crons 5분.
- 운영 DB(ref `esgxyikcnnvmlhygjkth`, 승인): 표 `fcc_insta_posts`·`fcc_member_scheduler`(RLS 본인 읽기만, 쓰기는 서버만), version v1.18 — `supabase/migrations/0010_insta_schedule_v1_18.sql`. 운영 Vercel `CRON_SECRET` 추가, `FCC_PLATFORM_SCHEDULER` 없음(= 켜짐).
- 웹툰의 「여러 회차 한 번에 예약」은 4컷에 회차 파일(JSON) 저장이 없어 이번 범위에서 뺌.
- 검수(2026-10-20): 시험 49개(예약 9개 추가)·타입·빌드 통과. 배포 `four-cut-comics-oht0onhpd` → 저장 버튼 줄바꿈 수정 `four-cut-comics-4f6slfxuo` Ready. 비로그인 새 주소 8개·잘못된 회원 토큰·잘못된 비밀값 401. 크롬(관리자 계정, 탭 화면 상태에 시험 컷 600×800 4장 넣어 확인): /settings 「⏰ 예약 발행」(Vercel 기본, 공용 cron-job.org 키 「등록됨」), 컷별 캐러셀 미리보기 2/4장 넘김(640×800 흰 여백), **예약 1건 실제 등록** → 「예약됨 11:06 · 4장」 → DB `scheduled`·11:06 KST=02:06 UTC·저장소 4장 모두 640×800 → 예약 취소 → 「취소」·사진 4장 삭제(저장소 400)·상태 줄 대기 0건(조금 늦게 갱신). 저장 버튼 「저/장」 두 줄 문제 찾아 고쳐 재배포 후 한 줄 확인. 취소된 시험 기록 1건(관리자 본인)은 30일 뒤 자동 삭제.
- **하지 않은 것**: 실제 인스타 게시(예약 실행 포함), 「내 cron-job.org」 전환(관리자 하루 호출 한도 보호).

## 2026-10-20 v1.17 — 📤 인스타그램에 바로 게시(자동 포스팅 4단계, 즉시 게시) (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261020_INSTA_DIRECT_POST.md`. 기준: `ai-webtoon-studio` v1.15 즉시 게시 사본(연결 상태·서명 업로드·게시·임시 사진 삭제), 공용 기준 코드 `instagram-publish` 사본 추가(`scripts/check-shared-modules.mjs` 등록).
- 화면(`src/components/studio/InstaDirectPublish.tsx`): 모든 컷이 끝나면 「인스타 게시 문구」 칸 아래 「📤 인스타그램에 바로 게시」 — ① 바둑판 합본 1장(피드) ② 컷별 캐러셀(컷 수만큼, 최대 10장). 캡션은 「인스타 문구 만들기」 결과로 채우고 고칠 수 있음(2200자). 연결은 INSTA에서 한 번 한 공용 값(`insta_accounts`), 공개 게시 확인 체크 후 게시. 기존 「INSTA로 넘기기」 두 버튼은 INSTA에서 예약·편집하려는 회원을 위해 그대로 둠.
- 비율: 인스타 피드(4:5~1.91:1) 밖이면 **자르지 않고 흰 여백**을 붙여 맞춤(컷·말풍선 보존), 긴 변 1440px 이하(`src/lib/instagram/feed.ts` `feedPad`).
- 서버: `src/lib/instagram/{publish,memberAccount,posting,feed}.ts`, API `/api/instagram`(연결 상태)·`/api/instagram/upload`·`/api/instagram/publish`(기존 `/api/insta`는 문구 생성이라 겹치지 않게 새 주소). 임시 사진 `insta-post-images/{userId}/fourcut-insta/{묶음}/NN.jpg` — 게시 뒤 삭제. **DB 구조 변경 없음**(버전만, `supabase/migrations/0009_version_v1_17.sql`).
- 검수(2026-10-20): 시험 40개(새 4개)·타입·빌드 통과. 배포 `four-cut-comics-9sxmy161f` → 체크 줄 배치 수정 2번 → `four-cut-comics-qmea26oxs` Ready, DB v1.17. 비로그인 새 주소 3개 401. 크롬(시험 회원 계정 `buylifemall@naver.com`, 그림 생성 비용을 쓰지 않으려고 **이 탭의 화면 상태에 시험 대본·컷 그림(600×800)·인스타 문구를 넣어** 확인): 칸 표시·「연결됨 @계정」·형식 2개·캡션 채움·확인 전 비활성 → 업로드·게시 요청을 탭에서 가로채 실제 게시·저장 없이 확인 — 바둑판 1장 1120×1400(4:5), 컷별 4장 각 640×800(좌우 흰 여백 20px, 말풍선 보존), 흐름 순서(업로드 준비 → 올리기 → 게시 요청)와 실패 안내 표시. 로그인 상태 11장·다른 회원 폴더·웹툰 폴더 400, 업로드 경로 `내 id/fourcut-insta/묶음/01.jpg`. 검수 중 확인 체크가 문장 위에 따로 놓이는 문제(`.cc-form label` 세로 배치가 `.check`보다 우선) 발견 → 가로 배치 직접 지정해 재배포 후 확인.
- **하지 않은 것**: 실제 인스타 게시·실제 저장소 업로드(첫 회원 사용 때 확인). 2차 예약 게시는 웹툰 v1.16 구조(표 2개, 운영 DB 승인 필요)로 다음에.

## 2026-10-20 v1.16 — 카드뉴스(컷별 4장)로 INSTA 넘기기 (Claude Code 윈도우, 주인님 지시 「추가 개선 제안 1·2」)
- 인스타 문구 칸 **[카드뉴스(컷별 4장)로 올리기]**: INSTA 새 글을 `postType=card_news`로 열고(문구가 길어도 형식 값은 유지) 문구 복사 + 컷 4장 `4컷만화-1컷~4컷.jpg`(JPEG) 차례로 저장(0.4초 간격 — 크롬이 「여러 파일 다운로드 허용」을 한 번 물을 수 있음). INSTA 카드뉴스가 4장 고정이라 **4컷일 때만** 활성(3·6컷은 비활성 + 안내 툴팁). 컷마다 비율이 다르면 인스타가 첫 장 비율로 맞춰 자름(인스타 정책).
- 파일: `src/lib/comic/extras.ts`(`INSTA_CARD_COUNT`, `instaHandoffUrl(…, postType)`), `Studio.tsx`(`sendCardsToInsta`), `tests/comic.test.mjs`(+1, 36/36). INSTA 짝 작업: INSTA v1.28(여러 파일 한 번에 첨부·`postType` 주소값).
- 배포·검수(2026-10-20): `four-cut-comics-2axnxq2dy` Ready, DB v1.16, 크롬 사이드바 v1.16. 버튼이 여는 카드뉴스 주소로 INSTA v1.28에서 4장 첨부·임시저장까지 확인(INSTA 기록 참고). 4컷 화면의 버튼 클릭 자체는 컷 그림 생성 비용 때문에 미검수(v1.15 버튼과 함께 다음 그림 생성 때 확인).

## 2026-10-20 v1.21 — 방식이 다른 회원 토큰 호출 시 cron-job.org 작업 끄기 (Claude Code 윈도우)
- 회원 토큰 확인(`memberIdForToken`)에서 토큰은 맞지만 실행 방식이 「내 cron-job.org」가 아니면 지금처럼 401을 돌려주되 **cron-job.org 작업을 끄고 `active: false`로 정리**(재개·방식 변경이 겹쳐 작업이 켜진 채 남으면 5분마다 401 헛호출이 이어지던 문제). 직전 배포(c69b0407)의 `skipPausedMember` 방식 조건은 토큰 확인이 먼저 401로 걸러 닿지 않는 코드였으므로 일시정지만 보는 원래 조건으로 되돌림. 커밋 `be5c5107`, DB 버전 크롬 SQL Editor, 15개 순차 배포 Ready·가짜 토큰 401.
- 재현 검수(상품소싱, 관리자): 작업을 켠 뒤 DB 방식만 Vercel로 → 11:00 회원 실행 401 + 작업 꺼짐(`active: false`) → 11:05~11:34 호출 없음. 시험 전 상태로 복귀.
- 인스타 공용 기준 코드(`insta-member-scheduler`, 기준 cardnews-studio) 사본 — `node scripts/check-shared-modules.mjs --sync`로 반영.

## 2026-10-22 미배포 공용 변경 안내
- **미배포 공용 변경 안내(2026-10-22, Claude Code 윈도우) — 다음에 이 프로그램을 배포할 때 버전 +0.01과 함께 나감**: 공용 기준 코드 사본 `src/app/api/instagram/posts/route.ts`(공용 `insta-posts-route`: 게시 기록 응답에 `caption` 칸 추가)이 저장소에서 바뀌었지만 이 프로그램 화면·동작은 같다(기본값 그대로). 사본은 직접 고치지 말고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 배포 뒤 이 줄을 「배포됨(버전)」으로 바꾼다. 목록: 루트 `docs/SHARED_MODULES.md`.
- 같은 날 「최근 7일 게시」 그래프는 이 프로그램에 붙이지 않았다: 화면이 Tailwind 없이 일반 CSS(전역 버튼 모양)라 공용 그래프 컴포넌트(Tailwind 클래스)가 깨진다. 붙이려면 이 프로그램용 CSS 버전이 필요 — `docs/IMPROVEMENTS.md`에 기록.
