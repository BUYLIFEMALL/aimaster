# AI 마스터링 스튜디오 (ai-mastering-studio)

WAV 음원을 브라우저 안에서 EQ·아날로그 새추레이션·컴프레서·스테레오 이미저·룩어헤드 리미터로 마스터링하는 도구. 12가지 사운드 프로필, 원하는 소리를 글로 적으면 설정값을 제안하는 AI 로직 생성기(회원 본인 Gemini/OpenAI/Claude 키), 정밀 랙, 입력·결과 파형·레벨 비교, 일괄 처리와 WAV/ZIP 저장을 제공합니다. 오디오는 서버로 전송되지 않습니다.
라이브: https://ai-mastering-studio.buylife.xyz · 배지 FREE+new · 카테고리 음악 · 현재 버전 **v1.03**

- 사용 매뉴얼(회원·운영 담당자용): [`MANUAL.md`](MANUAL.md)
- 인수인계·구조·신호 처리·한계: [`AGENTS.md`](AGENTS.md)
- 등록 SQL: `supabase/migrations/0001_register_program.sql` (DB 테이블·저장소 없음)
- 테스트: `npm test`


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.03)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.04 (ai-mastering-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
