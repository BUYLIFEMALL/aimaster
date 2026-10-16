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
