# Suno 음악 기획 스튜디오 — 인수인계

루트 AGENTS.md·docs/HANDOFF.md·TOP_RULE_PERSONAL_ACCOUNT_API.md·ERROR_LESSONS.md·AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md를 먼저 읽습니다. 현재 v1.01 구현·자동 검수 완료, 새 Vercel 환경변수 등록 승인 대기입니다. 재개 절차는 docs/RELEASE_V1_01.md입니다.

회원 본인 계정·본인 AI API 키만 사용합니다. 회원 권한/키는 기존 플랫폼 공용 DB와 emotion-writer의 인증 골격을 재사용합니다. 새 회원 체계·공용 AI 키·게스트 우회는 금지입니다. 자료는 회원 ID별 이 브라우저에 저장하고 JSON 백업을 제공합니다. 서버는 API 키 원문을 클라이언트에 반환하지 않습니다.

기능 분석과 구현 범위: docs/ANALYSIS_AND_PLAN.md. 검수 npm test(17/17), npm run lint(0), npm run build 성공. 공용 DB 스키마 변경과 Vercel 환경변수 등록은 사전 승인 필요합니다. 프로그램·3요금제는 등록했으며 is_active=false로 유지합니다. 일반 등급 이상 + 사용기간 또는 구독이 필요하며 무료 권한을 임의 부여하지 않습니다. 기존 music 앱은 수정하지 않으며 곡 생성 대신 준비된 제목/스타일/가사 복사와 기존 앱 열기를 제공합니다. 확장 없음. 실제 유료 AI·Suno 호출 및 실제 회원 화면 검수는 미실행입니다.
