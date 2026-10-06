# 작업 중요 지침 — 에러 해결 기록 · 점검 체크리스트

## 2026-10-06 이미지 첨부 후 '오늘 뭐 쓰지?' 클릭 시 무반응 현상 — 기능 역할 차이 및 화면 스크롤 부재 (threads-easy-planner v1.27)

- **증상:** 상세페이지 사진을 2장 첨부한 후 `[오늘 뭐 쓰지?]` 버튼을 눌렀는데 화면에 아무런 반응도 나타나지 않음.
- **원인:**
  1. `[오늘 뭐 쓰지?]` 버튼은 원래 글 생성이 아닌 하단의 "업종별 추천 주제 10선" 목록을 불러오는 버튼이었음. 실제 글 생성 버튼은 우측의 `[✨ 글 생성하기]` 버튼이었음.
  2. `[오늘 뭐 쓰지?]` 클릭 후 하단 추천 영역으로 화면이 자동 스크롤되지 않아, 상단 화면에서는 버튼이 멈춘 것처럼 느껴짐.
  3. 사용자의 멘탈 모델은 "사진을 올리고 버튼을 누르면 사진을 분석해 글을 써줄 것"이었으나 버튼 역할이 불일치함.
- **해결(위치):**
  1. `PlannerApp.tsx`: 사진이나 영상이 첨부된 상태에서 `[오늘 뭐 쓰지?]`를 클릭하면 즉시 사진/영상을 분석하여 글을 생성(`handleGenerate`)하도록 스마트 라우팅 연결. 버튼 라벨도 `오늘 뭐 쓰지? (사진 분석)`으로 상태 피드백 제공.
  2. 미디어 첨부 카드 우측 상단에 `[✨ 글 생성하기]` 메인 액션 버튼을 직접 탑재하여 사진 업로드 즉시 한자리에서 글 생성이 가능하도록 동선 단축.
  3. 미디어가 없을 때 `[오늘 뭐 쓰지?]` 클릭 시에는 하단 '업종/타깃별 추천 주제 10선' 영역으로 부드럽게 자동 스크롤(`topicsSectionRef`) 및 안내 토스트 피드백 제공.
- **다음부터 확인:** 사용자가 파일이나 데이터를 입력한 직후 누르는 액션 버튼은 사용자의 직관적인 기대(데이터 분석 및 결과 도출)에 맞춰 동작해야 하며, 화면 아래의 다른 섹션이 변경되는 경우 반드시 해당 위치로 자동 스크롤 및 상태 피드백을 제공해야 한다.

## 2026-10-06 여러 프로그램 소스를 일괄 수정해도 각 프로그램을 재배포하기 전에는 라이브에 반영되지 않음 (shorts-viral-studio v1.04)

- **증상:** 사이드바 `← 다른 프로그램 보기` 링크를 `/programs`로 전수 수정(`58c0f5d7`)했지만, 그 뒤 배포하지 않은 프로그램은 라이브에서 이전 링크(`/dashboard`)가 그대로였다.
- **원인:** 서브프로그램은 각자 별도 Vercel 프로젝트라 저장소 소스를 바꿔도 해당 프로그램을 다시 배포해야 반영된다. 일괄 수정 커밋은 소스만 바꾼다.
- **해결(위치):** `shorts-viral-studio`를 v1.04로 올려 재배포. 라이브 반영은 배포 직후 해당 화면(또는 `vercel inspect`의 배포 시각)으로 확인.
- **다음부터 확인:** 여러 프로그램에 걸친 규칙 변경은 "소스 수정"과 "각 프로그램 재배포·버전 +0.01"이 따로다. 일괄 수정 후 어느 프로그램이 재배포됐는지 `HANDOFF.md`에 남기고, 재배포하지 않은 프로그램은 남은 일로 기록한다.

## 2026-10-06 흰색 화면 범위 규칙이 `text-white`를 어두운색으로 바꿔 검은 버튼 글자가 사라짐 — `!text-white`도 소용없음 (threads-content-ops v1.31)

- **증상:** 콘텐츠 운영 자동화 화면의 검은 배경 버튼(`bg-neutral-900 text-white`) 글자가 보이지 않았다.
- **원인:** `app/globals.css`의 `.threads-content-ops-light .text-white { color:#171717 }`(옛 다크 카드 글자를 흰 화면에서 읽히게 하는 규칙)가 버튼의 흰 글자까지 어두운색으로 바꿨다. 이를 피하려고 `!text-white`를 써도, Tailwind(v3)가 `@layer` 안의 `.text-white` 규칙을 `!text-white`용으로도 자동 생성(`.threads-content-ops-light .\!text-white { color:#171717 !important }`)해 더 높은 우선순위로 다시 덮었다.
- **해결(위치):** 진한 배경 위 글자는 범위 규칙이 건드리지 않는 `text-[#ffffff]`를 쓴다(`AccountOperations.tsx`·`SourceQueue.tsx`·`WebSetup.tsx` 7곳). 서버가 만든 CSS(`/_next/static/css/app/layout.css`)에서 새 클래스 규칙이 생성되고 이를 덮는 범위 규칙이 없는 것을 직접 확인했다.
- **다음부터 확인:** `.xxx-light` 같은 범위 안에서 `text-white`/`hover:text-white`를 진한 배경 버튼에 쓰지 말고, 글자색 수정은 렌더된 CSS를 열어 실제로 이기는 규칙을 확인한 뒤 확정한다(클래스만 바꾸고 "됐을 것"이라 가정하지 않는다). 브라우저를 직접 못 쓰면 `curl`로 CSS 파일을 받아 `grep -F`로 확인할 수 있다.

## 2026-10-06 다른 프로그램의 검증된 코드를 가져올 때: 복사 이식 + 키는 회원 본인 것 + 루트에는 `server-only` 패키지가 없음 (threads-content-ops v1.30)

- **상황:** 쇼핑제휴 자동화에 이미 실계정으로 검증된 쿠팡 검색 구현이 있어 콘텐츠 운영 자동화로 옮겼다.
- **지킨 점/교훈:**
  1. 다른 서브프로젝트 파일을 직접 import하지 말고 **복사**한다 — 서브프로젝트의 `@/` 별칭은 자기 `src/`를 가리켜 루트 앱에서는 깨진다. 복사본 맨 위에 출처·검증일·"규격이 바뀌면 두 곳을 같이 고칠 것"을 적는다(`threads-content-ops/lib/coupang.ts`).
  2. "API 값을 가져다 쓴다"는 **운영자 키를 쓴다는 뜻이 아니다.** 같은 공용 `user_api_keys` 항목(`coupang_access_key`/`coupang_secret_key`)을 회원 본인이 이미 등록해 둔 값을 읽는다는 뜻으로 구현한다. 운영자 키 폴백은 금지.
  3. 루트 앱에는 `server-only` 패키지가 설치돼 있지 않다(Next가 내부 처리). 루트의 `server-only` 파일을 `tsx`로 모의 테스트하려면 빈 `server-only` 모듈 폴더를 만들어 `NODE_PATH=./폴더 npx tsx 파일.ts`로 실행한다(서브프로젝트처럼 패키지가 있으면 `--conditions=react-server`). 테스트 파일·임시 폴더는 끝나면 반드시 삭제한다.
  4. 쇼핑제휴 쪽에서 가져온 외부 서비스 제약(검색 시간당 10회·키워드당 10개, 누적 매출 15만원 이후 키 활성화, 일반 쇼핑 주소는 수수료 0)을 화면 안내와 서버 검사에 그대로 옮긴다.
- **다음부터 확인:** 한글·따옴표가 많은 코드 패치는 `node - <<'EOF'`도 셸이 깨뜨린다. 패치 스크립트를 Write 도구로 파일로 만든 뒤 실행하고 삭제한다(위 10-05 항목과 같은 원인).

## 2026-10-06 grid의 `fr` 열이 긴 문장 때문에 늘어나 옆 칸이 찌그러지고 화면 밖으로 넘침 (threads-content-ops v1.29)

- **증상:** 대시보드의 두 칸 배치에서 오른쪽 칸의 긴 초안 한 줄이 칸 폭을 밀어내, 왼쪽 칸(`운영·API 상태`)이 세로로 찌그러지고 오른쪽은 화면 밖으로 넘쳤다.
- **원인:** `grid-cols-[0.85fr_1.15fr]`의 `fr` 열은 최소 폭이 `auto`(내용 폭)라서, 안쪽에 `truncate`가 있어도 부모 열이 먼저 늘어난다. `truncate`는 부모가 줄어들 수 있을 때만 동작한다.
- **해결(위치):** `app/(dashboard)/threads-content-ops/OperationsDashboard.tsx` — 열을 `minmax(0,0.85fr)_minmax(0,1.15fr)`로, 칸마다 `min-w-0`.
- **다음부터 확인:** 사용자 입력·AI 생성 같은 긴 문장이 들어가는 칸을 `fr` 그리드나 flex에 둘 때는 `minmax(0,…fr)`/`min-w-0`을 기본으로 쓰고, 짧은 샘플이 아니라 긴 문장 샘플로 화면을 확인한다. 로그인이 필요한 화면은 임시 미리보기 페이지에 목 데이터를 넣어 확인한 뒤 반드시 삭제(커밋 금지)한다.

## 2026-10-06 루트 앱 내장 기능은 타입 오류가 빌드에 안 잡히고, Server Action의 throw 메시지는 운영 서버에서 가려짐 (threads-content-ops v1.28)

- **증상:** ① `npm run build`(루트)가 통과했는데 `npx tsc --noEmit`에서는 `web-actions.ts`의 `"youtube_api_key"` 타입 오류가 나왔다(이전 단계 코드, 런타임은 정상). ② 예상된 실패(키 없음·중복 링크 등)를 Server Action에서 `throw new Error("안내문")`하면 운영 서버에서는 클라이언트가 원문 대신 "Server Components render 오류" 같은 일반 문구를 받아 안내가 안 보인다(v1.24 생성 오류와 같은 원인).
- **원인:** ① 루트 `next.config.mjs`가 `typescript.ignoreBuildErrors: true`라 `app/` 안 서브프로그램 코드의 타입 오류가 빌드를 막지 않는다. ② Next.js는 운영 빌드에서 Server Action이 던진 오류의 메시지를 클라이언트에 노출하지 않는다.
- **해결(위치):** ① 루트에 내장된 프로그램을 고칠 때는 빌드와 별개로 `npx tsc --noEmit -p tsconfig.json 2>&1 | grep <프로그램 경로>`를 돌려 내 변경 파일의 오류가 없는지 확인한다(기존 오류는 기록만 하고 범위 밖이면 건드리지 않음). ② 새 Server Action은 `{ ok: true } | { ok: false; error: string }`을 반환하고 클라이언트가 `error`를 그대로 보여준다(`app/(dashboard)/threads-content-ops/web-actions.ts`의 소스 큐 4개 함수, `SourceQueue.tsx`).
- **다음부터 확인:** 사용자에게 보여줄 한글 안내가 필요한 실패는 throw하지 말고 결과 객체로 돌려준다. 루트 내장 서브프로그램은 `tsc` 결과를 따로 확인한다.

## 2026-10-06 관리자 프로그램 관리(admin/programs) 목록의 외부 링크 버튼(↗) 단순 span 장식으로 인한 클릭 불가 해결

- **증상:** 관리자 화면 `/admin/programs`에서 프로그램명 우측의 외부 링크 아이콘(`↗`)을 클릭해도 아무런 동작을 하지 않음.
- **원인:** `components/admin/ProgramsAdminBoard.tsx`에서 `ExternalLink` 아이콘이 링크(`<a>`)가 아니라 단순 `<span>` 태그로 감싸져 있었음.
- **해결(위치):** 
  1) `components/admin/ProgramsAdminBoard.tsx`: `p.app_url`이 등록되어 있으면 해당 실제 서브프로그램 라이브 사이트(예: `https://threads-easy-planner.vercel.app`)로 즉시 새 탭(`target="_blank" rel="noopener noreferrer"`)으로 열리는 `<a>` 링크로 교체.
  2) `app_url`이 없을 때의 대안으로 소개 페이지(`/programs/${p.slug}`)로 이동 연결, 아래 슬러그 텍스트도 새 창 `Link`로 연결.
  3) 메인 지침(`CLAUDE.md`, `AGENTS.md`, `docs/PLATFORM_PATTERNS.md` §31)에 새 프로그램 등록 시 `app_url` 필수 등록 및 외부 링크 버튼 동작 보장 원칙 영구 명시.
- **다음부터 확인:** 외부 링크 형태의 UI 아이콘(`↗`)을 배치할 때는 단순 시각적 span으로 두지 말고 실제 타깃 URL로 연결되는 `<a>` 태그로 구현해야 하며, 새 프로그램 DB 등록 시 `programs.app_url`을 빠뜨리지 않는다.

## 2026-10-06 Anthropic 워크스페이스 미지정 키(sk-ant-usr-...) 400 에러 노출 및 친절한 한글 안내 개선 (threads-easy-planner v1.24)

- **증상:** Anthropic Claude API 키를 등록한 회원이 글 생성 시 `400 {"type":"error","error":{"type":"invalid_request_error","message":"This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id header..."}}` 원문 JSON 에러가 화면 상단에 그대로 노출됨.
- **원인:** Anthropic 콘솔에서 키를 생성할 때 특정 Workspace(Default)를 지정하지 않고 발급받은 키(`sk-ant-usr-...`)는 요청 헤더에 `anthropic-workspace-id`를 필수로 요구함. 이 에러가 발생했을 때 백엔드 에러 원문이 필터링 없이 그대로 사용자 화면에 노출됨.
- **해결(위치):** 
  1) `threads-easy-planner/src/lib/ai/generator.ts`: `formatAIErrorMessage` 함수를 신설하여 Anthropic workspace 에러 및 크레딧 부족, 잘못된 키 등의 SDK 오류를 사용자 친화적인 한글 안내문(해결 방법 및 OpenAI/Gemini 대안 안내)으로 가로채어 변환 제공.
  2) `threads-easy-planner/src/app/(dashboard)/settings/page.tsx`: 설정 화면의 Anthropic 키 발급 안내에 콘솔에서 Default Workspace 선택 후 발급(`sk-ant-api03-...`)해야 한다는 주의사항 명시 및 가장 안정적인 OpenAI (GPT-4.1) 추천 배지 탑재.
- **다음부터 확인:** 외부 AI 공급사(Anthropic, OpenAI 등)는 최근 워크스페이스/프로젝트 단위 키 정책을 강화하고 있으므로, LLM 호출부에서 SDK 에러 원문을 클라이언트에 그대로 던지지 말고 항상 `formatAIErrorMessage` 패턴으로 사용자 행동 요령(재발급 방법, 대안 엔진 권장)을 담은 한글 메시지로 정제한다.

## 2026-10-06 Tailwind 슬래시 유틸리티 CSS 선택자 이스케이프 오류 (threads-content-ops v1.15)

- 증상: `npm run build`에서 PostCSS `Unexpected '/'` 오류가 발생했다.
- 원인: `border-white/10`, `bg-black/20` Tailwind 클래스를 전역 CSS 선택자로 덮어쓰면서 백슬래시를 두 번 기록해 유효하지 않은 selector가 됐다.
- 해결(위치): `app/globals.css`의 `threads-content-ops-light` 범위 스타일을 `[class~="..."]` 속성 선택자로 교체했다.
- 다음부터 확인: 슬래시 유틸리티를 일반 CSS에서 대상으로 삼을 때 이스케이프를 추측하지 말고 속성 선택자나 별도 의미 클래스를 사용한 뒤 `npm run build`로 PostCSS까지 검증한다.

## 2026-10-05 외부 Electron 원본 편입 시 테스트 부재·취약 의존성을 통과로 오인하지 않음 (threads-content-ops v1.01 기반)

- 증상: 외부 Electron 원본을 새 AIMaster 서브프로젝트에 편입한 뒤 타입 검사와 린트는 통과했지만, `npm.cmd test`는 테스트 파일이 없어 종료 코드 1로 끝났고 `npm audit`는 critical 1건을 포함한 37건의 취약점 경고를 냈다.
- 원인: 컴파일 통과를 기능 검증·배포 가능 상태로 간주하면, 실제 테스트가 없는 상태와 공급망 위험을 놓치게 된다. 네이티브 호스트·Chrome 확장을 포함한 데스크톱 앱은 `npm install` 스크립트까지 곧바로 실행하면 위험 범위가 더 커진다.
- 해결: `threads-content-ops/desktop`에서 먼저 `npm.cmd ci --ignore-scripts`로 기준선을 조사하고, 타입 검사·린트·테스트를 분리 기록했다. `threads-content-ops/docs/IMPLEMENTATION_PLAN.md`와 `AGENTS.md`에 의존성 정리·테스트 추가 전 설치 파일 배포 금지를 명시했다.
- 다음부터 확인: 외부 소스는 설치 스크립트를 실행하기 전 패키지 구성과 네이티브 요소를 점검한다. 테스트 파일 0건은 테스트 통과가 아니며, 취약점 경고는 출시 전에 업데이트·재검증 또는 위험 평가로 반드시 처리한다.

## 2026-10-05 이론 중심 가이드로 인한 실제 프로그램 사용법 혼선 해결 및 실전 매뉴얼화 (threads-easy-planner v1.23)

- **증상:** 좌측 메뉴가 '초보자 가이드'로 되어 있고, 내부 내용이 스레드 떡상 알고리즘 이론 위주로 서술되어 있어 사용자가 화면의 버튼(페르소나 원클릭, 맞춤글 생성, 5대 훅 교체, 자댓글 CTA 등)을 어떤 순서로 조작해야 하는지 직관적으로 알기 어려움.
- **원인:** 초기 개발 단계에서 작성된 개념 위주의 가이드가 실제 발전한 프로그램 UI/UX 워크플로우와 동기화되지 않고 방치됨.
- **해결(위치):** 
  1) `threads-easy-planner/src/components/layout/Sidebar.tsx` 및 `MobileNavigation.tsx`: '초보자 가이드' ➔ '사용 매뉴얼'로 메뉴명 변경.
  2) `threads-easy-planner/src/app/(dashboard)/guide/page.tsx`: STEP 0(사전준비/API키) ➔ STEP 1(글감 선택/페르소나/맞춤글) ➔ STEP 2(5대 바이럴 훅 치환) ➔ STEP 3(자댓글 CTA 등록 공식) ➔ STEP 4(자동 저장 및 30일 보관함 관리) 순서로 실제 UI 버튼과 1:1 대응되는 5단계 비주얼 실전 가이드로 전면 재작성.
- **다음부터 확인:** 모든 서브프로젝트의 가이드/매뉴얼 페이지는 추상적인 마케팅 이론이 아니라, 해당 프로그램의 실제 화면 레이아웃과 조작 버튼 순서에 맞춘 "따라하기식 실전 매뉴얼"로 제작 및 유지보수한다.

## 2026-10-05 보관함 저장 누락 및 DB 테이블 미생성으로 인한 저장 콘텐츠 미출력 해결 (threads-easy-planner v1.22)

- **증상:** 사용자가 글을 생성하고 보관함(`/saved`)으로 이동했을 때 "아직 보관된 콘텐츠가 없습니다"라며 저장된 글이 나타나지 않음.
- **원인:** 
  1) 사용자의 심리는 "글이 생성되면 당연히 보관함에 저장될 것"으로 기대하지만, 기존 시스템은 생성 후 우측 상단의 `[💾 보관함에 저장]` 버튼을 수동으로 꼭 눌러야만 저장이 되는 구조였음.
  2) 더불어 운영 Supabase DB에 `tep_saved_plans` 테이블이 아직 미생성(마이그레이션 미적용) 상태였기 때문에, 브라우저가 바뀌거나 로컬 캐시가 격리된 환경에서 DB 조회가 실패함.
- **해결(위치):** 
  1) `threads-easy-planner/src/components/planner/PlannerApp.tsx`: `handleGenerate`가 성공하여 글이 완성되는 즉시 백그라운드에서 `savePlanToStorage`를 자동 호출하는 Auto-save 파이프라인을 구축함. 생성 직후 결과 카드의 버튼도 `[✅ 보관함 저장완료]`로 즉시 전환되어 사용자가 별도로 저장 버튼을 누르지 않아도 보관함에 100% 안전하게 저장되도록 개선함.
  2) `threads-easy-planner/src/lib/storage/savedPlansStorage.ts`: `getLocalPlans`의 JSON 파싱 방어 및 DB 실패 시에도 브라우저 로컬 스토리지에 무조건 안전하게 Fallback 보관되도록 개선함.
- **다음부터 확인:** 사용자가 글이나 콘텐츠를 생성하는 프로그램에서는 "수동 저장 버튼"에만 의존하지 말고 생성 즉시 자동 임시 보관(Auto-save)되도록 설계하여 사용자의 소중한 생성 결과물이 유실되지 않도록 한다.

## 2026-10-05 Zod validation.ts의 단일 미디어 배타적 규칙 잔존으로 인한 혼합 캐러셀 포스팅 실패 버그 해결 (threads-affiliate-poster v1.46)

- **증상:** 이미지와 동영상을 함께 첨부하고 최종 포스팅을 시도할 때 "이미지와 영상은 동시에 첨부할 수 없습니다. 하나만 선택해주세요." 에러가 발생함.
- **원인:** 과거 단일 미디어 업로드 시절 `src/lib/validation.ts`의 `postFormSchema`에 정의되어 있던 `data.imageUrl && data.videoUrl` 동시 첨부 금지 규칙 및 단일 URL 검증(`z.string().url()`)이 그대로 남아 있어, 서버 사이드 폼 검증(`parsePostForm`) 단계에서 걸려 탈락함.
- **해결(위치):** `threads-affiliate-poster/src/lib/validation.ts`에서 동시 첨부 금지 규칙을 완전히 삭제하고, 쉼표(`,`)로 구분된 다중 URL 목록을 안전하게 검증하는 `mediaUrlStringSchema`로 교체함. 또한 이미지와 영상의 총합 개수가 최대 20개 이하인지 검증하도록 개선하여 혼합 캐러셀 포스팅이 서버 검증을 100% 통과하도록 해결함.
- **다음부터 확인:** 프론트엔드 UI와 백엔드 API에서 새로운 복합 기능(혼합 미디어 캐러셀 등)을 확장할 때, 서버 액션의 입구를 지키고 있는 Zod 검증 스키마(`validation.ts`)에 과거의 제약 조건이 남아있지 않은지 반드시 최우선으로 함께 점검한다.

## 2026-10-05 캐러셀 다중 이미지(쉼표 구분) 단일 img src 대입으로 인한 이미지 미출력 버그 해결 (threads-affiliate-poster v1.42)

- **증상:** `/posts/[id]` 게시글 결과 상세 페이지에서 이미지가 전혀 보이지 않거나 엑박으로 표시됨 (예: `posts/7c950668-8223-4a68-a29b-2fdcfa304005`).
- **원인:** 캐러셀 기능으로 인해 `tap_posts.image_url`에 쉼표(`,`)로 구분된 2장 이상의 이미지 URL 문자열이 저장됨. 상세 페이지(`src/app/(dashboard)/posts/[id]/page.tsx`)에서 이를 파싱하지 않고 `<img src={post.image_url} />`로 통째로 대입하여, 브라우저가 유효하지 않은 주소(`url1,url2`)를 요청해 404/이미지 로드 실패가 발생함.
- **해결(위치):** `threads-affiliate-poster/src/components/posts/PostMediaViewer.tsx` 컴포넌트를 신설하여 `imageUrl`을 쉼표(`,`) 기준으로 분할(`split(",").map(...).filter(Boolean)`)하고, 다중 이미지일 경우 캐러셀 슬라이드 탐색(◀, ▶)과 카운트 배지(`📷 N / M장`), 하단 썸네일 내비게이션, 클릭 시 `ImageLightboxModal` 전체 화면 확대 보기까지 완벽하게 지원하도록 수정함.
- **다음부터 확인:** 다중 이미지를 지원하는 프로그램의 `image_url` DB 필드는 단일 URL뿐 아니라 쉼표 구분 문자열일 수 있음을 항상 전제하고, 화면에 렌더링하기 전 반드시 쉼표 파싱 및 다중 캐러셀 뷰어를 적용한다.

## 2026-10-05 Server Component에서 onClick 핸들러를 포함한 컴포넌트 렌더링 시 500 에러 발생 (threads-affiliate-poster v1.41)

- **증상:** `/posts/[id]` 게시글 결과 상세 페이지 접근 시 `This page couldn't load / A server error occurred. Reload to try again.` (500 에러) 발생. Vercel 로그에 `Error: Event handlers cannot be passed to Client Component props. { ... onClick: function onClick }` 발생.
- **원인:** 서버 컴포넌트인 `src/app/(dashboard)/posts/[id]/page.tsx`에서 본문 렌더링용으로 신설한 `PostContentRenderer.tsx`에 `"use client";` 지시어가 누락되어 있어 Server Component로 취급됨. 그 내부의 `<a>` 태그에 `onClick={(e) => e.stopPropagation()}` 핸들러가 포함되어 있어, Next.js 직렬화(stringify) 단계에서 서버 에러가 발생함.
- **해결(위치):** `threads-affiliate-poster/src/components/posts/PostContentRenderer.tsx` 최상단에 `"use client";` 지시어를 추가하여 명시적 클라이언트 컴포넌트로 선언함으로써, 서버 컴포넌트에서 import 시에도 이벤트 핸들러가 포함된 JSX가 정상 렌더링되도록 수정함.
- **다음부터 확인:** `onClick`, `onChange`, `useState`, `useEffect` 등 클라이언트 이벤트 및 상태를 포함하는 모든 UI 컴포넌트는 반드시 최상단에 `"use client";` 지시어를 명시한다. 특히 Server Component 페이지에서 새로 만든 컴포넌트를 import할 때 이 지시어 누락 여부를 필수로 점검한다.

## 2026-10-03 복잡한 템플릿 입력 모드로 인한 원클릭 페르소나 자동화 UX 회귀 및 복구 (threads-easy-planner v1.10~v1.11)

- **증상:** "가전 주부형, 독신형 등 여러가지 페르소나가 있었고 다양한 상황에서 해당 버튼을 누르면 그에 맞는 다양한 버전의 콘텐츠가 만들어졌었는데 왜 삭제했나"라는 지적이 발생함. 복잡한 템플릿 입력 필드 4개가 메인을 가로막고, 사용자가 입력한 키워드 대신 더미 기본값이 내부적으로 전달되는 버그까지 발생함.
- **원인:** 프롬프트 템플릿 지원 과정에서 사용자의 본래 니즈(버튼 하나로 가전 주부형, 독신 자취형 등 상황별 콘텐츠 원클릭 생성)를 놓치고, 개발자 중심의 복잡한 4개 입력 탭을 얹으면서 최초 완성본에서 검증되었던 "상황별 페르소나 버튼 그리드"를 제거해버림.
- **해결(위치):** `threads-easy-planner/src/components/planner/PlannerApp.tsx` 및 `types/planner.ts`에 6대 핵심 페르소나(`👩‍🍳 가전·살림 주부형`, `🏠 독신·자취생형`, `💼 워킹맘·직장인형`, `💄 20대 쇼핑·뷰티 에디터형`, `⚡ IT·테크 리뷰어형`, `💰 N잡러·재테크 부업형`)를 정의하고 입력창 바로 아래에 원클릭 생성 버튼 그리드로 전면 배치. 클릭 즉시 해당 페르소나의 시점과 말투로 5대 훅 + 4단계 공감 본문이 완성되도록 프롬프트 주입 로직을 `generator.ts`와 `actions/planner.ts`에 완벽 통합.
- **다음부터 확인:** 사용자가 호평했던 기능(다양한 상황/페르소나 버튼)은 절대 임의로 단순화하거나 폼 형태로 대체하지 말고, 항상 전면에 원클릭 버튼 그리드로 유지해야 한다.

## 2026-10-03 OpenAI `json_object` 모드 배열 응답 미출력 및 언랩핑 누락 (threads-easy-planner v1.02)

- **증상:** "오늘 뭐 쓰지?" 버튼을 클릭했을 때 추천 주제 10선이 화면에 전혀 렌더링되지 않고 빈 상태로 남았음.
- **원인:** OpenAI API의 `response_format: { type: "json_object" }`는 시스템 프롬프트가 `[...]` 배열을 요구해도 최상위에 반드시 `{ "topics": [...] }` 등의 JSON Object로 감싸서 반환함. `parseJsonSafe` 결과가 배열이 아닌 일반 객체로 파싱되어, 클라이언트에서 `Array.isArray` 검증 및 `length > 0` 검사가 실패함. 또한 Gemini 모델 ID가 존재하지 않는 `gemini-2.5-flash`로 기재되어 있었음.
- **해결(위치):** `threads-easy-planner/src/lib/ai/generator.ts`의 시스템 프롬프트를 명시적인 `{ "topics": [ ... ] }` 객체 스키마로 수정하고, 파싱 결과가 객체일 때 `candidate = parsed.topics || parsed.response || parsed.data || Object.values(parsed).find(Array.isArray)`로 자동 언랩핑하여 항상 배열을 반환하도록 보강함. Gemini 모델 ID는 `gemini-2.0-flash`로 정상화. 클라이언트 `PlannerApp.tsx`에서도 배열 방어 코드 및 오늘 뭐 쓰지 상시 추천 트리거 적용.
- **다음부터 확인:** OpenAI의 `json_object` 응답 포맷을 사용할 때는 결코 배열(`[...]`)을 직접 기대하지 말고, 항상 객체(`{ items: [...] }`)로 프롬프트를 작성하고 백엔드에서 키 언랩핑 처리를 필수적으로 수행한다.

## 2026-10-02 리치 HTML 정리 과정에서 원본 텍스트 스타일을 과도하게 삭제함

- **증상:** 내용은 입력되지만 글자 크기·굵기·줄간격·인용·목록 등 원본 서식이 모두 평문처럼 보였다.
- **원인:** `tistorySafeHtml()`가 보안상 class/style을 일괄 삭제하고 text-align만 복원했다. 자체 생성 본문이 Tailwind 클래스로 서식을 표현하므로 티스토리에 보내기 전 서식 정보가 소실됐다.
- **해결(위치):** `tistory-auto-blog/utils/extensionContent.ts`에서 허용 목록 기반 inline CSS 보존과 Tailwind 텍스트 서식 클래스→인라인 CSS 변환을 추가했다. script·이벤트·레이아웃 클래스는 계속 제외한다.
- **다음부터 확인:** 외부 편집기로 HTML을 옮길 때 class를 단순 삭제하기 전에 그 class가 실제 콘텐츠 서식을 담당하는지 확인하고, 대상 편집기가 지원하는 안전한 inline CSS로 변환한다.

## 2026-10-02 저장 동기화를 위해 전체 리치 HTML을 재설정해 서식을 손상함

- **증상:** 본문 글자는 남았지만 제목·목록·인용·표 등의 원본 서식이 티스토리 결과에서 깨졌다.
- **원인:** 발행 전 `setContent(html)`로 iframe 전체를 TinyMCE에 재주입하면서 티스토리의 고유 HTML 정리 과정이 다시 실행됐다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`의 서식 입력을 TinyMCE `insertContent()` API 우선으로 변경했다. 모델에 입력 시점부터 반영하므로 발행 전에는 `setContent()`를 하지 않고 `save()`만 수행한다.
- **다음부터 확인:** 리치 편집기에서 제출 동기화가 필요해도 전체 HTML을 재설정하기 전에 원본 서식의 round-trip 보존 여부를 확인한다. 가능하면 블록 입력 시 공식 API를 사용해 모델을 함께 갱신한다.

## 2026-10-02 리치 HTML 원문을 텍스트처럼 정규화해 문단 존재를 오판함

- **증상:** v1.41에서 TinyMCE 모델 동기화 뒤에도 발행 원본 검증이 동일하게 `37/45개 문단`에서 중단됐다.
- **원인:** 숨김 textarea의 HTML 원문에 있는 `&nbsp;`·`&amp;` 같은 엔티티를 직접 정규화해 `nbsp` 등 실제 화면에 없는 문자로 계산했다. 화면에 있는 텍스트와 원문 문자열을 동등 비교한 오류였다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`가 발행 원본을 detached DOM에 넣고 `textContent`로 엔티티를 해석한 뒤 문단 검증 및 동기화 비교를 수행한다.
- **다음부터 확인:** HTML 저장값의 텍스트 존재를 검사할 때 태그를 정규식으로 지우거나 원문을 바로 비교하지 말고, DOM 파서로 엔티티를 해석한 텍스트를 기준으로 비교한다.

## 2026-10-02 TinyMCE textarea 동기화만으로 내부 모델이 갱신되지 않음

- **증상:** v1.40 발행 전 검증에서 iframe에는 본문이 보이지만 숨김 원본의 문단 확인이 `37/45`로 끝났다.
- **원인:** iframe DOM과 `#editor-tistory` 값을 맞춰도 TinyMCE의 undo/content 모델은 여전히 `execCommand` 이전 일부 상태를 갖고 있어, `save()` 직렬화가 전체 문단을 보장하지 않았다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`의 `synchronizeTistoryEditorForPublish()`에서 iframe HTML을 TinyMCE `setContent()`로 모델에 넣고 undo 상태, input/change/SetContent 이벤트, `save()` 순서로 실행한다.
- **다음부터 확인:** TinyMCE 자동화에서 DOM·textarea 동기화와 내부 모델 갱신은 별개다. 최종 제출 경로에는 `setContent()` 또는 모델이 인지하는 입력 경로를 사용한 뒤 직렬화 결과를 검증한다.

## 2026-10-02 티스토리 화면 본문과 발행용 원본 불일치

- **증상:** iframe 편집기에는 텍스트·이미지가 모두 보였지만 티스토리 최종 발행본에는 이미지들만 남고 텍스트가 사라졌다.
- **원인:** `document.execCommand("insertHTML")`로 변경된 iframe DOM이 TinyMCE의 숨김 `#editor-tistory` 원본으로 저장되지 않아, 티스토리 발행이 오래된 원본을 사용했다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`의 `synchronizeTistoryEditorForPublish()`가 TinyMCE `save()`·이벤트·textarea 동기화를 수행하고, 발행 전 원본에서도 모든 본문 문단을 확인한다.
- **다음부터 확인:** 리치 편집기 자동화는 화면 DOM 검증만으로 충분하지 않다. 실제 제출/발행에 쓰는 숨김 원본 또는 편집기 API `getContent()`까지 함께 검증한다.

## 2026-10-02 티스토리 제목이 본문에 중복 출력됨

- **증상:** 티스토리 제목 입력칸에 들어간 제목과 동일한 텍스트가 본문의 독립 문단 또는 소제목으로 한 번 더 보였다.
- **원인:** 확장 입력기가 제목을 본문으로 복사한 것이 아니라, AI가 반환한 `요약글`·소제목·문단 중 하나가 제목과 같아 본문 HTML에 저장된 상태였다.
- **해결(위치):** `tistory-auto-blog/utils/news/generator.ts`가 생성 마크다운에서 제목과 완전히 같은 독립 줄을 제거하고, `utils/extensionContent.ts`와 확장 목록 API가 기존 글을 티스토리로 보낼 때 같은 제목 HTML 블록을 제외한다.
- **다음부터 확인:** 제목과 본문은 별도 필드이므로, 중복 시 입력기뿐 아니라 생성 JSON의 요약·소제목·문단 값과 전송용 블록 변환을 모두 분리해 점검한다.

## 2026-10-02 티스토리 연속 HTML 삽입에서 본문 문단이 앞 위치에 덮어써짐

- **증상:** 티스토리 새 글 자동입력 뒤 본문 위쪽의 일부 텍스트와 이미지들만 남고, 이어지는 텍스트 문단이 사라졌다.
- **원인:** `document.execCommand("insertHTML")` 전의 `Selection`이 TinyMCE 비동기 DOM 재구성 뒤에도 존재하는 것처럼 보이지만, 실제로는 이전 위치를 가리킬 수 있었다. 삽입 성공 반환값만 확인해 문단의 지속성을 검증하지 않았다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`에서 각 HTML 블록마다 선택 영역을 본문 끝으로 다시 설정하고, 텍스트/서식 블록마다 `innerText` 기반 잔존 검증을 추가했다. 티스토리가 서식을 제거했을 때만 해당 텍스트를 키보드 입력으로 복구한다.
- **다음부터 확인:** 리치 텍스트 편집기에 연속 삽입할 때 명령 반환값만 성공 기준으로 삼지 말고, 삽입 위치와 실제 DOM 잔존을 블록 단위로 확인한다.

## 2026-10-02 — 빈 편집기의 서비스 제한과 목록 동기화 기능을 분리함

- **증상:** 빈 새 글에서 홈주제 목록을 읽으려고 발행 설정창을 열면 티스토리가 레이어를 열지 않아 반복적으로 실패했다.
- **원인:** 홈주제의 실제 메뉴는 티스토리 발행 단계에만 있고, 티스토리는 제목·본문이 없는 새 글에서 그 발행 단계를 제공하지 않는다. 클릭 방식 변경으로 해결할 수 있는 문제가 아니었다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`에 기본 홈주제 목록을 내장해 빈 글에서도 선택하게 하고, 실제 메뉴 수집은 제목·본문 입력 후 `목록 갱신`에서만 수행한다. 빈 글 갱신 실패는 기본 목록 안내로 처리하고, 실제 적용 때 메뉴 불일치만 명확히 차단한다.
- **다음부터 확인:** 외부 서비스 UI 자동화가 반복 실패하면 selector·이벤트만 보지 말고 해당 화면이 현재 문서 상태에서 열릴 수 있는지 먼저 확인한다. 사전 선택이 필요한 값은 기본 목록과 실제 상태 동기화를 분리한다.

## 2026-10-02 — 외부 React UI가 DOM click을 거부하면 CDP 포인터 입력으로 전환

- **증상:** v1.28에서 발행 설정 버튼의 `button.click()`과 재시도·폴링을 추가했는데도 티스토리 발행창이 열리지 않았다.
- **원인:** DOM `click()` 이벤트는 `isTrusted=false`다. 외부 서비스의 React 핸들러가 신뢰되지 않은 이벤트를 무시하면 selector·대기 시간을 보완해도 클릭 효과가 없다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`의 `openPublishSettings()`가 버튼 중앙 좌표를 읽은 후 Chrome Debugger `Input.dispatchMouseEvent`의 moved/pressed/released 순서로 클릭한다. 모달은 role selector와 `ReactModal__Content--after-open` 모두 확인한다.
- **다음부터 확인:** DOM 요소가 존재하고 `.click()`에도 상태가 안 바뀌면 단순 재시도 전에 `isTrusted` 제약을 의심한다. 이미 확장에 있는 debugger 입력 경로로 실제 포인터·키보드 이벤트를 보내고, 결과를 selector 가시성으로 확인한다.

## 2026-10-02 — React 모달 열림은 합성 클릭 한 번과 고정 짧은 대기로 판정하지 않음

- **증상:** 홈주제 불러오기에서 `발행 설정창을 열지 못했습니다.`가 발생했다.
- **원인:** `openPublishSettings()`가 발행 버튼에 합성 `mousedown`/`mouseup`/`click`만 보내고 300ms 후 모달 selector 존재를 확인했다. 티스토리 React 이벤트 처리와 레이어 렌더링은 그 시간 안에 끝나지 않거나 합성 이벤트를 받지 않을 수 있었다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`에서 기존 레이어의 가시성을 먼저 확인하고, 버튼 `focus()`·`click()` 후 최대 15회 폴링한다. 실패 시 최대 3회 다시 시도한다.
- **다음부터 확인:** 외부 서비스의 모달·드롭다운 자동화는 실제 클릭 경로와 가시성 기반 폴링을 사용하고, 동적 UI에 단일 고정 지연만 두지 않는다.

## 2026-10-02 — 화면용 섹션 라벨을 본문 생성 템플릿에 넣지 않음

- **증상:** 생성된 블로그 본문의 첫 요약 문단에 `요약:`이라는 라벨이 실제 글자처럼 표시됐다.
- **원인:** `tistory-auto-blog/utils/news/generator.ts`의 `contentMarkdown` 템플릿이 요약을 `> **요약**: ${excerpt}`로 조립했다. 이 라벨은 관리 화면의 구분에만 필요할 수 있지만 게시 본문에는 불필요했다.
- **해결(위치):** 템플릿을 `> ${excerpt}`로 변경해 인용형 도입 문단과 요약 내용은 유지하면서 라벨만 제거했다.
- **다음부터 확인:** 생성 템플릿의 표제·라벨·안내 문구는 실제 게시 본문에 노출되는지 검토하고, 화면 구분이 필요하면 렌더링 UI에서 처리한다.

## 2026-10-02 — 서비스가 제공하는 선택 항목은 자유 입력값으로 추측하지 않음

- **증상:** 티스토리 홈주제를 확장 입력칸에 직접 적어야 했고, 실제 메뉴 표기와 띄어쓰기·구분점이 다르면 적용 단계에서 선택하지 못할 수 있었다.
- **원인:** 발행 창의 홈주제 메뉴를 이미 자동화하면서도, 확장 UI에는 서버나 티스토리에서 가져온 선택지 대신 자유 텍스트 입력칸만 제공했다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`의 `loadTistoryTopics()`가 현재 티스토리 발행 창에서 메뉴 항목을 읽어 `#topicName` 드롭다운에 채운다. 목록은 `chrome.storage.local`에 캐시하며, `sidepanel.html`은 직접 입력 대신 불러오기 버튼과 select를 제공한다.
- **다음부터 확인:** 대상 서비스의 메뉴 값이 정확히 일치해야 하는 자동화라면, UI부터 자유 입력 대신 실제 목록을 동기화·선택하도록 만든다. 목록을 정적으로 복제할 때는 서비스 변경에 취약하므로 로그인한 화면에서 읽는 방식을 우선한다.

## 2026-10-02 — 외부 편집기에 보낼 본문은 텍스트 평탄화 전에 의미 서식을 보존할 것

- **증상:** 웹의 본문 편집 화면에는 제목 단계·굵게·목록·인용·표·링크가 보이는데, 티스토리에 입력된 실제 포스팅에서는 일반 텍스트처럼 표시됐다.
- **원인:** `tistory-auto-blog/utils/extensionContent.ts`가 원문 HTML의 모든 태그를 제거해 텍스트 블록으로 만들었고, 확장이 `Input.insertText`로 한 글자씩만 입력했다. 이 방식은 글자 내용만 전달할 뿐 HTML 의미 구조를 전달하지 않는다.
- **해결(위치):** 안전한 의미 HTML(`h1`~`h4`, `strong`, 목록, 인용, 표, 링크 등)을 유지한 `html` 입력 블록을 추가하고 `extension/sidepanel.js`가 TinyMCE의 native `insertHTML` 경로로 넣도록 바꿨다. 외부 이미지 URL은 계속 파일 붙여넣기 업로드를 사용하며, 웹 앱 전용 class/style/이벤트·버튼 요소는 제거한다.
- **다음부터 확인:** 입력 대상 편집기에 웹 원문과 같은 모양을 요구하면, 서버 변환기에서 태그·속성·이미지 처리 정책을 먼저 명시한다. 텍스트 추출 결과만 검증하지 말고 헤딩·목록·링크·표가 포함된 글을 실제 대상 편집기에 넣어 구조가 남는지 확인한다.

## 2026-10-02 — 동적으로 생성되는 메뉴는 클릭 전 목록 selector를 필수 조건으로 삼지 않음

- **증상:** 티스토리 확장이 `입력 중단: 카테고리 목록을 열지 못했습니다.`라고 멈췄다.
- **원인:** `tistory-auto-blog/extension/sidepanel.js`의 `openTistoryCategory()`가 클릭 전에 `#category-list`가 존재해야만 통과하도록 작성돼 있었다. 티스토리는 `#category-btn` 클릭 뒤 React로 목록을 렌더링할 수 있어, 이 경우 실제 클릭 이벤트가 실행되지 않았다.
- **해결(위치):** 버튼 존재·가시성만 먼저 확인한 뒤 `button.click()`을 실행하도록 바꾸고, `aria-expanded=true` 또는 동적으로 생긴 목록의 가시성 중 하나로 열림을 판정한다. 렌더링 지연을 고려해 최대 3회 클릭·대기를 재시도한다.
- **다음부터 확인:** 드롭다운·팝업·자동완성 목록처럼 클릭 후 DOM에 생길 수 있는 요소는 사전 존재 검사가 아니라 클릭 후 폴링으로 검증한다. 열림 판정은 단일 selector에만 의존하지 말고 접근성 상태와 가시성 대안을 함께 둔다.

## 2026-10-02 — 공용 버튼 그리드는 좁은 보조 패널의 작업 버튼에 재사용하지 않음

- **증상:** 티스토리 확장의 입력 진행 상태 오른쪽 버튼 두 개가 폭 156px 안에서 공용 3열 `.draft-actions` 규칙을 적용받아 버튼 글자가 여러 줄로 끊겼다.
- **원인:** 화면 영역의 의미와 폭이 다른데도, 3개 목록용 버튼 그리드를 핵심 작업 버튼에 그대로 재사용했다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.html`에 `.content-input-actions`를 두고, `styles.css`에서 충분한 열 폭·세로 1열·`white-space: nowrap`을 지정했다. 작은 패널에서는 전용 반응형 2열로만 전환한다.
- **다음부터 확인:** 버튼 묶음은 개수뿐 아니라 부모 폭과 실행 중요도를 기준으로 전용 레이아웃을 만들고, 실제 확장 패널 폭에서 문구 줄바꿈을 확인한다.

## 2026-10-02 — 티스토리 편집기 본문 검증은 전체 `innerText` 완전 비교를 하면 안 됨

- **증상:** 제목·본문·이미지가 화면에 정상 입력된 뒤에도 확장 프로그램이 `입력된 본문을 다시 확인하지 못했습니다.`로 중단했다.
- **원인:** `tistory-auto-blog/extension/sidepanel.js`의 `verifyTistoryInput()`이 서버에서 추출한 각 본문 블록 전체 문자열을 티스토리 iframe의 `innerText`에서 완전 일치로 검색했다. 티스토리는 링크 자동 변환, 줄바꿈의 문단/figure 재구성, 이미지 캡션 제외를 수행하므로 표시 내용이 같아도 문자열이 달라질 수 있다.
- **해결(위치):** `compactVerificationText()`와 `verificationSamples()`로 공백·문장부호·제로폭 문자 차이를 제외하고 문단의 앞/뒤 문맥을 확인한다. 일반 입력은 모든 문단을, 중단 후 설정 재개는 제목·본문 존재·이미지 수와 문단 60% 이상을 확인한다. 오류에는 사용자 본문을 남기지 않고 `확인 n/n개 문단`만 표시한다.
- **다음부터 확인:** 브라우저 편집기는 `innerHTML`/`innerText`를 자체 정규화하므로, 입력 성공 판정은 편집기가 보장하지 않는 직렬화 전체 일치가 아니라 의미 있는 문맥·미디어 수·대상 상태를 함께 검증한다.

## 2026-10-01 — 티스토리 검사기의 input 값 비수집을 입력 실패로 오해하지 말 것

- 증상: 태그를 입력·확정한 뒤에도 구조 조사 JSON의 `#tagText` 텍스트가 비어 있어 태그 입력이 실패한 것처럼 보였습니다.
- 원인: 검사기는 개인정보 보호를 위해 `input`·`textarea`·contenteditable의 실제 값을 의도적으로 수집하지 않습니다.
- 해결: v1.03에서 카테고리 option 노드와 태그 컨테이너의 값 비공개 구조를 별도로 수집합니다.
- 다음부터: 사용자 입력값을 검사 결과에 추가하지 말고, 구조·요소 개수·선택 후 표시값으로 동작을 검증합니다.

## 2026-10-01 — 중첩 메뉴는 텍스트 중복 제거로 항목을 버리지 말 것

- 증상: 열린 `#category-list`가 보이는데 v1.03 검사 결과의 `categoryOptions`는 비어 있었습니다.
- 원인: 상위·하위 요소의 텍스트가 같은 경우를 모두 제거하는 필터가 중첩 메뉴의 실제 선택 항목까지 제거했습니다.
- 해결: v1.04에서 해당 필터를 제거하고 구조 후보를 그대로 반환합니다.
- 다음부터: 동적 메뉴에서는 구조를 먼저 수집한 뒤에만 중복 정리 규칙을 적용합니다.

## 2026-10-01 — 태그 검증에는 입력값이 아닌 칩 구조를 수집할 것

- 증상: 값 비공개 정책을 지키면 `#tagText`만으로 Enter 뒤 태그 확정 여부를 검증할 수 없었습니다.
- 원인: 실제 태그는 입력값이 아니라 `.editor_tag` 하위 칩으로 렌더링되지만, 기존 검사기가 그 요소를 기록하지 않았습니다.
- 해결: v1.05에서 태그 루트의 자식 및 `tag` 클래스 하위 요소의 텍스트를 제외한 구조만 수집합니다.
- 다음부터: 개인정보가 되는 텍스트·aria-label은 수집하지 않고 요소 타입·class·자식 수만 사용합니다.

> **모든 CLI(Claude Code, Codex, Gemini 등)는 작업을 시작하기 전에 이 문서를 먼저 읽는다.**
> 작업하다가 에러를 해결했거나, 꼭 확인해야 할 점검 사항을 발견하면 **그 작업의 커밋에 이 문서 기록을 함께 넣는다.**
> 같은 실수를 다른 CLI가 반복하지 않게 하는 것이 목적이다(2026-10-01 주인님 지시 — 루트 `CLAUDE.md` 핵심 원칙 7번).
>
> - 더 긴 배경 설명이 필요한 재사용 패턴은 `docs/PLATFORM_PATTERNS.md`, 지난 시즌 교훈 원문은 루트 `AGENTS.md` §10에 있다.
>   이 문서는 **"무엇이 터졌고 → 왜 → 어떻게 고쳤고 → 다음엔 무엇을 확인할지"를 짧게** 모은 곳이다.
> - 서브프로젝트 하나에만 해당하는 자세한 내용은 그 폴더 `AGENTS.md`에 쓰고, 여기에는 한 줄 요약 + 위치만 남긴다.

## 기록하는 방법 (형식)

새 항목은 해당 분류 맨 아래에 이 형식으로 추가한다. 날짜·프로그램·버전을 꼭 적는다.

```
- **[YYYY-MM-DD · 프로그램 vX.YY] 증상 한 줄**
  - 원인: …
  - 해결: …(파일·함수 위치)
  - 다음부터 확인: …
```

---

## A. 작업 전 점검 체크리스트 (매번)

1. `docs/HANDOFF.md`에서 **다른 CLI가 작업 중인 폴더**를 확인하고 건드리지 않는다(예: `naver-blog-seo-studio`는 Codex 담당). `git status`로 남의 미커밋 변경을 확인.
2. 스테이징(index)은 다른 CLI와 공유된다 — **`git add`는 커밋 직전에, 내 파일만 경로를 지정해서** 하고 바로 커밋한다.
3. 고칠 서브프로젝트의 `AGENTS.md`/`README.md`를 먼저 읽는다.
4. 버전 규칙: 배포할 때마다 `lib/version.ts`(또는 `utils/version.ts`) `APP_VERSION` + DB `programs.version`을 같이 +0.01.
5. 새/수정 API·Server Action은 **로그인 + 프로그램 이용 권한**(`checkProgramAccessApi`/`requireProgramAccess`) + `dynamic`/`fetchCache` 두 줄.
6. API 키는 **회원 본인 키만**(운영자 키 폴백 금지). 외부 계정 OAuth 앱도 회원 본인 앱.
7. 유료 API 호출·DB 구조 변경·환경변수 변경·실제 데이터 삭제는 먼저 주인님께 확인.
8. 브라우저 자동화(네이버 등)는 `docs/PLATFORM_PATTERNS.md` §20(봇 탐지 회피)·§28(웹→확장→네이버 입력)을 먼저 읽는다.

## Meta Threads OAuth 오류 1349168 — redirect URI 정확 일치

- **증상:** Meta OAuth에서 “차단된 URL”, 오류 코드 `1349168`이 표시되고 콜백으로 돌아오지 않는다.
- **원인:** 인증 요청의 `redirect_uri`가 회원 본인 Meta 앱의 **Threads API 액세스 → 설정 → 유효한 OAuth 리디렉션 URI** 목록에 정확히 등록되지 않았거나, Webhook/Facebook 로그인용 칸에 잘못 넣었다.
- **해결:** OAuth 시작 URL과 토큰 교환에 같은 프로덕션 콜백 상수를 사용하고, 회원 설정 화면에 정확한 URI와 입력 위치를 표시한다. Development 모드 앱이면 연결할 계정을 Tester 역할에도 등록한다.
- **다음부터 확인:** 콜백 주소를 환경값·배포 별칭으로 조합하지 말고, 화면에 표시한 주소와 authorize/token 교환이 바이트 단위로 같은지 확인한다.

## 참조 UI 색상 — 클래스명이 아니라 실제 렌더링 색상 확인

- **증상:** 다른 프로그램과 같은 Tailwind 색상 클래스를 적용했는데도 사용자가 보는 버튼 색이 다르다.
- **원인:** 프로그램별 Tailwind 빌드·전역 스타일·색상 토큰에 따라 같은 클래스명이 같은 최종 RGB를 보장하지 않는다.
- **해결:** 참조 스크린샷 또는 실제 브라우저의 버튼 중심 픽셀 RGB를 확인하고, 필요한 경우 해당 색상값을 명시적으로 적용한다.
- **다음부터 확인:** “같은 클래스”가 아니라 실제 화면의 기본·hover·disabled 상태를 대조한다.

---

## B. 배포 · Vercel

- **[2026-10-01 · ai-auto-blog v1.06] 새 Vercel 프로젝트 첫 배포가 전 페이지 404**
  - 원인: `vercel project add`로 만든 빈 프로젝트는 프레임워크 설정이 비어 있어 Next.js로 빌드되지 않음.
  - 해결: 서브프로젝트에 `vercel.json` `{"framework": "nextjs"}`를 두고 재배포.
  - 다음부터 확인: 새 프로젝트 첫 배포 직후 주요 경로를 `curl`로 200/307 확인. 별칭은 배포 결과의 "Aliased" 주소를 쓸 것(이름이 겹치면 `-one` 등이 붙음).
- **[2026-10-01 · ai-auto-blog v1.06] 루트에 내장돼 있던 앱을 단독 빌드하자 숨은 타입 오류 발생**
  - 원인: 루트 `next.config.mjs`가 `typescript.ignoreBuildErrors: true`라 내장 시절 오류가 가려져 있었음.
  - 해결: 단독 `npm run build`로 드러난 오류 수정.
  - 다음부터 확인: 서브프로젝트를 분리하거나 옮길 때는 반드시 그 폴더에서 단독 빌드.
- **[2026-09-20] 루트 앱 배포가 `EBUSY`로 실패** — 데스크톱 앱 `runtime/`·`node_modules`를 루트 `.vercelignore`에 넣는다(루트 `CLAUDE.md`).
- **[2026-08-30] 권한 확인 결과가 캐시돼 다른 사람 화면이 보임** — 레이아웃·API에 `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`, 배포 후 `X-Vercel-Cache: MISS` 확인(`PLATFORM_PATTERNS` §10).

- **[2026-10-06 · 전 프로그램] 좌측 메뉴 "← 다른 프로그램 보기"가 `/dashboard` 대신 전체 프로그램 카탈로그(`/programs`)로 가야 함**
  - 원인: 사이드바 링크가 과거 `https://www.buylife.xyz/dashboard`로 설정되어 있었으나, 사용자가 다른 자동화 프로그램을 둘러보기 위해서는 전체 프로그램 목록 카탈로그인 `https://www.buylife.xyz/programs`로 이동하는 것이 훨씬 직관적임.
  - 해결: 24개 독립 서브프로그램 + Threads 운영 자동화 + SEO 스튜디오 전체의 `← 다른 프로그램 보기` 링크를 `https://www.buylife.xyz/programs`로 전수 수정하고, `docs/SIDEBAR_LAYOUT_STANDARD.md` 및 `CLAUDE.md`, `AGENTS.md` 새 프로그램 체크리스트에 공식 영구 반영.
  - 다음부터 확인: 새 서브프로그램을 작성하거나 사이드바를 수정할 때 `← 다른 프로그램 보기` 링크는 반드시 `https://www.buylife.xyz/programs`로 연결한다.

- **[2026-10-01 · 전 프로그램] 좌측 메뉴 "← 다른 프로그램 보기"가 BLOG 대시보드로 감**
  - 원인: 사이드바 표준이 `https://www.buylife.xyz/blog/dashboard`로 정해져 있었는데, BLOG를 단독 배포로 분리(v1.06)하면서 `/blog/*`를
    BLOG 새 주소로 넘기도록 해 모든 프로그램의 이 링크가 BLOG 대시보드로 가게 됐다. 분리할 때 다른 프로그램이 그 주소를 쓰는지 찾아보지 않았다.
  - 해결: 24개 프로그램 + ai-image-studio + BLOG의 링크를 `https://www.buylife.xyz/dashboard`로 교체, `docs/SIDEBAR_LAYOUT_STANDARD.md` 수정.
  - 다음부터 확인: **프로그램 주소를 옮기거나 넘김(redirect)을 걸 때는 저장소 전체에서 그 주소 문자열을 검색**해 다른 프로그램이 링크하고 있는지 확인한다.

- **[2026-10-01 · music, shop-detail-page] 사용하지 않는 변수 하나로 빌드 실패**
  - 원인: 사이드바 표준화 커밋(`69dc5de`)이 `components/layout/Sidebar.tsx`에 쓰지 않는 `MAIN_SITE_URL` 상수를 남김 → Next 빌드의 ESLint(no-unused-vars)가 오류로 막음. 그 뒤로 이 두 프로그램은 배포되지 않은 상태였다.
  - 해결: 그 줄 삭제 후 빌드 통과.
  - 다음부터 확인: 여러 프로그램을 한꺼번에 고친 커밋은 **고친 프로그램을 전부 빌드**해 보고 배포한다(일부만 확인하면 나머지가 조용히 깨진 채 남는다).

## C. 환경변수 · DB · 저장소

- **[2026-10-01 · ai-auto-blog v1.07] 단독 배포 후 로그인이 "fetch failed"**
  - 원인: 서브프로젝트 `.env.local`에 **없어진 옛 Supabase 프로젝트 주소**가 남아 있었고, 그 값을 Vercel에 그대로 옮김(서버 로그 `ENOTFOUND`).
  - 해결: 루트 `.env.local`의 공용 DB(`esgxyikcnnvmlhygjkth`) 값으로 교체.
  - 다음부터 확인: 환경변수는 **루트 `.env.local` 기준**으로 넣고, 주소에 공용 프로젝트 ID가 있는지 확인. 로그인 실패는 `vercel logs`부터 본다.
- **[2026-10-01 · ai-auto-blog v1.12] 글 1개가 12MB — 이미지가 base64로 본문에 통째로 저장됨**
  - 해결: 모든 AI·첨부 이미지를 Supabase Storage public 버킷에 올리고 주소만 저장(`ai-auto-blog/utils/imageStorage.ts`), 기존 글은 스크립트로 이전(원본 백업 후).
  - 다음부터 확인: 이미지·파일을 DB 칸에 base64로 넣지 않는다(`CLAUDE.md` Reusable Patterns, `PLATFORM_PATTERNS` §12).
- **[2026-10-01 · ai-auto-blog v1.13] 여러 프로그램이 함께 쓰는 버킷의 자동 삭제**
  - 확인: `post-images`는 threads·insta·naver-cafe·BLOG 공용 — 정리 작업은 **자기 프로그램 폴더(`<회원 id>/ai-auto-blog/`)만** 지운다.
- **[2026-10-01 · ai-auto-blog v1.14] 이미 기준을 넘긴 기존 데이터를 자동 삭제 규칙이 한 번에 지울 뻔함**
  - 해결: 실제 삭제 전 대상 개수를 SQL로 세어 주인님께 확인 → 정책 시작일부터 유예(`ai-auto-blog/utils/imageRetention.ts`).
  - 다음부터 확인: 삭제 규칙을 새로 켤 때는 "지금 바로 지워질 개수"를 먼저 보고한다.
- **[2026-09-30] 운영자 `GEMINI_API_KEY` 폴백으로 키 없는 회원의 생성 비용이 운영자에게 청구** — 폴백 코드·환경변수 삭제, 본인 키 없으면 `API_KEY_REQUIRED` 안내.
- **[2026-10-01 · ai-auto-blog v1.32, 티스토리 복제 중 발견(cloud)] BLOG의 `blog_*` 테이블이 "공유 블로그" 정책 그대로 열려 있음 (미수정 — 로컬 확인·승인 필요)**
  - 운영 DB 정책을 읽기 조회(`pg_policies`)로 확인: `blog_posts` SELECT는 `anon` 포함 `using (true)`(공개 키만 있으면 로그인 없이도 모든 글 조회 가능), `blog_categories` insert/update/delete는 로그인한 **모든 회원**이 가능(남의 카테고리 삭제 가능), `blog_post_categories` insert는 `anon` 가능·delete는 모든 회원, `blog_comments`/`blog_likes` insert는 `anon` 가능. 또 `GET /api/posts/[id]`는 인증 없이 서비스 롤로 글을 돌려준다(`ai-auto-blog/app/api/posts/[id]/route.ts`).
  - 원인: 예전 "누구나 읽는 공유 블로그" 설계가 멀티테넌시 원칙 2번(사용자별 격리)으로 바뀌었는데 DB 정책·GET API가 그대로 남음. BLOG 글은 회원 개인 콘텐츠(30일 보관)라 노출 대상이 아니다.
  - 해결(티스토리판): `tistory_*`는 전부 본인만(RLS owner-only) + `(id, user_id)` 복합 외래키 + GET API에 로그인·권한·소유자 확인. 파일 `tistory-auto-blog/supabase/migrations/0001_tistory_init.sql`, `tistory-auto-blog/AGENTS.md`.
  - **BLOG에는 아직 적용 안 함**: 공개 글 보기(`/posts/[id]`가 브라우저 anon 클라이언트로 읽음)·메인 카탈로그 연동 등 영향 범위를 로컬에서 확인한 뒤, 정책 교체 + GET API 인증 추가를 별도 작업(버전 +0.01, 주인님 승인)으로 진행할 것.
  - 다음부터 확인: 새 프로그램 테이블은 만들 때 `pg_policies`로 `using (true)`/`anon`이 남아 있지 않은지 점검하고, 서비스 롤을 쓰는 GET API에도 로그인·소유자 확인이 있는지 본다.

## D. 크롬 확장 · 네이버 자동 입력

- **[2026-10-01 · ai-auto-blog v1.27] 추천 링크가 실제 링크 3개 + 글자 1개로 중복 입력**
  - 원인: 붙여넣기 주입을 `executeScript({allFrames: true})`로 돌려 **여러 겹의 프레임이 같은 편집기에 각각 붙여넣음**, 동시에 돈 확인 로직이 실패로 오판해 글자까지 입력.
  - 해결: 커서가 있는 프레임 하나를 찾아(`document.activeElement`가 그 문서의 편집 영역 + `document.hasFocus()`) `frameIds`로 그 프레임에서만 1번 실행·확인(`ai-auto-blog/extension/sidepanel.js` `findFocusedEditorFrame`).
  - 다음부터 확인: **상태를 바꾸는 주입(붙여넣기·클릭·입력)은 `allFrames` 금지**, 조사·확인만 `allFrames`.
- **[2026-10-01 · ai-auto-blog v1.21~1.22] 한 글자씩 입력한 링크는 글자로만 들어가 링크가 안 걸림**
  - 원인: 키 입력으로는 링크 서식을 못 만들고, "주소 뒤 띄어쓰기 → 네이버 자동 링크"도 걸리지 않았다.
  - 해결: 링크만 있는 줄은 `<a href>` HTML을 `ClipboardEvent('paste')`로 붙여넣기 → 네이버가 실제 링크로 받아줌(주인님 화면 확인).
- **[2026-10-01 · ai-auto-blog v1.20] 두 확장이 같은 자리에 들어간 것처럼 보임**
  - 원인: 아이콘이 없어 둘 다 회색 "A" 아이콘, 같은 사이드패널 사용(크롬은 하나만 표시), 불러온 폴더 설정 실수.
  - 해결: 전용 아이콘·이름. 확장은 **불러온 폴더 위치로 구분**되므로 확장마다 다른 폴더에서 불러온다.
- **[2026-10-01 · ai-auto-blog v1.27] 웹용 이미지 설명("📷 … 고화질 확대")이 네이버 본문에 글자로 입력됨** — 편집기(Tiptap) 저장 글은 설명이 별도 문단으로 남는다. 변환기에서 제외.
- **[2026-10-01 · ai-auto-blog v1.28] 태그 추천에서 "투자협의"가 "투자협"으로 잘림**
  - 원인: 단어 끝 한 글자가 조사(의·로·도 등)처럼 보이면 무조건 떼는 규칙(SEO 스튜디오 확장 v1.57 `normalizeTagCandidate`도 같음).
  - 해결: 해시태그는 본문에 그대로 있으면 유지 → 조사 뗀 말이 본문에 있으면 그 말 → 그 밖엔 확실한 조사만 뗀다(`ai-auto-blog/extension/sidepanel.js` `resolveHashtag`).
  - 다음부터 확인: 한국어 단어 처리 규칙은 실제 회원 글 여러 개로 결과를 찍어 보고 확정한다. SEO 스튜디오 쪽은 Codex가 맞출 것.
  - 후속(같은 날 v1.29): 주인님 지시로 BLOG도 SEO v1.59 코드를 그대로 쓰게 되어 위 보완은 빠졌다. SEO v1.59는 조사 목록 방식으로 바뀌었지만 "투자협의"→"투자협"은 여전히 남는다(해시태그를 그대로 살리는 규칙인데 조사 제거가 먼저 적용됨) — SEO 쪽에서 고치면 BLOG도 복사해 맞춘다.
- **[2026-10-01] SEO 스튜디오 확장 타이핑 간격(24~52ms)이 §20 기준(70~170ms)보다 빠름** — Codex 담당 폴더라 미수정, 담당 CLI가 맞출 것.
- **[2026-10-01 · naver-blog-seo-studio v1.59] 한글 조사·문장부호 처리와 일반어 추출로 추천 태그가 훼손·중복됨**
  - 원인: 문자 클래스 끝 제거는 `메시지`의 `지`, `합니다`의 `다`처럼 조사와 겹치는 일반 글자까지 제거한다. 마침표까지 허용한 토큰은 `있습니다.`가 금칙어 비교를 우회했고, 이미 구체 태그가 있어도 `서울`·`여행` 같은 구성 단어와 `시간`·`여행지` 같은 일반어가 다시 추가됐다.
  - 해결: 실제 조사 접미사를 긴 순서로 한 번만 제거하고 문장부호를 먼저 정리했다. 주제·핵심 키워드는 보존하되 본문에서 새로 뽑은 일반어·서술어와, 이미 있는 구체 태그에 포함된 단어를 제외했다(`naver-blog-seo-studio/extension/sidepanel.js`). 두 사용자 화면 사례 회귀 테스트를 추가했다.
  - 다음부터 확인: 한국어 형태를 정규식 문자 집합으로 자르지 말고 완전한 접미사 단위로 다루며, 추천 결과에는 실제 사용자 화면 사례의 불필요 후보와 구체 태그의 구성 단어가 다시 나타나지 않는지 테스트한다.
- **확장 배포 규칙**: 프로그램 버전 = 확장 `version_name` = ZIP 버전. `ai-auto-blog`는 `prebuild`로 자동 동기화(`PLATFORM_PATTERNS` §28). 압축해제 확장은 스스로 업데이트되지 않으니 회원 안내 필수.

## E. 터미널 · 도구 (Windows + Git Bash)

- **[2026-10-01] `curl "$B/경로"`가 엉뚱한 주소로 요청** — Git Bash가 `/`로 시작하는 인자를 Windows 경로로 바꾼다. `export MSYS_NO_PATHCONV=1`을 먼저.
- **[2026-10-01] `node -e "…"` 안에 백틱(`)이 든 긴 글을 넣었더니 bash가 백틱 내용을 명령으로 실행**
  - 해결: 실제 피해는 없었지만, 긴 글·문서 수정은 **스크립트 파일(.js)로 따로 써서 실행**하거나 Edit 도구를 쓴다.
- **[2026-10-01] 문자열 치환이 "찾을 수 없음"으로 실패** — 파일이 CRLF 줄바꿈. 치환 스크립트는 `\r\n`→`\n`으로 바꿔 비교한 뒤 원래 줄바꿈으로 되돌려 저장한다.
- **[2026-10-01] 경로 일괄 치환(`blog/`→`ai-auto-blog/`)이 옛 기록 속 다른 의미의 `blog/page.tsx`까지 바꿈** — 일괄 치환 후 반드시 바뀐 줄을 훑어보고 되돌릴 것은 되돌린다.
- **[2026-10-01] 백그라운드로 넘어간 명령이 나중에 실행돼 파일을 다시 건드림** — 백그라운드 작업이 끝났다는 알림 후 `git status`로 의도치 않은 변경(줄바꿈만 바뀐 것 포함)을 확인하고 되돌린다.
- **[2026-10-01] `server-only`를 import하는 파일은 `tsx`로 바로 실행하면 모듈 없음 오류** — 테스트할 때는 `NODE_PATH`에 빈 `server-only` 모듈을 둔 임시 폴더를 지정한다.
  - **[2026-10-04 정정]** 프로젝트에 `node_modules/server-only`가 이미 있으면 `NODE_PATH` 방식은 통하지 않고 "Client Component에서 import할 수 없다"는 오류가 난다. 이때는 **`npx tsx --conditions=react-server 파일.ts`** 로 실행한다(`server-only`가 빈 모듈로 처리됨). 테스트용 임시 파일은 프로젝트 폴더에 만들고 끝나면 반드시 지운다.
- **[2026-10-04] Git Bash에서 한글·따옴표가 많은 긴 heredoc을 여러 `cat > 파일 <<EOF`로 이어 쓰면 따옴표 짝이 안 맞아 통째로 실패** — 실패하면 아무 파일도 안 써진 채 끝나므로 결과를 `ls`로 확인하고, 긴 파일은 Write 도구로 하나씩 쓴다.
- **[2026-10-05 · shorts-viral-studio v1.03] TSX 코드를 `node -e "…"`로 파일에 덧붙이면 템플릿 리터럴(백틱 `${…}`)이 셸에서 먼저 풀려 `className={}`처럼 빈 값으로 저장됨** — 타입 검사는 통과하지만 화면 스타일이 사라진다. 코드 수정은 Edit/Write 도구로 하고, 쓴 뒤 `className={}` 같은 빈 표현식이 없는지 `grep -n "={}"`로 확인한다.
- **[2026-10-04] `vercel link`는 해당 폴더의 `.env.local`을 덮어쓴다** — Supabase 로컬 실행 값은 루트 `.env.local`에서 다시 복사해 쓴다. 환경변수는 `printf '%s' "$VAL" | vercel env add 이름 production --scope buylife`로 넣으면 값이 화면에 안 나온다.

## F. 외부 사이트 연동

- **[2026-09-30] 로컬에서 되던 외부 요청이 Vercel에서 403**(쿠팡 `coupa.ng`) — 클라우드 IP 차단. 외부 사이트를 서버에서 부르는 기능은 미리보기 배포에서 `vercel curl`로 먼저 확인(루트 `AGENTS.md` §10).
- **[2026-09-30] `sharp`가 Vercel 함수에서 실패**(libvips 누락) — 작은 이미지 처리는 순수 JS(`jpeg-js`).
- **[2026-10-01] AI 모델 ID 추측 금지** — 각 공급사 모델 목록 API(무료)로 실제 ID를 확인한 뒤 등록(`docs/AI_MODEL_INTEGRATION_STANDARD.md`). 예: Claude Haiku 4.5는 `claude-haiku-4-5-20251001`.

## G. 독립 앱 빌드

- **[2026-10-04 · shorts-viral-studio v1.01] 튜토리얼/외부 소스를 그대로 옮기면 "있는 척하는 기능"이 따라온다**
  - 증상: 원본 쇼츠 분석기는 Gemini에 제목·조회수·댓글만 보내면서 화면에는 컷 전환 주기·렌즈·BGM 타이밍을 "분석 결과"처럼 표시했고, 프롬프트의 예시 값("24mm", "Crash Zoom"…)을 그대로 베낄 수 있었다. 영상 설명 필드는 어디서도 채워지지 않아 항상 빈 값이었다.
  - 해결: Gemini는 공개 YouTube 영상 주소(`fileData.fileUri`)를 직접 넘겨 실제로 보고 분석, 그 외 엔진·실패 시에는 `evidence: "metadata"` + 문장 앞 `(추정)` 표시, 프롬프트에는 예시 값 대신 필드 설명만(`shorts-viral-studio/src/lib/ai/pipeline.ts`).
  - 다음부터 확인: 외부 소스를 이식할 때는 "화면에 보이는 결과가 AI에게 실제로 준 입력에서 나올 수 있는 정보인가"를 먼저 따진다. 입력에 없는 정보(영상 내용 등)를 "분석"으로 보여주면 §24와 같은 가짜 데이터 문제다. JSON 스키마 예시에 그럴듯한 값을 넣지 말 것.
- **[2026-10-04 · shorts-viral-studio v1.01] 구독자 비공개 채널을 0으로 계산하면 "조회수÷구독자"가 0이 되어 등급이 왜곡됨**
  - 해결: `hiddenSubscriberCount`이거나 0이면 `subs = null`, 비율·등급은 "판정불가"(`src/lib/youtube/metrics.ts`).
  - 다음부터 확인: 외부 API의 "비공개/없음"은 0이 아니라 null로 다루고 화면에서도 "비공개"로 표시.
- **[2026-10-04 · shorts-viral-studio v1.01] YouTube API 정책·할당량**
  - 검색 `search.list` 1회 = 약 100유닛(+videos/channels 각 1유닛), 기본 하루 1만유닛 ≈ 100회. 할당량/키 오류는 `reason`(quotaExceeded 등)으로 구분해 한국어 안내.
  - YouTube API 데이터는 30일 넘게 저장할 수 없다(삭제 또는 갱신). 이 프로그램은 프로젝트를 `created_at` 30일 후 삭제하고 화면에 남은 일수를 표시한다.

- **[2026-10-01 · tistory-auto-blog v1.01] `pricing_plans` 등록 전 조회가 `created_at` 없음으로 실패**
  - 원인: 다른 테이블 관례를 적용해 `pricing_plans.created_at`으로 정렬을 가정했지만, 이 테이블에는 그 칼럼이 없다.
  - 해결: `information_schema.columns`로 실제 스키마를 확인하고 `sort_order` 기준으로 기본 3단계 요금제를 등록했다.
  - 다음부터 확인: 공용 테이블의 데이터 등록·검증 SQL은 칼럼을 추측하지 말고 먼저 스키마를 조회한다.

- **[2026-10-01 · tistory-auto-blog v1.01] 독립 빌드가 Google Fonts 요청 실패로 중단됨**
  - 원인: 복제한 `app/layout.tsx`가 `next/font/google`의 Inter를 빌드 시 내려받아, 네트워크가 제한된 환경에서 컴파일이 실패했다.
  - 해결: 외부 폰트 import를 제거하고 CSS 시스템 글꼴 토큰으로 전환했다(`tistory-auto-blog/app/layout.tsx`, `app/globals.css`). `npm run build` 통과.
  - 다음부터 확인: 독립 배포 앱은 외부 빌드 시점 리소스에 의존하지 않도록 하고, 복제 직후 해당 폴더에서 단독 빌드를 실행한다.
## 2026-10-01 — 티스토리 TinyMCE 입력은 최상위 문서와 본문 iframe을 분리한다

- **증상:** 제목·태그·카테고리는 입력되는데 본문이 다른 문서에 입력되거나, 하나의 `allFrames` 호출에서 잘못된 프레임을 대상으로 변경할 위험이 있다.
- **원인:** 티스토리 글쓰기 페이지는 제목·태그·카테고리·발행 설정을 최상위 프레임에 두고, 본문 `body#tinymce`만 TinyMCE iframe에 둔다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`는 `allFrames`를 본문 프레임 식별용 읽기 전용 검사로만 쓰고, 모든 변경은 확인된 단일 `frameId` 또는 최상위 `frameId: 0`에만 보낸다. 입력 전 빈 글 검증과 입력 후 제목·본문 재검증도 같은 경계를 따른다.
- **다음부터 확인:** iframe 기반 편집기는 프레임별 selector를 스냅샷으로 확인하고, 변경 호출에 `allFrames: true`를 절대 사용하지 않는다.

## 2026-10-01 — 이미지 클립보드는 PNG로 정규화한 뒤 붙여넣는다

- **증상:** 확장에 내려받은 JPEG·WebP 등 원본 이미지 Blob을 그대로 `ClipboardItem`에 넣으면 브라우저·편집기에 따라 붙여넣기를 거부하거나 삽입이 불안정할 수 있다.
- **원인:** 티스토리 사진 메뉴는 DOM 파일 입력을 제공하지 않아 운영체제 파일 선택창을 우회할 수 없고, 클립보드 이미지 MIME 지원도 편집기마다 일정하지 않다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`는 이미지 Blob을 캔버스로 그린 뒤 `image/png` Blob으로 변환하여 클립보드에 쓰고 `Ctrl+V`를 보낸다. 이후 iframe의 `figure > img` 수를 확인한다.
- **다음부터 확인:** 파일 입력이 없는 웹 편집기는 원본 MIME을 그대로 가정하지 말고 PNG 클립보드 변환과 실제 DOM 삽입 확인을 함께 둔다.

## 2026-10-02 — 탭을 활성화한 뒤 사이드패널에서 이미지 클립보드를 쓰면 포커스 오류가 난다

- **증상:** 티스토리 본문·첫 이미지 입력 후 다음 이미지 처리에서 `Failed to execute 'write' on 'Clipboard': Document is not focused.`로 중단됐다. 실패 상태는 `tistory_posts.tistory_input_error`에 실제로 기록됐다.
- **원인:** 이미지 입력 전에 티스토리 탭을 활성화하면 사이드패널 문서는 더 이상 포커스를 갖지 않는다. 사이드패널의 `navigator.clipboard.write()`는 포커스가 필요해 다중 이미지 입력에서 실패했다.
- **해결(위치):** `tistory-auto-blog/extension/offscreen.html`·`offscreen.js`와 `background.js`를 추가해 `offscreen` 문서가 이미지 URL을 PNG로 변환하고 클립보드에 쓴다. `sidepanel.js`는 메시지로 준비를 요청한 뒤 단일 본문 iframe에만 `Ctrl+V`를 보낸다.
- **다음부터 확인:** 편집 대상 탭을 활성화한 상태에서 연속 이미지 클립보드 작업이 필요하면 사이드패널이 아니라 `offscreen` 문서로 옮기고, 실제 두 장 이상 입력으로 확인한다.

## 2026-10-02 — 이미지 붙여넣기 뒤 20초만 기다리면 정상 업로드도 실패로 기록될 수 있다

- **증상:** v1.12에서 첫 이미지 처리 후 `이미지 1의 티스토리 업로드 완료를 확인하지 못했습니다.`가 `tistory_posts.tistory_input_error`에 기록됐다.
- **원인:** 티스토리가 고해상도 PNG를 서버에 올린 뒤 iframe에 `figure > img`를 만드는 데 걸릴 수 있는 시간을 20초로 고정했다. 또한 background가 오프스크린 문서의 클립보드 준비 실패 응답을 확인하지 않고 성공으로 바꾸고 있었다.
- **해결(위치):** `tistory-auto-blog/extension/background.js`가 오프스크린 응답 실패를 그대로 반환하도록 수정하고, `extension/sidepanel.js`의 DOM 완료 확인을 최대 90초(진행 시간 표시 포함)로 늘렸다.
- **다음부터 확인:** 외부 편집기의 비동기 미디어 업로드는 단순 붙여넣기 성공이 아니라 실제 DOM 완료를 충분한 제한 시간으로 폴링하고, 중계 메시지는 하위 작업의 실패 응답까지 전파한다.

## 2026-10-02 — 오프스크린 문서는 클립보드 포커스 제약의 해결책이 아니다

- **증상:** v1.13에서도 `Failed to execute 'write' on 'Clipboard': Document is not focused.`가 발생했다.
- **원인:** Chrome 오프스크린 문서는 설계상 포커스를 받을 수 없다. 이미지형 `navigator.clipboard.write()`가 포커스를 요구하는 환경에서는 오프스크린 문서로 옮겨도 같은 제약이 반복된다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`에서 시스템 클립보드와 `Ctrl+V`를 제거했다. Storage 이미지를 PNG `File`로 만든 뒤 티스토리 본문 iframe의 `ClipboardEvent('paste')`에 담아 직접 전달한다.
- **다음부터 확인:** `offscreen` API의 CLIPBOARD 사유만으로 포커스 요구 Clipboard API가 항상 동작한다고 가정하지 말고, 문서의 포커스 가능 여부와 실제 입력 환경을 함께 검증한다.

## 2026-10-02 — `dispatchEvent()`의 false는 cancelable 이벤트 전달 실패가 아닐 수 있다

- **증상:** v1.14에서 `이미지 1을(를) 티스토리 본문에 전달하지 못했습니다.`로 즉시 중단됐다.
- **원인:** cancelable `paste` 이벤트를 티스토리 편집기가 정상 처리하며 `preventDefault()`를 호출하면 `dispatchEvent()`는 false를 반환한다. 이를 전달 실패로 잘못 해석했다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`에서 반환값 기반 중단을 제거하고, 이후 실제 `figure > img` 생성 폴링으로만 이미지 입력 성공을 판정한다.
- **다음부터 확인:** 합성 이벤트는 `dispatchEvent()` 반환값만으로 성공을 판정하지 말고, 취소 가능 여부·이벤트 핸들러의 기본 동작 차단 의미와 실제 후속 DOM 상태를 함께 확인한다.

## 2026-10-02 — 티스토리 기본 발행 설정이 입력 전체를 중단시키는 문제와 정렬 손실을 분리해 처리

- **증상:** 제목·본문·이미지 입력 뒤 기본 발행 설정만 적용하려 해도 `발행 설정창을 열지 못했습니다`로 전체 입력이 중단될 수 있고, 원문과 달리 본문이 가운데 정렬로 표시됐다.
- **원인:** `applyRemainingTistorySettings()`가 기본값에도 React 발행 모달을 무조건 열었으며, `tistorySafeHtml()`이 모든 `style`·`class`를 삭제해 `text-align` 정보까지 제거했다. 이미지 블록 뒤 TinyMCE 커서의 정렬 상태가 후속 문단에 상속될 수 있었다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`의 `needsPublishDialog()`가 실제 변경값(공개 외 공개범위, 댓글 정책 변경, 홈주제, 예약)일 때만 모달을 열도록 했고, `tistory-auto-blog/utils/extensionContent.ts`가 허용된 네 가지 정렬값만 보존하고 정렬 없는 본문 블록을 왼쪽 정렬로 명시한다.
- **다음부터 확인:** 외부 서비스의 설정 모달은 기본 상태까지 자동으로 열지 말고 실제 변경이 필요할 때만 열며, HTML 정화 시 레이아웃에 필요한 최소 허용 속성은 별도 보존 규칙으로 검토한다.

## 2026-10-02 — 홈주제 드롭다운은 발행창 열기와 같은 실제 포인터 입력으로 선택한다

- **증상:** 홈주제를 선택한 입력이 `발행 설정 적용 결과를 확인하지 못했습니다`라는 일반 오류로 중단됐다.
- **원인:** 발행창 열기만 Chrome Debugger의 실제 클릭을 쓰고, 발행창 안의 홈주제 드롭다운은 React가 무시할 수 있는 합성 DOM 클릭을 썼다. 이 경로는 적용 결과 객체도 안정적으로 반환하지 못했다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`의 `applyTistoryTopicWithTrustedClicks()`가 드롭다운·일치 항목을 각각 실제 포인터 클릭으로 선택하고, 후속 버튼 문구가 선택값을 포함할 때만 성공으로 처리한다.
- **다음부터 확인:** React가 관리하는 외부 서비스의 선택 UI는 모달 열기와 내부 항목 선택에 서로 다른 신뢰 수준의 클릭을 섞지 말고, 모두 실제 포인터 입력과 화면 상태 검증으로 통일한다.

## 2026-10-02 — 재개 자동화에서 동적 태그 입력칸 부재는 전체 실패가 아니다

- **증상:** 이전 입력 실패 뒤 `설정 이어서 적용`을 누르면 `입력 위치(#tagText)를 찾지 못했습니다`로 제목·본문을 이미 입력한 글의 후속 설정도 멈췄다.
- **원인:** 티스토리의 `#tagText`는 고정 입력 요소가 아니며, 이전 실패로 열린 발행 모달이 남으면 더 이상 접근할 수 없다. 코드가 해당 selector를 모든 화면에서 필수로 가정했다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`에서 재개 전 `closePublishSettings()`로 열린 모달을 닫고, `addTistoryTags()`가 실제로 보이는 태그 입력 후보만 사용한다. 후보가 없으면 태그 목록만 `skipped`로 돌려 나머지 설정을 계속 적용한다.
- **다음부터 확인:** 외부 서비스에서 동적으로 생성되는 부가 입력칸은 제목·본문처럼 필수값으로 취급하지 말고, 부재 시 남은 필수 작업을 진행할 수 있는지 분리해 판단한다.

## 2026-10-02 — 발행 설정 자동화는 모호한 선택을 추측하지 않는다

- **증상:** 티스토리 발행 창에는 댓글·주제처럼 같은 형태의 드롭다운과 날짜가 겹칠 수 있는 달력 버튼이 있어, 인덱스나 텍스트 일부만으로 선택하면 의도하지 않은 설정을 바꿀 위험이 있다.
- **원인:** 발행 설정은 최종 게시 직전의 상태를 바꾸므로, 비슷한 DOM 구조를 일반화하거나 존재하지 않는 selector를 가정하면 안전하지 않다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`는 확인된 최상위 프레임의 발행 창에서 공개 범위 라벨·보이는 드롭다운·정확히 하나인 메뉴 항목만 선택하고, 적용 뒤 `checked`·선택 문구·날짜·시간을 검증한다. 하나로 식별되지 않으면 중단하며 `#publish-btn`은 참조·클릭하지 않는다.
- **다음부터 확인:** 최종 외부 반영 직전의 설정 자동화는 추측 기반 fallback을 넣지 말고, 선택 대상의 유일성 및 적용 결과를 확인한 뒤 사용자에게 최종 실행을 남긴다.

## 2026-10-02 — 리치 편집기에 기존 HTML을 넣을 때 서식이 자동으로 보존되지는 않는다

- **증상:** `tistory-auto-blog` 게시글 수정 화면에 들어가면 기존 본문의 레이아웃·서식이 사라지고, 저장하면 그 상태가 본문에 반영될 수 있었다.
- **원인:** Tiptap/ProseMirror는 스키마에 등록되지 않은 HTML 속성과 래퍼 노드(`class`, `style`, `div`, `figure`, `figcaption`)를 파싱 과정에서 버린다. 생성기 본문은 해당 구조로 레이아웃을 표현하고 있었다.
- **해결(위치):** `tistory-auto-blog/components/RichTextEditor.tsx`에 전역 HTML 속성 보존 확장과 컨테이너·이미지 캡션 노드를 등록해, 기존 HTML이 편집기 내부에서도 그대로 왕복되도록 했다.
- **다음부터 확인:** 리치 편집기에 기존 HTML을 불러오는 기능은 샘플 콘텐츠에 제목·목록·인용·코드·이미지/캡션·class/style을 포함해 로드 전후 HTML을 비교한다.

## 2026-10-02 — 일반 버튼을 텍스트 입력용 포커스 검사에 재사용하면 성공 동작도 실패로 오인한다

- **증상:** 티스토리 카테고리 버튼 `#category-btn`이 목록을 정상적으로 연 뒤 “입력 위치를 찾지 못했습니다”로 전체 입력이 중단됐다.
- **원인:** 제목·본문 입력을 위한 `focusKnownTarget()`은 대상이 `input`/`textarea`이거나 `contenteditable`이어야 성공으로 판단한다. 카테고리는 일반 버튼이라 클릭 후 포커스가 이동하면 이 판정이 거짓이 됐다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`에 `openTistoryCategory()`를 추가해 버튼의 `aria-expanded`와 실제 목록 가시성으로 열기 성공을 검증했다. 중단된 글은 본문을 다시 쓰지 않는 설정 이어서 적용 경로로 복구한다.
- **다음부터 확인:** 클릭 가능한 제어와 텍스트 입력 영역은 같은 성공 기준을 공유하지 않는다. 버튼·메뉴는 클릭 뒤의 열림 상태 또는 선택 결과를 검증한다.
# 티스토리 태그 입력칸 미노출 시 본문 해시태그 대체 경로 (2026-10-02, v1.34)

- 증상: `#tagText` 등 전용 태그 입력칸이 없는 현재 티스토리 화면에서 태그가 건너뛰어졌다.
- 원인: v1.33이 전용 입력칸 부재를 설정 적용의 중단 원인에서만 제외하면서, 기존 본문 끝 `#태그` 대체 입력까지 제거했다.
- 해결: `extension/sidepanel.js`가 전용 입력칸을 찾지 못하면 본문 iframe 맨 끝에 왼쪽 정렬 해시태그 줄을 넣고 실제 텍스트를 재확인한다.
- 다음부터 확인: 티스토리 구조 조사에서 태그 입력 UI가 없으면 태그를 조용히 생략하지 말고, 본문 해시태그 대체 경로와 중복 방지를 함께 점검한다.
# 티스토리 홈주제 적용 시 이전 비공개 상태 유지 (2026-10-02, v1.35)

- 증상: 홈주제를 적용한 뒤 발행 설정창에서 비공개가 체크된 채 남았다.
- 원인: 홈주제 전용 빠른 경로가 공개 범위를 별도로 적용하지 않아, 티스토리가 보존한 직전 비공개 선택을 그대로 두었다.
- 해결: `extension/sidepanel.js`에서 홈주제 선택 전 공개 라디오를 Chrome Debugger의 실제 포인터 클릭으로 선택하고 화면에서 체크 상태를 확인한다.
- 다음부터 확인: 기본값을 가정하는 빠른 경로도 티스토리가 이전 글 설정을 보존하는지 검증하고, 사용자가 고른 값을 명시적으로 적용한다.
# 티스토리 발행창 공개 라벨 구조 차이 (2026-10-02, v1.36)

- 증상: 발행창을 연 뒤 “공개 선택 항목을 찾지 못했습니다”로 중단됐다.
- 원인: 공개 라디오의 연결 라벨/부모 텍스트가 단독 `공개`와 달라 엄격한 문구 일치 조건이 실패했다.
- 해결: `extension/sidepanel.js`에서 확인된 `#open20`을 우선 선택하고, 라벨·형제·부모 중 보이는 요소를 실제 포인터로 클릭한 뒤 체크 상태를 `#open20`으로 검증한다.
- 다음부터 확인: 티스토리처럼 라디오 입력과 표시 라벨이 분리된 UI는 텍스트 하나에만 의존하지 말고, 실측 ID와 복수의 클릭 후보를 함께 사용한다.
# 티스토리 공개 라디오 포인터 클릭 후 상태 미확정 (2026-10-02, v1.37)

- 증상: `#open20`과 클릭 대상을 찾았지만 “공개 범위 적용을 화면에서 확인하지 못했습니다”로 중단됐다.
- 원인: 해당 발행창에서는 공개 라디오가 포인터 이벤트만으로 React 선택 상태를 확정하지 않았다.
- 해결: `extension/sidepanel.js`가 공개 라디오의 티스토리 일반 클릭 경로를 우선 호출하고, 체크되지 않았을 때만 Chrome Debugger 포인터 클릭을 보조 경로로 사용한다. 확인은 최대 4.5초 동안 재시도한다.
- 다음부터 확인: 동일 화면에서도 드롭다운과 라디오의 React 이벤트 수용 방식이 다를 수 있으므로, 실제 동작이 확인된 제어 유형별 클릭 경로를 분리한다.

## 2026-10-03 — 원문 레이아웃 컨테이너의 정렬을 본문 정렬로 전달하면 안 된다

- **증상:** v1.44 이후 티스토리 본문이 원문과 달리 가운데 정렬되는 등 서식이 변형됐다(`D:\PDS\서식깨짐.png`).
- **원인:** 안전 스타일 보존기가 콘텐츠가 아닌 `div`/`span`의 `text-align`도 전달했다. CSS 정렬은 상속되므로, 컨테이너의 화면용 정렬이 자식 문단 전체에 적용됐다. 이전 버전은 style을 전부 제거해 이 회귀가 드러나지 않았다.
- **해결(위치):** `tistory-auto-blog/utils/extensionContent.ts`에서 정렬을 문단·제목·목록·인용·표 셀에만 보존하고, 컨테이너의 `text-align`은 안전 스타일 목록에서도 제외했다.
- **다음부터 확인:** 외부 편집기로 HTML을 옮길 때는 속성 자체의 안전성뿐 아니라 CSS 상속 범위를 검토한다. 특히 `div`/`span`처럼 레이아웃과 콘텐츠 양쪽에 쓰이는 태그의 스타일은 의미 블록으로 제한한다.

## 2026-10-03 — 이미지가 든 부모 컨테이너를 통째로 평문 처리하면 본문 구조가 사라진다

- **증상:** 실제 발행본에서 이미지 뒤에 소제목·목록·여러 문단이 하나의 연속 텍스트로 합쳐졌다.
- **원인:** `htmlToInputBlocks()`가 이미지가 하나라도 있는 부모를 `textWithLinks()`로 변환해, 모든 자식의 의미 HTML·문단 경계를 버렸다.
- **해결(위치):** `tistory-auto-blog/utils/extensionContent.ts`가 레이아웃 컨테이너를 재귀 순회하고, `figure`/`img`와 문단·제목·목록을 원래 순서의 독립 입력 블록으로 만든다.
- **다음부터 확인:** HTML 변환기는 이미지 포함 여부만으로 부모 전체를 특수 처리하지 말고, 혼합 콘텐츠(이미지+제목+목록+문단) 샘플의 출력 블록 순서와 태그를 검증한다.

## 2026-10-03 — 확장 격리 세계에서는 페이지 JavaScript 편집기 인스턴스를 읽을 수 없다

- **증상:** 확장 미리보기 원문에는 제목·목록·인용·링크 구조가 남아 있으나, 티스토리 입력 뒤 게시글만 평문화됐다.
- **원인:** `chrome.scripting.executeScript()`는 기본적으로 격리 세계에서 실행된다. 따라서 그 코드의 `window.tinymce`/`window.parent.tinymce`는 페이지 메인 세계 TinyMCE와 달라 `insertContent()`·`save()`를 실행하지 못하고 native DOM 대체 경로로 내려갈 수 있다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`의 TinyMCE 삽입·저장 호출에 `world: "MAIN"`을 지정하고, 입력 후 제목·목록·인용·표·링크 태그 잔존 여부를 확인한다.
- **다음부터 확인:** 페이지 전역 JavaScript API(React/Vue 편집기, TinyMCE 등)를 호출하는 확장 코드는 실행 세계를 먼저 확인한다. 텍스트 존재 여부만으로 성공 처리하지 말고 요구한 의미 구조도 검증한다.

## 2026-10-03 — 본문 해시태그는 플랫폼 등록 태그의 성공 근거가 아니다

- **증상:** 원문에 태그가 있어도 티스토리 게시글의 등록 태그가 비어 있었다.
- **원인:** 확장이 본문에 `#태그` 텍스트가 있으면 실제 티스토리 태그 칩이 없어도 이미 등록된 것으로 판단했고, 태그 UI를 찾지 못할 때도 본문 끝 해시태그로 대체한 뒤 성공 처리했다. 글 선택 시 원문 태그가 자동 반영되지 않아 이전 글의 저장값도 남을 수 있었다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`에서 선택한 글의 태그를 자동 반영하고, `.editor_tag > .txt_tag` 실제 태그 칩이 생성됐을 때만 완료 처리한다. 태그 입력 UI를 못 찾으면 본문 대체 없이 오류로 중단한다.
- **다음부터 확인:** 서로 다른 저장소(본문 텍스트와 서비스 메타데이터)를 동등한 성공 조건으로 취급하지 않는다. 자동화 완료는 사용자가 실제로 원하는 최종 서비스 상태로 검증한다.
## 2026-10-03 티스토리 제목 중복 방지가 HTML/수정 경로에서 누락됨

- **증상:** 제목 입력칸과 본문 첫 블록에 같은 제목이 다시 표시될 수 있었다.
- **원인:** 기존 필터는 Markdown의 완전 일치 한 줄만 제거했고, 생성 프롬프트·HTML 서식·수정 저장 경로는 같은 규칙을 공유하지 않았다.
- **해결(위치):** `tistory-auto-blog/utils/duplicateTitle.ts`로 제목 정규화와 Markdown/HTML 제거를 공용화하고, `utils/news/generator.ts`, `app/api/posts/[id]/route.ts`, `utils/extensionContent.ts`에 적용했다.
- **다음부터 확인:** 제목과 본문이 별도 입력되는 서비스는 생성 지시, 서버 저장, 최종 전송의 세 경로에서 서식 변형 제목까지 같은 방식으로 검증한다.
## 2026-10-03 티스토리 태그 등록 성공을 이전 DOM selector로 오판함

- **증상:** 첫 태그 칩이 실제로 생성됐는데도 “등록 결과를 확인하지 못했습니다”로 중단했다.
- **원인:** `.editor_tag > .txt_tag` 직계 selector만 사용했다. 현재 티스토리는 태그명을 “태그 수정/삭제” 링크 형태로 렌더링한다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`의 `readTistoryTagChips()`가 구·신 구조를 함께 수집하고, `waitForTistoryTagChip()`이 최대 4.5초 폴링 검증한다.
- **다음부터 확인:** 외부 서비스 UI의 성공 판정은 한 selector에 고정하지 말고, 실제 화면에서 생성된 접근성/DOM 구조를 먼저 대조하고 비동기 렌더링 시간을 포함한다.
## 2026-10-03 티스토리 입력 검증에서 문장부호를 제거하면 원문 변형을 놓침

- **증상:** 게시 결과에 원문과 다른 불필요한 작은따옴표가 보였지만, 확장 입력 단계는 성공으로 처리될 수 있었다.
- **원인:** 기존 `tistoryEditorContainsText()`는 비교 편의를 위해 문장부호를 모두 제거했다. 실제 대조에서는 해당 따옴표가 확장이 아닌 AI 생성 원문에 이미 있었지만, 티스토리의 문장부호 변형도 같은 방식으로 놓칠 구조였다.
- **해결(위치):** `tistory-auto-blog/utils/news/generator.ts`에서 장식용 따옴표 생성을 금지하고, `extension/sidepanel.js`에 `tistoryEditorContainsExactText()`를 추가해 공백만 정리한 정확한 원문을 확인한다.
- **다음부터 확인:** 표시 차이를 발견하면 원문 미리보기와 게시 결과를 먼저 같은 문장으로 대조하고, 텍스트 검증 정규화에서 문장부호를 지우는 경우 정확 대조를 병행한다.
## 2026-10-03 티스토리 HTML 재구성에 원문 문장 전체 일치를 강제하면 입력이 중단됨

- **증상:** 새 글 입력이 29개 블록 중 7개에서 끝났고, 설정 재개는 `발행용 본문 저장 원본을 확인하지 못했습니다 (7/29)`로 중단됐다.
- **원인:** v1.51의 `tistoryEditorContainsExactText()`가 티스토리 TinyMCE의 정상 HTML/공백 재구성을 원문 변형으로 오판했다. 첫 입력 실패 뒤 설정 재개는 부분 본문 발행을 막기 위해 의도대로 거절됐다.
- **해결(위치):** `tistory-auto-blog/extension/sidepanel.js`에서 완전일치 검사를 제거하고 기존 텍스트 존재·서식 구조 검증으로 복구했다. AI 프롬프트의 장식용 따옴표 금지는 유지한다.
- **다음부터 확인:** 티스토리 편집기 검증은 HTML round-trip에서 안정적인 텍스트 문맥·서식 구조를 우선 사용한다. 문자 단위 대조는 실제 편집기 저장 직렬화가 동일하다는 증거가 있을 때만 적용한다.
## 2026-10-03 AI 장식용 따옴표는 입력기보다 생성 결과에서 먼저 제거

- **증상:** 티스토리 게시 결과에서 문구의 시작과 끝을 감싼 따옴표가 반복 노출됐다.
- **원인:** 원문 미리보기에도 같은 문자가 있어 확장 입력이 아닌 AI 생성 결과의 강조 습관이었다. 프롬프트 지시만으로는 재발했다.
- **해결(위치):** `tistory-auto-blog/utils/news/generator.ts`의 `removeDecorativeQuotes()`가 Markdown→HTML 변환 전 장식용 따옴표 쌍을 제거한다.
- **다음부터 확인:** 결과 표현 문제가 보이면 원문 미리보기와 게시 결과를 먼저 비교하고, 모델 습관이면 프롬프트와 결정적 후처리를 함께 둔다.

## 2026-10-04 Windows PowerShell에서 `npm` 별칭이 실행 정책으로 차단될 수 있음

- **증상:** `npm run build` 실행 시 `npm.ps1`을 로드할 수 없다는 실행 정책 오류로 빌드가 시작되지 않았다.
- **원인:** PowerShell이 `npm.cmd`보다 `npm.ps1` 셸 래퍼를 우선 해석했고, 현재 세션의 실행 정책이 PowerShell 스크립트 실행을 막았다.
- **해결(위치):** 코드 수정 없이 동일한 명령을 `npm.cmd run build`로 실행해 정상 빌드했다.
- **다음부터 확인:** Windows 환경에서 npm 명령이 실행 정책 오류로 실패하면 정책을 바꾸지 말고 `npm.cmd`를 먼저 사용한다.
## 2026-10-04 Vercel 프로덕션 배포 성공만으로 기본 `.vercel.app` 주소가 갱신되지는 않을 수 있음

- **증상:** `vercel deploy --prod --yes`가 성공했는데도 `ai-image-studio.vercel.app`에서 이전 대시보드 문구와 메타 설명이 계속 보였다.
- **원인:** 기본 별칭이 최신 배포 URL이 아닌 과거 배포본에 연결돼 있었다. 새 배포는 별도의 `*-buylife.vercel.app` 별칭만 받았다.
- **해결(위치):** `vercel alias ls`로 기본 별칭의 원본 배포 URL을 확인하고, `vercel alias set <새-배포-URL> ai-image-studio.vercel.app`로 재연결한다.
- **다음부터 확인:** 배포 뒤 실제 회원이 쓰는 기본 URL을 `curl`로 확인하고, 소스 코드가 아닌 응답 HTML의 문구·메타 설명까지 대조한다.
## 2026-10-06 — 자동화 사용 설정값을 실제 자동 발행 상태로 표시하면 안 됨

- **증상:** 계정별 운영 설정에 자동화 스위치를 추가할 때, 실행 워커·예약 검증·실패 재시도 정책이 아직 없는데도 화면에서 자동 발행이 시작된 것처럼 보일 위험이 있었다.
- **원인:** 회원의 운영 선호값(`automation_enabled`)과 서버가 실제로 게시를 수행하는 권한·실행 경로를 같은 상태로 취급하면, UI 안내가 실제 동작 범위를 앞서갈 수 있다.
- **해결(위치):** `tco_operation_profiles.automation_enabled`는 회원별 선호 설정으로만 저장하고, `AccountOperations.tsx`와 대시보드에서 무인 실행 워커가 별도 검증되기 전에는 게시가 실행되지 않는다고 명시했다.
- **다음부터 확인:** 자동화 토글·예약·스케줄 UI를 추가할 때는 저장 여부, 대기열 존재, 실제 실행 워커, 최종 외부 발행 권한을 각각 분리해 표기한다. 구현되지 않은 실행 경로를 "활성" 또는 "발행 가능"으로 표현하지 않는다.
