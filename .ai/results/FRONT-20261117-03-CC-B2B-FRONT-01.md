# FRONT-20261117-03 결과 — 3색 단추 전용 색 최소 보정 (CC-B2B-FRONT-01, 코드 완료·Lab 반영(11-17 18:17 `dpl_CFgB5fC5NLdrye4K7esG1tWRktXQ` READY, dev-mall-builder.vercel.app, 운영 몰 배포 아님), 이전 표기: 미배포 — Master 수락 msg_33ec7ee52075, 최종 후보 `5b02c3399` 동결)

- 배정: msg_dc75ac7b448e(후보 가 채택). 커밋 `f7120d185`(4 files, +94 −4). 점유 `09ec6fec7` → 해제 이 결과와 함께.
- 빌드·배포·스키마·전체 시험·전체 타입 0. 승인 Lab 출처(acb858a77) 뒤 소스 변경이므로 Master 재검증 뒤 묶음 필요.

## SHA (작업폴더 = HEAD blob)
- src/lib/theme.ts `8d74d3eac802` · src/app/globals.css `7b4ae858c534` · tests/theme.test.mjs `09fe7dab1298` · tests/dark-header.test.mjs `622c45de9d31`

## 구현
- `theme.ts`: `whiteContrast(hex)`(WCAG 휘도), `buttonColor(hex)` — 흰 글자 4.5 미만일 때만 같은 색상각에서 OKLCH 밝기를 0.001씩 낮추고(색역 밖이면 채도 0.002씩 줄임) 8비트 반올림한 #rrggbb가 처음 4.5 이상인 색을 반환. 4.5 이상·잘못된 값은 null. `themeStyle`이 값이 있을 때만 `--mall-primary-btn`을 내보냄(기본 테마는 여전히 변수 0).
- `globals.css`(3곳):
  - `.btn-3d-blue` 바탕 `var(--mall-primary-btn, var(--mall-primary-600, #2563eb))` — 변수 없으면 이전과 같음.
  - 어둡게 평면 규칙(acb) 값 `var(--mall-primary-btn, var(--mall-primary-600))`.
  - 새 규칙 `[style*="--mall-primary-btn"] :is(.bg-blue-600, .bg-blue-700).text-white { background-color: var(--mall-primary-btn); }` — 밝게 평면.

## 수치 (흰 글자)
| 색 | 포인트색 | 전 | 단추 전용 색 | 후 |
|---|---|---|---|---|
| 에메랄드 | #059669 | 3.77 | #08875f | 4.52 |
| 코랄 | #e5534b | 3.70 | #d4423c | 4.52 |
| 오렌지 | #ea580c | 3.56 | #cf4b00 | 4.51 |
- 나머지 9색: `buttonColor` null, 변수 없음 → 밝게·어둡게 모두 화면 그대로. 원래 포인트색·팔레트·저장값·프리셋 값 불변(`--mall-primary-600` = 포인트색 그대로 시험).

## 범위 근거 (상점 표식)
- 테마 변수는 상점 바깥 상자 인라인 style에만 들어감: `(shop)/layout.tsx:73~75`(`style={themeVars}`), 디자인 편집기 미리보기 `design-editor.tsx:434`(같은 방식, 상점 미리보기라 적용이 맞음). 관리자 화면·루트 페이지(`page.tsx`·`create-store-form.tsx`·`resale`)는 이 style이 없음.
- 시험: 실제 `renderToStaticMarkup` 출력(React가 `--mall-primary-btn:#…`를 style에 그대로 씀)을 happy-dom에 넣어 선택자 일치 수 확인 — 3색 밝게·어둡게 1, 9색 중 4색 표본 0, 관리자 모양 0.

## hover/focus/active
- `.btn-3d-blue:hover`(`--mall-primary-700`, 3색 4.82~5.01 통과)·`:active`(이동·그림자만)·그림자 색 불변. 바탕 선언에 변수만 끼워 순서·특이성 그대로.
- 평면: 새 규칙은 층 밖 0,3,0이라 3색 상점에서만 `hover:bg-blue-700` 등 바탕 변화가 사라짐(어둡게는 acb부터 이미 같음). 9색·관리자는 규칙 미적용이라 hover 그대로. 초점 링·outline 불변.

## 시험
- `node --test tests/theme.test.mjs tests/dark-header.test.mjs tests/timesale-dark.test.mjs` 21/21, 테마 쓰는 템플릿 시험 5개 31/31.
- 지우기 확인: 새 CSS 규칙 빼면 fail 1, `--mall-primary-btn` 내보내기 빼면 fail 2, 복원 cmp 일치.
- 기존 시험 기대값 변경: dark-header의 acb 규칙 문자열(값에 `--mall-primary-btn` 대체 추가)과 「어둡게 밖 bg-blue 규칙 0」에 새 표식 규칙 허용 — 정책 시험 무력화 없음(새 규칙은 별도 시험으로 범위 검증).

## Mac 검토 요청
- 독립 계산(3색 4.5 이상, 9색 변수 없음)·선택자 범위(상점 style 표식 안만, 관리자 0) 검토.
- Lab Ready 뒤 실화면: 139 코랄 템플릿(밝게) 장바구니/주문 입체 단추·머리글 가입 단추 색, 143 등 어둡게, 마우스 올림·Tab 초점.

## QA022 P2 수정 — 밝게 3색 평면 단추 마우스 올림 피드백 (msg_efe2deaa2f62, ready_review)
- 커밋 `5b02c3399`(4 files +57 −6). 점유 `e7d2aac69` → 해제 이 결과와 함께. 빌드·배포·브랜드 저장값 0. 위 절(3D hover·ring·관리자 범위 근거)은 그대로 보존.
- SHA(작업폴더 = HEAD): theme.ts `ce8cca500cb3` · globals.css `0a1b628fc76d` · tests/theme `bd755eda945c` · tests/dark-header `78a47888ddb9`.
- 원인: 이전 밝게 규칙 `[style*=…] :is(.bg-blue-600,.bg-blue-700).text-white`가 층 밖·0,3,0이라 Tailwind utilities 층의 `hover:bg-blue-700`(0,2,0)·`group-hover:`를 항상 이김. 같은 이유로 편집 오버레이 `bg-blue-700 hover:bg-blue-800`도 단추 전용 색으로 바뀌고 올림이 없어짐.
- 수정: 규칙을 `@layer utilities` 안 `:where([style*="--mall-primary-btn"]) .bg-blue-600:where(.text-white)`(0,1,0, Tailwind `.bg-blue-600` 뒤)로 옮김 → 실제 상점이 쓰는 `hover:bg-blue-700`(layout 가입 146·187, r/[code] 165·214)·`group-hover:bg-blue-700`(shop-frame 55)이 다시 이김. 올림 색은 같은 층 `@media (hover: hover)` 안에서 `--mall-primary-btn-hover`(theme.ts `buttonHoverColor` = 단추 전용 색을 600→700 밝기 간격 0.058만큼 더 진하게, 같은 색상각). `.bg-blue-700`은 원래 색 4.81~5.01이라 대상에서 뺌. 어둡게 규칙(acb)·입체 단추 규칙은 층 밖 그대로.
- 검증(실제 Tailwind v4 `@tailwindcss/postcss`로 globals.css 컴파일 → ego 브라우저, CDP로 :hover 강제, 계산 바탕색 → 흰 글자 대비; 저장소 밖 `~/ego/front14`):

| 단추(밝게) | 수정 전 평상시→올림 | 수정 후 평상시→올림 |
|---|---|---|
| 코랄 가입·추천·로고 | #d4423c 4.52 → 변화 없음 | #d4423c 4.52 → #bf2d2b 5.79 (ΔY 0.051) |
| 에메랄드 〃 | #08875f 4.52 → 변화 없음 | #08875f 4.52 → #057451 5.80 (ΔY 0.051) |
| 오렌지 〃 | #cf4b00 4.51 → 변화 없음 | #cf4b00 4.51 → #b44000 5.72 (ΔY 0.049) |
| 3색 편집 오버레이(bg-blue-700) | 단추 전용 색·올림 없음 | 원래 4.81~5.01 → 올림 6.67~6.93 |
| 3색 입체 단추 | 4.51~4.52 → 4.81~5.01 | 같음 |
- 9색 표본(기본 파랑·레드·퍼플)·관리자 모양: 수정 전후 전 항목 값 동일(평상시·올림 ΔY 0.031~0.050). 올림 없는 단추(주문 quick-form·배지)는 그대로.
- 시험: theme+dark-header+timesale-dark 22/22, 템플릿 5개 31/31. 수정 전 코드(HEAD globals.css·theme.ts)로 새 시험 실행 시 fail 3(층·특이성 시험, 올림 변수 시험, 층 밖 덮어쓰기 0 시험) → 수정 후 통과.
- 남은 것: 어둡게(acb, 9색 포함)는 여전히 올림 바탕 변화 없음 — FRONT-20261117-02에서 받아들인 한계, 이번 범위 밖. 실제 Tab 초점·키보드 눌림, 터치 기기, 실제 상점 화면은 미검수(Lab Ready 뒤 Mac).
