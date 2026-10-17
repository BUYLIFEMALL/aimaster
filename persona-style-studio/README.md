# 페르소나 문체 자동화 (persona-style-studio)

슬라이더 이퀄라이저(창의성·명확성·감정 깊이·길이·전문성)와 캐릭터 페르소나로 글의 문체를 다시 써 주는 글쓰기 도구. **회원 본인의 Gemini API 키**로 서버에서 호출합니다.
라이브: https://persona-style-studio.buylife.xyz · 배지 FREE+new · 카테고리 Tools · 현재 버전 **v1.08** (2026-10-17 로그인·회원가입 표준 2탭 레이아웃 리뉴얼 완료)

- 인수인계·구조·DB·한계: [`AGENTS.md`](AGENTS.md)
- 등록 SQL: `supabase/migrations/0002_register_program.sql`, 테이블: `0001_persona_style_tables.sql`
- 테스트: `npm test`


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.05)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (persona-style-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
