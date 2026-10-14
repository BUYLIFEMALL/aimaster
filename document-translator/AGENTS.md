# AI 문서번역 자동화 — 에이전트 인수인계

## 현재 상태

2026-10-14, Codex. 분석·명칭 추천·개발 플랜 요청만 받았습니다. 코드 구현 지시는 아직 받지 않았습니다. 이름 **AI 문서번역 자동화**, slug `document-translator`는 제안이며 등록되지 않았습니다. `APP_VERSION`, package.json, 운영 URL, DB 스키마도 아직 없습니다. 최초 출시 버전 계획은 v1.01입니다.

작업 전 루트 AGENTS.md, docs/HANDOFF.md, docs/ERROR_LESSONS.md, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md, docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md와 이 폴더의 README·docs/CLI_HANDOFF.md·docs/DEVELOPMENT_PLAN.md를 읽습니다. 공유 저장소·인덱스에서 다른 CLI 변경을 보존합니다.

## 원본 조사 증거

- Google AI Studio 공유 앱의 Preview·Code·Export UI로 조사했습니다. Remix·원본 수정·AI 생성은 하지 않았습니다.
- ZIP의 파일19개 전수 확보: 77,015 bytes. HTML과 실행 번들1,684,474 bytes도 수집·대조했습니다.
- 소스 전체는 로컬 scratch/translation-reference-20261014와 Aside 세션에 보관했습니다. 타 개발자의 원본 코드를 공개 저장소에 복제하지 않고 파일명·SHA256·관찰 증거만 커밋합니다.
- 실제 확인: 언어10종, 사용법, 입력·수정, DOCX 다운로드·XML, 모바일 미리보기, 새로고침 초기화.
- 미확인: 실제 AI 번역 품질, PDF·DOCX 입력의 실제 AI 구조화, 역번역 결과, 새 프로그램 구현·회원격리·배포.

## 구현 시 핵심

1. 회원 본인 Gemini 키를 서버에서만 조회·호출합니다. 키 없으면 본인 키 등록 안내, 타인·운영자 키 또는 모델 자동 폴백 금지.
2. 원본의 파일 불러오기→자동 AI 호출을 재사용하지 않습니다. 로컬 추출과 명시적 AI 실행을 나눕니다.
3. 원문·언어·모델 변경과 AI 응답의 revision을 대조합니다. 이전 번역문·수정본은 재번역 성공 전까지 보존하고 오래된 분석은 표시합니다.
4. JSON 문법과 별도로 응답 타입·점수·블록 ID·누락·완료 상태를 검증합니다. AI 점수와 역번역을 정확성 보증으로 표시하지 않습니다.
5. Markdown 화면과 DOCX 저장은 서로 검증합니다. 원본의 단순 Paragraph(text) 내보내기를 서식 보존으로 설명하지 않습니다.
6. 작업 화면은 흰색, 표준 번호형 사이드바, 원문·번역문 비교, 모바일 탭. API키등록·플랫폼연동·실제 매뉴얼·메뉴 바로 아래 계정/로그아웃.
7. 새 DB 스키마·환경변수 작업은 기존 사전 승인 규칙을 따릅니다. 이번 계획 작성은 해당 변경의 실행 승인이 아닙니다.

전체 설계·완료 기준은 docs/DEVELOPMENT_PLAN.md를 기준으로 하며, 이름 확정·구현 지시가 오면 먼저 최신 Git 상태와 문서를 재확인합니다.
