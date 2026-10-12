# 감성 글귀 이미지 — AI 에이전트 인수인계

후속(2026-10-12): 주인님 요청("프로그램 등록 및 썸네일 만들어줘")에 따라 감성 글귀 이미지 전용 16:9 고화질 실사 썸네일을 생성하여 Supabase Storage에 업로드하고, 공용 DB `programs`의 `[운영 준비 중]` 상태를 해제하여 정식 등록(카탈로그 최상단 1위 `sort_order = 122`, 배지 `["new", "best"]`)하였습니다. Vercel 환경변수 등록 및 `emotion-writer.buylife.xyz` 도메인 연결 후 프로덕션 배포가 완료되었습니다 (`https://emotion-writer.buylife.xyz`).

최상위: 회원 본인 계정·본인 API 키만 사용합니다. 루트 AGENTS.md, docs/HANDOFF.md, docs/ERROR_LESSONS.md, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md, docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md를 먼저 읽습니다.

2026-10-12 현재 **v1.01 구현·전용 실사 썸네일 등록·Vercel 프로덕션 배포 완료** 상태입니다. 라이브 서비스 주소는 `https://emotion-writer.buylife.xyz`이며 SSO 게이트(307) 및 메인 카탈로그 노출이 정상 동작함을 검증 완료했습니다.

회원 권한·본인 키는 cardnews-studio의 기존 구조를 재사용합니다. 참고 프로젝트의 브라우저 API 키/암호화 키를 읽거나 이전하지 않습니다. localStorage에는 본인 작업 문구·설정만 회원 ID를 붙여 저장하며 API 키·사진은 저장하지 않습니다.

검수는 이 폴더에서 npm test, npm run lint, npm run build를 실행합니다. 라이브 주소 `https://emotion-writer.buylife.xyz` 및 메인 카탈로그 `https://www.buylife.xyz/programs` 최상단 1위 노출 검증을 마쳤습니다. 확장 프로그램은 사용하지 않습니다.
