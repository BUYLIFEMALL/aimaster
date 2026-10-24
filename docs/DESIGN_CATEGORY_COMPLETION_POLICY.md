# 디자인 카테고리 자동화 완성 기준

> **이 문서는 「디자인」 카테고리 프로그램(콘티·랜딩 기획·UI 설계)용이며, 모든 프로그램의 화면 디자인 지침인 루트 [`DESIGN.md`](../DESIGN.md)·[`PROGRAM_DESIGN_STANDARD.md`](PROGRAM_DESIGN_STANDARD.md)와 다르다.** 화면 테마·좌측 메뉴·매뉴얼 모양은 그 문서들을 따른다.

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 디자인 카테고리는 아직 담당 역할이 없다([카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「담당 역할이 없는 카테고리」). 담당이 정해져 확인·수정하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·권한·배포는 바뀌지 않았다.

- 적용 범위: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)의 「디자인」 카테고리 — `cinematic-storyboard-studio`(시네마틱 스토리보드 자동화), `landing-architect`(AI 랜딩페이지 기획 자동화), `ui-canvas`(UI Canvas 자동화), 병합됨 `ai-web-ui`(AI 웹 UI 제작 자동화, 폴더 `react-ui-showcase/`, 이동 안내만). 앞으로 만드는 콘티·화면 설계·랜딩 기획·UI 코드 프로그램에도 적용한다.
- 관계 문서: [디자인 카테고리 기능 상세 비교표](DESIGN_CATEGORY_FEATURE_MATRIX.md) · [디자인 카테고리 통합 작업표](DESIGN_CATEGORY_CONSOLIDATION_TASKS.md) · [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) · [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-MM-03·EXT-MKT-01·EXT-TL-10 · [이미지 생성 프롬프트 규칙](IMAGE_PROMPT_RULES.md) · [회원 본인 계정·키 최상위 규칙](TOP_RULE_PERSONAL_ACCOUNT_API.md) · 병합 D 근거 [데이터수집 병합 분석 보고서](analysis-scraping-consolidation-20261021/REPORT.md) §2 D.

## 1. 완성 흐름 (목표)

디자인 카테고리의 완성 목표는 **「기획·참고 자료 → AI 초안 → 회원이 직접 다듬기 → 다른 도구에서 바로 쓰는 결과물 내보내기」**가 회원 본인 키·본인 데이터로 끊기지 않고 이어지는 것이다. 프로그램별 흐름은 아래와 같다.

- **콘티(`cinematic-storyboard-studio`)**: 참고 이미지 1장(또는 바나나·4컷·인물사진에서 넘겨받기) → AI 분석(장면·감정선·키프레임 9개) → 9컷 마스터 콘택트 시트 이미지 → 3×3 경계 맞춰 자르기·컷별 JPG ZIP → 영상 길이·대사 언어를 골라 영상 AI용 프롬프트(마스터·장면 9개·JSON) → 프로젝트 저장(30일 자동 삭제).
- **랜딩 기획(`landing-architect`)**: 주제·타겟·목표 입력(타겟·목표 AI 자동 완성) → 템플릿·레이아웃 선택 → 기획안 JSON(6개 섹션·콘텐츠 전략·디자인 시스템·이미지 자산·서브 페이지) → 섹션별 수정·다시 만들기 → 단일 HTML 프로토타입(이미지 소스 선택) → HTML·JSON 내보내기 / 「🧩 UI Canvas로 보내 다듬기」.
- **UI 설계(`ui-canvas`)**: 새 프로젝트(또는 랜딩 기획에서 넘겨받기) → 컴포넌트 끌어다 놓기·그룹·레이어 → 스크린샷 AI 복원·AI 명세(선택) → 컴포넌트 갤러리·AI 컴포넌트 생성·보관 → PNG·컴포넌트 JSON·명세 JSON·React+Tailwind TSX(반응형/절대 위치) 내보내기.
- 실제 영상 생성(콘티), 실제 운영 사이트 배포·폼 전송(랜딩), 디자인 툴(Figma 등) 파일 내보내기(UI 설계)는 **지금 범위 밖**이다. 완성 보고에 「범위 밖」으로 밝힌다.

## 2. 「끝났다」고 말할 조건

아래를 모두 만족해야 그 기능·프로그램을 「완료」로 보고한다. 하나라도 빠지면 빠진 단계를 「미완료」·「미검수」로 적는다.

1. **회원 본인 키로 동작**: AI(Gemini)와 사진 검색(Unsplash·Pexels·Pixabay)은 회원 `user_api_keys`의 본인 값만 쓴다. 키가 없으면 실행하지 않고 등록 안내를 띄운다(기준: `landing-architect/src/lib/aiRoute.ts` `guardAi`의 `needKey`, `cinematic-storyboard-studio/src/lib/routeGuard.ts` `requireAccessAndKey`, `ui-canvas/src/lib/apiKeys.ts`). 키가 없어도 되는 기능(캔버스 편집·저장·내보내기, 자르기)은 키 없이 동작해야 한다.
2. **회원 데이터 격리·비공개**: 프로젝트 표는 `user_id` + RLS 본인만, 서버 조회는 `user_id` 조건을 직접 건다. 이미지 파일이 있으면 회원 본인 폴더(`<user_id>/<project_id>/...`)의 **비공개 버킷** + 서명 주소로만 보여 준다(기준: `cinematic-storyboard-studio/src/lib/projects.ts`, 버킷 `storyboard-ai`).
3. **30일 자동 정리와 기록**: 생성 자료는 생성일 기준 30일 뒤 자동 삭제되고(예약 작업 + `CRON_SECRET`), 지운 건수를 회원별 정리 기록(공용 `cleanup-usage-log` 사본)으로 남긴다(기준: `cinematic-storyboard-studio/src/app/api/cron/cleanup/route.ts`). **2026-10-24 현재 `landing-architect`·`ui-canvas`에는 이 작업이 없다**([통합 작업표](DESIGN_CATEGORY_CONSOLIDATION_TASKS.md) 「우선 처리」 DS-U1).
4. **당해 연도·현재 월 주입**: 글을 만드는 모든 AI 프롬프트에 `new Date().getFullYear()`와 한국 시간 현재 월을 동적으로 넣는다(기준: `landing-architect/src/lib/lpa/prompts.ts` `yearGuard`·`koreaNowRule`, `ui-canvas/src/lib/gemini.ts` `yearGuard`, `cinematic-storyboard-studio/src/lib/storyboard/prompts.ts` `yearNotice`·`koreaNowRule`).
5. **유료 생성 중복 방지**: 같은 프로젝트에 같은 유료 생성이 동시에 두 번 돌지 않게 한다 — 생성 전에 선점(콘티 `claimProject`, 두 번째 요청은 유료 호출 전 409), 결과는 새 이름으로 올리고 선점 값이 그대로일 때만 반영, 실행 중 버튼 잠금. 유료 이미지 생성은 자동 재시도하지 않는다(콘티 `retries: 0`, 공용 `geminiImage.ts`).
6. **저장 충돌 방지**: 자동 저장은 `expectedUpdatedAt`으로 다른 창의 저장을 덮어쓰지 않는다(409, 기준: `ui-canvas/src/app/api/projects/[id]/route.ts`, `landing-architect/src/app/api/projects/[id]/route.ts`).
7. **내보낸 결과물이 실제로 열린다**: 콘티 ZIP 9장, 랜딩 HTML(`landing-page.html`)·기획안 JSON(`landing-plan.json`)·Markdown 복사가 열림(미리보기는 `sandbox="allow-scripts"` iframe), UI 설계 TSX가 TypeScript 문법 검사를 통과(`ui-canvas/tests/codegen.test.mjs`), PNG·JSON 내려받기.
8. **프로그램 사이 넘기기 확인**: 넘기는 쪽과 받는 쪽 모두 권한·한도·본인 행만 확인(랜딩 → UI 설계는 UI 설계 이용 권한 + 100개 한도, `landing-architect/src/app/api/canvas-export/route.ts`). 받는 쪽 문서 모양(`ui-canvas/src/lib/canvas/types.ts` ProjectDoc)이 바뀌면 보내는 쪽 변환(`landing-architect/src/lib/lpa/toCanvas.ts`)도 같은 작업에서 고친다.
9. **검수 증거**: 로컬 검사(tsc·시험) → 배포 Ready → 시험 계정(`buylifemall@naver.com`) 실제 화면 확인(Claude Code는 메인 크롬)을 각각 기록한다. 유료 생성 시험은 승인된 횟수만 하고, 누르지 않은 버튼은 「미검수」로 적는다.
10. **문서 갱신**: 같은 작업에서 [비교표](DESIGN_CATEGORY_FEATURE_MATRIX.md)의 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드·버전을 고친다.

## 3. 회원이 고르는 항목

회원이 고르지 않은 값으로 생성·과금·외부 전송하지 않는다.

| 항목 | 선택지 | 프로그램 | 근거 |
|---|---|---|---|
| 렌더링 엔진(이미지 모델) | 표준 Nano Banana(`gemini-3.1-flash-lite-image`) / Pro(`gemini-3-pro-image`, 2K, 본인 Google 결제 필요) | 콘티 | `cinematic-storyboard-studio/src/lib/storyboard/types.ts` `ENGINES` |
| 영상 길이 | 5 / 8 / 10 / 15초 | 콘티 | `types.ts` `DURATION_OPTIONS`, 장면 배분 `src/lib/storyboard/plan.ts` |
| 대사 | 없음 / 한국어 / English | 콘티 | `types.ts` `DialogueMode` |
| 화면 언어 | 한국어 / English | 콘티 | `src/components/studio/i18n.ts` |
| 자르기 경계 | 3×3 경계 슬라이더 | 콘티 | `src/components/studio/SplitEditor.tsx` |
| 주제 템플릿·레이아웃 | 주제 템플릿 목록 + 레이아웃(card·document·hero·gallery·landing) | 랜딩 | `landing-architect/src/lib/lpa/templates.ts` |
| AI 수준 | pro(`gemini-3.1-pro-preview` → 안 되면 `gemini-2.5-flash`) / standard(`gemini-2.5-flash`) | 랜딩 | `landing-architect/src/lib/gemini.ts` `MODEL_CHAIN` |
| 이미지 소스 | 무료 임시 사진 / Unsplash / Pexels / Pixabay(회원 키) | 랜딩 | `src/lib/images.ts`, `src/app/api/images/resolve/route.ts` |
| 생성 범위 | 기획안 전체 / 섹션 하나 다시 만들기 / 프로토타입 다시 만들기 | 랜딩 | `src/components/studio/Workspace.tsx`, `src/app/api/ai/plan`·`code` |
| 미리보기 폭 | 모바일 390px / 태블릿 768px / 데스크톱 100% | 랜딩 | `Workspace.tsx` `DEVICE_W`(AGENTS의 「375·1200」 표기와 다름) |
| 캔버스 크기 | 기본 1440×900(`ui-canvas/src/lib/canvas/types.ts` `DEFAULT_CANVAS`), 태블릿·모바일 프리셋은 안내(`GuideContent.tsx`)에만 있고 코드 위치 **미확인** | UI 설계 | `Editor.tsx` `setCanvas` |
| 코드 배치 방식 | 반응형(flex, 기본) / 캔버스 그대로(절대 위치) | UI 설계 | `ui-canvas/src/lib/canvas/codegen.ts` `generateTsx`·`rowsOf` |
| 내보내기 형식 | PNG / 컴포넌트 JSON / 명세 JSON / TSX | UI 설계 | `src/components/canvas/Editor.tsx`, `CodeExportModal.tsx` |
| AI 컴포넌트 보관 위치 | 기존 프로젝트 / 새 프로젝트 | UI 설계 | `src/components/gallery/showcase/SaveToProject.tsx`, `src/app/api/projects/[id]/snippets/route.ts` |

## 4. 하지 않을 것

- **운영자·다른 회원의 키로 대신 처리하지 않는다.** 원본(EXT-TL-10 UI 캔버스 Pro)처럼 운영자 키를 번들에 넣거나 브라우저에 키를 저장하지 않는다. 키는 서버에서만 쓴다(옛 `ai-web-ui`가 받던 브라우저 키 전달도 병합 때 제거).
- **원본 프로그램의 코드·프롬프트·문구·원작자 크레딧·가짜 표기(「4K」 등)를 옮기지 않는다**(핵심 원칙 21, 개발분석표 EXT-MM-03·EXT-MKT-01).
- **AI가 만든 코드를 회원 브라우저에서 실행하지 않는다.** UI 설계 캔버스의 AI 컴포넌트 상자는 제목 상자로만 보여 준다(`ui-canvas/AGENTS.md` v1.13). 랜딩 프로토타입 미리보기는 같은 출처 권한 없는 `sandbox="allow-scripts"` iframe으로만 연다.
- **생성 이미지 프롬프트를 다른 프로그램과 공유·복사하지 않는다.** 공용은 모델·주소·호출·대기 시간·이미지 받기까지다([IMAGE_PROMPT_RULES.md](IMAGE_PROMPT_RULES.md)). 공용 사본(`geminiImage.ts`·`nanoBananaModels.ts`·`linkMark.ts`·`cleanupUsageLog.ts`)은 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
- **메타 단어(storyboard·panel·frame·grid 등)를 영상 프롬프트에 남기지 않는다**(콘티 `src/lib/storyboard/validate.ts`).
- **프로그램끼리 서로 API를 부르지 않는다.** 넘기기는 공용 DB 표에 회원 본인 행을 추가하거나(랜딩 → UI 설계) 서명 주소를 넘기는(바나나·4컷·인물사진 → 콘티, `src/lib/importSource.ts` 허용 목록) 방식만 쓴다.
- **병합된 원본(`ai-web-ui`, 폴더 `react-ui-showcase/`)에 새 기능을 넣지 않는다.** 옛 주소는 지우지 않고 이동 안내로 둔다(`/api/generate`는 410).
- 회원 확인 없이 외부에 게시·배포하지 않는다(HTML 원클릭 호스팅은 백로그 아이디어일 뿐 승인 전이다).

## 5. 회원 본인 키 규칙 (디자인 적용)

- 세 프로그램 모두 AI는 `gemini` provider 하나다. 랜딩은 사진 검색 키 3종(`unsplash`·`pexels`·`pixabay`)을 더 받는다(`landing-architect/src/lib/apiKeys.ts` `KEY_PROVIDERS`).
- 키가 없거나 한도가 소진되면 다른 키로 폴백하지 않고 「본인 키를 등록해 주세요」로 안내한다. 랜딩의 사진 키가 없거나 실패하면 **AI·다른 회원 키가 아니라 키 없는 무료 임시 사진(Picsum 시드)**으로 대신하고 그 사실을 화면에 알린다(`src/lib/lpa/html.ts` `fallbackPicsum`, v1.13 `imageNote`).
- 새 외부 키가 필요하면 프로그램 전용 저장소를 만들지 않고 공용 `user_api_keys`·[회원 연동 정보](MEMBER_INTEGRATIONS.md) 구조에 항목을 추가한다.
- 콘티 Pro 엔진은 회원 본인 Google 계정 결제가 필요하다. 권한 오류(403)는 결제 안내 문구로 바꿔 보여 준다(`cinematic-storyboard-studio/src/lib/gemini.ts`).

## 6. 한국인 인물 묘사·당해 연도 원칙

- **콘티**: 참고 이미지에 이미 있는 인물은 그대로 두고, 새로 묘사할 때만 한국인(동아시아인) 기본(`src/lib/storyboard/prompts.ts` `PEOPLE_RULE`). 분석·영상 프롬프트에 연도·현재 월 주입(`yearNotice`·`koreaNowRule`).
- **랜딩**: 시스템 지시에 「사람이 나오는 이미지는 한국인 기준」(`src/lib/lpa/prompts.ts` `SYSTEM_INSTRUCTION`). 단, 실제 이미지는 AI 생성이 아니라 **영문 키워드 스톡 사진 검색**이라 한국인이 나온다는 보장은 없다(키워드는 영문 소문자 단어 — 같은 파일 55행). 개선 후보는 통합 작업표 DS-W5.
- **UI 설계**: 인물 이미지 생성 없음. AI 컴포넌트 생성 지시에 한국인 기준·연도 주입(`ui-canvas/src/lib/gallery/generateComponent.ts`), 스크린샷 복원·명세에 `yearGuard`(`src/lib/gemini.ts`).
- 새 프롬프트를 추가할 때도 위 두 지시(연도·인물)가 붙는지 확인한다.

## 7. 완성 보고 양식(디자인)

완성 보고에는 아래를 따로 적는다: 프로그램별 핵심 흐름 확인 여부(콘티 분석·시트·자르기·영상 프롬프트 / 랜딩 기획안·섹션·HTML·UI 설계 보내기 / UI 설계 편집·AI 복원·코드 내보내기) / 내보낸 결과물이 열리는지 / 회원 본인 키 확인 / 30일 정리 영향(없는 프로그램은 「없음 — DS-U1」) / 유료 생성 중복 방지 / 프로그램 사이 넘기기 확인 / 범위 밖 항목 / 비용 리포트(빌드·AI 호출·누구 키).
