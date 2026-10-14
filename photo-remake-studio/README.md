# AI 포토 리메이크 자동화 v1.01

오래된 사진의 손상·빛바램을 복원하고 흑백 사진에 색을 입히거나, 인물 사진에 여러 사물을 자연스럽게 합성하는 AIMaster 웹 프로그램입니다. 주인님이 별도 프로그램 구현과 이름을 확정했습니다.

운영 주소: https://photo-remake-studio.buylife.xyz (2026-10-15 v1.01 출시). 메인 상세: https://www.buylife.xyz/programs/photo-remake-studio

주요 기능: 복원·컬러화·실제 2배/4배 확대, 원본/결과 비교, 사물별 합성 지시·AI 제안, 배경 유지/변경, 실제 픽셀 표시·JPEG/PNG 저장, 회원별 브라우저 보관함.

회원 본인 Gemini 키만 사용합니다. 가입·권한·사용기간은 AIMaster 공용 Supabase를 재사용합니다. 원본 사진은 서버에 저장하지 않으며 결과는 직접 보관한 경우에만 이 브라우저에 저장합니다.

개발: `npm ci`, `npm test`, `npm run build`, `npm run dev`(3043번). 공용 연결 환경변수는 `.env.example`에 이름만 명시합니다. 공용 연결 3종은 2026-10-15 주인님 승인 후 등록했습니다.

- [작업 지침](AGENTS.md)
- [구현 계획](docs/IMPLEMENTATION_PLAN.md)
- [검수·운영 현황](docs/RELEASE_CHECKS.md)
