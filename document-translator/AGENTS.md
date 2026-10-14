# AI 문서번역 자동화 — 에이전트 인수인계

## 현재 상태

2026-10-14, Codex. 운영 연결·배포·실제 검수 전체 범위는 승인 완료입니다. DB·연결값·Cron·카탈로그/요금제·VIP·도메인·첫 배포 및 v1.02 수정 배포를 완료했습니다. 실제 Chrome 시험 회원 SSO와 만료 기록 정리, 같은 회원 키의 실제 Gemini 번역 응답을 확인한 기록이 있습니다. **v1.03**은 번역문 이중 이스케이프 줄바꿈을 정규화하고 원문 코드 문자열은 보존합니다. 자동10개와 프로덕션 빌드 통과입니다. v1.03 커밋8d34b366·원격 푸시·프로덕션 READY·카탈로그 버전 동기화·운영 HTTP 검사10개를 완료했습니다. 테이블3개 RLS와 함수4개 서버 전용 권한, Cron 최신 성공도 확인했습니다. 주인님이 열어주신 실제 Chrome의 시험 회원으로 번역·편집·재검수·역번역·TXT/MD/DOCX/JSON/CSV 다운로드·선택 저장/새로고침/복원·용어집 저장/적용/복원·JSON 백업 UI 다시 불러오기·창516px 메뉴/문서 탭까지 검수를 완료했습니다. 본인 Gemini3.8 Flash 호출3회 모두 운영 dt_operations done 및 /api/ai200으로 대조했습니다. 실제 휴대폰 기기 검수와 구분하며, 이번 요청 범위의 남은 작업은 없습니다. 운영 변경 승인을 다시 요청하지 않습니다.

작업 전 루트 AGENTS.md, docs/HANDOFF.md, docs/ERROR_LESSONS.md, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md, docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md와 이 폴더의 README·docs/CLI_HANDOFF.md·docs/DEVELOPMENT_PLAN.md를 읽습니다. 공유 저장소·인덱스에서 다른 CLI 변경을 보존합니다.

## 원본 조사 증거

- Google AI Studio 공유 앱의 Preview·Code·Export UI로 조사했습니다. Remix·원본 수정·AI 생성은 하지 않았습니다.
- ZIP의 파일19개 전수 확보: 77,015 bytes. HTML과 실행 번들1,684,474 bytes도 수집·대조했습니다.
- 소스 전체는 로컬 scratch/translation-reference-20261014와 Aside 세션에 보관했습니다. 타 개발자의 원본 코드를 공개 저장소에 복제하지 않고 파일명·SHA256·관찰 증거만 커밋합니다.
- 실제 확인: 언어10종, 사용법, 입력·수정, DOCX 다운로드·XML, 모바일 미리보기, 새로고침 초기화.
- 원본의 실제 AI 품질은 미확인입니다. 새 구현은 파일 작업자·UI 요청·로컬 PostgreSQL 회원격리를 검사했으며 운영 연결과 실제 공급사 요청까지 확인했습니다. 전체 화면 흐름 검수는 RELEASE_CHECKS.md의 최신 상태를 따릅니다.

## 구현 시 핵심

1. 회원 본인 Gemini 키를 서버에서만 조회·호출합니다. 키 없으면 본인 키 등록 안내, 타인·운영자 키 또는 모델 자동 폴백 금지.
2. 원본의 파일 불러오기→자동 AI 호출을 재사용하지 않습니다. 로컬 추출과 명시적 AI 실행을 나눕니다.
3. 원문·언어·모델 변경과 AI 응답의 revision을 대조합니다. 이전 번역문·수정본은 재번역 성공 전까지 보존하고 오래된 분석은 표시합니다.
4. JSON 문법과 별도로 응답 타입·점수·블록 ID·누락·완료 상태를 검증합니다. AI 점수와 역번역을 정확성 보증으로 표시하지 않습니다.
5. Markdown 화면과 DOCX 저장은 서로 검증합니다. 원본의 단순 Paragraph(text) 내보내기를 서식 보존으로 설명하지 않습니다.
6. 작업 화면은 흰색, 표준 번호형 사이드바, 원문·번역문 비교, 모바일 탭. API키등록·플랫폼연동·실제 매뉴얼·메뉴 바로 아래 계정/로그아웃.
7. 새 DB 스키마·환경변수 작업은 기존 사전 승인 규칙을 따릅니다. 이번 프로그램의 OPERATING_CHANGES.md에 기록한 범위는 승인·적용 완료입니다.

전체 설계는 docs/DEVELOPMENT_PLAN.md, 로컬 검수는 docs/IMPLEMENTATION_STATUS.md, 최신 운영 상태는 docs/RELEASE_CHECKS.md·docs/CLI_HANDOFF.md를 기준으로 합니다. 모의 검사를 실제 회원 검수로 보고하지 않습니다.
