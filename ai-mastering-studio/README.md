# AI 마스터링 스튜디오 (ai-mastering-studio)

WAV 음원을 브라우저 안에서 EQ·아날로그 새추레이션·컴프레서·스테레오 이미저·룩어헤드 리미터로 마스터링하는 도구. 12가지 사운드 프로필, 원하는 소리를 글로 적으면 설정값을 제안하는 AI 로직 생성기(회원 본인 Gemini/OpenAI/Claude 키), 정밀 랙, 입력·결과 파형·레벨 비교, 일괄 처리와 WAV/ZIP 저장을 제공합니다. 오디오는 서버로 전송되지 않습니다.
라이브: https://ai-mastering-studio.buylife.xyz · 배지 FREE+new · 카테고리 음악 · 현재 버전 **v1.02**

- 사용 매뉴얼(회원·운영 담당자용): [`MANUAL.md`](MANUAL.md)
- 인수인계·구조·신호 처리·한계: [`AGENTS.md`](AGENTS.md)
- 등록 SQL: `supabase/migrations/0001_register_program.sql` (DB 테이블·저장소 없음)
- 테스트: `npm test`
