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
