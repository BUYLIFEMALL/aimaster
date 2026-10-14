# AI 글쓰기 에디터 자동화 (ai-writing-editor) — 작업 지침 (v1.04: 서식 에디터 + 표·이미지·색·정렬)

> 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 읽는다. 이어받을 때는 [`docs/CLI_HANDOFF.md`](docs/CLI_HANDOFF.md), 설계 배경은 [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## 한 줄 요약
주제·형식·톤·분량(+참고 파일·인터넷 검색)으로 초안을 만들거나 기존 글을 붙여 넣어, **Tiptap 서식 에디터**에서 문장을 드래그해 고치고(버블 툴바) 글 전체 분석 제안(문법·표현·구조·명확성)을 적용한다. **표·이미지·글자 색·형광펜·밑줄·정렬**까지 지원하며, 본문은 문서마다 `content_type`(markdown | html)으로 저장된다(이전 문서·AI 초안은 마크다운, 편집하면 HTML). 참고 원본은 AI Studio "매직 에디터 (Magic Editor)"(순수 클라이언트 앱)이며 코드는 복제하지 않고 기능 구조만 참고했다. 올인원 그래픽의 이미지 "매직 에디터"와는 다른 프로그램이다.

## 구조
- `src/lib/we/` 순수 로직(단위 테스트 대상): `types`(형식 9·톤·분량·동작·한도), `util`(연도 지침, 정리, JSON 추출, **제안 정규화**, 평문 위치 재탐색 치환, 제목), `prompts`(생성·수정·분석 프롬프트, 분석 스키마), **`pmText`(ProseMirror 문서에서 평문 위치 찾기 — 서식으로 나뉜 텍스트·hard break 대응)**.
- 서버 전용: `gemini.ts`(모델 폴백 `gemini-3.5-flash → 2.5-flash`, 그라운딩 출처, JSON 재시도, **MAX_TOKENS 감지**), `documents.ts`(문서 CRUD·30개 정리), `apiKeys.ts`, `aiRoute.ts`(`guardAi`).
- API(모두 `checkProgramAccessApi` + `force-dynamic`): `POST /api/generate`, `/api/rewrite`, `/api/analyze`, `GET/POST/PUT/DELETE /api/documents`, `/api/keys`(+`/test`).
- 화면: `/dashboard`(`StartPanel` + 최근 문서), `/editor/[id]`(`Editor`=Tiptap `useEditor` + `RichToolbar`(서식) + `BubbleToolbar`(AI 수정, Tiptap BubbleMenu) + `SuggestionPanel`, `?analyze=1`이면 자동 분석), `/documents`, `/settings`, `/guide`. 패키지는 `@tiptap/* 3.31.4`·`@floating-ui/dom 1.8.0` 정확 버전 고정.
- DB: `ai_writing_editor_documents`(RLS owner-only, 서버는 service role + `user_id` 필터). 키는 공용 `user_api_keys`의 기존 provider `gemini`만 쓴다 — 제약 변경 없음.

## 지킬 것
- 키는 회원 본인 Gemini 키만. 없으면 `needKey` 안내, 폴백 금지.
- 모든 프롬프트에 `yearGuard()`로 당해 연도·오늘 날짜 주입(핵심 원칙 8번). 사용자 글은 "데이터"로 취급(프롬프트 인젝션 방지 문구 유지).
- **사고(thinking) 토큰은 `maxOutputTokens`에 포함된다**: 한도를 작게 잡으면 답이 중간에 끊기거나 사고 내용이 섞여 나온다(수정 호출 1,024에서 실제 발생). 수정은 6,144, 키 확인은 2,048. 끊기면(`truncated`) 본문에 적용하지 말고 오류로 알린다.
- 제안 적용은 항상 **적용 시점에 본문에서 원문을 다시 찾아** 한 곳만 바꾼다(원본의 `String.replace` 첫 일치 방식 금지). 못 찾으면 목록에서 빼고 안내.
- **저장 형식은 `content_type`**: 새로 편집·저장하면 `editor.getHTML()`(content_type=html), 이전 문서·AI 초안·기존 글 분석 시작은 마크다운. 로드는 `contentType`을 그대로 넘기며 마크다운일 때 `breaks: true`. HTML을 쓰는 이유: 글자 색(`TextStyle/Color`)·정렬(`TextAlign`)은 마크다운 표현이 없다. `.md`·마크다운 복사는 `getMarkdown()`이라 색·정렬·형광펜·이미지 크기가 빠진다(화면에도 안내). 서버는 HTML을 렌더링하지 않고 평문 변환(`htmlToPlain`)만 한다 — 에디터 스키마가 다시 읽을 때 허용 노드만 남는다. AI 프롬프트는 마크다운 서식과 GFM 표를 허용한다(HTML·이미지·색 금지). 제목은 `deriveTitle()`이 기호·"메타 제목:" 라벨을 제거해 만든다.
- AI 수정 결과는 `editor.markdown.parse()`로 노드화해 선택 범위에 넣는다(한 문단이면 인라인만 넣어 문단이 쪼개지지 않게). 분석 제안은 `insertText`로 바꿔 그 자리의 서식(굵게·링크)을 이어받는다. 실행 취소는 Tiptap 이력(Ctrl+Z)이 AI 수정·제안 적용까지 모두 되돌린다.
- 분석·수정에 보내는 텍스트는 평문(`getText({ blockSeparator: 빈 줄 })`, `rangeText`도 같은 규칙). 제안 위치는 적용 시점에 `findText`가 문서의 텍스트 블록을 빈 줄로 이어 붙인 평문(`flatten`)에서 다시 찾는다 — **여러 문단에 걸친 제안도 찾고**, 교체문에 빈 줄이 없으면 `insertText`로 문단을 하나로 합치며, 있으면 문단 수만큼 나눈다.
- **이미지**: 브라우저가 긴 변 1,600px로 줄여 `POST /api/images`(multipart)로 올리고(Vercel 본문 4.5MB 한도), 서버가 매직 바이트(`we/imageSniff.ts`)로 형식을 다시 검사해 **공개 버킷** `ai-writing-editor-images/<uid>/<uuid>.<ext>`에 저장 → 공개 주소를 `<img src>`로 쓴다(서식 복사·.html·블로그 붙여넣기가 깨지지 않게). 회원당 60개, 캐시 1시간. 문서 삭제·정리 시 **다른 문서가 쓰지 않는** 이미지만 지운다(`documents.ts` `cleanupImages`). 붙여넣기·드롭도 업로드 후 삽입(base64 금지: `allowBase64:false`).
- 버전은 `src/lib/version.ts`와 DB `programs.version`을 함께 올린다. Supabase MCP `execute_sql`은 문장별로 보낸다.

## 검수
- `npm test`(순수 로직 17건: 위치 찾기·여러 문단·HTML 평문·이미지 판별), `npm run test:browser`(보이는 Chrome, 모의 API 20건: 마크다운/HTML 렌더링·버블 툴바·서식 도구·표·이미지(선택·붙여넣기·실패)·밑줄/색/형광펜/정렬·문단 병합 제안·서식 복사 HTML), `npm run build`. 실제 인프라 검증: `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/image-real.mts`(업로드·공개 주소·문서 삭제 시 이미지 정리). 하네스 팁: 선택이 남아 있는 곳을 바로 3중 클릭하면 브라우저가 텍스트 끌기로 처리하므로 먼저 다른 곳을 클릭해 선택을 푼다; Tiptap `focus()`는 다음 프레임에 DOM 선택을 반영하므로 `waitForFunction`으로 기다린다.
- 실제 호출: `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/real-call.mts [generate|generate-web|rewrite|instruction|analyze]`(운영자 본인 Gemini 키). 출력은 파일로 리다이렉트. `rewrite-debug.mts`(사고 토큰·truncated 확인), `grounding-debug.mts`(모델별 출처 구조).

## 2026-10-14 v1.06 — 모바일 셸 CSS 추가 (Claude Code)

- 증상: 767px 이하에서도 좌측 메뉴가 남아 본문이 눌림. 원인: `Sidebar.tsx`의 `.mobile-sidebar`(위쪽 접는 메뉴)는 있었지만 `src/app/globals.css`에 전환 규칙이 없었음(복사한 뼈대 공통 누락).
- 수정: `globals.css` 끝에 `@media(max-width:767px)` 셸 규칙(markdown-studio·four-cut-comics와 동일) 추가. 기능 로직 변경 없음. 버전 v1.06(코드·package·DB).
- 검수: 빌드, 프로덕션 배포, 운영 화면을 폭 400px 틀(iframe)에 띄워 좌측 메뉴 숨김·위쪽 메뉴 표시·본문 385px·가로 넘침 없음 확인. 실제 휴대폰 터치는 미확인.
