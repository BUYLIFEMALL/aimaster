# AI 리버스 프롬프트 자동화 (reverse-prompt) — 작업 지침

> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md), 설계 배경은 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## 한 줄 요약
이미지·동영상·오디오 파일 → (브라우저가 비공개 임시 버킷에 직접 업로드) → 서버가 Gemini로 분석 → 대상 도구(Midjourney·DALL·E·Flux·Sora·Veo·Runway·Kling·Suno·Udio)용 영어 프롬프트 + 구조화 JSON → 편집·재조합·기록·내보내기. 참고 원본은 "Reverse Prompt Architect"(개발자 GPT PARK, 순수 클라이언트 앱)이며 코드는 복제하지 않고 흐름·스키마 구조만 참고했다.

## 구조
- `src/lib/rpa/` 순수 로직(단위 테스트 대상): `types`(종류·옵션·대상 도구), `media`(MIME 판별·크기 제한·임시 경로 소유 검증·썸네일 검증), `schemas`(Gemini responseSchema 3종·정규화·Midjourney 명령어 조립·Markdown), `prompts`(시스템 지침·연도 주입·대상 도구/길이/메모 반영), `validate`(옵션 정리), `thumb`(브라우저 전용 미리보기 생성).
- `src/lib/gemini.ts`(서버): 모델 체인 `flash: 3.5-flash → 2.5-flash`, `pro: 3.1-pro-preview → 3.5-flash → 2.5-flash`. 이미지는 인라인, 동영상·오디오는 **Files API 업로드 → PROCESSING 폴링(최대 240초) → 분석 → 원격 파일 삭제(finally)**. 형식 어긋나면 모델당 1회 재시도, 안전 필터는 `safety` 오류로 구분.
- API(모두 `checkProgramAccessApi` + `force-dynamic`): `POST/DELETE /api/upload`(서명 URL 발급·임시 파일 즉시 삭제, 본인 폴더만), `POST /api/analyze`(`maxDuration 300`, Storage에서 읽기→분석→기록 저장, 임시 파일은 다시 분석용으로 남김), `GET /api/history`, `GET/PATCH/DELETE /api/history/[id]`, `/api/keys`.
- 화면: `/open`→`/analyze`(`components/studio/Analyzer.tsx` 업로드·옵션·결과), `/history`, `/settings`(API키등록·플랫폼연동), `/guide`.
- DB: `reverse_prompt_history`(RLS owner-only, 서버는 service role + `user_id` 필터, 최대 100건·즐겨찾기 보존), Storage 비공개 버킷 `reverse-prompt-tmp`(정책 없음 = 서버만 서명/읽기/삭제, 50MB 제한).

## 지킬 것
- 키는 회원 본인 Gemini 키만(`user_api_keys.provider = gemini`). 없으면 `needKey` 안내, 폴백 금지.
- 임시 파일 경로는 항상 `<uid>/<uuid>.<ext>` 형식을 `isOwnTempPath`로 검증(다른 회원 파일 접근 차단). 1시간 지난 본인 파일은 업로드 때 정리(`TEMP_TTL_MS`).
- 원본 파일은 기록에 저장하지 않는다(결과 JSON·옵션·≤20KB 미리보기만).
- Midjourney가 아닌 대상 도구는 `full_command == prompt`(파라미터 플래그를 붙이지 않는다) — `normalize(media, raw, target)`.
- 프롬프트에는 당해 연도 주입(`yearGuard`). 인물은 파일에 보이는 그대로 묘사한다(한국인 기본 규칙 비적용 — 역설계이므로).
- 버전은 `src/lib/version.ts`와 DB `programs.version`을 함께 올린다.
- Supabase MCP `execute_sql`은 여러 문장을 한 번에 보내면 거부될 수 있다 → 문장별로 보낸다.

## 검수
- `npm test`(순수 로직 15건), `npm run test:browser`(보이는 Chrome, 모의 API·Storage 16건, `test-artifacts/sample.jpg` 필요 — 임의 JPG를 두면 됨), `npm run build`.
- 실제 호출: `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/real-call.mts image|audio|video`(운영자 본인 키, 2026-10-14: 이미지 12초·오디오 14초·영상 18초, 3.5-flash). 출력을 파이프(`| tail`)로 받으면 끝날 때까지 보이지 않으니 파일로 리다이렉트한다.

## 2026-10-14 v1.02 — 모바일 셸 CSS 추가 (Claude Code)

- 증상: 767px 이하에서도 좌측 메뉴가 남아 본문이 눌림. 원인: `Sidebar.tsx`의 `.mobile-sidebar`(위쪽 접는 메뉴)는 있었지만 `src/app/globals.css`에 전환 규칙이 없었음(복사한 뼈대 공통 누락).
- 수정: `globals.css` 끝에 `@media(max-width:767px)` 셸 규칙(markdown-studio·four-cut-comics와 동일) 추가. 기능 로직 변경 없음. 버전 v1.02(코드·package·DB).
- 검수: 빌드, 프로덕션 배포, 운영 화면을 폭 400px 틀(iframe)에 띄워 좌측 메뉴 숨김·위쪽 메뉴 표시·본문 385px·가로 넘침 없음 확인. 실제 휴대폰 터치는 미확인.
