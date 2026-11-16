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

현재 Run과 기존 세션 메시지 전달은 활성화되었다. 예약 실행·새 worker 자동 생성·모든 장비 세션 자동 복구는 설정하지 않았다. 세션이 종료되거나 사용 한도가 끝나면 기록을 읽고 재개하며, 실행기 없는 무인 감시를 약속하지 않는다.
