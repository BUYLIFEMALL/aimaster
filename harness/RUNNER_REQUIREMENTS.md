# AIMaster 실행기 요구사항

[실행기 요구사항 원문](package/harness/RUNNER_REQUIREMENTS.md)과 [인수 시나리오](package/harness/SCENARIO_ACCEPTANCE.md)를 기준으로 구현·검증한다. 프로젝트별 승인 범위, 장비 및 공유 작업공간 적용 방법은 [팀 규칙](../AI_TEAM_RULES.md)과 [운영 절차](README.md)를 따른다. 원문의 별도 clone·worktree 구성은 실제 장비에 허가된 경우에 적용한다.

실제 실행기는 Orca 메시지와 기존 Master 예약 호출, 중앙 Controller를 연결한다. 연결 상태를 확인할 때는 [전달 수단](../.ai/TRANSPORT.md)에서 현재 run, 장비, 터미널을 대조한다. 명령 성공, 전송 영수증, 담당자의 수락, 완료를 따로 기록한다. 중지·재개·복구 동작의 검증 수준은 해당 회차의 증거로 표시한다.
