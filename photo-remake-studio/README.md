# AI 포토 리메이크 자동화 v1.01

오래된 사진의 손상·빛바램을 복원하고 흑백 사진에 색을 입히거나, 인물 사진에 여러 사물을 자연스럽게 합성하는 AIMaster 웹 프로그램입니다. 주인님이 별도 프로그램 구현과 이름을 확정했습니다.

운영 주소: https://photo-remake-studio.buylife.xyz (2026-10-15 v1.01 출시). 메인 상세: https://www.buylife.xyz/programs/photo-remake-studio

주요 기능: 복원·컬러화·실제 2배/4배 확대, 원본/결과 비교, 사물별 합성 지시·AI 제안, 배경 유지/변경, 실제 픽셀 표시·JPEG/PNG 저장, 회원별 브라우저 보관함.

회원 본인 Gemini 키만 사용합니다. 가입·권한·사용기간은 AIMaster 공용 Supabase를 재사용합니다. 원본 사진은 서버에 저장하지 않으며 결과는 직접 보관한 경우에만 이 브라우저에 저장합니다.

개발: `npm ci`, `npm test`, `npm run build`, `npm run dev`(3043번). 공용 연결 환경변수는 `.env.example`에 이름만 명시합니다. 공용 연결 3종은 2026-10-15 주인님 승인 후 등록했습니다.

- [작업 지침](AGENTS.md)
- [구현 계획](docs/IMPLEMENTATION_PLAN.md)
- [검수·운영 현황](docs/RELEASE_CHECKS.md)


## 2026-10-16 DB 연동 변수 호환 — v1.03 (photo-remake-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
