# 운영 적용 요청 준비 — document-translator v1.01

2026-10-14. 주인님이 **‘전체 범위 승인 — 운영 연결·배포·실제 검수 진행’**을 확정했습니다. 테이블3개·함수4개·Supabase 연결값3개·pg_cron 활성화/정리 작업1개를 적용했습니다. 기존 프로그램과 회원 키는 변경하지 않았습니다.

## DB 스키마

파일: `supabase/migrations/20261014082202_document_translator_initial.sql`.

- 새 테이블3개: `dt_projects`(선택 저장 프로젝트·30일), `dt_glossaries`(회원 용어집), `dt_operations`(24시간 작업ID 중복 방지 메타데이터).
- 새 함수4개: 프로젝트/용어집의 revision 기반 저장, AI 작업 실행권 획득, 실행 상태 완료.
- RLS owner-only 읽기. 쓰기/함수 실행은 service role만 허용하며 서버에서 로그인·프로그램 권한·본인 user_id를 확인합니다.
- dt_operations에는 원문·번역문·키를 보관하지 않습니다. 실행권 획득 시 **본인의24시간 지난 작업 메타데이터만** 정리합니다. 기존 프로그램 테이블이나 회원 키를 삭제하지 않습니다.
- 동일 요청ID의 재전송은 AI를 다시 호출하지 않습니다. 결과 서버 캐시는 두지 않으며 연결이 끊긴 후 새 요청으로 수동 재실행할 경우 추가 비용이 발생할 수 있습니다.
- SQL 검증은 로컬 PGlite의 회원A/B 격리·권한·revision·재전송·만료 검사로 수행합니다. 운영 SQL 적용 승인과 구분합니다.

### 추가 확인: 30일 만료 기록 정리

파일: `supabase/migrations/20261014094000_document_translator_retention.sql`.

화면에서 만료 기록을 숨기는 것만으로 원문이 DB에서 제거되지는 않으므로 **Supabase Cron(pg_cron) 활성화와 새 정리 작업1개**를 승인 후 적용했습니다. 적용 전 pg_cron이 없었던 사실도 확인했습니다. [공식 Cron 설치 안내](https://supabase.com/docs/guides/cron/install).

- 새 프로그램 `dt_projects`에서 **30일 보관 기한이 지난 기록만** 매시간35분에 정리합니다. 만료 즉시 읽기/API 접근을 차단하며 실제 정리까지 최대1시간이 추가될 수 있습니다.
- 같은 새 프로그램의 `dt_operations`에서24시간 지난 실행 메타데이터도 정리합니다. 원문·응답·키는 원래 이 테이블에 없습니다. 기존 회원별 실행 시 정리와 별도로 예약 정리의 범위를 승인받습니다.
- 기존 프로그램 데이터·기존 정리 작업·현재 사용기간 안의 번역 기록·회원 키는 삭제하지 않습니다.
- 운영 Cron의09:35 UTC 실제 실행이 succeeded였고, 직접 만든 만료 시험 기록1건이 제거됐습니다. PGlite 검사와 실제 예약 실행을 구분해 확인했습니다.
- 최종 승인 질문에 정리 작업까지 포함했고 주인님이 전체 범위를 승인했습니다. 중복 승인 요청을 하지 않습니다.

## 새 프로그램 환경변수

대상: Vercel buylife 팀의 신규 `document-translator` 프로젝트와 이 프로그램의 gitignore된 `.env.local`.

- `NEXT_PUBLIC_SUPABASE_URL`: 기존 공용 Supabase URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 기존 공용 로그인 연결값.
- `SUPABASE_SERVICE_ROLE_KEY_BASE64` 또는 `SUPABASE_SERVICE_ROLE_KEY`: 기존 공용 서버 연결값, 서버 전용. 두 개 중 기존 설정 방식 하나만 등록.
- 새로운 회원/운영자 Gemini 키, 비밀번호, 공용 OAuth 앱은 만들지 않습니다. 기존 키 값도 변경하지 않습니다.

프로그램 등록·기본 요금제3종·VIP 등급 접근 연결·썸네일·도메인 연결은 기존 자동 작업 세트에 따라 처리합니다. 이름은 주인님의 ‘진행해줘’로 1순위 추천 **AI 문서번역 자동화**를 적용합니다.

사전 확인 근거는 루트 AGENTS.md §2와 프로젝트 AGENTS.md 핵심7번입니다. 이번 범위는 승인 완료입니다. 별개의 새 스키마·키/비밀번호 변경은 이 승인에 포함되지 않습니다.
