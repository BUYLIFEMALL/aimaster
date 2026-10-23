# UI Canvas 자동화 — 작업 재개 인수인계 (CLI_HANDOFF)

작성: 2026-10-13 (Claude Code). 다른 CLI(Codex·Gemini·Antigravity)나 새 Claude 세션이 이 프로그램을 이어받을 때 **이 문서 → [AGENTS.md](../AGENTS.md) → [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** 순서로 읽으세요.

## 1. 한눈에 보기

| 항목 | 값 |
|---|---|
| 프로그램 | UI Canvas 자동화 (`slug: ui-canvas`) — UI 화면을 드래그로 설계·AI로 구조 복원·PNG/JSON 내보내기 |
| 현재 버전 | **v1.05** (`src/lib/version.ts` = DB `programs.version`) |
| 운영 주소 | https://ui-canvas.buylife.xyz (카탈로그 https://www.buylife.xyz/programs/ui-canvas) |
| Vercel | 프로젝트 `buylife/ui-canvas`, Git 미연동, `vercel deploy --prod --yes --scope buylife` (폴더 `ui-canvas/`에서) |
| DB | 공용 Supabase `esgxyikcnnvmlhygjkth` — `ui_canvas_projects`(RLS owner-only), `programs`/`pricing_plans`/`grade_program_access` 등록 완료 |
| 접근 정책 | 최소 등급 일반 + 관리자 부여 사용기간(FREE 배지 아님), 기본 3요금제(1·2·3개월 10,000/20,000/30,000) |
| 참고 원본 | AI Studio "GPT PARK의 UI 캔버스 Pro" (분석: [DEVELOPMENT_PLAN §1](DEVELOPMENT_PLAN.md)) — 코드 복제 없이 기능·로직만 참고 |
| 최상위 규칙 | AI는 **회원 본인 Gemini 키**만. 키 없으면 `needKey` 안내, 폴백 금지 |

## 2. 완료된 일 (커밋)

| 버전 | 커밋 | 내용 |
|---|---|---|
| v1.01 | `ea183d29` | 신규 개발: 캔버스 24종+그룹, 속성·프리셋·레이어·단축키·Undo/Redo, 프로젝트 DB 저장, 내보내기·불러오기, AI 2종, 접근 게이트, 사이드바, 매뉴얼, DB 등록·배포 |
| v1.02 | `2f96a707` | 카탈로그 썸네일 등록, 사이드바 중복 강조 정리, 1000개 성능·파일 저장·needKey 검수 기록 |
| v1.03 | `46b7b1b7` | 접속 즉시 캔버스 열기(`/open` → 최근 프로젝트, 없으면 생성) |
| v1.04 | `db4a8b86` | 컴포넌트 도구 24종 기능별 아이콘(3열 타일), 탭 아이콘 |
| v1.05 | `25836fb1` | 사용 매뉴얼 9구역 확장, 빈 캔버스 안내, 도움말→매뉴얼 링크, 버튼명 "이미지로 저장" |

## 3. 코드 지도

```
ui-canvas/
  src/lib/canvas/        순수 로직 (테스트 대상) — types · constants · model · useHistory
  src/components/canvas/ Editor.tsx(스테이지·툴바·저장·AI·단축키) · ComponentView.tsx(25종 렌더) · Panels.tsx(도구상자·레이어·속성·우클릭 메뉴) · icons.tsx
  src/components/workspace/ ProjectList · KeyManager · GuideContent · GuideLinkButton
  src/components/layout/ Sidebar · Shell
  src/app/               open/ · editor/[id]/ · (workspace)/{dashboard,settings,guide} · login · setup · api/{projects,keys,ai/spec,ai/from-image,auth/logout}
  src/lib/               access.ts · programAccess.ts(루트 사본) · auth · apiKeys · gemini · projects · guides · supabase/*
  supabase/migrations/   0001 테이블+등록 · 0002 썸네일/버전
  tests/model.test.mjs   12개 (npm test)
```

주요 설계:
- **상태**: 컴포넌트 배열은 `useHistory`(Undo/Redo, 연속 제스처는 `checkpoint()` 후 `replace` 갱신), 명세·캔버스 크기·배경은 별도 state.
- **제스처**: `Editor.tsx`의 window mousemove/mouseup 리스너는 **한 번만 등록**하고 최신 값은 `live` ref로 읽는다(빠른 드래그 누락 방지). mouseup 좌표를 끝점으로 사용.
- **저장**: 변경 1.5초 후 `PUT /api/projects/[id]`(`expectedUpdatedAt` 충돌 시 409), 실패 8초 재시도, 이탈 경고.
- **AI**: 서버(`src/lib/gemini.ts`)에서만 호출, `gemini-2.5-flash`, 응답은 `normalizeAiComponents`로 정규화·캔버스 안 보정, 적용 전 확인 창.
- **진입**: `/`·로그인 직후 → `/open`. 목록은 `/dashboard`.
- 원본 JSON 호환: 컴포넌트 `type` 문자열 값은 원본과 같게 유지(`types.ts`).

## 4. 개발·배포 절차

```bash
cd ui-canvas
npm install
npm test            # 12개
npx tsc --noEmit
npx next build
vercel deploy --prod --yes --scope buylife
# DB 버전 갱신(수정 때마다 +0.01): MCP execute_sql 또는 SQL
#   update programs set version='v1.0X', updated_at=now() where slug='ui-canvas';
```

- 로컬 `npm run dev`(포트 3020)는 `.env.local`에 공용 Supabase 3개 값이 있어야 한다. 단 **localhost에서는 `.buylife.xyz` 로그인 쿠키가 없어** 로그인 화면 검수가 안 된다 → 운영 주소에서 주인님 로그인 세션으로 검수.
- `vercel link`가 만든 `.env.local`(OIDC 토큰)은 Git 제외. 환경변수 3개는 `scripts/add-ui-canvas-vercel-env.mjs`로 등록 완료.
- 커밋은 경로를 명시(`git add ui-canvas`). `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`는 다른 CLI의 미커밋 변경이 섞여 있으니 전체 `git add` 금지(내 줄만 별도 반영한 방식 참고).

## 5. 검수 증거 (2026-10-13)

- 자동: `tsc`·`npm test` 12/12·`next build` 통과.
- 운영 Chrome(주인님 세션): 생성·범위 선택·Ctrl+G 그룹·새로고침 유지, AI 명세 채우기(실제 Gemini), 이미지→UI API(합성 이미지, 컴포넌트 6개 전부 캔버스 안), 1000개 컴포넌트(열기 2.6초·선택 41ms), 이미지 저장 1440×900 PNG·컴포넌트 JSON 1000개 파일 확인, needKey 안내 창, 접속 즉시 캔버스, 도구 아이콘 24개, 매뉴얼 9구역.

## 6. 남은 일

1. **일반(naver) 회원 실계정 흐름** — `buylifemall@naver.com`으로 로그인해 권한 판정·키 없는 상태의 AI 안내를 실제 확인(비밀번호 입력이 필요해 AI 에이전트는 못 함).
2. **모바일 실기기 폭** — CSS(`@media max-width:767px`)는 있으나 도구 한계로 시각 확인 못 함.
3. **이미지 파일 업로드 UI 경유** — 파일 선택창은 도구가 못 열어 API로 대신 검증.
4. **후속 후보**: 줌/팬·스냅·정렬 가이드, 다중 선택 일괄 속성, 그룹 내부 자식 개별 편집, HTML/React 코드 내보내기, 다크 컴포넌트 테마, 공유 링크.

## 7. 함정·교훈

- 자동화 검수에서 **도구 선택 직후 곧바로 드래그**하면 React 렌더 전이라 생성이 안 될 수 있다(사람 조작은 무관) → 도구 클릭 후 1초 대기. 기록: `docs/ERROR_LESSONS.md` 2026-10-13 "캔버스 에디터" 항목.
- `borderStyle: solid`만 있고 두께가 없으면 브라우저가 3px 검은 선을 그린다 → `ComponentView.hasBorder`.
- Vercel 요청 본문 4.5MB 제한 → 이미지는 클라이언트에서 긴 변 1600px JPEG로 줄여 보내고 서버는 4MB base64까지만 받는다.
- 브라우저 도구: 스크린샷이 응답 없을 때(숨은 창)는 `javascript_tool`로 DOM 값을 확인. 파일 선택창·localhost 로그인은 도구 한계.
- Supabase MCP `execute_sql`이 간헐적으로 `Invalid or expired requestState`를 내면 같은 호출을 한 번 더 한다.
- 원본의 "운영자 키를 클라이언트 번들에 주입" 패턴은 최상위 규칙 위반 — 절대 복제 금지.
- `/open`은 GET에서 프로젝트를 만들 수 있다(없을 때만). 링크 프리페치 방지를 위해 `<a>`를 쓰고 `next/link`로 걸지 않는다.

## 8. 관련 문서

[AGENTS.md](../AGENTS.md) · [README.md](../README.md) · [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) · 루트 [HANDOFF.md](../../docs/HANDOFF.md) · [ERROR_LESSONS.md](../../docs/ERROR_LESSONS.md) · [TOP_RULE](../../docs/TOP_RULE_PERSONAL_ACCOUNT_API.md)
