# 시네마틱 스토리보드 자동화 (cinematic-storyboard-studio)

이미지 한 장으로 영화 같은 9컷 스토리보드(마스터 콘택트 시트)와 영상 생성용 프롬프트를 만드는 도구. **회원 본인의 Gemini API 키**로 서버에서 호출합니다.
라이브: https://cinematic-storyboard-studio.buylife.xyz · 배지 FREE+new · 카테고리 멀티미디어 · 현재 버전 **v1.03**

- 사용 매뉴얼(회원·운영 담당자용): [`MANUAL.md`](MANUAL.md)
- 인수인계·구조·DB·한계: [`AGENTS.md`](AGENTS.md)
- 등록 SQL: `supabase/migrations/0002_register_program.sql`, 테이블·저장소: `0001_storyboard_tables.sql`
- 테스트: `npm test`


## 2026-10-16 DB 연동 변수 호환 — v1.05 (cinematic-storyboard-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
