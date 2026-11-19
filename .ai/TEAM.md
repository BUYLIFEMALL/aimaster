# AI 협업팀 등록부

최종 갱신: 2026-11-19 KST(macOS·Windows 검수 배정 원칙 반영; 기존 행의 최신 작업 상태는 총괄 플랜 기준). 총괄 `CX-MASTER-01`만 공식 배정·연결 상태를 갱신한다. 프로그램별 상세 현황은 기존 `docs/roles/`와 [총괄 플랜](../docs/MASTER_DEVELOPMENT_PLAN_20261116.md)을 사용한다.

## 사용자 확정 조직과 실제 연결

| 사용자 호칭 | 팀 ID | 기존 역할 ID | 실제 세션·장비 | 연결 상태 | 현재 작업 |
|---|---|---|---|---|---|
| Codex(Master) | CX-MASTER-01 | codex-master | codex-win-20261116-auto-team · GT1_Mega | busy · 공식상태/파일범위 통합 | 146 구현·ESM 매뉴얼·결제예외/실행패키지 지휘 |
| MacMini Codex(Tester) | CX-QA-01 | mac-mini | codex-mac-20261116-tester-role · 대화01a1c5a4-68b7-7c51-b919-9bc56cd17af5 · MacMini | 역할 확인 msg_5ce52c6c09a1 · 배정 기준 수신 msg_4c8027206903 | macOS·Windows용 프로그램의 기본 검수·디버깅·개선 제안 |
| Codex(Tester) | AdminPC Tester | AdminPC | Windows 11 · NVIDIA RTX 5080 · RAM 64GB | RTX 첫 장 배정 수락, 고정 파일 검증 담당 보고 | 무거운 로컬 모델 실측과 해당 시험의 디버깅·개선 제안만 |
| Antigravity | AG-UI-01 | design | agy-win-design · GT1_Mega (이전 등록 agy-win-hero-copy) | emotion제품동결유지·PORT19문서매핑배정 전송/수락미확인 | 문서JSON19건반환→Master근거판정·다른프로그램코드변경0 |
| Claude(Movie) | CC-MOVIE-01 | video | claude-win-video · aimaster-57 · GT1_Mega | YVS실검색/AI기획안1회 담당운영완료·점유0 | 재호출0·새배정대기 |
| Claude(Music) | CC-MUSIC-01 | music | claude-win-20261024-music · GT1_Mega | 현재기록정정완료·점유0·기존icon변경보존 | lyric2건다음묶음·Mac실MP4사람선택 |
| Claude(ecommerce) | CC-ECOM-01 | ecommerce-image | claude-win-sdp · GT1_Mega | 재배포선택질문대기·후속메시지전달보류·운영1.29 | 追加빌드1예산결정전0·안전후보59cb고정·실3회기승인잔여 |
| Claude(B2BFront) | CC-B2B-FRONT-01 | mall-design-builder | codex-sub-20261119-mall-design · Sub | 인수 확인 msg_1cc34028b4d9 · Chrome | 미배포 묶음 범위 대조 완료 36bdb31dd · Mac 실화면 대기 |
| Claude(B2BBackend) | CC-B2B-BACK-01 | mall-builder | claude-sub-20261119-b2bbackend · Sub | 인수 직접 확인 msg_de84ea91930f | 0101~0105/M3 조건 대조 msg_21bea4cf8521 · 메인 3210 검수 유지 |
| Claude(RealEstate) | CC-REALTY-01 | realty | claude-win-20261024-realty · aimaster-73 · GT1_Mega | 문서정정완료·점유0 | 독립자료미확보차단·정상회차이외새수집0 |
| Claude(Workspace) | CC-WORKSPACE-01 | workspace | aimaster-46 · session dea6e4f6-37c0-4be8-ad50-8746e0f1c517 · GT1_Mega | Gmail공개방식/빌드선택질문대기·GCP완료신호반영 | 주인님결정→ClientID일치/실행순번확정·SQL/스위치0 |
| Claude(Blog) | CC-BLOG-01 | blog | claude-win-blog · aimaster-92 · GT1_Mega | 현재요약정정완료·점유0 | 다음묶음/사람계정조건·T12문서조정, 새생성0 |
| Claude(SNS) | CC-SNS-01 | sns | claude-win-20261118-sns · GT1_Mega | 주인님 직접 지정·W00 ab9bd10da 소스근거 검수 대기 | W01 정확계획 준비·공용모듈 변경 별도·P0 유료 미승인 |
| Claude(Support) | CC-SUPPORT-01 | support · policy | claude-win-20261112-policy · term_e4de9dda · GT1_Mega | 주인님직접키트작업전담·이번상태미조회 | Master다른작업배정제외·완료신호만취합 |

`CC-ENG-01`은 Claude 공통 역할 지침의 예시 ID이며 모든 Claude 세션을 합치는 ID가 아니다. 위 세부 팀 ID가 실제 배정 단위다. 호칭 표기의 Claud/Claude 차이는 같은 사용자 지정 호칭의 표기 차이이며 별도 세션으로 세지 않는다.

기존 Blog·policy·mac-mini·docbot-prompt·analysis-planning 등 역할은 유지한다. 최신 조직도에 없다는 이유로 폐지하거나 업무를 빼앗지 않는다. 추가 사용자 배정은 이 표에 한 행씩 반영한다.

## 정기 점검 실행 위치

2026-11-18 주인님 지시: 정기 점검도 현재 `CX-MASTER-01`의 터미널과 기존 대화에서 수행한다. Windows 예약은 기존 Master에게 메시지만 보낸다. 새 Codex 창·에이전트는 생성하지 않는다. 실제 설정·전송 기록은 [.ai/TRANSPORT.md](TRANSPORT.md)를 따른다.

## 중지된 이전 예약 점검 작업자 이력

별도 창 방식은 2026-11-18 중지했다. 아래는 이전 검증 이력이며 현재 가용 작업자로 배정하지 않는다. 자동화는 비활성화했고 해당 시험 터미널은 닫았다.

- `CX-CHECK-01`: Orca 자동화 `a8e75832-fa68-405d-b823-b72d26ec84a2`, 메인 PC의 기존 `D:/AIMaster` workspace, provider Codex. Master에게 점검 결과만 반환하는 작업자이며 별도 총괄자가 아니다.
- 최초 수동 시험 실행 `9480775b-d46b-481e-847a-9bd93882700c`: 실제 터미널 `term_b6e992d2-81b3-497c-be5c-ecf8c226c4d7`, 2026-11-17 23:56 KST 점검 완료, 결과 파일과 `msg_361b6bda5258`의 기존 Master 수신 확인. 최초 정시 회차 `dd9ee668-cf1c-4c5f-affe-098050385970`도 11-18 00:00 예약→00:01:56 점검·`msg_96b4243b4ef3` Master 수신, `trigger=scheduled`·`completed` 확인.
- 후속 실행은 이 자동화의 이전 세션을 재사용하며 세션이 없으면 새 점검 세션으로 시작할 수 있다. 실제 실행별 세션·결과·전달 상태는 자동화 이력과 `monitoring.outsideTurnAutomation`으로 확인한다. 제품·공유 작업표 수정과 직접 구현 배정 권한은 없다.

## 확인된 주소

Orca run: `run_6e348395e1fe` · runtime `4c4b684f-d0e9-4878-97d5-ce1880c55b7d` · worktree `8596cd65-b178-4dc4-8e56-794c75a956a7::D:/AIMaster`.

| 팀 ID | Orca 주소 | 증거 |
|---|---|---|
| CX-MASTER-01 | term_d8c5d7ed-7c8e-4a20-a22f-8f3919ad3a5a / run:run_6e348395e1fe | 현재 터미널·run-create |
| AG-UI-01 | term_17973ba1-32c4-40c7-bee4-dd62d857de9e | PING-20261116-001 ACK msg_e468ba595b0a |
| CC-MUSIC-01 | term_311ae122-f106-40cf-b104-1223985df3cd | REQ-STATUS-MUSIC-01 msg_4e3ab50d38a4 |
| CC-ECOM-01 | term_fadcde70-c7d5-4e43-bab2-2f9411f46b35 | REQ-STATUS-ECOM-01 msg_f0e627e018fd |
| CC-B2B-BACK-01 | **--on Sub** · term_79280560-c956-4d17-8fdd-a69b3a75d164 | 인수 msg_de84ea91930f / 수락 msg_254291ca1988 / 회신 msg_21bea4cf8521 |
| CC-REALTY-01 | term_cd6b250d-2cdd-46f0-afe4-9377727d845d | REQ-STATUS-REALTY-01 msg_8f653629169e |
| CC-MOVIE-01 | term_822b9d91-9a25-4d57-9c29-d69fc6de3d88 | IDENT msg_d5f24f5538d7 / 결과 msg_86b54902fdf7 |
| CC-B2B-FRONT-01 | **--on Sub** · term_b394f9a9-06c6-4706-b4b3-610f648453ff | 인수 msg_1cc34028b4d9 / 전달 msg_46d9e2cb9bb4 |
| CC-WORKSPACE-01 | term_d62d586f-e201-4b83-8d7b-8bace6a06049 | IDENT msg_ee909437f911 / 구현 msg_31beb6fd1c34 |
| CC-BLOG-01 | term_78415ab7-52b8-49a9-adbf-c6450509ec54 | IDENT msg_196120a86386 / 결과 msg_b64aa460031c |
| CC-SNS-01 | term_a56ba842-a009-4b3b-926c-f02f9cb65153 | 직접지시 보고 msg_0ea177827182·Master 인수 msg_262b806a9152 |
| 기존 policy | term_e4de9dda-0a1d-472f-87a5-e8b6e51faa14 | IDENT msg_1f604361cecb / 보류확인 msg_15c5dbecaf5e |
| CX-QA-01 | **--on MacMini** · term_e1676007-3108-49cf-90f9-4518da3dfb27 | 요청 msg_43eca2fda35d / 원격 ACK msg_61fc7276a960 / 역할 확인 msg_5ce52c6c09a1 |
| AdminPC Tester | **--on Admin** · term_83dc0547-9a71-45fd-bdf8-f4e10a6ff26b | 역할 수락 msg_5c32df5c7178 / 배정 기준 msg_287b5412841b |

터미널 주소는 세션 종료 후 영속성을 보장하지 않는다. 전송 직전 현재 연결·실행환경·수신자를 다시 확인한다. 주소 발견과 수신 수락은 구분한다.

## 아직 배정하지 않은 관찰 대상

로컬 Orca 터미널 목록은 11개(Claude 9·Antigravity 1·Codex 1), `claude agents --json --cwd D:/AIMaster`는 다른 범위의 Claude 세션 9개를 반환했다. 두 목록을 단순 합산하지 않는다. 일반 제목 Terminal 2/3/4나 프로세스 존재만으로 Movie·Front·Workspace를 확정하지 않는다. 개별 식별 회신으로 연결한다.

MacMini는 원격 메시지→실제 ACK와 동일 공유경로의 AI_TEAM_RULES.md v1.0 읽기를 확인했다. 별도 파일 생성 왕복·자동 복구는 검증하지 않았다. AdminPC의 기존 Codex(Tester) 세션은 2026-11-19 사용자 지정과 역할 수락으로 확인했다. 다른 이름의 외부 호스트는 이 작업 대상이 아니다.

별칭 `CX-TEST-MAC-01`은 Tester가 제안한 이름이며 공통 팀 ID `CX-QA-01`과 같은 실제 세션이다. 별도 작업자로 중복 계산하지 않는다. Mac Tester 소유 지침은 docs/AI_TEAM_TESTER.md, 사용자 제공 공통 검증13절은 docs/AI_TEAM_QA_STANDARD.md로 보존한다.
