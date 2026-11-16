# AI 협업팀 등록부

최종 갱신: 2026-11-17 KST. 총괄 `CX-MASTER-01`만 공식 배정·연결 상태를 갱신한다. 프로그램별 상세 현황은 기존 `docs/roles/`와 [총괄 플랜](../docs/MASTER_DEVELOPMENT_PLAN_20261116.md)을 사용한다.

## 사용자 확정 조직과 실제 연결

| 사용자 호칭 | 팀 ID | 기존 역할 ID | 실제 세션·장비 | 연결 상태 | 현재 작업 |
|---|---|---|---|---|---|
| Codex(Master) | CX-MASTER-01 | codex-master | codex-win-20261116-auto-team · GT1_Mega | busy · 현재 세션 | OPS-20261116-002 결과 검토·파일 범위 조정·다음 지휘 |
| Codex(Tester) | CX-QA-01 | mac-mini | codex-mac-20261116-tester-role · 대화01a1c5a4-68b7-7c51-b919-9bc56cd17af5 · MacMini | busy · QA003/004 결과반환 | 독립검수 총괄·RE격리/0102 P1·E1중복 보완재검수, Mac빌드/배포금지 |
| Antigravity | AG-UI-01 | design | agy-win-hero-copy · GT1_Mega | 결과반환·보완지시전달 | DES17-02 시안145/146/147·12뷰·독립뷰어보완, 제품미반영/주인님선택 |
| Claude(Movie) | CC-MOVIE-01 | video | claude-win-video · aimaster-57 · GT1_Mega | 배정전달·착수/결과는작업판참조 | MOV17-05 UI2건검토완료, MOV17-06 Workspace묶음독립검토 |
| Claude(Music) | CC-MUSIC-01 | music | claude-win-20261024-music · GT1_Mega | 코드완료·점유충돌정리대기 | MUS17-01 취소안내 독립PASS·미배포묶음, 공용점유표타인4줄삭제미접촉 |
| Claude(ecommerce) | CC-ECOM-01 | ecommerce-image | claude-win-sdp · GT1_Mega | 배포완료보고수락 | 상세1.47·바나나1.49/실저장왕복·쇼핑제휴1.89 완료; 실네이버확장미검수 |
| Claude(B2BFront) | CC-B2B-FRONT-01 | mall-design-builder | claude-win-20261114-mall-design · aimaster-64 · GT1_Mega | 결과반환·코드편집종료보고 | FRONT17-01 Tab76/선택fallback보완·미배포묶음, 추가배포없음 |
| Claude(B2BBackend) | CC-B2B-BACK-01 | mall-builder | claude-win-20261025-workspace · GT1_Mega | QA P1 수정계획 수락 | 0102 배송7일/반품경합 수정·메인격리실행, Lab0102/운영/UI 보류 |
| Claude(RealEstate) | CC-REALTY-01 | realty | claude-win-20261024-realty · aimaster-73 · GT1_Mega | VM재현·격리수정 배정 | RE17-04 계정전환결과격리·세대검사 우선, 실제수집0 |
| Claude(Workspace) | CC-WORKSPACE-01 | workspace | aimaster-46 · session dea6e4f6-37c0-4be8-ad50-8746e0f1c517 · GT1_Mega | E1 보완·WS10 검수대기 | E1 notify_me 영속CAS 수정→Mac, E2-7-1 국소허용·디자인선택전구조유지 |
| Claude(Blog) | CC-BLOG-01 | blog | claude-win-blog · aimaster-92 · GT1_Mega | 결과반환·점유없음보고 | BLOG17-01 운영메타/미배포표 정정완료, T12미정·키트전담미침범 |
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
