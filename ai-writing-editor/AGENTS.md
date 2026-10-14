# AI 글쓰기 에디터 자동화 (ai-writing-editor) — 작업 지침

> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md), 설계 배경은 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## 한 줄 요약
주제·형식·톤·분량(+참고 파일·인터넷 검색)으로 초안을 만들거나 기존 글을 붙여 넣어, 에디터에서 문장을 드래그해 고치고(플로팅 툴바) 글 전체 분석 제안(문법·표현·구조·명확성)을 적용한다. 참고 원본은 AI Studio "매직 에디터 (Magic Editor)"(순수 클라이언트 앱)이며 코드는 복제하지 않고 기능 구조만 참고했다. 올인원 그래픽의 이미지 "매직 에디터"와는 다른 프로그램이다.

## 구조
- `src/lib/we/` 순수 로직(단위 테스트 대상): `types`(형식 9·톤·분량·동작·한도), `util`(연도 지침, 정리, JSON 추출, **제안 정규화**, **위치 재탐색 치환·모두 적용**, 제목, 이력), `prompts`(생성·수정·분석 프롬프트, 분석 스키마).
- 서버 전용: `gemini.ts`(모델 폴백 `gemini-3.5-flash → 2.5-flash`, 그라운딩 출처, JSON 재시도, **MAX_TOKENS 감지**), `documents.ts`(문서 CRUD·30개 정리), `apiKeys.ts`, `aiRoute.ts`(`guardAi`).
- API(모두 `checkProgramAccessApi` + `force-dynamic`): `POST /api/generate`, `/api/rewrite`, `/api/analyze`, `GET/POST/PUT/DELETE /api/documents`, `/api/keys`(+`/test`).
- 화면: `/dashboard`(`StartPanel` + 최근 문서), `/editor/[id]`(`Editor` + `FloatingToolbar` + `SuggestionPanel`, `?analyze=1`이면 자동 분석), `/documents`, `/settings`, `/guide`. 툴바 위치는 `components/editor/caret.ts`의 거울 요소 좌표 계산.
- DB: `ai_writing_editor_documents`(RLS owner-only, 서버는 service role + `user_id` 필터). 키는 공용 `user_api_keys`의 기존 provider `gemini`만 쓴다 — 제약 변경 없음.

## 지킬 것
- 키는 회원 본인 Gemini 키만. 없으면 `needKey` 안내, 폴백 금지.
- 모든 프롬프트에 `yearGuard()`로 당해 연도·오늘 날짜 주입(핵심 원칙 8번). 사용자 글은 "데이터"로 취급(프롬프트 인젝션 방지 문구 유지).
- **사고(thinking) 토큰은 `maxOutputTokens`에 포함된다**: 한도를 작게 잡으면 답이 중간에 끊기거나 사고 내용이 섞여 나온다(수정 호출 1,024에서 실제 발생). 수정은 6,144, 키 확인은 2,048. 끊기면(`truncated`) 본문에 적용하지 말고 오류로 알린다.
- 제안 적용은 항상 **적용 시점에 본문에서 원문을 다시 찾아** 한 곳만 바꾼다(원본의 `String.replace` 첫 일치 방식 금지). 못 찾으면 목록에서 빼고 안내.
- 본문은 plain textarea다: 마크다운 강조(`**`)·구분선은 쓰지 말라고 프롬프트에 명시했다. 제목은 `deriveTitle()`이 기호·"메타 제목:" 라벨을 제거해 만든다.
- 버전은 `src/lib/version.ts`와 DB `programs.version`을 함께 올린다. Supabase MCP `execute_sql`은 문장별로 보낸다.

## 검수
- `npm test`(순수 로직 11건), `npm run test:browser`(보이는 Chrome, 모의 API 14건), `npm run build`.
- 실제 호출: `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/real-call.mts [generate|generate-web|rewrite|instruction|analyze]`(운영자 본인 Gemini 키). 출력은 파일로 리다이렉트. `rewrite-debug.mts`(사고 토큰·truncated 확인), `grounding-debug.mts`(모델별 출처 구조).
