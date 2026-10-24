# 업무자동화 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 담당 세션(`workspace`·`docbot-prompt`)과 담당이 없는 프로그램의 다음 작업 세션이 칸을 코드·화면과 대조해 확정하기 전까지는 참고 자료로만 쓴다.

> **업무자동화 프로그램(문서 작성·편집, 문서 변환·병합, 업무 관리, 문서 챗봇)을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「업무자동화」 줄 9개 + 병합됨 `persona-style-studio`.
> - 기준 시점: **2026-10-24**, 코드 버전(각 폴더 `src/lib/version.ts`의 `APP_VERSION`) — 워크스페이스 v1.10 · 할 일 v1.10 · 번역 v1.22 · 합치기 v1.08 · 전자책 v1.12 · 챗봇 v1.07 · 글쓰기 v1.13 · 마크다운 v1.21 · 슬라이드 v1.11 · 페르소나 v1.10.
> - 근거: 10개 폴더의 현재 코드(파일 검색), 각 `AGENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-TL-01~07, 역할 파일 `docs/roles/workspace.md`·`docs/roles/docbot-prompt.md`. **운영 DB는 이번에 조회하지 않았다**(DB 버전은 역할 파일 기록만 — 워크스페이스 운영 DB v1.07).
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 둔다.
> - 관계 문서: [업무자동화 완성 기준](WORK_AUTOMATION_COMPLETION_POLICY.md) · [업무자동화 통합 작업표](WORK_AUTOMATION_CONSOLIDATION_TASKS.md) · [공용 기능 지도](SHARED_FEATURE_MAP.md) · [공용 모듈 등록부](SHARED_MODULES.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** 지금은 9개가 서로 다른 일을 해 독립 유지다(개발분석표 §2 J 묶음 「문서 워크스페이스로 묶을지는 미검토」). 새 문서 기능은 가장 가까운 프로그램에 넣고, 새 프로그램을 만들기 전에 §5를 먼저 본다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸에 「미배포」를 붙이고 §6 「미배포 대기」에 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/WORK_AUTOMATION_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/WORK_AUTOMATION_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 코드 버전) | 성격 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| 워크 | AI 업무 워크스페이스 자동화 (`ai-work-workspace` v1.10, **운영 DB v1.07 — 확인 필요**) | 업무 관리 + 문서 작성 | 블록 문서·데이터베이스(보기 12종) → 불러오기/내보내기 → AI 비서 | 서버 DB(원본 litpage 이식) / Claude·OpenAI·Gemini 중 회원 키 / 휴지통·AI 채팅 30일 | 문서·DB·AI를 한곳에, 여러 회사 모델 선택 | 공유·초대·공개 페이지·자동화·AI 회의록 닫힘, Gemini 웹 검색 안 됨, 실시간 동시 편집 없음 | 독립(담당 `workspace`) |
| 할일 | AI 할 일·성과 관리 (`ai-task-planner` v1.10) | 업무 관리 | 할 일 등록 → 집중 타이머 → 성과 차트 → AI 분석 → 백업 | 서버 DB `task_planner_workspaces` / Gemini(분석만) | 계획 대비 실제 시간 기록, 키 없이 대부분 사용 | 팀 공유·알림 없음 | 독립 |
| 번역 | AI 문서번역 자동화 (`document-translator` v1.22) | 문서 변환 | 입력·TXT/PDF/DOCX 가져오기 → 10개 언어 번역 → AI 검수·역번역·용어집 → TXT/MD/DOCX 내보내기 | 서버 DB `dt_projects`(30일) / Gemini | 원문 대조·용어집·검수 흐름, 30일 자동 삭제 갖춤 | 스캔 PDF·HWP·PPTX·XLSX 미지원, 원문 2만 자·5MB | 독립 |
| 합치기 | AI 엑셀·텍스트 합치기 자동화 (`file-merge` v1.08) | 문서 병합 | 엑셀·CSV·텍스트 → 머리글 기준 합치기·나누기 → ZIP | 브라우저만(서버 저장 없음) / AI 없음 | 원본 서식 유지, 파일이 서버로 안 감 | AI 없음, 서식 유지 100만 칸까지 | 독립 |
| 전자책 | eBook Studio (`ebook-studio` v1.12) | 문서 작성 | 파일·웹 주소·붙여넣기 → AI 목차·장 집필 → 표지 → HTML·ZIP·EPUB·인쇄 PDF | 브라우저 `localStorage` / Gemini(+나노바나나 표지) | 여러 출처를 한 권으로, 테마·서체 다양 | **API 권한 판정 없음·스크랩 로그인 없음**(우선 처리), 키를 브라우저에 저장, 구형 모델 선택지 | 독립 |
| 챗봇 | AI 문서 챗봇 자동화 (`ai-doc-chatbot` v1.07) | 문서 챗봇 | 문서 업로드 → 조각·임베딩 → 질문 → 문서 근거(+Tavily) 답변·출처 → 채팅방 | 서버 DB `dcb_*` + 비공개 버킷(30일) / Upstage(+G-1 호환 공급자 미배포) | 출처 있는 답변, HWP 포함 형식 다양, 30일 정리 | 4MB·30개, 벡터 검색만, G-1·G-2 미배포 | 독립(담당 `docbot-prompt`) |
| 글쓰기 | AI 글쓰기 에디터 자동화 (`ai-writing-editor` v1.13) | 문서 작성 | 형식·톤·분량 → 초안(+웹 검색) → 드래그 수정·문체 바꾸기 → 분석 제안 → .md·.txt | 서버 DB(문서 30개) + **공개 이미지 버킷** / Gemini | 부분 수정·분석 제안·문체 바꾸기(병합 B) | Gemini 하나, 문서 30일 삭제 없음, 이미지 공개 주소 | 독립(병합 기준) |
| 마크다운 | 마크다운 문서 자동화 (`markdown-studio` v1.21) | 문서 작성·변환 | 폴더 트리 편집 → 미리보기 → MD·HTML·PDF·DOCX·ZIP → 회원 Drive 동기화 | 브라우저 IndexedDB + 회원 Google Drive / AI 없음 | 수정 이력·휴지통·백업, 본인 Drive | AI 없음, 기기 간 이동은 Drive 연결 필요 | 독립 |
| 슬라이드 | AI 슬라이드 자동화 (`ai-slide-builder` v1.11) | 문서 작성 | PDF·DOCX·XLSX·TXT → 슬라이드 구성(22형식) → 카드 수정 → 16:9 PPTX | 서버 저장 미확인(브라우저 상태) / Gemini | 문서에서 바로 IR·보고서 덱 | 정해진 디자인 위주, 이미지 생성 없음 | 독립 |
| 페르소나 | 페르소나 문체 자동화 (`persona-style-studio` v1.10) | 병합 원본 | **현재 이동 안내만** — API 5개 모두 410(`src/app/api/*/route.ts`) | (옛) DB 페르소나·초안 / Gemini | (옛) 슬라이더 5개·페르소나 → 글쓰기로 이관 | 옛 DB 자료 정리 여부 미확인 | 병합됨 → 글쓰기(2026-10-21, `85020e791`) |

공통: 9개 운영 앱 모두 로그인 + 공통 권한 판정 파일(`src/lib/access.ts`)과 휴대폰 확인 유틸을 갖췄다. 단 **API마다 실제로 부르는지는 프로그램마다 다르다**(§2-6).

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · 「미확인」은 코드를 확인하지 못한 칸 · – 해당 없음. 모든 경로는 그 프로그램 폴더 기준이다.

### 2-1. 문서 작성·편집 (글쓰기 · 마크다운 · 전자책 · 슬라이드 · 워크)

| 기능 | 글쓰기 | 마크다운 | 전자책 | 슬라이드 | 워크 |
|---|---|---|---|---|---|
| AI 초안 생성 | ○ `src/app/api/generate/route.ts`, `src/lib/we/prompts.ts` | × | ○ 장 집필 `src/app/api/ai/chapter/route.ts` | ○ `src/app/api/generate/route.ts`, `src/lib/constants.ts` | ○ AI 비서 `src/litpage/server/ai/service.ts` |
| AI 목차·구성 제안 | × | × | ○ `src/app/api/ai/outline/route.ts` | ○ 문서 분석 `src/app/api/analyze/route.ts` | 미확인 |
| 선택 부분만 AI로 다시 쓰기 | ○ `src/components/editor/BubbleToolbar.tsx`, `src/app/api/rewrite/route.ts` | × | △ 장 단위 다시 생성(`ChapterEditorPanel.tsx`) | △ 카드 하나 다시 만들기 `src/app/api/regenerate/route.ts` | ○ `src/litpage/server/ai/edit.ts` |
| 문체 바꾸기(슬라이더·페르소나) | ○ v1.11 `src/components/editor/StylePanel.tsx`, `src/app/api/style-rewrite/route.ts`, `src/lib/persona/` | × | × | × | × |
| 글 분석 제안(문법·구조) | ○ `src/components/editor/SuggestionPanel.tsx`, `src/app/api/analyze/route.ts` | × | × | × | 미확인 |
| AI 웹 검색 반영 | ○ `src/lib/gemini.ts`(Google 검색 도구) | × | △ 웹 주소 본문 가져오기 `src/app/api/scrape/route.ts` | × | △ OpenAI만(`src/litpage/server/ai/providers/openai.ts`), Gemini 안 됨(카드) |
| 서식 편집기(표·이미지·색) | ○ `src/components/editor/RichToolbar.tsx`, `Editor.tsx` | ○ 마크다운 버튼·단축키 `src/lib/editor/commands.ts` | △ 장 편집 `ChapterEditorPanel.tsx` | △ 카드 편집 `SlideEditor.tsx` | ○ 블록 편집기(카드: 41종) |
| 데이터베이스·여러 보기 | × | × | × | × | ○ (카드: 보기 12종) `src/litpage/server/api/modules/` |
| 폴더·문서 관리 | △ 목록 `src/components/editor/DocumentList.tsx` | ○ `src/components/workspace/DocumentExplorer.tsx` | × | × | ○ |
| 수정 이력 | △ 되돌리기 50단계(편집기 안) | ○ 30개 `src/lib/documents/model.ts`·`repository.ts` | × | × | ○ 버전 기록(카드), `src/litpage/server/history.ts` |
| 휴지통 | × | ○ `src/lib/documents/repository.ts`(30일 안내만, 자동 삭제 안 함) | × | × | ○ 30일 뒤 삭제 `src/litpage/server/retention.ts` |
| 자동 저장 | ○ 서버 `src/lib/documents.ts`(30개) | ○ 브라우저 IndexedDB `src/lib/documents/repository.ts` | ○ 브라우저 `localStorage`(`StudioWorkspace.tsx`) | 미확인 | ○ 서버 |
| AI Prompt 보관함 템플릿 불러오기 | ○ v1.12 `src/app/api/prompt-templates/route.ts`(읽기만) | × | × | × | × |
| 이미지 넣기 | ○ 업로드 `src/app/api/images/route.ts`(공개 버킷) | ○ 마크다운 링크 | ○ AI 표지 `src/app/api/ai/cover/route.ts`, `src/lib/geminiImage.ts` | × | ○ 첨부(카드: 4MB) `src/server/files.ts` |
| 표지·이미지 AI 생성 | × | × | ○ `src/lib/geminiImage.ts`, `src/lib/nanoBananaModels.ts` | × | 미확인(`src/litpage/server/ai/image.ts` 있음) |

### 2-2. 가져오기·내보내기

| 형식 | 글쓰기 | 마크다운 | 전자책 | 슬라이드 | 워크 | 번역 | 챗봇 |
|---|---|---|---|---|---|---|---|
| TXT·MD 가져오기 | ○ `StartPanel.tsx` | ○ `src/components/workspace/ImportCard.tsx` | ○ `src/lib/fileParser.ts` | ○ `src/lib/fileParser.ts` | ○ `src/litpage/server/content/markdown.ts` | ○ `src/lib/translation/import.ts` | ○ |
| DOCX 가져오기 | 미확인 | × | ○ `src/lib/fileParser.ts` | ○ `src/lib/fileParser.ts` | ○ `src/litpage/server/content/docx.ts` | ○ `src/workers/import.worker.ts` | ○ |
| PDF 가져오기 | × | × | × | ○ `src/lib/fileParser.ts` | ○ `src/litpage/server/content/pdf.ts` | ○ 텍스트 PDF 50쪽 `src/workers/import.worker.ts` | ○ 100쪽 이하 `src/lib/chat/upstage.ts` |
| XLSX·CSV 가져오기 | × | × | × | ○ XLSX `src/lib/fileParser.ts` | ○ CSV `src/litpage/server/content/csv.ts` | × | ○ XLSX |
| HWP·PPTX·이미지 | × | × | × | × | 미확인 | × | ○ Upstage 문서 분석 `src/lib/chat/upstage.ts` |
| 웹 주소 가져오기 | × | × | ○ 12개 `src/app/api/scrape/route.ts` | × | 미확인(`src/litpage/server/safefetch.ts` 있음) | × | △ 웹 검색(Tavily) |
| MD·TXT 내보내기 | ○ `Editor.tsx` | ○ `src/lib/export/run.ts` | × | × | ○ `src/litpage/server/content/markdown.ts` | ○ `src/lib/translation/export.ts` | × |
| HTML 내보내기 | × | ○ `src/lib/export/html.ts` | ○ `src/lib/template.ts` | × | ○ `src/litpage/server/content/html.ts` | × | × |
| PDF 내보내기 | × | ○ `src/lib/export/pdf.ts` | ○ 인쇄용 `src/lib/template.ts` | × | 미확인 | × | × |
| DOCX 내보내기 | × | ○ `src/lib/export/docx.ts` | × | × | 미확인 | ○ 서식 있는 DOCX `src/lib/translation/export.ts` | × |
| EPUB | × | × | ○ `src/lib/template.ts` | × | × | × | × |
| PPTX | × | × | × | ○ `src/lib/pptxGenerator.ts` | × | × | × |
| ZIP 묶음 | × | ○ 폴더 구조 유지 | ○ 웹 배포용 `src/lib/template.ts` | × | ○ `src/litpage/server/content/zip.ts` | ○ `src/lib/translation/zip.ts` | × |
| 전체 백업·복원(JSON) | × | ○ `src/lib/documents/backup.ts` | × | × | 미확인 | ○ `src/lib/translation/backup.ts` | × |

### 2-3. 문서 변환·병합 (번역 · 합치기)

| 기능 | 번역 | 합치기 |
|---|---|---|
| 10개 언어 번역 | ○ `src/lib/translation/model.ts`, `gemini.ts` | – |
| AI 문맥·용어·문체 검수 | ○ `src/components/Analysis.tsx`, `src/lib/translation/gemini.ts` | – |
| 역번역 | ○ `src/components/Studio.tsx`(카드·화면 기준) | – |
| 숫자·URL 대조 | ○ 카드 기준, 코드 위치 미확인 | – |
| 개인 용어집(CSV·TXT) | ○ `src/app/api/glossaries/route.ts` | – |
| 엑셀·CSV 머리글 기준 합치기 | – | ○ `src/components/files/ExcelMerge.tsx`, `src/lib/files/table.ts` |
| 엑셀 나누기(시트·열 값·N행) | – | ○ `src/components/files/ExcelSplit.tsx` |
| 원본 서식 유지 | – | ○ `src/lib/files/styled.ts`(100만 칸까지) |
| 텍스트 합치기·나누기(문단 경계) | – | ○ `src/components/files/TextMerge.tsx`, `TextSplit.tsx`, `src/lib/files/text.ts` |
| 인코딩 자동 인식(ANSI·UTF-8) | – | ○ `src/lib/files/text.ts`(카드 기준) |
| 큰 파일 별도 작업자 처리 | ○ `src/workers/import.worker.ts` | ○ `src/lib/files/sheet.worker.ts` |
| 파일을 서버로 보내지 않음 | × (프로젝트 서버 저장) | ○ 브라우저만 |
| 동시 실행·호출 제한 | ○ 1분 30회·처리 중 2개 `supabase/migrations/20261014082202_document_translator_initial.sql` | – |

### 2-4. 업무 관리 (할일 · 워크)

| 기능 | 할일 | 워크 |
|---|---|---|
| 할 일 등록(분류·우선순위·예상 시간) | ○ `src/components/TaskEditor.tsx`, `src/lib/planner/engine.ts` | △ DB 보기로 직접 구성 |
| 집중·휴식 타이머 | ○ `src/lib/planner/engine.ts`, `src/components/Planner.tsx` | × |
| 성과 차트(완료율·예상 대비 실제) | ○ `src/lib/planner/metrics.ts`, `src/components/Overview.tsx` | △ 차트·대시보드 보기(카드) |
| AI 성과 분석 | ○ `src/app/api/analysis/route.ts`, `src/lib/planner/ai.ts` | △ AI 비서 일반 질문 |
| CSV 내보내기·JSON 백업 | ○ `src/lib/planner/csv.ts`, `backup.ts`, `src/components/BackupImport.tsx` | ○ CSV `src/litpage/server/content/csv.ts` |
| 캘린더·타임라인·보드 | × | ○ (카드: 보기 12종) |
| 알림·리마인더 | × | 미확인(`src/litpage/server/reminders.ts` 있음, 열림 여부 미확인) |
| 예약 작업(회원 cron-job.org) | × | × (운영 정리용 Vercel 예약만) |
| AI 회의록 | × | × (로드맵 U6 대기) |

### 2-5. 문서 챗봇 (챗봇)

| 기능 | 챗봇 |
|---|---|
| 문서 업로드(최대 30개·4MB, 큰 파일은 저장소 경유 후 바로 삭제) | ○ `src/app/api/documents/route.ts`, `upload-url/route.ts`, `src/lib/chat/uploadChecks.ts`, `uploads.ts` |
| 비동기 문서 처리 | ○ `src/app/api/documents/async/route.ts` |
| 800자 조각·Upstage 임베딩 | ○ `src/lib/chat/ingest.ts`, `upstage.ts` |
| 관련 조각 검색(벡터) | ○ `src/lib/chat/core.ts` |
| 키워드 혼합 검색 | ○ 기존 v1.05 `src/app/api/chat/route.ts` `findDocHits`·`src/lib/chat/core.ts` `mergeHybrid`. G-3은 역할 유지이며 새 검색 구현이 아님(2026-10-25 담당 확인) |
| 웹 검색 필요 판단 + Tavily | ○ `src/lib/chat/tavily.ts`, `core.ts` |
| 답변 스트리밍·출처 표시 | ○ `src/app/api/chat/route.ts`, `src/components/chat/Markdown.tsx` |
| 채팅방 저장·고정 | ○ `src/app/api/rooms/route.ts`, 마이그레이션 `0007_rooms_pinned.sql` |
| 여러 답변 공급자(G-1) | △ **미배포** `src/lib/compatibleChat/`(`2d56a117b`) |
| 회원별 봇·방별 봇 선택·당시 설정 보존(G-2) | △ **미배포** `src/lib/bots/`, `src/app/api/bots/route.ts`, 마이그레이션 `20261024085152_g2_member_bots.sql`(`07795803c`, 운영 DB 적용은 역할 파일 기록) |
| 역할·입력·문서/웹 자료 경계(G-3) | △ **미배포** `src/lib/chat/prompts.ts`, `bots/core.ts`(`d7dd0d367`), 93개 시험·타입·로컬 빌드. 일반 회원 봇 CRUD/재열기/선택/삭제된 봇·키 미등록 안내 확인. 실제 모델 품질·방/당시 답변·좁은 화면 미검수 |
| 로컬 AI(Ollama, G-5) | × (보류) |
| 여러 문서 선택/분류/저장 본문 미리보기/추출 경고(G-4) | △ **미배포** `952417454`, 문서 상태/분류/경고·새 범위 RPC/조회 RLS 운영 적용. 107개 검사·타입·로컬 빌드·두 회원 SQL/RLS/일반 회원 무료 조작 확인·시험 자료0건. 실제 AI/업로드·파싱·좁은 화면 미검수. [인수인계](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261025_G4.md) |
| 웹 검색 사용량 보기 | ○ `src/app/api/settings/web-stats/route.ts` |

### 2-6. 공통·보안

| 기능 | 워크 | 할일 | 번역 | 합치기 | 전자책 | 챗봇 | 글쓰기 | 마크다운 | 슬라이드 |
|---|---|---|---|---|---|---|---|---|---|
| 페이지 권한 판정 | ○ `src/lib/access.ts` | ○ | ○ | ○ | ○ `src/app/page.tsx` | ○ | ○ | ○ | ○ |
| **모든 쓰기·AI API에 권한 판정** | ○ `api/rpc`·`api/ai/stream`·`api/upload` | ○ `src/lib/planner/api.ts` 경유 | ○ `src/lib/translation/api.ts` 경유 | – (API 없음) | **×** `api/ai/*`·`api/scrape`·`api/user/key`가 `getUser`만 또는 아무 확인 없음 | ○ `src/lib/chat/apiGuard.ts` | ○ `src/lib/aiRoute.ts` 경유 | – (`api/session`만) | △ `api/generate` 등은 `checkProgramAccess`, `api/keys`는 로그인만 |
| 회원 본인 키만(폴백 없음) | ○ `src/server/memberAiKeys.ts` | ○ `src/lib/apiKeys.ts` | ○ `src/lib/apiKeys.ts` | – | △ 저장 키 또는 **브라우저가 보낸 키**(`api/ai/chapter/route.ts`) | ○ `src/lib/apiKeys.ts` | ○ `src/lib/apiKeys.ts` | – | ○ `src/lib/apiKeys.ts` |
| AI 키를 브라우저에 두지 않음 | ○ (`localStorage`는 화면 설정만) | ○ | ○ | – | × `SettingsModal.tsx` `localStorage` | ○ | ○ | – | ○ (`localStorage` 사용 없음) |
| 당해 연도 프롬프트 | ○ `src/litpage/server/ai/prompts.ts` | ○ `src/lib/planner/ai.ts` | ○ `src/lib/translation/gemini.ts` | – | ○ `api/ai/chapter`·`outline` | ○ `src/lib/chat/core.ts` | ○ `src/lib/we/prompts.ts` | – | ○ `src/lib/constants.ts` |
| 생성 데이터 30일 자동 삭제 | ○ AI 채팅 `src/server/aiRetention.ts`, 휴지통 `src/litpage/server/retention.ts` | × (기록 기간 제한 없음 — 결정 대기) | ○ pg_cron `20261014094000_document_translator_retention.sql` | – | – (브라우저) | ○ pg_cron `0001_dcb_init.sql` | × 문서 30개 개수 제한만 `src/lib/documents.ts` | – (브라우저) | 미확인(서버 저장 없음으로 보임) |
| 회원 파일 비공개 저장 | 미확인(`src/server/files.ts`) | – | – | – | – | ○ `dcb-uploads` 비공개 | **×** `ai-writing-editor-images` 공개 버킷 | – | – |
| 서버가 외부 주소를 가져올 때 사설 주소 차단 | ○ `src/litpage/server/safefetch.ts`(AI 공급자·MCP 호출에서 사용) | – | – | – | **×** `src/app/api/scrape/route.ts` | – (Tavily API만) | 미확인 | – | – |
| 사용 안내(/guide) | ○ `src/app/guide/page.tsx` | ○ `TaskPlannerGuideView.tsx` | ○ `src/components/Guide.tsx` | ○ `src/app/(workspace)/guide/page.tsx` | ○ `src/app/guide/page.tsx` | ○ | ○ | ○ | ○ `src/app/guide/page.tsx` |
| 사용 모델(코드 문자열) | 회사별 모델 목록 | gemini-3.8-flash 등 | gemini-3.8-flash·3.5-flash-lite | – | **gemini-2.5-flash 기본, 1.5 선택지** | Upstage Solar | gemini-3.5-flash·2.5-flash | – | gemini-2.5-flash |

## 3. 병합 원본 기능 이관 대조 (출처)

| 원본 기능 | 출처 | 글쓰기로 이관 | 상태 |
|---|---|---|---|
| 슬라이더 5개·프리셋으로 문체 다시쓰기 | `persona-style-studio` | ○ v1.11 「🎚️ 문체 바꾸기」 `StylePanel.tsx`, `api/style-rewrite` | ✅ `85020e791` |
| 기본 페르소나 10명·나만의 페르소나 만들기 | `persona-style-studio` | ○ `src/lib/persona/`, `api/persona-generate`, `api/personas` | ✅ |
| 초안 저장 | `persona-style-studio` `api/drafts` | △ 글쓰기 문서 저장으로 대체(확인 필요) | 확인 필요 |
| 한국어·English 화면 | `persona-style-studio` `components/studio/i18n.ts` | × | 옮기지 않음(확인 필요) |
| 옛 DB 페르소나·초안 자료 | `persona-style-studio` 마이그레이션 `0001_persona_style_tables.sql` | 미확인 | 정리 여부 확인 필요 |

## 4. 기능별 기준 코드 위치 (새로 만들기 전에 읽을 곳)

| 기능 | 기준 파일 | 비고 |
|---|---|---|
| API 권한 판정 도우미 | `ai-writing-editor/src/lib/aiRoute.ts`, `ai-doc-chatbot/src/lib/chat/apiGuard.ts` | 모든 AI 라우트를 한 함수로 묶음 |
| 회원 데이터 30일 자동 삭제(DB) | `document-translator/supabase/migrations/20261014094000_document_translator_retention.sql` | `expires_at` 기본 30일 + pg_cron + RLS에 만료 조건 |
| 업로드 원본 즉시 삭제 | `ai-doc-chatbot/src/lib/chat/uploads.ts` | 비공개 버킷, 읽고 바로 지움 |
| 문서 RAG(조각·임베딩·검색) | `ai-doc-chatbot/src/lib/chat/ingest.ts`, `core.ts` | 공용 재사용 부품(프로그램 비교표 §2) |
| Tavily 웹 검색 | `ai-doc-chatbot/src/lib/chat/tavily.ts` | 회원 키 |
| 여러 AI 공급자 공용 키 | `ai-doc-chatbot/src/lib/compatibleChat/`(미배포) | G-1, `ai-prompt-studio`와 공유 |
| 여러 회사 AI 비서 | `ai-work-workspace/src/litpage/server/ai/providers/`, `src/server/memberAiKeys.ts` | Claude·OpenAI·Gemini |
| 당해 연도·문서는 데이터 지시 | `document-translator/src/lib/translation/gemini.ts`, `ai-doc-chatbot/src/lib/chat/core.ts` | 원문 날짜는 바꾸지 않음 |
| 부분 다시쓰기 편집기 | `ai-writing-editor/src/components/editor/BubbleToolbar.tsx`, `src/app/api/rewrite/route.ts` | |
| 문체·페르소나 | `ai-writing-editor/src/lib/persona/` | 원본은 병합됨 |
| 마크다운 → HTML·PDF·DOCX | `markdown-studio/src/lib/export/` | |
| 브라우저 문서 저장소(이력·휴지통) | `markdown-studio/src/lib/documents/repository.ts` | 회원별 DB 이름 `aimaster-markdown-v1-${userId}` |
| 회원 본인 Google Drive 동기화 | `markdown-studio/src/lib/drive/` | 회원 본인 OAuth 앱 |
| 엑셀 합치기·서식 유지 | `file-merge/src/lib/files/table.ts`, `styled.ts`, `sheet.worker.ts` | 브라우저만 |
| DOCX 내보내기(번역문) | `document-translator/src/lib/translation/export.ts` | |
| PPTX 생성 | `ai-slide-builder/src/lib/pptxGenerator.ts` | pptxgenjs |
| EPUB·전자책 HTML | `ebook-studio/src/lib/template.ts` | |
| PDF·DOCX·XLSX 글 추출 | `ai-slide-builder/src/lib/fileParser.ts`, `document-translator/src/workers/import.worker.ts` | |
| 타이머·성과 지표 | `ai-task-planner/src/lib/planner/engine.ts`, `metrics.ts` | |
| 서버의 외부 주소 안전 가져오기 | `ai-work-workspace/src/litpage/server/safefetch.ts` | 전자책 스크랩에 적용 후보(검토 필요) |
| 이미지 생성 호출·모델 목록 | `ebook-studio/src/lib/geminiImage.ts`, `nanoBananaModels.ts` | 공용 사본 여부 확인 필요(기준 `ai-image-studio`) |

## 5. 병합·독립 방향 (결정된 것)

| 묶음 | 합칠 프로그램 → 기준 | 가져온 기능 | 상태 |
|---|---|---|---|
| 병합 B | `persona-style-studio` → `ai-writing-editor` | 문체 바꾸기·페르소나 | ✅ 2026-10-21 (`85020e791`, 글쓰기 v1.11·페르소나 이동 안내) |
| G-1~G-5 | 외부 EXT-TL-01 AutoGemma → `ai-doc-chatbot`·`ai-prompt-studio` | 여러 공급자·봇·문서 근거·로컬 AI | G-1~G-4 미배포·실제 AI 미검수, G-5 별도 결정(담당 `docbot-prompt`) |
| 독립 | 나머지 8개 | – | 개발분석표 J 묶음: 「문서 워크스페이스로 묶을지는 미검토」 |

원칙: 「병합」은 좋은 기능만 기준 프로그램에 더하는 것이다. 원본은 비공개·이동 안내로 두고 주소는 지우지 않는다.

## 6. 확장 후보·로드맵 (추천 — 구현 전)

| 단계 | 기능 | 넣을 곳 | 출처·근거 | 비용 | 상태 |
|---|---|---|---|---|---|
| 1차 | 전자책 API 권한 판정·스크랩 로그인·사설 주소 차단·브라우저 키 제거 | 전자책 | §2-6 | 빌드 1 | 후보(우선 처리) |
| 1차 | 글쓰기 이미지 비공개 버킷·서명 주소, 문서 30일 정리 | 글쓰기 | §2-6 | 빌드 1 + DB 변경 승인 | 후보(우선 처리, 주인님 결정) |
| 1차 | 워크스페이스 운영 DB 버전 v1.10 맞추기 | 워크 | 역할 파일 | DB 1회 | 담당 대기(주인님 결정) |
| 1차 | 챗봇 G-1·G-2 배포·화면 검수 | 챗봇 | 역할 파일 | 빌드 1 | 담당 대기 |
| 2차 | 전자책 구형 모델 선택지(1.5) 정리 | 전자책 | `SettingsModal.tsx` | 없음 | 확인 필요 |
| 2차 | 챗봇 G-3 역할 유지(기존 혼합 검색 보존)·G-4 여러 문서/분류/미리보기/PDF 경고 | 챗봇 | [G-4 결과](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261025_G4.md) | 회원 키 | G-3·G-4 코드/자동 검사·일반 회원 무료 조작 확인·미배포, 실제 AI/업로드·파싱·좁은 화면 미검수 |
| 2차 | 워크스페이스 AI 회의록(U6)·업무 받은편지함(U7) | 워크 | 로드맵 | DB 변경 승인 | 대기 |
| 3차 | 번역·글쓰기·슬라이드 여러 AI 공급자 | 각 | G-1 공용 키 | – | 후보 |
| 3차 | 「문서 워크스페이스」로 묶기 검토 | – | 개발분석표 J | – | 미검토 |

### 미배포 대기 (업무자동화)

| 프로그램 | 내용 | 근거 |
|---|---|---|
| 챗봇 | G-4 여러 문서/분류/미리보기/PDF 경고·107개 검사·일반 회원 무료 조작 검수 | `952417454`, [인수인계](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261025_G4.md) |
| 챗봇 | G-1 답변 공급자/모델·회원 공용 키·중단 | `2d56a117b`, `docs/PENDING_DEPLOYS.md` |
| 챗봇 | G-2 회원별 봇·방 선택·답변 설정 보존 | `07795803c`, 역할 파일 |
| 챗봇 | G-3 역할/자료 경계·과거 날짜 보존·번역/요약 자동 검색 생략, 93개 검사·일반 회원 설정 검수 | `d7dd0d367`, [인수인계](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261025_G3.md) |
| 슬라이드 | 좌측 메뉴 계정·로그아웃 위치(클래스만) | `22c6cda35`, `docs/PENDING_DEPLOYS.md` |

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-25 | 챗봇 G-4 범위 검색/분류/미리보기/경고·운영 DB/RLS/107개 검사·일반 회원 무료 조작·시험 자료 정리 반영. 실제 AI와 배포는 미완료 | Codex `codex-win-20261025-docbot-g4` |
| 2026-10-25 | docbot-prompt 담당이 챗봇 G-2 일반 회원 검수·G-3 미배포 상태 갱신, 기존 혼합 검색을 새 G-3로 적은 초안 오류 정정. 다른 프로그램 칸은 초안 유지 | Codex `codex-win-20261025-docbot-g3` |
| 2026-10-24 | 문서 처음 작성(초안) — 9개 운영 + 병합 1개 코드 기준, 성격별 4묶음 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
