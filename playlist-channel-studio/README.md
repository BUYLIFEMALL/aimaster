# 플레이리스트 채널 제작 자동화 (playlist-channel-studio)

장르를 고르면 유튜브 플레이리스트 채널에 필요한 제목 10개, Suno 5.0 프롬프트 3종, 곡별 가사, 유튜브 설명·해시태그·키워드, 글자가 얹힌 썸네일까지 한 번에 만드는 도구. **회원 본인의 Gemini / OpenAI / Claude API 키**로 서버에서 호출합니다.
라이브: https://playlist-channel-studio.buylife.xyz · 배지 FREE+new · 카테고리 유튜브 · 현재 버전 **v1.03**

- 사용 매뉴얼(회원·운영 담당자용): [`MANUAL.md`](MANUAL.md)
- 인수인계·구조·DB·한계: [`AGENTS.md`](AGENTS.md)
- 등록 SQL: `supabase/migrations/0002_register_program.sql`, 테이블·저장소: `0001_playlist_tables.sql`
- 테스트: `npm test`
