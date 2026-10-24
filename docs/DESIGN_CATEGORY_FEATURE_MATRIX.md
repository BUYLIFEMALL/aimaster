# 디자인 카테고리 기능 상세 비교표 (기준 문서)

> **이 문서는 「디자인」 카테고리 프로그램(콘티·랜딩 기획·UI 설계)용이며, 모든 프로그램의 화면 디자인 지침인 루트 [`DESIGN.md`](../DESIGN.md)와 다르다.** 화면 테마·템플릿 이름은 `DESIGN.md` 카탈로그를 본다.

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 디자인 카테고리는 담당 역할이 아직 없다. 담당이 칸을 코드·화면과 대조해 확정하기 전까지는 참고 자료로만 쓴다.

> **디자인 카테고리 프로그램(콘티·화면 설계·랜딩 기획·UI 코드)을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「디자인」 줄의 `cinematic-storyboard-studio`·`landing-architect`·`ui-canvas`와 병합됨 `ai-web-ui`(폴더 `react-ui-showcase/`).
> - 기준 시점: **2026-10-24**, 코드 버전(각 폴더 `src/lib/version.ts` `APP_VERSION`) 콘티 v1.18 · 랜딩 v1.14 · UI 설계 v1.14 · 웹UI v1.07. 세 운영 버전과 웹UI v1.07은 모두 2026-10-23 Next.js 보안 업데이트 배포 커밋(`5cf72196a`·`0153bf77a`·`5c2b3337a`·`fb64f31a2`)에서 올랐다.
> - 근거: 네 폴더의 현재 코드(파일 검색), 각 `AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-MM-03·EXT-MKT-01·EXT-TL-10, `git log`. **운영 DB는 이번에 조회하지 않았다**(공개 여부·배지·권한 회원 수는 문서 기록 기준).
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 둔다.
> - 관계 문서: [디자인 카테고리 완성 기준](DESIGN_CATEGORY_COMPLETION_POLICY.md) · [디자인 카테고리 통합 작업표](DESIGN_CATEGORY_CONSOLIDATION_TASKS.md) · [공용 기능 지도](SHARED_FEATURE_MAP.md) · [공용 모듈 등록부](SHARED_MODULES.md) · [이미지 생성 프롬프트 규칙](IMAGE_PROMPT_RULES.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** 「영상 장면을 미리 그려 보는 것」은 `cinematic-storyboard-studio`, 「무엇을 어떤 순서로 말할지(기획안·HTML 시안)」는 `landing-architect`, 「화면을 직접 배치하고 코드로 넘기는 것」은 `ui-canvas`. 병합된 `ai-web-ui`에는 새 기능을 넣지 않는다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸을 바꾸지 말고 §6 「미배포 대기」에 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/DESIGN_CATEGORY_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/DESIGN_CATEGORY_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 버전) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| 콘티 | 시네마틱 스토리보드 자동화 (`cinematic-storyboard-studio` v1.18) | 영상 콘티 **기준** | 참고 이미지 1장 → 분석(키프레임 9) → 9컷 콘택트 시트 → 3×3 자르기·ZIP → 영상 프롬프트 | 표 `storyboard_projects`(RLS) + 비공개 버킷 `storyboard-ai`·서명 주소, 30개 한도, 30일 정리 / 글 `gemini-2.5-flash`, 이미지 `gemini-3.1-flash-lite-image`·`gemini-3-pro-image`(공용 사본) / 회원 본인 Gemini 키 | 프로젝트로 이어보기, 동시 렌더 선점, 바나나·4컷·인물사진에서 받기, 한국어·English | 9컷 고정, 실제 영상 생성 없음, 0.5초 장면이 생길 수 있음, 글 모델이 구형(`gemini-2.5-flash`) | 독립(기준) |
| 랜딩 | AI 랜딩페이지 기획 자동화 (`landing-architect` v1.14) | 랜딩 기획·HTML 시안 **기준** | 주제·타겟·목표 → 기획안 JSON(섹션·전략·디자인 시스템·이미지 자산·서브 페이지) → 섹션 수정·재생성 → 단일 HTML → 내려받기 / UI 설계로 보내기 | 표 `landing_architect_projects`(RLS), 50개 한도, **30일 정리 없음** / `gemini-3.1-pro-preview` → `gemini-2.5-flash` 폴백 / 회원 본인 Gemini + 사진 키 3종 | AI 없이 UI 설계로 넘기기(서브 페이지·실사진), 취소 버튼, 저장 충돌 방지 | HTML 한 파일 시안(폼 전송 등 실제 기능 없음), 스톡 사진이라 한국인 인물 보장 없음, 미리보기 모델이 preview | 독립 |
| 설계 | UI Canvas 자동화 (`ui-canvas` v1.14) | 화면 설계·UI 코드 **기준**(병합 D 기준 앱) | 컴포넌트 배치·그룹·레이어 → 스크린샷 AI 복원·AI 명세 → 컴포넌트 갤러리·AI 컴포넌트 → PNG·JSON·TSX 내보내기 | 표 `ui_canvas_projects`(RLS), 100개 한도, 문서 2MB·컴포넌트 1500·AI 컴포넌트 50, **30일 정리 없음** / `gemini-2.5-flash` / 회원 본인 Gemini 키(없어도 편집·저장·내보내기 가능) | React+Tailwind TSX(반응형/절대 위치), 되돌리기, 갤러리 Tailwind 화면 격리 | AI 컴포넌트는 캔버스에서 실제 렌더링 안 함(보안), 그룹 안 자식 직접 편집 없음, 스냅·패닝 없음 | 독립(기준) |
| 웹UI | AI 웹 UI 제작 자동화 (`ai-web-ui` v1.07, 폴더 `react-ui-showcase/`) | 병합 원본 | **현재 이동 안내만** — `/api/generate` 410(`react-ui-showcase/src/app/api/generate/route.ts`) | (옛) 저장 없음 / (옛) Gemini 브라우저 키 전달 | (옛) 12종 갤러리·10종 데모·TSX 코드·AI 생성 → 설계로 이관 | 옛 컴포넌트 코드(`components/showcase`·`components/ui`)는 남았지만 쓰이지 않음 | 병합됨 → 설계(2026-10-21) |

공통: 세 운영 앱 모두 로그인 + 공통 권한 판정(`src/lib/access.ts`·`programAccess.ts`), 회원 본인 키(`user_api_keys`, 폴백 없음), 회원별 저장(RLS + 서버 `user_id` 조건)을 갖췄다. **30일 자동 정리는 콘티만 있다**(§2-6).

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · 「미확인」은 코드에서 근거를 찾지 못한 칸 · – 해당 없음. 웹UI 칸은 **지금 회원이 쓸 수 있는지**를 적는다(옛 기능은 §3).

### 2-1. 입력·기획

| 기능 | 콘티 | 랜딩 | 설계 | 웹UI |
|---|---|---|---|---|
| 참고 이미지 업로드(브라우저에서 줄여 전송) | ○ `src/components/studio/StudioWorkspace.tsx`, 서버 정규화 `src/lib/projects.ts`(`sharp`) | × | ○ 스크린샷 업로드(`src/components/canvas/Editor.tsx` 「이미지로 만들기」, 긴 변 줄이기) | × |
| 다른 프로그램 결과를 참고 이미지로 받기 | ○ v1.11~v1.15 바나나·4컷·인물사진 서명 주소만(`src/lib/importSource.ts`) | – | ○ 랜딩에서 프로젝트로 받기(받는 쪽 코드 변경 없음, 공용 표 행) | × |
| 주제 입력 → AI 제안 | ○ `src/app/api/topic-suggest/route.ts` | ○ 타겟·목표 자동 완성 `src/app/api/ai/suggest/route.ts` | – | × |
| 주제 템플릿·레이아웃 고르기 | × | ○ `src/lib/lpa/templates.ts`, 레이아웃 5종 `src/lib/lpa/types.ts` `LayoutType` | × | × |
| AI 수준(모델) 고르기 | ○ 엔진 표준/Pro `src/lib/storyboard/types.ts` `ENGINES` | ○ pro/standard `src/lib/gemini.ts` `MODEL_CHAIN` | × (고정 `gemini-2.5-flash`) | × |
| 당해 연도·한국 시간 현재 월 주입 | ○ `src/lib/storyboard/prompts.ts` `yearNotice`·`koreaNowRule` | ○ `src/lib/lpa/prompts.ts` `yearGuard`·`koreaNowRule` | ○ `src/lib/gemini.ts` `yearGuard`, `src/lib/gallery/generateComponent.ts` | × (410) |
| 인물 기본 한국인 지시 | ○ 참고 인물 유지 + 새 인물만 한국인 `prompts.ts` `PEOPLE_RULE` | △ 지시는 있으나(`SYSTEM_INSTRUCTION`) 실제 이미지는 영문 키워드 스톡 사진 | △ AI 컴포넌트 생성 지시만(`generateComponent.ts`) — 인물 이미지 생성 없음 | × |

### 2-2. AI 생성·분석

| 기능 | 콘티 | 랜딩 | 설계 | 웹UI |
|---|---|---|---|---|
| 이미지 분석 → 장면·감정선·키프레임 9(JSON 스키마) | ○ `src/app/api/projects/[id]/analyze/route.ts`, `prompts.ts` `ANALYSIS_SCHEMA` | × | × | × |
| AI 응답 정리·검증(개수·길이·메타 단어 제거) | ○ `src/lib/storyboard/validate.ts` | ○ `src/lib/lpa/plan.ts` `normalizePlan`, `src/lib/lpa/html.ts` `validateHtml` | ○ `src/lib/projects.ts` `sanitizeDoc`(컴포넌트 최대 300개 복원) | × |
| 9컷 콘택트 시트 이미지 생성 | ○ `src/app/api/projects/[id]/render/route.ts`(공용 `src/lib/geminiImage.ts` 사본) | × | × | × |
| 기획안(섹션·전략·디자인 시스템·이미지 자산·서브 페이지) | × | ○ `src/app/api/ai/plan/route.ts`, `prompts.ts` | × | × |
| 섹션 하나만 다시 만들기 | × | ○ `src/app/api/ai/plan/route.ts`(`section` + `plan`) | × | × |
| 단일 HTML 프로토타입 생성 | × | ○ `src/app/api/ai/code/route.ts`, `html.ts` `extractHtml` | × | × |
| 스크린샷 → 컴포넌트 자동 복원 | × | × | ○ `src/app/api/ai/from-image/route.ts` | × |
| 화면 명세(Spec) 자동 작성 | × | × | ○ `src/app/api/ai/spec/route.ts` | × |
| 자연어 → React 컴포넌트 코드 생성 | × | × | ○ `src/app/api/ai/component/route.ts`, `src/lib/gallery/generateComponent.ts` | × (410) |
| 영상 AI용 프롬프트(마스터·장면 9·JSON, 길이·대사) | ○ `src/app/api/projects/[id]/video-prompts/route.ts`, 장면 길이 배분 `src/lib/storyboard/plan.ts` | × | × | × |
| 생성 중 취소 | 미확인 | ○ `Workspace.tsx` `onCancel`(AbortSignal) | 미확인 | × |
| 유료 이미지 자동 재시도 안 함 | ○ `src/lib/gemini.ts` `retries: 0` | – (이미지 생성 없음) | – | – |
| 동시 유료 생성 선점(두 번째 요청은 호출 전 409) | ○ v1.10 `src/lib/projects.ts` `claimProject` | × (생성은 프로젝트 행에 묶이지 않음, 버튼 잠금 `working`만) | × (버튼 잠금 `imageBusy`만) | – |
| 모델 오류를 한국어 안내로(키·한도·시간 초과) | ○ `src/lib/gemini.ts` `explainError` | ○ `src/lib/gemini.ts` `toUserError` | ○ `src/lib/gemini.ts` `friendlyAiError` | × |

### 2-3. 편집·다듬기

| 기능 | 콘티 | 랜딩 | 설계 | 웹UI |
|---|---|---|---|---|
| 3×3 경계 슬라이더로 자르기 | ○ `src/components/studio/SplitEditor.tsx` | × | × | × |
| 기획안 인라인 수정(수정 적용) | × | ○ `Workspace.tsx` `applyEdit` | × | × |
| 컴포넌트 끌어다 놓기(25종, 그룹·기타 포함) | × | × | ○ `src/lib/canvas/types.ts` `COMPONENT_TYPES`, `src/lib/canvas/constants.ts` `TOOLBOX` | × |
| 마퀴·다중 선택, 그룹·해제 | × | × | ○ `src/lib/canvas/model.ts` `marqueeSelect`·`groupComponents`·`ungroupComponents` | × |
| 되돌리기·다시 하기 | × | × | ○ `src/lib/canvas/useHistory.ts` | × |
| 컴포넌트 속성·스타일 프리셋 | × | × | ○ `src/components/canvas/Panels.tsx`, `constants.ts` `PRESETS` | × |
| 캔버스 크기 프리셋(태블릿·모바일) | – | – | 미확인(기본 1440×900 `DEFAULT_CANVAS`만 확인, 프리셋은 안내 문구 `GuideContent.tsx`) | – |
| 그룹 안 자식 직접 편집(Deep Select) | – | – | × (백로그) | – |
| 스마트 정렬선·자석 스냅 | – | – | × (백로그) | – |
| 무한 패닝·휠 줌 | – | – | × (백로그) | – |
| 컴포넌트 갤러리·인터랙티브 데모·TSX 코드 보기 | × | × | ○ v1.11 `src/app/(workspace)/gallery/page.tsx`, `src/components/gallery/*`, `src/lib/gallery/componentCodes.ts` | × (이동 안내) |
| AI 컴포넌트를 프로젝트에 보관(최대 50) | × | × | ○ v1.11 `src/app/api/projects/[id]/snippets/route.ts`, `src/components/gallery/showcase/SaveToProject.tsx` | × |
| 보관한 AI 컴포넌트를 캔버스에 놓기(제목 상자, 실행 안 함) | × | × | ○ v1.13 `src/components/canvas/CodeExportModal.tsx`, `codegen.ts` `snippetComponentName` | × |

### 2-4. 내보내기·미리보기

| 기능 | 콘티 | 랜딩 | 설계 | 웹UI |
|---|---|---|---|---|
| 컷별 JPG ZIP(브라우저에서 만듦) | ○ `SplitEditor.tsx`(`jszip`) | × | × | × |
| 마스터 이미지 서명 주소로 보기 | ○ `src/lib/projects.ts` `signedUrl` | – | – | – |
| HTML 내려받기(`landing-page.html`) | × | ○ `Workspace.tsx` | × | × |
| 기획안 JSON 내려받기·Markdown 복사 | × | ○ `Workspace.tsx`(`landing-plan.json`, `planToMarkdown`) | × | × |
| 기기 폭 미리보기 | × | ○ 390px·768px·100% `Workspace.tsx` `DEVICE_W` | × | × |
| 생성 HTML을 격리해 미리보기 | – | ○ `iframe sandbox="allow-scripts"`(같은 출처 권한 없음) | – | – |
| PNG 캡처(1:1) | × | × | ○ `Editor.tsx`(`html2canvas`) | × |
| 컴포넌트 JSON·명세 JSON | × | × | ○ `Editor.tsx` 내려받기, 만드는 함수 `src/lib/canvas/model.ts` `buildComponentsJson`·`buildDesignSpecJson` | × |
| React + Tailwind TSX(반응형 flex / 절대 위치) | × | × | ○ v1.11·v1.12 `src/lib/canvas/codegen.ts` `generateTsx`·`rowsOf`, 문법 검사 `tests/codegen.test.mjs` | × |
| 「Claude Code·Cursor용 React 변환 프롬프트 복사」 | × | 미확인(`AGENTS.md` §3.1·`guide/page.tsx`에 적혀 있으나 `Workspace.tsx`에서 버튼을 찾지 못함) | × | × |

### 2-5. 프로그램 사이 연계

| 기능 | 콘티 | 랜딩 | 설계 | 웹UI |
|---|---|---|---|---|
| 랜딩 기획안 → UI 설계 새 프로젝트(AI 없이 규칙 변환) | – | ○ v1.11 `src/app/api/canvas-export/route.ts`, `src/lib/lpa/toCanvas.ts` `planToCanvasDoc` | ○ 받는 쪽(공용 표 `ui_canvas_projects`) | – |
| 서브 페이지를 별도 프로젝트로 보내기 | – | ○ v1.12 `toCanvas.ts` `sendableSubPages`·`subPageToCanvasDoc` | ○ 받는 쪽 | – |
| 보낼 때 회원 사진 키로 실사진, 실패 시 임시 사진 | – | ○ v1.13 `canvas-export/route.ts` `imageNote`, `src/lib/images.ts` `resolveImages` | – | – |
| 보내기 전 받는 쪽 권한·100개 한도 확인 | – | ○ `canvas-export/route.ts` `MAX_CANVAS_PROJECTS` | – | – |
| 보낸 곳 이름표·돌아가기(`?via=`)와 보낸 곳 저장 | ○ v1.12·v1.13 공용 사본 `src/lib/linkMark.ts`, 칸 `storyboard_projects.source`(`supabase/migrations/0003_project_source.sql`) | × | × | – |
| UI 설계 → 실제 동작 코드 파이프라인 | – | – | ○ TSX 내보내기로 대체(웹UI 병합) | – |

### 2-6. 공통·보안

| 기능 | 콘티 | 랜딩 | 설계 | 웹UI |
|---|---|---|---|---|
| 로그인 + 공통 권한 판정 | ○ `src/lib/access.ts`, `src/lib/routeGuard.ts` | ○ `src/lib/access.ts`, `src/lib/aiRoute.ts` `guardAi` | ○ `src/lib/access.ts` | △ 이동 안내 화면 |
| 회원 본인 키만(폴백 없음) | ○ `src/lib/apiKeys.ts` | ○ `src/lib/apiKeys.ts`(gemini·unsplash·pexels·pixabay) | ○ `src/lib/apiKeys.ts`(gemini) | – (410) |
| 프로젝트 표 RLS 본인만 | ○ `supabase/migrations/0001_storyboard_tables.sql` | ○ `supabase/migrations/0001_register_program.sql` | ○ `supabase/migrations/0001_register_program.sql` | – |
| 이미지 비공개 버킷·서명 주소 | ○ 버킷 `storyboard-ai` | – (외부 사진 주소만, 저장 안 함) | – (스크린샷은 저장하지 않음 — 코드에서 저장 호출 못 찾음) | – |
| 프로젝트 개수 한도 | ○ 30개 `types.ts` `LIMITS.maxProjects` | ○ 50개 `src/lib/projects.ts` `MAX_PROJECTS` | ○ 100개 `src/app/api/projects/route.ts` | – |
| 자동 저장 충돌 방지(`expectedUpdatedAt` → 409) | – (단계별 저장) | ○ `src/app/api/projects/[id]/route.ts` | ○ `src/app/api/projects/[id]/route.ts`(AI 컴포넌트 추가·삭제는 `updated_at`을 바꾸지 않음) | – |
| 30일 자동 정리 | ○ v1.10 `src/app/api/cron/cleanup/route.ts`, `vercel.json` cron `0 18 * * *` | **×** (`vercel.json`에 cron 없음, `src/app/api/cron` 없음) | **×** (같음) | – |
| 정리 건수 회원별 기록 | ○ v1.17 공용 사본 `src/lib/cleanupUsageLog.ts` | × | × | – |
| 프로젝트 삭제 때 파일까지 삭제 | ○ `src/lib/projects.ts` `removeProjectFolder` | – | – | – |
| 사용 안내(/guide) | ○ `src/app/(dashboard)/guide/page.tsx` | ○ `src/app/(workspace)/guide/page.tsx` | ○ `src/app/(workspace)/guide/page.tsx`, `GuideContent.tsx` | × |
| 화면 언어 | 한국어·English `src/components/studio/i18n.ts` | 한국어 | 한국어 | – |

## 3. 병합 원본 기능 이관 대조 (출처)

| 원본 기능 | 출처 | 설계로 이관 | 상태 |
|---|---|---|---|
| 12종 컴포넌트 갤러리(변형·크기·상태) | 웹UI | ○ v1.11 `src/components/gallery/showcase/ShowcaseGrid.tsx`·`src/components/gallery/ui/*` | ✅ |
| 10종 인터랙티브 데모 | 웹UI | ○ v1.11 `src/components/gallery/showcase/DemoModal.tsx` | ✅ |
| 단일 파일 TSX 코드 라이브러리 | 웹UI | ○ v1.11 `src/lib/gallery/componentCodes.ts`, `CodeViewerModal.tsx` | ✅ |
| AI 컴포넌트 생성 | 웹UI(브라우저 키 전달) | ○ v1.11 서버·회원 본인 키 `src/app/api/ai/component/route.ts` | ✅(보강) |
| 생성 결과 보관 | 웹UI(없었음) | ○ v1.11 프로젝트 `doc.snippets` | ✅(새로 추가) |
| 캔버스 → React 코드 | 웹UI 연계 아이디어 | ○ v1.11·v1.12 `codegen.ts` | ✅(새로 추가) |
| 권한 회원 이전 | 웹UI 175명 | 골드 등급 표에 UI 설계 체크(32명 자동 부여) `supabase/migrations/20261021_merge_d_v1_11.sql` | ✅(운영 DB 기록 기준, 이번에 조회 안 함) |

## 4. 기능별 기준 코드 위치 (새로 만들기 전에 읽을 곳)

| 기능 | 기준 파일 | 비고 |
|---|---|---|
| 회원 이미지 비공개 저장·서명 주소·폴더째 삭제 | `cinematic-storyboard-studio/src/lib/projects.ts` | `<user_id>/<project_id>/` 경로 |
| 유료 생성 선점·조건부 반영 | `cinematic-storyboard-studio/src/lib/projects.ts` `claimProject`·`newMasterPath`, `src/app/api/projects/[id]/render/route.ts` | 유료 호출 전에 선점 |
| 30일 정리 + 회원별 기록 | `cinematic-storyboard-studio/src/app/api/cron/cleanup/route.ts` | 랜딩·설계에 넣을 때 출발점(표만 있고 파일 없음) |
| 다른 프로그램 서명 주소만 받기 | `cinematic-storyboard-studio/src/lib/importSource.ts` `IMPORT_SOURCES` | 허용 버킷 목록 |
| 보낸 곳 이름표 | `cinematic-storyboard-studio/src/lib/linkMark.ts` | 공용 `link-mark` **사본**(기준 바나나) — 직접 고치지 않음 |
| 이미지 생성 호출·모델 목록 | `cinematic-storyboard-studio/src/lib/geminiImage.ts`, `nanoBananaModels.ts` | 공용 사본(기준 `ai-image-studio/lib/providers/`) |
| 영상 장면 길이 배분(0.5초 단위, 합계 고정) | `cinematic-storyboard-studio/src/lib/storyboard/plan.ts` | |
| 영상 프롬프트 정리(메타 단어 제거·대사 규칙) | `cinematic-storyboard-studio/src/lib/storyboard/validate.ts` | |
| AI 라우트 공통 관문(권한·크기·본인 키·needKey) | `landing-architect/src/lib/aiRoute.ts` `guardAi` | |
| 기획안 정리·Markdown 변환 | `landing-architect/src/lib/lpa/plan.ts` | |
| 생성 HTML 꺼내기·검사·임시 사진 대체 | `landing-architect/src/lib/lpa/html.ts` | |
| 사진 검색(Unsplash·Pexels·Pixabay) | `landing-architect/src/lib/images.ts` `resolveImages` | 회원 키, 실패 시 대체 |
| 다른 프로그램 → UI 설계 프로젝트 만들기 | `landing-architect/src/app/api/canvas-export/route.ts`, `src/lib/lpa/toCanvas.ts` | 받는 쪽 문서 모양 `ui-canvas/src/lib/canvas/types.ts` 와 맞출 것 |
| 캔버스 문서 모양·검증 | `ui-canvas/src/lib/canvas/types.ts`, `src/lib/projects.ts` `sanitizeDoc` | |
| 그룹·마퀴·레이어 계산 | `ui-canvas/src/lib/canvas/model.ts` | 시험 `tests/model.test.mjs` |
| 캔버스 → TSX | `ui-canvas/src/lib/canvas/codegen.ts` | `ComponentView.tsx`와 그리는 방식 같게 유지 |
| Tailwind를 한 화면에만 격리 | `ui-canvas/src/app/(workspace)/gallery/gallery.css` | 전역 태그 스타일과 충돌 방지 |
| 자동 저장 충돌 방지 | `ui-canvas/src/app/api/projects/[id]/route.ts` | 랜딩도 같은 방식 |
| 연도·현재 월 지시 | `landing-architect/src/lib/lpa/prompts.ts` `yearGuard`, `ui-canvas/src/lib/gemini.ts` `yearGuard` | 프롬프트 내용은 공유하지 않음 |

## 5. 병합·독립 방향 (결정된 것)

| 묶음 | 합칠 프로그램 → 기준 | 가져온 기능 | 상태 |
|---|---|---|---|
| 병합 D | 웹UI → 설계 | 갤러리·데모·TSX 코드·AI 컴포넌트 생성 + 새로 코드 내보내기·보관 | ✅ 설계 v1.11(`809264a7`·`10f9667d`·`aaaf9908`), 웹UI v1.06 이동 안내 |
| 연계 | 랜딩 → 설계 | 보내 다듬기(서브 페이지·실사진) | ✅ 랜딩 v1.11~v1.13 |
| 독립 | 콘티 | 영상 기획 쪽 연계(바나나·4컷·인물사진에서 받기) | – |
| 카테고리 이동 | 설계 「데이터수집\|기획」 → 디자인 | – | ✅ 2026-10-24 운영 SQL 편집기 적용 기록 `2772a096f`(마이그레이션 `0042_categories_ai_prompt_personality.sql`, 이번에 DB 조회는 안 함) |

원칙: 「병합」은 좋은 기능만 기준 프로그램에 더하는 것이다. 원본 앱은 이동 안내로 두고 주소는 지우지 않는다.

## 6. 확장 후보·로드맵 (추천 — 구현 전)

| 단계 | 기능 | 넣을 곳 | 출처·근거 | 비용 | 상태 |
|---|---|---|---|---|---|
| 1차 | 30일 자동 정리 + 회원별 기록 | 랜딩·설계 | 최상위 규칙, 콘티 기준 코드 | 빌드 각 1 | 후보(보관 기간 주인님 결정 필요) |
| 1차 | 미배포 표기 정리(설계 좁은 칸 줄바꿈 수정이 v1.14에 나갔는지) | 설계 | `ui-canvas/AGENTS.md` 맨 끝 | 없음 | 확인 필요 |
| 2차 | 글 모델 점검(`gemini-2.5-flash`, `gemini-3.1-pro-preview`) | 세 앱 | 이미지 모델은 2026-10-17 교체, 글 모델은 그대로 | 없음(점검) | 확인 필요 |
| 2차 | 랜딩 스톡 사진 키워드에 인물 조건 넣기 | 랜딩 | 핵심 원칙 3 | 없음 | 후보 |
| 2차 | 「React 변환 프롬프트 복사」 실재 확인 또는 문서 정정 | 랜딩 | AGENTS §3.1 | 없음 | 확인 필요 |
| 2차 | 그룹 안 직접 편집·스마트 스냅·무한 패닝 | 설계 | `docs/IMPROVEMENT_BACKLOG.md` | 없음 | 대기 |
| 3차 | 콘티 컷 → 영상 프로그램 넘기기 | 콘티 → 영상 | 비교표 §3 「만화·영상 기획」 묶음 | – | 아이디어 |
| 3차 | 기획안 A/B 다중 버전·다국어 | 랜딩 | `docs/IMPROVEMENT_BACKLOG.md` | 회원 키 | 대기 |
| 보류 | HTML 원클릭 호스팅 | 랜딩 | 백로그 | 외부 계정 | 회원 확인·외부 공개라 신중 검토 |

### 미배포 대기 (디자인)

| 프로그램 | 내용 | 나갈 때 |
|---|---|---|
| 설계 | 좁은 칸 버튼 줄바꿈 수정 `f0871e568` — `AGENTS.md`는 「미배포」 표기, 그 뒤 v1.14 보안 배포(2026-10-23, 로컬 파일 업로드)에 함께 나갔을 가능성 | **확인 필요** |
| 웹UI | 좌측 메뉴 계정 위치 `22c6cda35`(`docs/PENDING_DEPLOYS.md`) | 이동 안내 앱이라 배포 필요성 확인 필요 |

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 콘티 v1.18·랜딩 v1.14·설계 v1.14·웹UI v1.07 코드 기준, 병합 D·랜딩 → 설계 연계 반영 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
