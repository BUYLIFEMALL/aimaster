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
