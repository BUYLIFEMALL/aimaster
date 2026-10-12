# 감성 글귀 이미지 — AI 에이전트 인수인계

후속(2026-10-12): 주인님 요청("폰트도 다른 프로그램 뭘 사용했나 찾아보고 같이 맞춰줘")에 따라 다른 메인 프로그램들(`cardnews-studio`, `ai-webtoon-studio`, `naver-blog-allinone`, 루트 `AIMaster`)의 폰트 스택을 전수 조사하여, 기존 UI에 기본 적용되어 있던 고운돋움 폰트 대신 플랫폼 표준 고가독성 시스템 폰트 스택(`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", "Helvetica Neue", Arial, sans-serif`)으로 UI 폰트를 전면 일치화했습니다. (캔버스 서체 선택용 고운돋움/나눔명조/나눔손글씨는 캔버스 렌더링에만 독립 적용 유지). v1.03 배포 완료.

최상위: 회원 본인 계정·본인 API 키만 사용합니다. 루트 AGENTS.md, docs/HANDOFF.md, docs/ERROR_LESSONS.md, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md, docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md를 먼저 읽습니다.

2026-10-12 현재 **v1.03 구현·UI 폰트 표준화·Vercel 프로덕션 배포 완료** 상태입니다. 라이브 서비스 주소는 `https://emotion-writer.buylife.xyz`이며 SSO 게이트(307) 및 메인 카탈로그 노출이 정상 동작함을 검증 완료했습니다.

회원 권한·본인 키는 cardnews-studio의 기존 구조를 재사용합니다. 참고 프로젝트의 브라우저 API 키/암호화 키를 읽거나 이전하지 않습니다. localStorage에는 본인 작업 문구·설정만 회원 ID를 붙여 저장하며 API 키·사진은 저장하지 않습니다.

검수는 이 폴더에서 npm test, npm run lint, npm run build를 실행합니다. 라이브 주소 `https://emotion-writer.buylife.xyz` 및 메인 카탈로그 `https://www.buylife.xyz/programs` 최상단 1위 노출 검증을 마쳤습니다. 확장 프로그램은 사용하지 않습니다.
