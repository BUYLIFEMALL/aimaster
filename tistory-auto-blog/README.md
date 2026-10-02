# 티스토리(원문)생성 자동화 — `tistory-auto-blog`

AIMaster 회원이 AI로 글을 만들고, **크롬 확장**이 티스토리 글쓰기 화면에 사람처럼 입력해 주는 프로그램입니다(티스토리 Open API는 2024-02 종료).
최종 발행은 항상 회원이 직접 누릅니다. 상태·계획·이어가기 절차는 [`AGENTS.md`](AGENTS.md)와 [`docs/TISTORY_PLAN.md`](docs/TISTORY_PLAN.md)를 보세요.

- 출발점: `ai-auto-blog`(https://ai-auto-blog-one.vercel.app)를 복제 — 글 생성·이미지·30일 자동 삭제·API 키·권한 로직은 같고, 입력 대상(티스토리)과 데이터 격리(전부 회원별 + 본인만)가 다릅니다.
- 개발 서버: `npm run dev`, 빌드: `npm run build`(prebuild가 확장 ZIP을 만듭니다 — 확장 완성 전에는 ZIP을 커밋·배포하지 않습니다).
- DB: 공용 Supabase에 `tistory_*` 테이블(`supabase/migrations/0001_tistory_init.sql`, 적용은 로컬에서 주인님 승인 후).
- 환경변수: 루트 `.env.local`의 공용 DB 값(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAIN_SITE_URL`, `CRON_SECRET`). AI 키는 넣지 않습니다(회원 본인 키만).
- 운영 주소: https://tistory-auto-blog-pearl.vercel.app (`v1.19`). 설정에서 발급한 연동 토큰은 확장에서 서버 검증 후에만 저장됩니다. 카테고리·태그 전용 저장과 태그 추출, 별도 발행 설정 저장(보호 비밀번호 제외)을 지원합니다. 수정 화면은 기존 본문 HTML의 레이아웃·서식 속성도 보존합니다. 최종 저장·발행은 절대 누르지 않습니다. 공용 DB의 `programs.version`과 확장 `version_name`·배포 ZIP도 같은 버전으로 맞춥니다.
