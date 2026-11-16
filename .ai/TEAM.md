# AI 협업팀 등록부

최종 갱신: 2026-11-16 KST. 총괄 `CX-MASTER-01`만 공식 배정·연결 상태를 갱신한다. 프로그램별 상세 현황은 기존 `docs/roles/`와 [총괄 플랜](../docs/MASTER_DEVELOPMENT_PLAN_20261116.md)을 사용한다.

## 사용자 확정 조직과 실제 연결

| 사용자 호칭 | 팀 ID | 기존 역할 ID | 실제 세션·장비 | 연결 상태 | 현재 작업 |
|---|---|---|---|---|---|
| Codex(Master) | CX-MASTER-01 | codex-master | codex-win-20261116-auto-team · GT1_Mega | busy · 현재 세션 | OPS-20261116-002 결과 검토·파일 범위 조정·다음 지휘 |
| Codex(Tester) | CX-QA-01 | mac-mini | codex-mac-20261116-tester-role · 대화01a1c5a4-68b7-7c51-b919-9bc56cd17af5 · MacMini | busy · 원격 ACK/공유문서 읽기 확인 | QA03 PASS·Mac 인덱스 재확인 정상, 다음검수 대기 |
| Antigravity | AG-UI-01 | design | agy-win-hero-copy · GT1_Mega | available · 실제 ACK/보고 회수 | DES03 온보딩검토 전달대기열, 수락 미확인 |
| Claude(Movie) | CC-MOVIE-01 | video | claude-win-video · aimaster-57 · GT1_Mega | busy · 실제 식별/결과 회수 | v1.33 Ready 보고 검토완료, 실제수신왕복 미검수 |
| Claude(Music) | CC-MUSIC-01 | music | claude-win-20261024-music · GT1_Mega | available · 실제 보고 회수 | MUS04 WS05 독립15시험 검토 완료 |
| Claude(ecommerce) | CC-ECOM-01 | ecommerce-image | claude-win-sdp · GT1_Mega | available · 실제 보고 회수 | ECOM05 INSTA권한 정적검토 완료 / 바나나 실화면 환경차단 |
| Claude(B2BFront) | CC-B2B-FRONT-01 | mall-design-builder | claude-win-20261114-mall-design · aimaster-64 · GT1_Mega | available · FRONT-04 검토 완료 | FRONT06 timesale dark/rose 두테마 가독성 보완 중 |
| Claude(B2BBackend) | CC-B2B-BACK-01 | mall-builder | claude-win-20261025-workspace · GT1_Mega | available · 복구 결과 수락 | 3210 전용터미널 복구 확인 / DEC002 운영승인 대기 |
| Claude(RealEstate) | CC-REALTY-01 | realty | claude-win-20261024-realty · aimaster-73 · GT1_Mega | available · 실제 보고 회수 | v1.45/v1.61 Ready 근거검토완료, 카카오/뉴스실물 별도 |
| Claude(Workspace) | CC-WORKSPACE-01 | workspace | aimaster-46 · session dea6e4f6-37c0-4be8-ad50-8746e0f1c517 · GT1_Mega | busy · 실제 식별/구현결과 회수 | v1.52 운영·WS05 독립15시험 통과·보강코드 미배포 |
| Claude(Blog) | CC-BLOG-01 | blog | claude-win-blog · aimaster-92 · GT1_Mega | available · 실제 보고 회수 | BLOG03 v1.07 치환 독립검토 완료·설치 미검수 |
| Claude(Support) | CC-SUPPORT-01 | support · policy | claude-win-20261112-policy · term_e4de9dda · GT1_Mega | busy · 사용자 전담 / Master 배정제외 | 사용자와 키트설치 전담. 타업무/독립검토대응 배정금지(사용자직접지시) |

`CC-ENG-01`은 Claude 공통 역할 지침의 예시 ID이며 모든 Claude 세션을 합치는 ID가 아니다. 위 세부 팀 ID가 실제 배정 단위다. 호칭 표기의 Claud/Claude 차이는 같은 사용자 지정 호칭의 표기 차이이며 별도 세션으로 세지 않는다.

기존 Blog·policy·mac-mini·docbot-prompt·analysis-planning 등 역할은 유지한다. 최신 조직도에 없다는 이유로 폐지하거나 업무를 빼앗지 않는다. 추가 사용자 배정은 이 표에 한 행씩 반영한다.

## 확인된 주소

Orca run: `run_6e348395e1fe` · runtime `4c4b684f-d0e9-4878-97d5-ce1880c55b7d` · worktree `8596cd65-b178-4dc4-8e56-794c75a956a7::D:/AIMaster`.

| 팀 ID | Orca 주소 | 증거 |
|---|---|---|
| CX-MASTER-01 | term_d8c5d7ed-7c8e-4a20-a22f-8f3919ad3a5a / run:run_6e348395e1fe | 현재 터미널·run-create |
| AG-UI-01 | term_17973ba1-32c4-40c7-bee4-dd62d857de9e | PING-20261116-001 ACK msg_e468ba595b0a |
| CC-MUSIC-01 | term_311ae122-f106-40cf-b104-1223985df3cd | REQ-STATUS-MUSIC-01 msg_4e3ab50d38a4 |
| CC-ECOM-01 | term_fadcde70-c7d5-4e43-bab2-2f9411f46b35 | REQ-STATUS-ECOM-01 msg_f0e627e018fd |
| CC-B2B-BACK-01 | term_46946865-f9aa-4e38-a14f-daa1f320dd41 | msg_d7e7aa4baac6 / 정정 msg_d88e19f5c1ef |
| CC-REALTY-01 | term_cd6b250d-2cdd-46f0-afe4-9377727d845d | REQ-STATUS-REALTY-01 msg_8f653629169e |
| CC-MOVIE-01 | term_822b9d91-9a25-4d57-9c29-d69fc6de3d88 | IDENT msg_d5f24f5538d7 / 결과 msg_86b54902fdf7 |
| CC-B2B-FRONT-01 | term_f4c00bf6-875e-46fa-9d0a-72df606548dc | IDENT msg_127ba32a814a / 정정 msg_bbb5c0a8e8b4 |
| CC-WORKSPACE-01 | term_d62d586f-e201-4b83-8d7b-8bace6a06049 | IDENT msg_ee909437f911 / 구현 msg_31beb6fd1c34 |
| CC-BLOG-01 | term_78415ab7-52b8-49a9-adbf-c6450509ec54 | IDENT msg_196120a86386 / 결과 msg_b64aa460031c |
| 기존 policy | term_e4de9dda-0a1d-472f-87a5-e8b6e51faa14 | IDENT msg_1f604361cecb / 보류확인 msg_15c5dbecaf5e |
| CX-QA-01 | **--on MacMini** · term_e1676007-3108-49cf-90f9-4518da3dfb27 | 요청 msg_43eca2fda35d / 원격 ACK msg_61fc7276a960 |

터미널 주소는 세션 종료 후 영속성을 보장하지 않는다. 전송 직전 현재 연결·실행환경·수신자를 다시 확인한다. 주소 발견과 수신 수락은 구분한다.

## 아직 배정하지 않은 관찰 대상

로컬 Orca 터미널 목록은 11개(Claude 9·Antigravity 1·Codex 1), `claude agents --json --cwd D:/AIMaster`는 다른 범위의 Claude 세션 9개를 반환했다. 두 목록을 단순 합산하지 않는다. 일반 제목 Terminal 2/3/4나 프로세스 존재만으로 Movie·Front·Workspace를 확정하지 않는다. 개별 식별 회신으로 연결한다.

MacMini는 원격 메시지→실제 ACK와 동일 공유경로의 AI_TEAM_RULES.md v1.0 읽기를 확인했다. 별도 파일 생성 왕복·자동 복구는 검증하지 않았다. Admin 조회는 성공했으나 터미널 목록0개이며 기존 작업자의 부재를 확정하는 근거는 아니다. 다른 이름의 외부 호스트는 이 작업 대상이 아니다.

별칭 `CX-TEST-MAC-01`은 Tester가 제안한 이름이며 공통 팀 ID `CX-QA-01`과 같은 실제 세션이다. 별도 작업자로 중복 계산하지 않는다. Mac Tester 소유 지침은 docs/AI_TEAM_TESTER.md, 사용자 제공 공통 검증13절은 docs/AI_TEAM_QA_STANDARD.md로 보존한다.
