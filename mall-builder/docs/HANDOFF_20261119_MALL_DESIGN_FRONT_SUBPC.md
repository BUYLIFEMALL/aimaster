# 인수인계 — 쇼핑몰 프론트(디자인 빌더) Claude(B2BFront) → SubPC 새 세션 (2026-11-19)

> 주인님 지시(2026-11-19): 「지금까지 너가 하던 일을 SubPC의 다른 세션에서 작업하도록 할께」.
> 넘기는 쪽: Claude Code(윈도우 메인) `claude-win-20261114-mall-design` = Claude(B2BFront), Master 쪽 ID `CC-B2B-FRONT-01`.
> 받는 쪽: SubPC의 새 Claude Code 세션. 새 세션 이름을 정하면 `docs/roles/mall-design-builder.md` 3행 담당 칸과 Master 등록을 바꿔 달라고 Master께 알린다.

## 0. 먼저 읽을 것 (순서대로)
1. 루트 `CLAUDE.md` — 0번 규칙(저작권 고지), 협업 핵심 지침(점유·경로 지정 커밋), `.env*` 사고, 한국어 규칙
2. `AI_TEAM_RULES.md`, `docs/roles/codex-master.md` — Codex Master(CX-MASTER-01)가 지휘, 공식 완료는 Master
3. `docs/roles/mall-design-builder.md` — 내 역할 파일(이 문서와 같은 커밋에서 갱신함)
4. `mall-builder/docs/DESIGN_BUILDER_TRACKER.md` — 작업 플랜표
5. `mall-builder/docs/HANDOFF_DESIGN_BUILDER_BACKEND_SYNC.md` — 백엔드(CC-B2B-BACK-01)와의 상호 인수인계
6. SubPC가 네트워크 공유 폴더를 쓰는 장비면 `docs/ADMIN_PC_WORK_GUIDE.md` — `npm install/build/dev`·배포·운영 DB 쓰기·환경변수 변경은 메인 윈도우 세션에 요청 표로 넘김. 커밋 뒤 공용 스테이징 맞추기 요청 필요할 수 있음

## 1. 역할과 범위
- 쇼핑몰(`mall-builder/`) 프론트 디자인 UI 빌더 전담. 세 몰(B2B+리셀러·분양·독립) 공통 코어.
- 기본 범위: `src/lib/builder/**`·`src/lib/theme.ts`·`src/lib/blocks.ts`·`src/app/s/[store]/admin/design/**`·`admin/home/**`·`home-blocks.tsx`·`(shop)/layout.tsx` 테마 주입부.
  Master 배정으로 손댄 파일: `(shop)/quick-bar.tsx`·`(shop)/shop-frame.tsx`·`(shop)/order/*`(S70)·`product-card.tsx`·`p/[id]/product-detail.tsx`·`admin/design/template-gallery.tsx`·`globals.css`.
- 담당 아님: 주문·결제·가격·정산 등 운영 기능(백엔드 CC-B2B-BACK-01), 마켓 연동.
- 쇼핑몰 용어: 운영사·공급사·리셀러·유저(손님·고객·사용자 금지). 주인님 호칭 「주인님」.

## 2. 지휘·연락 (orca)
- Master: Codex CX-MASTER-01, 터미널 `term_d8c5d7ed-7c8e-4a20-a22f-8f3919ad3a5a`
- 백엔드: CC-B2B-BACK-01, 터미널 `term_46946865-f9aa-4e38-a14f-daa1f320dd41`
- 넘기는 세션 터미널 `term_f4c00bf6-875e-46fa-9d0a-72df606548dc` — **SubPC 새 세션은 터미널 주소가 다르므로 첫 보고에서 Master께 새 주소를 알린다.**
- 확인: `orca orchestration check --terminal <내 터미널>` · 회신: `orca orchestration reply --id <msg> --from <내 터미널> --body "..."` · 새 보고: `orca orchestration send --to term_d8c5d7ed-... --from <내 터미널> --type status --subject "..." --body "..."`
- 보고 형식(공통지침 v2.0): 작업ID·SHA·검증 구분(자체/독립/운영)·배포 여부·점유·차단 이유·다음 작업. 주인님 직접 지시는 요지·시각·대상·범위·상태와 함께 Master께 보고.

## 3. 꼭 지킬 작업 규칙 (이 세션에서 굳어진 것)
- 편집 직전 `git status --porcelain -- <파일>`로 남의 미커밋 확인 → `docs/ACTIVE_WORK.md` 55행 근처 내 줄에 점유 등록. 순서: `node scripts/safe-commit.mjs --begin docs/ACTIVE_WORK.md --as <세션>` → 줄 수정 → `safe-commit.mjs "<메시지>" docs/ACTIVE_WORK.md --as <세션>`. 끝나면 같은 방식으로 해제.
- 코드 커밋은 `node scripts/commit-paths.mjs "<메시지>" <경로>... --as <세션>` (푸시 옵션 쓰지 않음 — 푸시·배포·빌드는 Master 순서로만). 커밋 뒤 `git show --stat <SHA>`로 내 파일만 들어갔는지 확인, 보고 SHA는 `git log -1 --format=%h -- <내 경로>`.
- `.ai/` 등록부는 Master 전용. 단 내 결과 파일 `.ai/results/FRONT-*.md`는 내가 쓴다.
- 운영 DB는 읽기만. 비용 드는 작업은 사전 승인. `.env*`에 아무것도 쓰지 않는다.
- 3210 개발 서버는 끄거나 켜지 않는다(이번 세션 중 꺼져 있었음 — 측정은 별도 정적 서버로 함).
- 「초안 저장」「게시」「주문하기」는 누르지 않는다.
- 사람이 할 일은 `node scripts/dev-requests.mjs ask ...`로 요청함에 올리고 채팅에도 같이 적는다.
- 브라우저: Claude Code는 ego lite(메인)·크롬(보조). 엣지는 Codex 몫. ego 작업 공간은 끝나면 `task.finish({ keep: [] })`.

## 4. 지금 상태 (2026-11-19 기준, 제품 파일 점유 없음)

### 4-1. 검수 대기
| 작업 | 커밋 | 결과 파일 | 상태 |
|---|---|---|---|
| FRONT-20261119-QUICKBAR 휴대폰 빠른 메뉴 | `794c5fd01` → `1766fe92e` → 최종안 A `c8a134486` → 미리보기 보완 `51d4b2207` | `.ai/results/FRONT-20261119-QUICKBAR.md`, Mac 검수 `FRONT-20261119-QUICKBAR-CX-QA-01.md` | **로컬 완료** — Mac 독립 28/28, Master 수락 `4de6db0af`(msg_f36cdbefab57). 남은 것: 미배포(다음 묶음)·실제 편집기 화면 확인만. 중복 시험 하지 않음 |
| HOMETABS 홈 상품 탭 블록 대비·키보드 | `489c888e6` + P3 `9f6b1c131` | `.ai/results/` HOMETABS 관련 | 검토 대기 |
| S70 주문서 현금영수증 칸 | `50d3e6162` + `ee35d6eb1` | `.ai/results/` S70 관련 | 맥미니 재검토 대기. **백엔드 DB 함수 0105와 같은 묶음으로만 배포**(0105는 Lab·운영 미적용) |

### 4-2. 다음 배포 묶음(미배포, 순서는 Master)
`77c50f27c`(카테고리 탭 올림 대비), `90248e5b1`(갤러리 색 단추 44px — `7c8ee3a81`·`e4ba29947` 함께), `86e5ad1bf`(원래 가격 `text-slate-600`), `489c888e6`·`9f6b1c131`(HOMETABS), QUICKBAR 4개 커밋. S70은 0105와 함께.
- 배포 기준: 운영 v1.16(`1aea8ec0f` + version `5c229f968`), Lab `7609748ad`.
- Master 결정: 원래 가격 커밋만 단독 배포하지 않고 다음 묶음으로.

### 4-3. 요청함(주인님 몫) 2건
- `6ef94bb2` 휴대폰 실기기 터치(카테고리 줄 좌우 밀기·탭 이동) — 주인님 결과 받으면 `node scripts/dev-requests.mjs done 6ef94bb2-af95-475d-b4ea-d4ead09a41c5 --as <세션> --note "채팅 확인(날짜)"`
- `c640c509` 운영 상점 화면 확인 — 운영 배포 뒤
- 주의: 이 두 항목은 넘기는 세션 이름(`claude-win-20261114-mall-design`)으로 올라가 있음. 닫을 때 Master 또는 주인님께 세션 변경을 밝힌다.

### 4-4. 별도 과제 후보(미배정)
- 768px 근처에서 기존 PC 빠른 메뉴 펼친 패널이 상품 오른쪽 열을 덮음(Mac 모형에서도 확인).
- 휴대폰 폭에서 하위 카테고리 드롭다운이 숨겨져(`shop-frame.tsx` `max-md:hidden`) 하위 카테고리 경로 없음 — 상위 카테고리 화면 안 경로는 미확인.

## 5. QUICKBAR 최종 구조 (다음에 손댈 때 알아야 할 것)
- 767px 이하: 떠 있는 손잡이 없음. 머리글 카테고리 줄 오른쪽 끝(가로 스크롤 nav 밖)에 `QuickBarOpener`(40×40, `md:hidden`). 카테고리·메뉴 없는 상점은 767px 이하에서만 단추 한 개짜리 줄(머리글 +41px).
- `ShopHeader`의 `quickBar?: boolean`(기본 true). 편집기 미리보기(`design-editor.tsx` ShopHeader 호출)만 `quickBar={false}` — 미리보기엔 패널이 없어서.
- 단추 ↔ 빠른 메뉴는 창 이벤트로 연결: `mb_quickbar_toggle`(단추 → 메뉴), `mb_quickbar_state`(메뉴 → 단추, `{open}`). 패널 id `mb-quickbar-panel`.
- 상태 `collapsedPref`: null = 안 누름(767 이하 닫힘, 768 이상 펼침 — CSS `max-md:hidden`로 결정, 서버 첫 화면부터 일치), true = 접힘, false = 펼침. 열면 포커스 → 패널 「닫기」, 패널 닫기·Esc → 머리글 단추로 복귀.
- 768px 이상은 원래 손잡이 20×40·펼친 패널 100×248 그대로(변경 0).
- 시험: `tests/quick-bar-narrow.test.mjs`(6개). **`tests/quick-bar.test.mjs`는 agy가 만든 최근 본 상품 저장소 시험 — 다른 파일이니 덮어쓰지 말 것**(이 세션에서 한 번 덮어썼다가 커밋 전에 되돌림).

## 6. 검증 방법(이 세션에서 쓴 도구)
- 단위: `cd mall-builder && node --test tests/quick-bar-narrow.test.mjs tests/quick-bar.test.mjs tests/dark-header.test.mjs tests/my-sections.test.mjs` (마지막 28/28), `npx tsc --noEmit -p .` 0.
- 시험 틀: `typescript.transpileModule` + happy-dom + react-dom(client/server). `next/link`·`@/lib/...`는 임시 폴더 가짜 모듈로 바꿔 끼움. happy-dom은 CSS를 적용하지 않으므로 보임 판정은 class로 흉내.
- 화면 폭 실측: 실제 컴포넌트를 `renderToString` → `@tailwindcss/postcss`로 CSS 컴파일(`@import "D:/AIMaster/mall-builder/node_modules/tailwindcss/index.css"; @source "./all.html";`) → `python -I -m http.server <포트> --bind 127.0.0.1` → ego `page.cdp("Emulation.setDeviceMetricsOverride", { width, height: 800, mobile: true, screenWidth: width })` → `elementFromPoint`로 링크·배지 가로챔 측정. 스크립트 사본은 스크래치 폴더라 사라질 수 있음 — 위 설명대로 다시 만들면 된다.
- 함정: `mobile:false` 흉내는 실제 창 폭으로 줄어듦(768·1280이 698·1164로 나옴) → `mobile:true`+`screenWidth`. ego 창이 뒤에 있으면 `requestAnimationFrame` 대기·캡처가 시간 초과 → 대기 없이 측정. iframe 여러 개를 한 줄에 두면 폭이 줄어듦. `esbuild`가 없어 브라우저에서 React 하이드레이션 시험은 못 함(Enter/Space 실제 키는 Mac 검수 몫).
- 크롬 확장(claude-in-chrome)은 이번 세션 끝 무렵 새 탭을 그룹에 못 넣는 상태였음 → ego로 대체.

## 7. 다음 첫 단계
1. 이 문서와 역할 파일을 읽고, `orca orchestration check`로 Master 메시지 확인.
2. Master께 「SubPC 새 세션이 CC-B2B-FRONT-01 인수, 새 터미널 주소 ○○」 보고(주인님 직접 지시 보고 형식).
3. QUICKBAR는 Master 수락 `4de6db0af`로 로컬 완료 — 다시 시험하지 않는다. 남은 것은 배포 묶음 포함과 실제 편집기 화면 확인뿐(Master 지시 때).
5. Master 기록(msg_f36cdbefab57): CC-B2B-FRONT-01 역할·범위 유지, 새 장비 별칭·세션명·터미널 주소와 인수 확인을 받으면 Master가 등록·전달 대상을 바꾼다. 메인 PC의 기존 검수 서버·Mac 독립 검수·빌드 승인 범위는 그대로. **이관이 끝나기 전에는 새 제품 작업을 시작하지 않는다.**
4. 이후 배정은 Master 지시로만. 새 코드는 배정받은 뒤에만.
