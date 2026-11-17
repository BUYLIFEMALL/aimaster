# 실제 호출·전달·결과 수집

확인: 2026-11-16 KST · GT1_Mega · Orca 1.4.259, runtime ready/reachable.

## 확인된 설치와 기능

| 도구 | 실제 경로·버전 | 확인된 기능 | 미확인 |
|---|---|---|---|
| Codex | C:/Users/Administrator/AppData/Local/Programs/OpenAI/Codex/bin/codex.exe · 0.164.0 | 현재 Master 세션, exec/resume/fork/review help, MacMini Tester 실제 ACK | 새 별도 세션 생성·자동복구 |
| Claude | C:/Users/Administrator/.local/bin/claude.exe · 2.1.325 | agents --json, 기존 9개 역할별 식별·현황/결과 회수 | CLI 새 실행/장비별 인증·복구 전반 |
| Antigravity | C:/Users/Administrator/AppData/Local/agy/bin/agy.EXE | print/json/stream-json·conversation·acp help, 실제 AG ACK | 새 생성 호출·모든 미디어 입력 기능 |
| Orca | C:/Users/Administrator/AppData/Local/Programs/orca/resources/bin/orca.exe | status·terminal list/read·orchestration run/send/check | 새 worker 실행·장비 간 공유파일 왕복 |

공통 주의: `agy agent`가 반환한 ai-architect/deployment-expert/performance-optimizer는 agent 정의이며 실행 세션 목록이 아니다. `orca session` 명령은 이 버전에서 지원하지 않는다. CLI 도움말 확인을 실제 모델 실행 성공으로 보고하지 않는다.

## 실제 운영 경로

```text
orca orchestration run-current --json
orca terminal list --json
orca orchestration send --to <TEAM의 실제 주소> --subject "<REQ-ID> <제목>" --type question --body "<범위와 완료조건>" --json
```

Orca가 새 메시지 알림으로 지정한 명령을 실행한다.

```text
orca orchestration check --run run_6e348395e1fe --json
```

메시지를 가져오는 check를 주기 스크립트로 돌리지 않는다. 실행 중 턴에는 독립 작업을 하고 Orca의 wake를 처리한다. 수신자는 가능하면 `orca orchestration reply --id <messageId> --body "<결과>" --json`으로 회신한다. 새 상태는 `send --to run:run_6e348395e1fe`로 Master에게 반환할 수 있다.

전송 도구의 accepted/queued를 작업자의 acknowledged로 올리지 않는다. 실제 ACK 또는 결과를 받으면 회수 근거를 저장하고 Master가 검토 후 integrated로 바꾼다. terminal-only mailbox는 닫히면 전달 영속성을 보장하지 않으므로 작업·결과 파일도 남긴다. 기존 supervised worker 주소는 dispatch 주소를 우선하고 터미널 입력으로 조종하지 않는다.

## 확인된 연결 시험

`PING-20261116-001` → 전송 `msg_1372e8b15495`(처음 queued) → AG의 `msg_e468ba595b0a`에서 ACK·agy-win-hero-copy·design·D:\AIMaster 회수. 이후 `msg_0d4998f2631d`에서 현황 보고 회수. 이 시험은 파일 수정·빌드·배포·추가 유료 API 작업을 요청하지 않았다. 메시지 응답 자체의 모델 이용량은 제공자 계정 정책에 따르며 정확한 비용은 별도 확인하지 않았다.

음악·이커머스·부동산의 REQ-STATUS와 B2BBackend 자발 보고·정정 회신도 실제 회수했다. Workspace 최초 보고는 사용자가 전달했으므로 자동 회수로 세지 않는다.

## dev-requests

실제 설치 스크립트 `scripts/dev-requests.mjs`에서 list/asks/ask/report를 확인했다. `list` 실행 결과 대기 관리자 지시 없음(확인 시점 기준).

```text
node scripts/dev-requests.mjs list --role codex-master
node scripts/dev-requests.mjs asks
node scripts/dev-requests.mjs ask --category approval --title "<DEC-ID> <제목>" --as codex-win-20261116-auto-team --note "<선택지·추천·범위>"
node scripts/dev-requests.mjs report --title "<작업ID> <제목>" --summary "<근거·검증·제한>" --as codex-win-20261116-auto-team
```

ask/report는 운영 DB 쓰기다. 이번 로컬 초기 구성에서는 아직 실행하지 않았다. 실제 성공한 기록만 관리자 화면 등록 완료로 보고한다.

## 상시 운영의 한계

현재 Run과 기존 세션 메시지 전달은 활성화되었다. 2026-11-17 추가 지시로 아래 30분 예약 점검을 등록·활성화했다. 모든 장비의 자동 복구·항상 실행되는 Master를 설정한 것은 아니다. 세션이 종료되거나 이용 한도에 걸리면 실제 실행/전달 실패를 기록하고 확인 가능한 위치에서 재개한다.

실행 중 5분 점검·이벤트 즉시 처리와 아래 예약 점검은 별개다. 마지막 Master 실제 점검은 `.ai/master-status.json`의 `monitoring.lastInspection`에 기록한다. `check`를 반복 실행하는 타이머·감시 스크립트는 만들지 않는다.

## 턴 밖 30분 예약 점검

- 자동화: `a8e75832-fa68-405d-b823-b72d26ec84a2` / AIMaster Master 30분 자동 점검.
- 실행기: 로컬 Orca `local_host_service`, 기존 `D:/AIMaster` workspace, provider `codex`, 점검 작업자 `CX-CHECK-01`.
- 일정: `*/30 * * * *`, `Asia/Seoul` — 매시 00분·30분. 활성화 확인 완료. 최초 수동 시험은 2026-11-17 23:56 KST `completed`, 고유 결과 파일 생성과 기존 Master의 `msg_361b6bda5258` 수신까지 확인했다. 정시 cron 회차 실행과는 구분한다.
- `reuseSession=true`는 이 자동화의 이전 실행 세션 재사용이다. 기존 Master 세션을 직접 재사용한다고 해석하지 않는다. 첫 점검은 별도 세션에서 실행한다.
- 전달: 점검 작업자가 고유 `.ai/results/CHECK-<UTC시각>-CX-CHECK-01.json`을 남기고 `run:run_6e348395e1fe`의 기존 Master에게 결과를 보낸다. Master의 수신함을 소비하지 않으며 공유 작업표·제품 파일은 수정하지 않는다.
- 필요 조건: 메인 PC와 Orca 실행·계정 사용 가능. 누락 회차는 5분 유예 내 한 번만 실행하는 설정이며 무제한 밀린 작업 재생은 아니다. 자동화 세션의 Codex 이용량은 해당 계정 한도를 따른다. 별도 유료 AI/API 호출은 허용하지 않는다.
- 실제 설정/시험 이력은 `.ai/master-status.json`의 `monitoring.outsideTurnAutomation`과 `orca automations show/runs`로 확인한다. 등록·활성화만으로 실제 결과 전달까지 성공했다고 보고하지 않는다.

```text
orca automations show a8e75832-fa68-405d-b823-b72d26ec84a2 --json
orca automations runs --id a8e75832-fa68-405d-b823-b72d26ec84a2 --json
orca automations edit a8e75832-fa68-405d-b823-b72d26ec84a2 --disabled --json
```

### 등록된 점검 프롬프트

```text
너는 AIMaster의 30분 예약 점검 전용 작업자 CX-CHECK-01이다. 유일한 총괄은 기존 Codex Master CX-MASTER-01이며, 별도 Master를 선언하지 않는다.
작업 위치는 D:/AIMaster다. AI_TEAM_RULES.md, .ai/TRANSPORT.md, .ai/master-status.json, docs/ACTIVE_WORK.md를 먼저 읽는다.
한 번 실행될 때 한 차례 점검하고 종료한다. 자체 sleep/watch/무한 반복과 Master의 메시지를 소비하는 orchestration check는 실행하지 않는다.
1. 마지막 실제 점검 시각 이후의 작업 보고·완료·유휴 상태와 실제 세션 연결을 읽기로 확인한다. 터미널 연결/유휴만으로 작업 완료나 점유 해제를 단정하지 않는다.
2. .ai/results/, .ai/handoffs/, docs/HANDOFF.md와 관련 프로그램 docs의 신규·수정 인수인계 및 Git 미추적 결과 파일도 찾는다. 작업표에 없는 후보는 본문·작업ID·담당·SHA·기존 처리 이력을 대조하고, 미확인·과거 처리·새 후속 필요를 구분한다.
3. 완료 수락·보완·독립 검수·다음 배정이 필요한 항목과 책임자/허용 파일/근거를 정리한다. 주인님 직접 지시와 기존 승인을 재질문하지 않고, 권한 확대·새 비용·사람 필수 단계만 별도로 표시한다.
4. 실제 확인 시각(ISO와 KST), 확인 범위/근거, 새 보고, 미확인/차단, 권장 후속 조치를 .ai/results/CHECK-<UTC시각>-CX-CHECK-01.json 고유 파일 하나에 기록한다. 확인하지 않은 운영 동작은 통과로 보고하지 않는다. 공유 master-status/TEAM/점유표 및 제품 파일은 수정하거나 커밋하지 않는다.
5. 기존 Master에게 결과 파일과 요약을 실제로 보낸다: orca orchestration send --to run:run_6e348395e1fe --subject '30분 자동 점검 결과' --type status --body '<확인 시각·변경/차단·권장 후속·결과 파일 경로>' --json
전송 실패 시 재전송 전에 도착 여부를 확인하고, 결과 파일에 전달 미확인을 남긴다. 새 Master/구현 세션을 자동 생성하거나 작업자에게 직접 구현을 중복 배정하지 않는다. Master가 결과를 받아 판정·후속 배정·공식 마지막 확인 시각을 갱신한다.
코드 수정, 설치, 개발 서버/빌드/배포, 운영 DB 쓰기, 외부 게시/발송, 유료 AI·검색 호출, 로그인·인증 우회, 사용자 제어 회수는 수행하지 않는다. Mac 빌드/배포 금지와 Support 주인님 전담을 유지한다.
변경이 없으면 추가 시험·배포·새 문서를 늘리지 말고 점검 결과만 기록·반환한다. 스케줄을 임의 변경하지 않는다.
효율 기준: 이전 CHECK 결과와 monitoring.lastInspection을 증분 기준으로 삼는다. 상태 JSON은 필요한 필드만 파싱해 요약하고 전체 수천 줄을 출력하지 않는다. 변경 없는 지침/결과 파일은 다시 전문 출력하지 않는다. 이번에 새로 수정되거나 미확인으로 발견한 현재 작업만 본문 대조하며, 최초 점검에서 남긴 과거 후보 58개는 결과 경로를 참조하고 매 회차 일괄 재열람/재배정하지 않는다. 변경이 없으면 짧은 점검 결과와 전송 1회로 끝낸다. 동일 상태 보고를 얻기 위해 담당자에게 반복 메시지를 보내지 않는다.
```
