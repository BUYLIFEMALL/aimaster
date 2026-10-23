# AIMaster 최상위 지침 — 분야별 요약 색인

2026-10-23 · 모든 CLI 공통. **기존 지침을 지우거나 대체하지 않고, 반복 내용을 분야별로 요약한 안내서입니다.** 실제 작업 전에는 아래 해당 분야의 상세 원문과 대상 프로그램의 최신 인수인계를 함께 읽습니다.

현재 환경은 **윈도우 메인 PC + 맥미니 원격 보조 PC, AGY·CODEX·CLAUDE CODE 멀티세션**입니다. 장비·CLI·세션을 구분하는 담당/커밋/브라우저 기준은 [CLI 협업](COLLABORATION.md) 첫 부분에서 확인합니다.

**여러 세션이 함께 작업할 때 필독:** [멀티에이전트·멀티세션 공동 작업 규칙](../MULTI_AGENT_SESSION_RULES.md). 주인님의 후속 요청으로 별도 등록한 기준이며, 공용 자원 예약·공유 Git·데이터 수정·배포/맥미니 인계·충돌 처리 절차를 담습니다.

## 처음 읽는 순서

1. [최상위 공통 원칙](COMMON.md)에서 운영/Lab·본인 계정·데이터 보호 기준을 확인합니다.
2. [CLI 협업](COLLABORATION.md)에 따라 `ACTIVE_WORK`·최신 `HANDOFF`·대상 폴더 변경을 확인합니다.
3. 아래 표에서 **이번 작업에 해당하는 분야만** 읽고, 연결된 상세 원문으로 진행합니다. 한국어 소통과 비용 규칙은 모든 작업에 적용합니다.
4. 대상 프로그램의 `AGENTS.md`·`README.md`·최신 인수인계·`IMPROVEMENTS.md`를 확인하고 플랜을 제시합니다.

## 분야별로 찾아보기

| 분야 | 요약 | 읽는 작업 | 상세 원문 첫 진입점 |
|---|---|---|---|
| 최상위 공통 원칙 | [공통 원칙](COMMON.md) | 모든 작업, 운영/Lab 판별, 계정·데이터·권한 | [본인 계정·API](../TOP_RULE_PERSONAL_ACCOUNT_API.md), [Lab](../AIMASTER_DEV_LAB_GUIDELINES.md) |
| 개발 관련 지침 | [개발](DEVELOPMENT.md) | 기능 개발·수정·분석·공용 부품 | [공통 개발 방식](../AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md) |
| 디자인 관련 지침 | [디자인](DESIGN.md) | 화면·레이아웃·사용 흐름·모바일 개선 | [디자인 메인](../../DESIGN.md), [프로그램 디자인 표준](../PROGRAM_DESIGN_STANDARD.md) |
| 디자인 템플릿 지침 | [템플릿·매뉴얼](DESIGN_TEMPLATES.md) | 테마 선택·재사용·연동/사용 매뉴얼 | [템플릿 카탈로그](../DESIGN_TEMPLATE_CATALOG.md), [매뉴얼 규격](../MANUAL_AND_INTEGRATION_GUIDELINES.md) |
| 서브프로그램 개발 및 운영 | [서브프로그램](SUBPROGRAMS.md) | 신규 등록·회원 연동·운영·인수인계 | [DB 연동](../DATABASE_CONNECTION_POLICY.md), [회원 연동](../MEMBER_INTEGRATIONS.md) |
| 비용 및 배포 관련 지침 | [비용·배포](COST_AND_DEPLOY.md) | 비용 승인·시험·버전·배포·확장 배포 | [시험 비용](../TEST_COST_POLICY.md), [배포 비용 절감](../VERCEL_COST_REDUCTION_PLAN.md) |
| 여러 CLI의 공동 작업 | [CLI 협업](COLLABORATION.md) | 담당 확인·브라우저·공용 문서 커밋·장비별 제한 | [협업 상세](../CLI_COLLABORATION_RULES.md) |
| 한국어 지침 | [한국어 소통](KOREAN.md) | 진행 안내·설명·최종 보고·현황 보고 | [루트 대화 규칙 원문](../../CLAUDE.md) |
| 프로그램 병합·독립프로그램 | [병합·독립 유지](CONSOLIDATION.md) | 기능 비교·병합 검토·단계 이관·독립 운영 | [비교 분석 매뉴얼](../PROGRAM_COMPARISON_ANALYSIS_GUIDE.md), [Lab](../AIMASTER_DEV_LAB_GUIDELINES.md) |
| 에러 처리 지침 | [에러 처리](ERROR_HANDLING.md) | 오류·실패·느려짐·복구·재발 방지 | [에러 교훈·작업 전 점검](../ERROR_LESSONS.md) |

## 같은 내용이 여러 문서에 있을 때

- 이 요약은 기존 사용자 지시·최상위 규칙·분야별 원문보다 우선하는 새 정책이 아닙니다.
- 같은 항목의 과거 설명과 최신 확정 지시를 날짜·대상·예외와 함께 대조합니다. 문서 수정 시각만으로 우선순위를 정하지 않습니다.
- 최신 조건이 확인된 예: 작은 수정의 배포/버전 증가(2026-10-22), 비용 사전 승인(2026-10-22), CLI 기본 브라우저와 세션 지정 예외(2026-10-22), 공용 문서 안전 커밋(2026-10-23).
- 충돌을 판단하기 어려우면 기존 작업을 보존하고 차이·영향·추천 방향을 주인님께 설명합니다. 다른 규칙으로 임의 대체하지 않습니다.
- [중복·상충 검토표](REVIEW_20261023.md)에 이번 요약의 근거와 구분을 남겼습니다.

## 요약을 유지하는 방법

정책이 바뀌면 해당 분야의 기존 원문을 먼저 갱신하고, 해당 요약과 이 색인의 연결을 맞춥니다. 세 루트 지침에는 공통 안내만 같은 내용으로 유지합니다. 구체적인 프로그램 버전·담당자·운영 완료 상태는 최신 프로그램 인수인계와 현황판에서 확인합니다.

[작업 플랜](../PLAN_20261023_GUIDELINES_SUMMARY.md) · [이번 인수인계](../IMPROVEMENT_HANDOFF_20261023_GUIDELINES_SUMMARY.md)
