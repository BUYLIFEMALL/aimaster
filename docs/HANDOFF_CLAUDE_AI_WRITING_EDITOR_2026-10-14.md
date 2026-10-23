# Claude Code 인수인계 — AI 글쓰기 에디터 자동화 (`ai-writing-editor`) v1.01 ~ v1.05 (2026-10-14)

> 작성: Claude Code (주인님 지시 "인수인계 문서 만들어줘", 2026-10-14)
> 읽는 순서: 루트 `CLAUDE.md` → `docs/HANDOFF.md` → `docs/ERROR_LESSONS.md` → **이 문서** → `ai-writing-editor/AGENTS.md`(구조·규칙) → `ai-writing-editor/docs/CLI_HANDOFF.md`(검증·남은 일).
> 추가 전용 문서입니다. 새 작업이 생기면 맨 아래에 날짜 절을 덧붙이고 기존 내용은 지우지 않습니다.

---

## 1. 한눈에 보기

| 항목 | 값 |
|---|---|
| 이름 / slug | AI 글쓰기 에디터 자동화 / `ai-writing-editor` (주인님 확정) |
| 운영 주소 | https://ai-writing-editor.buylife.xyz (Vercel `buylife/ai-writing-editor`, Git 미연동, CLI 업로드 배포) |
| 현재 버전 | **v1.05** (코드 `src/lib/version.ts` = `package.json` 1.0.5 = DB `programs.version`) |
| 카테고리·등급 | Tools, 최소 등급 일반, 배지 `new`(FREE 아님), 요금제 1·2·3개월(1/2/3만원), VIP 등급 접근, 한국인 실사 16:9 썸네일 |
| 원본 | AI Studio "매직 에디터 (Magic Editor)" `apps/138f85e0-2a10-4056-bed0-a4d67714c8a0` — **글쓰기 도구**(이미지 편집 아님, 올인원 그래픽의 이미지 "매직 에디터"와 별개). 코드는 복제하지 않고 기능 구조만 참고 |
| 키 | 회원 본인 Gemini 키만(`user_api_keys.provider=gemini`), 폴백 없음, 다른 연동 없음 |
| 모델 | `gemini-3.5-flash → gemini-2.5-flash` 폴백, 인터넷 검색은 구글 검색 그라운딩 |

### 커밋
| 버전 | 커밋 | 내용 |
|---|---|---|
| v1.02(첫 배포) | `aec08d64` | 초안 생성·플로팅 툴바 수정·글 분석 제안 적용·자동 저장 (v1.01 → 같은 날 v1.02로 보정) |
| v1.03 | `8e6ae8b7` | Tiptap 서식 에디터(마크다운 저장), 버블 AI 툴바, 서식 도구, 서식 복사 |
| v1.05 | `8365a893` | 표·이미지·글자 색·형광펜·밑줄·정렬, 여러 문단 제안, HTML 저장(`content_type`), 이미지 공개 버킷 |
| 플랜 | (같은 커밋 계열) | `ai-writing-editor/docs/DEVELOPMENT_PLAN.md` |

---

## 2. 기능 지도

| 영역 | 동작 | 핵심 파일 |
|---|---|---|
| 새 글 생성 | 주제 + 형식 9종(블로그·에세이·이메일·보고서·보도자료·자기소개서·제품 소개글·SNS·자유) + 톤 4 + 분량 3 + 참고 파일(.txt/.md/.csv 30,000자) + 인터넷 검색(출처 표시) | `components/editor/StartPanel.tsx`, `app/api/generate`, `lib/we/prompts.ts` |
| 기존 글 분석 | 붙여넣기·파일 → 에디터가 열리며 자동 분석(`?analyze=1`) | `StartPanel.tsx`, `Editor.tsx` |
| 서식 에디터 | Tiptap(ProseMirror) — 제목1~3, 굵게·기울임·밑줄·취소선·코드, 글자 색 9·형광펜 6, 정렬, 목록·번호·인용, 표, 이미지, 링크, 구분선, 실행 취소/다시 실행 | `components/editor/Editor.tsx`, `RichToolbar.tsx` |
| 선택 AI 수정 | 문장 선택 → BubbleMenu: 다시쓰기·짧게·자세하게·전문적으로·친근하게 + 직접 지시 + 굵게/기울임 | `BubbleToolbar.tsx`, `app/api/rewrite` |
| 글 분석 제안 | 문법·표현·구조·명확성 분류, 적용·본문에서 보기·무시·모두 적용, **적용 시점에 위치 재탐색**, 문단 경계를 넘는 제안 지원 | `SuggestionPanel.tsx`, `lib/we/pmText.ts`, `app/api/analyze` |
| 이미지 | 파일 선택·붙여넣기·끌어놓기 → 브라우저에서 1,600px로 축소 → 서버 업로드 → 공개 주소, alt·크기·삭제 메뉴 | `imageUpload.ts`, `ImageMenu.tsx`, `lib/images.ts`, `app/api/images` |
| 저장·내보내기 | 1.5초 자동 저장(문서 30개), 서식 복사(HTML+텍스트), 마크다운 복사, .md/.html/.txt | `Editor.tsx`, `lib/documents.ts` |
| 문서 | 목록·삭제(미사용 이미지 함께 정리) | `DocumentList.tsx`, `app/api/documents` |
| 키·매뉴얼 | 키 등록·연결 확인, 사용 매뉴얼(표·이미지·색·FAQ 포함) | `KeyManager.tsx`, `app/(workspace)/guide` |

---

## 3. 저장 형식과 데이터 구조 (가장 중요한 설계 결정)

- **`ai_writing_editor_documents.content_type` = `markdown` | `html`**.
  - 이전 문서·AI 초안·"기존 글 분석" 시작은 마크다운. 에디터에서 편집·저장하면 `editor.getHTML()`을 `html`로 저장.
  - HTML을 쓰는 이유: 글자 색·정렬은 마크다운에 표현이 없다(표·이미지·밑줄·형광펜은 가능). 서버는 HTML을 렌더링하지 않고 평문 변환(`htmlToPlain`)만 한다 — 다시 열 때 에디터 스키마가 허용 노드만 남긴다.
  - `.md`·마크다운 복사는 `getMarkdown()`이라 색·정렬·형광펜·이미지 크기가 빠진다(화면·매뉴얼에 안내).
- 로드: `useEditor({ content, contentType })` — 마크다운이면 `Markdown` 확장 + `breaks: true`(옛 평문의 단일 줄바꿈 보존).
- 분석·수정에 보내는 텍스트는 **평문**: `editor.getText({ blockSeparator: "\n\n" })`, `rangeText`도 같은 규칙(블록 사이 빈 줄, hard break는 줄바꿈).
- 제안 위치 찾기(`pmText.ts`): 텍스트 블록을 빈 줄로 이어 붙인 평문(`flatten`)과 글자별 문서 위치 표를 만들어 찾는다. 서식(굵게·링크)으로 텍스트 노드가 나뉘어도, hard break·여러 문단에 걸쳐도 동작. 교체는 한 문단이면 `tr.insertText`(그 자리 서식 유지), 문단이 여럿이면 문단 노드로 삽입.
- **이미지**: 공개 버킷 `ai-writing-editor-images/<uid>/<uuid>.<ext>`(추측 불가능한 이름), 회원당 60개, 캐시 1시간. 서버가 매직 바이트(`lib/we/imageSniff.ts`)로 형식을 재검사. 문서 삭제 시 **다른 문서가 쓰지 않는** 이미지만 삭제(`documents.ts` `cleanupImages`). 삭제 후에도 CDN 캐시로 공개 주소가 최대 1시간 응답할 수 있다(실측).

### DB 마이그레이션
| 파일 | 내용 |
|---|---|
| `supabase/migrations/0001_documents.sql` | 문서 테이블 + RLS owner-only |
| `0002_register_program.sql` | `programs` 등록·요금제 3종·VIP 접근 |
| `0003_content_type_and_images.sql` | `content_type` 컬럼 + 공개 버킷 |

---

## 4. 지켜야 할 규칙·함정 (다음 작업자 필독)

1. **키는 회원 본인 것만.** 없으면 `needKey` 안내, 운영자·다른 회원 키 폴백 금지. (SDK는 환경변수에 `GOOGLE_API_KEY`가 있어도 생성자에 넘긴 `apiKey`가 우선 — 가짜 키 실패 시험으로 확인.)
2. **사고(thinking) 토큰이 `maxOutputTokens`에 포함된다.** 한도를 작게 잡으면 답이 끊기거나 사고 내용이 섞인다(수정 호출 1,024에서 실제 발생). 수정은 6,144, 키 확인은 2,048. `finishReason=MAX_TOKENS`(`truncated`)면 본문에 적용하지 않는다.
3. 모든 프롬프트에 `yearGuard()`로 당해 연도·오늘 날짜 주입(핵심 원칙 8번). 사용자 글은 "데이터"로 취급하는 문구 유지.
4. 제안 적용은 **항상 적용 시점에 본문에서 다시 찾아** 바꾼다(원본의 `String.replace` 첫 일치 방식 금지). 못 찾으면 목록에서 빼고 안내.
5. 마크다운으로 표현 안 되는 서식을 AI가 쓰게 하지 않는다: 프롬프트는 마크다운 서식·GFM 표만 허용, HTML·이미지·색 금지.
6. 이미지 붙여넣기는 base64 금지(`allowBase64:false`), 항상 업로드 후 주소로 삽입. 이미지가 선택된 상태에서 붙여넣으면 그 이미지가 교체된다(에디터 표준 동작).
7. BubbleMenu(`ImageMenu`)는 에디터 또는 메뉴 입력칸에 포커스가 있을 때만 보이게 한다(문서 첫 노드가 이미지면 열자마자 선택되는 문제 방지).
8. 패키지는 `@tiptap/* 3.31.4`, `@floating-ui/dom 1.8.0` 정확 버전 고정(출시 2주 경과분). Next.js에서는 `immediatelyRender:false`, BubbleMenu는 `@tiptap/react/menus`.
9. 셸 here-doc에 한글·따옴표·정규식이 든 파일 내용을 넣지 않는다(파일은 Write/Edit 도구, 스크립트는 파일로 저장해 실행).
10. 버전은 `version.ts`·`package.json`·DB `programs.version`을 함께 올린다. Supabase MCP `execute_sql`은 문장별로 보낸다.

---

## 5. 검수·운영 방법

| 목적 | 명령 / 방법 |
|---|---|
| 단위 시험(17건) | `cd ai-writing-editor && npm test` — 위치 찾기(ProseMirror 스키마, DOM 없음)·여러 문단·HTML 평문·이미지 판별·프롬프트·정규화 |
| 화면 시험(20건) | `npm run test:browser` — 보이는 Chrome, 모의 API. 팁: 선택이 남은 곳을 바로 3중 클릭하면 텍스트 끌기로 처리되니 먼저 다른 곳을 클릭, Tiptap `focus()`는 다음 프레임에 DOM 선택을 반영 |
| 실제 Gemini 호출 | `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/real-call.mts [generate\|generate-web\|rewrite\|instruction\|analyze]` (운영자 본인 계정 키, 출력은 파일로 리다이렉트) |
| 실제 Storage·DB | `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/image-real.mts` (업로드·공개 주소·문서 삭제 시 정리·공유 이미지 보존) |
| 디버그 스크립트 | `rewrite-debug.mts`(사고 토큰·truncated), `grounding-debug.mts`(모델별 출처 구조) |
| 빌드·배포 | `npm run build` → `vercel deploy --prod --yes --scope buylife` → DB 버전 갱신 |
| 운영 확인 | 로그인된 Chrome에서 `/dashboard` → 초안 생성 → 문단 선택 수정 → 글 분석 → 이미지 붙여넣기 → 새로고침 유지. 확인 후 테스트 문서 삭제(이미지도 함께 삭제됨) |

`test-artifacts/`는 `.gitignore`라 커밋되지 않는다(스크립트·스크린샷은 로컬에만 있음 — 필요하면 위 설명으로 재작성).

---

## 6. 남은 일·한계

| # | 항목 | 비고 |
|---|---|---|
| 1 | 일반 회원(buylifemall@naver.com) 계정으로 로그인한 확인 | 비밀번호 입력은 에이전트가 하지 않음 — 주인님이 로그인 후 이어서 확인 |
| 2 | 이미지가 공개 주소 | 개인정보 이미지는 넣지 않도록 FAQ 안내. 접근 제한이 필요하면 비공개 버킷 + 서명 주소(저장 시 경로 치환) 구조로 변경(서식 복사 호환성 저하) |
| 3 | `.md` 내보내기 손실 | 글자 색·형광펜·정렬·이미지 크기 — 화면·매뉴얼 안내 완료 |
| 4 | 표 병합 셀·셀 안 여러 문단 | 마크다운 내보내기에서 단순화 |
| 5 | 인터넷 검색 출처 | 모델이 실제로 검색했을 때만 붙음(프롬프트에 "반드시 검색"을 넣었지만 보장 아님) |
| 6 | 후속 아이디어 | 문서 버전 기록, 제안 diff 미리보기, 페르소나 문체 자동화 연결, 이미지 AI 생성 |

---

## 7. 같은 날 만든 관련 프로그램

세션 전체 요약은 `docs/HANDOFF_CLAUDE_SESSION_2026-10-14.md`(reverse-prompt·thumbnail-master·banana-canvas·blog-keyword·ai-task-planner v1.05 포함). 신규 프로그램 등록 7단계 체크리스트도 그 문서 3절에 있다. `ai-writing-editor`는 `blog-keyword`를 골격으로 복사해 만들었으므로 구조(`access.ts`·`proxy.ts`·사이드바·키 관리)가 같다.
