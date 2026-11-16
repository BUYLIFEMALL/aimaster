# AIMaster 협업 적용 기준

- 공통 지침: [AI_TEAM_RULES.md](../AI_TEAM_RULES.md)
- 실제 기준 경로: `D:\AIMaster`, 메인 장비 `GT1_Mega`, Git `master`, 초기 확인 HEAD `a5ddb297d0cae840c1d2cb9d1bd83c18f6f24465`.
- 기존 기록: [ACTIVE_WORK](../docs/ACTIVE_WORK.md), [HANDOFF](../docs/HANDOFF.md), [역할](../docs/roles/README.md), [협업](../docs/CLI_COLLABORATION_RULES.md), [멀티세션](../docs/MULTI_AGENT_SESSION_RULES.md), [미배포](../docs/PENDING_DEPLOYS.md), [프로그램 비교표](../docs/PROGRAM_CAPABILITY_MAP.md).
- 현재 작업과 실행기능은 [TEAM](TEAM.md)·[TRANSPORT](TRANSPORT.md)에만 관리한다. 기존 역할 파일의 프로그램 상세 현황을 복제해 별도 정본으로 만들지 않는다.

## 적용 순서

사용자의 최신 명시적 지시와 도구 권한 제약을 따른다. 기존 저작권·회원 본인 키·장비 제한·비용·운영/Lab 분리·안전 커밋·검색 허용 정책을 유지한다. Master의 배정은 도구 권한이나 기존 승인 범위를 늘리지 않는다.

기존 일반 협업 문서의 “담당께 + 복사용 프롬프트”는 자동 전달이 불가능할 때의 대안이다. 실제 전달 수단이 확인된 세션은 공통 지침 §5·§8에 따라 직접 전달하고 상태를 남긴다.

일반 지침의 worktree 권장은 공유 폴더 제한을 덮지 않는다. 이 초기 구성은 새 클론·worktree·공유 브랜치 전환을 하지 않는다. Admin·맥미니의 설치/build/dev/배포/운영 DB 쓰기는 기존 지침대로 메인 PC에 넘긴다.

2026-11-16 사용자 결정: Master가 각 보고를 근거와 대조하고 기본 설계·구현·수정·검증을 승인하거나 다음 작업을 지시한다. 사람의 로그인·인증·키 등록 또는 기존 범위를 넘는 비용·공개·사업 정책만 사용자에게 취합한다. 승인된 행동은 재승인받지 않는다.

## 실행·검증

루트 package.json 확인: `npm run dev`=next dev, `npm run build`=next build, `npm run start`=next start, `npm run lint`=next lint. 전역 `test` 스크립트는 없으며 `test:email-guard`, `test:poster-web-update`가 있다. 프로그램별 package.json과 지침을 먼저 확인해 해당 테스트를 선택한다. 이번 초기 문서 작업은 제품 build/dev/install이 필요하지 않다.

초기 `git status --porcelain -z` 스냅샷은 1,140항목(추적 변경52·미추적1,088). 숫자는 변할 수 있으며 모두 다른 작업/기존 변경으로 보존한다. 공용 문서는 편집 직전 `safe-commit --begin` 후 자신의 항목만 추가한다. 커밋·푸시 직전 ACTIVE_WORK·diff·잠금·HEAD·인덱스를 다시 확인한다. 자동 푸시는 메인 빌드를 유발하므로 문서 등록을 운영 배포로 확대하지 않는다.

## 완료 기준

1. 공통·역할 지침과 시작 포인터가 존재한다.
2. 배정과 실제 연결 상태가 분리되어 있다.
3. 한 개 이상 실제 세션의 요청ID→응답→결과 회수 근거가 있다.
4. 전체 포트폴리오 목록과 우선 작업 지휘표가 있으며 상태 충돌과 미확인 범위를 표시한다.
5. 실행기 없는 상시 감시를 약속하지 않는다. 사람의 필요 조치만 결정함으로 모은다.
