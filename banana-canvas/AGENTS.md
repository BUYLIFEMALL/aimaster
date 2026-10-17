# AI 바나나 캔버스 자동화 (banana-canvas) — 작업 지침

> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md), 설계 배경은 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## 한 줄 요약
사진 한 장(또는 아이디어)을 Nano Banana(Gemini 이미지 모델)로 만들고 고치는 도구함: 생성·편집(복원/컬러화/채색/업스케일, 스타일 20종)·합성(소스 5장)·빠른 작업(배경 제거/부분 삭제/증명사진/평면도 3D)·스페셜(인생 앨범/만화 패널/연속 스토리 8컷/이미지 레시피). 참고 원본은 Google AI Studio 앱 "Banana Canvas"(소스 전체 분석, 코드는 복제하지 않고 프롬프트 구조·기능 목록만 참고).

## 구조
- `src/lib/bnc/` 순수 로직(단위 테스트): `types`(작업 종류·파라미터), `styles`(처리 4·스타일 20·재질 지침·카테고리 11), `prompts`(작업별 영어 고정 템플릿·종횡비 부록·프롬프트 제안·스토리/레시피 기획), `tasks`(`cleanParams`·`missingInput`·`buildTask`), `paths`(이미지 판별·크기·소유 경로).
- `src/lib/gemini.ts`(서버): `textModel`(3.5-flash→2.5-flash), `imageModel`(flash: `gemini-2.5-flash-image`→pro, pro: `gemini-3-pro-image-preview`→flash). 안전 필터 `safety`, 이미지 미반환 `noimage`.
- `src/lib/files.ts`(서버): Storage(비공개 `banana-canvas-files`) 읽기/쓰기/삭제/서명, `sharp` 처리(`isBackgroundEmpty`, `chromaKey`, `upscale`, `normalizeOutput`).
- `src/lib/runner.ts`(서버): `runTask` — 단일 이미지 / 스토리(텍스트 모델이 8컷 기획 → 이전 컷을 참고해 순차 생성, 예산 230초) / 레시피(단계 기획 → 3병렬 생성). 결과는 항상 Storage 저장 후 목록 반환.
- API(모두 `checkProgramAccessApi` + `force-dynamic`): `POST/DELETE /api/upload`(서명 URL·임시 삭제), `POST /api/suggest`, `POST /api/run`(`maxDuration 300`), `GET /api/history`, `GET/PATCH/DELETE /api/history/[id]`, `/api/keys`.
- 화면: `/open`→`/studio`(`components/studio/Studio.tsx` — **탭 없는 한 화면 대시보드**: 1열 원본·생성·빠른 작업·스토리/레시피, 2열 편집·합성·인생 앨범·만화, 3열 결과(화면 고정, 1380px 이하는 결과가 위로), `MaskEditor.tsx`), `/history`, `/settings`, `/guide`.
- DB: `banana_canvas_results`(RLS owner-only, 서버는 service role + `user_id` 필터, 최대 30건·즐겨찾기 보존). Storage 비공개 `banana-canvas-files`(정책 없음): `<uid>/in/`(입력·마스크, 1시간 후 정리) / `<uid>/out/`(결과).

## 지킬 것
- 키는 회원 본인 Gemini 키만. 없으면 `needKey` 안내, 폴백 금지.
- 이미지는 응답 본문에 싣지 않는다(Vercel 4.5MB): 입력은 서명 URL 직접 업로드, 결과는 Storage 저장 후 서명 URL. 경로는 항상 `isOwnPath(uid, path)`로 검증한다.
- **배경 제거는 모델의 "마스크 출력"을 믿지 않는다**: 모델이 흑백 사진을 돌려줄 뿐 이진 마스크를 만들지 않는다(2026-10-14 실측). 배경을 순수 녹색(#00FF00)으로 바꾸게 한 뒤 서버 `chromaKey`로 알파를 만든다(키 색은 가장자리에서 추정, 가장자리와 연결된 배경만 투명 처리해 피부색 구멍 방지). 자주색 키는 피부색과 가까워 쓰지 않는다.
- 업스케일은 AI 선명화 + 서버 Lanczos3 확대(긴 변 8192px 상한)이며 JPEG로 저장한다(PNG는 20MB 버킷 제한 초과 위험).
- 새로 그리는 인물은 기본 한국인(핵심 원칙 3), 프롬프트 제안·기획에는 당해 연도 주입(핵심 원칙 8). 업로드 사진 변환은 사진 속 인물 그대로.
- 얼굴 정체성 고정·라벨 금지 등 원본의 규칙 프롬프트는 유지하되 번역 호출은 하지 않는다.
- 버전은 `src/lib/version.ts`(이름·slug 포함 — 복사 후 반드시 수정)와 DB `programs.version`을 함께 올린다. Supabase MCP `execute_sql`은 문장별로 보낸다.

## 검수
- `npm test`(순수 로직 7건), `npm run test:browser`(보이는 Chrome, 모의 API·Storage 17건, `test-artifacts/sample.jpg` 필요 — 임의 JPG), `npm run build`.
- 실제 호출: `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/real-call.mts [generate|edit|upscale|bgremove|inpaint|comic|idphoto|story|recipe]`(운영자 본인 키 + 실제 Storage, 끝나면 정리). `BASE_FILE=<이미지>`로 원본 지정. 출력은 파이프 대신 파일로 리다이렉트한다.
- 2026-10-14 실측(flash-image): 생성 9초, 편집 16초, 업스케일 13초, 배경 제거 12초, 부분 삭제 13초, 만화 13초, 증명사진 11초, 스토리 8컷 98초, 레시피 7단계 41초.

## 2026-10-14 v1.04 — 모바일 셸 CSS 추가 (Claude Code)

- 증상: 767px 이하에서도 좌측 메뉴가 남아 본문이 눌림. 원인: `Sidebar.tsx`의 `.mobile-sidebar`(위쪽 접는 메뉴)는 있었지만 `src/app/globals.css`에 전환 규칙이 없었음(복사한 뼈대 공통 누락).
- 수정: `globals.css` 끝에 `@media(max-width:767px)` 셸 규칙(markdown-studio·four-cut-comics와 동일) 추가. 기능 로직 변경 없음. 버전 v1.04(코드·package·DB).
- 검수: 빌드, 프로덕션 배포, 운영 화면을 폭 400px 틀(iframe)에 띄워 좌측 메뉴 숨김·위쪽 메뉴 표시·본문 385px·가로 넘침 없음 확인. 실제 휴대폰 터치는 미확인.


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.04)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.05 (banana-canvas)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.06 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/gemini.ts` `tests/browser.mjs` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).
