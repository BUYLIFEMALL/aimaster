# 디자인 카테고리 프로그램 부분 통합·기능 확장 순차 작업목록

> **이 문서는 「디자인」 카테고리 프로그램(콘티·랜딩 기획·UI 설계)용이며, 모든 프로그램의 화면 디자인 지침인 루트 [`DESIGN.md`](../DESIGN.md)와 다르다.** 화면 디자인 리뉴얼(역할 `design`) 작업표가 아니다.

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 디자인 카테고리는 담당 역할이 아직 없다. 담당이 정해져 확인하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·키·회원 권한·버전·배포는 바뀌지 않았다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 지금까지 이 카테고리 작업은 Antigravity(디자인 리뉴얼 v1.06·v1.10)와 Claude Code(윈도우, 병합 D·연계·보안 배포)가 나눠 했다.

## 현재 위치와 읽는 순서

1. [디자인 카테고리 완성 기준](DESIGN_CATEGORY_COMPLETION_POLICY.md) — 끝났다고 말할 조건·회원 선택 항목·하지 않을 것.
2. [디자인 카테고리 기능 상세 비교표](DESIGN_CATEGORY_FEATURE_MATRIX.md) — 지금 코드에 있는 기능·기준 코드 위치. 항목을 시작하기 전에 읽고, 배포한 기능은 그 표의 칸을 고친다.
3. 병합 근거: [데이터수집 병합 분석 보고서](analysis-scraping-consolidation-20261021/REPORT.md) §2 D, `ui-canvas/docs/PLAN_20261021_MERGE_D_WEB_UI.md`.
4. 프로그램별 기록: `cinematic-storyboard-studio/AGENTS.md`·`docs/IMPROVEMENTS.md`, `landing-architect/AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`·`docs/PLAN_20261021_SEND_TO_UI_CANVAS.md`, `ui-canvas/AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`·`docs/PLAN_20261021_CODE_EXPORT_FOLLOWUPS.md`, 각 폴더 `docs/DETAILED_REVIEW_20261019.md`.

**2026-10-24 요약:** 병합 D(웹UI → 설계)와 랜딩 → 설계 연계는 끝났다. 카탈로그 디자인은 운영 3개(콘티 v1.18·랜딩 v1.14·설계 v1.14) + 병합된 원본 1개(웹UI v1.07, 이동 안내·`/api/generate` 410)다. **회원 데이터 규칙상 먼저 처리할 것(아래 「우선 처리」)이 하나 있다.**

## 우선 처리 (회원에게 실제 영향이 갈 수 있는 것)

| ID | 문제 | 근거 경로 | 영향 | 권장 | 상태 |
|---|---|---|---|---|---|
| DS-U1 | **`landing-architect`·`ui-canvas`에 생성 데이터 30일 자동 삭제가 없다.** 최상위 규칙(생성 데이터는 생성일 기준 30일 후 자동 삭제)과 다르다. 랜딩은 AI가 만든 기획안·HTML(`landing_architect_projects.plan`·`html`), 설계는 AI 복원 컴포넌트·명세·AI 컴포넌트 코드(`ui_canvas_projects.doc`, `doc.snippets`)가 기한 없이 남는다. | `landing-architect/vercel.json`·`ui-canvas/vercel.json`에 `crons` 없음, 두 폴더에 `src/app/api/cron/` 없음(2026-10-24 파일 목록 확인). 비교: 콘티 `src/app/api/cron/cleanup/route.ts` + `vercel.json` cron | 규칙 위반 상태 지속. 다만 **회원이 직접 손으로 다듬은 설계 문서까지 30일 뒤 지우면 회원 작업이 사라지는 피해**가 생길 수 있다 | 플랜 먼저: ① 보관 기준(생성일 30일 일괄 vs 마지막 수정일 기준 vs 내려받기 안내 후 삭제)을 주인님께 여쭘 ② 콘티 정리 작업 + 공용 `cleanup-usage-log` 사본으로 구현 ③ 첫 실행 전 회원 안내·유예 | **주인님 결정 필요** |
| DS-U2 | 글 모델이 구형·미리보기다 — 콘티 글 `gemini-2.5-flash`, 랜딩 pro `gemini-3.1-pro-preview`(실패 시 `gemini-2.5-flash`), 설계 `gemini-2.5-flash`. 이미지 모델은 2026-10-17 교체됐지만 글 모델은 그대로다. 종료되면 분석·기획안·복원이 한꺼번에 멈춘다. | `cinematic-storyboard-studio/src/lib/storyboard/types.ts` `TEXT_MODEL`, `landing-architect/src/lib/gemini.ts` `MODEL_CHAIN`, `ui-canvas/src/lib/gemini.ts` `MODEL`, `ui-canvas/src/lib/gallery/generateComponent.ts` | 지금 장애는 확인 안 됨(종료 일정 **확인 필요**) | 공식 모델 목록·종료 일정 확인 → 필요하면 세 앱 함께 교체(무료 점검, 교체는 빌드 3) | 확인 필요 |

중복 실행·다른 회원 데이터 공유·당해 연도 누락은 이번 점검에서 문제를 찾지 못했다(콘티는 유료 렌더 선점 `claimProject`, 세 앱 모두 `user_id` 조건 + RLS, 연도는 세 앱 모두 동적 주입). 랜딩·설계의 AI 생성은 프로젝트 행 선점 없이 버튼 잠금만 있어 **여러 탭에서 동시에 누르면 회원 본인 키로 두 번 호출될 수 있다**(저장은 `expectedUpdatedAt`으로 덮어쓰기 막음) — 피해 규모가 작아 후속(DS-W6)으로 둔다.

## 유지할 역할과 이관 방향

| 유지할 프로그램 | 담당 역할 | 흡수한 장점 | 원본 도구 처리 |
|---|---|---|---|
| 시네마틱 스토리보드 자동화 (`cinematic-storyboard-studio`) | 영상 장면을 미리 그려 보는 콘티 | 바나나·4컷·인물사진 결과를 참고 이미지로 받기 | 독립 유지 |
| AI 랜딩페이지 기획 자동화 (`landing-architect`) | 무엇을 어떤 순서로 말할지 — 기획안·HTML 시안 | UI 설계로 보내 다듬기 | 독립 유지 |
| UI Canvas 자동화 (`ui-canvas`) | 화면을 직접 배치하고 코드로 넘기기 | 웹UI의 갤러리·데모·TSX 코드·AI 컴포넌트 생성 | 웹UI는 이동 안내(주소 유지) |

병합된 원본을 닫는 것과 데이터 삭제·이용권 변경은 다르다. 옛 주소(웹UI)는 지우지 않는다. 비교표 카드 주소가 `ai-web-ui.buylife.xyz`, 원본 `AGENTS.md`가 `react-ui-showcase.buylife.xyz`로 서로 달라 **실제 연결 주소는 확인 필요**다.

## 순차 작업 표 — 끝난 것

상태는 **대기 → 플랜 제시 → 구현 중 → 로컬 검수 → 운영 검수 → 완료**로 구분한다.

| ID | 대상과 구현 범위 | 근거 커밋·버전 | 현재 상태 |
|---|---|---|---|
| DS-C1 | 콘티: 30일 자동 삭제 + 동시 렌더 선점(유료 생성 전 409) + 폴더째 삭제 | `dc2c2693c` · v1.10 | ✅ 완료(AGENTS 기록: 배포 Ready·정리 경로 401/200 확인) |
| DS-C2 | 콘티: 바나나 결과를 참고 이미지로 받기 | `6ad729ab3` · v1.11 | ✅ 완료 |
| DS-C3 | 콘티: 보낸 곳 안내·돌아가기(`?via=`, 공용 `link-mark` 사본) | `7dccc1bbc`·`e3a010db4` · v1.12 | ✅ 완료(크롬 화면 검수는 AGENTS에 「미확인」) |
| DS-C4 | 콘티: 보낸 곳을 프로젝트에 저장(`source` 칸) | `328984f09` · v1.13 | ✅ 완료(실제 저장 DB 확인은 다음 사용 때) |
| DS-C5 | 콘티: 4컷 만화·인물사진 결과도 받기 | `d80b22fdb` · v1.14, `22bb4bb68` · v1.15 | ✅ 완료 |
| DS-C6 | 콘티: 30일 정리 회원별 기록 + 좌측 메뉴 계정 위치 | `4cafe5eb3`·`f53021369`·`991a43a44` · v1.17 | ✅ 완료 |
| DS-M1 | 병합 D: 웹UI → 설계 「🧩 컴포넌트 갤러리」·React 코드 내보내기·AI 컴포넌트 보관, 웹UI 이동 안내·410, 골드 등급 표에 설계 체크(32명) | `809264a72`·`10f9667d5`·`aaaf99085` · 설계 v1.11 · 웹UI v1.06 | ✅ 완료 |
| DS-M2 | 설계: 반응형(flex) 코드 내보내기 | `dff735d75` · v1.12 | ✅ 완료 |
| DS-M3 | 설계: 보관한 AI 컴포넌트를 캔버스에 놓기·함수 이름 보완 | `1aebb14f5` · v1.13 | ✅ 완료 |
| DS-L1 | 랜딩 → 설계 「UI Canvas로 보내 다듬기」(+ 메뉴 버전 고정 버그) | `48fb4c627`·`1912cece1` · v1.11 | ✅ 완료 |
| DS-L2 | 랜딩: 서브 페이지·이미지 에셋도 보내기 | `f15050e5a` · v1.12 | ✅ 완료 |
| DS-L3 | 랜딩: 보낼 때 회원 사진 키로 실사진 | `ab8a84d7a` · v1.13 | ✅ 완료 |
| DS-X1 | 카테고리: 설계를 「데이터수집\|기획」 → 디자인으로 | `2772a096f`(마이그레이션 `0042`) | ✅ 완료(운영 적용 기록 기준) |
| DS-S1 | Next.js 보안 업데이트 — 콘티 v1.18, 랜딩 v1.14, 설계 v1.14, 웹UI v1.07 | `5cf72196a`·`0153bf77a`·`5c2b3337a`·`fb64f31a2` | ✅ 완료 |

## 대기·후속 (다음에 할 일 후보)

| ID | 대상과 범위 | 선행·기다리는 것 | 현재 상태 |
|---|---|---|---|
| DS-W1 | 설계 좁은 칸 버튼 줄바꿈 수정(`f0871e568`)이 v1.14 보안 배포(2026-10-23)에 함께 나갔는지 확인 → `ui-canvas/AGENTS.md` 「미배포」 표기 정리 | 운영 화면 확인 | 확인 필요 |
| DS-W2 | 웹UI 좌측 메뉴 계정 위치(`22c6cda35`) — 이동 안내 앱이라 배포가 필요한지 판단 | 담당 판단 | 확인 필요 |
| DS-W3 | 랜딩 「Claude Code·Cursor용 React 변환 프롬프트 복사」 — `AGENTS.md` §3.1·안내 화면에는 있으나 코드에서 버튼을 찾지 못함. 실재 확인 또는 문서 정정 | 화면 확인 | 확인 필요 |
| DS-W4 | 문서 정정: 비교표 설계 카드 「코드 내보내기 없음」·「24종」(실제 TSX 내보내기 있음, 종류 25), 콘티 AGENTS 표 v1.07·표준 엔진 `gemini-nano-banana-2.1`(실제 v1.18·`gemini-3.1-flash-lite-image`), 랜딩 AGENTS 미리보기 폭 375·1200(실제 390·768·100%), 개발분석표 EXT-MKT-01 「폴백 체인 하지 않음」(실제 `MODEL_CHAIN` pro → flash 폴백 있음) | 각 문서 담당 | 확인 필요 |
| DS-W5 | 랜딩 스톡 사진 키워드에 인물 조건(예: 사람이 나오는 자산은 `korean` 추가) 검토 | 핵심 원칙 3 · 담당 판단 | 후보 |
| DS-W6 | 랜딩·설계 AI 생성 동시 호출(여러 탭) 방지 검토 | DS-U1 뒤 | 후보(영향 작음) |
| DS-W7 | 설계 그룹 안 직접 편집·스마트 스냅·무한 패닝·프레젠테이션 모드 | `ui-canvas/docs/IMPROVEMENT_BACKLOG.md` | 대기 |
| DS-W8 | 설계 캔버스 크기 프리셋(태블릿·모바일)이 코드에 있는지 확인(안내 문구에만 확인) | 화면 확인 | 확인 필요 |
| DS-W9 | 콘티 개선 IMP-03~05(영상 AI별 원클릭 복사·카메라 무빙 뱃지·자르기 미리보기 최적화), 0.5초 장면 안내 보강 | `cinematic-storyboard-studio/docs/IMPROVEMENTS.md` | 제안 |
| DS-W10 | 콘티 미확인 항목: Pro 엔진(2K) 실제 생성, 일반 회원 계정 시험, 키 미등록 팝업, 30개 한도 메시지, 실제 동시 렌더 재현 | 유료 생성 승인 | 미검수 |
| DS-W11 | 랜딩 기획안 A/B 다중 버전·다국어, HTML 원클릭 호스팅 | `landing-architect/docs/IMPROVEMENT_BACKLOG.md` · 호스팅은 외부 공개라 신중 | 대기 |
| DS-W12 | 콘티 컷 → 영상 프로그램 넘기기, 4컷·웹툰·콘티 캐릭터 일관성 공용화 | [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) §3 「만화·영상 기획」 | 아이디어 |
| DS-W13 | 웹UI 폴더의 쓰이지 않는 옛 컴포넌트 코드(`react-ui-showcase/src/components/showcase`·`ui`) 정리 여부 | 주인님 결정(삭제는 승인 필요) | 확인 필요 |
| DS-W14 | 디자인 카테고리 담당 역할 지정 | 주인님 | 대기 |

## 항목마다 지킬 완료 조건

1. 착수 직전 `docs/ACTIVE_WORK.md`·미커밋 변경·역할 파일·최신 인수인계를 확인하고 **대상 프로그램 하나씩** 진행한다.
2. 코드를 고치기 전에 문제·범위·순서·검수·비용·버전/배포·인수인계 산출물을 플랜으로 제시한다(프로그램 `docs/PLAN_YYYYMMDD_*.md`). 이미 있는 기능은 [비교표](DESIGN_CATEGORY_FEATURE_MATRIX.md)로 확인해 중복 구현하지 않는다.
3. 무료·모의 검사부터 하고, 실제 생성 시험은 시험 계정 본인 키로 승인된 횟수만 한다(가장 저렴한 모델).
4. 회원 본인 키만, 회원별 저장, 생성일 기준 30일 정리를 지킨다(DS-U1 결정 전에는 랜딩·설계에 새 생성 데이터 칸을 늘리지 않는 것을 권장). 이미지 프롬프트는 프로그램 고유로 두고, 공용 사본은 기준만 고친다.
5. 랜딩 → 설계 넘기기를 건드리면 받는 쪽 문서 모양(`ui-canvas/src/lib/canvas/types.ts`)과 보내는 쪽 변환(`landing-architect/src/lib/lpa/toCanvas.ts`)을 같은 작업에서 맞추고, 변환 결과가 설계 `sanitizeDoc`을 통과하는지 확인한다.
6. 작은 수정은 「미배포 대기」로 모았다가 배포하고, 배포는 팀 전체에서 한 번에 하나씩 한다. 버전은 실제 배포 때 한 번만 올린다(코드 `src/lib/version.ts` + DB `programs.version`).
7. 완료 시 이 표의 상태·근거 커밋, 비교표 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, 루트 `docs/HANDOFF.md`(제목에 `[역할: <ID>]`)를 갱신한다.

## 새 기능·개선점을 발견했을 때

- 발견한 프로그램의 `docs/IMPROVEMENTS.md`에 날짜·세션·근거 파일·영향·우선순위·상태를 적고, 이 문서 「대기·후속」에 한 줄 추가한다.
- 공통 아이디어 표([`PROGRAM_IDEA_BACKLOG.md`](PROGRAM_IDEA_BACKLOG.md))에서 중복을 먼저 확인한다.
- 외부 참고 원본이 있으면 [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md)에 카드를 추가한다(지금 카드: EXT-MM-03 콘티, EXT-MKT-01 랜딩, EXT-TL-10 설계).

## 프로그램 주소

https://cinematic-storyboard-studio.buylife.xyz

https://landing-architect.buylife.xyz

https://ui-canvas.buylife.xyz

https://ai-web-ui.buylife.xyz (이동 안내 — 비교표 카드 기준, 원본 AGENTS는 `react-ui-showcase.buylife.xyz`로 적음, 확인 필요)

## 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 끝난 것 14줄·우선 처리 2줄·대기 14줄, 커밋 기록·코드 파일 목록으로 정리 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
