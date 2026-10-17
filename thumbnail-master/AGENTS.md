# AI 썸네일 마스터 자동화 (thumbnail-master) — 작업 지침

> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md), 설계 배경은 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## 한 줄 요약
주제(또는 대본) + 시청 타겟 + 피사체 → AI가 A안(직관·정보)/B안(호기심·감성) 문구·이미지 프롬프트 제안 → 문구가 박힌 16:9 썸네일 2종 병렬 생성 → 지시문 수정·버전 되돌리기·JPG 다운로드·프로젝트 저장. 참고 원본은 "썸네일 마스터 AI Pro"(개발자 GPT PARK, 순수 클라이언트 앱)이며 코드는 복제하지 않고 흐름·프롬프트 구조만 참고했다.

## 구조
- `src/lib/tmb/` 순수 로직(단위 테스트 대상): `types`(입력·전략·이미지 세트), `audience`(타겟 4종 규칙, 시니어 모드), `prompts`(연도 주입·피사체·전략/이미지/수정 프롬프트), `strategy`(응답 검증·정규화·글자 수 경고·responseSchema), `validate`(입력/문서/경로 정리).
- `src/lib/gemini.ts`(서버): 텍스트 `gemini-3.5-flash → 2.5-flash`, 이미지 `gemini-3-pro-image-preview → gemini-2.5-flash-image`(후자는 imageSize 미지원이라 aspectRatio만). 안전 필터는 `safety`, 이미지 미반환은 `noimage`로 구분.
- `src/lib/images.ts`(서버): `sharp`로 JPEG(q90) 변환, 비공개 버킷 저장·읽기·삭제, 서명 URL(1시간), 이미지 세트 정리·`pushVersion`(최근 5개 유지).
- API(모두 `checkProgramAccessApi` + `force-dynamic`): `POST /api/strategy`, `POST /api/generate`(옵션 1개, `maxDuration 120`), `POST /api/edit`(서버가 Storage 원본을 읽음), `GET/POST /api/projects`, `GET/PUT/PATCH/DELETE /api/projects/[id]`(PUT=이름·입력·전략 자동 저장, PATCH=버전 되돌리기), `/api/keys`.
- 화면: `/open`(최근 프로젝트 열기/생성) → `/project/[id]`(`components/studio/Studio.tsx` 3단계), `/dashboard`, `/settings`, `/guide`.
- DB: `thumbnail_master_projects`(RLS owner-only, 서버는 service role + `user_id` 필터), 이미지는 A/B를 **컬럼 분리**(`images_a`, `images_b`)해 병렬 생성이 서로 덮어쓰지 않게 했다. Storage 비공개 `thumbnail-master-images`(정책 없음, 경로 `<uid>/<projectId>/<a|b>-<uuid>.jpg`).

## 지킬 것
- 키는 회원 본인 Gemini 키만(`user_api_keys.provider = gemini`). 없으면 `needKey` 안내, 폴백 금지.
- 이미지는 **응답에 base64로 싣지 않는다**(Vercel 4.5MB 한도): 항상 Storage 저장 후 서명 URL만 반환. 수정 요청도 클라이언트가 이미지를 보내지 않고 서버가 Storage에서 읽는다.
- 경로 검증은 `isOwnImagePath(uid, projectId, path)`. 프로젝트 삭제 시 이미지도 함께 삭제.
- A/B 생성은 옵션별 별도 요청(`/api/generate`를 두 번). 한 컬럼만 갱신한다.
- 인물은 기본 한국인(핵심 원칙 3), 프롬프트에 당해 연도 주입(핵심 원칙 8). 모델 표기는 실제 사용 모델(`ImageVersion.model`).
- "AI 수정"은 인페인팅이 아니라 전체 재생성이다 — 화면 문구에 그대로 밝힌다.
- 버전은 `src/lib/version.ts`와 DB `programs.version`을 함께 올린다. Supabase MCP `execute_sql`은 문장별로 보낸다.

## 검수
- `npm test`(순수 로직 11건), `npm run test:browser`(보이는 Chrome, 모의 API 14건, `test-artifacts/gen-a.jpg` 필요 — 임의 JPG를 그 이름으로 두면 됨), `npm run build`.
- 실제 호출: `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/real-call.mts [strategy]`(운영자 본인 키; 2026-10-14: 전략 9초, 1K 이미지 18초, 수정 18초). 출력을 파이프로 받으면 끝날 때까지 안 보이니 파일로 리다이렉트한다. 2K 이미지는 운영 화면에서 약 40초.

## 2026-10-14 v1.03 — 모바일 셸 CSS 추가 (Claude Code)

- 증상: 767px 이하에서도 좌측 메뉴가 남아 본문이 눌림. 원인: `Sidebar.tsx`의 `.mobile-sidebar`(위쪽 접는 메뉴)는 있었지만 `src/app/globals.css`에 전환 규칙이 없었음(복사한 뼈대 공통 누락).
- 수정: `globals.css` 끝에 `@media(max-width:767px)` 셸 규칙(markdown-studio·four-cut-comics와 동일) 추가. 기능 로직 변경 없음. 버전 v1.03(코드·package·DB).
- 검수: 빌드, 프로덕션 배포, 운영 화면을 폭 400px 틀(iframe)에 띄워 좌측 메뉴 숨김·위쪽 메뉴 표시·본문 385px·가로 넘침 없음 확인. 실제 휴대폰 터치는 미확인.


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.03)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.04 (thumbnail-master)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.05 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/gemini.ts` `tests/browser.mjs` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-18 v1.06 — 이미지 생성 호출을 공용 기준 코드로 (이미지 4묶음 B · SDK 사용형, Claude Code 윈도우)
- **한 일**: `src/lib/gemini.ts` `makeImage`를 공용 호출로. 모델이 없거나 이미지가 안 나오면 다음 모델로 넘어가는 흐름 유지, 두 모델 합쳐 100초(라우트 120초 − 저장 여유) 안에서 남은 시간만 다음 모델에 줌(시간 검사는 `CHECK` — 직접 확인 최대 100초). 시간 초과·한도·키 오류는 다음 모델로 넘기지 않음.
- **왜**: ① SDK 호출에 시간 제한이 없어 Vercel 함수 한도에서 원인 모를 끊김(요금은 나갔을 수 있음) ② 응답의 첫 이미지만 꺼내 `gemini-3-pro-image`의 중간 초안(thought) 이미지를 결과로 쓸 위험 ③ 영어 오류 문장을 정규식으로 추측해 분류 — 공용 모듈은 시간 제한·최종 이미지 선택·상태 코드별 오류 구분·키 가리기·시간 초과 표준 안내(Google AI Studio 사용량 확인)를 갖췄다.
- **바꾸지 않은 것**: 프롬프트·모델 이름·비율·화질·화면·글 생성 호출(SDK 그대로). 유료 생성이라 재시도 0(이중 과금 방지).
- **검수**: tsc 0, 프로그램 테스트(11개 통과), `check-shared-modules` OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. eslint는 이 폴더에 설정 파일이 없어(이전부터) 실행 안 됨. 실제 이미지 생성 시험은 하지 않음(비용) — 오류가 나면 그때 검증.
- **주의(다음 CLI)**: `src/lib/geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 이 프로그램만 다르게 해야 하면 호출하는 쪽에서 덮어쓴다. 점검표: 루트 `docs/SHARED_MODULE_CHECKPOINTS.md`.
