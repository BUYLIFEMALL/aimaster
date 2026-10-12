# 감성 글귀 이미지 — AI 에이전트 인수인계

후속(2026-10-12): 주인님 요청("디자인을 다른 프로그램 템플릿에 맞추어 바꿔줘 좌측 매뉴도 그렇고 사용된 이모티콘도 어울리게 수정해줘")에 따라 디자인 템플릿 전면 개편 및 v1.02 배포를 완료했습니다.
- 좌측 사이드바: 플랫폼 표준(w-64, 브랜드 배지, WORKFLOW 1~6 번호 스텝퍼, KeyRound 연동 링크, 계정/로그아웃, 모바일 토글 드로어) 전면 적용.
- 이모티콘 및 아이콘: Lucide React 전면 도입 및 감성에 어울리는 테마/소스 이모지(📜 명언·좋은 글, 🌿 건강·행복 기원, 💌 카톡/밴드 공유, 🎨 AI 생성, 📷 Pixabay, 🖼️ Pexels)로 정돈.
- 전체 레이아웃: 화이트/소프트 로즈&슬레이트 기반 모던 카드 디자인 통일.
- 버전 갱신: v1.02 (코드 APP_VERSION + DB programs.version 동기화 완료).

최상위: 회원 본인 계정·본인 API 키만 사용합니다. 루트 AGENTS.md, docs/HANDOFF.md, docs/ERROR_LESSONS.md, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md, docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md를 먼저 읽습니다.

2026-10-12 현재 **v1.02 구현·디자인 리뉴얼·Vercel 프로덕션 배포 완료** 상태입니다. 라이브 서비스 주소는 `https://emotion-writer.buylife.xyz`이며 SSO 게이트(307) 및 메인 카탈로그 노출이 정상 동작함을 검증 완료했습니다.

회원 권한·본인 키는 cardnews-studio의 기존 구조를 재사용합니다. 참고 프로젝트의 브라우저 API 키/암호화 키를 읽거나 이전하지 않습니다. localStorage에는 본인 작업 문구·설정만 회원 ID를 붙여 저장하며 API 키·사진은 저장하지 않습니다.

검수는 이 폴더에서 npm test, npm run lint, npm run build를 실행합니다. 라이브 주소 `https://emotion-writer.buylife.xyz` 및 메인 카탈로그 `https://www.buylife.xyz/programs` 최상단 1위 노출 검증을 마쳤습니다. 확장 프로그램은 사용하지 않습니다.
