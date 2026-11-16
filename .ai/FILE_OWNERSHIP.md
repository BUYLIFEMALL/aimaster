# 파일 점유·수정 범위 — Master 조정표

2026-11-16 사용자 지시: 각 역할은 임의로 파일을 고치지 않는다. 편집 직전에 다른 세션의 작업 여부를 확인하고, 해당 파일이 비어 있을 때 자신의 배정 범위를 등록·재확인한 다음 수정/추가한다. 완료 판정은 Master가 한다.

## 매번 편집 직전

1. 배정 작업ID·허용 파일을 확인한다. 추가 파일이 필요하면 먼저 Master에게 파일 목록·이유·영향을 요청한다.
2. 최신 `docs/ACTIVE_WORK.md`, 이 표, 프로그램 상호 인수인계의 점유표, `git status --porcelain -- <파일>`, `git diff -- <파일>`, 최근 관련 커밋을 읽는다.
3. 다른 세션의 점유·미커밋 변경이 있거나 출처가 불명확하면 그 파일은 편집하지 않는다. Master에게 범위/차이를 보내고 독립 작업만 진행한다.
4. 비어 있고 배정 범위 안이면 기존 ACTIVE_WORK/프로그램 점유표의 자기 행으로 예약하고, 표와 대상 상태를 즉시 다시 읽는다. 동시 예약이 보이면 Master가 한 담당 또는 순서를 결정할 때까지 해당 파일을 멈춘다.
5. 실제 코드·diff를 다시 읽고 최소 수정한다. 저장/커밋 직전에도 HEAD·상대 변경을 재확인한다. 끝나면 자기 점유만 해제하고 SHA·파일·검증·한계를 제출한다.

이 표는 조정 기록이며 기술적 파일 잠금이 아니다. 예약만으로 충돌 방지가 보장됐다고 말하지 않는다. 다른 세션의 오래된 행도 임의로 지우지 않는다.

## 현재 조정 범위

| 작업 | 책임 세션 | 허용 수정/동작 | 상태·경계 |
|---|---|---|---|
| OPS-20261116-001 | CX-MASTER-01 | AI_TEAM_RULES.md·.ai/TEAM/PROJECT/TRANSPORT/FILE_OWNERSHIP/CHANGELOG·tasks/decisions·총괄플랜·루트지침3종 본인블록·공용문서 본인항목·문서목록 | Master 전용 공식배정/완료상태 |
| WS-20261116-02 | CC-WORKSPACE-01 | ai-work-workspace/src/litpage/server/agents/runs.ts·agents/tools.ts·api/modules/agents.ts, tests/integration/agentMcp.test.ts, 본인 개선문서 항목 | runs.ts/API 모듈 추가는 msg_de4219836a9e로 승인. 새스키마 없음. QA 전 배포 안 함 |
| B2B-20261116-02 | CC-B2B-BACK-01 | 본인 3210 Lab 서버 점유확인·1회 재개·상태/로그/본인 문서 | 코드추가·DB·외부결제 없음, 다른 프로세스 종료 없음 |
| FRONT-20261116-01 | CC-B2B-FRONT-01 | 본인 tracker/상호인수인계 자기항목·Lab E3 검수 | 공용 주문/결제파일은 백엔드 소유. 새 템플릿 구현 아직 미배정 |
| ECOM-20261116-02 | CC-ECOM-01 | banana-canvas ProductBatchBoard.tsx·globals.css·본인 개선문서 | 7b5d3b053 제출, 추가 수정은 재배정 후 |
| MOV-20261116-01 | CC-MOVIE-01 | video-to-gif ConverterWorkspace.tsx·ProductVideoStudio.tsx·lib/shopInbox.ts·shopPayload.ts·shopPayload.test.ts·본인 개선문서 | efc72da60 제출, 독립 검토 대기 |
| RE-20261116-02 | CC-REALTY-01 | realty-listing-alert 확장 background/notify/telegram/popup·kakaoFail시험·package.json의 시험연결·본인 개선문서, real_estate_sales auth local/서버UA 대상 | 26e774a8e·7823a692b 제출, 추가 경로는 Master 재배정 |
| BLOG-20261116-01 | CC-BLOG-01 | tistory generator/extensionContent의 소제목 정규화와 국소시험, blog-neighbor-care background/context-bridge/popup·국소시험·본인 개선·재시험요청 | a27861137·e35947191 제출. 남의 AGENTS 변경 보존 |
| MUS-20261116-02 | CC-MUSIC-01 | 배정 브라우저에서 MP41회/곡0개 화면 검증·본인 개선/역할 항목 | 제품코드 수정 없음, 보고 완료 |
| DES-20261116-01 | AG-UI-01 | 읽기 전용·자기 고유 결과파일 | 제품코드 수정 없음. 정적 지적은 담당 재대조 후 채택 |
| QA-20261116-01 | CX-QA-01 | 읽기 전용 코드/가벼운 검사·자기 결과파일·mac-mini 본인 검수기록 | 코드/도구설치/dev/build/DB/유료호출 없음 |
| FRONT-20261116-02 | CC-B2B-FRONT-01 | mall-builder/src/lib/builder/templates-extra-2.ts·tests/templates-extra-2.test.mjs 신규, 기존 templates.ts 연결2줄·admin/design/templates/template-gallery.tsx 도식·DESIGN_BUILDER_TRACKER.md 본인행·고유결과 | E3 Lab검수 먼저. DESIGN.md는 Master만 결과 후 갱신. DB/배포 없음 |
| MOV-01 릴리스 준비 | CC-MOVIE-01 | video-to-gif/extension/NOTICE 신규·lib/version.ts·extension/manifest.json·public/downloads/local-renderer의 해당 ZIP/version.json, 해당slug version/extension_version, PENDING/HANDOFF/본인역할 해당항목 | 사용자 직접 빌드1회 승인 확인, Master msg_44fad028c623로 필수범위 추가. QA 치명지적 확인 전 배포 대기 |
| DES-20261116-02 | AG-UI-01 | 읽기 전용 7b5d3b053 대조, DES-01 본인결과 정정·DES-02 고유결과 | Master 검토 후 정적범위 done. 제품파일 수정 없음 |
| FRONT-20261116-03 | CC-B2B-FRONT-01 | mall-builder/src/app/s/[store]/admin/design/my-sections.tsx의 넣기 피드백 국소 수정, 기존 tests/my-sections.test.mjs(의미 있는 회귀가 필요할 때만), 본인 결과·개선문서 항목 | 다른 부모/공용 파일이 필요하면 편집 전에 목록·이유를 Master에게 제출. 추가 템플릿 확대 없음 |
| FRONT-20261116-04 | CC-B2B-FRONT-01 | mall-builder/src/app/s/[store]/admin/design/design-editor.tsx의 Puck headerActions 식별성·해당 인스턴스 상태 연결, my-sections.tsx의 전역 UI 저장소 제거/국소 상태·요청 수명 관리, 기존 my-sections.test.mjs 및 필요한 고유 회귀시험·본인 결과/개선문서 | 685fed7da 실제diff·422시험/타입0·Lab회귀 근거로 Master 검토 완료. FRONT-03 방안은 대체됨. 운영 배포는 별도, 새 파일 수정은 재배정 후 |

작업자가 공용 `.ai/` 등록부·tasks·decisions·총괄표를 직접 바꾸지 않는다. `.ai/results/<작업ID>-<세션ID>.md` 고유 결과는 쓸 수 있으며, 추가 결과 파일도 파일명을 Master에게 알린다. 자기 프로그램 문서/ACTIVE_WORK 본인 항목은 기존 안전 편집 규칙대로 관리한다.

## 완료 처리

작업자는 `ready_review`로 제출한다. Master가 요구·실제SHA·파일범위·충돌·검증·남은 문제를 확인하고 승인/보완/다음지시를 기록한다. 작업의 완료조건이 충족된 경우만 `done`으로 닫는다. 구현 완료·독립검토 통과·배포 Ready·운영 검수는 별개 상태이며, 배포가 목표인 상위 작업을 코드 구현만으로 닫지 않는다.
