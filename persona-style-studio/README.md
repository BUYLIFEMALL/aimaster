# 페르소나 문체 자동화 (persona-style-studio)

슬라이더 이퀄라이저(창의성·명확성·감정 깊이·길이·전문성)와 캐릭터 페르소나로 글의 문체를 다시 써 주는 글쓰기 도구. **회원 본인의 Gemini API 키**로 서버에서 호출합니다.
라이브: https://persona-style-studio.buylife.xyz · 배지 FREE+new · 카테고리 Tools · 현재 버전 **v1.05**

- 인수인계·구조·DB·한계: [`AGENTS.md`](AGENTS.md)
- 등록 SQL: `supabase/migrations/0002_register_program.sql`, 테이블: `0001_persona_style_tables.sql`
- 테스트: `npm test`


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.05)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.
